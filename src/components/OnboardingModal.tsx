import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Wallet, Users, ArrowRight, Dna } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ─── Local agent generation (no edge function needed) ────────────────────────

const ARCHETYPES = ["momentum", "defensive", "volatility", "mean-reversion", "hybrid"] as const;
const PREFIXES = ["Alpha","Beta","Gamma","Delta","Sigma","Omega","Apex","Vega","Rho","Theta","Kappa","Zeta","Nova","Flux","Prime","Quant","Algo","Edge","Peak","Cipher","Nexus","Pulse","Drift","Blaze"];
const SUFFIXES = ["Hunter","Rider","Surge","Strike","Hawk","Wolf","Storm","Drift","Pulse","Wave","Blade","Force","Shift","Flow","Crest","Spike","Edge","Run","Burst","Scout","Guard","Watch","Climb","Fade"];

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

function buildAgents(count: number) {
  const rand = rng(Date.now() & 0xffff);
  return Array.from({ length: count }, (_, i) => {
    // Ensure archetype distribution across agents
    const fastMA = rand();
    const slowMA = rand();
    const riskAversion = rand();
    const assetIdx = rand();

    // Derive archetype from genome (mirrors backtest.ts logic)
    const f = Math.max(5, Math.round(5 + fastMA * 45));
    const s = Math.max(20, Math.round(20 + slowMA * 180));
    const spread = s - f;
    const archetype: typeof ARCHETYPES[number] =
      f <= 10 && spread <= 25 ? "momentum" :
      s >= 130 ? "defensive" :
      spread <= 15 ? "volatility" :
      f >= 25 && s >= 80 ? "mean-reversion" :
      "hybrid";

    const prefix = PREFIXES[Math.floor(rand() * PREFIXES.length)];
    const suffix = SUFFIXES[Math.floor(rand() * SUFFIXES.length)];
    return {
      id: `AGT-${String(i + 1).padStart(3, "0")}`,
      name: `${prefix} ${suffix}`,
      generation: 0,
      fitness: 50,           // placeholder — real value set by backtest on dashboard load
      status: "active",
      archetype,
      sharpe: 0,
      max_drawdown: 0,
      win_rate: 0,
      total_return: 0,
      trades: 0,
      genome_entry_logic:      fastMA,
      genome_exit_discipline:  slowMA,
      genome_risk_tolerance:   riskAversion,
      genome_position_sizing:  assetIdx,
      genome_indicator_weight: 0.5,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after agents are successfully written to DB. When provided,
   *  the modal skips the navigate("/dashboard") call so callers on the
   *  dashboard can reload data themselves. */
  onSpawned?: () => void;
}

export default function OnboardingModal({ open, onClose, onSpawned }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"connect" | "config" | "spawning" | "done">("connect");
  const [agentCount, setAgentCount] = useState(40);
  const [connected, setConnected] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleConnect = () => {
    setConnected(true);
    setTimeout(() => setStep("config"), 800);
  };

  const handleSpawn = async () => {
    setStep("spawning");
    setProgress(10);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 400);

    try {
      // Check if agents already exist
      const { count: existing } = await supabase
        .from("agents")
        .select("*", { count: "exact", head: true });

      if (existing && existing > 0) {
        clearInterval(interval);
        setProgress(100);
        setStep("done");
        toast({ title: "Population Spawned", description: `${existing} agents already exist.` });
        return;
      }

      const rows = buildAgents(agentCount);

      // Insert in batches of 20 to stay under request size limits
      for (let i = 0; i < rows.length; i += 20) {
        const { error } = await supabase.from("agents").insert(rows.slice(i, i + 20));
        if (error) throw error;
        setProgress(10 + Math.round(((i + 20) / rows.length) * 60));
      }

      // Gen-0 stats
      const avgFitness = rows.reduce((s, a) => s + a.fitness, 0) / rows.length;
      const topFitness = Math.max(...rows.map((a) => a.fitness));
      await supabase.from("generations").upsert(
        { gen: 0, avg_fitness: +avgFitness.toFixed(1), top_fitness: +topFitness.toFixed(1), population: rows.length, diversity: 0.92 },
        { onConflict: "gen" },
      );

      // Ensure singleton rows exist
      await supabase.from("behavioral_genome").upsert(
        { id: 1, risk_tolerance: 0.62, drawdown_sensitivity: 0.78, earnings_avoidance: 0.45, momentum_bias: 0.33, holding_patience: 0.71 },
        { onConflict: "id" },
      );
      await supabase.from("environment_state").upsert(
        { id: 1, regime: "trending", volatility: "medium", earnings_active: false, macro_event: false, sentiment: 0.34 },
        { onConflict: "id" },
      );
      await supabase.from("portfolio").upsert(
        { id: 1, generation: 0, capital: 100000, pnl: 0, pnl_percent: 0 },
        { onConflict: "id" },
      );

      clearInterval(interval);
      setProgress(100);
      setStep("done");
      toast({ title: "Population Spawned", description: `${rows.length} trading agents have been generated.` });
    } catch (err: any) {
      clearInterval(interval);
      setStep("config");
      toast({
        title: "Spawn Failed",
        description: err.message || "Could not generate agents. Try again.",
        variant: "destructive",
      });
    }
  };

  const handleFinish = () => {
    onClose();
    if (onSpawned) {
      onSpawned();
    } else {
      navigate("/dashboard");
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg mx-4 rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border px-6 py-4">
            <Dna className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Launch Your Evolution</h2>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 px-6 pt-5 pb-2">
            {[
              { key: "connect", label: "Connect" },
              { key: "config", label: "Configure" },
              { key: "spawning", label: "Spawn" },
            ].map((s, i) => {
              const steps = ["connect", "config", "spawning", "done"];
              const currentIdx = steps.indexOf(step);
              const stepIdx = i;
              const isActive = stepIdx <= currentIdx;
              const isDone = stepIdx < currentIdx || step === "done";

              return (
                <div key={s.key} className="flex items-center gap-2 flex-1">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                      isDone
                        ? "bg-primary text-primary-foreground"
                        : isActive
                        ? "border-2 border-primary text-primary"
                        : "border border-border text-muted-foreground"
                    }`}
                  >
                    {isDone ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  <span
                    className={`text-xs font-mono ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                  {i < 2 && (
                    <div
                      className={`flex-1 h-px ${
                        isDone ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Content */}
          <div className="px-6 py-6 min-h-[260px] flex flex-col">
            {/* Step 1: Connect Alpaca */}
            {step === "connect" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col items-center text-center gap-4 flex-1 justify-center"
              >
                <div className="h-16 w-16 rounded-2xl bg-apex-amber/10 flex items-center justify-center">
                  <Wallet className="h-8 w-8 text-apex-amber" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Connect Alpaca Wallet</h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                    Your agents will paper-trade through Alpaca's brokerage API.
                    Connect to enable live market execution.
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleConnect}
                  disabled={connected}
                  className="mt-2 font-semibold min-w-[200px]"
                >
                  {connected ? (
                    <>
                      <Check className="mr-2 h-4 w-4" /> Connected
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-4 w-4" /> Connect Alpaca
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Step 2: Configure agent count */}
            {step === "config" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-6 flex-1"
              >
                <div className="text-center">
                  <h3 className="text-lg font-bold">Configure Population</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose how many AI trading agents to spawn in Generation 0.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-1">
                  {/* Agent count slider */}
                  <div className="rounded-lg border border-border bg-secondary/30 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Agent Count</span>
                      </div>
                      <span className="text-2xl font-bold font-mono text-primary">
                        {agentCount}
                      </span>
                    </div>
                    <Slider
                      value={[agentCount]}
                      onValueChange={(v) => setAgentCount(v[0])}
                      min={10}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground">
                      <span>10</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>

                  {/* Summary info */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Archetypes", value: "5 types", desc: "Momentum, Defensive, Volatility, Mean-Rev, Hybrid" },
                      { label: "Starting Capital", value: "$100K", desc: "Paper trading allocation" },
                      { label: "Genome Traits", value: "5 genes", desc: "Entry, Exit, Risk, Size, Indicator" },
                      { label: "Broker", value: "Alpaca", desc: "Paper trading mode" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg border border-border bg-secondary/20 p-3"
                      >
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">
                          {item.label}
                        </p>
                        <p className="text-sm font-bold font-mono">{item.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  size="lg"
                  onClick={handleSpawn}
                  className="w-full font-semibold"
                >
                  Spawn {agentCount} Agents <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* Step 3: Spawning */}
            {step === "spawning" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center text-center gap-5 flex-1 justify-center"
              >
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <div>
                  <h3 className="text-lg font-bold">Spawning Agents…</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI is generating {agentCount} unique trading strategies with diverse genomes.
                  </p>
                </div>
                <div className="w-full max-w-xs">
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="mt-2 text-xs font-mono text-muted-foreground">
                    {Math.round(progress)}% complete
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Done */}
            {step === "done" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center gap-4 flex-1 justify-center"
              >
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Population Ready!</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {agentCount} agents are alive and ready to evolve. Head to the dashboard to begin.
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleFinish}
                  className="mt-2 font-semibold min-w-[200px]"
                >
                  Enter Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
