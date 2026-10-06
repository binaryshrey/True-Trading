import { motion } from "framer-motion";
import { MarketSnapshot } from "@/data/types";
import { Globe, TrendingUp, TrendingDown, Newspaper, ThermometerSun, RefreshCw } from "lucide-react";

interface MarketContextPanelProps {
  snapshot: MarketSnapshot | null;
  isLoading: boolean;
  onRefresh: () => void;
}

const moodColors: Record<string, string> = {
  euphoric: "text-primary",
  bullish: "text-primary",
  cautious: "text-[hsl(var(--apex-amber))]",
  fearful: "text-destructive",
  panicking: "text-destructive",
};

export default function MarketContextPanel({ snapshot, isLoading, onRefresh }: MarketContextPanelProps) {
  const crypto = snapshot?.data?.crypto;
  const fearGreed = snapshot?.data?.fearGreed;

  const coins = crypto
    ? [
        { key: "bitcoin", symbol: "BTC" },
        { key: "ethereum", symbol: "ETH" },
        { key: "solana", symbol: "SOL" },
        { key: "cardano", symbol: "ADA" },
        { key: "avalanche-2", symbol: "AVAX" },
      ]
    : [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Globe className="h-3.5 w-3.5" />
          Live Market Context
        </h3>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Crypto prices */}
      {crypto && (
        <div className="space-y-1.5">
          {coins.map(({ key, symbol }) => {
            const coin = crypto[key];
            if (!coin) return null;
            const change = coin.usd_24h_change || 0;
            const isUp = change >= 0;
            return (
              <div key={key} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                <span className="font-mono text-xs font-semibold text-foreground">{symbol}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">
                    ${coin.usd?.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>
                  <span className={`font-mono text-[10px] font-semibold flex items-center gap-0.5 ${isUp ? "text-primary" : "text-destructive"}`}>
                    {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {isUp ? "+" : ""}{change.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fear & Greed + Mood */}
      <div className="grid grid-cols-2 gap-2">
        {fearGreed && (
          <div className="rounded-md bg-secondary px-2 py-1.5 text-center">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Fear & Greed</div>
            <div className={`text-sm font-mono font-bold ${
              Number(fearGreed.value) > 60 ? "text-primary" :
              Number(fearGreed.value) < 40 ? "text-destructive" : "text-[hsl(var(--apex-amber))]"
            }`}>
              {fearGreed.value}
            </div>
            <div className="text-[8px] text-muted-foreground">{fearGreed.value_classification}</div>
          </div>
        )}
        {snapshot?.data?.marketMood && (
          <div className="rounded-md bg-secondary px-2 py-1.5 text-center">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Market Mood</div>
            <div className={`text-sm font-mono font-bold capitalize ${moodColors[snapshot.data.marketMood] || "text-foreground"}`}>
              {snapshot.data.marketMood}
            </div>
            <div className="text-[8px] text-muted-foreground flex items-center justify-center gap-0.5">
              <ThermometerSun className="h-2.5 w-2.5" /> AI Classified
            </div>
          </div>
        )}
      </div>

      {/* AI News Headlines */}
      {snapshot?.data?.newsHeadlines && snapshot.data.newsHeadlines.length > 0 && (
        <div className="space-y-1">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Newspaper className="h-2.5 w-2.5" /> Market Headlines
          </div>
          {snapshot.data.newsHeadlines.slice(0, 4).map((headline, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-[10px] text-muted-foreground leading-tight pl-2 border-l border-border"
            >
              {headline}
            </motion.div>
          ))}
        </div>
      )}

      {/* Last updated */}
      {snapshot?.data?.timestamp && (
        <div className="text-[8px] font-mono text-muted-foreground text-right">
          Updated: {new Date(snapshot.data.timestamp).toLocaleTimeString()}
        </div>
      )}

      {!snapshot && !isLoading && (
        <div className="text-center py-3 text-[10px] text-muted-foreground">
          No market data yet. Click refresh to fetch live prices.
        </div>
      )}
    </div>
  );
}
