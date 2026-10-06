import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const ALPHA_VANTAGE_API_KEY = Deno.env.get("ALPHA_VANTAGE_API_KEY");
    if (!ALPHA_VANTAGE_API_KEY) throw new Error("ALPHA_VANTAGE_API_KEY is not configured");

    const { symbols = ["SPY", "QQQ", "IWM", "GLD", "TLT"] } = await req.json().catch(() => ({}));

    const results: Record<string, any> = {};

    // Fetch quotes in parallel (Alpha Vantage has rate limits, so we limit to 5)
    await Promise.all(
      symbols.slice(0, 5).map(async (symbol: string) => {
        try {
          const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
          const res = await fetch(url);
          if (!res.ok) return;
          const data = await res.json();
          const quote = data["Global Quote"];
          if (quote && quote["05. price"]) {
            results[symbol] = {
              price: Number(quote["05. price"]),
              change: Number(quote["09. change"]),
              changePercent: parseFloat(quote["10. change percent"]),
              volume: Number(quote["06. volume"]),
              high: Number(quote["03. high"]),
              low: Number(quote["04. low"]),
              previousClose: Number(quote["08. previous close"]),
            };
          }
        } catch (e) {
          console.error(`Alpha Vantage ${symbol} error:`, e);
        }
      })
    );

    // Derive market signals
    const spy = results.SPY;
    const tlt = results.TLT;
    const gld = results.GLD;

    const stockSignal = {
      equityTrend: spy ? (spy.changePercent > 0 ? "bullish" : "bearish") : "unknown",
      safeHavenBid: gld ? gld.changePercent > 0.5 : false,
      bondRally: tlt ? tlt.changePercent > 0.3 : false,
      riskAppetite: spy && tlt ? (spy.changePercent > tlt.changePercent ? "risk-on" : "risk-off") : "neutral",
    };

    return new Response(JSON.stringify({ quotes: results, stockSignal, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stock data error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
