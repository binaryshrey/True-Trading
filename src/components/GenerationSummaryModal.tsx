import { motion, AnimatePresence } from "framer-motion";
import { X, Skull, Sparkles, ArrowRight, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface GenerationSummary {
  generation: number;
  culled: { id: string; name: string; fitness: number; cause: string; inheritedBy: string[] }[];
  born: { id: string; name: string; fitness: number; parentIds: string[] }[];
  avgFitnessBefore: number;
  avgFitnessAfter: number;
  topFitness: number;
  capitalBefore?: number;
  capitalAfter?: number;
}

interface GenerationSummaryModalProps {
  summary: GenerationSummary | null;
  onClose: () => void;
}

export default function GenerationSummaryModal({ summary, onClose }: GenerationSummaryModalProps) {
  if (!summary) return null;

  const fitnessChange = summary.avgFitnessAfter - summary.avgFitnessBefore;
  const capitalChange = (summary.capitalAfter || 0) - (summary.capitalBefore || 0);
  const capitalChangePercent = summary.capitalBefore ? ((capitalChange / summary.capitalBefore) * 100) : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 className="text-base font-bold">
                Generation <span className="text-primary text-glow-green font-mono">{summary.generation}</span> Complete
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                {summary.culled.length} culled · {summary.born.length} born · Natural selection applied
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-px bg-border">
            <div className="bg-card px-4 py-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg Fitness</div>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="font-mono text-sm text-muted-foreground">{summary.avgFitnessBefore.toFixed(1)}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-sm font-bold text-foreground">{summary.avgFitnessAfter.toFixed(1)}</span>
                <span className={`font-mono text-[10px] font-semibold ${fitnessChange > 0 ? "text-primary" : "text-destructive"}`}>
                  {fitnessChange > 0 ? "+" : ""}{fitnessChange.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="bg-card px-4 py-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Top Fitness</div>
              <div className="font-mono text-sm font-bold text-primary mt-1">{summary.topFitness.toFixed(1)}</div>
            </div>
            <div className="bg-card px-4 py-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Survival Rate</div>
              <div className="font-mono text-sm font-bold text-foreground mt-1">
                {Math.round((1 - summary.culled.length / (summary.culled.length + summary.born.length + 30)) * 100)}%
              </div>
            </div>
            {summary.capitalAfter !== undefined && (
              <div className="bg-card px-4 py-3 text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Portfolio</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-sm font-bold text-foreground">
                    {summary.capitalAfter.toLocaleString()}
                  </span>
                </div>
                <span className={`font-mono text-[10px] font-semibold ${capitalChange >= 0 ? "text-primary" : "text-destructive"}`}>
                  {capitalChange >= 0 ? "+" : ""}{capitalChangePercent.toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto max-h-[calc(80vh-220px)] p-6 space-y-5">
            {/* Culled agents */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-destructive flex items-center gap-2">
                <Skull className="h-3.5 w-3.5" />
                Extinct — {summary.culled.length} Agents Culled
              </h3>
              {summary.culled.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-3 w-3 text-destructive" />
                      <span className="font-mono text-xs text-destructive">{agent.id}</span>
                      <span className="text-xs font-medium">{agent.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Fitness: {agent.fitness.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{agent.cause}</p>
                  {agent.inheritedBy.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-muted-foreground">Genes inherited by</span>
                      {agent.inheritedBy.map((id) => (
                        <span key={id} className="font-mono text-primary">{id}</span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Born agents */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-primary flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                Born — {summary.born.length} New Agents Deployed
              </h3>
              {summary.born.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: summary.culled.length * 0.05 + i * 0.05 }}
                  className="rounded-lg border border-primary/20 bg-primary/5 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3 w-3 text-primary" />
                      <span className="font-mono text-xs text-primary">{agent.id}</span>
                      <span className="text-xs font-medium">{agent.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Fitness: {agent.fitness.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 text-[10px]">
                    <span className="text-muted-foreground">Parents:</span>
                    {agent.parentIds.map((id) => (
                      <span key={id} className="font-mono text-accent">{id}</span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-3 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="rounded-lg bg-primary px-5 py-2 text-xs font-mono font-semibold text-primary-foreground glow-green"
            >
              Continue Evolution
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
