/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { AgentState, BioSignal, ManagerDNA, OrganType } from '../types/simulation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, PieChart, Pie, Legend } from 'recharts';
import { motion } from 'motion/react';
import { AreaChart, Area } from 'recharts';
import { Brain, TrendingUp, Users, Target, Activity, Zap, Layers } from 'lucide-react';

interface DataAnalyzerProps {
  agents: AgentState[];
  signals: BioSignal[];
  dna: ManagerDNA;
}

const DataAnalyzer: React.FC<DataAnalyzerProps> = ({ agents, signals, dna }) => {
  // 1. Health Distribution Analysis
  const healthDistribution = useMemo(() => {
    const bins = Array(10).fill(0);
    agents.forEach(a => {
      const binIdx = Math.min(9, Math.floor(a.health / 10));
      bins[binIdx]++;
    });
    return bins.map((count, i) => ({
      range: `${i * 10}-${(i + 1) * 10}%`,
      count
    }));
  }, [agents]);

  // 2. Organ Performance Correlation (Health vs. Type)
  const typeAnalysis = useMemo(() => {
    const data: Record<string, { totalHealth: number, count: number, totalEnergy: number }> = {};
    Object.values(OrganType).forEach(type => {
      data[type] = { totalHealth: 0, count: 0, totalEnergy: 0 };
    });

    agents.forEach(a => {
      data[a.type].totalHealth += a.health;
      data[a.type].totalEnergy += a.energy;
      data[a.type].count++;
    });

    return Object.entries(data).map(([type, stats]) => ({
      type: type.split(' ')[0], // Short name
      avgHealth: stats.count > 0 ? stats.totalHealth / stats.count : 0,
      avgEnergy: stats.count > 0 ? stats.totalEnergy / stats.count : 0,
      count: stats.count
    }));
  }, [agents]);

  // 3. Genetic Correlation (Sensitivity vs. Health Scatter)
  const sensitivityCorrelation = useMemo(() => {
    return agents.map(a => ({
      sensitivity: a.sensitivity * 100,
      health: a.health,
      name: a.name.split('-')[0]
    }));
  }, [agents]);

  // 4. Signal Type Distribution
  const signalDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    signals.forEach(s => {
      counts[s.type] = (counts[s.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [signals]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="p-8 bg-emerald-950 text-emerald-50 min-h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-800 pb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Brain className="text-emerald-400" /> Statistical Data Analyzer
            </h2>
            <p className="text-emerald-500 mt-1 font-medium">Deep relational analysis of the biological ecosystem</p>
          </div>
          <div className="flex items-center gap-4 bg-emerald-900/30 p-4 rounded-3xl border border-emerald-800">
            <div className="text-right">
              <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Active Cohort</div>
              <div className="text-xl font-mono font-bold text-emerald-400">{agents.length} Agents</div>
            </div>
            <div className="w-px h-8 bg-emerald-800" />
            <div className="text-right">
              <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Data Points</div>
              <div className="text-xl font-mono font-bold text-emerald-400">{signals.length + (agents.length * 5)}</div>
            </div>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 1. Population Health Distribution */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-900/20 border border-emerald-800 p-6 rounded-3xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={16} /> Health Distribution Spectrum
              </h3>
            </div>
            <div className="h-64 mt-4 text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={healthDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#064e3b" />
                  <XAxis dataKey="range" stroke="#059669" />
                  <YAxis stroke="#059669" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#064e3b', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: '#ecfdf5' }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-emerald-600 italic">Frequency analysis of agent health across decile brackets.</p>
          </motion.div>

          {/* 2. Sensitivity vs Health Correlation */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-emerald-900/20 border border-emerald-800 p-6 rounded-3xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <Target size={16} /> Signal Sensitivity Correlation
              </h3>
            </div>
            <div className="h-64 mt-4 text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid stroke="#064e3b" />
                  <XAxis type="number" dataKey="sensitivity" name="Sensitivity" unit="%" stroke="#059669" label={{ value: 'Sensitivity', position: 'insideBottom', offset: -10, fill: '#059669', fontSize: 10 }} />
                  <YAxis type="number" dataKey="health" name="Health" unit="%" stroke="#059669" label={{ value: 'Health', angle: -90, position: 'insideLeft', fill: '#059669', fontSize: 10 }} />
                  <ZAxis type="number" range={[50, 100]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#064e3b', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                  <Scatter name="Agents" data={sensitivityCorrelation} fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-emerald-600 italic">Relational mapping between individual response thresholds and vitality outcomes.</p>
          </motion.div>

          {/* 3. Performance by Organ Type */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-emerald-900/20 border border-emerald-800 p-6 rounded-3xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <Layers size={16} /> Organ Performance Matrix
              </h3>
            </div>
            <div className="h-64 mt-4 text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeAnalysis} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#064e3b" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="type" type="category" stroke="#059669" width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#064e3b', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                  <Bar dataKey="avgHealth" name="Avg Health" fill="#10b981" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="avgEnergy" name="Avg Energy" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-emerald-600 italic">Comparative efficiency scores across differentiated functional lineages.</p>
          </motion.div>

          {/* 4. Signaling Throughput */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-emerald-900/20 border border-emerald-800 p-6 rounded-3xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <Zap size={16} /> Communication Flux Distribution
              </h3>
            </div>
            <div className="h-64 mt-4 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={signalDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {signalDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#064e3b', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-emerald-600 italic">Real-time breakdown of message modalities traversing the network.</p>
          </motion.div>
        </div>

        {/* Deep Insights Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InsightCard 
            title="Phi Harmony Index" 
            value={(dna.phiHarmony * 100).toFixed(1) + "%"} 
            desc="Ecosystem-wide structural symmetry score based on recursive growth patterns."
            icon={<Activity className="text-emerald-400" size={18} />}
          />
          <InsightCard 
            title="Genetic Burden" 
            value={dna.genes.length + " Alleles"} 
            desc="The total complexity overhead of the current genomic configuration."
            icon={<Users className="text-blue-400" size={18} />}
          />
          <InsightCard 
            title="Signal Saturation" 
            value={(signals.length / Math.max(1, agents.length)).toFixed(2)} 
            desc="Average message packets per agent per computational cycle."
            icon={<Zap className="text-amber-400" size={18} />}
          />
        </div>
      </div>
    </div>
  );
};

const InsightCard = ({ title, value, desc, icon }: { title: string, value: string, desc: string, icon: React.ReactNode }) => (
  <div className="bg-emerald-950 border border-emerald-800/80 p-6 rounded-3xl space-y-3 shadow-xl">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-emerald-900/50 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{title}</h3>
    </div>
    <div className="text-3xl font-mono font-bold text-white tracking-tighter">{value}</div>
    <p className="text-[10px] text-emerald-600 leading-relaxed font-medium">{desc}</p>
  </div>
);

export default DataAnalyzer;
