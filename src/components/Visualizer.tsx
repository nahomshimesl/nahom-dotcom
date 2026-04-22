/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { AgentState, BioSignal, OrganType } from '../types/simulation';
import { Activity, X } from 'lucide-react';

interface VisualizerProps {
  agents: AgentState[];
  signals: BioSignal[];
  width: number;
  height: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ agents, signals, width, height }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<any, any>>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const tracedSignalIds = useMemo(() => {
    if (!selectedSignalId) return new Set<string>();
    const ids = new Set<string>();
    let currentId: string | undefined = selectedSignalId;
    
    // Trace backwards to find the root
    while (currentId) {
      ids.add(currentId);
      const currentSignal = signals.find(s => s.id === currentId);
      currentId = currentSignal?.parentId;
    }
    
    // Also trace forwards to find all descendants of the selected signal
    const findDescendants = (parentId: string) => {
      signals.forEach(s => {
        if (s.parentId === parentId && !ids.has(s.id)) {
          ids.add(s.id);
          findDescendants(s.id);
        }
      });
    };
    findDescendants(selectedSignalId);
    
    return ids;
  }, [selectedSignalId, signals]);

  const tracedAgentIds = useMemo(() => {
    const ids = new Set<string>();
    tracedSignalIds.forEach(sigId => {
      const sig = signals.find(s => s.id === sigId);
      if (sig) {
        ids.add(sig.source);
        ids.add(sig.target);
      }
    });
    return ids;
  }, [tracedSignalIds, signals]);

  const selectedAgent = useMemo(() => 
    agents.find(a => a.id === selectedAgentId),
  [agents, selectedAgentId]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create a container for all elements to enable zooming
    const g = svg.append('g');

    // Add filters for glow effect
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'blur');
    
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Setup Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // 1. Setup Simulation
    // We create a copy of signals to avoid mutating the original state objects
    const links = signals.map(s => ({ ...s }));
    
    const simulation = d3.forceSimulation(agents as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    // 2. Draw Signals (Links)
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d: any) => {
        if (d.type === 'ATP') return '#10b981'; // Emerald
        if (d.type === 'HORMONAL') return '#34d399'; // Emerald-400
        if (d.type === 'CYTOKINE') return '#ef4444'; // Red
        if (d.type === 'ALERT') return '#f43f5e'; // Rose-500 (Alert)
        return '#059669'; // Emerald-600
      })
      .attr('stroke-dasharray', (d: any) => d.type === 'ALERT' ? '5,5' : 'none')
      .attr('stroke-opacity', (d: any) => {
        if (selectedSignalId && !tracedSignalIds.has(d.id)) return 0.05;
        return d.isUrgent ? 0.3 : 0.1;
      })
      .attr('stroke-width', (d: any) => {
        const baseWidth = Math.sqrt(d.payload) * (d.isUrgent ? 2 : 1);
        return tracedSignalIds.has(d.id) ? baseWidth * 2 : baseWidth;
      })
      .attr('cursor', 'pointer')
      .on('click', (event, d: any) => {
        event.stopPropagation();
        setSelectedSignalId(d.id);
      });

    // Add animation for traced signals
    link.filter((d: any) => tracedSignalIds.has(d.id))
      .attr('stroke-dasharray', '5,5')
      .append('animate')
      .attr('attributeName', 'stroke-dashoffset')
      .attr('from', '100')
      .attr('to', '0')
      .attr('dur', '1s')
      .attr('repeatCount', 'indefinite');

    // 2.5 Draw Signal Particles (Trailing & Pulsating)
    const particleData = links.flatMap(d => [
      { ...d, offset: 0, size: 1, opacity: 0.8 },
      { ...d, offset: 0.05, size: 0.7, opacity: 0.4 },
      { ...d, offset: 0.1, size: 0.4, opacity: 0.2 }
    ]);

    const particle = g.append('g')
      .selectAll('circle.signal-particle')
      .data(particleData)
      .enter()
      .append('circle')
      .attr('class', (d: any) => `signal-particle ${d.isUrgent ? 'animate-pulse' : ''}`)
      .attr('r', (d: any) => {
        const baseRadius = Math.sqrt(d.payload) * 2.5;
        return Math.max(2, baseRadius * d.size);
      })
      .attr('fill', (d: any) => {
        if (d.type === 'ATP') return '#10b981';
        if (d.type === 'HORMONAL') return '#34d399';
        if (d.type === 'CYTOKINE') return '#ef4444';
        if (d.type === 'ALERT') return '#f43f5e';
        return '#059669';
      })
      .attr('fill-opacity', (d: any) => {
        if (selectedSignalId && !tracedSignalIds.has(d.id)) return 0.02;
        return d.opacity;
      })
      .attr('filter', (d: any) => d.isUrgent ? 'url(#glow)' : 'none');

    // Setup Active Agent IDs for subtle indicators
    const activeSourceAgentIds = new Set(signals.map(s => s.source));
    const activeTargetAgentIds = new Set(signals.map(s => s.target));

    // 3. Draw Agents (Nodes)
    const node = g.append('g')
      .selectAll('g')
      .data(agents)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d: any) => {
        event.stopPropagation();
        setSelectedAgentId(d.id);
        setSelectedSignalId(null);
      })
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Interaction Radius Indicator
    node.append('circle')
      .attr('r', (d: any) => d.interactionRadius || 100)
      .attr('fill', (d: any) => d.health < 30 ? '#f43f5e' : '#10b981')
      .attr('fill-opacity', 0.03)
      .attr('stroke', (d: any) => d.health < 30 ? '#f43f5e' : '#10b981')
      .attr('stroke-opacity', 0.1)
      .attr('stroke-dasharray', '2,2');

    // Subtle Signal Pulse Indicator (New)
    node.append('circle')
      .attr('r', (d: any) => 16 + (d.energy / 10))
      .attr('fill', 'transparent')
      .attr('stroke', (d: any) => {
        if (activeSourceAgentIds.has(d.id)) return '#34d399'; // Outgoing
        if (activeTargetAgentIds.has(d.id)) return '#60a5fa'; // Incoming
        return 'transparent';
      })
      .attr('stroke-width', (d: any) => (activeSourceAgentIds.has(d.id) || activeTargetAgentIds.has(d.id)) ? 2 : 0)
      .attr('stroke-dasharray', (d: any) => activeSourceAgentIds.has(d.id) ? '2,1' : 'none')
      .attr('class', (d: any) => (activeSourceAgentIds.has(d.id) || activeTargetAgentIds.has(d.id)) ? 'animate-pulse' : '')
      .style('filter', 'url(#glow)');

    // Main Agent Body
    node.append('circle')
      .attr('r', (d: any) => 12 + (d.energy / 10))
      .attr('fill', (d: any) => {
        if (selectedSignalId && !tracedAgentIds.has(d.id)) return '#1e293b'; // Muted
        if (d.type === OrganType.METABOLIC_HUB) return '#059669'; // Emerald-600
        if (d.type === OrganType.SIGNAL_TRANSDUCER) return '#10b981'; // Emerald-500
        if (d.type === OrganType.RESOURCE_COLLECTOR) return '#34d399'; // Emerald-400
        if (d.type === OrganType.STRUCTURAL_ANCHOR) return '#064e3b'; // Emerald-900
        if (d.type === OrganType.IMMUNE_SENTINEL) return '#dc2626'; // Red-600
        return '#065f46';
      })
      .attr('stroke', (d: any) => {
        if (d.id === selectedAgentId) return '#fbbf24';
        return tracedAgentIds.has(d.id) ? '#fbbf24' : '#ecfdf5';
      })
      .attr('stroke-width', (d: any) => {
        if (d.id === selectedAgentId) return 4;
        return tracedAgentIds.has(d.id) ? 4 : 2;
      })
      .attr('class', 'drop-shadow-lg');

    node.append('text')
      .text((d: any) => d.name.split('-')[0])
      .attr('font-size', '10px')
      .attr('dx', 18)
      .attr('dy', 4)
      .attr('fill', '#064e3b')
      .attr('font-weight', 'bold');

    // 4. Update Loop
    simulation.on('tick', () => {
      const time = performance.now() / 1500; // Animation speed control

      link
        .attr('x1', (d: any) => (d.source as any).x)
        .attr('y1', (d: any) => (d.source as any).y)
        .attr('x2', (d: any) => (d.target as any).x)
        .attr('y2', (d: any) => (d.target as any).y);

      particle
        .attr('cx', (d: any) => {
          const source = d.source as any;
          const target = d.target as any;
          const t = (time - d.offset + 1) % 1;
          return source.x + (target.x - source.x) * t;
        })
        .attr('cy', (d: any) => {
          const source = d.source as any;
          const target = d.target as any;
          const t = (time - d.offset + 1) % 1;
          return source.y + (target.y - source.y) * t;
        });

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [agents, signals, width, height, selectedSignalId, selectedAgentId, tracedSignalIds, tracedAgentIds]);

  return (
    <div className="relative w-full h-full bg-emerald-950 rounded-2xl overflow-hidden border border-emerald-800 shadow-2xl" onClick={() => { setSelectedSignalId(null); setSelectedAgentId(null); }}>
      {agents.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-700">
          <Activity size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-bold uppercase tracking-widest">No Active Organoids</p>
          <p className="text-xs mt-1">Reset simulation to initialize ecosystem</p>
        </div>
      ) : (
        <svg ref={svgRef} width={width} height={height} className="w-full h-full cursor-move" />
      )}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none bg-emerald-950/50 p-3 rounded-xl backdrop-blur-sm border border-emerald-800/50">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-600" /> Metabolic Hub
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Signal Transducer
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> Resource Collector
        </div>
        <div className="h-px bg-emerald-800/50 my-1" />
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          <span className="w-2 h-2 rounded-full border border-emerald-400 animate-pulse" /> Transmitting
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-400">
          <span className="w-2 h-2 rounded-full border border-blue-400 animate-pulse" /> Receiving
        </div>
        <div className="h-px bg-emerald-800/50 my-1" />
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-rose-500">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Emergency Alert
        </div>
      </div>
      <div className="absolute bottom-4 right-4 text-[10px] font-mono text-emerald-600 pointer-events-none">
        SCROLL TO ZOOM • DRAG TO PAN • CLICK AGENT FOR MEMORY
      </div>
      
      {selectedAgent && (
        <div className="absolute top-4 right-4 bg-emerald-900/95 backdrop-blur-md border border-emerald-500/30 p-5 rounded-2xl shadow-2xl w-72 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Organoid Memory Log</h4>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedAgentId(null); }}
              className="p-1 hover:bg-emerald-800 rounded-lg text-emerald-500 transition-all"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mb-4">
            <div className="text-lg font-bold text-white mb-1">{selectedAgent.name}</div>
            <div className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">{selectedAgent.type}</div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h5 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Recent Interactions</h5>
              <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1 pr-2">
                {selectedAgent.memory.length === 0 ? (
                  <div className="text-[10px] text-emerald-800 italic">No recent interactions recorded.</div>
                ) : (
                  selectedAgent.memory.map((entry, i) => (
                    <div key={i} className="text-[10px] text-emerald-300 bg-emerald-950/50 p-2 rounded-lg border border-emerald-800/50">
                      {entry}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Signal History</h5>
              <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1 pr-2">
                {selectedAgent.signalHistory.length === 0 ? (
                  <div className="text-[10px] text-emerald-800 italic">No signal history available.</div>
                ) : (
                  selectedAgent.signalHistory.slice(-5).reverse().map((sig, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] bg-emerald-950/50 p-2 rounded-lg border border-emerald-800/50">
                      <span className={`font-bold ${
                        sig.type === 'ALERT' ? 'text-rose-500' : 
                        sig.type === 'ATP' ? 'text-emerald-500' : 'text-indigo-400'
                      }`}>{sig.type}</span>
                      <span className="text-emerald-700 font-mono">Payload: {sig.payload.toFixed(1)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-emerald-800/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-emerald-600 uppercase font-bold">Health Status</span>
              <span className={`text-[10px] font-bold ${selectedAgent.health > 70 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {selectedAgent.health.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-1 bg-emerald-950 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${selectedAgent.health > 70 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${selectedAgent.health}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {selectedSignalId && (
        <div className="absolute top-4 right-4 bg-emerald-900/90 backdrop-blur-md border border-emerald-500/30 p-4 rounded-2xl shadow-2xl max-w-xs animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Signal Trace Active</h4>
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedSignalId(null); }}
              className="p-1 hover:bg-emerald-800 rounded-lg text-emerald-500 transition-all"
            >
              <X size={14} />
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-emerald-600">Trace Depth:</span>
              <span className="text-emerald-200 font-mono">{tracedSignalIds.size} Nodes</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-emerald-600">Propagation:</span>
              <span className="text-emerald-200 font-mono">Fractal Relay</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-emerald-800/50">
            <p className="text-[10px] text-emerald-500 italic leading-relaxed">
              Visualizing the complete propagation path of the selected bio-signal through the organoid network.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visualizer;
