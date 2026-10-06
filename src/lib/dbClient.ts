import { supabase } from "@/integrations/supabase/client";
import { AgentGenome, PostMortem, EnvironmentState, BehavioralGenome, TradeRecord, MarketSnapshot } from "@/data/types";

// ─── Agent CRUD ───

export async function fetchAgents(): Promise<AgentGenome[]> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("id");
  if (error) throw error;
  return (data || []).map(dbToAgent);
}

export async function upsertAgents(agents: AgentGenome[]): Promise<void> {
  const rows = agents.map(agentToDb);
  const { error } = await supabase.from("agents").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

export async function insertAgents(agents: AgentGenome[]): Promise<void> {
  const rows = agents.map(agentToDb);
  const { error } = await supabase.from("agents").insert(rows);
  if (error) throw error;
}

export async function updateAgentStatus(id: string, status: AgentGenome["status"]): Promise<void> {
  const { error } = await supabase.from("agents").update({ status }).eq("id", id);
  if (error) throw error;
}

// ─── Generations ───

export async function fetchGenerations() {
  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .order("gen");
  if (error) throw error;
  return (data || []).map((g: any) => ({
    gen: g.gen,
    avgFitness: Number(g.avg_fitness),
    topFitness: Number(g.top_fitness),
    population: g.population,
    diversity: Number(g.diversity),
  }));
}

export async function insertGeneration(gen: { gen: number; avgFitness: number; topFitness: number; population: number; diversity: number }) {
  const { error } = await supabase.from("generations").upsert({
    gen: gen.gen,
    avg_fitness: gen.avgFitness,
    top_fitness: gen.topFitness,
    population: gen.population,
    diversity: gen.diversity,
  }, { onConflict: "gen" });
  if (error) throw error;
}

// ─── Post-Mortems ───

export async function fetchPostMortems(): Promise<PostMortem[]> {
  const { data, error } = await supabase
    .from("post_mortems")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data || []).map((pm: any) => ({
    id: pm.id,
    agentId: pm.agent_id,
    agentName: pm.agent_name,
    generation: pm.generation,
    cause: pm.cause,
    inheritedBy: pm.inherited_by || [],
    timestamp: new Date(pm.created_at),
    fitnessAtDeath: Number(pm.fitness_at_death),
  }));
}

export async function insertPostMortems(pms: PostMortem[]): Promise<void> {
  const rows = pms.map((pm) => ({
    id: pm.id,
    agent_id: pm.agentId,
    agent_name: pm.agentName,
    generation: pm.generation,
    cause: pm.cause,
    inherited_by: pm.inheritedBy,
    fitness_at_death: pm.fitnessAtDeath,
  }));
  const { error } = await supabase.from("post_mortems").insert(rows);
  if (error) throw error;
}

// ─── Environment ───

export async function fetchEnvironment(): Promise<EnvironmentState> {
  const defaults = { id: 1, regime: "trending", volatility: "medium", earnings_active: false, macro_event: false, sentiment: 0.34 };
  const { data } = await supabase.from("environment_state").select("*").eq("id", 1).maybeSingle();
  if (!data) {
    await supabase.from("environment_state").upsert(defaults, { onConflict: "id" });
  }
  const row = data || defaults;
  return {
    regime: row.regime as EnvironmentState["regime"],
    volatility: row.volatility as EnvironmentState["volatility"],
    earningsActive: row.earnings_active,
    macroEvent: row.macro_event,
    sentiment: Number(row.sentiment),
  };
}

export async function updateEnvironment(env: Partial<EnvironmentState>): Promise<void> {
  const row: any = {};
  if (env.regime !== undefined) row.regime = env.regime;
  if (env.volatility !== undefined) row.volatility = env.volatility;
  if (env.earningsActive !== undefined) row.earnings_active = env.earningsActive;
  if (env.macroEvent !== undefined) row.macro_event = env.macroEvent;
  if (env.sentiment !== undefined) row.sentiment = env.sentiment;
  const { error } = await supabase.from("environment_state").update(row).eq("id", 1);
  if (error) throw error;
}

// ─── Behavioral Genome ───

export async function fetchBehavioralGenome(): Promise<BehavioralGenome> {
  const defaults = { id: 1, risk_tolerance: 0.62, drawdown_sensitivity: 0.78, earnings_avoidance: 0.45, momentum_bias: 0.33, holding_patience: 0.71 };
  const { data } = await supabase.from("behavioral_genome").select("*").eq("id", 1).maybeSingle();
  if (!data) {
    await supabase.from("behavioral_genome").upsert(defaults, { onConflict: "id" });
  }
  const row = data || defaults;
  return {
    riskTolerance: Number(row.risk_tolerance),
    drawdownSensitivity: Number(row.drawdown_sensitivity),
    earningsAvoidance: Number(row.earnings_avoidance),
    momentumBias: Number(row.momentum_bias),
    holdingPatience: Number(row.holding_patience),
  };
}

// ─── Portfolio ───

export interface PortfolioRow {
  capital: number;
  pnl: number;
  pnlPercent: number;
  generation: number;
}

export async function fetchPortfolio(): Promise<PortfolioRow> {
  const { data } = await supabase.from("portfolio").select("*").order("id", { ascending: false }).limit(1).maybeSingle();
  if (!data) {
    await supabase.from("portfolio").insert({ generation: 0, capital: 100000, pnl: 0, pnl_percent: 0 });
    return { capital: 100000, pnl: 0, pnlPercent: 0, generation: 0 };
  }
  return {
    capital: Number(data.capital),
    pnl: Number(data.pnl),
    pnlPercent: Number(data.pnl_percent),
    generation: data.generation,
  };
}

export async function insertPortfolioSnapshot(snapshot: {
  generation: number;
  capital: number;
  pnl: number;
  pnlPercent: number;
  topAgentId?: string;
  topAgentName?: string;
  avgFitnessBefore: number;
  avgFitnessAfter: number;
}): Promise<void> {
  const { error } = await supabase.from("portfolio").insert({
    generation: snapshot.generation,
    capital: snapshot.capital,
    pnl: snapshot.pnl,
    pnl_percent: snapshot.pnlPercent,
    top_agent_id: snapshot.topAgentId || null,
    top_agent_name: snapshot.topAgentName || null,
    avg_fitness_before: snapshot.avgFitnessBefore,
    avg_fitness_after: snapshot.avgFitnessAfter,
  });
  if (error) throw error;
}

// ─── Trade History ───

export async function fetchTradeHistory(limit = 500): Promise<TradeRecord[]> {
  const { data, error } = await supabase
    .from("trade_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((t: any) => ({
    id: t.id,
    agentId: t.agent_id,
    agentName: t.agent_name,
    generation: t.generation,
    action: t.action,
    asset: t.asset,
    entryPrice: Number(t.entry_price),
    exitPrice: t.exit_price ? Number(t.exit_price) : null,
    quantity: Number(t.quantity),
    pnl: Number(t.pnl),
    pnlPercent: Number(t.pnl_percent),
    rationale: t.rationale,
    createdAt: t.created_at,
  }));
}

export async function insertTrades(trades: Omit<TradeRecord, "id" | "createdAt">[]): Promise<void> {
  const rows = trades.map((t) => ({
    agent_id: t.agentId,
    agent_name: t.agentName,
    generation: t.generation,
    action: t.action,
    asset: t.asset,
    entry_price: t.entryPrice,
    exit_price: t.exitPrice,
    quantity: t.quantity,
    pnl: t.pnl,
    pnl_percent: t.pnlPercent,
    rationale: t.rationale,
  }));
  const { error } = await supabase.from("trade_history").insert(rows);
  if (error) throw error;
}

// ─── Hard reset ────────────────────────────────────────────────────────────
/**
 * Wipes all evolving-population data so the user can start fresh from gen 0.
 * Preserves behavioral_genome and environment_state (user preferences).
 * Portfolio is reset to $100k / gen 0.
 */
export async function resetAllData(): Promise<void> {
  await Promise.all([
    // Delete all agents (string PKs → filter on not-null id)
    supabase.from("agents").delete().not("id", "is", null),
    // Delete all generations
    supabase.from("generations").delete().gte("gen", 0),
    // Delete all post-mortems (string PKs)
    supabase.from("post_mortems").delete().not("id", "is", null),
    // Delete all trades
    supabase.from("trade_history").delete().gte("id", 0),
    // Delete ALL portfolio rows (not just the singleton) so the DESC id fetch
    // doesn't pick up a stale generation snapshot from a previous session.
    supabase.from("portfolio").delete().gte("id", 0),
  ]);
  // Insert a single fresh $100k row so fetchPortfolio() finds it immediately.
  await supabase.from("portfolio").insert({ generation: 0, capital: 100000, pnl: 0, pnl_percent: 0 });
}

// ─── Market Snapshots ───

export async function fetchLatestMarketSnapshot(): Promise<MarketSnapshot | null> {
  const { data, error } = await supabase
    .from("market_snapshots")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    source: data.source,
    data: data.data as any,
    createdAt: data.created_at,
  };
}

// ─── Helpers ───

function dbToAgent(row: any): AgentGenome {
  return {
    id: row.id,
    name: row.name,
    generation: row.generation,
    fitness: Number(row.fitness),
    status: row.status,
    archetype: row.archetype,
    sharpe: Number(row.sharpe),
    maxDrawdown: Number(row.max_drawdown),
    winRate: Number(row.win_rate),
    totalReturn: Number(row.total_return),
    trades: row.trades,
    parentIds: row.parent_ids || undefined,
    // genome_entry_logic  → fastMA
    // genome_exit_discipline → slowMA
    // genome_risk_tolerance  → riskAversion
    // genome_position_sizing → assetIdx
    genome: {
      fastMA:       Number(row.genome_entry_logic),
      slowMA:       Number(row.genome_exit_discipline),
      riskAversion: Number(row.genome_risk_tolerance),
      assetIdx:     Number(row.genome_position_sizing),
    },
  };
}

function agentToDb(a: AgentGenome) {
  return {
    id: a.id,
    name: a.name,
    generation: a.generation,
    fitness: a.fitness,
    status: a.status,
    archetype: a.archetype,
    sharpe: a.sharpe,
    max_drawdown: a.maxDrawdown,
    win_rate: a.winRate,
    total_return: a.totalReturn,
    trades: a.trades,
    parent_ids: a.parentIds || null,
    genome_entry_logic:      a.genome.fastMA,
    genome_exit_discipline:  a.genome.slowMA,
    genome_risk_tolerance:   a.genome.riskAversion,
    genome_position_sizing:  a.genome.assetIdx,
    genome_indicator_weight: 0.5,  // unused – kept for schema compat
  };
}
