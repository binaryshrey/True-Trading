/**
 * BacktestChart.tsx
 * Interactive equity-curve chart for the top agents in a generation.
 * Shows multiple overlapping PnL curves + per-agent Sharpe / return badges.
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import { AgentGenome } from "@/data/types";
import { BacktestResult, decodeFastMA, decodeSlowMA } from "@/lib/backtest";
import { assetLabel } from "@/lib/backtest";

interface BacktestChartProps {
  agents: AgentGenome[];
  results: Record<string, BacktestResult>;
  generation: number;
  /** True once at least one symbol has ≥50 bars from Binance/IndexedDB */
  priceLoaded?: boolean;
}

// Distinct palette for up to 10 curves
const COLORS = [
  "hsl(160 100% 45%)",  // green – primary
  "hsl(195 100% 50%)",  // cyan
  "hsl(280 80% 65%)",   // purple
  "hsl(38 100% 55%)",   // amber
  "hsl(340 80% 60%)",   // pink
  "hsl(60 100% 50%)",   // yellow
  "hsl(200 80% 60%)",   // blue
  "hsl(120 60% 55%)",   // light green
  "hsl(15 90% 60%)",    // orange
  "hsl(250 70% 65%)",   // indigo
];

function formatDollar(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function mergeEquityCurves(
  agents: AgentGenome[],
  results: Record<string, BacktestResult>,
): { date: string; [id: string]: number | string }[] {
  if (agents.length === 0) return [];

  // Use the first agent's dates as the reference axis
  const firstResult = results[agents[0].id];
  if (!firstResult) return [];

  const dateList = firstResult.equityCurve.map((p) => p.date);

  return dateList.map((date, i) => {
    const row: { date: string; [id: string]: number | string } = { date };
    for (const agent of agents) {
      const r = results[agent.id];
      if (r?.equityCurve[i]) {
        row[agent.id] = r.equityCurve[i].equity;
      }
    }
    return row;
  });
}

const CustomTooltip = ({
  active,
  payload,
  label,
  agentMap,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  agentMap: Record<string, AgentGenome>;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: "hsl(220 18% 7%)",
        border: "1px solid hsl(220 16% 14%)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 11,
        fontFamily: "JetBrains Mono, monospace",
        minWidth: 160,
      }}
    >
      <div style={{ color: "hsl(215 12% 60%)", marginBottom: 4 }}>{label}</div>
      {payload
        .sort((a, b) => b.value - a.value)
        .map((p: any) => {
          const agent = agentMap[p.dataKey];
          if (!agent) return null;
          const ret = ((p.value - 100_000) / 100_000) * 100;
          return (
            <div key={p.dataKey} style={{ color: p.stroke, marginBottom: 2 }}>
              <span style={{ opacity: 0.7 }}>{agent.name.slice(0, 14)}</span>{" "}
              <span style={{ fontWeight: 700 }}>
                {ret >= 0 ? "+" : ""}
                {ret.toFixed(1)}%
              </span>
            </div>
          );
        })}
    </div>
  );
};

export default function BacktestChart({
  agents,
  results,
  generation,
  priceLoaded = true,
}: BacktestChartProps) {
  // Only show top 8 by fitness that have results
  const visible = agents
    .filter((a) => !!results[a.id])
    .sort((a, b) => b.fitness - a.fitness)
    .slice(0, 8);

  const chartData = mergeEquityCurves(visible, results);

  const agentMap: Record<string, AgentGenome> = {};
  visible.forEach((a) => (agentMap[a.id] = a));

  // Thin the data points for performance (show max 200 ticks)
  const step = Math.max(1, Math.floor(chartData.length / 200));
  const thinned = chartData.filter((_, i) => i % step === 0 || i === chartData.length - 1);

  if (visible.length === 0) {
    const msg = agents.length === 0
      ? "Spawn agents first — open the onboarding wizard to seed a new population"
      : !priceLoaded
      ? "Fetching price data from Binance… retry via the Refresh Prices button if this persists"
      : "Backtest results will appear here after agents are backtested — click Run Generation";
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Backtest PnL Curves
        </h3>
        <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground font-mono text-center px-6">
          <span>{msg}</span>
          {agents.length > 0 && !priceLoaded && (
            <span className="text-[10px] opacity-60">
              Binance API may be unreachable from your network — try the ↺ Prices button in the header
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Backtest PnL Curves — Generation {generation}
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground">
          2yr daily · SMA crossover · rf = 0
        </span>
      </div>

      {/* Chart legend explaining what the numbers mean */}
      <div className="rounded-md bg-secondary/30 border border-border/50 px-3 py-2 text-[9px] font-mono text-muted-foreground space-y-0.5">
        <p><span className="text-foreground font-semibold">Y-axis</span> = portfolio equity starting at <span className="text-primary">$100,000</span>. A line trending up = the agent made money; down = lost money.</p>
        <p><span className="text-foreground font-semibold">Strategy</span>: each agent runs a long-only SMA crossover on its assigned crypto. Enter when fast SMA crosses above slow SMA (golden cross), exit on death cross.</p>
        <p><span className="text-foreground font-semibold">Badges below</span>: S = Sharpe ratio (risk-adjusted return; &gt;1 is good) · DD = max drawdown % · F/S = fast/slow SMA periods in days.</p>
      </div>

      {/* Per-agent stat badges */}
      <div className="flex flex-wrap gap-2">
        {visible.map((agent, idx) => {
          const r = results[agent.id];
          if (!r) return null;
          const color = COLORS[idx % COLORS.length];
          return (
            <div
              key={agent.id}
              className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2 py-1"
            >
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] font-mono text-foreground truncate max-w-[70px]">
                {agent.name}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">
                {r.asset}
              </span>
              <span
                className="text-[10px] font-mono font-semibold"
                style={{ color: r.sharpe >= 1 ? "hsl(160 100% 45%)" : r.sharpe >= 0 ? "hsl(38 100% 55%)" : "hsl(0 72% 51%)" }}
              >
                S:{r.sharpe.toFixed(2)}
              </span>
              <span
                className="text-[10px] font-mono"
                style={{ color: r.totalReturn >= 0 ? "hsl(160 100% 45%)" : "hsl(0 72% 51%)" }}
              >
                {r.totalReturn >= 0 ? "+" : ""}
                {r.totalReturn.toFixed(1)}%
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">
                F{r.fastPeriod}/S{r.slowPeriod}
              </span>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={thinned} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(220 16% 12%)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{
                fill: "hsl(215 12% 45%)",
                fontSize: 9,
                fontFamily: "JetBrains Mono",
              }}
              tickFormatter={(v: string) => v.slice(0, 7)}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{
                fill: "hsl(215 12% 45%)",
                fontSize: 9,
                fontFamily: "JetBrains Mono",
              }}
              tickFormatter={formatDollar}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              content={<CustomTooltip agentMap={agentMap} />}
              isAnimationActive={false}
            />
            {visible.map((agent, idx) => (
              <Line
                key={agent.id}
                type="monotone"
                dataKey={agent.id}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* $100k baseline note */}
      <p className="text-[9px] font-mono text-muted-foreground text-center">
        All curves start at $100,000 initial capital
      </p>
    </motion.div>
  );
}
