/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Shield, Activity, X, AlertCircle, CheckCircle, Info, Bug, RefreshCw } from 'lucide-react';
import { SystemHealthState, SystemLog } from '../types/simulation';

interface SystemInspectorProps {
  health: SystemHealthState;
  onClose: () => void;
}

const SystemInspector: React.FC<SystemInspectorProps> = ({ health, onClose }) => {
  const [activeTab, setActiveTab] = useState<'LOGS' | 'METRICS' | 'INCIDENTS'>('LOGS');
  const [filter, setFilter] = useState<string>('');

  const filteredLogs = health.systemLogs.filter(log => 
    log.message.toLowerCase().includes(filter.toLowerCase()) || 
    log.source.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed top-0 right-0 w-96 h-full bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col"
    >
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-emerald-500" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">System Inspector</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 transition-all">
          <X size={18} />
        </button>
      </div>

      <div className="flex border-b border-slate-800">
        {(['LOGS', 'METRICS', 'INCIDENTS'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[10px] font-bold tracking-widest transition-all ${
              activeTab === tab ? 'text-emerald-400 bg-emerald-500/10 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'LOGS' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 bg-slate-900/30">
              <input 
                type="text" 
                placeholder="Filter logs..." 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-50">
                  <Info size={32} className="mb-2" />
                  <p className="text-[10px] uppercase tracking-widest">No logs found</p>
                </div>
              ) : (
                filteredLogs.map(log => (
                  <div key={log.id} className={`p-3 rounded-lg border bg-slate-900/50 ${
                    log.severity === 'CRITICAL' ? 'border-rose-500/30' : 
                    log.severity === 'MEDIUM' ? 'border-amber-500/30' : 'border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        log.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 
                        log.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {log.source}
                      </span>
                      <span className="text-[8px] text-slate-600 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{log.message}</p>
                    {log.diagnosis && (
                      <div className="mt-2 pt-2 border-t border-slate-800/50">
                        <div className="flex items-center gap-1 text-[9px] text-emerald-500 font-bold uppercase mb-1">
                          <Bug size={10} /> AI Diagnosis
                        </div>
                        <p className="text-[10px] text-emerald-400/80 italic leading-relaxed">{log.diagnosis}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'METRICS' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Latency" value={`${(health.latency * 1000).toFixed(1)}ms`} icon={<Activity size={12} />} color="text-emerald-400" />
                <MetricCard label="Error Rate" value={`${(health.errorRate * 100).toFixed(2)}%`} icon={<AlertCircle size={12} />} color="text-rose-400" />
                <MetricCard label="Resources" value={`${(health.resourceUsage * 100).toFixed(1)}%`} icon={<Shield size={12} />} color="text-amber-400" />
                <MetricCard label="System Score" value={`${health.overallScore.toFixed(0)}/100`} icon={<CheckCircle size={12} />} color="text-indigo-400" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Health History</h3>
              <div className="h-32 bg-slate-900/50 rounded-xl border border-slate-800 p-2">
                {/* Simple Sparkline could go here */}
                <div className="h-full flex items-end gap-1">
                  {health.history.slice(-30).map((h, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-emerald-500/30 rounded-t-sm" 
                      style={{ height: `${h.score}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'INCIDENTS' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {health.activeIncidents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-50 pt-20">
                <Shield size={48} className="mb-4" />
                <p className="text-xs uppercase tracking-widest">System Stable</p>
                <p className="text-[10px] mt-1">No active incidents detected</p>
              </div>
            ) : (
              health.activeIncidents.map(incident => (
                <div key={incident.id} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                  <div className={`p-3 flex items-center justify-between ${
                    incident.severity === 'CRITICAL' ? 'bg-rose-500/10' : 'bg-amber-500/10'
                  }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                      incident.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {incident.type}
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-950 text-slate-400">
                      {incident.status}
                    </span>
                  </div>
                  <div className="p-3 space-y-3">
                    <p className="text-xs text-slate-300 leading-relaxed">{incident.description}</p>
                    {incident.rootCause && (
                      <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                        <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Root Cause</div>
                        <p className="text-[10px] text-slate-400 italic">{incident.rootCause}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Recovery Actions</div>
                      {incident.actionsTaken.map((action, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-emerald-400/80">
                          <CheckCircle size={10} /> {action}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <RefreshCw size={12} className="animate-spin-slow" />
          Real-time monitoring active
        </div>
        <div className="text-[10px] font-mono text-slate-600">
          v2.5.0-DEBUG
        </div>
      </div>
    </motion.div>
  );
};

const MetricCard = ({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color: string }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase mb-1">
      {icon} {label}
    </div>
    <div className={`text-sm font-bold ${color}`}>{value}</div>
  </div>
);

export default SystemInspector;
