import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AgentGenome {
  id: string;
  name: string;
  generation: number;
  fitness: number;
  archetype: string;
  sharpe: number;
  maxDrawdown: number;
  winRate: number;
  totalReturn: number;
  genome: {
    entryLogic: number;
    exitDiscipline: number;
    riskTolerance: number;
    positionSizing: number;
    indicatorWeight: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AIRIA_API_KEY = Deno.env.get("AIRIA_API_KEY");
    if (!AIRIA_API_KEY) {
      throw new Error("AIRIA_API_KEY is not configured");
    }

    const { topAgents, bottomAgents, currentGeneration, environment, behavioralGenome } = await req.json();

    // Build the prompt for Airia to act as the Evolutionary Orchestrator
    const prompt = `You are FalseMarkets — the Autonomous Population of Evolving eXperts orchestrator. You govern a Darwinian trading agent swarm.

CURRENT ENVIRONMENT:
- Market Regime: ${environment.regime}
- Volatility: ${environment.volatility}
- Earnings Active: ${environment.earningsActive}
- Macro Event: ${environment.macroEvent}
- Sentiment Score: ${environment.sentiment}

USER BEHAVIORAL GENOME:
- Risk Tolerance: ${behavioralGenome.riskTolerance}
- Drawdown Sensitivity: ${behavioralGenome.drawdownSensitivity}
- Earnings Avoidance: ${behavioralGenome.earningsAvoidance}
- Momentum Bias: ${behavioralGenome.momentumBias}
- Holding Patience: ${behavioralGenome.holdingPatience}

TOP PERFORMING AGENTS (survivors for breeding):
${JSON.stringify(topAgents, null, 2)}

BOTTOM PERFORMING AGENTS (to be culled):
${JSON.stringify(bottomAgents, null, 2)}

TASKS:
1. For each culled agent, write a detailed post-mortem explaining WHY it failed. Reference specific genome weaknesses, market conditions, and behavioral misalignment. Be specific and technical.
2. For each breeding pair from the top agents, generate a child genome that intelligently combines parent strengths. Apply mutation (±5% random variance). Consider the current environment and user behavioral preferences when deciding trait weights.
3. Assess population diversity. If agents are converging (similar genomes), flag it and suggest a chaos injection archetype.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "postMortems": [
    {
      "agentId": "string",
      "agentName": "string", 
      "cause": "string (2-3 sentences explaining death)",
      "inheritedBy": ["array of top agent IDs that inherit traits"]
    }
  ],
  "offspring": [
    {
      "name": "string (creative strategy name)",
      "archetype": "momentum|defensive|volatility|mean-reversion|hybrid",
      "fitness": number (estimated starting fitness 40-80),
      "parentIds": ["parent1Id", "parent2Id"],
      "genome": {
        "entryLogic": number (0-1),
        "exitDiscipline": number (0-1),
        "riskTolerance": number (0-1),
        "positionSizing": number (0-1),
        "indicatorWeight": number (0-1)
      }
    }
  ],
  "diversityAlert": boolean,
  "chaosArchetype": "string or null (suggested new archetype if diversity is low)",
  "generationInsight": "string (1-2 sentence summary of this generation's evolution)"
}`;

    // Call Airia Evolutionary Orchestrator Agent
    const airiaResponse = await fetch("https://api.airia.ai/v2/PipelineExecution/e8aeffdc-e336-4843-8337-aa2b7581f0a0", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AIRIA_API_KEY,
      },
      body: JSON.stringify({
        UserInput: prompt,
      }),
    });

    if (!airiaResponse.ok) {
      const errorText = await airiaResponse.text();
      console.error("Airia API error:", airiaResponse.status, errorText);
      
      // Fallback: generate locally if Airia is unavailable
      console.log("Falling back to local generation...");
      const fallbackResult = generateFallback(topAgents, bottomAgents, currentGeneration, environment);
      return new Response(JSON.stringify(fallbackResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const airiaData = await airiaResponse.json();
    console.log("Airia raw response keys:", Object.keys(airiaData));
    
    // Extract the response content - Airia v2 returns { result: "..." }
    let resultText = "";
    if (airiaData.result && typeof airiaData.result === "string") {
      resultText = airiaData.result;
    } else if (typeof airiaData === "string") {
      resultText = airiaData;
    } else if (airiaData.content) {
      resultText = typeof airiaData.content === "string" ? airiaData.content : JSON.stringify(airiaData.content);
    } else if (airiaData.message) {
      resultText = typeof airiaData.message === "string" ? airiaData.message : JSON.stringify(airiaData.message);
    } else if (airiaData.response) {
      resultText = typeof airiaData.response === "string" ? airiaData.response : JSON.stringify(airiaData.response);
    } else {
      resultText = JSON.stringify(airiaData);
    }

    console.log("Airia resultText length:", resultText.length);
    console.log("Airia resultText preview:", resultText.substring(0, 300));

    // Try to parse JSON from the response
    let parsed;
    try {
      // Extract JSON from possible markdown code blocks
      const jsonMatch = resultText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]!.trim());
      } else {
        // Try to find a JSON object in the text
        const jsonObjMatch = resultText.match(/\{[\s\S]*"postMortems"[\s\S]*\}/);
        if (jsonObjMatch) {
          parsed = JSON.parse(jsonObjMatch[0]);
        } else {
          // Try direct parse
          parsed = JSON.parse(resultText);
        }
      }
    } catch (parseErr) {
      console.error("Failed to parse Airia response as JSON:", parseErr);
      console.log("Full resultText:", resultText.substring(0, 1000));
      const fallbackResult = generateFallback(topAgents, bottomAgents, currentGeneration, environment);
      return new Response(JSON.stringify(fallbackResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ...parsed, source: "airia" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Fallback generation when Airia is unavailable
function generateFallback(
  topAgents: AgentGenome[],
  bottomAgents: AgentGenome[],
  currentGeneration: number,
  environment: any
) {
  const strategies = [
    "Momentum Alpha", "Mean Reversion", "Breakout Hunter", "Volatility Arbitrage",
    "Trend Follower", "Scalp Master", "Swing Trader", "Gap Fill", "RSI Divergence",
    "MACD Crossover",
  ];
  const archetypes = ["momentum", "defensive", "volatility", "mean-reversion", "hybrid"];

  const postMortems = bottomAgents.map((agent: AgentGenome) => ({
    agentId: agent.id,
    agentName: agent.name,
    cause: `Eliminated in generation ${currentGeneration + 1}. Fitness ${agent.fitness.toFixed(1)} below threshold. ${
      agent.sharpe < 0.5 ? "Weak risk-adjusted returns." : ""
    } ${agent.maxDrawdown > 15 ? `Excessive drawdown ${agent.maxDrawdown}%.` : ""} ${
      agent.winRate < 45 ? "Sub-par win rate." : ""
    } Genome traits propagated to offspring.`,
    inheritedBy: topAgents.slice(0, 2).map((t: AgentGenome) => t.id),
  }));

  const offspring = bottomAgents.map((_: AgentGenome, i: number) => {
    const p1 = topAgents[i % topAgents.length];
    const p2 = topAgents[(i + 1) % topAgents.length];
    return {
      name: strategies[Math.floor(Math.random() * strategies.length)],
      archetype: archetypes[Math.floor(Math.random() * archetypes.length)],
      fitness: Math.round(((p1.fitness + p2.fitness) / 2 + (Math.random() * 10 - 3)) * 10) / 10,
      parentIds: [p1.id, p2.id],
      genome: {
        entryLogic: Math.round(((p1.genome.entryLogic + p2.genome.entryLogic) / 2 + (Math.random() * 0.1 - 0.05)) * 100) / 100,
        exitDiscipline: Math.round(((p1.genome.exitDiscipline + p2.genome.exitDiscipline) / 2 + (Math.random() * 0.1 - 0.05)) * 100) / 100,
        riskTolerance: Math.round(((p1.genome.riskTolerance + p2.genome.riskTolerance) / 2 + (Math.random() * 0.1 - 0.05)) * 100) / 100,
        positionSizing: Math.round(((p1.genome.positionSizing + p2.genome.positionSizing) / 2 + (Math.random() * 0.1 - 0.05)) * 100) / 100,
        indicatorWeight: Math.round(((p1.genome.indicatorWeight + p2.genome.indicatorWeight) / 2 + (Math.random() * 0.1 - 0.05)) * 100) / 100,
      },
    };
  });

  return {
    postMortems,
    offspring,
    diversityAlert: false,
    chaosArchetype: null,
    generationInsight: `Generation ${currentGeneration + 1}: ${bottomAgents.length} agents culled, ${offspring.length} offspring deployed. Population adapting to ${environment.regime} regime. (Local fallback - Airia unavailable)`,
    source: "fallback",
  };
}
