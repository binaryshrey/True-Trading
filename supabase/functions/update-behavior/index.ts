import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { overrideAction } = await req.json();

    // Get current behavioral genome
    const { data: current } = await supabase.from("behavioral_genome").select("*").eq("id", 1).single();
    if (!current) throw new Error("No behavioral genome found");

    // Use Lovable AI as the "Behavioral Memory Agent"
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a Behavioral Memory Agent. You analyze user trading behavior patterns and adjust their behavioral genome accordingly.

Current behavioral genome:
- riskTolerance: ${current.risk_tolerance}
- drawdownSensitivity: ${current.drawdown_sensitivity}
- earningsAvoidance: ${current.earnings_avoidance}
- momentumBias: ${current.momentum_bias}
- holdingPatience: ${current.holding_patience}

The user just performed a trade override. Based on this action, intelligently adjust the behavioral genome values. Changes should be small (±0.02 to ±0.08) and logically consistent with the override action.

Respond ONLY with JSON:
{
  "riskTolerance": number 0-1,
  "drawdownSensitivity": number 0-1,
  "earningsAvoidance": number 0-1,
  "momentumBias": number 0-1,
  "holdingPatience": number 0-1,
  "insight": "1 sentence explaining what the override reveals about user behavior"
}`
          },
          {
            role: "user",
            content: `User performed override: ${overrideAction || "manual trade intervention"}. Adjust behavioral genome. Return ONLY JSON.`
          }
        ],
        temperature: 0.4,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI gateway error [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) content = jsonMatch[1].trim();
    const objMatch = content.match(/\{[\s\S]*\}/);
    if (objMatch) content = objMatch[0];

    const result = JSON.parse(content);

    // Clamp values 0-1
    const clamp = (v: number) => Math.max(0, Math.min(1, Math.round(v * 100) / 100));

    const updated = {
      risk_tolerance: clamp(result.riskTolerance),
      drawdown_sensitivity: clamp(result.drawdownSensitivity),
      earnings_avoidance: clamp(result.earningsAvoidance),
      momentum_bias: clamp(result.momentumBias),
      holding_patience: clamp(result.holdingPatience),
    };

    const { error: updateErr } = await supabase.from("behavioral_genome").update(updated).eq("id", 1);
    if (updateErr) throw new Error(`Update error: ${updateErr.message}`);

    return new Response(JSON.stringify({ ...updated, insight: result.insight, source: "ai-behavioral" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Behavior update error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
