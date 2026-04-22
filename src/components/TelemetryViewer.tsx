/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TelemetryEvent, SimulationMetrics } from '../types/simulation';
import { Activity, Database, Cpu, HardDrive, BarChart3, Binary, Zap } from 'lucide-react';

interface TelemetryViewerProps {
  metrics: SimulationMetrics;
  events: TelemetryEvent[];
}

const TelemetryViewer: React.FC<TelemetryViewerProps> = ({ metrics, events }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, filter]);

  const filteredEvents = filter === 'ALL' ? events : events.filter(e => e.type === filter);

  return (
    <div className="flex flex-col h-full bg-emerald-950/20 rounded-3xl border border-emerald-800/50 overflow-hidden">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-px bg-emerald-800/20 border-b border-emerald-800/50">
        <StatCell 
          label="Throughput" 
          value={`${metrics.throughput?.toFixed(1) || 0} UPS`} 
          icon={<Cpu size={12} />} 
          sub="Updates Per Sec"
        />
        <StatCell 
          label="Memory" 
          value={`${((metrics.memoryUsage || 0) / 1024).toFixed(1)} KB`} 
          icon={<HardDrive size={12} />} 
          sub="Buffer Allocation"
        />
        <StatCell 
          label="Compute Load" 
          value={`${Math.min(100, (metrics.throughput || 0) * 1.5).toFixed(1)}%`} 
          icon={<Activity size={12} />} 
          sub="Worker Saturation"
        />
        <StatCell 
          label="Sync Latency" 
          value={`${(1000 / (metrics.throughput || 60)).toFixed(1)}ms`} 
          icon={<Zap size={12} />} 
          sub="Frame Interleave"
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Live Stream */}
        <div className="flex-1 flex flex-col border-r border-emerald-800/50">
          <div className="p-3 border-b border-emerald-800/30 bg-emerald-900/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Binary size={14} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Live Telemetry Stream</span>
            </div>
            
            <div className="flex bg-emerald-950 p-0.5 rounded-lg border border-emerald-800/50">
              {['ALL', 'SIGNAL', 'MUTATION', 'BIRTH', 'DEATH'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    filter === t ? 'bg-emerald-800 text-emerald-100' : 'text-emerald-600 hover:text-emerald-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="text-[9px] font-mono text-emerald-600 bg-emerald-950 px-2 py-0.5 rounded">
              SHOWING: {filteredEvents.length}/{events.length}
            </div>
          </div>
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[10px] custom-scrollbar scroll-smooth"
          >
            {filteredEvents.length === 0 && (
              <div className="h-full flex items-center justify-center text-emerald-800 italic">
                {filter === 'ALL' ? 'Awaiting telemetry uplink...' : `No ${filter} events found.`}
              </div>
            )}
            {filteredEvents.map((event) => (
              <motion.div 
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-1.5 rounded bg-emerald-900/10 border border-transparent hover:border-emerald-800/50 transition-colors"
              >
                <span className="text-emerald-700 w-16 shrink-0">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).split(' ')[0]}.{Math.floor(event.timestamp % 1000).toString().padStart(3, '0')}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0 ${
                  event.type === 'SIGNAL' ? 'bg-blue-500/20 text-blue-400' :
                  event.type === 'MUTATION' ? 'bg-amber-500/20 text-amber-400' :
                  event.type === 'DEATH' ? 'bg-rose-500/20 text-rose-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {event.type}
                </span>
                <span className="text-emerald-300 truncate">{event.message}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Visual Analytics */}
        <div className="w-80 flex flex-col bg-emerald-950/20">
          <div className="p-3 border-b border-emerald-800/30 bg-emerald-900/10 flex items-center gap-2">
            <BarChart3 size={14} className="text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Computational Flux</span>
          </div>
          <div className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Worker Density</span>
                <span className="text-[10px] font-mono text-emerald-400">O(N log N)</span>
              </div>
              <div className="h-24 flex items-end gap-1 px-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div 
                    key={i}
                    animate={{ 
                      height: `${20 + Math.random() * 60}%`,
                      opacity: 0.3 + Math.random() * 0.7 
                    }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                    className="flex-1 bg-emerald-500/40 rounded-t-sm"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest border-b border-emerald-800/50 pb-1">Compute Scaling</h4>
              <div className="space-y-3">
                <ScalingMetric label="Recursion Depth" value={`${(metrics.phiHarmony * 5).toFixed(1)}x`} progress={metrics.phiHarmony * 100} color="bg-emerald-500" />
                <ScalingMetric label="Temporal Interleave" value={`${(metrics.signalDensity * 2).toFixed(2)}ms`} progress={Math.min(100, metrics.signalDensity * 50)} color="bg-blue-500" />
                <ScalingMetric label="Quantum Jitter" value={`${(metrics.entropy * 10).toFixed(1)}%`} progress={metrics.entropy * 100} color="bg-rose-500" />
              </div>
            </div>

            <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 mt-auto">
              <div className="flex items-center gap-2 mb-2">
                <Database size={12} className="text-emerald-500" />
                <span className="text-[9px] font-bold uppercase text-emerald-400">Core Optimization</span>
              </div>
              <p className="text-[10px] text-emerald-600 leading-relaxed italic">
                Active offloading enabled. Processing logic segments in parallel shards. 
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCell = ({ label, value, icon, sub }: { label: string, value: string, icon: React.ReactNode, sub: string }) => (
  <div className="p-4 bg-emerald-950/30 flex flex-col gap-1">
    <div className="flex items-center gap-2 text-[8px] font-bold text-emerald-600 uppercase tracking-widest">
      {icon} {label}
    </div>
    <div className="text-lg font-mono font-bold text-emerald-100">{value}</div>
    <div className="text-[8px] text-emerald-800 font-bold uppercase">{sub}</div>
  </div>
);

const ScalingMetric = ({ label, value, progress, color }: { label: string, value: string, progress: number, color: string }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-[9px] font-bold">
      <span className="text-emerald-600 uppercase">{label}</span>
      <span className="text-emerald-400 font-mono">{value}</span>
    </div>
    <div className="w-full h-1 bg-emerald-900 rounded-full overflow-hidden">
      <motion.div animate={{ width: `${progress}%` }} className={`h-full ${color}`} />
    </div>
  </div>
);

export default TelemetryViewer;
