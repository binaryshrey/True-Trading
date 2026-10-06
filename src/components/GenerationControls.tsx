import { motion } from "framer-motion";
import { Zap, SkipForward, HelpCircle, Timer, TimerOff } from "lucide-react";

const AUTO_INTERVALS = [10, 15, 30, 60] as const;
type AutoInterval = typeof AUTO_INTERVALS[number];

interface GenerationControlsProps {
  currentGeneration: number;
  isRunning: boolean;
  onRunGeneration: () => void;
  activeCount: number;
  extinctCount: number;
  onShowTour?: () => void;
  // Auto-run
  autoRunEnabled: boolean;
  autoRunInterval: AutoInterval;
  onToggleAutoRun: () => void;
  onSetAutoInterval: (s: AutoInterval) => void;
}

export default function GenerationControls({
  currentGeneration,
  isRunning,
  onRunGeneration,
  activeCount,
  extinctCount,
  onShowTour,
  autoRunEnabled,
  autoRunInterval,
  onToggleAutoRun,
  onSetAutoInterval,
}: GenerationControlsProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Generation</div>
          <div className="text-2xl font-mono font-bold text-primary text-glow-green">{currentGeneration}</div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Active</div>
          <div className="text-lg font-mono font-semibold text-foreground">{activeCount}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Extinct</div>
          <div className="text-lg font-mono font-semibold text-destructive">{extinctCount}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Auto-run interval selector */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/40 px-2 py-1">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground mr-1">Every</span>
          {AUTO_INTERVALS.map(s => (
            <button
              key={s}
              onClick={() => onSetAutoInterval(s)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                autoRunInterval === s
                  ? "bg-primary/20 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}s
            </button>
          ))}
        </div>

        {/* Auto-run toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleAutoRun}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-mono font-semibold transition-all ${
            autoRunEnabled
              ? "border-primary/50 bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          {autoRunEnabled ? (
            <><Timer className="h-3.5 w-3.5 animate-pulse" /> Auto-Running</>
          ) : (
            <><TimerOff className="h-3.5 w-3.5" /> Auto-Run</>
          )}
        </motion.button>

        {onShowTour && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onShowTour}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            How it works
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRunGeneration}
          disabled={isRunning}
          className={`
            flex items-center gap-2 rounded-lg px-5 py-2.5 font-mono text-sm font-semibold transition-all
            ${isRunning
              ? "bg-primary/20 text-primary/50 cursor-wait"
              : "bg-primary text-primary-foreground glow-green hover:brightness-110"
            }
          `}
        >
          {isRunning ? (
            <>
              <Zap className="h-4 w-4 animate-pulse-green" />
              Evolving...
            </>
          ) : (
            <>
              <SkipForward className="h-4 w-4" />
              Run Generation
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
