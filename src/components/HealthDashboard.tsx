/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { SystemHealthState, HealthIncident, SystemLog } from '../types/simulation';
import { Activity, Shield, AlertTriangle, CheckCircle, Clock, Search, Zap, RefreshCcw, Terminal, Info, Bug, Filter, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HealthDashboardProps {
  health: SystemHealthState;
  onResolveIncident: (id: string) => void;
}

const HealthDashboard: React.FC<HealthDashboardProps> = ({ health, onResolveIncident }) => {
  const [logSearch, setLogSearch] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('ALL');
  const [logSeverityFilter, setLogSeverityFilter] = useState<string>('ALL');
  const [logSortOrder, setLogSortOrder] = useState<'desc' | 'asc'>('desc');

  const filteredLogs = useMemo(() => {
    if (!health.systemLogs) return [];
    
    return health.systemLogs
      .filter(log => {
        const matchesSearch = log.message.toLowerCase().includes(logSearch.toLowerCase()) || 
                             log.source.toLowerCase().includes(logSearch.toLowerCase());
        const matchesType = logTypeFilter === 'ALL' || log.type === logTypeFilter;
        const matchesSeverity = logSeverityFilter === 'ALL' || log.severity === logSeverityFilter;
        return matchesSearch && matchesType && matchesSeverity;
      })
      .sort((a, b) => {
        return logSortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
      });
  }, [health.systemLogs, logSearch, logTypeFilter, logSeverityFilter, logSortOrder]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'MEDIUM': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'LOW': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'ERROR': return <Bug size={14} className="text-rose-500" />;
      case 'WARNING': return <AlertTriangle size={14} className="text-amber-500" />;
      case 'DIAGNOSTIC': return <Search size={14} className="text-emerald-500" />;
      default: return <Info size={14} className="text-blue-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DETECTED': return <AlertTriangle size={14} />;
      case 'ANALYZING': return <Search size={14} className="animate-pulse" />;
      case 'RECOVERING': return <RefreshCcw size={14} className="animate-spin" />;
      case 'RESOLVED': return <CheckCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-8 bg-emerald-950 text-emerald-50 min-h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <Shield className="text-emerald-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Health & Stability Engine</h2>
              <p className="text-emerald-400 text-sm">Autonomous monitoring and self-healing system</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">System Health</div>
              <div className={`text-2xl font-mono font-bold ${health.overallScore > 80 ? 'text-emerald-400' : health.overallScore > 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                {health.overallScore.toFixed(1)}%
              </div>
            </div>
            <div className="w-32 h-2 bg-emerald-900 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${health.overallScore}%` }}
                className={`h-full ${health.overallScore > 80 ? 'bg-emerald-500' : health.overallScore > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
              />
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Latency', value: `${(health.latency * 1000).toFixed(0)}ms`, icon: <Clock size={16} />, color: 'text-blue-400' },
            { label: 'Error Rate', value: `${(health.errorRate * 100).toFixed(1)}%`, icon: <AlertTriangle size={16} />, color: 'text-rose-400' },
            { label: 'Resource Usage', value: `${(health.resourceUsage * 100).toFixed(1)}%`, icon: <Zap size={16} />, color: 'text-amber-400' },
            { label: 'Active Incidents', value: health.activeIncidents.length, icon: <Activity size={16} />, color: 'text-emerald-400' },
          ].map((m, i) => (
            <div key={i} className="bg-emerald-900/30 border border-emerald-800/50 p-4 rounded-2xl flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl bg-emerald-950/50 flex items-center justify-center ${m.color}`}>
                {m.icon}
              </div>
              <div>
                <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">{m.label}</div>
                <div className="text-lg font-mono font-bold">{m.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Incidents */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} /> Active Incidents
              </h3>
              <span className="text-[10px] bg-emerald-900 px-2 py-1 rounded-full text-emerald-500 font-bold">
                {health.activeIncidents.length} TOTAL
              </span>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {health.activeIncidents.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-12 bg-emerald-900/10 border border-dashed border-emerald-800/50 rounded-3xl flex flex-col items-center justify-center text-center"
                  >
                    <CheckCircle className="text-emerald-500/20 mb-4" size={48} />
                    <p className="text-emerald-500 font-medium italic">All systems operational. No active incidents detected.</p>
                  </motion.div>
                ) : (
                  health.activeIncidents.map((incident) => (
                    <motion.div
                      key={incident.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-emerald-900/40 border border-emerald-800/50 rounded-3xl p-6 hover:border-emerald-700 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getSeverityColor(incident.severity)}`}>
                            {incident.severity}
                          </div>
                          <h4 className="font-bold text-emerald-50">{incident.type}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                          {getStatusIcon(incident.status)}
                          {incident.status}
                        </div>
                      </div>

                      <p className="text-sm text-emerald-400 mb-6 leading-relaxed">
                        {incident.description}
                      </p>

                      {incident.rootCause && (
                        <div className="mb-6 p-4 bg-emerald-950/50 rounded-2xl border border-emerald-800/30">
                          <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Search size={12} /> Root Cause Analysis
                          </div>
                          <p className="text-xs text-emerald-400 font-medium italic">
                            {incident.rootCause}
                          </p>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Autonomous Actions</div>
                        <div className="flex flex-wrap gap-2">
                          {incident.actionsTaken.map((action, i) => (
                            <div key={i} className="px-3 py-1.5 bg-emerald-950/80 rounded-xl text-[10px] font-medium text-emerald-300 border border-emerald-800/50">
                              {action}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-emerald-800/50 flex justify-between items-center">
                        <div className="text-[10px] text-emerald-500 font-mono">
                          ID: {incident.id} • STEP: {incident.step}
                        </div>
                        <button 
                          onClick={() => onResolveIncident(incident.id)}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/10"
                        >
                          Mark as Resolved
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* System Logs & Learning */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} /> Stability Trends
            </h3>
            
            <div className="bg-emerald-900/20 rounded-3xl border border-emerald-800/50 p-6">
              <div className="flex items-end gap-1 h-32 mb-4">
                {health.history.map((h, i) => (
                  <div 
                    key={i} 
                    className="flex-1 bg-emerald-500/20 rounded-t-sm hover:bg-emerald-500/40 transition-all"
                    style={{ height: `${h.score}%` }}
                    title={`Step ${h.step}: ${h.score.toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-emerald-500 font-bold uppercase tracking-widest">
                <span>T-50 Steps</span>
                <span>Current</span>
              </div>
            </div>

            <div className="bg-emerald-900/20 rounded-3xl border border-emerald-800/50 p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-500">Self-Healing Loop</h4>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <p className="text-[11px] text-emerald-400 leading-relaxed">
                    Learning from <span className="text-white font-bold">MASS_DECAY</span> incidents. Improving metabolic rebalancing strategies.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <p className="text-[11px] text-emerald-400 leading-relaxed">
                    Optimizing <span className="text-white font-bold">SIGNAL_FLOOD</span> prevention. Adjusting signaling DNA expression.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <p className="text-[11px] text-emerald-400 leading-relaxed">
                    Predictive maintenance active. Monitoring for entropy spikes in structural anchors.
                  </p>
                </div>
              </div>
            </div>

            {/* Diagnostic Console */}
            <div className="bg-emerald-950 rounded-3xl border border-emerald-800 p-6 space-y-4 shadow-inner">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                    <Terminal size={14} /> Diagnostic Console
                  </h4>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setLogSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                      className="p-1.5 bg-emerald-900/50 rounded-lg text-emerald-500 hover:bg-emerald-800 transition-all"
                      title="Toggle Sort Order"
                    >
                      <ArrowUpDown size={12} />
                    </button>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700" size={12} />
                    <input 
                      type="text"
                      placeholder="Search logs..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="w-full bg-emerald-900/20 border border-emerald-800/50 rounded-xl py-2 pl-9 pr-4 text-[10px] text-emerald-200 placeholder:text-emerald-800 focus:outline-none focus:border-emerald-600 transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select 
                      value={logTypeFilter}
                      onChange={(e) => setLogTypeFilter(e.target.value)}
                      className="flex-1 bg-emerald-900/20 border border-emerald-800/50 rounded-xl py-1.5 px-3 text-[10px] text-emerald-400 focus:outline-none focus:border-emerald-600 transition-all"
                    >
                      <option value="ALL">All Types</option>
                      <option value="ERROR">Errors</option>
                      <option value="WARNING">Warnings</option>
                      <option value="INFO">Info</option>
                      <option value="DIAGNOSTIC">Diagnostic</option>
                    </select>
                    <select 
                      value={logSeverityFilter}
                      onChange={(e) => setLogSeverityFilter(e.target.value)}
                      className="flex-1 bg-emerald-900/20 border border-emerald-800/50 rounded-xl py-1.5 px-3 text-[10px] text-emerald-400 focus:outline-none focus:border-emerald-600 transition-all"
                    >
                      <option value="ALL">All Severities</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-emerald-900/20 rounded-xl border border-emerald-800/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getLogIcon(log.type)}
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{log.source}</span>
                        </div>
                        <span className="text-[9px] font-mono text-emerald-700">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-200 font-medium">
                        {log.message}
                      </p>
                      {log.diagnosis && (
                        <div className="mt-2 p-2 bg-emerald-950/80 rounded-lg border-l-2 border-emerald-500">
                          <p className="text-[10px] text-emerald-400 leading-relaxed">
                            <span className="font-bold text-emerald-500 uppercase tracking-tighter mr-1">AI Diagnosis:</span>
                            {log.diagnosis}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-[10px] text-emerald-700 uppercase tracking-widest italic">No diagnostic data available.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthDashboard;
