import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALPACA_BASE = "https://paper-api.alpaca.markets";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ALPACA_API_KEY = Deno.env.get("ALPACA_API_KEY");
    const ALPACA_SECRET_KEY = Deno.env.get("ALPACA_SECRET_KEY");
    if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
      throw new Error("Alpaca API keys not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, trades } = await req.json();

    const alpacaHeaders = {
      "APCA-API-KEY-ID": ALPACA_API_KEY,
      "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
      "Content-Type": "application/json",
    };

    // ─── Get Account Info ───
    if (action === "account") {
      const res = await fetch(`${ALPACA_BASE}/v2/account`, { headers: alpacaHeaders });
      if (!res.ok) throw new Error(`Alpaca account error [${res.status}]: ${await res.text()}`);
      const account = await res.json();
      return new Response(JSON.stringify({
        equity: Number(account.equity),
        cash: Number(account.cash),
        buyingPower: Number(account.buying_power),
        portfolioValue: Number(account.portfolio_value),
        pnl: Number(account.equity) - Number(account.last_equity),
        pnlPercent: ((Number(account.equity) - Number(account.last_equity)) / Number(account.last_equity)) * 100,
        status: account.status,
        patternDayTrader: account.pattern_day_trader,
        tradingBlocked: account.trading_blocked,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Get Positions ───
    if (action === "positions") {
      const res = await fetch(`${ALPACA_BASE}/v2/positions`, { headers: alpacaHeaders });
      if (!res.ok) throw new Error(`Alpaca positions error [${res.status}]: ${await res.text()}`);
      const positions = await res.json();
      return new Response(JSON.stringify(positions.map((p: any) => ({
        symbol: p.symbol,
        qty: Number(p.qty),
        side: p.side,
        marketValue: Number(p.market_value),
        costBasis: Number(p.cost_basis),
        unrealizedPnl: Number(p.unrealized_pl),
        unrealizedPnlPercent: Number(p.unrealized_plpc) * 100,
        currentPrice: Number(p.current_price),
        avgEntryPrice: Number(p.avg_entry_price),
      }))), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Get Recent Orders ───
    if (action === "orders") {
      const res = await fetch(`${ALPACA_BASE}/v2/orders?status=all&limit=50`, { headers: alpacaHeaders });
      if (!res.ok) throw new Error(`Alpaca orders error [${res.status}]: ${await res.text()}`);
      const orders = await res.json();
      return new Response(JSON.stringify(orders.map((o: any) => ({
        id: o.id,
        symbol: o.symbol,
        side: o.side,
        qty: Number(o.qty),
        filledQty: Number(o.filled_qty),
        type: o.type,
        status: o.status,
        filledAvgPrice: o.filled_avg_price ? Number(o.filled_avg_price) : null,
        createdAt: o.created_at,
      }))), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Execute Trades ───
    if (action === "execute" && trades && Array.isArray(trades)) {
      const results = [];
      for (const trade of trades.slice(0, 5)) {
        try {
          const orderBody: any = {
            symbol: trade.symbol,
            qty: String(trade.qty),
            side: trade.side, // "buy" or "sell"
            type: "market",
            time_in_force: "day",
          };

          const res = await fetch(`${ALPACA_BASE}/v2/orders`, {
            method: "POST",
            headers: alpacaHeaders,
            body: JSON.stringify(orderBody),
          });

          const order = await res.json();
          if (!res.ok) {
            results.push({ symbol: trade.symbol, status: "error", error: order.message || "Order failed" });
          } else {
            // Log to trade_history
            await supabase.from("trade_history").insert({
              agent_id: trade.agentId || "ALPACA",
              agent_name: trade.agentName || "Alpaca Paper",
              generation: trade.generation || 0,
              action: trade.side,
              asset: trade.symbol,
              entry_price: 0, // will be filled when order executes
              quantity: trade.qty,
              rationale: trade.rationale || `Alpaca paper trade: ${trade.side} ${trade.qty} ${trade.symbol}`,
            });
            results.push({ symbol: trade.symbol, status: "submitted", orderId: order.id });
          }
        } catch (e) {
          results.push({ symbol: trade.symbol, status: "error", error: e.message });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: account, positions, orders, execute" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Alpaca error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
