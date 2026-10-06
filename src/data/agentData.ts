import { AgentGenome } from "./types";

// Generate deterministic agent data
const strategies = [
  "Momentum Alpha", "Mean Reversion", "Breakout Hunter", "Volatility Arbitrage",
  "Trend Follower", "Scalp Master", "Swing Trader", "Gap Fill", "RSI Divergence",
  "MACD Crossover", "Bollinger Squeeze", "Volume Surge", "Pairs Trading",
  "Statistical Arb", "Market Maker", "News Reactor", "Earnings Fade",
  "Sector Rotation", "Delta Neutral", "Gamma Scalp", "Iron Condor",
  "Covered Call", "Bull Spread", "Bear Spread", "Calendar Spread",
  "Straddle Hunter", "Strangle Play", "Butterfly", "Collar Strategy",
  "Ratio Spread", "Jade Lizard", "Risk Reversal", "Synthetic Long",
  "Iron Butterfly", "Diagonal Spread", "Protective Put", "Cash Secured",
  "Wheel Strategy", "Poor Man's CC", "Zebra Trade"
];

const archetypes = ["momentum", "defensive", "volatility", "mean-reversion", "hybrid"] as const;

export function generateAgents(count: number = 40): AgentGenome[] {
  return Array.from({ length: count }, (_, i) => {
    const gen = Math.floor(Math.random() * 4);
    const fitness = Math.random() * 100;
    const isAlive = Math.random() > 0.15;
    const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
    
    return {
      id: `AGT-${String(i + 1).padStart(3, "0")}`,
      name: strategies[i % strategies.length],
      generation: gen,
      fitness: Math.round(fitness * 10) / 10,
      status: isAlive ? "active" : "extinct",
      archetype,
      sharpe: Math.round((Math.random() * 3 - 0.5) * 100) / 100,
      maxDrawdown: Math.round(Math.random() * 25 * 10) / 10,
      winRate: Math.round((40 + Math.random() * 35) * 10) / 10,
      totalReturn: Math.round((Math.random() * 40 - 10) * 100) / 100,
      trades: Math.floor(Math.random() * 150 + 10),
      parentIds: gen > 0 ? [
        `AGT-${String(Math.floor(Math.random() * count) + 1).padStart(3, "0")}`,
        `AGT-${String(Math.floor(Math.random() * count) + 1).padStart(3, "0")}`
      ] : undefined,
      genome: {
        entryLogic: Math.round(Math.random() * 100) / 100,
        exitDiscipline: Math.round(Math.random() * 100) / 100,
        riskTolerance: Math.round(Math.random() * 100) / 100,
        positionSizing: Math.round(Math.random() * 100) / 100,
        indicatorWeight: Math.round(Math.random() * 100) / 100,
      }
    };
  });
}

export const initialPostMortems = [
  {
    id: "pm-1",
    agentId: "AGT-023",
    agentName: "RSI Divergence",
    generation: 2,
    cause: "Overexposure to momentum signals during Fed rate announcement. Entry timing consistently 2-3 bars late in high-volatility regimes.",
    inheritedBy: ["AGT-031", "AGT-044"],
    timestamp: new Date(Date.now() - 3600000),
    fitnessAtDeath: 23.4,
  },
  {
    id: "pm-2",
    agentId: "AGT-017",
    agentName: "Gap Fill",
    generation: 1,
    cause: "Failed to adapt exit discipline during earnings season. Held positions through gap-down events 4 consecutive times. Max drawdown exceeded 22%.",
    inheritedBy: ["AGT-038"],
    timestamp: new Date(Date.now() - 7200000),
    fitnessAtDeath: 18.7,
  },
  {
    id: "pm-3",
    agentId: "AGT-009",
    agentName: "Volatility Arbitrage",
    generation: 3,
    cause: "Population convergence victim. Strategy niche was over-represented (6 similar agents). Culled to maintain genetic diversity despite adequate returns.",
    inheritedBy: ["AGT-041", "AGT-042"],
    timestamp: new Date(Date.now() - 10800000),
    fitnessAtDeath: 41.2,
  },
];

export const behavioralGenome = {
  riskTolerance: 0.62,
  drawdownSensitivity: 0.78,
  earningsAvoidance: 0.45,
  momentumBias: 0.33,
  holdingPatience: 0.71,
};

export const generationHistory = [
  { gen: 0, avgFitness: 38.2, topFitness: 67.1, population: 40, diversity: 0.92 },
  { gen: 1, avgFitness: 44.7, topFitness: 72.4, population: 38, diversity: 0.85 },
  { gen: 2, avgFitness: 51.3, topFitness: 78.9, population: 40, diversity: 0.78 },
  { gen: 3, avgFitness: 56.8, topFitness: 84.2, population: 42, diversity: 0.71 },
];
