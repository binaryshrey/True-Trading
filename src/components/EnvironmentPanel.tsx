import { EnvironmentState } from "@/data/types";
import { motion } from "framer-motion";
import { Cloud, TrendingUp, AlertTriangle, Zap, BarChart3, Calendar } from "lucide-react";

interface EnvironmentPanelProps {
  environment: EnvironmentState;
  onRegimeChange: (regime: EnvironmentState["regime"]) => void;
}

const regimeConfig = {
  "trending": { icon: TrendingUp, label: "Trending", color: "text-primary" },
  "choppy": { icon: BarChart3, label: "Choppy", color: "text-apex-amber" },
  "risk-off": { icon: AlertTriangle, label: "Risk-Off", color: "text-destructive" },
  "risk-on": { icon: Zap, label: "Risk-On", color: "text-apex-cyan" },
};

export default function EnvironmentPanel({ environment, onRegimeChange }: EnvironmentPanelProps) {
  const regime = regimeConfig[environment.regime];
  const RegimeIcon = regime.icon;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        <Cloud className="h-3.5 w-3.5" />
        Environment
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(regimeConfig) as EnvironmentState["regime"][]).map((r) => {
          const cfg = regimeConfig[r];
          const Icon = cfg.icon;
          const isActive = environment.regime === r;
          return (
            <button
              key={r}
              onClick={() => onRegimeChange(r)}
              className={`
                flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-all
                ${isActive ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"}
              `}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="rounded-md bg-secondary px-2 py-1.5 text-center">
          <div className="text-[10px] text-muted-foreground">Vol</div>
          <div className={`text-xs font-mono font-semibold ${
            environment.volatility === "high" ? "text-destructive" : 
            environment.volatility === "medium" ? "text-apex-amber" : "text-primary"
          }`}>{environment.volatility.toUpperCase()}</div>
        </div>
        <div className="rounded-md bg-secondary px-2 py-1.5 text-center">
          <div className="text-[10px] text-muted-foreground">Earnings</div>
          <div className={`text-xs font-mono font-semibold ${environment.earningsActive ? "text-apex-amber" : "text-muted-foreground"}`}>
            {environment.earningsActive ? "ACTIVE" : "QUIET"}
          </div>
        </div>
        <div className="rounded-md bg-secondary px-2 py-1.5 text-center">
          <div className="text-[10px] text-muted-foreground">Sentiment</div>
          <div className={`text-xs font-mono font-semibold ${
            environment.sentiment > 0.2 ? "text-primary" : 
            environment.sentiment < -0.2 ? "text-destructive" : "text-muted-foreground"
          }`}>{environment.sentiment > 0 ? "+" : ""}{environment.sentiment.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
