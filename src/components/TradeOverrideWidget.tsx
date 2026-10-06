import { useState } from "react";
import { motion } from "framer-motion";
import { BehavioralGenome } from "@/data/types";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sliders, Zap, RotateCcw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TradeOverrideWidgetProps {
  genome: BehavioralGenome;
  onUpdate: (genome: BehavioralGenome) => void;
  onClose?: () => void;
}

const paramConfig: { key: keyof BehavioralGenome; label: string; description: string }[] = [
  { key: "riskTolerance", label: "Risk Tolerance", description: "How much risk agents should accept" },
  { key: "drawdownSensitivity", label: "Drawdown Sensitivity", description: "Reaction to portfolio losses" },
  { key: "earningsAvoidance", label: "Earnings Avoidance", description: "Tendency to avoid earnings events" },
  { key: "momentumBias", label: "Momentum Bias", description: "Preference for trend-following" },
  { key: "holdingPatience", label: "Holding Patience", description: "Willingness to hold positions longer" },
];

export default function TradeOverrideWidget({ genome, onUpdate, onClose }: TradeOverrideWidgetProps) {
  const [localGenome, setLocalGenome] = useState<BehavioralGenome>(genome);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasChanges = Object.keys(genome).some(
    (k) => localGenome[k as keyof BehavioralGenome] !== genome[k as keyof BehavioralGenome]
  );

  const handleSliderChange = (key: keyof BehavioralGenome, value: number[]) => {
    setLocalGenome((prev) => ({ ...prev, [key]: value[0] / 100 }));
  };

  const handleReset = () => setLocalGenome(genome);

  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      const changedParams = Object.entries(localGenome)
        .filter(([k, v]) => v !== genome[k as keyof BehavioralGenome])
        .map(([k, v]) => `${k}: ${(genome[k as keyof BehavioralGenome] * 100).toFixed(0)}% → ${(v * 100).toFixed(0)}%`)
        .join(", ");

      const { data, error } = await supabase.functions.invoke("update-behavior", {
        body: { overrideAction: `User manually adjusted behavioral genome: ${changedParams}` },
      });
      if (error) throw error;

      if (data) {
        const updated: BehavioralGenome = {
          riskTolerance: Number(data.risk_tolerance),
          drawdownSensitivity: Number(data.drawdown_sensitivity),
          earningsAvoidance: Number(data.earnings_avoidance),
          momentumBias: Number(data.momentum_bias),
          holdingPatience: Number(data.holding_patience),
        };
        onUpdate(updated);
        if (data.insight) {
          toast({ title: "Agents Adapting", description: data.insight });
        }
      }
    } catch (err) {
      console.error("Override failed:", err);
      toast({ title: "Override Failed", description: "Could not update behavioral genome.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Sliders className="h-3.5 w-3.5" />
          Trade Override Config
        </h3>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[320px] pr-3">
        <div className="space-y-5 pb-2">
          {paramConfig.map(({ key, label, description }) => {
            const current = Math.round(localGenome[key] * 100);
            const original = Math.round(genome[key] * 100);
            const changed = current !== original;

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-medium ${changed ? "text-accent" : "text-foreground"}`}>
                      {label}
                    </span>
                    <p className="text-[9px] text-muted-foreground">{description}</p>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono text-xs font-semibold ${changed ? "text-accent" : "text-foreground"}`}>
                      {current}%
                    </span>
                    {changed && (
                      <span className="block font-mono text-[9px] text-muted-foreground line-through">
                        {original}%
                      </span>
                    )}
                  </div>
                </div>
                <Slider
                  value={[current]}
                  onValueChange={(v) => handleSliderChange(key, v)}
                  max={100}
                  min={0}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleApply}
        disabled={!hasChanges || isSubmitting}
        className="w-full rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-xs font-mono font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Zap className="h-3.5 w-3.5" />
        {isSubmitting ? "Adapting Agents..." : "Apply Override & Adapt Agents"}
      </motion.button>
    </div>
  );
}
