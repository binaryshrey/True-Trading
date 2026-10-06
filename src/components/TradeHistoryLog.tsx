import { motion, AnimatePresence } from "framer-motion";
import { TradeRecord } from "@/data/types";
import { ScrollText, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TradeHistoryLogProps {
  trades: TradeRecord[];
}

const actionIcons = {
  buy: TrendingUp,
  sell: TrendingDown,
  hold: Minus,
};

const actionColors = {
  buy: "text-primary",
  sell: "text-destructive",
  hold: "text-muted-foreground",
};

export default function TradeHistoryLog({ trades }: TradeHistoryLogProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ScrollText className="h-3.5 w-3.5" />
          Trade History
        </h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          {trades.length} trades
        </span>
      </div>

      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {trades.length === 0 ? (
            <div className="text-center py-6 text-[10px] text-muted-foreground">
              No trades yet. Run a generation to generate simulated trades.
            </div>
          ) : (
            trades.map((trade, i) => {
              const Icon = actionIcons[trade.action] || Minus;
              const isProfit = trade.pnl > 0;
              return (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`h-3 w-3 shrink-0 ${actionColors[trade.action]}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-[10px] font-semibold uppercase ${actionColors[trade.action]}`}>
                          {trade.action}
                        </span>
                        <span className="font-mono text-[10px] text-foreground">{trade.asset}</span>
                        <span className="font-mono text-[9px] text-muted-foreground">@${trade.entryPrice.toLocaleString()}</span>
                      </div>
                      <div className="text-[9px] text-muted-foreground truncate">
                        {trade.agentName} · Gen {trade.generation}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className={`font-mono text-[10px] font-semibold ${isProfit ? "text-primary" : trade.pnl < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {isProfit ? "+" : ""}{trade.pnl > 0 || trade.pnl < 0 ? `$${Math.abs(trade.pnl).toFixed(0)}` : "—"}
                    </div>
                    {trade.rationale && (
                      <div className="text-[8px] text-muted-foreground truncate max-w-[120px]">
                        {trade.rationale}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
