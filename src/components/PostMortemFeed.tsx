import { PostMortem } from "@/data/types";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, ArrowRight } from "lucide-react";

interface PostMortemFeedProps {
  postMortems: PostMortem[];
}

export default function PostMortemFeed({ postMortems }: PostMortemFeedProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        <Skull className="h-3.5 w-3.5 text-destructive" />
        Post-Mortem Feed
      </h3>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        <AnimatePresence>
          {postMortems.map((pm) => (
            <motion.div
              key={pm.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="rounded-lg border border-destructive/20 bg-card p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-destructive">{pm.agentId}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs font-medium">{pm.agentName}</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  G{pm.generation} · {pm.fitnessAtDeath.toFixed(1)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{pm.cause}</p>
              {pm.inheritedBy.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-primary">
                  <span className="text-muted-foreground">Genes → </span>
                  {pm.inheritedBy.map((id) => (
                    <span key={id} className="font-mono">{id}</span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
