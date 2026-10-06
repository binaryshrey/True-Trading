import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, TrendingDown, Briefcase, BarChart3, RefreshCw, Zap } from "lucide-react";

interface PortfolioData {
  capital: number;
  pnl: number;
  pnlPercent: number;
  generation: number;
}

interface AlpacaPosition {
  symbol: string;
  qty: number;
  side: string;
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  currentPrice: number;
  avgEntryPrice: number;
}

interface AlpacaOrder {
  id: string;
  symbol: string;
  side: string;
  qty: number;
  filledQty: number;
  type: string;
  status: string;
  filledAvgPrice: number | null;
  createdAt: string;
}

interface Props {
  portfolio: PortfolioData;
}

export default function AlpacaPaperPanel({ portfolio = { capital: 100000, pnl: 0, pnlPercent: 0, generation: 0 } }: Props) {
  const [positions, setPositions] = useState<AlpacaPosition[]>([]);
  const [orders, setOrders] = useState<AlpacaOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"account" | "positions" | "orders">("account");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [posRes, ordRes] = await Promise.all([
        supabase.functions.invoke("alpaca-trade", { body: { action: "positions" } }),
        supabase.functions.invoke("alpaca-trade", { body: { action: "orders" } }),
      ]);
      if (posRes.data && !posRes.error) setPositions(posRes.data);
      if (ordRes.data && !ordRes.error) setOrders(ordRes.data);
    } catch (e) {
      console.error("Alpaca fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const tabs = [
    { key: "account" as const, label: "Account", icon: Briefcase },
    { key: "positions" as const, label: "Positions", icon: BarChart3 },
    { key: "orders" as const, label: "Orders", icon: Zap },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5 text-primary" />
          Alpaca Paper Trading
        </h3>
        <button onClick={fetchData} disabled={isLoading} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-md bg-secondary p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1 rounded px-2 py-1 text-[10px] font-mono transition-colors ${
              activeTab === tab.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-2.5 w-2.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Account Tab — uses internal portfolio data */}
      {activeTab === "account" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-secondary px-2 py-1.5 text-center">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Sim. Value</div>
              <div className="text-sm font-mono font-bold text-foreground">${portfolio.capital.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="rounded-md bg-secondary px-2 py-1.5 text-center">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">2yr P&L</div>
              <div className={`text-sm font-mono font-bold ${portfolio.pnl >= 0 ? "text-primary" : "text-destructive"}`}>
                {portfolio.pnl >= 0 ? "+" : ""}${portfolio.pnl.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="rounded-md bg-secondary px-2 py-1.5 text-center">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">2yr Return</div>
              <div className={`text-xs font-mono font-bold ${portfolio.pnlPercent >= 0 ? "text-primary" : "text-destructive"}`}>
                {portfolio.pnlPercent >= 0 ? "+" : ""}{portfolio.pnlPercent.toFixed(1)}%
              </div>
            </div>
            <div className="rounded-md bg-secondary px-2 py-1.5 text-center">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Generation</div>
              <div className="text-xs font-mono text-foreground">Gen {portfolio.generation}</div>
            </div>
          </div>
          <div className="text-[9px] font-mono text-center py-1 rounded bg-secondary text-muted-foreground leading-tight">
            $100k deployed this generation · fitness-weighted 2yr backtest return
          </div>
        </motion.div>
      )}

      {/* Positions Tab */}
      {activeTab === "positions" && positions.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
          {positions.map((pos) => (
            <div key={pos.symbol} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
              <div>
                <span className="font-mono text-xs font-semibold text-foreground">{pos.symbol}</span>
                <span className="text-[9px] text-muted-foreground ml-1">{pos.qty} shares</span>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs text-muted-foreground">${pos.currentPrice.toFixed(2)}</div>
                <div className={`font-mono text-[10px] font-semibold flex items-center gap-0.5 justify-end ${pos.unrealizedPnl >= 0 ? "text-primary" : "text-destructive"}`}>
                  {pos.unrealizedPnl >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {pos.unrealizedPnl >= 0 ? "+" : ""}${pos.unrealizedPnl.toFixed(2)} ({pos.unrealizedPnlPercent.toFixed(2)}%)
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {activeTab === "positions" && positions.length === 0 && (
        <div className="text-center py-3 text-[10px] text-muted-foreground">No open positions</div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && orders.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5 max-h-48 overflow-y-auto">
          {orders.slice(0, 10).map((ord) => (
            <div key={ord.id} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
              <div>
                <span className={`text-[10px] font-mono font-bold uppercase ${ord.side === "buy" ? "text-primary" : "text-destructive"}`}>{ord.side}</span>
                <span className="font-mono text-xs font-semibold text-foreground ml-1">{ord.symbol}</span>
                <span className="text-[9px] text-muted-foreground ml-1">×{ord.qty}</span>
              </div>
              <div className="text-right">
                <div className={`text-[9px] font-mono ${ord.status === "filled" ? "text-primary" : ord.status === "canceled" ? "text-destructive" : "text-muted-foreground"}`}>
                  {ord.status}
                </div>
                {ord.filledAvgPrice && <div className="text-[9px] font-mono text-muted-foreground">${ord.filledAvgPrice.toFixed(2)}</div>}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {activeTab === "orders" && orders.length === 0 && (
        <div className="text-center py-3 text-[10px] text-muted-foreground">No recent orders</div>
      )}
    </div>
  );
}
