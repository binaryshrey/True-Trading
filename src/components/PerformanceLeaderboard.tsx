import { useMemo } from "react";
import { AgentGenome } from "@/data/types";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PerformanceLeaderboardProps {
  agents: AgentGenome[];
}

export default function PerformanceLeaderboard({ agents }: PerformanceLeaderboardProps) {
  const ranked = useMemo(() => {
    return [...agents]
      .filter(a => a.status !== "extinct")
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, 10);
  }, [agents]);

  const medalColors = ["text-apex-amber", "text-muted-foreground", "text-apex-amber/60"];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-apex-amber" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Performance Leaderboard
        </h3>
      </div>

      <div className="space-y-1">
        {/* Header */}
        <div className="grid grid-cols-12 gap-1 text-[8px] uppercase tracking-widest text-muted-foreground px-2 pb-1">
          <span className="col-span-1">#</span>
          <span className="col-span-4">Agent</span>
          <span className="col-span-2 text-right">Fitness</span>
          <span className="col-span-2 text-right">Sharpe</span>
          <span className="col-span-3 text-right">Return</span>
        </div>

        {ranked.map((agent, i) => (
          <div
            key={agent.id}
            className={`grid grid-cols-12 gap-1 items-center px-2 py-1.5 rounded-md text-xs transition-colors ${
              i === 0 ? "bg-apex-amber/5 border border-apex-amber/20" :
              i < 3 ? "bg-secondary/30" : "hover:bg-secondary/20"
            }`}
          >
            <span className={`col-span-1 font-mono font-bold text-[10px] ${i < 3 ? medalColors[i] : "text-muted-foreground"}`}>
              {i + 1}
            </span>
            <div className="col-span-4 truncate">
              <span className="font-medium text-[11px]">{agent.name}</span>
              <span className="text-[8px] text-muted-foreground ml-1 font-mono">{agent.id}</span>
            </div>
            <span className={`col-span-2 text-right font-mono text-[11px] font-semibold ${
              agent.fitness > 75 ? "text-primary" : agent.fitness > 50 ? "text-foreground" : "text-destructive"
            }`}>
              {agent.fitness.toFixed(1)}
            </span>
            <span className={`col-span-2 text-right font-mono text-[11px] ${
              agent.sharpe > 1.5 ? "text-primary" : agent.sharpe > 0 ? "text-foreground" : "text-destructive"
            }`}>
              {agent.sharpe.toFixed(2)}
            </span>
            <div className="col-span-3 flex items-center justify-end gap-0.5">
              {agent.totalReturn > 0 ? (
                <TrendingUp className="h-2.5 w-2.5 text-primary" />
              ) : agent.totalReturn < 0 ? (
                <TrendingDown className="h-2.5 w-2.5 text-destructive" />
              ) : (
                <Minus className="h-2.5 w-2.5 text-muted-foreground" />
              )}
              <span className={`font-mono text-[11px] ${agent.totalReturn > 0 ? "text-primary" : "text-destructive"}`}>
                {agent.totalReturn > 0 ? "+" : ""}{agent.totalReturn}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
