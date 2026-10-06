import { useMemo } from "react";
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, YAxisProps,
  ResponsiveContainer, Tooltip, ReferenceLine, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";

interface GenerationChartProps {
  data: { gen: number; avgFitness: number; topFitness: number; population: number; diversity: number }[];
}

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(220 18% 7%)",
  border: "1px solid hsl(220 16% 14%)",
  borderRadius: "8px",
  fontSize: "11px",
  fontFamily: "JetBrains Mono",
};

export default function GenerationChart({ data }: GenerationChartProps) {
  const chartData = useMemo(() =>
    data
      .filter(d => d.gen >= 1)
      .map(d => ({
        ...d,
        // "base" + "spread" strategy: stacking these two produces a filled band
        // base  = avgFitness  (floor of the gap — rendered transparent)
        // spread = topFitness − avgFitness  (the coloured gap above avg)
        base: d.avgFitness,
        spread: +(d.topFitness - d.avgFitness).toFixed(1),
        // delta from previous generation for colour coding
      })),
    [data],
  );

  // Auto-scale Y so small differences spread across the full axis
  const allFitness = chartData.flatMap(d => [d.avgFitness, d.topFitness]);
  const yMin = allFitness.length ? Math.max(0, Math.floor(Math.min(...allFitness) - 8)) : 0;
  const yMax = allFitness.length ? Math.min(100, Math.ceil(Math.max(...allFitness) + 6)) : 100;

  const latest = chartData[chartData.length - 1];
  const prev   = chartData[chartData.length - 2];
  const topDelta = latest && prev ? +(latest.topFitness - prev.topFitness).toFixed(1) : null;
  const avgDelta = latest && prev ? +(latest.avgFitness - prev.avgFitness).toFixed(1) : null;
  const currentSpread = latest ? latest.spread : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Evolution Progress
        </h3>
        {latest && (
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-[hsl(160_100%_45%)]">
              Top&nbsp;{latest.topFitness.toFixed(1)}
              {topDelta !== null && (
                <span className={topDelta >= 0 ? "text-[hsl(160_100%_45%)]" : "text-destructive"}>
                  &nbsp;{topDelta >= 0 ? "↑" : "↓"}{Math.abs(topDelta)}
                </span>
              )}
            </span>
            <span className="text-[hsl(38_100%_55%)]">
              Avg&nbsp;{latest.avgFitness.toFixed(1)}
              {avgDelta !== null && (
                <span className={avgDelta >= 0 ? "text-[hsl(38_100%_55%)]" : "text-destructive"}>
                  &nbsp;{avgDelta >= 0 ? "↑" : "↓"}{Math.abs(avgDelta)}
                </span>
              )}
            </span>
            {currentSpread !== null && (
              <span className="text-muted-foreground">gap&nbsp;{currentSpread}</span>
            )}
          </div>
        )}
      </div>

      {/* Main chart */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <defs>
              {/* Spread band gradient (top → avg) */}
              <linearGradient id="gcSpread" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="hsl(160 100% 45%)" stopOpacity={0.40} />
                <stop offset="100%" stopColor="hsl(160 100% 45%)" stopOpacity={0.05} />
              </linearGradient>
              {/* Population bar gradient */}
              <linearGradient id="gcPop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="hsl(220 16% 30%)" stopOpacity={0.7} />
                <stop offset="100%" stopColor="hsl(220 16% 20%)" stopOpacity={0.3} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(220 16% 14%)"
              vertical={false}
            />

            <XAxis
              dataKey="gen"
              tick={{ fill: "hsl(215 12% 50%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
              tickFormatter={(v) => `G${v}`}
              axisLine={false}
              tickLine={false}
            />

            {/* Left Y axis — fitness */}
            <YAxis
              yAxisId="fitness"
              tick={{ fill: "hsl(215 12% 50%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              domain={[yMin, yMax]}
              tickCount={5}
            />

            {/* Right Y axis — population (de-emphasised) */}
            <YAxis
              yAxisId="pop"
              orientation="right"
              tick={{ fill: "hsl(215 12% 35%)", fontSize: 9, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
              width={24}
            />

            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number, name: string) => {
                if (name === "Population" || name === "_base" || name === "Spread") return [null, null];
                return [value.toFixed(1), name];
              }}
              labelFormatter={(g) => `Generation ${g}`}
            />

            {/* Population bars — background context, right axis */}
            <Bar
              yAxisId="pop"
              dataKey="population"
              name="Population"
              fill="url(#gcPop)"
              radius={[2, 2, 0, 0]}
              maxBarSize={20}
            />

            {/* Spread band: stacked areas — base (transparent floor) + spread (coloured roof) */}
            <Area
              yAxisId="fitness"
              type="monotone"
              dataKey="base"
              stackId="band"
              stroke="none"
              fill="transparent"
              legendType="none"
              name="_base"
              tooltipType="none"
            />
            <Area
              yAxisId="fitness"
              type="monotone"
              dataKey="spread"
              stackId="band"
              stroke="none"
              fill="url(#gcSpread)"
              name="Spread"
            />

            {/* Avg fitness — amber dashed line */}
            <Line
              yAxisId="fitness"
              type="monotone"
              dataKey="avgFitness"
              stroke="hsl(38 100% 55%)"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ r: 3, fill: "hsl(38 100% 55%)", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              name="Avg Fitness"
            />

            {/* Top fitness — solid green line */}
            <Line
              yAxisId="fitness"
              type="monotone"
              dataKey="topFitness"
              stroke="hsl(160 100% 45%)"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: "hsl(160 100% 45%)", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              name="Top Fitness"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-5 justify-center">
          <div className="flex items-center gap-1.5">
            <svg width="18" height="8">
              <line x1="0" y1="4" x2="18" y2="4" stroke="hsl(160 100% 45%)" strokeWidth="2.5" />
            </svg>
            <span className="text-[10px] text-muted-foreground">Top Fitness</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="18" height="8">
              <line x1="0" y1="4" x2="18" y2="4" stroke="hsl(38 100% 55%)" strokeWidth="2" strokeDasharray="5 3" />
            </svg>
            <span className="text-[10px] text-muted-foreground">Avg Fitness</span>
          </div>
        </div>
        <p className="text-[9px] font-mono text-muted-foreground text-center leading-tight">
          Fitness = 0.40×Sharpe* + 0.30×Return* + 0.20×WinRate* + 0.10×(1−DD*)&nbsp;&nbsp;·&nbsp;&nbsp;scaled 0–100
        </p>
      </div>
    </motion.div>
  );
}
