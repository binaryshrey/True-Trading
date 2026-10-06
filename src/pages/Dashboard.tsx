import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentGenome, EnvironmentState, PostMortem, BehavioralGenome, TradeRecord } from "@/data/types";
import {
  fetchAgents, upsertAgents,
  fetchGenerations, insertGeneration,
  fetchPostMortems, insertPostMortems,
  fetchEnvironment, updateEnvironment,
  fetchBehavioralGenome,
  fetchPortfolio, insertPortfolioSnapshot,
  fetchTradeHistory, insertTrades,
  fetchLatestMarketSnapshot,
  resetAllData,
} from "@/lib/dbClient";
import { loadPriceData, clearPriceCache, PriceHistory, SYMBOL_LABEL } from "@/lib/priceData";
import {
  backtestAgent, decodeFastMA, decodeSlowMA,
  archetypeFromGenome, crossoverMutate, BacktestResult,
} from "@/lib/backtest";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AgentCard from "@/components/AgentCard";
import PostMortemFeed from "@/components/PostMortemFeed";
import GenerationChart from "@/components/GenerationChart";
import BacktestChart from "@/components/BacktestChart";
import AgentTradeChart from "@/components/AgentTradeChart";
import GenerationControls from "@/components/GenerationControls";
import GenerationSummaryModal from "@/components/GenerationSummaryModal";
import PortfolioWidget, { PortfolioState } from "@/components/PortfolioWidget";
import PerformanceLeaderboard from "@/components/PerformanceLeaderboard";
import PopulationHealthPanel from "@/components/PopulationHealthPanel";
import GuidedTour from "@/components/GuidedTour";
import TradeHistoryLog from "@/components/TradeHistoryLog";
import RiskMetricsDashboard from "@/components/RiskMetricsDashboard";
import AlpacaPaperPanel from "@/components/AlpacaPaperPanel";
import OnboardingModal from "@/components/OnboardingModal";
import { Dna, Activity, Brain, Loader2, RefreshCw, Trash2 } from "lucide-react";

// Module-level constants — outside the component to avoid re-creation on every render
const BREED_PREFIXES = ["Alpha","Beta","Gamma","Delta","Sigma","Omega","Apex","Vega","Rho","Theta","Nova","Flux","Prime","Quant","Edge","Nexus","Pulse","Blaze","Cipher","Drift"];
const BREED_SUFFIXES = ["Hunter","Rider","Surge","Strike","Hawk","Wolf","Storm","Pulse","Wave","Blade","Force","Shift","Crest","Scout","Guard","Run","Burst","Fade","Watch","Climb"];

// ─── Types for generation summary ───
interface GenSummary {
  generation: number;
  culled: { id: string; name: string; fitness: number; cause: string; inheritedBy: string[] }[];
  born: { id: string; name: string; fitness: number; parentIds: string[] }[];
  avgFitnessBefore: number;
  avgFitnessAfter: number;
  topFitness: number;
  capitalBefore: number;
  capitalAfter: number;
}

export default function Index() {
  const [agentFilter, setAgentFilter] = useState<"all" | "newborn" | "active" | "breeding" | "extinct">("active");
  const [agents, setAgents] = useState<AgentGenome[]>([]);
  const [postMortems, setPostMortems] = useState<PostMortem[]>([]);
  const [behavior, setBehavior] = useState<BehavioralGenome>({
    riskTolerance: 0.62, drawdownSensitivity: 0.78, earningsAvoidance: 0.45,
    momentumBias: 0.33, holdingPatience: 0.71,
  });
  const [genHistory, setGenHistory] = useState<{ gen: number; avgFitness: number; topFitness: number; population: number; diversity: number }[]>([]);
  const [currentGen, setCurrentGen] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [portfolio, setPortfolio] = useState<PortfolioState>({ capital: 100000, pnl: 0, pnlPercent: 0, generation: 0 });
  const [generationSummary, setGenerationSummary] = useState<GenSummary | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentState>({
    regime: "trending", volatility: "medium", earningsActive: false, macroEvent: false, sentiment: 0.34,
  });
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [showExtinct, setShowExtinct] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistory>({});
  const [backtestResults, setBacktestResults] = useState<Record<string, BacktestResult>>({});
  const [priceLoadMsg, setPriceLoadMsg] = useState("");
  const [isPriceRefreshing, setIsPriceRefreshing] = useState(false);
  // Auto-run
  const [autoRunEnabled, setAutoRunEnabled] = useState(false);
  const [autoRunInterval, setAutoRunInterval] = useState<10|15|30|60>(15);
  const autoRunRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRunningRef = useRef(false);
  const runGenerationRef = useRef<() => void>(() => {});
  const INITIAL_VISIBLE = 12;

  // ─── Load all data from DB on mount, or after a re-spawn ───
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Load DB data and 2-year price history concurrently
        setPriceLoadMsg("Fetching 2yr price data from Binance...");
        const [[dbAgents, dbGens, dbPMs, dbEnv, dbBehavior, dbPortfolio, dbTrades], priceData] =
          await Promise.all([
            Promise.all([
              fetchAgents(),
              fetchGenerations(),
              fetchPostMortems(),
              fetchEnvironment(),
              fetchBehavioralGenome(),
              fetchPortfolio().catch(() => ({ capital: 100000, pnl: 0, pnlPercent: 0, generation: 0 })),
              fetchTradeHistory().catch(() => []),
            ]),
            loadPriceData((loaded, total, sym) => {
              setPriceLoadMsg(
                sym === "cache"
                  ? "Using cached price data"
                  : `Fetching ${SYMBOL_LABEL[sym] ?? sym}... (${loaded}/${total})`,
              );
            }).catch(err => { console.warn("Price load failed:", err); return {} as PriceHistory; }),
          ]);

        setPriceHistory(priceData);
        setPriceLoadMsg("");

        setEnvironment(dbEnv);
        setBehavior(dbBehavior);
        setPortfolio(dbPortfolio);
        setGenHistory(dbGens);
        setPostMortems(dbPMs);
        setTrades(dbTrades);

        if (dbAgents.length > 0) {
          // Re-run backtests to get real metrics from actual price history
          const btResults: Record<string, BacktestResult> = {};
          const backtested = dbAgents.map(agent => {
            const r = backtestAgent(agent, priceData);
            if (r) {
              btResults[agent.id] = r;
              return {
                ...agent,
                fitness:     r.fitness,
                sharpe:      +r.sharpe.toFixed(2),
                maxDrawdown: +r.maxDrawdown.toFixed(1),
                winRate:     +r.winRate.toFixed(1),
                totalReturn: +r.totalReturn.toFixed(1),
                trades:      r.trades,
              };
            }
            return agent;
          });
          setBacktestResults(btResults);
          setAgents(backtested);
          setCurrentGen(dbGens.length > 0 ? Math.max(...dbGens.map(g => g.gen)) : 0);
          // Persist real backtest metrics silently
          upsertAgents(backtested).catch(console.error);

          // Warn only if all symbols still came back empty (shouldn't happen with synthetic fallback)
          const priceHasData = Object.values(priceData).some(b => b.length > 50);
          if (!priceHasData) {
            toast({
              title: "Price data unavailable",
              description: "Could not fetch crypto prices. Click ↺ Prices in the header to retry.",
              variant: "destructive",
            });
          }

          const hasSeenTour = localStorage.getItem("apex-tour-seen");
          if (!hasSeenTour) setShowTour(true);
        } else {
          // No agents in DB — open the spawn wizard automatically
          setShowOnboarding(true);
        }

      } catch (err) {
        console.error("Failed to load data:", err);
        toast({ title: "Error", description: "Failed to load data from database.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [dataVersion]);

  /** Called when OnboardingModal finishes spawning agents — reloads all data */
  const handleSpawned = useCallback(() => {
    setShowOnboarding(false);
    setDataVersion(v => v + 1); // triggers useEffect re-run
  }, []);

  /** Wipe all DB evolving data and open the spawn wizard for a fresh gen-0 */
  const handleReset = useCallback(async () => {
    if (!window.confirm("Reset to Generation 0?\n\nThis will permanently delete all agents, generation history, trades, and post-mortems.\nPortfolio will be reset to $100,000.\nYou will be prompted to spawn a new population.\n\nThis cannot be undone.")) return;
    try {
      await resetAllData();
      // Clear local state immediately
      setAgents([]);
      setBacktestResults({});
      setGenHistory([]);
      setPostMortems([]);
      setTrades([]);
      setCurrentGen(0);
      setPortfolio({ capital: 100000, pnl: 0, pnlPercent: 0, generation: 0 });
      setShowOnboarding(true);
      toast({ title: "Population wiped", description: "Spawn a new population to begin at generation 0." });
    } catch (err) {
      console.error("Reset failed:", err);
      toast({ title: "Reset failed", description: "Could not clear data. Check console.", variant: "destructive" });
    }
  }, []);


  const extinctAgents = useMemo(() => agents.filter((a) => a.status === "extinct"), [agents]);
  const activeAgents = useMemo(() => agents.filter((a) => a.status !== "extinct"), [agents]);

  // ─── Force-refresh price data from Binance ──────────────────────────────────
  const refreshPriceData = useCallback(async () => {
    setIsPriceRefreshing(true);
    setPriceLoadMsg("Clearing IndexedDB cache...");
    await clearPriceCache();
    const freshData = await loadPriceData((loaded, total, sym) => {
      setPriceLoadMsg(`Re-fetching ${SYMBOL_LABEL[sym] ?? sym}... (${loaded}/${total})`);
    }).catch(err => { console.warn("Price refresh failed:", err); return {} as PriceHistory; });
    setPriceHistory(freshData);
    setPriceLoadMsg("");
    // Re-run backtests with fresh data
    const btResults: Record<string, BacktestResult> = {};
    const updated = agents.map(agent => {
      const r = backtestAgent(agent, freshData);
      if (r) { btResults[agent.id] = r; return { ...agent, fitness: r.fitness, sharpe: +r.sharpe.toFixed(2), maxDrawdown: +r.maxDrawdown.toFixed(1), winRate: +r.winRate.toFixed(1), totalReturn: +r.totalReturn.toFixed(1), trades: r.trades }; }
      return agent;
    });
    setBacktestResults(btResults);
    setAgents(updated);
    setIsPriceRefreshing(false);
    toast({ title: "Price data refreshed", description: "2yr daily OHLCV re-downloaded from Binance and persisted to IndexedDB." });
  }, [agents]);


  const runGeneration = useCallback(async () => {
    if (!Object.keys(priceHistory).length) {
      toast({ title: "Price data not loaded", description: "Waiting for Binance data — try again in a moment.", variant: "destructive" });
      return;
    }
    setIsRunning(true);
    try {
      // ── 1. Backtest all active agents with real price history ───────────────
      const active = agents.filter(a => a.status !== "extinct");
      const newResults: Record<string, BacktestResult> = {};

      const backtested = active.map(agent => {
        const r = backtestAgent(agent, priceHistory);
        if (r) {
          newResults[agent.id] = r;
          return { ...agent, fitness: r.fitness, sharpe: +r.sharpe.toFixed(2), maxDrawdown: +r.maxDrawdown.toFixed(1), winRate: +r.winRate.toFixed(1), totalReturn: +r.totalReturn.toFixed(1), trades: r.trades };
        }
        return agent;
      });

      // ── 2. Rank + select — with niche-crowding diversity pressure ───────────
      // Compute effective (selection-only) fitness: assets that dominate >40% of
      // the population get a proportional selection penalty (up to -25%).
      // Stored fitness values are NOT changed — only the sort order is affected.
      const nicheSelectFitness = (() => {
        const aCount: Record<string, number> = {};
        backtested.forEach(a => { const r = newResults[a.id]; if (r) aCount[r.asset] = (aCount[r.asset] || 0) + 1; });
        const n = backtested.filter(a => newResults[a.id]).length || 1;
        return (a: AgentGenome) => {
          const r = newResults[a.id];
          if (!r) return a.fitness;
          const share = (aCount[r.asset] || 0) / n;
          const penalty = share > 0.40 ? Math.min(0.25, ((share - 0.40) / 0.60) * 0.25) : 0;
          return a.fitness * (1 - penalty);
        };
      })();
      const sorted = [...backtested].sort((a, b) => nicheSelectFitness(b) - nicheSelectFitness(a));
      const cullCount = Math.max(1, Math.floor(sorted.length * 0.20));
      const bottom = sorted.slice(-cullCount);
      const topBreed = sorted.slice(0, Math.max(2, Math.floor(sorted.length * 0.30)));
      const cullIds = new Set(bottom.map(a => a.id));
      const avgBefore = sorted.reduce((s, a) => s + a.fitness, 0) / sorted.length;

      // ── 3. Crossover + mutate offspring from SMA genomes ───────────────────
      const maxId = Math.max(...agents.map(a => parseInt(a.id.replace("AGT-", ""), 10) || 0), 0);
      const rawOffspring: AgentGenome[] = Array.from({ length: cullCount }, (_, i) => {
        const p1 = topBreed[Math.floor(Math.random() * topBreed.length)];
        const p2 = topBreed[Math.floor(Math.random() * topBreed.length)];
        const childGenome = crossoverMutate(p1.genome, p2.genome);
        const arch = archetypeFromGenome(childGenome.fastMA, childGenome.slowMA);
        const px = BREED_PREFIXES[Math.floor(Math.random() * BREED_PREFIXES.length)];
        const sx = BREED_SUFFIXES[Math.floor(Math.random() * BREED_SUFFIXES.length)];
        return {
          id: `AGT-${String(maxId + i + 1).padStart(3, "0")}`,
          name: `${px} ${sx}`,
          generation: currentGen + 1,
          fitness: 50, status: "newborn" as const, archetype: arch,
          sharpe: 0, maxDrawdown: 0, winRate: 0, totalReturn: 0, trades: 0,
          parentIds: [p1.id, p2.id],
          genome: childGenome,
        };
      });

      // ── 4. Backtest offspring immediately ─────────────────────────────────
      const offspring: AgentGenome[] = rawOffspring.map(agent => {
        const r = backtestAgent(agent, priceHistory);
        if (r) {
          newResults[agent.id] = r;
          return { ...agent, fitness: r.fitness, sharpe: +r.sharpe.toFixed(2), maxDrawdown: +r.maxDrawdown.toFixed(1), winRate: +r.winRate.toFixed(1), totalReturn: +r.totalReturn.toFixed(1), trades: r.trades };
        }
        return agent;
      });

      setBacktestResults(prev => ({ ...prev, ...newResults }));

      // ── 5. Assemble next generation ────────────────────────────────────────
      const survived = agents.map(a => {
        if (cullIds.has(a.id)) return { ...a, status: "extinct" as const };
        const bt = backtested.find(b => b.id === a.id);
        const status: AgentGenome["status"] = a.status === "newborn" ? "active" : a.status;
        return bt ? { ...bt, status } : { ...a, status };
      });
      const allNext = [...survived, ...offspring];
      const activeNext = allNext.filter(a => a.status !== "extinct");
      const avgAfter = activeNext.reduce((s, a) => s + a.fitness, 0) / activeNext.length;
      const topFit = Math.max(...activeNext.map(a => a.fitness));
      const topAgent = activeNext.reduce((best, a) => a.fitness > best.fitness ? a : best, activeNext[0]);

      // ── 6. Portfolio: single-generation snapshot on $100k ─────────────────
      // "If $100k were deployed this generation using the current population,
      // what would the fitness-weighted portfolio return?"
      // This is NOT compounded — it resets the baseline to $100k every generation
      // so the number stays interpretable and comparable across resets.
      const INITIAL_CAPITAL = 100_000;
      const totalActiveFitness = activeNext.reduce((s, a) => s + Math.max(a.fitness, 0.01), 0);
      const weightedReturn = activeNext.reduce((s, a) => {
        const w = Math.max(a.fitness, 0.01) / totalActiveFitness;
        const r = (newResults[a.id] ?? backtestResults[a.id])?.totalReturn ?? a.totalReturn;
        return s + w * (r / 100);
      }, 0);
      // Cap at -50%/+200% — these are 2yr backtest returns, not daily moves
      const genReturn = Math.max(-0.50, Math.min(weightedReturn, 2.00));
      const newCapital = Math.round(INITIAL_CAPITAL * (1 + genReturn));
      const totalPnl = newCapital - INITIAL_CAPITAL;
      const totalPnlPct = genReturn * 100;

      // ── 7. Real trade log from backtest signals ────────────────────────────
      const newTrades: Omit<TradeRecord, "id" | "createdAt">[] = activeNext.slice(0, 8).flatMap(agent => {
        // Reuse already-computed result — no redundant backtest re-run
        const r = newResults[agent.id] ?? backtestResults[agent.id];
        if (!r) return [];
        const pnl = r.equityCurve.at(-1)?.equity ?? 100_000;
        return [{
          agentId: agent.id, agentName: agent.name, generation: currentGen + 1,
          action: pnl >= 100_000 ? "buy" as const : "sell" as const,
          asset: r.asset, entryPrice: 0, exitPrice: null, quantity: 1,
          pnl: +(pnl - 100_000).toFixed(2), pnlPercent: +r.totalReturn.toFixed(2),
          rationale: `SMA(${r.fastPeriod}/${r.slowPeriod}) ${r.asset} — Sharpe ${r.sharpe.toFixed(2)}, MaxDD ${r.maxDrawdown.toFixed(1)}%`,
        }];
      });

      const genData = { gen: currentGen + 1, avgFitness: +avgAfter.toFixed(1), topFitness: +topFit.toFixed(1), population: activeNext.length, diversity: +(0.6 + Math.random() * 0.3).toFixed(2) };

      const newPostMortems: PostMortem[] = bottom.map(a => ({
        id: `pm-${Date.now()}-${a.id}`,
        agentId: a.id, agentName: a.name, generation: currentGen,
        cause: `Fitness ${a.fitness.toFixed(1)} — SMA(${decodeFastMA(a.genome.fastMA)}/${decodeSlowMA(a.genome.slowMA)}) underperformed on ${backtestAgent(a, priceHistory)?.asset ?? "unknown"}`,
        inheritedBy: offspring.slice(0, 2).map(o => o.id),
        timestamp: new Date(), fitnessAtDeath: a.fitness,
      }));

      // ── 8. Persist to DB ───────────────────────────────────────────────────
      await upsertAgents(survived);
      await Promise.all([
        upsertAgents(offspring),
        insertPostMortems(newPostMortems),
        insertGeneration(genData),
        insertPortfolioSnapshot({ generation: currentGen + 1, capital: newCapital, pnl: totalPnl, pnlPercent: +totalPnlPct.toFixed(2), topAgentId: topAgent?.id, topAgentName: topAgent?.name, avgFitnessBefore: +avgBefore.toFixed(1), avgFitnessAfter: +avgAfter.toFixed(1) }),
        insertTrades(newTrades).catch(console.error),
      ]);

      // Alpaca paper trades (fire-and-forget)
      const cryptoToEtf: Record<string, string> = { BTC: "BITO", ETH: "ETHA", BNB: "SPY", SOL: "SPY", XRP: "QQQ", DOGE: "IWM" };
      supabase.functions.invoke("alpaca-trade", { body: { action: "execute", trades: newTrades.slice(0, 5).map(t => ({ symbol: cryptoToEtf[t.asset] || "SPY", qty: 1, side: t.action, agentId: t.agentId, agentName: t.agentName, generation: t.generation, rationale: t.rationale })) } }).catch(console.error);

      // ── 9. Update React state ──────────────────────────────────────────────
      setPortfolio({ capital: newCapital, pnl: totalPnl, pnlPercent: +totalPnlPct.toFixed(2), generation: currentGen + 1 });
      fetchTradeHistory().then(setTrades).catch(console.error);
      setGenerationSummary({
        generation: currentGen + 1,
        culled: bottom.map(a => ({ id: a.id, name: a.name, fitness: a.fitness, cause: newPostMortems.find(pm => pm.agentId === a.id)?.cause || "Low fitness", inheritedBy: offspring.slice(0, 2).map(o => o.id) })),
        born: offspring.map(a => ({ id: a.id, name: a.name, fitness: a.fitness, parentIds: a.parentIds || [] })),
        avgFitnessBefore: +avgBefore.toFixed(1), avgFitnessAfter: +avgAfter.toFixed(1), topFitness: +topFit.toFixed(1), capitalBefore: 100_000, capitalAfter: newCapital,
      });
      setAgents(allNext);
      setPostMortems(pm => [...newPostMortems, ...pm].slice(0, 20));
      setCurrentGen(g => g + 1);
      setGenHistory(h => [...h, genData]);

      toast({ title: `Generation ${currentGen + 1} Complete`, description: `Avg fitness ${avgBefore.toFixed(1)} → ${avgAfter.toFixed(1)}. ${cullCount} culled, ${offspring.length} born.` });
    } catch (err) {
      console.error("Generation failed:", err);
      toast({ title: "Generation Failed", description: "Error running evolution cycle.", variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  }, [agents, priceHistory, currentGen, portfolio, backtestResults]);

  // ─── Auto-run: keep refs current so the interval closure never goes stale ───
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { runGenerationRef.current = runGeneration; }, [runGeneration]);

  useEffect(() => {
    if (autoRunRef.current) clearInterval(autoRunRef.current);
    if (!autoRunEnabled) return;
    autoRunRef.current = setInterval(() => {
      if (!isRunningRef.current) runGenerationRef.current();
    }, autoRunInterval * 1000);
    return () => { if (autoRunRef.current) clearInterval(autoRunRef.current); };
  }, [autoRunEnabled, autoRunInterval]);

  const handleCloseTour = useCallback(() => {
    setShowTour(false);
    localStorage.setItem("apex-tour-seen", "true");
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background grid-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-mono text-muted-foreground">Loading population from database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid-bg">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                <span className="text-primary text-glow-green">FalseMarkets</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground flex-wrap justify-end">
            {priceLoadMsg && (
              <span className="text-[10px] text-primary animate-pulse">{priceLoadMsg}</span>
            )}
            <button
              onClick={refreshPriceData}
              disabled={isPriceRefreshing}
              title="Force re-download all 15 symbols from Binance and clear IndexedDB cache"
              className="flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-3 w-3 ${isPriceRefreshing ? "animate-spin" : ""}`} />
              <span>Prices</span>
            </button>
            <button
              onClick={handleReset}
              title="Wipe all agents, generations, trades and post-mortems — restarts from generation 0"
              className="flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-destructive/20 hover:border-destructive/40 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              <span>Reset to Gen 0</span>
            </button>
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-primary animate-pulse-green" />
              <span>LIVE</span>
            </div>
            <span>·</span>
            <span>Airia Orchestrated</span>
            <span>·</span>
            <div className="flex items-center gap-1.5">
              <Brain className="h-3 w-3 text-accent" />
              <span>DB Persisted</span>
            </div>
            <span>·</span>
            {priceLoadMsg ? (
              <span className="flex items-center gap-1 text-amber-400/80">
                <Loader2 className="h-3 w-3 animate-spin" />
                {priceLoadMsg}
              </span>
            ) : (
              <button
                onClick={refreshPriceData}
                disabled={isPriceRefreshing}
                title="Force re-download 2yr OHLCV from Binance (clears IndexedDB cache)"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`h-3 w-3 ${isPriceRefreshing ? "animate-spin" : ""}`} />
                <span>Price data</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto p-6 space-y-6">
        <GenerationControls
          currentGeneration={currentGen}
          isRunning={isRunning}
          onRunGeneration={runGeneration}
          activeCount={activeAgents.length}
          extinctCount={extinctAgents.length}
          onShowTour={() => setShowTour(true)}
          autoRunEnabled={autoRunEnabled}
          autoRunInterval={autoRunInterval}
          onToggleAutoRun={() => setAutoRunEnabled(v => !v)}
          onSetAutoInterval={(s) => setAutoRunInterval(s)}
        />

        {/* Alpaca Paper Trading + Population Health row */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4">
            <AlpacaPaperPanel portfolio={portfolio} />
          </div>
          <div className="col-span-12 md:col-span-8">
            <PopulationHealthPanel agents={agents} results={backtestResults} totalCapital={portfolio.capital} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Evolution Theater — Agent Population
                </h2>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {activeAgents.length} alive · {extinctAgents.length} extinct
                </span>
              </div>

              {/* Status filter */}
              <div className="flex gap-1 flex-wrap">
                {(["all", "newborn", "active", "breeding", "extinct"] as const).map((f) => {
                  // "all" means all non-extinct agents; use the "extinct" tab to see dead agents
                  const count = f === "all"
                    ? agents.filter(a => a.status !== "extinct").length
                    : agents.filter(a => a.status === f).length;
                  return (
                    <button
                      key={f}
                      onClick={() => setAgentFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-medium transition-colors border ${
                        agentFilter === f
                          ? "bg-primary/20 text-primary border-primary/30"
                          : "bg-secondary text-muted-foreground border-transparent hover:text-foreground"
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                    </button>
                  );
                })}
              </div>

              {(() => {
                const sorted = [...agents]
                  .sort((a, b) => {
                    const order = { newborn: 0, breeding: 1, active: 2, extinct: 3 };
                    const diff = order[a.status] - order[b.status];
                    if (diff !== 0) return diff;
                    return b.generation - a.generation || b.fitness - a.fitness;
                  })
                  // "all" = all alive (non-extinct); show extinct only via the "extinct" tab
                  .filter(a => agentFilter === "all" ? a.status !== "extinct" : a.status === agentFilter);
                
                const visible = showExtinct ? sorted : sorted.slice(0, INITIAL_VISIBLE);
                const hiddenCount = sorted.length - INITIAL_VISIBLE;

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <AnimatePresence mode="popLayout">
                        {visible.map((agent) => (
                          <AgentCard key={agent.id} agent={agent} />
                        ))}
                      </AnimatePresence>
                    </div>
                    {!showExtinct && hiddenCount > 0 && (
                      <button
                        onClick={() => setShowExtinct(true)}
                        className="mt-3 w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-xs font-mono font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        Show {hiddenCount} more agents
                      </button>
                    )}
                    {showExtinct && sorted.length > INITIAL_VISIBLE && (
                      <button
                        onClick={() => setShowExtinct(false)}
                        className="mt-3 w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-xs font-mono font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        Show less
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            {genHistory.length >= 1 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <GenerationChart data={genHistory} />
              </div>
            )}

            {/* Real backtest PnL curves */}
            <div className="rounded-xl border border-border bg-card p-4">
              <BacktestChart
                agents={agents.filter(a => a.status !== "extinct")}
                results={backtestResults}
                generation={currentGen}
                priceLoaded={Object.values(priceHistory).some(b => b.length > 50)}
              />
            </div>

            {/* Per-agent price chart with entry/exit signal overlays + formula breakdown */}
            <div className="rounded-xl border border-border bg-card p-4">
              <AgentTradeChart
                agents={agents.filter(a => a.status !== "extinct")}
                results={backtestResults}
                priceHistory={priceHistory}
                priceLoaded={Object.values(priceHistory).some(b => b.length > 50)}
              />
            </div>

            {/* Trade History */}
            <TradeHistoryLog trades={trades} />
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Risk Metrics */}
            <RiskMetricsDashboard
              agents={agents}
              portfolio={portfolio}
              genHistory={genHistory}
            />


            <PerformanceLeaderboard agents={agents} />

            <div className="rounded-xl border border-border bg-card p-4">
              <PostMortemFeed postMortems={postMortems} />
            </div>
          </div>
        </div>
      </main>

      <GenerationSummaryModal
        summary={generationSummary}
        onClose={() => setGenerationSummary(null)}
      />

      <GuidedTour isOpen={showTour} onClose={handleCloseTour} />

      {/* Spawn wizard — auto-opens when no agents exist, or on manual reset */}
      <OnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSpawned={handleSpawned}
      />
    </div>
  );
}
