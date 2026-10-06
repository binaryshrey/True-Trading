import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Landmark, RefreshCw, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

interface FredIndicator {
  name: string;
  value: number;
  previous: number | null;
  change: number | null;
  unit: string;
  date: string;
}

interface MacroSignal {
  yieldCurveInverted: boolean;
  highVolatility: boolean;
  extremeFear: boolean;
  recessionary: boolean;
}

interface StockQuote {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  previousClose: number;
}

interface StockSignal {
  equityTrend: string;
  safeHavenBid: boolean;
  bondRally: boolean;
  riskAppetite: string;
}

export default function MacroDataPanel() {
  const [indicators, setIndicators] = useState<Record<string, FredIndicator>>({});
  const [macroSignal, setMacroSignal] = useState<MacroSignal | null>(null);
  const [stocks, setStocks] = useState<Record<string, StockQuote>>({});
  const [stockSignal, setStockSignal] = useState<StockSignal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"macro" | "stocks">("macro");

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fredRes, stockRes] = await Promise.all([
        supabase.functions.invoke("fetch-fred-data"),
        supabase.functions.invoke("fetch-stock-data"),
      ]);
      if (fredRes.data && !fredRes.error) {
        setIndicators(fredRes.data.indicators || {});
        setMacroSignal(fredRes.data.macroSignal || null);
      }
      if (stockRes.data && !stockRes.error) {
        setStocks(stockRes.data.quotes || {});
        setStockSignal(stockRes.data.stockSignal || null);
      }
    } catch (e) {
      console.error("Macro data error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const hasData = Object.keys(indicators).length > 0 || Object.keys(stocks).length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Landmark className="h-3.5 w-3.5 text-accent" />
          Macro & Equities
        </h3>
        <button onClick={fetchAll} disabled={isLoading} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-md bg-secondary p-0.5">
        {(["macro", "stocks"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded px-2 py-1 text-[10px] font-mono transition-colors ${
              activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "macro" ? "FRED Macro" : "Equities"}
          </button>
        ))}
      </div>

      {!hasData && !isLoading && (
        <div className="text-center py-4">
          <p className="text-[10px] text-muted-foreground mb-2">Fetch FRED macro indicators & equity data.</p>
          <button onClick={fetchAll} className="text-[10px] font-mono text-primary hover:underline">Load Data →</button>
        </div>
      )}

      {/* Macro Tab */}
      {activeTab === "macro" && Object.keys(indicators).length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {/* Signal Alerts */}
          {macroSignal && (
            <div className="space-y-1">
              {macroSignal.yieldCurveInverted && (
                <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-[9px] font-mono text-destructive">
                  <AlertTriangle className="h-2.5 w-2.5" /> Yield Curve Inverted
                </div>
              )}
              {macroSignal.extremeFear && (
                <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-[9px] font-mono text-destructive">
                  <AlertTriangle className="h-2.5 w-2.5" /> VIX Extreme Fear (&gt;35)
                </div>
              )}
              {macroSignal.highVolatility && !macroSignal.extremeFear && (
                <div className="flex items-center gap-1.5 rounded-md bg-[hsl(var(--apex-amber))]/10 px-2 py-1 text-[9px] font-mono text-[hsl(var(--apex-amber))]">
                  <AlertTriangle className="h-2.5 w-2.5" /> Elevated Volatility
                </div>
              )}
            </div>
          )}

          {/* Indicators */}
          {Object.entries(indicators).map(([key, ind]) => (
            <div key={key} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
              <span className="text-[10px] text-muted-foreground">{ind.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">
                  {ind.value.toFixed(2)}{ind.unit}
                </span>
                {ind.change !== null && (
                  <span className={`font-mono text-[9px] flex items-center gap-0.5 ${ind.change >= 0 ? "text-primary" : "text-destructive"}`}>
                    {ind.change >= 0 ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
                    {ind.change >= 0 ? "+" : ""}{ind.change.toFixed(3)}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="text-[8px] font-mono text-muted-foreground text-right">
            Latest: {Object.values(indicators)[0]?.date}
          </div>
        </motion.div>
      )}

      {/* Stocks Tab */}
      {activeTab === "stocks" && Object.keys(stocks).length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {stockSignal && (
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-md bg-secondary px-2 py-1 text-center">
                <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Equity Trend</div>
                <div className={`text-[10px] font-mono font-bold capitalize ${stockSignal.equityTrend === "bullish" ? "text-primary" : "text-destructive"}`}>
                  {stockSignal.equityTrend}
                </div>
              </div>
              <div className="rounded-md bg-secondary px-2 py-1 text-center">
                <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Risk Appetite</div>
                <div className={`text-[10px] font-mono font-bold capitalize ${stockSignal.riskAppetite === "risk-on" ? "text-primary" : "text-destructive"}`}>
                  {stockSignal.riskAppetite}
                </div>
              </div>
            </div>
          )}

          {Object.entries(stocks).map(([symbol, quote]) => (
            <div key={symbol} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
              <span className="font-mono text-xs font-semibold text-foreground">{symbol}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">${quote.price.toFixed(2)}</span>
                <span className={`font-mono text-[10px] font-semibold flex items-center gap-0.5 ${quote.changePercent >= 0 ? "text-primary" : "text-destructive"}`}>
                  {quote.changePercent >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {quote.changePercent >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
