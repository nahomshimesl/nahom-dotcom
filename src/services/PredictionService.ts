/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { AgentState, SimulationMetrics, PredictionResult, ManagerDNA, Gene } from "../types/simulation";

let aiInstance: GoogleGenAI | null = null;

function getAi() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function getSimulationPrediction(
  agents: AgentState[],
  metrics: SimulationMetrics,
  dna: ManagerDNA
): Promise<PredictionResult> {
  const summary = agents.slice(0, 10).map(a => ({
    name: a.name,
    health: a.health.toFixed(1),
    energy: a.energy.toFixed(1),
    type: a.type
  }));

  try {
    const response = await getAi().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this biological simulation state through the lens of the Golden Ratio (φ ≈ 1.618):
      Metrics: ${JSON.stringify(metrics)}
      Current DNA: ${JSON.stringify(dna)}
      Sample Agents: ${JSON.stringify(summary)}
      
      Predict the stability and provide a research-grade recommendation. 
      The recommendation should be written in a fluid, professional, and insightful scientific style. 
      Focus on "Smooth Intelligence":
      1. How well do behavioral updates and learning rates follow φ proportions?
      2. Are recursive and self-similar structures (fractal patterns) emerging coherently?
      3. Suggest genetic modifications to enhance "Phi-Harmony" and temporal smoothness.
      4. Identify recurring behavioral patterns that should be stored or reused in scaled forms (spirals).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stabilityScore: { type: Type.NUMBER, description: "0-100 score of system stability" },
            collapseProbability: { type: Type.NUMBER, description: "0-1 probability of imminent collapse" },
            recommendation: { type: Type.STRING, description: "Scientific recommendation for intervention" },
            phiHarmony: { type: Type.NUMBER, description: "0-1 alignment with Golden Ratio principles" },
          },
          required: ["stabilityScore", "collapseProbability", "recommendation", "phiHarmony"]
        }
      }
    });

    let result = {};
    try {
      result = JSON.parse(response.text || '{}');
    } catch (e) {
      console.warn("Failed to parse AI response, using fallback.");
      throw new Error("429"); // Trigger local fallback
    }

    return {
      stabilityScore: (result as any).stabilityScore || 50,
      collapseProbability: (result as any).collapseProbability || 0.1,
      recommendation: (result as any).recommendation || "System stable. Continue monitoring.",
      phiHarmony: (result as any).phiHarmony || 0.5,
      timestamp: Date.now()
    };
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    
    if (!isQuotaError) {
      console.error("Prediction error:", error);
    }
    
    // Handle Quota Exceeded (429) or other API failures with a local heuristic fallback
    const stability = Math.max(0, Math.min(100, metrics.averageHealth - (metrics.entropy * 15) - (metrics.signalDensity * 5)));
    const collapseProb = Math.min(1, Math.max(0, (100 - stability) / 100));
    
    let localRec = `[LOCAL HEURISTIC ENGINE] Stability: ${stability.toFixed(1)}%. `;
    if (stability < 40) localRec += "CRITICAL: High risk of system collapse. Increase Metabolic Hubs.";
    else if (stability < 70) localRec += "WARNING: Instability detected. Optimize signaling pathways.";
    else localRec += "OPTIMAL: Ecosystem is self-sustaining.";

    return {
      stabilityScore: stability,
      collapseProbability: collapseProb,
      recommendation: localRec,
      phiHarmony: 0.5, // Default fallback
      timestamp: Date.now()
    };
  }
}

export async function suggestMutation(agent: AgentState): Promise<Partial<AgentState>> {
  try {
    const response = await getAi().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest a biological mutation for this organoid agent: ${JSON.stringify(agent)}. 
      The mutation MUST follow Golden Ratio (φ ≈ 1.618) proportions to ensure "Smooth Intelligence":
      1. Adjust parameters (metabolismRate, decayRate, signalThreshold) by factors of φ or 1/φ.
      2. Modify phiScaling and recursionLevel to maintain fractal coherence.
      3. Ensure the mutation name reflects its evolutionary trajectory.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            parameters: {
              type: Type.OBJECT,
              properties: {
                metabolismRate: { type: Type.NUMBER },
                decayRate: { type: Type.NUMBER },
                signalThreshold: { type: Type.NUMBER },
                phiScaling: { type: Type.NUMBER }
              }
            },
            recursionLevel: { type: Type.NUMBER },
            name: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    if (!isQuotaError) {
      console.error("Mutation error:", error);
    }
    
    const PHI = 1.61803398875;
    return {
      parameters: {
        ...agent.parameters,
        metabolismRate: agent.parameters.metabolismRate * (Math.random() > 0.5 ? PHI : 1/PHI),
        decayRate: agent.parameters.decayRate * (Math.random() > 0.5 ? PHI : 1/PHI),
        signalThreshold: agent.parameters.signalThreshold * (Math.random() > 0.5 ? PHI : 1/PHI),
        phiScaling: Math.pow(PHI, -agent.recursionLevel)
      },
      name: `${agent.name}-Phi-Mutated`
    };
  }
}
