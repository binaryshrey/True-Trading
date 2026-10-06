import { useMemo } from "react";
import { AgentGenome } from "@/data/types";
import { PortfolioState } from "@/components/PortfolioWidget";
import { ShieldAlert, Activity, BarChart3, Target } from "lucide-react";

interface RiskMetricsDashboardProps {
  agents: AgentGenome[];
  portfolio: PortfolioState;
  genHistory: { gen: number; avgFitness: number; topFitness: number; diversity: number }[];
}

export default function RiskMetricsDashboard({ agents, portfolio, genHistory }: RiskMetricsDashboardProps) {
  const metrics = useMemo(() => {
    const active = agents.filter((a) => a.status !== "extinct");
    if (active.length === 0) return null;

    // VaR (95%) — parametric, based on each agent's worst historical drawdown
    // from the 2-year SMA backtest. This answers: "if all agents simultaneously
    // hit a bad drawdown, how much of $100k could we lose at 95% confidence?"
    // Formula: VaR = 100k × (μ_DD + 1.645 × σ_DD) / 100
    // We deliberately use $100k baseline (not compounded capital) so the number
    // stays meaningful across generations.
    const BASE_CAPITAL = 100_000;
    const drawdowns = active.map((a) => a.maxDrawdown).filter((d) => d > 0);
    const ddMean = drawdowns.length > 0
      ? drawdowns.reduce((s, d) => s + d, 0) / drawdowns.length
      : 0;
    const ddVariance = drawdowns.length > 1
      ? drawdowns.reduce((s, d) => s + (d - ddMean) ** 2, 0) / (drawdowns.length - 1)
      : 0;
    const ddStdDev = Math.sqrt(ddVariance);
    // 1.645 = one-tailed z-score for 95% confidence
    const var95 = (ddMean + 1.645 * ddStdDev) / 100 * BASE_CAPITAL;

    // Max drawdown across agents
    const maxDD = Math.max(...active.map((a) => a.maxDrawdown), 0);
    const avgDD = active.reduce((s, a) => s + a.maxDrawdown, 0) / active.length;

    // Sharpe ratio (population average)
    const avgSharpe = active.reduce((s, a) => s + a.sharpe, 0) / active.length;

    // Win rate
    const avgWinRate = active.reduce((s, a) => s + a.winRate, 0) / active.length;

    // Diversity (correlation proxy — archetype concentration)
    const archetypeCounts: Record<string, number> = {};
    active.forEach((a) => {
      archetypeCounts[a.archetype] = (archetypeCounts[a.archetype] || 0) + 1;
    });
    const concentrations = Object.values(archetypeCounts).map((c) => c / active.length);
    const hhi = concentrations.reduce((s, c) => s + c * c, 0);

    // Population fitness standard deviation
    const avgFit = active.reduce((s, a) => s + a.fitness, 0) / active.length;
    const fitVariance = active.reduce((s, a) => s + (a.fitness - avgFit) ** 2, 0) / active.length;
    const fitStdDev = Math.sqrt(fitVariance);

    return {
      var95: Math.round(var95),
      maxDD: Math.round(maxDD * 10) / 10,
      avgDD: Math.round(avgDD * 10) / 10,
      avgSharpe: Math.round(avgSharpe * 100) / 100,
      avgWinRate: Math.round(avgWinRate * 10) / 10,
      hhi: Math.round(hhi * 100),
      fitStdDev: Math.round(fitStdDev * 10) / 10,
      activeCount: active.length,
    };
  }, [agents, portfolio, genHistory]);

  if (!metrics) return null;

  const riskLevel =
    metrics.hhi > 40 ? "HIGH" :
    metrics.hhi > 25 ? "MEDIUM" : "LOW";
  const riskColor =
    riskLevel === "HIGH" ? "text-destructive" :
    riskLevel === "MEDIUM" ? "text-[hsl(var(--apex-amber))]" : "text-primary";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5" />
          Risk Metrics
        </h3>
        <span className={`font-mono text-[10px] font-semibold ${riskColor}`}>
          {riskLevel} CONCENTRATION
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={<ShieldAlert className="h-3 w-3 text-destructive" />}
          label="VaR (95%)"
          value={`$${metrics.var95.toLocaleString()}`}
          sub="of $100k at 95%"
        />
        <MetricCard
          icon={<Activity className="h-3 w-3 text-[hsl(var(--apex-amber))]" />}
          label="Max Drawdown"
          value={`${metrics.maxDD}%`}
          sub={`Avg: ${metrics.avgDD}%`}
        />
        <MetricCard
          icon={<BarChart3 className="h-3 w-3 text-[hsl(var(--apex-cyan))]" />}
          label="Avg Sharpe"
          value={metrics.avgSharpe.toFixed(2)}
          sub="Risk-adj return"
        />
        <MetricCard
          icon={<Target className="h-3 w-3 text-primary" />}
          label="Win Rate"
          value={`${metrics.avgWinRate}%`}
          sub={`σ: ${metrics.fitStdDev}`}
        />
      </div>

      {/* Concentration bar */}
      <div>
        <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
          <span>Strategy Concentration (HHI)</span>
          <span className="font-mono">{metrics.hhi}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              metrics.hhi > 40 ? "bg-destructive" :
              metrics.hhi > 25 ? "bg-[hsl(var(--apex-amber))]" : "bg-primary"
            }`}
            style={{ width: `${Math.min(metrics.hhi, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md bg-secondary px-2.5 py-2">
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="font-mono text-sm font-bold text-foreground">{value}</div>
      <div className="text-[8px] text-muted-foreground">{sub}</div>
    </div>
  );
}
