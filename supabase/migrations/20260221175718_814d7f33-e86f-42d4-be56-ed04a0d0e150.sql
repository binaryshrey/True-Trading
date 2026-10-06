
-- Portfolio tracking table
CREATE TABLE public.portfolio (
  id SERIAL PRIMARY KEY,
  generation INTEGER NOT NULL DEFAULT 0,
  capital NUMERIC NOT NULL DEFAULT 100000,
  pnl NUMERIC NOT NULL DEFAULT 0,
  pnl_percent NUMERIC NOT NULL DEFAULT 0,
  top_agent_id TEXT,
  top_agent_name TEXT,
  avg_fitness_before NUMERIC DEFAULT 0,
  avg_fitness_after NUMERIC DEFAULT 0,
  diversity_before NUMERIC DEFAULT 0,
  diversity_after NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read portfolio" ON public.portfolio FOR SELECT USING (true);
CREATE POLICY "Public insert portfolio" ON public.portfolio FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update portfolio" ON public.portfolio FOR UPDATE USING (true);

-- Seed initial portfolio state
INSERT INTO public.portfolio (generation, capital, pnl, pnl_percent) VALUES (0, 100000, 0, 0);
