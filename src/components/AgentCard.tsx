import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentGenome } from "@/data/types";
import { Skull, Sparkles, TrendingUp, Shield, Activity, Shuffle, Dna, Info, X } from "lucide-react";

const archetypeIcons = {
  momentum: TrendingUp,
  defensive: Shield,
  volatility: Activity,
  "mean-reversion": Shuffle,
  hybrid: Dna,
};

const archetypeColors: Record<string, string> = {
  momentum: "text-apex-cyan",
  defensive: "text-apex-amber",
  volatility: "text-apex-purple",
  "mean-reversion": "text-apex-green",
  hybrid: "text-muted-foreground",
};

const genomeLabels: { key: keyof AgentGenome["genome"]; label: string; short: string }[] = [
  { key: "fastMA",       label: "Fast MA (normalized)", short: "FMA" },
  { key: "slowMA",       label: "Slow MA (normalized)", short: "SMA" },
  { key: "riskAversion", label: "Risk Aversion",        short: "RSK" },
  { key: "assetIdx",     label: "Asset Index",          short: "AST" },
];

interface AgentCardProps {
  agent: AgentGenome;
  onClick?: () => void;
}

export default function AgentCard({ agent, onClick }: AgentCardProps) {
  const [showGenome, setShowGenome] = useState(false);
  const Icon = archetypeIcons[agent.archetype];
  const isAlive = agent.status === "active" || agent.status === "newborn";
  const isNewborn = agent.status === "newborn";
  const isExtinct = agent.status === "extinct";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: isExtinct ? 0.4 : 1, 
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`
        relative cursor-pointer rounded-lg border p-3 transition-colors
        ${isNewborn ? "border-primary glow-green bg-card" : ""}
        ${isExtinct ? "border-destructive/30 bg-card/50" : ""}
        ${agent.status === "active" ? "border-border bg-card hover:border-primary/50" : ""}
        ${agent.status === "breeding" ? "border-apex-cyan/50 glow-cyan bg-card" : ""}
      `}
    >
      {isNewborn && (
        <div className="absolute -top-2 -right-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse-green" />
        </div>
      )}
      {isExtinct && (
        <div className="absolute -top-2 -right-2">
          <Skull className="h-4 w-4 text-destructive" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${archetypeColors[agent.archetype]}`} />
          <span className="text-xs font-medium truncate max-w-[100px]">{agent.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-muted-foreground">{agent.id}</span>
          <span className="font-mono text-[9px] px-1 py-0.5 rounded bg-secondary text-secondary-foreground">G{agent.generation}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 mb-2">
        <div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Fitness</div>
          <div className={`text-sm font-mono font-semibold ${agent.fitness > 60 ? "text-primary" : agent.fitness > 35 ? "text-apex-amber" : "text-destructive"}`}>
            {agent.fitness.toFixed(1)}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Sharpe</div>
          <div className={`text-sm font-mono font-semibold ${agent.sharpe > 1 ? "text-primary" : agent.sharpe > 0 ? "text-foreground" : "text-destructive"}`}>
            {agent.sharpe.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Return</div>
          <div className={`text-sm font-mono font-semibold ${agent.totalReturn > 0 ? "text-primary" : "text-destructive"}`}>
            {agent.totalReturn > 0 ? "+" : ""}{agent.totalReturn}%
          </div>
        </div>
        <div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Win%</div>
          <div className="text-xs font-mono text-foreground">{agent.winRate}%</div>
        </div>
        <div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">MaxDD</div>
          <div className="text-xs font-mono text-destructive">-{agent.maxDrawdown}%</div>
        </div>
        <div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Trades</div>
          <div className="text-xs font-mono text-foreground">{agent.trades}</div>
        </div>
      </div>

      {/* Genome bars with labels */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Genome</span>
          <button
            onClick={(e) => { e.stopPropagation(); setShowGenome(!showGenome); }}
            className="p-0.5 rounded hover:bg-secondary transition-colors"
          >
            {showGenome ? (
              <X className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Info className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {showGenome ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-1"
            >
              {genomeLabels.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[9px] text-muted-foreground w-20 truncate">{label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${agent.genome[key] * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground w-7 text-right">
                    {(agent.genome[key] * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </motion.div>
          ) : (
            <div className="flex gap-0.5 h-1">
              {genomeLabels.map(({ key, short }) => (
                <div key={key} className="flex-1 relative group">
                  <div className="h-full rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${agent.genome[key] * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Compact labels under bars */}
        {!showGenome && (
          <div className="flex gap-0.5">
            {genomeLabels.map(({ short, key }) => (
              <span key={key} className="flex-1 text-center text-[7px] text-muted-foreground font-mono">
                {short}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Parent lineage */}
      {agent.parentIds && agent.parentIds.length > 0 && (
        <div className="mt-2 pt-1.5 border-t border-border/50">
          <span className="text-[8px] text-muted-foreground font-mono">
            Parents: {agent.parentIds.join(" × ")}
          </span>
        </div>
      )}
    </motion.div>
  );
}
