/**
 * PopulationHealthPanel.tsx
 *
 * Replaces the old StrategyAllocation widget.
 * Shows real, backtest-derived metrics:
 *   • Portfolio diversification across crypto assets (based on genome.assetIdx)
 *   • Sharpe / MaxDrawdown / WinRate distribution across the live population
 *   • Top-5 agents by Sharpe for at-a-glance comparison
 *
 * All numbers come directly from `backtestAgent()` results — nothing is simulated
 * or averaged from made-up multipliers.
 */
import { useMemo } from "react";
import { AgentGenome } from "@/data/types";
import { BacktestResult, assetLabel } from "@/lib/backtest";
import { BarChart3, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

interface Props {
  agents: AgentGenome[];
  results: Record<string, BacktestResult>;
  totalCapital: number;
}

// Map 15 asset labels to short display names
const ASSET_COLORS: Record<string, string> = {
  BTC: "bg-[hsl(38_100%_55%)]",
  ETH: "bg-[hsl(250_70%_65%)]",
  BNB: "bg-[hsl(48_100%_60%)]",
  SOL: "bg-[hsl(280_80%_65%)]",
  XRP: "bg-[hsl(195_100%_50%)]",
  DOGE: "bg-[hsl(55_100%_55%)]",
  ADA: "bg-[hsl(220_80%_60%)]",
  AVAX: "bg-destructive",
  LINK: "bg-[hsl(215_100%_60%)]",
  DOT: "bg-[hsl(340_80%_60%)]",
  MATIC: "bg-[hsl(260_80%_65%)]",
  LTC: "bg-[hsl(215_12%_65%)]",
  UNI: "bg-[hsl(295_80%_65%)]",
  ATOM: "bg-[hsl(170_80%_45%)]",
  TRX: "bg-[hsl(10_90%_60%)]",
  // extended 10
  NEAR: "bg-[hsl(142_70%_50%)]",
  XLM: "bg-[hsl(200_80%_60%)]",
  FIL:  "bg-[hsl(20_80%_55%)]",
  AAVE: "bg-[hsl(250_90%_65%)]",
  SHIB: "bg-[hsl(30_100%_55%)]",
  ALGO: "bg-[hsl(185_60%_50%)]",
  INJ:  "bg-[hsl(320_80%_60%)]",
  APT:  "bg-[hsl(160_80%_45%)]",
  ARB:  "bg-[hsl(210_100%_60%)]",
  OP:   "bg-[hsl(5_85%_60%)]",
};

const ASSET_TEXT: Record<string, string> = {
  BTC: "text-[hsl(38_100%_55%)]",
  ETH: "text-[hsl(250_70%_65%)]",
  BNB: "text-[hsl(48_100%_60%)]",
  SOL: "text-[hsl(280_80%_65%)]",
  XRP: "text-[hsl(195_100%_50%)]",
  DOGE: "text-[hsl(55_100%_55%)]",
  ADA: "text-[hsl(220_80%_60%)]",
  AVAX: "text-destructive",
  LINK: "text-[hsl(215_100%_60%)]",
  DOT: "text-[hsl(340_80%_60%)]",
  MATIC: "text-[hsl(260_80%_65%)]",
  LTC: "text-[hsl(215_12%_65%)]",
  UNI: "text-[hsl(295_80%_65%)]",
  ATOM: "text-[hsl(170_80%_45%)]",
  TRX: "text-[hsl(10_90%_60%)]",
  // extended 10
  NEAR: "text-[hsl(142_70%_50%)]",
  XLM:  "text-[hsl(200_80%_60%)]",
  FIL:  "text-[hsl(20_80%_55%)]",
  AAVE: "text-[hsl(250_90%_65%)]",
  SHIB: "text-[hsl(30_100%_55%)]",
  ALGO: "text-[hsl(185_60%_50%)]",
  INJ:  "text-[hsl(320_80%_60%)]",
  APT:  "text-[hsl(160_80%_45%)]",
  ARB:  "text-[hsl(210_100%_60%)]",
  OP:   "text-[hsl(5_85%_60%)]",
};

export default function PopulationHealthPanel({ agents, results, totalCapital }: Props) {
  const active = useMemo(() => agents.filter(a => a.status !== "extinct"), [agents]);

  // ── Asset diversification ──────────────────────────────────────────────────
  const assetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    active.forEach(a => {
      const label = assetLabel(a.genome.assetIdx);
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([asset, count]) => ({ asset, count, pct: (count / Math.max(active.length, 1)) * 100 }))
      .sort((a, b) => b.count - a.count);
  }, [active]);

  // ── Population stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const withResults = active.filter(a => results[a.id]);
    if (withResults.length === 0) return null;

    const sharpes = withResults.map(a => results[a.id].sharpe);
    const dds     = withResults.map(a => results[a.id].maxDrawdown);
    const wins    = withResults.map(a => results[a.id].winRate);

    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const max = (arr: number[]) => Math.max(...arr);
    const min = (arr: number[]) => Math.min(...arr);

    // Fitness-weighted portfolio return (the real diversified portfolio value)
    const totalFit = withResults.reduce((s, a) => s + Math.max(a.fitness, 0.01), 0);
    const weightedReturn = withResults.reduce((s, a) => {
      const w = Math.max(a.fitness, 0.01) / totalFit;
      return s + w * results[a.id].totalReturn;
    }, 0);

    return {
      avgSharpe: +avg(sharpes).toFixed(2),
      bestSharpe: +max(sharpes).toFixed(2),
      worstSharpe: +min(sharpes).toFixed(2),
      avgDD: +avg(dds).toFixed(1),
      worstDD: +max(dds).toFixed(1),
      avgWin: +avg(wins).toFixed(1),
      weightedReturn: +weightedReturn.toFixed(2),
      count: withResults.length,
    };
  }, [active, results]);

  // ── Top 5 by Sharpe ────────────────────────────────────────────────────────
  const top5 = useMemo(() => {
    return active
      .filter(a => results[a.id])
      .sort((a, b) => results[b.id].sharpe - results[a.id].sharpe)
      .slice(0, 5);
  }, [active, results]);

  if (active.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
          <Activity className="h-3.5 w-3.5" />
          Population Health
        </h3>
        <p className="text-[10px] text-muted-foreground font-mono text-center py-4">
          No active agents — spawn a population to see metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" />
          Population Health
        </h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          {active.length} active agents · {assetCounts.length} assets
        </span>
      </div>

      {/* ── Key stats grid ───────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          <Stat
            label="Avg Sharpe"
            value={stats.avgSharpe.toFixed(2)}
            sub={`Best: ${stats.bestSharpe}`}
            color={stats.avgSharpe >= 1 ? "text-primary" : stats.avgSharpe >= 0 ? "text-foreground" : "text-destructive"}
          />
          <Stat
            label="Avg Max DD"
            value={`${stats.avgDD}%`}
            sub={`Worst: ${stats.worstDD}%`}
            color={stats.avgDD <= 15 ? "text-primary" : stats.avgDD <= 30 ? "text-[hsl(38_100%_55%)]" : "text-destructive"}
          />
          <Stat
            label="Avg Win Rate"
            value={`${stats.avgWin}%`}
            sub="Round-trips"
            color={stats.avgWin >= 55 ? "text-primary" : stats.avgWin >= 45 ? "text-foreground" : "text-destructive"}
          />
          <Stat
            label="2yr Return"
            value={`${stats.weightedReturn >= 0 ? "+" : ""}${stats.weightedReturn}%`}
            sub="Backtest · wtd"
            color={stats.weightedReturn >= 0 ? "text-primary" : "text-destructive"}
          />
        </div>
      )}

      {/* ── Asset diversification bar ────────────────────────────────────── */}
      <div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">
          Asset Diversification — {assetCounts.length} crypto{assetCounts.length !== 1 ? "s" : ""} across {active.length} agents
        </div>
        {/* Stacked allocation bar */}
        <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
          {assetCounts.map(({ asset, pct }) => (
            <div
              key={asset}
              className={`h-full ${ASSET_COLORS[asset] ?? "bg-muted"}`}
              style={{ width: `${pct}%` }}
              title={`${asset}: ${Math.round(pct)}% of agents`}
            />
          ))}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {assetCounts.map(({ asset, count, pct }) => (
            <span key={asset} className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
              <span className={`font-semibold ${ASSET_TEXT[asset] ?? "text-foreground"}`}>{asset}</span>
              <span>{count}×</span>
              <span className="opacity-60">({pct.toFixed(0)}%)</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Top 5 by Sharpe ─────────────────────────────────────────────── */}
      {top5.length > 0 && (
        <div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">
            Top Agents by Sharpe
          </div>
          <div className="space-y-1">
            {top5.map((agent, i) => {
              const r = results[agent.id];
              if (!r) return null;
              const asst = assetLabel(agent.genome.assetIdx);
              return (
                <div key={agent.id} className="flex items-center gap-2 py-1 px-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <span className="font-mono text-[9px] text-muted-foreground w-3">{i + 1}</span>
                  <span className={`text-[10px] font-semibold ${ASSET_TEXT[asst] ?? ""}`}>{asst}</span>
                  <span className="text-[10px] font-medium text-foreground truncate flex-1">{agent.name}</span>
                  <span className={`font-mono text-[10px] font-semibold ${r.sharpe >= 1 ? "text-primary" : r.sharpe >= 0 ? "text-foreground" : "text-destructive"}`}>
                    S {r.sharpe.toFixed(2)}
                  </span>
                  <span className={`font-mono text-[10px] ${r.maxDrawdown <= 15 ? "text-primary" : "text-[hsl(38_100%_55%)]"}`}>
                    DD {r.maxDrawdown.toFixed(1)}%
                  </span>
                  <span className={`font-mono text-[9px] ${r.totalReturn >= 0 ? "text-primary" : "text-destructive"}`}>
                    {r.totalReturn >= 0 ? "+" : ""}{r.totalReturn.toFixed(1)}%
                  </span>
                  {r.totalReturn > 0 ? (
                    <TrendingUp className="h-2.5 w-2.5 text-primary shrink-0" />
                  ) : r.totalReturn < 0 ? (
                    <TrendingDown className="h-2.5 w-2.5 text-destructive shrink-0" />
                  ) : (
                    <Minus className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Diversification note ─────────────────────────────────────────── */}
      <p className="text-[9px] font-mono text-muted-foreground leading-tight">
        "2yr Return" = fitness-weighted avg of each agent’s 2-year SMA backtest return (not a per-generation delta).
        Portfolio equity on the left compounds this each generation: e.g. gen 7 equity = $100k × (1+r₁)×…×(1+r₇).
        Fitness now penalises agents with &lt;10 trades (overfitting guard) and agents whose strategy collapses in year 2.
      </p>
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-md bg-secondary/50 px-2 py-2">
      <div className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[8px] text-muted-foreground opacity-70">{sub}</div>
    </div>
  );
}
