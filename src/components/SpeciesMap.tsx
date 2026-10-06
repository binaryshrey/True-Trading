import { AgentGenome } from "@/data/types";
import { motion } from "framer-motion";

interface SpeciesMapProps {
  agents: AgentGenome[];
}

const archetypeConfig = {
  momentum: { label: "Momentum", color: "bg-apex-cyan" },
  defensive: { label: "Defensive", color: "bg-apex-amber" },
  volatility: { label: "Volatility", color: "bg-apex-purple" },
  "mean-reversion": { label: "Mean Rev", color: "bg-primary" },
  hybrid: { label: "Hybrid", color: "bg-muted-foreground" },
};

export default function SpeciesMap({ agents }: SpeciesMapProps) {
  const activeAgents = agents.filter((a) => a.status !== "extinct");
  const total = activeAgents.length;
  
  const counts = activeAgents.reduce((acc, a) => {
    acc[a.archetype] = (acc[a.archetype] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Species Composition
      </h3>
      <div className="flex h-3 rounded-full overflow-hidden bg-secondary">
        {Object.entries(counts).map(([archetype, count]) => (
          <motion.div
            key={archetype}
            initial={{ width: 0 }}
            animate={{ width: `${(count / total) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`${archetypeConfig[archetype as keyof typeof archetypeConfig]?.color || "bg-muted"} h-full`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {Object.entries(counts).map(([archetype, count]) => {
          const config = archetypeConfig[archetype as keyof typeof archetypeConfig];
          return (
            <div key={archetype} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${config?.color}`} />
              <span className="text-[10px] text-muted-foreground">
                {config?.label} <span className="font-mono text-foreground">{count}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
