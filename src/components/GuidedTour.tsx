import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Dna, SkipForward, Wallet, Trophy, PieChart, Activity, Brain } from "lucide-react";

const tourSteps = [
  {
    title: "Welcome to FalseMarkets",
    description: "FalseMarkets is an AI-powered evolutionary trading system. It breeds, tests, and evolves algorithmic trading strategies using natural selection — powered by Airia's orchestration engine.",
    icon: Dna,
    highlight: "header",
  },
  {
    title: "Run Generation",
    description: "Each generation cycle: 1) The weakest 20% of agents are culled. 2) Top performers breed offspring with mutated genomes. 3) Airia writes detailed post-mortems explaining why agents died. The population evolves to adapt to market conditions.",
    icon: SkipForward,
    highlight: "generation-controls",
  },
  {
    title: "Simulated Portfolio",
    description: "Your virtual portfolio starts at $100,000. As agents evolve and improve their fitness, the portfolio value adjusts — showing the tangible impact of evolution on trading performance.",
    icon: Wallet,
    highlight: "portfolio",
  },
  {
    title: "Performance Leaderboard",
    description: "The top 10 agents ranked by fitness. Track Sharpe ratios, returns, and how rankings shift after each generation. The best agents survive and pass their genomes to the next generation.",
    icon: Trophy,
    highlight: "leaderboard",
  },
  {
    title: "Strategy Allocation",
    description: "Capital is allocated across strategies proportional to their fitness. Defensive agents in risk-off markets get more capital. Momentum agents dominate in trending markets. The system adapts automatically.",
    icon: PieChart,
    highlight: "allocation",
  },
  {
    title: "Environment & Behavior",
    description: "The environment panel shows real-time market conditions (fetched via AI). The behavioral radar tracks your trading personality. Click 'Simulate Trade Override' to see how your behavior influences evolution.",
    icon: Activity,
    highlight: "environment",
  },
  {
    title: "AI-Powered Evolution",
    description: "Every generation is orchestrated by Airia — an AI agent that decides breeding pairs, writes post-mortems, detects diversity collapse, and suggests chaos injections. No random numbers — pure AI reasoning.",
    icon: Brain,
    highlight: "agents",
  },
];

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuidedTour({ isOpen, onClose }: GuidedTourProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const current = tourSteps[step];
  const Icon = current.icon;
  const isLast = step === tourSteps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        >
          {/* Progress */}
          <div className="flex gap-1 px-4 pt-4">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-secondary"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold">{current.title}</h3>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Step {step + 1} of {tourSteps.length}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {current.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-border px-6 py-3">
            <button
              onClick={onClose}
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip Tour
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-mono text-foreground hover:bg-secondary transition-colors"
                >
                  Back
                </button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => isLast ? onClose() : setStep(s => s + 1)}
                className="rounded-lg bg-primary px-4 py-1.5 text-[11px] font-mono font-semibold text-primary-foreground glow-green flex items-center gap-1"
              >
                {isLast ? "Start Evolving" : "Next"}
                {!isLast && <ChevronRight className="h-3 w-3" />}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
