import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, DollarSign, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface PortfolioState {
  capital: number;
  pnl: number;
  pnlPercent: number;
  generation: number;
}

interface AlpacaAccount {
  equity: number;
  cash: number;
  buyingPower: number;
  portfolioValue: number;
  pnl: number;
  pnlPercent: number;
  status: string;
}

interface PortfolioWidgetProps {
  portfolio: PortfolioState;
  isRunning: boolean;
}

export default function PortfolioWidget({ portfolio, isRunning }: PortfolioWidgetProps) {
  const [alpaca, setAlpaca] = useState<AlpacaAccount | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAlpaca = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("alpaca-trade", { body: { action: "account" } });
      if (!error && data) setAlpaca(data);
    } catch (e) {
      console.error("Alpaca fetch:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlpaca(); }, [fetchAlpaca, portfolio.generation]);

  const equity = alpaca?.equity ?? portfolio.capital;
  const pnl = alpaca?.pnl ?? portfolio.pnl;
  const pnlPercent = alpaca?.pnlPercent ?? portfolio.pnlPercent;
  const isPositive = pnl >= 0;
  const startingCapital = 100000;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-accent" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Alpaca Portfolio
          </h3>
        </div>
        <button onClick={fetchAlpaca} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Equity</div>
          <motion.div
            key={equity}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-2xl font-mono font-bold text-foreground"
          >
            <DollarSign className="inline h-5 w-5 text-muted-foreground" />
            {equity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </motion.div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Day P&L</div>
          <div className={`text-lg font-mono font-bold flex items-center gap-1 ${isPositive ? "text-primary" : "text-destructive"}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isPositive ? "+" : ""}{pnlPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Capital bar */}
      <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.max((equity / 150000) * 100, 5), 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${isPositive ? "bg-primary/60" : "bg-destructive/60"}`}
        />
        <div
          className="absolute top-0 h-full w-px bg-muted-foreground/50"
          style={{ left: `${(startingCapital / 150000) * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px] font-mono text-muted-foreground">$0</span>
        <span className="text-[8px] font-mono text-muted-foreground">$100K start</span>
        <span className="text-[8px] font-mono text-muted-foreground">$150K</span>
      </div>

      {alpaca && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-md bg-secondary px-2 py-1 text-center">
            <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Cash</div>
            <div className="text-[11px] font-mono text-foreground">${alpaca.cash.toLocaleString()}</div>
          </div>
          <div className="rounded-md bg-secondary px-2 py-1 text-center">
            <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Buying Power</div>
            <div className="text-[11px] font-mono text-foreground">${alpaca.buyingPower.toLocaleString()}</div>
          </div>
        </div>
      )}

      {isRunning && (
        <div className="mt-2 text-center text-[10px] font-mono text-accent animate-pulse">
          Agents trading...
        </div>
      )}
    </div>
  );
}
