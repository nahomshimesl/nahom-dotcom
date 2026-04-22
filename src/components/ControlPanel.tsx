/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AgentState, OrganType, SimulationMetrics } from '../types/simulation';
import { Play, Pause, RotateCcw, Plus, Trash2, Activity, Zap, ShieldAlert, BrainCircuit, AlertTriangle } from 'lucide-react';

interface ControlPanelProps {
  metrics: SimulationMetrics;
  isRunning: boolean;
  onToggle: () => void;
  onReset: () => void;
  onAddAgent: (type: OrganType) => void;
  onRemoveAgent: () => void;
  prediction?: {
    stabilityScore: number;
    collapseProbability: number;
    recommendation: string;
  };
  onAnalyze: () => void;
  isAnalyzing: boolean;
  cooldown: number;
  onSimulateError: () => void;
  simulationSpeed: number;
  onSpeedChange: (speed: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  metrics,
  isRunning,
  onToggle,
  onReset,
  onAddAgent,
  onRemoveAgent,
  prediction,
  onAnalyze,
  isAnalyzing,
  cooldown,
  onSimulateError,
  simulationSpeed,
  onSpeedChange
}) => {
  return (
    <div className="flex flex-col gap-6 p-6 bg-emerald-950 border-l border-emerald-800 w-96 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-emerald-50 font-sans tracking-tight">System Controls</h2>
        <div className="flex gap-2">
          <button
            onClick={onToggle}
            className={`p-2 rounded-lg transition-colors ${
              isRunning ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
            }`}
          >
            {isRunning ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={onReset}
            className="p-2 rounded-lg bg-emerald-900 text-emerald-400 hover:bg-emerald-800 transition-colors"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-900/30 rounded-xl border border-emerald-800">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-500 uppercase tracking-wider mb-1">
            <Activity size={14} /> Step
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-50">{metrics.step}</div>
        </div>
        <div className="p-4 bg-emerald-900/30 rounded-xl border border-emerald-800">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-500 uppercase tracking-wider mb-1">
            <Zap size={14} /> Health
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-50">{metrics.averageHealth.toFixed(1)}%</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Simulation Speed</h3>
          <span className="text-xs font-mono text-emerald-500">{simulationSpeed}x</span>
        </div>
        <div className="flex gap-2">
          {[0.5, 1, 2, 5].map(speed => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                simulationSpeed === speed
                  ? 'bg-emerald-500 text-emerald-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-emerald-900/50 text-emerald-500 border-emerald-800 hover:bg-emerald-800'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Add Organoid</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(OrganType).map(type => (
            <button
              key={type}
              onClick={() => onAddAgent(type)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-800 rounded-lg transition-colors text-emerald-300"
            >
              <Plus size={14} /> {type.split(' ')[0]}
            </button>
          ))}
        </div>
        <button
          onClick={onRemoveAgent}
          className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors text-rose-400"
        >
          <Trash2 size={14} /> Prune Weakest
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">AI Diagnostics</h3>
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing || cooldown > 0}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
            (isAnalyzing || cooldown > 0)
              ? 'bg-emerald-900 text-emerald-700 cursor-not-allowed' 
              : 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 active:scale-95'
          }`}
        >
          <BrainCircuit size={18} className={isAnalyzing ? 'animate-pulse' : ''} />
          {isAnalyzing ? 'Analyzing Ecosystem...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Run System Analysis'}
        </button>
        <button
          onClick={onSimulateError}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
        >
          <AlertTriangle size={14} /> Simulate System Error
        </button>
      </div>

      {prediction && (
        <div className="flex flex-col gap-4 p-5 bg-emerald-900/50 rounded-2xl border border-emerald-800">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-50">
            <ShieldAlert size={18} /> AI Prediction Module
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium text-emerald-400 mb-1">
                <span>Stability Score</span>
                <span>{prediction.stabilityScore}%</span>
              </div>
              <div className="w-full bg-emerald-950 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${prediction.stabilityScore}%` }}
                />
              </div>
            </div>
            <div className="p-3 bg-emerald-950/50 rounded-lg border border-emerald-800">
              <p className="text-xs italic text-emerald-300 leading-relaxed">
                "{prediction.recommendation}"
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto pt-6 border-t border-emerald-800/50 flex flex-col items-center gap-1">
        <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-[0.2em]">Research Environment v1.0.5</div>
        <div className="text-[9px] text-emerald-600/60 font-medium">Created by <span className="text-emerald-500">Nahom Brhenu</span></div>
      </div>
    </div>
  );
};

export default ControlPanel;
