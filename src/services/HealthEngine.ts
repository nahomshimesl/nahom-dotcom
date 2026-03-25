/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { 
  AgentState, 
  SimulationMetrics, 
  ManagerDNA, 
  SystemHealthState, 
  HealthIncident,
  IncidentSeverity,
  IncidentStatus,
  GeneType,
  SystemLog,
  LogType
} from "../types/simulation";
import { ThinkingLevel } from "@google/genai";

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

export class HealthEngine {
  private state: SystemHealthState = {
    overallScore: 100,
    latency: 0,
    errorRate: 0,
    resourceUsage: 0,
    activeIncidents: [],
    history: [],
    systemLogs: []
  };

  private incidentLog: HealthIncident[] = [];
  private systemLogs: SystemLog[] = [];

  constructor() {}

  public async reportExternalError(
    source: string,
    message: string,
    severity: IncidentSeverity = 'MEDIUM',
    details?: any
  ) {
    const log: SystemLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      type: 'ERROR',
      source,
      message,
      details,
      severity
    };

    this.systemLogs.unshift(log);
    if (this.systemLogs.length > 100) this.systemLogs.pop();

    // Trigger AI Diagnosis for Errors
    await this.diagnoseLog(log);
    
    this.state = {
      ...this.state,
      systemLogs: [...this.systemLogs]
    };
  }

  private async diagnoseLog(log: SystemLog) {
    try {
      const response = await getAi().models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `DIAGNOSTIC REQUEST:
        Source: ${log.source}
        Error: ${log.message}
        Details: ${JSON.stringify(log.details)}
        Severity: ${log.severity}
        
        Provide a concise technical diagnosis and a recommended fix.
        Format: "Diagnosis: [Short technical explanation] | Fix: [Actionable step]"`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });

      log.diagnosis = response.text || "Diagnosis unavailable.";
    } catch (error) {
      log.diagnosis = "AI Diagnostic Engine offline.";
    }
  }

  public async analyzeHealth(
    agents: AgentState[],
    metrics: SimulationMetrics,
    dna: ManagerDNA
  ): Promise<SystemHealthState> {
    // 1. Local Heuristic Monitoring
    const errorRate = metrics.failureRate;
    const resourceUsage = metrics.totalAgents / 200; // Normalized
    const latency = metrics.signalDensity * 0.1; // Simulated latency based on density
    
    // Get DNA modifiers
    const stabilityThreshold = dna.genes.find(g => g.type === 'STABILITY_THRESHOLD')?.expression ?? 0.7;
    const recoveryAggression = dna.genes.find(g => g.type === 'RECOVERY_AGGRESSION')?.expression ?? 0.4;

    // Calculate basic health score
    let healthScore = 100 - (errorRate * 50) - (metrics.entropy * 20) - (latency * 10);
    healthScore = Math.max(0, Math.min(100, healthScore));

    // 2. Anomaly Detection (Influenced by Stability Threshold)
    const anomalies = this.detectAnomalies(agents, metrics, dna, stabilityThreshold);
    
    // 3. Process Incidents
    for (const anomaly of anomalies) {
      if (!this.state.activeIncidents.find(i => i.type === anomaly.type)) {
        const incident: HealthIncident = {
          id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
          step: metrics.step,
          type: anomaly.type,
          severity: anomaly.severity,
          status: 'DETECTED',
          description: anomaly.description,
          affectedAgents: anomaly.affectedAgents,
          actionsTaken: []
        };
        this.state.activeIncidents.push(incident);
        this.incidentLog.push(incident);
        
        // Trigger Autonomous Recovery for Critical/Medium
        // Aggression influences if we trigger recovery for Medium severity
        const shouldRecover = incident.severity === 'CRITICAL' || 
                             (incident.severity === 'MEDIUM' && recoveryAggression > 0.3);

        if (shouldRecover) {
          await this.triggerAutonomousRecovery(incident, agents, dna, recoveryAggression);
        }
      }
    }

    // Update State
    this.state = {
      ...this.state,
      overallScore: healthScore,
      latency,
      errorRate,
      resourceUsage,
      systemLogs: [...this.systemLogs],
      history: [...this.state.history, { step: metrics.step, score: healthScore }].slice(-50)
    };

    return this.state;
  }

  private detectAnomalies(agents: AgentState[], metrics: SimulationMetrics, dna: ManagerDNA, threshold: number) {
    const anomalies: { type: string; severity: IncidentSeverity; description: string; affectedAgents: string[] }[] = [];

    // Check for mass health decline (Influenced by stability threshold)
    // Higher threshold means we are more sensitive (trigger at lower failure rates)
    const failureThreshold = 1.2 - threshold; // e.g., if threshold is 0.7, trigger at 0.5 failure rate
    
    if (metrics.failureRate > failureThreshold) {
      anomalies.push({
        type: 'MASS_DECAY',
        severity: 'CRITICAL',
        description: `Rapid systemic health decline detected. Failure rate (${(metrics.failureRate * 100).toFixed(1)}%) exceeds stability threshold.`,
        affectedAgents: agents.filter(a => a.health < 30).map(a => a.id)
      });
    }

    // Check for signal saturation (Threshold influences sensitivity)
    const signalLimit = 0.5 + (threshold * 0.5); // 0.85 if threshold is 0.7
    if (metrics.signalDensity > signalLimit) {
      anomalies.push({
        type: 'SIGNAL_FLOOD',
        severity: 'MEDIUM',
        description: `Signal density (${(metrics.signalDensity * 100).toFixed(1)}%) approaching saturation limits.`,
        affectedAgents: []
      });
    }

    // Check for entropy spikes
    if (metrics.entropy > threshold) {
      anomalies.push({
        type: 'ENTROPY_SPIKE',
        severity: 'MEDIUM',
        description: `System entropy (${(metrics.entropy * 100).toFixed(1)}%) exceeds stability threshold.`,
        affectedAgents: []
      });
    }

    return anomalies;
  }

  private async triggerAutonomousRecovery(incident: HealthIncident, agents: AgentState[], dna: ManagerDNA, aggression: number) {
    incident.status = 'ANALYZING';
    
    try {
      // Use LLM for Root Cause Analysis and Recovery Strategy
      const response = await getAi().models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `SYSTEM INCIDENT REPORT:
        Type: ${incident.type}
        Severity: ${incident.severity}
        Description: ${incident.description}
        Affected Agents: ${incident.affectedAgents.length}
        System DNA: ${JSON.stringify(dna)}
        Recovery Aggression: ${aggression}
        
        Perform Root Cause Analysis and suggest a recovery strategy.
        Focus on:
        1. Identifying which DNA genes are contributing to the instability.
        2. Suggesting parameter adjustments (metabolism, decay, signaling).
        3. Determining if a "Safe State" rollback is required.
        4. Adjust aggression based on the Recovery Aggression parameter.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rootCause: { type: Type.STRING },
              strategy: { type: Type.STRING },
              recommendedAction: { type: Type.STRING, enum: ['RESTART_AGENTS', 'ROLLBACK_DNA', 'REBALANCE_LOAD', 'ADJUST_PARAMETERS'] },
              dnaAdjustments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    geneType: { type: Type.STRING },
                    newExpression: { type: Type.NUMBER }
                  }
                }
              }
            },
            required: ["rootCause", "strategy", "recommendedAction"]
          }
        }
      });

      const text = response.text || '{}';
      let analysis;
      try {
        analysis = JSON.parse(text);
      } catch (e) {
        // Fallback for malformed JSON
        analysis = {
          rootCause: "Unknown systemic instability",
          strategy: "General stabilization",
          recommendedAction: "RESTART_AGENTS"
        };
      }
      incident.rootCause = analysis.rootCause;
      incident.recommendedAction = analysis.recommendedAction;
      incident.status = 'RECOVERING';
      incident.actionsTaken.push(`Strategy: ${analysis.strategy}`);
      incident.actionsTaken.push(`Action: ${analysis.recommendedAction}`);

      // Apply Fixes (Simulated for now, would be handled by state updates in App.tsx)
      if (analysis.dnaAdjustments) {
        analysis.dnaAdjustments.forEach((adj: any) => {
          incident.actionsTaken.push(`Adjusted ${adj.geneType} to ${adj.newExpression}`);
        });
      }

      incident.status = 'RESOLVED';
    } catch (error) {
      console.error("Recovery failed:", error);
      incident.status = 'FAILED';
      incident.actionsTaken.push("Autonomous recovery failed due to engine error.");
    }
  }

  public getIncidentLog() {
    return this.incidentLog;
  }
}

export const healthEngine = new HealthEngine();
