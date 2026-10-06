
-- Trade history log: records every simulated trade per agent per generation
CREATE TABLE public.trade_history (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  generation INTEGER NOT NULL,
  action TEXT NOT NULL DEFAULT 'buy', -- buy, sell, hold
  asset TEXT NOT NULL DEFAULT 'BTC',
  entry_price NUMERIC NOT NULL DEFAULT 0,
  exit_price NUMERIC,
  quantity NUMERIC NOT NULL DEFAULT 1,
  pnl NUMERIC DEFAULT 0,
  pnl_percent NUMERIC DEFAULT 0,
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read trade_history" ON public.trade_history FOR SELECT USING (true);
CREATE POLICY "Public insert trade_history" ON public.trade_history FOR INSERT WITH CHECK (true);

-- Market snapshots: stores real market data from CoinGecko, etc.
CREATE TABLE public.market_snapshots (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'coingecko', -- coingecko, fred, news
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.market_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read market_snapshots" ON public.market_snapshots FOR SELECT USING (true);
CREATE POLICY "Public insert market_snapshots" ON public.market_snapshots FOR INSERT WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_trade_history_generation ON public.trade_history(generation);
CREATE INDEX idx_trade_history_agent ON public.trade_history(agent_id);
CREATE INDEX idx_market_snapshots_source ON public.market_snapshots(source);
CREATE INDEX idx_market_snapshots_created ON public.market_snapshots(created_at DESC);
