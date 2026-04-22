/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentState, BioSignal, ManagerDNA } from '../types/simulation';
import { processSimulationStep } from './SimulationLoop';

self.onmessage = (e: MessageEvent<{
  agents: AgentState[];
  signals: BioSignal[];
  dna: ManagerDNA;
  currentStep: number;
  stepsToProcess: number;
}>) => {
  const { agents, signals, dna, currentStep, stepsToProcess } = e.data;
  
  let currentAgents = agents;
  let currentSignals = signals;
  let lastStep = currentStep;

  for (let i = 0; i < stepsToProcess; i++) {
    const { nextAgents, nextSignals } = processSimulationStep(
      currentAgents,
      currentSignals,
      dna,
      lastStep
    );
    currentAgents = nextAgents;
    currentSignals = nextSignals;
    lastStep++;
  }

  self.postMessage({
    nextAgents: currentAgents,
    nextSignals: currentSignals,
    nextStep: lastStep
  });
};
