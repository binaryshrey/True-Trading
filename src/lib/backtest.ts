/**
 * backtest.ts
 * SMA crossover backtest engine with real position sizing formula.
 *
 * ═══════════════════════════════════════════════════════════════
 *  GENOME ENCODING
 * ───────────────────────────────────────────────────────────────
 *  fastMA      ∈ [0, 1]  →  period = round(5  + v × 45)   →  5–50  days
 *  slowMA      ∈ [0, 1]  →  period = round(20 + v × 180)  →  20–200 days
 *  riskAversion∈ [0, 1]  →  0 = full aggression, 1 = flat
 *  assetIdx    ∈ [0, 1]  →  floor(v × 27) → one of 28 crypto tokens (0-indexed)
 *
 * ═══════════════════════════════════════════════════════════════
 *  LOOKBACK WINDOW
 * ───────────────────────────────────────────────────────────────
 *  Each backtest uses only the most recent 730 daily bars (≈ 2 years).
 *  Assets with shorter history use all available bars.
 *  This prevents century-scale BTC bull runs from inflating metrics.
 *
 * ═══════════════════════════════════════════════════════════════
 *  POSITION SIZING FORMULA
 * ───────────────────────────────────────────────────────────────
 *  Signal (bullish if fast SMA > slow SMA, else FLAT):
 *
 *    σ  = (fastSMA − slowSMA) / slowSMA        [dimensionless fraction]
 *    e  = (1 − riskAversion) × tanh(σ × 15) × 0.99   [exposure 0–0.99]
 *    P$ = equity × e                            [dollar position]
 *    Q  = P$ / price                            [units to hold]
 *
 *  Properties:
 *    • tanh saturates quickly → max position never exceeds 99 % of equity
 *    • riskAversion = 0.9 ⇒ max exposure ≈ 9.9 %
 *    • riskAversion = 0.0 ⇒ max exposure ≈ 99 %
 *    • Rebalance only when |Δexposure| > 1 % to reduce churn
 *    • No leverage, no short selling
 *
 * ═══════════════════════════════════════════════════════════════
 *  FITNESS  (0–100)
 * ───────────────────────────────────────────────────────────────
 *    S* = clamp(sharpe,  −2,  4)  →  normalise to [0, 1] over [−2, 4]
 *    R* = clamp(return%, −50, 150) → normalise to [0, 1] over [−50, 150]
 *    W* = winRate / 100
 *    D* = 1 − clamp(maxDrawdown%, 0, 60) / 60
 *
 *    raw    = 0.40 × S* + 0.30 × R* + 0.20 × W* + 0.10 × D*
 *    fitness = round(clamp(raw, 0, 1) × 100, 1)
 *
 *  Sharpe (annualised, rf = 0):
 *    daily_return[i] = (equity[i] − equity[i−1]) / equity[i−1]
 *    Sharpe = mean(daily_return) / std(daily_return) × √252
 * ═══════════════════════════════════════════════════════════════
 */

import type { AgentGenome } from "@/data/types";
import { OHLCVBar, PriceHistory, TOP_15, SYMBOL_LABEL } from "./priceData";

// ─── Genome decoders ─────────────────────────────────────────────────────────

export function decodeFastMA(v: number): number {
  return Math.max(5, Math.round(5 + v * 45));      // 5–50 days
}

export function decodeSlowMA(v: number): number {
  return Math.max(20, Math.round(20 + v * 180));   // 20–200 days
}

export function decodeAssetIdx(v: number): number {
  return Math.min(27, Math.max(0, Math.round(v * 27)));
}

export function assetSymbol(assetIdxV: number): string {
  return TOP_15[decodeAssetIdx(assetIdxV)];
}

export function assetLabel(assetIdxV: number): string {
  return SYMBOL_LABEL[assetSymbol(assetIdxV)] ?? "BTC";
}

/** Classify archetype from genome periods. */
export function archetypeFromGenome(
  fastMAv: number,
  slowMAv: number,
): AgentGenome["archetype"] {
  const f = decodeFastMA(fastMAv);
  const s = decodeSlowMA(slowMAv);
  const spread = s - f;
  if (f <= 10 && spread <= 25) return "momentum";
  if (s >= 130) return "defensive";
  if (spread <= 15) return "volatility";
  if (f >= 25 && s >= 80) return "mean-reversion";
  return "hybrid";
}

// ─── SMA via O(n) prefix sums ────────────────────────────────────────────────

function computeSMA(prices: number[], period: number): (number | null)[] {
  const n = prices.length;
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + prices[i];
  return Array.from({ length: n }, (_, i) => {
    if (i < period - 1) return null;
    return (prefix[i + 1] - prefix[i + 1 - period]) / period;
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * A golden or death cross signal.
 * action: "entry" = SMA_fast just crossed above SMA_slow (go long).
 * action: "exit"  = SMA_fast just crossed below SMA_slow (flatten).
 * price: close price at the bar when the cross occurred.
 * exposure: the target exposure fraction immediately after the signal.
 *
 * Note: we record only the initial entry/exit crosses, not every
 * intermediate rebalance. Between a golden cross and the next death
 * cross the position is continuously rebalanced as σ changes, but
 * only the two discrete crossover events are meaningful signals to plot.
 */
export interface TradeSignal {
  date: string;      // "YYYY-MM-DD"
  price: number;     // close at signal bar
  action: "entry" | "exit";
  exposure: number;  // target exposure [0, 0.99] right after signal
}

export interface BacktestResult {
  totalReturn: number;    // % e.g. 23.5
  sharpe: number;         // annualised, rf = 0
  maxDrawdown: number;    // % positive, e.g. 15.6
  winRate: number;        // % e.g. 55.0
  trades: number;         // completed round-trips
  fitness: number;        // 0–100 composite
  equityCurve: { date: string; equity: number }[];
  tradeSignals: TradeSignal[];  // golden/death cross events
  fastPeriod: number;
  slowPeriod: number;
  asset: string;          // e.g. "BTC"
}

// ─── Core backtest ────────────────────────────────────────────────────────────

export function runBacktest(
  bars: OHLCVBar[],
  fastMAv: number,
  slowMAv: number,
  riskAversion: number,
  initialCapital = 100_000,
): BacktestResult | null {
  if (!bars || bars.length < 50) return null;

  let fastP = decodeFastMA(fastMAv);
  let slowP = decodeSlowMA(slowMAv);
  // Ensure fast < slow with at least 10-day gap
  if (fastP >= slowP) slowP = fastP + Math.max(10, Math.ceil(fastP * 0.25));

  const closes = bars.map((b) => b.close);
  const fastSMA = computeSMA(closes, fastP);
  const slowSMA = computeSMA(closes, slowP);

  let cash = initialCapital;
  let position = 0;          // units of crypto held
  let currentExposure = 0;   // fraction of equity currently in crypto

  // Trade tracking
  let entryEquity = 0;       // equity when we entered the current position
  let wins = 0;
  let losses = 0;

  const equityCurve: { date: string; equity: number }[] = [];
  const tradeSignals: TradeSignal[] = [];
  const dailyReturns: number[] = [];
  // Track previous bar's SMA values to detect crossovers
  let prevFSMA: number | null = null;
  let prevSSMA: number | null = null;

  let peak = initialCapital;
  let maxDD = 0;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const price = bar.close;

    // Mark-to-market equity
    const equity = cash + position * price;

    // Record daily return (skip day 0)
    if (i > 0) {
      const prevEquity = equityCurve[equityCurve.length - 1]?.equity ?? initialCapital;
      dailyReturns.push((equity - prevEquity) / prevEquity);
    }
    equityCurve.push({ date: bar.date, equity: +equity.toFixed(2) });

    // Drawdown tracking
    if (equity > peak) peak = equity;
    const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
    if (dd > maxDD) maxDD = dd;

    // Need both SMAs to be defined
    const fSMA = fastSMA[i];
    const sSMA = slowSMA[i];
    if (fSMA === null || sSMA === null) {
      prevFSMA = fSMA;
      prevSSMA = sSMA;
      continue;
    }

    // ── Detect golden cross (entry) and death cross (exit) ──────────────────
    // Golden cross:  fast was ≤ slow, now fast > slow  → go long
    // Death  cross:  fast was >  slow, now fast ≤ slow → flatten
    if (prevFSMA !== null && prevSSMA !== null) {
      if (fSMA > sSMA && prevFSMA <= prevSSMA) {
        const tgt = (1 - riskAversion) * Math.tanh(((fSMA - sSMA) / sSMA) * 15) * 0.99;
        tradeSignals.push({ date: bar.date, price, action: "entry", exposure: +tgt.toFixed(4) });
      } else if (fSMA <= sSMA && prevFSMA > prevSSMA) {
        tradeSignals.push({ date: bar.date, price, action: "exit", exposure: 0 });
      }
    }
    prevFSMA = fSMA;
    prevSSMA = sSMA;

    // Compute target exposure
    let targetExposure = 0;
    if (fSMA > sSMA) {
      const σ = (fSMA - sSMA) / sSMA;
      targetExposure = (1 - riskAversion) * Math.tanh(σ * 15) * 0.99;
    }

    // Only rebalance if exposure shift > 1 %
    if (Math.abs(targetExposure - currentExposure) <= 0.01) continue;

    const targetPositionDollar = equity * targetExposure;
    const targetUnits = targetPositionDollar / price;
    const delta = targetUnits - position;

    if (delta > 0) {
      // Buy
      const cost = Math.min(delta * price, cash);
      const actualUnits = cost / price;
      position += actualUnits;
      cash -= cost;

      if (currentExposure === 0) {
        // Fresh entry — record entry equity for win/loss tracking
        entryEquity = equity;
      }
    } else if (delta < 0) {
      // Sell (partial or full)
      const actualUnits = Math.min(Math.abs(delta), position);
      const proceeds = actualUnits * price;
      position -= actualUnits;
      cash += proceeds;

      if (position * price < equity * 0.005) {
        // Full exit — record win/loss
        const exitEquity = cash + position * price;
        if (exitEquity > entryEquity) wins++;
        else losses++;
        position = 0;
        cash = exitEquity; // reconcile any fp drift
      }
    }

    currentExposure = (position * price) / Math.max(equity, 1);
  }

  const finalEquity = cash + position * closes[closes.length - 1];
  const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;

  // Sharpe (annualised, rf = 0)
  const n = dailyReturns.length;
  let sharpe = 0;
  if (n > 2) {
    const mean = dailyReturns.reduce((s, r) => s + r, 0) / n;
    const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : 0;
  }

  const totalTrades = wins + losses;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0; // 0, not 50 — no free lunch

  const baseFitness = computeFitness(sharpe, totalReturn, winRate, maxDD);

  // ── Anti-overfitting penalty ─────────────────────────────────────────────────────────────────
  // Walk-forward consistency: split at the midpoint of available bars and check
  // whether the strategy remained profitable in the second half.
  // If it collapses after the midpoint, it almost certainly over-fit the first half.
  const midIdx = Math.floor(equityCurve.length / 2);
  const midEquity  = equityCurve[midIdx]?.equity  ?? initialCapital;
  const year2Ret   = midEquity > 0 ? (finalEquity - midEquity) / midEquity : 0;
  const consistencyPenalty = year2Ret < -0.20 ? 0.50
                           : year2Ret < -0.05 ? 0.75
                           : 1.0;

  const fitness = +(baseFitness * consistencyPenalty).toFixed(1);

  return {
    totalReturn: +totalReturn.toFixed(2),
    sharpe: +sharpe.toFixed(3),
    maxDrawdown: +maxDD.toFixed(2),
    winRate: +winRate.toFixed(1),
    trades: totalTrades,
    fitness,
    equityCurve,
    tradeSignals,
    fastPeriod: fastP,
    slowPeriod: slowP,
    asset: SYMBOL_LABEL[assetSymbol(0)] ?? "BTC", // filled by caller
  };
}

// ─── Fitness formula ─────────────────────────────────────────────────────────

export function computeFitness(
  sharpe: number,
  totalReturnPct: number,
  winRatePct: number,
  maxDrawdownPct: number,
): number {
  const sNorm = (Math.min(Math.max(sharpe, -2), 4) + 2) / 6;              // [-2,4] → [0,1]
  const rNorm = (Math.min(Math.max(totalReturnPct, -50), 150) + 50) / 200; // [-50,150] → [0,1]
  const wNorm = winRatePct / 100;
  const dNorm = 1 - Math.min(Math.max(maxDrawdownPct, 0), 60) / 60;

  const raw = 0.40 * sNorm + 0.30 * rNorm + 0.20 * wNorm + 0.10 * dNorm;
  return +(Math.min(Math.max(raw, 0), 1) * 100).toFixed(1);
}

// ─── Agent-level helper ───────────────────────────────────────────────────────

// ── Lookback window ───────────────────────────────────────────────────────────
// Use only the most recent 730 daily bars (≈ 2 years) so that:
//  • All agents are evaluated on the same time window regardless of asset age.
//  • No strategy catches the 2013-2025 BTC 95,000 % run — results stay sane.
//  • The walk-forward split remains ≈ 1yr in-sample / 1yr out-of-sample.
const BACKTEST_BARS = 730;

export function backtestAgent(
  agent: AgentGenome,
  priceHistory: PriceHistory,
): BacktestResult | null {
  const sym = assetSymbol(agent.genome.assetIdx);
  const allBars = priceHistory[sym];
  if (!allBars || allBars.length < 50) return null;

  // Slice to the most recent 730 bars (or all if fewer)
  const bars = allBars.slice(-BACKTEST_BARS);

  const result = runBacktest(
    bars,
    agent.genome.fastMA,
    agent.genome.slowMA,
    agent.genome.riskAversion,
  );
  if (!result) return null;

  result.asset = SYMBOL_LABEL[sym] ?? sym;
  return result;
}

// ─── Genome evolution (crossover + mutation) ─────────────────────────────────

export interface SMAGenome {
  fastMA: number;
  slowMA: number;
  riskAversion: number;
  assetIdx: number;
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

/** Uniform crossover + Gaussian-ish mutation (15 % magnitude). */
export function crossoverMutate(
  p1: SMAGenome,
  p2: SMAGenome,
  rand: () => number = Math.random,
): SMAGenome {
  const MUT = 0.12;

  function blend(a: number, b: number): number {
    return clamp01(a + (b - a) * rand() + (rand() - 0.5) * 2 * MUT);
  }

  // Asset: inherit from one parent; 25 % chance of random mutation (was 10 %).
  // Higher mutation rate breaks asset monoculture and encourages exploration.
  const assetIdx = rand() < 0.75
    ? (rand() < 0.5 ? p1.assetIdx : p2.assetIdx)
    : rand();

  return {
    fastMA: blend(p1.fastMA, p2.fastMA),
    slowMA: blend(p1.slowMA, p2.slowMA),
    riskAversion: blend(p1.riskAversion, p2.riskAversion),
    assetIdx: clamp01(assetIdx),
  };
}
