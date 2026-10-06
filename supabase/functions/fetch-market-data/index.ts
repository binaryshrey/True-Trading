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

    // 1) Fetch real crypto prices from CoinGecko (free, no key)
    let cryptoData: any = null;
    try {
      const cgRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano,avalanche-2&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true"
      );
      if (cgRes.ok) {
        cryptoData = await cgRes.json();
        console.log("CoinGecko data fetched:", Object.keys(cryptoData));
      }
    } catch (e) {
      console.error("CoinGecko fetch error:", e);
    }

    // 2) Fetch crypto fear & greed index
    let fearGreed: any = null;
    try {
      const fgRes = await fetch("https://api.alternative.me/fng/?limit=1");
      if (fgRes.ok) {
        const fgData = await fgRes.json();
        fearGreed = fgData?.data?.[0] || null;
        console.log("Fear & Greed:", fearGreed);
      }
    } catch (e) {
      console.error("Fear & Greed fetch error:", e);
    }

    // 3) Use AI to classify regime with real data context
    const marketContext = cryptoData
      ? `REAL MARKET DATA (CoinGecko):
BTC: $${cryptoData.bitcoin?.usd?.toLocaleString()} (24h: ${cryptoData.bitcoin?.usd_24h_change?.toFixed(2)}%)
ETH: $${cryptoData.ethereum?.usd?.toLocaleString()} (24h: ${cryptoData.ethereum?.usd_24h_change?.toFixed(2)}%)
SOL: $${cryptoData.solana?.usd?.toLocaleString()} (24h: ${cryptoData.solana?.usd_24h_change?.toFixed(2)}%)
ADA: $${cryptoData.cardano?.usd?.toLocaleString()} (24h: ${cryptoData.cardano?.usd_24h_change?.toFixed(2)}%)
AVAX: $${cryptoData['avalanche-2']?.usd?.toLocaleString()} (24h: ${cryptoData['avalanche-2']?.usd_24h_change?.toFixed(2)}%)
Fear & Greed Index: ${fearGreed?.value || 'N/A'} (${fearGreed?.value_classification || 'N/A'})`
      : "No real-time data available, use training knowledge.";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a market regime classifier with access to real market data. Analyze the data and classify the market.

Respond ONLY with this JSON:
{
  "regime": "trending"|"choppy"|"risk-off"|"risk-on",
  "volatility": "low"|"medium"|"high",
  "earningsActive": boolean,
  "macroEvent": boolean,
  "sentiment": number (-1 to 1),
  "rationale": "1-2 sentence explanation",
  "newsHeadlines": ["3-5 relevant market headlines based on current conditions"],
  "marketMood": "string (one-word mood: euphoric|bullish|cautious|fearful|panicking)"
}`,
          },
          {
            role: "user",
            content: `Classify current market using this real data:\n${marketContext}\nToday: ${new Date().toISOString().split("T")[0]}. Return ONLY JSON.`,
          },
        ],
        temperature: 0.3,
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
    const env = JSON.parse(content);
    console.log("Market classification:", env);

    // 4) Update environment state in DB
    await supabase.from("environment_state").update({
      regime: env.regime,
      volatility: env.volatility,
      earnings_active: env.earningsActive,
      macro_event: env.macroEvent,
      sentiment: env.sentiment,
    }).eq("id", 1);

    // 5) Store market snapshot
    const snapshot = {
      source: "coingecko",
      data: {
        crypto: cryptoData,
        fearGreed: fearGreed,
        regime: env.regime,
        sentiment: env.sentiment,
        marketMood: env.marketMood,
        newsHeadlines: env.newsHeadlines || [],
        rationale: env.rationale,
        timestamp: new Date().toISOString(),
      },
    };
    await supabase.from("market_snapshots").insert(snapshot);

    return new Response(
      JSON.stringify({
        ...env,
        crypto: cryptoData,
        fearGreed,
        source: "ai-classified-live",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Market data error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
