import { supabase } from "@/integrations/supabase/client";
import { AgentGenome, EnvironmentState, BehavioralGenome } from "@/data/types";

export interface AiriaEvolutionResult {
  postMortems: {
    agentId: string;
    agentName: string;
    cause: string;
    inheritedBy: string[];
  }[];
  offspring: {
    name: string;
    archetype: string;
    fitness: number;
    parentIds: string[];
    genome: {
      fastMA: number;
      slowMA: number;
      riskAversion: number;
      assetIdx: number;
    };
  }[];
  diversityAlert: boolean;
  chaosArchetype: string | null;
  generationInsight: string;
  source: "airia" | "fallback";
}

export async function callAiriaEvolve(
  topAgents: AgentGenome[],
  bottomAgents: AgentGenome[],
  currentGeneration: number,
  environment: EnvironmentState,
  behavioralGenome: BehavioralGenome
): Promise<AiriaEvolutionResult> {
  const { data, error } = await supabase.functions.invoke("airia-evolve", {
    body: {
      topAgents: topAgents.map((a) => ({
        id: a.id,
        name: a.name,
        generation: a.generation,
        fitness: a.fitness,
        archetype: a.archetype,
        sharpe: a.sharpe,
        maxDrawdown: a.maxDrawdown,
        winRate: a.winRate,
        totalReturn: a.totalReturn,
        genome: a.genome,
      })),
      bottomAgents: bottomAgents.map((a) => ({
        id: a.id,
        name: a.name,
        generation: a.generation,
        fitness: a.fitness,
        archetype: a.archetype,
        sharpe: a.sharpe,
        maxDrawdown: a.maxDrawdown,
        winRate: a.winRate,
        totalReturn: a.totalReturn,
        genome: a.genome,
      })),
      currentGeneration,
      environment,
      behavioralGenome,
    },
  });

  if (error) {
    console.error("Airia edge function error:", error);
    throw error;
  }

  return data as AiriaEvolutionResult;
}
