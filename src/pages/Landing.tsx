import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Brain, TrendingUp, Shield, Activity, BarChart3, Dna, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import OnboardingModal from "@/components/OnboardingModal";
import dashboardPreview from "@/assets/dashboard-preview.png";

const logos = [
  { name: "Alpaca", icon: TrendingUp },
  { name: "Airia", icon: Brain },
  { name: "Supabase", icon: Shield },
  { name: "React", icon: Zap },
  { name: "Recharts", icon: BarChart3 },
  { name: "Framer", icon: Activity },
];

const features = [
  {
    icon: Dna,
    title: "Genetic Evolution Engine",
    description:
      "Agents evolve across generations through crossover, mutation, and natural selection — adapting to market conditions autonomously.",
  },
  {
    icon: Brain,
    title: "AI-Powered Decisions",
    description:
      "Each agent carries a behavioral genome governing risk tolerance, entry logic, exit discipline, and position sizing — refined by Airia AI.",
  },
  {
    icon: TrendingUp,
    title: "Live Paper Trading",
    description:
      "Connect to Alpaca for real-time paper trading execution. Agents submit orders, track P&L, and learn from outcomes.",
  },
  {
    icon: Target,
    title: "Fitness & Leaderboard",
    description:
      "Agents are ranked by Sharpe ratio, win rate, drawdown, and total return. Only the fittest survive to breed the next generation.",
  },
  {
    icon: Activity,
    title: "Real-Time Market Context",
    description:
      "Live market data, FRED macro indicators, VIX regime detection, and sentiment analysis feed into every evolutionary cycle.",
  },
  {
    icon: Shield,
    title: "Risk-Aware Architecture",
    description:
      "Built-in drawdown limits, position sizing constraints, and environment-aware regime switching protect capital at every layer.",
  },
];

export default function Landing() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <OnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">
              FalseMarkets
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
              Github
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">Login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/dashboard">Sign Up</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32">
        {/* Subtle grid background */}
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-1.5 text-xs font-mono text-muted-foreground"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse-green" />
            Evolutionary Trading Agents
            <ArrowRight className="h-3 w-3" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.05]"
          >
            Evolve Your Agents,{" "}
            <br className="hidden sm:block" />
            Adapt Your Strategy,{" "}
            <br className="hidden sm:block" />
            <span className="text-primary text-glow-green">Dominate the Market.</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-muted-foreground"
          >
            <span className="text-foreground font-medium">Autonomous AI trading agents</span> that
            genetically evolve across generations, learn from market regimes, and execute paper
            trades — turning chaos into{" "}
            <span className="text-foreground font-medium underline decoration-primary/50 underline-offset-4">
              predictable alpha
            </span>
            .
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex items-center justify-center gap-4"
          >
            <Button size="lg" onClick={() => setShowOnboarding(true)} className="font-semibold">
              Get Started
            </Button>
            <Button variant="ghost" size="lg" asChild className="text-muted-foreground">
              <a href="#features">
                Learn More <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </motion.div>

          {/* Hero Image — dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.7 }}
            className="relative mx-auto mt-16 max-w-4xl"
          >
            <div className="rounded-xl border border-border bg-card/80 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-apex-amber/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                <span className="ml-3 text-[10px] font-mono text-muted-foreground">apex-evolution — dashboard</span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground/60">/dashboard</span>
              </div>
              <div className="relative w-full" style={{ height: "500px" }}>
                <iframe
                  src="/dashboard"
                  title="FalseMarkets Dashboard"
                  className="w-full h-full border-0"
                  style={{ transform: "scale(0.55)", transformOrigin: "top left", width: "182%", height: "182%" }}
                />
              </div>
            </div>
            {/* Glow */}
            <div className="absolute -inset-4 -z-10 rounded-2xl bg-primary/5 blur-3xl" />
          </motion.div>
        </div>
      </section>

      {/* ── Logo Marquee ── */}
      <section className="border-y border-border/40 py-10 bg-secondary/20">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6">
            Built with cutting-edge AI and market infrastructure
          </p>
          <div className="flex items-center justify-center gap-10 md:gap-16 flex-wrap">
            {logos.map((l) => (
              <div key={l.name} className="flex items-center gap-2 text-muted-foreground/60">
                <l.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{l.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              Meet your digital traders
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Our AI agents don't just trade — they evolve. With genetic algorithms, real-time
              market awareness, and autonomous decision-making, they're redefining algorithmic
              trading.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group rounded-xl border border-border bg-card/60 p-6 transition-colors hover:border-primary/30 hover:bg-card"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-24 md:py-32 border-t border-border/40 bg-secondary/10">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">How it works</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground mb-16">
            A closed-loop system: seed → evolve → trade → evaluate → repeat.
          </p>

          <div className="grid gap-8 md:grid-cols-4 text-left">
            {[
              { step: "01", title: "Seed Population", desc: "Generate a diverse initial population of trading agents with randomised genomes." },
              { step: "02", title: "Evolve & Mutate", desc: "AI evaluates fitness, breeds top performers, and mutates offspring for exploration." },
              { step: "03", title: "Paper Trade", desc: "Agents execute trades against live market data via Alpaca, building real track records." },
              { step: "04", title: "Survive or Die", desc: "Unfit agents are culled. The strongest genomes carry forward into the next generation." },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="text-4xl font-black font-mono text-primary/20">{s.step}</span>
                <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight">
            Ready to evolve?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Launch your first generation of AI trading agents in minutes.
          </p>
          <Button size="lg" onClick={() => setShowOnboarding(true)} className="mt-8 font-semibold">
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">FalseMarkets</span>
          </div>
          <p>© {new Date().getFullYear()} FalseMarkets. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
