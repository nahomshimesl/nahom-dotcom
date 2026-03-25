/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ManagerDNA, Gene, GeneType } from '../types/simulation';
import { Dna, Zap, Activity, Shield, TrendingUp, Plus, Trash2, Sliders, Layers, RefreshCw, Maximize } from 'lucide-react';
import { motion } from 'motion/react';

interface GeneticEditorProps {
  dna: ManagerDNA;
  onUpdateDNA: (dna: ManagerDNA) => void;
}

const GENE_ICONS: Record<GeneType, React.ReactNode> = {
  METABOLISM: <Zap size={16} />,
  SIGNALING: <Activity size={16} />,
  STABILITY: <Shield size={16} />,
  GROWTH: <TrendingUp size={16} />,
  DEFENSE: <Shield size={16} className="text-rose-500" />,
  PATTERN_SCALING: <Maximize size={16} className="text-amber-400" />,
  RECURSION_DEPTH: <Layers size={16} className="text-indigo-400" />,
  ADAPTATION_SPEED: <RefreshCw size={16} className="text-cyan-400" />,
  RECOVERY_AGGRESSION: <Zap size={16} className="text-rose-400" />,
  STABILITY_THRESHOLD: <Shield size={16} className="text-emerald-400" />,
};

const GeneticEditor: React.FC<GeneticEditorProps> = ({ dna, onUpdateDNA }) => {
  const handleExpressionChange = (id: string, value: number) => {
    const nextGenes = dna.genes.map(g => 
      g.id === id ? { ...g, expression: value } : g
    );
    onUpdateDNA({ ...dna, genes: nextGenes, version: dna.version + 1 });
  };

  const addGene = (type: GeneType) => {
    const newGene: Gene = {
      id: `g-${Date.now()}`,
      type,
      sequence: `ATGC-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      expression: 0.5,
      description: `New ${type.toLowerCase()} regulatory sequence`,
    };
    onUpdateDNA({ ...dna, genes: [...dna.genes, newGene], version: dna.version + 1 });
  };

  const removeGene = (id: string) => {
    const nextGenes = dna.genes.filter(g => g.id !== id);
    onUpdateDNA({ ...dna, genes: nextGenes, version: dna.version + 1 });
  };

  return (
    <div className="flex flex-col gap-8 p-12 bg-emerald-950 text-emerald-50 min-h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
        <div className="flex items-center justify-between border-b border-emerald-800 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
              <Dna className="text-emerald-400" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold font-sans tracking-tight text-emerald-50">Genetic Manager</h2>
              <p className="text-emerald-400 text-sm mt-1 font-medium">Configure the core genetic heuristics of the ecosystem</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20 font-bold uppercase tracking-widest">
              Genome Version {dna.version}.0
            </div>
            <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">System Propagation: ACTIVE</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="text-emerald-500" size={18} />
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Active Genome</h3>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {(['GROWTH', 'DEFENSE', 'METABOLISM', 'SIGNALING', 'STABILITY', 'PATTERN_SCALING', 'RECURSION_DEPTH', 'ADAPTATION_SPEED', 'RECOVERY_AGGRESSION', 'STABILITY_THRESHOLD'] as GeneType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => addGene(type)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900 hover:bg-emerald-800 rounded-xl transition-all text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-50 border border-emerald-800"
                    title={`Add ${type} gene`}
                  >
                    <Plus size={12} /> {type.split('_').map(s => s.slice(0, 3)).join(' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {dna.genes.map((gene) => (
                <motion.div
                  layout
                  key={gene.id}
                  className="p-6 bg-emerald-900/30 rounded-3xl border border-emerald-800 hover:border-emerald-500 transition-all group shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-950 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-800">
                        {GENE_ICONS[gene.type]}
                      </div>
                      <div>
                        <div className="text-sm font-bold uppercase tracking-wider text-emerald-50">{gene.type}</div>
                        <div className="text-[10px] font-mono text-emerald-500 bg-emerald-950 px-2 py-0.5 rounded mt-1 inline-block">{gene.sequence}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeGene(gene.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-emerald-600 hover:text-rose-400 transition-all bg-emerald-950 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-emerald-500">Expression Level</span>
                      <span className="text-emerald-400 font-mono">{(gene.expression * 100).toFixed(0)}%</span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={gene.expression}
                        onChange={(e) => handleExpressionChange(gene.id, parseFloat(e.target.value))}
                        className="w-full h-2 bg-emerald-950 rounded-full appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-emerald-950 rounded-xl border border-emerald-800">
                    <p className="text-[11px] text-emerald-400 italic leading-relaxed">
                      {gene.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Activity className="text-emerald-500" size={18} />
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">System Impact</h3>
            </div>

            <div className="bg-emerald-900/20 rounded-3xl border border-emerald-800 p-8 flex flex-col gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-500">Phi-Harmony Index</h4>
                  <span className="text-emerald-400 font-mono text-sm">{(dna.phiHarmony * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-emerald-950 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${dna.phiHarmony * 100}%` }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                  />
                </div>
                
                <div className="flex items-center gap-3 mt-6">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400">
                    <Zap size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Metabolic Scaling</h4>
                    <p className="text-[10px] text-emerald-500 mt-0.5">Global energy consumption modified by metabolism genes.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
                    <Activity size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Signal Propagation</h4>
                    <p className="text-[10px] text-emerald-500 mt-0.5">ATP and Hormonal signal payloads regulated by signaling genes.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-400">
                    <Shield size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Defensive Response</h4>
                    <p className="text-[10px] text-emerald-500 mt-0.5">Cytokine inflammation resistance controlled by defense genes.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400">
                    <Maximize size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Fractal Intelligence</h4>
                    <p className="text-[10px] text-emerald-500 mt-0.5">Recursive pattern scaling and self-similar structures enabled by Phi.</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-emerald-800">
                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                  <p className="text-[11px] text-emerald-400 leading-relaxed italic">
                    "The Manager's DNA acts as the master blueprint. Every modification here triggers a cascade of behavioral shifts across the entire cellular network."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneticEditor;
