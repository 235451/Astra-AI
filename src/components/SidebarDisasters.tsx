/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, MapPin, Zap, Shield, Users, RefreshCw, Layers } from 'lucide-react';
import { DisasterEvent } from '../types';

interface SidebarDisastersProps {
  disasters: DisasterEvent[];
  selectedDisaster: DisasterEvent | null;
  onSelectDisaster: (dis: DisasterEvent | null) => void;
  onCenterMap: (lat: number, lon: number) => void;
  onRunAiMitigation: (disaster: DisasterEvent) => void;
  isGeneratingMitigation: boolean;
  mitigationReport: string | null;
}

export const SidebarDisasters: React.FC<SidebarDisastersProps> = ({
  disasters,
  selectedDisaster,
  onSelectDisaster,
  onCenterMap,
  onRunAiMitigation,
  isGeneratingMitigation,
  mitigationReport,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredDisasters = disasters.filter((d) => {
    if (filterType === 'all') return true;
    return d.type === filterType;
  });

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-sky-500 bg-sky-500/10 border-sky-500/30';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl p-4 gap-4 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" /> Disaster Response Center
          </h2>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
            Active USGS Earthquakes & Global Incidents
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none relative z-0">
        {['all', 'earthquake', 'wildfire', 'volcano', 'cyclone'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`text-[9px] font-mono px-2 py-1 rounded transition uppercase shrink-0 border relative focus:outline-none ${
              filterType === type
                ? 'text-white border-rose-500 shadow'
                : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-slate-200'
            }`}
          >
            {filterType === type && (
              <motion.div
                layoutId="disasterActiveTab"
                className="absolute inset-0 bg-rose-600 rounded"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{type === 'all' ? 'All Alerts' : `${type}s`}</span>
          </button>
        ))}
      </div>

      {/* Primary Alerts List */}
      <div className="flex flex-col gap-2 grow overflow-y-auto pr-1 scrollbar-thin max-h-[220px]">
        <AnimatePresence mode="popLayout">
          {filteredDisasters.length > 0 ? (
            filteredDisasters.map((d) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={d.id}
                onClick={() => {
                  onSelectDisaster(d);
                  onCenterMap(d.lat, d.lon);
                }}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition flex flex-col gap-1.5 ${
                  selectedDisaster?.id === d.id
                    ? 'bg-rose-950/20 border-rose-500/50 shadow-md shadow-rose-950/10'
                    : 'bg-slate-950 border-slate-850 hover:border-slate-800 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex justify-between items-start gap-1.5">
                  <span className="text-[11px] font-bold text-slate-100 line-clamp-1 truncate grow">{d.title}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded border font-mono uppercase shrink-0 font-bold ${getSeverityColor(d.severity)}`}>
                    {d.severity}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                    {d.lat.toFixed(2)}°, {d.lon.toFixed(2)}°
                  </span>
                  {d.magnitude && (
                    <span className="text-rose-400 font-bold">Mag: {d.magnitude}</span>
                  )}
                  {d.areaKm2 && (
                    <span className="text-orange-400">Area: {d.areaKm2}km²</span>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 text-slate-500 text-xs font-mono"
            >
              No active incidents in this category.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Incident Inspector Panel */}
      <AnimatePresence mode="wait">
        {selectedDisaster ? (
          <motion.div
            key={selectedDisaster.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-t border-slate-800 pt-3 flex flex-col gap-2 overflow-hidden grow max-h-[260px]"
          >
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex flex-col gap-2">
              <h3 className="text-xs font-bold text-rose-400 font-mono uppercase tracking-wider">
                Selected Incident Telemetry
              </h3>
              <p className="text-xs text-white font-medium">{selectedDisaster.title}</p>
              
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="bg-slate-900/50 p-2 rounded border border-slate-900">
                  <span className="text-[9px] text-slate-500 font-mono block">Impact Population</span>
                  <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1">
                    <Users className="w-3 h-3 text-sky-400" />
                    {selectedDisaster.impactedPopulation.toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-900/50 p-2 rounded border border-slate-900">
                  <span className="text-[9px] text-slate-500 font-mono block">Trigger Date</span>
                  <span className="text-[10px] text-slate-300 font-mono overflow-hidden whitespace-nowrap truncate">
                    {new Date(selectedDisaster.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                  </span>
                </div>
              </div>

              {selectedDisaster.type === 'cyclone' && selectedDisaster.predictedPath && (
                <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 p-1.5 rounded flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Predicted path coordinates projected on Globe layers.
                </div>
              )}
            </div>

            {/* AI Disaster Mitigation Action Call */}
            <button
              onClick={() => onRunAiMitigation(selectedDisaster)}
              disabled={isGeneratingMitigation}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800 text-white font-medium text-xs py-2 rounded-lg transition flex items-center justify-center gap-2 border border-rose-500 shadow-lg"
            >
              {isGeneratingMitigation ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing Mitigation Strategy...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" /> Formulate AI Evacuation Plan
                </>
              )}
            </button>

            {/* Live AI Evacuation / Mitigation Output Area */}
            {mitigationReport && (
              <div className="bg-slate-950 p-3 rounded-lg border border-rose-500/20 text-xs font-mono text-slate-300 space-y-1.5 max-h-[140px] overflow-y-auto scrollbar-thin">
                <div className="font-bold text-rose-400 flex items-center gap-1 border-b border-slate-800 pb-1">
                  <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
                  Evacuation & Mitigation Directives
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300 whitespace-pre-line">
                  {mitigationReport}
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="fallback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-t border-slate-800 pt-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2 py-4"
          >
            <Zap className="w-4 h-4 text-slate-600" />
            <span>Select an alert to initiate spatial disaster mitigation protocols</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
