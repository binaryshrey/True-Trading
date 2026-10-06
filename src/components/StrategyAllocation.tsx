import { useMemo } from "react";
import { AgentGenome, EnvironmentState, BehavioralGenome } from "@/data/types";
import { PieChart, TrendingUp, Shield, Activity, Shuffle, Dna } from "lucide-react";

interface StrategyAllocationProps {
  agents: AgentGenome[];
  totalCapital: number;
  environment?: EnvironmentState;
  behavioralDna?: BehavioralGenome;
}

const archetypeConfig: Record<string, { icon: any; color: string; label: string }> = {
  momentum: { icon: TrendingUp, color: "bg-apex-cyan/20 text-apex-cyan border-apex-cyan/30", label: "Momentum" },
  defensive: { icon: Shield, color: "bg-apex-amber/20 text-apex-amber border-apex-amber/30", label: "Defensive" },
  volatility: { icon: Activity, color: "bg-apex-purple/20 text-apex-purple border-apex-purple/30", label: "Volatility" },
  "mean-reversion": { icon: Shuffle, color: "bg-primary/20 text-primary border-primary/30", label: "Mean Rev." },
  hybrid: { icon: Dna, color: "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30", label: "Hybrid" },
};

// Environment-archetype synergy multipliers
function getEnvironmentBoost(archetype: string, env?: EnvironmentState): number {
  if (!env) return 1;
  const boosts: Record<string, Record<string, number>> = {
    momentum:        { "trending": 1.4, "risk-on": 1.3, "choppy": 0.7, "risk-off": 0.6 },
    defensive:       { "trending": 0.8, "risk-on": 0.7, "choppy": 1.1, "risk-off": 1.5 },
    volatility:      { "trending": 0.9, "risk-on": 1.1, "choppy": 1.3, "risk-off": 1.0 },
    "mean-reversion":{ "trending": 0.7, "risk-on": 0.9, "choppy": 1.4, "risk-off": 1.1 },
    hybrid:          { "trending": 1.1, "risk-on": 1.1, "choppy": 1.1, "risk-off": 1.0 },
  };
  const volScale = env.volatility === "high" ? 0.9 : env.volatility === "low" ? 1.1 : 1.0;
  return (boosts[archetype]?.[env.regime] || 1) * volScale;
}

// Behavioral DNA preference multipliers
function getBehavioralBoost(archetype: string, beh?: BehavioralGenome): number {
  if (!beh) return 1;
  switch (archetype) {
    case "momentum":
      return 1 + (beh.momentumBias - 0.5) * 0.6 + (beh.riskTolerance - 0.5) * 0.3;
    case "defensive":
      return 1 + (beh.drawdownSensitivity - 0.5) * 0.5 + (0.5 - beh.riskTolerance) * 0.3;
    case "volatility":
      return 1 + (beh.riskTolerance - 0.5) * 0.5 + (0.5 - beh.drawdownSensitivity) * 0.3;
    case "mean-reversion":
      return 1 + (beh.holdingPatience - 0.5) * 0.5 + (0.5 - beh.momentumBias) * 0.3;
    case "hybrid":
      return 1 + (beh.holdingPatience - 0.5) * 0.2; // mild preference
    default:
      return 1;
  }
}

export default function StrategyAllocation({ agents, totalCapital, environment, behavioralDna }: StrategyAllocationProps) {
  const allocations = useMemo(() => {
    const active = agents.filter(a => a.status !== "extinct");
    const totalFitness = active.reduce((s, a) => s + Math.max(a.fitness, 0), 0);
    if (totalFitness === 0) return [];

    const byArchetype: Record<string, { count: number; totalScore: number; avgSharpe: number; avgWinRate: number }> = {};
    active.forEach(a => {
      if (!byArchetype[a.archetype]) {
        byArchetype[a.archetype] = { count: 0, totalScore: 0, avgSharpe: 0, avgWinRate: 0 };
      }
      const fit = Math.max(a.fitness, 0);
      const sharpeBoost = 1 + Math.max(a.sharpe, 0);
      const winBoost = 1 + (a.winRate / 100);
      // Apply environment synergy and behavioral DNA preference
      const envBoost = getEnvironmentBoost(a.archetype, environment);
      const behBoost = getBehavioralBoost(a.archetype, behavioralDna);
      byArchetype[a.archetype].count++;
      byArchetype[a.archetype].totalScore += (fit * fit) * sharpeBoost * winBoost * envBoost * behBoost;
      byArchetype[a.archetype].avgSharpe += a.sharpe;
      byArchetype[a.archetype].avgWinRate += a.winRate;
    });

    const totalScore = Object.values(byArchetype).reduce((s, d) => s + d.totalScore, 0);
    if (totalScore === 0) return [];

    return Object.entries(byArchetype)
      .map(([archetype, data]) => ({
        archetype,
        count: data.count,
        allocationPercent: (data.totalScore / totalScore) * 100,
        capitalAllocated: (data.totalScore / totalScore) * totalCapital,
        avgSharpe: data.avgSharpe / data.count,
      }))
      .sort((a, b) => b.allocationPercent - a.allocationPercent);
  }, [agents, totalCapital, environment, behavioralDna]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <PieChart className="h-4 w-4 text-accent" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Strategy Allocation
        </h3>
      </div>

      {/* Allocation bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-3 gap-0.5">
        {allocations.map(a => {
          const config = archetypeConfig[a.archetype];
          return (
            <div
              key={a.archetype}
              className={`h-full rounded-sm ${config?.color.split(" ")[0] || "bg-muted"}`}
              style={{ width: `${a.allocationPercent}%` }}
              title={`${config?.label}: ${a.allocationPercent.toFixed(1)}%`}
            />
          );
        })}
      </div>

      <div className="space-y-2">
        {allocations.map(a => {
          const config = archetypeConfig[a.archetype];
          const Icon = config?.icon || Dna;
          return (
            <div key={a.archetype} className={`flex items-center justify-between p-2 rounded-lg border ${config?.color || ""}`}>
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">{config?.label || a.archetype}</span>
                <span className="text-[9px] font-mono text-muted-foreground">×{a.count}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-muted-foreground">
                  Sharpe {a.avgSharpe.toFixed(2)}
                </span>
                <span className="text-[11px] font-mono font-semibold">
                  ${Math.round(a.capitalAllocated).toLocaleString()}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground">
                  {a.allocationPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
