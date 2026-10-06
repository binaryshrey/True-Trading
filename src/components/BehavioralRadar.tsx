import { useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { BehavioralGenome } from "@/data/types";
import { motion, AnimatePresence } from "framer-motion";
import { Sliders } from "lucide-react";
import TradeOverrideWidget from "@/components/TradeOverrideWidget";

interface BehavioralRadarProps {
  genome: BehavioralGenome;
  onUpdate?: (genome: BehavioralGenome) => void;
}

const labels: Record<keyof BehavioralGenome, string> = {
  riskTolerance: "Risk Tolerance",
  drawdownSensitivity: "DD Sensitivity",
  earningsAvoidance: "Earnings Avoid",
  momentumBias: "Momentum Bias",
  holdingPatience: "Holding Patience",
};

export default function BehavioralRadar({ genome, onUpdate }: BehavioralRadarProps) {
  const [showOverride, setShowOverride] = useState(false);

  const data = Object.entries(genome).map(([key, value]) => ({
    subject: labels[key as keyof BehavioralGenome],
    value: Math.round(value * 100),
    fullMark: 100,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Behavioral DNA
        </h3>
        {onUpdate && (
          <button
            onClick={() => setShowOverride(true)}
            className="flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-mono font-medium text-accent transition-colors hover:bg-accent/20"
          >
            <Sliders className="h-3 w-3" />
            Configure
          </button>
        )}
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="hsl(220 16% 14%)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "hsl(215 12% 50%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Behavioral"
              dataKey="value"
              stroke="hsl(195 100% 50%)"
              fill="hsl(195 100% 50%)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(genome).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {labels[key as keyof BehavioralGenome]}
            </span>
            <span className="font-mono text-xs text-accent">{(value * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      {/* Override Modal */}
      <AnimatePresence>
        {showOverride && onUpdate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowOverride(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md"
            >
              <TradeOverrideWidget
                genome={genome}
                onUpdate={(updated) => {
                  onUpdate(updated);
                  setShowOverride(false);
                }}
                onClose={() => setShowOverride(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
