/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentState, OrganType, BioSignal, ManagerDNA, GeneType, SignalPriority } from '../types/simulation';

// Mock UniProt-style data for initialization
const BIO_DATA_POOL = [
  { protein: 'P01308', name: 'Insulin', type: OrganType.SIGNAL_TRANSDUCER },
  { protein: 'P00533', name: 'EGFR', type: OrganType.SIGNAL_TRANSDUCER },
  { protein: 'P04637', name: 'p53', type: OrganType.IMMUNE_SENTINEL },
  { protein: 'P68871', name: 'Hemoglobin', type: OrganType.RESOURCE_COLLECTOR },
  { protein: 'P00338', name: 'LDH', type: OrganType.METABOLIC_HUB },
  { protein: 'P02647', name: 'ApoA1', type: OrganType.METABOLIC_HUB },
  { protein: 'P07355', name: 'Annexin A2', type: OrganType.STRUCTURAL_ANCHOR },
];

const PHI = 1.61803398875;

export function createInitialDNA(): ManagerDNA {
  return {
    version: 1,
    lastMutationStep: 0,
    phiHarmony: 1.0,
    genes: [
      { id: 'g1', type: 'METABOLISM', sequence: 'ATGC-001', expression: 0.5, description: 'Standard Metabolic Efficiency' },
      { id: 'g2', type: 'SIGNALING', sequence: 'ATGC-002', expression: 0.5, description: 'Basic Signal Propagation' },
      { id: 'g3', type: 'STABILITY', sequence: 'ATGC-003', expression: 0.5, description: 'Structural Integrity' },
      { id: 'g4', type: 'PATTERN_SCALING', sequence: 'PHI-001', expression: 0.618, description: 'Golden Ratio Pattern Scaling' },
      { id: 'g5', type: 'RECURSION_DEPTH', sequence: 'PHI-002', expression: 0.382, description: 'Fractal Recursion Depth' },
      { id: 'g6', type: 'ADAPTATION_SPEED', sequence: 'PHI-003', expression: 0.236, description: 'Smooth Adaptation Velocity' },
      { id: 'g7', type: 'RECOVERY_AGGRESSION', sequence: 'REC-001', expression: 0.4, description: 'Autonomous Recovery Aggression' },
      { id: 'g8', type: 'STABILITY_THRESHOLD', sequence: 'STB-001', expression: 0.7, description: 'System Stability Sensitivity' },
    ]
  };
}

export function createInitialAgents(count: number): AgentState[] {
  return Array.from({ length: count }).map((_, i) => {
    const bioTemplate = BIO_DATA_POOL[Math.floor(Math.random() * BIO_DATA_POOL.length)];
    // Hierarchical structure based on Phi
    const recursionLevel = Math.floor(Math.log(i + 1) / Math.log(PHI));
    return {
      id: `agent-${i}`,
      name: `${bioTemplate.name}-${i}`,
      type: bioTemplate.type,
      health: 80 + Math.random() * 20,
      energy: 50 + Math.random() * 50,
      sensitivity: 0.1 + Math.random() * 0.9,
      memory: [],
      signalHistory: [],
      phiPhase: (i * PHI * 2 * Math.PI) % (2 * Math.PI),
      recursionLevel,
      interactionRadius: 100, // Base radius
      parameters: {
        metabolismRate: 0.05 + Math.random() * 0.1,
        decayRate: 0.01 + Math.random() * 0.05,
        signalThreshold: 0.2 + Math.random() * 0.3,
        phiScaling: Math.pow(PHI, -recursionLevel), // Natural scaling
      },
      linkedProtein: bioTemplate.protein,
    };
  });
}

export function processSimulationStep(
  agents: AgentState[],
  signals: BioSignal[],
  dna: ManagerDNA,
  currentStep: number
): { nextAgents: AgentState[]; nextSignals: BioSignal[] } {
  const nextSignals: BioSignal[] = [];
  
  // Calculate global DNA modifiers
  const getModifier = (type: GeneType) => {
    const gene = dna.genes.find(g => g.type === type);
    return gene ? gene.expression : 0.5;
  };

  const metabolismMod = 0.5 + (getModifier('METABOLISM') * 1.0);
  const signalingMod = 0.5 + (getModifier('SIGNALING') * 1.0);
  const stabilityMod = 1.5 - (getModifier('STABILITY') * 1.0);
  const defenseMod = 1.5 - (getModifier('DEFENSE') * 1.0);
  
  // Phi-based modifiers
  const patternScaling = getModifier('PATTERN_SCALING') * PHI;
  const recursionLimit = Math.floor(getModifier('RECURSION_DEPTH') * 5);
  const adaptationSpeed = getModifier('ADAPTATION_SPEED') / PHI;

  const nextAgents = agents.map(agent => {
    // 1. Natural Decay (Modified by DNA and Phi Scaling)
    // Smooth transition: health changes follow a curve inspired by natural growth
    const decayFactor = agent.parameters.decayRate * stabilityMod * agent.parameters.phiScaling;
    let health = agent.health - decayFactor;
    
    // Smooth energy consumption
    const metabolismFactor = agent.parameters.metabolismRate * metabolismMod * agent.parameters.phiScaling;
    let energy = agent.energy - metabolismFactor;

    // 2. Process Incoming Signals
    // Refactor: Sort signals by priority (CRITICAL first)
    const incoming = signals
      .filter(s => s.target === agent.id)
      .sort((a, b) => b.priority - a.priority);

    const newHistoryEntries: any[] = [];
    let adaptedSensitivity = agent.sensitivity;

    incoming.forEach(signal => {
      // Record in history
      newHistoryEntries.push({
        type: signal.type,
        priority: signal.priority,
        isUrgent: signal.isUrgent,
        step: signal.step,
        payload: signal.payload,
      });

      // Adapt sensitivity: receiving critical/urgent signals increases sensitivity
      if (signal.priority >= SignalPriority.HIGH || signal.isUrgent) {
        adaptedSensitivity = Math.min(1.0, adaptedSensitivity + 0.05);
      } else {
        // Low priority signals slightly decrease sensitivity (habituation)
        adaptedSensitivity = Math.max(0.1, adaptedSensitivity - 0.005);
      }

      // Urgent signals have immediate effect (no integration factor)
      const integrationFactor = signal.isUrgent ? 1 : (1 - Math.exp(-adaptationSpeed));
      
      if (signal.type === 'ATP') energy += signal.payload * integrationFactor;
      if (signal.type === 'HORMONAL') health += signal.payload * 0.1 * integrationFactor;
      if (signal.type === 'CYTOKINE') health -= (signal.payload * 0.5 * defenseMod * integrationFactor);
      
      // Handle ALERT signals
      if (signal.type === 'ALERT') {
        health += signal.payload * 0.2; // Alerts trigger emergency recovery
        energy -= 2; // But cost energy
      }
    });

    // Update signal history (limit to last 20 entries)
    const updatedHistory = [...newHistoryEntries, ...agent.signalHistory].slice(0, 20);

    // Calculate dynamic interaction radius
    // Base radius is 100, modified by health and signaling genes
    // Urgent states expand the radius
    const isEmergency = health < 30;
    const baseRadius = 100 * agent.parameters.phiScaling;
    const nextInteractionRadius = baseRadius * (1 + (signalingMod * 0.5)) * (isEmergency ? 2.0 : 1.0);

    // 3. Agent Logic (Recursive & Phi-based)
    // Update Phi Phase for spiral movement/behavior
    const nextPhiPhase = (agent.phiPhase + adaptationSpeed) % (2 * Math.PI);

    // Metabolic Hubs generate ATP with recursive depth
    if (agent.type === OrganType.METABOLIC_HUB && health > 50 && energy > 20) {
      // Spatial targeting: find agents within interaction radius
      const potentialTargets = agents.filter(a => {
        if (a.id === agent.id) return false;
        if (!agent.x || !a.x) return true; // Fallback to random if no coordinates
        const dist = Math.sqrt(Math.pow(a.x - agent.x, 2) + Math.pow(a.y - agent.y, 2));
        return dist < nextInteractionRadius;
      });

      const target = potentialTargets.length > 0 
        ? potentialTargets[Math.floor(Math.random() * potentialTargets.length)]
        : agents[Math.floor(Math.random() * agents.length)];

      if (target.id !== agent.id) {
        nextSignals.push({
          id: `sig-${Date.now()}-${Math.random()}`,
          source: agent.id,
          target: target.id,
          type: 'ATP',
          payload: 5 * signalingMod * agent.parameters.phiScaling,
          timestamp: Date.now(),
          step: currentStep,
          recursionLevel: 0,
          priority: SignalPriority.NORMAL,
          isUrgent: false,
        });
        energy -= 5;
      }
    }

    // Signal Transducers relay messages with fractal recursion
    if (agent.type === OrganType.SIGNAL_TRANSDUCER && incoming.length > 0) {
      incoming.forEach(s => {
        if (s.recursionLevel < recursionLimit) {
          // Urgent signals can propagate further (larger search radius)
          const relayRadius = nextInteractionRadius * (s.isUrgent ? 1.5 : 1.0);
          
          const potentialTargets = agents.filter(a => {
            if (a.id === agent.id || a.id === s.source) return false;
            if (!agent.x || !a.x) return true;
            const dist = Math.sqrt(Math.pow(a.x - agent.x, 2) + Math.pow(a.y - agent.y, 2));
            return dist < relayRadius;
          });

          const target = potentialTargets.length > 0 
            ? potentialTargets[Math.floor(Math.random() * potentialTargets.length)]
            : agents[Math.floor(Math.random() * agents.length)];

          nextSignals.push({
            id: `sig-${Date.now()}-${Math.random()}`,
            source: agent.id,
            target: target.id,
            type: 'HORMONAL',
            payload: (s.payload / (s.isUrgent ? 1.1 : PHI)) * signalingMod, // Less decay for urgent
            timestamp: Date.now(),
            step: currentStep,
            recursionLevel: s.recursionLevel + 1,
            priority: s.priority, // Maintain priority during relay
            isUrgent: s.isUrgent,
            parentId: s.id, // Set parent ID for tracing
          });
        }
      });
    }

    // 4. Boundary Checks & Rebirth Logic
    if (health <= 0) {
      const bioTemplate = BIO_DATA_POOL[Math.floor(Math.random() * BIO_DATA_POOL.length)];
      return {
        ...agent,
        name: `${bioTemplate.name}-Reborn-${Date.now().toString().slice(-4)}`,
        type: bioTemplate.type,
        health: 100,
        energy: 100,
        sensitivity: 0.1 + Math.random() * 0.9,
        memory: [],
        signalHistory: [],
        phiPhase: 0,
        interactionRadius: 100,
        parameters: {
          ...agent.parameters,
          phiScaling: Math.pow(PHI, -agent.recursionLevel),
        },
        linkedProtein: bioTemplate.protein,
      };
    }

    // 5. Emergency Signaling (New Mechanism)
    if (health < 30 && energy > 10) {
      // Alerts have double the interaction radius
      const alertRadius = nextInteractionRadius * 2;
      const neighbors = agents.filter(a => {
        if (a.id === agent.id) return false;
        if (!agent.x || !a.x) return true;
        const dist = Math.sqrt(Math.pow(a.x - agent.x, 2) + Math.pow(a.y - agent.y, 2));
        return dist < alertRadius;
      }).slice(0, 5); // Alerts reach more neighbors

      neighbors.forEach(neighbor => {
        nextSignals.push({
          id: `alert-${Date.now()}-${Math.random()}`,
          source: agent.id,
          target: neighbor.id,
          type: 'ALERT',
          payload: 10 * signalingMod,
          timestamp: Date.now(),
          step: currentStep,
          recursionLevel: 0,
          priority: SignalPriority.CRITICAL,
          isUrgent: true,
        });
      });
      energy -= 5;
    }

    health = Math.max(0, Math.min(100, health));
    energy = Math.max(0, Math.min(200, energy));

    return { 
      ...agent, 
      health, 
      energy, 
      phiPhase: nextPhiPhase, 
      sensitivity: adaptedSensitivity,
      signalHistory: updatedHistory,
      interactionRadius: nextInteractionRadius
    };
  });

  // Limit signals to prevent explosion - use simulation steps for pruning (last 5 steps)
  const prunedSignals = [...nextSignals, ...signals.filter(s => currentStep - s.step < 5)].slice(-200);

  return { nextAgents, nextSignals: prunedSignals };
}
