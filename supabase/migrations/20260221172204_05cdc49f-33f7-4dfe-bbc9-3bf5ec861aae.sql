
-- Agents table: stores all agent genomes across generations
CREATE TABLE public.agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  generation INTEGER NOT NULL DEFAULT 0,
  fitness NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'extinct', 'breeding', 'newborn')),
  archetype TEXT NOT NULL CHECK (archetype IN ('momentum', 'defensive', 'volatility', 'mean-reversion', 'hybrid')),
  sharpe NUMERIC NOT NULL DEFAULT 0,
  max_drawdown NUMERIC NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  total_return NUMERIC NOT NULL DEFAULT 0,
  trades INTEGER NOT NULL DEFAULT 0,
  parent_ids TEXT[],
  genome_entry_logic NUMERIC NOT NULL DEFAULT 0.5,
  genome_exit_discipline NUMERIC NOT NULL DEFAULT 0.5,
  genome_risk_tolerance NUMERIC NOT NULL DEFAULT 0.5,
  genome_position_sizing NUMERIC NOT NULL DEFAULT 0.5,
  genome_indicator_weight NUMERIC NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generations history table
CREATE TABLE public.generations (
  id SERIAL PRIMARY KEY,
  gen INTEGER NOT NULL UNIQUE,
  avg_fitness NUMERIC NOT NULL DEFAULT 0,
  top_fitness NUMERIC NOT NULL DEFAULT 0,
  population INTEGER NOT NULL DEFAULT 0,
  diversity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Post-mortems table
CREATE TABLE public.post_mortems (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES public.agents(id),
  agent_name TEXT NOT NULL,
  generation INTEGER NOT NULL,
  cause TEXT NOT NULL,
  inherited_by TEXT[] NOT NULL DEFAULT '{}',
  fitness_at_death NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Behavioral genome (single row, updated over time)
CREATE TABLE public.behavioral_genome (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  risk_tolerance NUMERIC NOT NULL DEFAULT 0.62,
  drawdown_sensitivity NUMERIC NOT NULL DEFAULT 0.78,
  earnings_avoidance NUMERIC NOT NULL DEFAULT 0.45,
  momentum_bias NUMERIC NOT NULL DEFAULT 0.33,
  holding_patience NUMERIC NOT NULL DEFAULT 0.71,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Environment state (single row)
CREATE TABLE public.environment_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  regime TEXT NOT NULL DEFAULT 'trending' CHECK (regime IN ('trending', 'choppy', 'risk-off', 'risk-on')),
  volatility TEXT NOT NULL DEFAULT 'medium' CHECK (volatility IN ('low', 'medium', 'high')),
  earnings_active BOOLEAN NOT NULL DEFAULT false,
  macro_event BOOLEAN NOT NULL DEFAULT false,
  sentiment NUMERIC NOT NULL DEFAULT 0.34,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_mortems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioral_genome ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environment_state ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (this is a shared demo, no auth)
CREATE POLICY "Public read agents" ON public.agents FOR SELECT USING (true);
CREATE POLICY "Public insert agents" ON public.agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update agents" ON public.agents FOR UPDATE USING (true);

CREATE POLICY "Public read generations" ON public.generations FOR SELECT USING (true);
CREATE POLICY "Public insert generations" ON public.generations FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read post_mortems" ON public.post_mortems FOR SELECT USING (true);
CREATE POLICY "Public insert post_mortems" ON public.post_mortems FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read behavioral_genome" ON public.behavioral_genome FOR SELECT USING (true);
CREATE POLICY "Public update behavioral_genome" ON public.behavioral_genome FOR UPDATE USING (true);
CREATE POLICY "Public insert behavioral_genome" ON public.behavioral_genome FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read environment_state" ON public.environment_state FOR SELECT USING (true);
CREATE POLICY "Public update environment_state" ON public.environment_state FOR UPDATE USING (true);
CREATE POLICY "Public insert environment_state" ON public.environment_state FOR INSERT WITH CHECK (true);

-- Seed initial behavioral genome and environment
INSERT INTO public.behavioral_genome (id, risk_tolerance, drawdown_sensitivity, earnings_avoidance, momentum_bias, holding_patience)
VALUES (1, 0.62, 0.78, 0.45, 0.33, 0.71);

INSERT INTO public.environment_state (id, regime, volatility, earnings_active, macro_event, sentiment)
VALUES (1, 'trending', 'medium', false, false, 0.34);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_behavioral_genome_updated_at BEFORE UPDATE ON public.behavioral_genome FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_environment_state_updated_at BEFORE UPDATE ON public.environment_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
