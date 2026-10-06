import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

// Key macro indicators
const SERIES = [
  { id: "DFF", name: "Fed Funds Rate", unit: "%" },
  { id: "T10Y2Y", name: "10Y-2Y Spread", unit: "%" },
  { id: "VIXCLS", name: "VIX", unit: "" },
  { id: "UNRATE", name: "Unemployment", unit: "%" },
  { id: "CPIAUCSL", name: "CPI", unit: "" },
  { id: "DGS10", name: "10Y Treasury", unit: "%" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FRED_API_KEY = Deno.env.get("FRED_API_KEY");
    if (!FRED_API_KEY) throw new Error("FRED_API_KEY is not configured");

    const results: Record<string, any> = {};

    await Promise.all(
      SERIES.map(async (series) => {
        try {
          const url = `${FRED_BASE}?series_id=${series.id}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=5`;
          const res = await fetch(url);
          if (!res.ok) return;
          const data = await res.json();
          const obs = data.observations?.filter((o: any) => o.value !== ".");
          if (obs && obs.length > 0) {
            const latest = Number(obs[0].value);
            const previous = obs.length > 1 ? Number(obs[1].value) : null;
            results[series.id] = {
              name: series.name,
              value: latest,
              previous,
              change: previous !== null ? Math.round((latest - previous) * 1000) / 1000 : null,
              unit: series.unit,
              date: obs[0].date,
            };
          }
        } catch (e) {
          console.error(`FRED ${series.id} error:`, e);
        }
      })
    );

    // Derive macro signals
    const vix = results.VIXCLS?.value;
    const spread = results.T10Y2Y?.value;
    const macroSignal = {
      yieldCurveInverted: spread !== undefined && spread < 0,
      highVolatility: vix !== undefined && vix > 25,
      extremeFear: vix !== undefined && vix > 35,
      recessionary: spread !== undefined && spread < -0.5,
    };

    return new Response(JSON.stringify({ indicators: results, macroSignal, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("FRED error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
