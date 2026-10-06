import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Deterministic-random helpers ───────────────────────────────────────────

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const ARCHETYPES = ["momentum", "defensive", "volatility", "mean-reversion", "hybrid"] as const;

const NAME_PREFIXES = [
  "Alpha", "Beta", "Gamma", "Delta", "Sigma", "Omega", "Apex", "Vega",
  "Rho", "Theta", "Kappa", "Zeta", "Apex", "Nova", "Flux", "Prime",
  "Quant", "Algo", "Edge", "Peak", "Cipher", "Nexus", "Pulse", "Drift",
];
const NAME_SUFFIXES = [
  "Hunter", "Rider", "Surge", "Strike", "Hawk", "Wolf", "Storm", "Drift",
  "Pulse", "Wave", "Blade", "Force", "Shift", "Flow", "Crest", "Spike",
  "Edge", "Run", "Burst", "Scout", "Guard", "Watch", "Climb", "Fade",
];

function generateAgents(count: number, seed = 42) {
  const rand = seededRand(seed + Date.now());

  const agents = [];
  for (let i = 0; i < count; i++) {
    const archetype = ARCHETYPES[i % ARCHETYPES.length];
    const prefix = NAME_PREFIXES[Math.floor(rand() * NAME_PREFIXES.length)];
    const suffix = NAME_SUFFIXES[Math.floor(rand() * NAME_SUFFIXES.length)];
    const fitness = Math.round((rand() * 65 + 20) * 10) / 10;            // 20–85
    const sharpe  = Math.round((rand() * 3.5 - 0.5) * 100) / 100;        // -0.5–3.0
    const maxDD   = Math.round((rand() * 23 + 2) * 100) / 100;            // 2–25%
    const winRate = Math.round((rand() * 40 + 35) * 100) / 100;           // 35–75%
    const totalReturn = Math.round((rand() * 55 - 15) * 100) / 100;       // -15–40%
    const trades  = Math.floor(rand() * 91 + 10);                          // 10–100

    agents.push({
      id: `AGT-${String(i + 1).padStart(3, "0")}`,
      name: `${prefix} ${suffix}`,
      generation: 0,
      fitness,
      status: "active",
      archetype,
      sharpe,
      max_drawdown: maxDD,
      win_rate: winRate,
      total_return: totalReturn,
      trades,
      genome_entry_logic:      Math.round(rand() * 100) / 100,
      genome_exit_discipline:  Math.round(rand() * 100) / 100,
      genome_risk_tolerance:   Math.round(rand() * 100) / 100,
      genome_position_sizing:  Math.round(rand() * 100) / 100,
      genome_indicator_weight: Math.round(rand() * 100) / 100,
    });
  }
  return agents;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requestedCount = Math.min(Math.max(Number(body.count) || 40, 10), 100);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If agents already exist, just return the current count
    const { count: existing } = await supabase
      .from("agents")
      .select("*", { count: "exact", head: true });
    if (existing && existing > 0) {
      return new Response(
        JSON.stringify({ message: "Population already exists", count: existing }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate agents locally – no external AI key needed
    const rows = generateAgents(requestedCount);

    const { error: insertErr } = await supabase.from("agents").insert(rows);
    if (insertErr) throw new Error(`Insert error: ${insertErr.message}`);

    // Seed generation-0 stats
    const avgFitness = rows.reduce((s, a) => s + a.fitness, 0) / rows.length;
    const topFitness = Math.max(...rows.map((a) => a.fitness));

    await supabase.from("generations").upsert(
      {
        gen: 0,
        avg_fitness: Math.round(avgFitness * 10) / 10,
        top_fitness: Math.round(topFitness * 10) / 10,
        population: rows.length,
        diversity: 0.92,
      },
      { onConflict: "gen" },
    );

    // Ensure singleton rows exist
    await supabase.from("behavioral_genome").upsert(
      { id: 1, risk_tolerance: 0.62, drawdown_sensitivity: 0.78, earnings_avoidance: 0.45, momentum_bias: 0.33, holding_patience: 0.71 },
      { onConflict: "id" },
    );
    await supabase.from("environment_state").upsert(
      { id: 1, regime: "trending", volatility: "medium", earnings_active: false, macro_event: false, sentiment: 0.34 },
      { onConflict: "id" },
    );
    await supabase.from("portfolio").upsert(
      { id: 1, generation: 0, capital: 100000, pnl: 0, pnl_percent: 0 },
      { onConflict: "id" },
    );

    return new Response(
      JSON.stringify({ success: true, count: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Population generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
