/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layers, HelpCircle, Shield, Brain, FileDown, FileUp, Sparkles, UserCheck, Check } from 'lucide-react';
import { DrawingElement, DisasterEvent } from '../types';

interface SidebarAnalyticsProps {
  selectedLayers: string[];
  onToggleLayer: (id: string) => void;
  drawings: DrawingElement[];
  disasters: DisasterEvent[];
  onImportGeoJSON: (geojson: any) => void;
  onSelectRole: (role: string) => void;
  activeRole: string;
  isAnalyzing: boolean;
  onRunAnalytics: () => void;
  analyticsOutput: string | null;
  aiInsightsSummary: string | null;
}

const LAYERS = [
  { id: 'layer-base', name: 'Tactical GIS Grid', category: 'Base Map' },
  { id: 'layer-satellite', name: 'Sentinel True Color', category: 'Satellite Imagery' },
  { id: 'layer-night', name: 'Night Earth Lights', category: 'Visual Overlays' },
  { id: 'layer-weather', name: 'Live Precipitation Clouds', category: 'Atmosphere' },
  { id: 'layer-climate', name: 'Sea Surface Temp Anomalies', category: 'Environment' },
  { id: 'layer-disaster', name: 'USGS Hazard Pins', category: 'Incident Tracking' },
  { id: 'layer-space', name: 'Satellite Trajectory Orbits', category: 'Orbit Corridors' },
  { id: 'layer-debris-density', name: 'Kessler Debris Heatmap', category: 'Orbit Corridors' },
];

const ROLES = [
  { id: 'disaster', name: 'Disaster Responder', desc: 'Prioritizes hazards and evacuation plans' },
  { id: 'climate', name: 'Environmental Scientist', desc: 'Focuses on CO₂, AQI and NDVI trends' },
  { id: 'space', name: 'Space Operations Controller', desc: 'Orbital tracking & conjunction safety' },
  { id: 'auditor', name: 'Institutional Auditor', desc: 'Enterprise compliance and audit logs' }
];

export const SidebarAnalytics: React.FC<SidebarAnalyticsProps> = ({
  selectedLayers,
  onToggleLayer,
  drawings,
  disasters,
  onImportGeoJSON,
  onSelectRole,
  activeRole,
  isAnalyzing,
  onRunAnalytics,
  analyticsOutput,
  aiInsightsSummary,
}) => {
  const [copied, setCopied] = useState(false);
  const [rawGeoJSONInput, setRawGeoJSONInput] = useState('');

  // Handle Export GeoJSON
  const handleExportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        ...drawings.map((d) => ({
          type: 'Feature',
          properties: { label: d.label, color: d.color, type: d.type },
          geometry: {
            type: d.type === 'polygon' ? 'Polygon' : d.type === 'line' ? 'LineString' : 'Point',
            coordinates: d.type === 'polygon' ? [d.coordinates] : d.coordinates[0],
          },
        })),
        ...disasters.map((dis) => ({
          type: 'Feature',
          properties: { title: dis.title, type: dis.type, severity: dis.severity },
          geometry: {
            type: 'Point',
            coordinates: [dis.lon, dis.lat],
          },
        })),
      ],
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geojson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `astra_gis_export_${Date.now()}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Handle Paste GeoJSON Import
  const handleImport = () => {
    try {
      const parsed = JSON.parse(rawGeoJSONInput);
      onImportGeoJSON(parsed);
      setRawGeoJSONInput('');
      alert('GeoJSON imported successfully!');
    } catch (e) {
      alert('Invalid GeoJSON structure. Please check and retry.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl p-4 gap-4 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Brain className="w-4 h-4 text-emerald-400 animate-pulse" /> Layer Manager & Analytics
          </h2>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
            GIS Layer Config & AI Anomaly Detectors
          </p>
        </div>
      </div>

      {/* Multi-role profile switcher */}
      <div>
        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
          <UserCheck className="w-3 h-3 text-sky-400" /> Multi-Role Profile
        </label>
        <div className="flex flex-col gap-1">
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelectRole(r.id)}
              className={`text-left p-1.5 rounded transition border text-xs ${
                activeRole === r.id
                  ? 'bg-sky-950/20 border-sky-500/50 text-white'
                  : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-[11px] flex justify-between items-center">
                <span>{r.name}</span>
                {activeRole === r.id && <Check className="w-3.5 h-3.5 text-sky-400" />}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 font-sans leading-tight">{r.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* GIS Overlays Layer Toggle list */}
      <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
          Tactical Overlays
        </label>
        {LAYERS.map((layer) => {
          const isEnabled = selectedLayers.includes(layer.id);
          return (
            <div
              key={layer.id}
              onClick={() => onToggleLayer(layer.id)}
              className={`p-2 rounded-lg border cursor-pointer transition flex justify-between items-center ${
                isEnabled ? 'bg-slate-950 border-sky-500/30' : 'bg-slate-950 border-slate-850 hover:bg-slate-900/50'
              }`}
            >
              <div>
                <span className={`text-xs font-medium block ${isEnabled ? 'text-white' : 'text-slate-400'}`}>
                  {layer.name}
                </span>
                <span className="text-[9px] font-mono text-slate-500 uppercase">{layer.category}</span>
              </div>
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition ${
                isEnabled ? 'bg-sky-600 border-sky-500 text-white' : 'border-slate-700'
              }`}>
                {isEnabled && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI GeoAnalytics Panel */}
      <div className="border-t border-slate-800 pt-3 flex flex-col gap-2 max-h-[220px] overflow-y-auto scrollbar-thin grow">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
            AI Cognitive Insights
          </label>
          <button
            onClick={onRunAnalytics}
            disabled={isAnalyzing}
            className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-mono px-2 py-1 rounded transition flex items-center gap-1 font-bold border border-emerald-500 shadow"
          >
            <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" /> Run Detectors
          </button>
        </div>

        {isAnalyzing ? (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs font-mono text-slate-500 text-center animate-pulse py-6">
            Analyzing Spatial Layers...
          </div>
        ) : analyticsOutput ? (
          <div className="bg-slate-950 p-2.5 rounded-lg border border-emerald-500/15 text-[11px] font-mono text-slate-300 leading-relaxed max-h-[140px] overflow-y-auto scrollbar-thin whitespace-pre-line">
            {analyticsOutput}
          </div>
        ) : aiInsightsSummary ? (
          <div className="bg-slate-950 p-2.5 rounded-lg border border-sky-500/15 text-[11px] font-mono text-slate-300 leading-relaxed max-h-[140px] overflow-y-auto scrollbar-thin whitespace-pre-line">
            <span className="text-sky-400 font-bold block mb-1">Current Cognitive Assessment</span>
            {aiInsightsSummary}
          </div>
        ) : (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-[10px] font-mono text-slate-500 text-center py-4">
            Awaiting Layer Analysis. Click "Run Detectors" above.
          </div>
        )}
      </div>

      {/* GeoJSON Import / Export Tools */}
      <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
          GeoJSON Vector Pipelines
        </label>
        <div className="flex gap-1.5">
          <button
            onClick={handleExportGeoJSON}
            className="flex-1 bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 text-[11px] font-mono font-medium text-slate-300 py-2 rounded-lg transition flex items-center justify-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5 text-sky-400" /> Export GIS
          </button>
          <div className="flex-1 flex gap-1">
            <input
              type="text"
              placeholder="Paste GeoJSON..."
              value={rawGeoJSONInput}
              onChange={(e) => setRawGeoJSONInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded px-2 text-[10px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-700"
            />
            <button
              onClick={handleImport}
              className="bg-slate-950 border border-slate-850 hover:bg-slate-800 p-1.5 rounded transition text-emerald-400"
              title="Import GeoJSON"
            >
              <FileUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
