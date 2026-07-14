/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Wind, Thermometer, Gauge, Volume2, VolumeX, Rocket, ShieldAlert,
  Sparkles, Globe, Activity, Compass, HelpCircle, Eye, Play, Pause,
  ArrowUp, ArrowDown, Radio, ChevronRight, CheckCircle2, ShieldAlert as AlertIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface AtmosphericLayer {
  name: string;
  altitude: string;
  altitudeKm: [number, number];
  temperature: string;
  pressure: string;
  density: string;
  composition: { name: string; percentage: number; color: string }[];
  function: string;
  pollutionImpact: string;
  climateImportance: string;
  explanation: string;
  voiceText: string;
  scientificFact: string;
  aiInsights: {
    status: string;
    confidence: number;
    factors: string[];
    futureForecast: string;
    suggestedAction: string;
  };
}

const ATMOSPHERE_LAYERS: AtmosphericLayer[] = [
  {
    name: 'Troposphere',
    altitude: '0 to 12 km (0 to 7.5 miles)',
    altitudeKm: [0, 12],
    temperature: '15°C to -56°C (Decreases with altitude)',
    pressure: '1013 hPa to 200 hPa',
    density: '1.2 kg/m³ to 0.3 kg/m³',
    composition: [
      { name: 'Nitrogen (N₂)', percentage: 78.08, color: 'bg-indigo-500' },
      { name: 'Oxygen (O₂)', percentage: 20.95, color: 'bg-sky-500' },
      { name: 'Argon (Ar)', percentage: 0.93, color: 'bg-teal-500' },
      { name: 'Carbon Dioxide (CO₂)', percentage: 0.042, color: 'bg-rose-500' },
      { name: 'Water Vapor (H₂O) & Others', percentage: 0.001, color: 'bg-amber-500' }
    ],
    function: 'Sustains all terrestrial life, contains 99% of the atmosphere\'s water vapor, and drives global weather systems.',
    pollutionImpact: 'Primary zone for anthropogenic emissions (smog, PM2.5, greenhouse gases, industrial particulate deposition).',
    climateImportance: 'Traps outgoing thermal infrared radiation, creating the natural greenhouse effect that makes Earth habitable.',
    explanation: 'The lowest atmospheric layer. Heated from the ground up, causing continuous convective air currents, cloud formations, and storm developments.',
    voiceText: 'The Troposphere extends from the surface up to about twelve kilometers. It sustains all life, houses almost all global weather, and is the primary zone for greenhouse warming and urban pollution accumulation.',
    scientificFact: 'Although the thinnest layer, the troposphere contains approximately 75% to 80% of the entire atmosphere\'s gaseous mass.',
    aiInsights: {
      status: 'Elevated greenhouse accumulation, high particulate density near major urban hubs.',
      confidence: 96,
      factors: ['Industrial emissions', 'Transportation exhaust', 'Deforestation-driven carbon sink reduction'],
      futureForecast: 'Global average surface temperature projected to rise by 1.5°C by 2036 under moderate emission models.',
      suggestedAction: 'Enhance regional carbon scrubbing grids and expand low-emission transit buffers.'
    }
  },
  {
    name: 'Stratosphere',
    altitude: '12 to 50 km (7.5 to 31 miles)',
    altitudeKm: [12, 50],
    temperature: '-56°C to -15°C (Increases with altitude due to UV absorption)',
    pressure: '200 hPa to 1 hPa',
    density: '0.3 kg/m³ to 0.001 kg/m³',
    composition: [
      { name: 'Nitrogen (N₂)', percentage: 78.1, color: 'bg-indigo-500' },
      { name: 'Oxygen (O₂)', percentage: 20.9, color: 'bg-sky-500' },
      { name: 'Ozone (O₃) & Trace Gases', percentage: 1.0, color: 'bg-fuchsia-500' }
    ],
    function: 'Contains the critical Ozone Layer, shielding the planet from dangerous solar ultraviolet radiation.',
    pollutionImpact: 'Susceptible to ozone-depleting chemicals (CFCs, halons) and stratospheric aerosol injection side effects.',
    climateImportance: 'Ozone warming shapes atmospheric circulation patterns and stratospheric-tropospheric thermal exchange.',
    explanation: 'Extremely dry, stable air. Commercial jetliners cruise in the lower stratosphere to avoid tropospheric weather turbulence.',
    voiceText: 'The Stratosphere ranges from twelve to fifty kilometers. It contains the vital ozone layer that filters mutagenic ultraviolet radiation. Unlike the troposphere, temperature increases with height in this layer.',
    scientificFact: 'The ozone layer absorbs nearly 97% to 99% of the medium-frequency ultraviolet light emitted by the Sun.',
    aiInsights: {
      status: 'Ozone layer recovering at 1-3% per decade; localized polar thinning observed in early spring cycles.',
      confidence: 91,
      factors: ['Residual chlorinated substances', 'Solar cycle solar proton events', 'Methane-derived stratospheric water vapor increase'],
      futureForecast: 'Full global ozone recovery expected by 2060, assuming strict Montreal Protocol compliance.',
      suggestedAction: 'Deploy satellite-based high-frequency UV spectrometers to trace illicit CFC point sources.'
    }
  },
  {
    name: 'Mesosphere',
    altitude: '50 to 85 km (31 to 53 miles)',
    altitudeKm: [50, 85],
    temperature: '-15°C to -90°C (Coldest layer in the atmosphere)',
    pressure: '1 hPa to 0.01 hPa',
    density: '0.001 kg/m³ to 0.00001 kg/m³',
    composition: [
      { name: 'Nitrogen (N₂)', percentage: 78.2, color: 'bg-indigo-500' },
      { name: 'Oxygen (O₂)', percentage: 20.8, color: 'bg-sky-500' },
      { name: 'Ar & Carbon Dioxide', percentage: 1.0, color: 'bg-teal-500' }
    ],
    function: 'Acts as Earth\'s celestial shield, vaporizing millions of high-velocity meteors and space debris daily.',
    pollutionImpact: 'Sensitive to carbon dioxide accumulation, which actually acts as a radiational cooling agent at this high altitude.',
    climateImportance: 'Mesospheric cooling serves as a high-altitude diagnostic signal for greenhouse gas dynamics below.',
    explanation: 'The least understood atmospheric layer. Too high for research weather balloons, yet too low for satellites to maintain orbit.',
    voiceText: 'The Mesosphere reaches from fifty to eighty-five kilometers. This is the coldest layer of our atmosphere, where meteors burn up upon entrance, leaving behind glowing dust trails.',
    scientificFact: 'Noctilucent (night-shining) clouds form here from water vapor freezing around cosmic space dust at freezing temperatures.',
    aiInsights: {
      status: 'Mesospheric temperature cooling detected at a rate of 0.15°C per year, aligning with greenhouse expansion.',
      confidence: 88,
      factors: ['Carbon dioxide radiative cooling', 'Cosmic dust concentration cycles', 'Gravity wave propagation from the troposphere'],
      futureForecast: 'Noctilucent cloud frequency expected to increase by 24% over the next decade due to higher methane emissions.',
      suggestedAction: 'Increase deployment of sub-orbital sounding rocket sensors to map mesopause temperature profiles.'
    }
  },
  {
    name: 'Thermosphere',
    altitude: '85 to 600 km (53 to 372 miles)',
    altitudeKm: [85, 600],
    temperature: '-90°C to 1,500°C (Extremely high heat, but low density feels freezing)',
    pressure: '0.01 hPa to 10⁻⁷ hPa',
    density: '0.00001 kg/m³ to 10⁻¹¹ kg/m³',
    composition: [
      { name: 'Atomic Oxygen (O)', percentage: 65.0, color: 'bg-pink-500' },
      { name: 'Helium (He) & Others', percentage: 35.0, color: 'bg-emerald-500' }
    ],
    function: 'Absorbs high-energy X-rays and Extreme UV solar radiation. Hosts the Ionosphere, reflecting global radio waves.',
    pollutionImpact: 'Orbital satellite drag anomalies caused by thermospheric density changes during solar storms.',
    climateImportance: 'Acts as the primary space weather buffer, expanding and contracting violently with solar cycles.',
    explanation: 'Home of the International Space Station, low Earth orbit satellites, and the spectacular glowing auroras.',
    voiceText: 'The Thermosphere extends to six hundred kilometers. It is a highly energized zone absorbing raw solar radiation, raising temperatures to fifteen hundred degrees, though the air is too thin to transfer heat. It hosts the auroras and the space station.',
    scientificFact: 'The auroras form when high-energy solar winds collide with atomic oxygen and nitrogen molecules in this layer.',
    aiInsights: {
      status: 'Thermospheric expansion cycle peak triggered by Solar Cycle 25 activity, increasing satellite orbital decay rates.',
      confidence: 94,
      factors: ['Solar flares and coronal mass ejections', 'Geomagnetic storming', 'Ionospheric scintillation disturbances'],
      futureForecast: 'Increased orbital drag predicted to shorten low Earth orbit satellite life-expectancies by 18-22% over the next two years.',
      suggestedAction: 'Initialize satellite thrust-boost algorithms 12 hours ahead of predicted coronal mass ejection encounters.'
    }
  },
  {
    name: 'Exosphere',
    altitude: '600 to 10,000 km (372 to 6,200 miles)',
    altitudeKm: [600, 10000],
    temperature: 'Fluctuates widely based on direct solar exposure (0°C to 1,200°C)',
    pressure: 'Almost absolute vacuum',
    density: 'Approaching interplanetary space',
    composition: [
      { name: 'Hydrogen (H)', percentage: 82.0, color: 'bg-cyan-500' },
      { name: 'Helium (He)', percentage: 17.0, color: 'bg-emerald-500' },
      { name: 'Atomic Oxygen (O)', percentage: 1.0, color: 'bg-pink-500' }
    ],
    function: 'The final frontier. Gaseous molecules slowly bleed off and escape into the infinite vacuum of outer space.',
    pollutionImpact: 'Extremely high concentrations of space debris, posing Kessler Syndrome orbital hazards.',
    climateImportance: 'Represents the thermodynamic boundary of Earth\'s gravitational hold over volatile atmospheric elements.',
    explanation: 'Particles travel immense distances without colliding, slowly fading into interplanetary solar wind.',
    voiceText: 'The Exosphere is the outermost boundary, reaching ten thousand kilometers. Here, lightweight hydrogen and helium atoms travel on ballistic trajectories, occasionally escaping Earth\'s gravitational field entirely.',
    scientificFact: 'Many weather and communication satellites orbit in the exosphere to minimize drag and maintain stable geosynchronous paths.',
    aiInsights: {
      status: 'High debris accumulation density. High risk of hypervelocity debris-collision propagation.',
      confidence: 92,
      factors: ['Disused satellites', 'Upper-stage rocket boosters', 'Anti-satellite test remnants'],
      futureForecast: 'Conjunction alert probability in high exospheric bands to escalate by 300% without active space cleaning debris sweeps.',
      suggestedAction: 'Coordinate debris-sweeper magnetic drags and enforce satellite de-orbiting systems upon decommissioning.'
    }
  }
];

interface AtmosphereThermalChartProps {
  selectedLayerIndex: number;
  isComparisonMode: boolean;
  layerAIndex: number;
  layerBIndex: number;
}

const AtmosphereThermalChart: React.FC<AtmosphereThermalChartProps> = ({
  selectedLayerIndex,
  isComparisonMode,
  layerAIndex,
  layerBIndex,
}) => {
  const getNormalizedTemp = (temp: number): number => {
    if (temp <= 50) {
      const clamped = Math.max(temp, -100);
      return ((clamped - (-100)) / (50 - (-100))) * 0.75;
    } else {
      const clamped = Math.min(temp, 1200);
      return 0.75 + ((clamped - 50) / (1200 - 50)) * 0.25;
    }
  };

  const getNormalizedAlt = (alt: number): number => {
    if (alt <= 12) {
      return (alt / 12) * 0.25;
    } else if (alt <= 50) {
      return 0.25 + ((alt - 12) / (50 - 12)) * 0.25;
    } else if (alt <= 85) {
      return 0.50 + ((alt - 50) / (85 - 50)) * 0.20;
    } else {
      const clampedAlt = Math.min(alt, 600);
      return 0.70 + ((clampedAlt - 85) / (600 - 85)) * 0.30;
    }
  };

  const project3D = (tempVal: number, altVal: number, depthVal: number) => {
    const tNorm = getNormalizedTemp(tempVal);
    const aNorm = getNormalizedAlt(altVal);
    const dNorm = depthVal;

    const bx = (tNorm - 0.5) * 150;
    const by = (0.5 - aNorm) * 200;
    const bz = (dNorm - 0.5) * 45;

    const angle = Math.PI / 6;
    const x = 135 + bx + bz * Math.cos(angle);
    const y = 140 + by + bz * Math.sin(angle);

    return { x, y };
  };

  const getTempAtAlt = (alt: number): number => {
    if (alt <= 12) {
      return 15 + (alt / 12) * (-56 - 15);
    } else if (alt <= 50) {
      return -56 + ((alt - 12) / (50 - 12)) * (-15 - (-56));
    } else if (alt <= 85) {
      return -15 + ((alt - 50) / (85 - 50)) * (-90 - (-15));
    } else {
      const clamped = Math.min(alt, 600);
      return -90 + ((clamped - 85) / (600 - 85)) * (1200 - (-90));
    }
  };

  const points: { xA: number, yA: number, xB: number, yB: number, temp: number, alt: number }[] = [];
  const sampledAlts = [
    0, 2, 4, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 100, 120, 150, 200, 250, 300, 400, 500, 600
  ];

  sampledAlts.forEach(alt => {
    const temp = getTempAtAlt(alt);
    const ptBack = project3D(temp, alt, 0.45);
    const ptFront = project3D(temp, alt, 0.55);
    points.push({
      xA: ptBack.x,
      yA: ptBack.y,
      xB: ptFront.x,
      yB: ptFront.y,
      temp,
      alt
    });
  });

  const frontPathPoints = points.map(p => `${p.xB.toFixed(1)},${p.yB.toFixed(1)}`).join(' L ');
  const backPathPoints = [...points].reverse().map(p => `${p.xA.toFixed(1)},${p.yA.toFixed(1)}`).join(' L ');
  const ribbonD = `M ${frontPathPoints} L ${backPathPoints} Z`;

  const renderBackWallGrid = () => {
    const lines = [];
    const boundaries = [0, 12, 50, 85, 600];
    const boundaryColors = ['rgba(148, 163, 184, 0.2)', 'rgba(56, 189, 248, 0.25)', 'rgba(245, 158, 11, 0.25)', 'rgba(192, 132, 252, 0.25)', 'rgba(239, 68, 68, 0.25)'];
    boundaries.forEach((alt, idx) => {
      const p1 = project3D(-100, alt, 0);
      const p2 = project3D(1200, alt, 0);
      lines.push(
        <line
          key={`alt-grid-${alt}`}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={boundaryColors[idx] || 'rgba(148, 163, 184, 0.15)'}
          strokeWidth={1}
          strokeDasharray={alt > 0 && alt < 600 ? "2,3" : undefined}
        />
      );
    });

    const temps = [-100, -50, 0, 50, 600, 1200];
    temps.forEach(temp => {
      const p1 = project3D(temp, 0, 0);
      const p2 = project3D(temp, 600, 0);
      lines.push(
        <line
          key={`temp-grid-${temp}`}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke="rgba(148, 163, 184, 0.1)"
          strokeWidth={1}
        />
      );
    });

    return lines;
  };

  const renderFloorGrid = () => {
    const lines = [];
    const temps = [-100, -50, 0, 50, 600, 1200];
    temps.forEach(temp => {
      const p1 = project3D(temp, 0, 0);
      const p2 = project3D(temp, 0, 1);
      lines.push(
        <line
          key={`floor-temp-${temp}`}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke="rgba(148, 163, 184, 0.1)"
          strokeWidth={0.75}
        />
      );
    });

    const depths = [0, 0.25, 0.5, 0.75, 1];
    depths.forEach(d => {
      const p1 = project3D(-100, 0, d);
      const p2 = project3D(1200, 0, d);
      lines.push(
        <line
          key={`floor-depth-${d}`}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke="rgba(148, 163, 184, 0.1)"
          strokeWidth={0.75}
        />
      );
    });

    return lines;
  };

  const renderLayerHighlight = (layerIdx: number, color: string, glowColor: string, id: string) => {
    const layer = ATMOSPHERE_LAYERS[layerIdx];
    if (!layer) return null;
    const [minAlt, maxAlt] = layer.altitudeKm;
    
    const steps = 12;
    const bandPoints: { xA: number, yA: number, xB: number, yB: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const alt = minAlt + (i / steps) * (maxAlt - minAlt);
      const temp = getTempAtAlt(alt);
      const ptBack = project3D(temp, alt, 0.2);
      const ptFront = project3D(temp, alt, 0.8);
      bandPoints.push({ xA: ptBack.x, yA: ptBack.y, xB: ptFront.x, yB: ptFront.y });
    }

    const frontStr = bandPoints.map(p => `${p.xB.toFixed(1)},${p.yB.toFixed(1)}`).join(' L ');
    const backStr = [...bandPoints].reverse().map(p => `${p.xA.toFixed(1)},${p.yA.toFixed(1)}`).join(' L ');
    const d = `M ${frontStr} L ${backStr} Z`;

    return (
      <g key={id}>
        <path
          d={d}
          fill={glowColor}
          opacity={0.15}
          className="animate-pulse"
        />
        <path
          d={`M ${bandPoints.map(p => `${p.xB.toFixed(1)},${p.yB.toFixed(1)}`).join(' L ')}`}
          stroke={color}
          strokeWidth={1.5}
          fill="none"
          opacity={0.6}
        />
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 shadow-inner">
      <div className="flex flex-col items-center text-center">
        <span className="font-mono text-[10px] text-slate-300 font-bold tracking-widest uppercase flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-sky-400" /> 3D Thermal profile
        </span>
        <span className="text-[9px] text-slate-500 font-mono mt-0.5">
          Altitude (Geocentric Piecewise) vs Thermal Curve
        </span>
      </div>

      <div className="relative w-full aspect-square max-w-[280px] flex items-center justify-center">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 280 290"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="thermalRibbonGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="15%" stopColor="#22d3ee" />
              <stop offset="45%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            <filter id="thermalGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <g opacity={0.6}>
            {renderFloorGrid()}
          </g>

          <g opacity={0.5}>
            {renderBackWallGrid()}
          </g>

          <g stroke="rgba(148, 163, 184, 0.15)" strokeWidth={1} fill="none">
            <line x1={project3D(-100, 0, 0).x} y1={project3D(-100, 0, 0).y} x2={project3D(-100, 600, 0).x} y2={project3D(-100, 600, 0).y} />
            <line x1={project3D(1200, 0, 0).x} y1={project3D(1200, 0, 0).y} x2={project3D(1200, 600, 0).x} y2={project3D(1200, 600, 0).y} />
            
            <line x1={project3D(-100, 0, 1).x} y1={project3D(-100, 0, 1).y} x2={project3D(-100, 600, 1).x} y2={project3D(-100, 600, 1).y} stroke="rgba(148, 163, 184, 0.08)" />
            <line x1={project3D(1200, 0, 1).x} y1={project3D(1200, 0, 1).y} x2={project3D(1200, 600, 1).x} y2={project3D(1200, 600, 1).y} stroke="rgba(148, 163, 184, 0.08)" />

            <line x1={project3D(-100, 0, 0).x} y1={project3D(-100, 0, 0).y} x2={project3D(-100, 0, 1).x} y2={project3D(-100, 0, 1).y} />
            <line x1={project3D(1200, 0, 0).x} y1={project3D(1200, 0, 0).y} x2={project3D(1200, 0, 1).x} y2={project3D(1200, 0, 1).y} />
            <line x1={project3D(-100, 600, 0).x} y1={project3D(-100, 600, 0).y} x2={project3D(-100, 600, 1).x} y2={project3D(-100, 600, 1).y} stroke="rgba(148, 163, 184, 0.08)" />
            <line x1={project3D(1200, 600, 0).x} y1={project3D(1200, 600, 0).y} x2={project3D(1200, 600, 1).x} y2={project3D(1200, 600, 1).y} stroke="rgba(148, 163, 184, 0.08)" />

            <line x1={project3D(-100, 600, 0).x} y1={project3D(-100, 600, 0).y} x2={project3D(1200, 600, 0).x} y2={project3D(1200, 600, 0).y} />
            <line x1={project3D(-100, 600, 1).x} y1={project3D(-100, 600, 1).y} x2={project3D(1200, 600, 1).x} y2={project3D(1200, 600, 1).y} stroke="rgba(148, 163, 184, 0.08)" />
          </g>

          {isComparisonMode ? (
            <>
              {renderLayerHighlight(layerAIndex, '#fbbf24', 'rgba(245, 158, 11, 0.5)', 'comp-a')}
              {renderLayerHighlight(layerBIndex, '#38bdf8', 'rgba(56, 189, 248, 0.5)', 'comp-b')}
            </>
          ) : (
            renderLayerHighlight(selectedLayerIndex, '#22d3ee', 'rgba(34, 211, 238, 0.5)', 'single-active')
          )}

          <path
            d={ribbonD}
            fill="url(#thermalRibbonGrad)"
            opacity={0.8}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={0.5}
            style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' }}
          />

          <g fill="rgba(148, 163, 184, 0.6)" fontSize="8" fontFamily="monospace" textAnchor="end">
            <text x={project3D(-100, 0, 0).x - 6} y={project3D(-100, 0, 0).y + 3}>0 km</text>
            <text x={project3D(-100, 12, 0).x - 6} y={project3D(-100, 12, 0).y + 3}>12 km</text>
            <text x={project3D(-100, 50, 0).x - 6} y={project3D(-100, 50, 0).y + 3}>50 km</text>
            <text x={project3D(-100, 85, 0).x - 6} y={project3D(-100, 85, 0).y + 3}>85 km</text>
            <text x={project3D(-100, 600, 0).x - 6} y={project3D(-100, 600, 0).y + 3}>600 km</text>
          </g>

          <g fill="rgba(148, 163, 184, 0.5)" fontSize="8" fontFamily="monospace" textAnchor="middle">
            <text x={project3D(-100, 0, 1).x} y={project3D(-100, 0, 1).y + 11}>-100°C</text>
            <text x={project3D(0, 0, 1).x} y={project3D(0, 0, 1).y + 11}>0°C</text>
            <text x={project3D(600, 0, 1).x} y={project3D(600, 0, 1).y + 11}>600°C</text>
            <text x={project3D(1200, 0, 1).x} y={project3D(1200, 0, 1).y + 11}>1200°C</text>
          </g>
        </svg>
      </div>

      <div className="flex flex-col gap-1 w-full text-[9px] font-mono text-slate-400 bg-slate-900/60 rounded-lg p-2 border border-slate-850">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
          <span>GRADIENT KEY</span>
          <span className="text-slate-200 font-bold">THERMODYNAMIC CURVE</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>0-12km Lapse</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>12-50km Inversion</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>50-85km Cool</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>85+km Solar Blast</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AtmosphereExplorerProps {
  onClose?: () => void;
}

export function AtmosphereExplorer({ onClose }: AtmosphereExplorerProps) {
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);
  const [isFlying, setIsFlying] = useState<boolean>(false);
  const [flightDirection, setFlightDirection] = useState<'up' | 'down'>('up');
  const [flightAltitude, setFlightAltitude] = useState<number>(0);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  
  // Comparison Mode States
  const [isComparisonMode, setIsComparisonMode] = useState<boolean>(false);
  const [layerAIndex, setLayerAIndex] = useState<number>(0);
  const [layerBIndex, setLayerBIndex] = useState<number>(1);
  const [activeCompareSlot, setActiveCompareSlot] = useState<'A' | 'B'>('A');

  // Gemini Summary States
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [generatedSummaryText, setGeneratedSummaryText] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  // Generate Gemini Report
  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setShowSummaryModal(true);
    setGeneratedSummaryText(null);
    try {
      const response = await fetch('/api/gemini/atmosphere-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layerProfile: ATMOSPHERE_LAYERS[isComparisonMode ? layerAIndex : selectedLayerIndex],
          comparisonMode: isComparisonMode,
          layerBProfile: isComparisonMode ? ATMOSPHERE_LAYERS[layerBIndex] : null,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setGeneratedSummaryText(data.summary);
      } else {
        setGeneratedSummaryText('### Service Error\nFailed to establish connection with geospatial analyst server.');
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
      setGeneratedSummaryText('### Network Error\nUnable to reach server gateway. Please check connection logs.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const selectedLayer = ATMOSPHERE_LAYERS[selectedLayerIndex];
  const layerA = ATMOSPHERE_LAYERS[layerAIndex];
  const layerB = ATMOSPHERE_LAYERS[layerBIndex];

  // Initialize Speech Synthesis and Speech Web API
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      stopSpeaking();
      stopAudioHum();
    };
  }, []);

  // Handle Speech voice narration
  const handleToggleVoice = () => {
    if (!synthRef.current) {
      alert('Speech synthesis is not supported in this browser environment.');
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
    } else {
      stopSpeaking(); // clear any pending speak tasks
      
      const utterance = new SpeechSynthesisUtterance(selectedLayer.voiceText);
      utteranceRef.current = utterance;
      
      // Attempt to pick an elegant English voice if available
      const voices = synthRef.current.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Google')) ||
                              voices.find(v => v.lang.includes('en')) || 
                              voices[0];
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.pitch = 0.95; // Slightly deeper, sci-fi computer tone
      utterance.rate = 1.0;
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      setIsSpeaking(true);
      synthRef.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  };

  // Web Audio Synth Hum for flight atmosphere effect
  const startAudioHum = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      // Create low frequency drone
      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();
      
      osc.type = 'sine';
      // Lower layers: deeper, higher layers: higher-pitched solar whistle
      const frequency = 80 + selectedLayerIndex * 45;
      osc.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      
      gain.gain.setValueAtTime(0.04, audioContextRef.current.currentTime); // Soft background drone
      
      osc.connect(gain);
      gain.connect(audioContextRef.current.destination);
      
      oscillatorRef.current = osc;
      gainNodeRef.current = gain;
      osc.start(0);
      setAudioEnabled(true);
    } catch (e) {
      console.warn('Audio Context initialization failed or user action required first.', e);
    }
  };

  const updateAudioHumFrequency = (index: number) => {
    if (oscillatorRef.current && audioContextRef.current) {
      const frequency = 80 + index * 45;
      oscillatorRef.current.frequency.exponentialRampToValueAtTime(
        frequency,
        audioContextRef.current.currentTime + 0.6
      );
    }
  };

  const stopAudioHum = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (e) {}
      oscillatorRef.current = null;
    }
    gainNodeRef.current = null;
    setAudioEnabled(false);
  };

  const handleToggleAudio = () => {
    if (audioEnabled) {
      stopAudioHum();
    } else {
      startAudioHum();
    }
  };

  // Fly through animation simulation
  useEffect(() => {
    if (isFlying) {
      stopSpeaking();
      let currentAlt = flightDirection === 'up' ? 0 : 9500;
      setFlightAltitude(currentAlt);
      
      const animateFlight = () => {
        if (flightDirection === 'up') {
          currentAlt += 95;
          if (currentAlt >= 10000) {
            currentAlt = 10000;
            setIsFlying(false);
          }
        } else {
          currentAlt -= 95;
          if (currentAlt <= 0) {
            currentAlt = 0;
            setIsFlying(false);
          }
        }
        
        setFlightAltitude(currentAlt);

        // Auto-select correct atmospheric layer depending on altitude
        let resolvedIdx = 0;
        if (currentAlt <= 12) resolvedIdx = 0;
        else if (currentAlt <= 50) resolvedIdx = 1;
        else if (currentAlt <= 85) resolvedIdx = 2;
        else if (currentAlt <= 600) resolvedIdx = 3;
        else resolvedIdx = 4;

        setSelectedLayerIndex(prev => {
          if (prev !== resolvedIdx) {
            updateAudioHumFrequency(resolvedIdx);
          }
          return resolvedIdx;
        });

        if (isFlying) {
          animationFrameRef.current = requestAnimationFrame(animateFlight);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animateFlight);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isFlying, flightDirection]);

  const handleLayerSelect = (idx: number) => {
    if (isComparisonMode) {
      if (activeCompareSlot === 'A') {
        setLayerAIndex(idx);
        setActiveCompareSlot('B');
      } else {
        setLayerBIndex(idx);
        setActiveCompareSlot('A');
      }
    } else {
      setSelectedLayerIndex(idx);
      stopSpeaking();
      updateAudioHumFrequency(idx);
      // Estimate central altitude for simulation visualization
      const centerAlt = Math.floor((ATMOSPHERE_LAYERS[idx].altitudeKm[0] + ATMOSPHERE_LAYERS[idx].altitudeKm[1]) / 2);
      setFlightAltitude(centerAlt > 1000 ? 5000 : centerAlt);
    }
  };

  const triggerFlyThrough = (dir: 'up' | 'down') => {
    setFlightDirection(dir);
    setIsFlying(true);
    if (!audioEnabled) {
      startAudioHum();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col gap-5 overflow-hidden text-slate-100 max-h-[780px] scrollbar-thin">
      
      {/* Title Header bar */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-sky-500/10 rounded border border-sky-500/20 text-sky-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-bold font-mono tracking-wider text-slate-200 uppercase">
              Atmosphere Explorer 3D
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              Thermodynamic & Chemical Structural Profiles
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Comparison Mode Toggle */}
          <button
            onClick={() => setIsComparisonMode(!isComparisonMode)}
            className={`px-2.5 py-1.5 rounded text-[11px] font-mono font-bold transition flex items-center gap-1.5 border ${
              isComparisonMode
                ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            {isComparisonMode ? 'EXIT COMPARISON' : 'COMPARISON MODE'}
          </button>

          {/* Generate Summary Button */}
          <button
            onClick={handleGenerateSummary}
            className="px-2.5 py-1.5 rounded text-[11px] font-mono font-bold transition flex items-center gap-1.5 border bg-sky-950/45 text-sky-300 border-sky-800 hover:bg-sky-900 hover:text-sky-200 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            GENERATE SUMMARY
          </button>

          {/* Sound Drone hum */}
          <button
            onClick={handleToggleAudio}
            title="Toggle Ambient Atmosphere Drone (Web Audio Synth)"
            className={`p-1.5 rounded border transition flex items-center justify-center ${
              audioEnabled
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white font-mono text-xs px-2 py-0.5 rounded border border-slate-800 hover:bg-slate-800"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main split-screen view: Stack diagram & Info card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[460px]">
        
        {/* Left section: Interactive Vertical Atmosphere Stack */}
        <div className={`${isComparisonMode ? 'lg:col-span-4' : 'lg:col-span-5'} bg-slate-950 rounded-lg p-3 border border-slate-850 flex flex-col justify-between relative overflow-hidden`}>
          
          {/* Space Horizon Atmosphere glow background effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-orange-500/5 via-sky-500/5 to-indigo-950/40 pointer-events-none" />
          
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-mono text-sky-400 font-bold flex items-center gap-1">
              <Globe className="w-3 h-3" /> VERTICAL CROSS SECTION
            </span>
            {isFlying && !isComparisonMode && (
              <span className="text-[9px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 animate-pulse">
                ALT: {flightAltitude.toLocaleString()} km
              </span>
            )}
          </div>

          {/* Comparison target slot selector */}
          {isComparisonMode && (
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-md mb-3 flex flex-col gap-1.5 z-10">
              <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                Select target slot to assign:
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveCompareSlot('A')}
                  className={`flex-1 py-1 rounded text-xs font-mono font-bold transition flex items-center justify-center gap-1 border ${
                    activeCompareSlot === 'A'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                      : 'bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                  SLOT A
                </button>
                <button
                  onClick={() => setActiveCompareSlot('B')}
                  className={`flex-1 py-1 rounded text-xs font-mono font-bold transition flex items-center justify-center gap-1 border ${
                    activeCompareSlot === 'B'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-[0_0_8px_rgba(56,189,248,0.1)]'
                      : 'bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
                  SLOT B
                </button>
              </div>
            </div>
          )}

          {/* Interactive Stack list (Exosphere top, Troposphere bottom) */}
          <div className="flex flex-col gap-2 relative z-10 my-auto grow justify-center">
            {ATMOSPHERE_LAYERS.map((layer, idx) => {
              const revIdx = ATMOSPHERE_LAYERS.length - 1 - idx;
              const isSelected = isComparisonMode 
                ? (layerAIndex === revIdx || layerBIndex === revIdx) 
                : selectedLayerIndex === revIdx;
              const currentLayer = ATMOSPHERE_LAYERS[revIdx];
              
              // Custom colors for atmospheric elevations
              const layerColors = [
                'border-orange-500/30 hover:border-orange-500/60 bg-gradient-to-r from-orange-950/20 to-amber-950/10 text-orange-200', // Troposphere
                'border-sky-500/30 hover:border-sky-500/60 bg-gradient-to-r from-sky-950/20 to-indigo-950/10 text-sky-200', // Stratosphere
                'border-indigo-500/30 hover:border-indigo-500/60 bg-gradient-to-r from-indigo-950/20 to-purple-950/10 text-indigo-200', // Mesosphere
                'border-fuchsia-500/30 hover:border-fuchsia-500/60 bg-gradient-to-r from-fuchsia-950/20 to-pink-950/10 text-fuchsia-200', // Thermosphere
                'border-violet-500/30 hover:border-violet-500/60 bg-gradient-to-r from-violet-950/30 to-slate-950 text-violet-200' // Exosphere
              ];

              // Styling when comparing
              let selectionBorderClass = 'border-sky-400 ring-1 ring-sky-400/30 translate-x-1.5 shadow-[0_0_15px_rgba(56,189,248,0.15)] bg-slate-900 animate-border-pulse-cyan';
              if (isComparisonMode) {
                if (layerAIndex === revIdx && layerBIndex === revIdx) {
                  selectionBorderClass = 'border-purple-400 ring-1 ring-purple-400/30 translate-x-1.5 shadow-[0_0_15px_rgba(192,132,252,0.15)] bg-slate-900 animate-border-pulse-purple';
                } else if (layerAIndex === revIdx) {
                  selectionBorderClass = 'border-amber-400 ring-1 ring-amber-400/30 translate-x-1.5 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-slate-900 animate-border-pulse-amber';
                } else if (layerBIndex === revIdx) {
                  selectionBorderClass = 'border-sky-400 ring-1 ring-sky-400/30 translate-x-1.5 shadow-[0_0_15px_rgba(56,189,248,0.15)] bg-slate-900 animate-border-pulse-cyan';
                }
              }

              return (
                <button
                  key={currentLayer.name}
                  onClick={() => handleLayerSelect(revIdx)}
                  className={`w-full text-left p-2 rounded-md border transition-all duration-300 relative group flex items-center justify-between overflow-hidden ${
                    isSelected 
                      ? selectionBorderClass 
                      : layerColors[revIdx]
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      revIdx === 0 ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]' :
                      revIdx === 1 ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]' :
                      revIdx === 2 ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]' :
                      revIdx === 3 ? 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.8)]' :
                      'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]'
                    }`} />
                    <div>
                      <div className="text-[11px] font-bold tracking-wide font-mono uppercase">{currentLayer.name}</div>
                      <div className="text-[9px] text-slate-400 font-mono">{currentLayer.altitude.split(' ')[0]} {currentLayer.altitude.split(' ')[1]} km</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isComparisonMode && layerAIndex === revIdx && (
                      <span className="text-[8px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/35 px-1 py-0.5 rounded uppercase">
                        A
                      </span>
                    )}
                    {isComparisonMode && layerBIndex === revIdx && (
                      <span className="text-[8px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/35 px-1 py-0.5 rounded uppercase">
                        B
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-slate-500 opacity-60 group-hover:opacity-100 transition">
                      Layer {revIdx + 1}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSelected ? 'translate-x-0.5 text-sky-400' : ''}`} />
                  </div>

                  {/* Flight/Scrubber marker indicator overlay */}
                  {isFlying && !isComparisonMode && flightAltitude >= currentLayer.altitudeKm[0] && flightAltitude <= currentLayer.altitudeKm[1] && (
                    <div className="absolute inset-y-0 left-0 w-1 bg-amber-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Earth Crust Core reference base block */}
          <div className="mt-3 border-t border-slate-800 pt-3 text-center">
            <div className="bg-gradient-to-r from-amber-900/40 via-yellow-950/20 to-amber-950/40 border border-amber-900/30 p-1.5 rounded flex items-center justify-between text-[9px] font-mono text-amber-500">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-amber-500 animate-spin-slow" /> Lithosphere Base (Earth Crust)
              </span>
              <span>15°C Mean Temp</span>
            </div>
          </div>

          {/* Flight controller triggers */}
          <div className="mt-3 pt-2 border-t border-slate-900 flex justify-between gap-2 z-10">
            <button
              onClick={() => triggerFlyThrough('up')}
              disabled={isFlying}
              className="grow bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 p-1.5 rounded text-[10px] font-mono flex items-center justify-center gap-1 transition"
            >
              <ArrowUp className="w-3 h-3 text-sky-400" /> FLY UPWARD
            </button>
            <button
              onClick={() => triggerFlyThrough('down')}
              disabled={isFlying}
              className="grow bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 p-1.5 rounded text-[10px] font-mono flex items-center justify-center gap-1 transition"
            >
              <ArrowDown className="w-3 h-3 text-emerald-400" /> DE-ORBIT FLIGHT
            </button>
            {isFlying && (
              <button
                onClick={() => setIsFlying(false)}
                className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-1.5 rounded text-[10px] font-mono transition hover:bg-rose-500/20"
              >
                ABORT
              </button>
            )}
          </div>
        </div>

        {/* Right Section: Multi-Tab Detail Panel / Comparison Panel */}
        <div className={`${isComparisonMode ? 'lg:col-span-8' : 'lg:col-span-7'} flex flex-col gap-3 justify-between overflow-y-auto max-h-[580px] pr-1`}>
          
          {isComparisonMode ? (
            /* --- Comparison Mode Content --- */
            <div className="flex flex-col gap-3 h-full">
              
              {/* Comparison Header */}
              <div className="bg-slate-950 border border-slate-850 rounded-lg p-4 flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 pointer-events-none text-slate-800 font-mono text-[36px] font-bold opacity-10">
                  VS
                </div>
                <div>
                  <span className="text-[10px] font-mono text-fuchsia-400 font-semibold tracking-wider uppercase flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> ATMOSPHERIC COMPREHENSIVE COMPARISON
                  </span>
                  <h3 className="text-lg font-bold tracking-tight text-white mt-0.5 flex items-center gap-2">
                    <span className="text-amber-400 font-semibold">{layerA.name}</span>
                    <span className="text-slate-500 font-mono text-sm">vs</span>
                    <span className="text-sky-400 font-semibold">{layerB.name}</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Observe thermodynamic gradients and chemical divergence between selected layer elevations.
                  </p>
                </div>
              </div>

              {/* Side-by-Side Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* COLUMN A */}
                <div className="bg-slate-950/80 border border-amber-500/25 rounded-lg p-3.5 flex flex-col gap-3.5 relative">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-amber-500/20 text-amber-400 text-[10px] font-bold font-mono rounded-full flex items-center justify-center border border-amber-500/30">
                        A
                      </span>
                      <span className="text-sm font-bold text-slate-100">{layerA.name}</span>
                    </div>
                    {/* Select Dropdown */}
                    <select
                      value={layerAIndex}
                      onChange={(e) => setLayerAIndex(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {ATMOSPHERE_LAYERS.map((l, i) => (
                        <option key={i} value={i}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Spec list */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/50 p-2 rounded border border-slate-850">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mb-0.5">Altitude</span>
                      <div className="overflow-hidden h-4 flex items-center">
                        <motion.span
                          key={layerAIndex}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="font-bold text-slate-200 font-mono truncate"
                          title={layerA.altitude}
                        >
                          {layerA.altitude.split(' ')[0]} {layerA.altitude.split(' ')[1]} {layerA.altitude.split(' ')[2]}
                        </motion.span>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 p-2 rounded border border-slate-850">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mb-0.5">Temperature</span>
                      <div className="overflow-hidden h-4 flex items-center">
                        <motion.span
                          key={layerAIndex}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="font-bold text-slate-200 font-mono truncate"
                          title={layerA.temperature}
                        >
                          {layerA.temperature.split(' ')[0]}
                        </motion.span>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 p-2 rounded border border-slate-850">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mb-0.5">Pressure</span>
                      <div className="overflow-hidden h-4 flex items-center">
                        <motion.span
                          key={layerAIndex}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="font-bold text-slate-200 font-mono truncate"
                          title={layerA.pressure}
                        >
                          {layerA.pressure}
                        </motion.span>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 p-2 rounded border border-slate-850">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mb-0.5">Density</span>
                      <div className="overflow-hidden h-4 flex items-center">
                        <motion.span
                          key={layerAIndex}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="font-bold text-slate-200 font-mono truncate"
                          title={layerA.density}
                        >
                          {layerA.density}
                        </motion.span>
                      </div>
                    </div>
                  </div>

                  {/* Gas Composition Bar Chart */}
                  <div className="bg-slate-900/50 p-3 rounded border border-slate-850 flex flex-col gap-2">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Gaseous Concentration</span>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex">
                      {layerA.composition.map((g) => (
                        <motion.div
                          key={g.name}
                          layout
                          initial={{ width: 0 }}
                          animate={{ width: `${g.percentage}%` }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                          className={`${g.color} h-full`}
                          title={`${g.name}: ${g.percentage}%`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-col gap-1">
                      {layerA.composition.map((g) => (
                        <div key={g.name} className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                          <span className="truncate max-w-[120px]">{g.name}</span>
                          <div className="font-bold text-slate-200 overflow-hidden h-3.5 flex items-center">
                            <motion.span
                              key={`${layerAIndex}-${g.name}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              {g.percentage}%
                            </motion.span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Core Function */}
                  <div className="text-[11px] text-slate-300 leading-normal bg-slate-900/40 p-2.5 rounded border border-slate-850/60">
                    <span className="font-mono text-[9px] font-bold text-amber-400 uppercase block mb-0.5">Shield Function</span>
                    {layerA.function}
                  </div>

                  {/* Causal Factors */}
                  <div className="bg-slate-900/40 p-2.5 rounded border border-slate-850/60">
                    <span className="font-mono text-[9px] font-bold text-fuchsia-400 uppercase block mb-1">State & Stressors</span>
                    <p className="text-[10px] text-slate-300 leading-relaxed italic">"{layerA.aiInsights.status}"</p>
                  </div>
                </div>

                {/* COLUMN B */}
                <div className="bg-slate-950/80 border border-sky-500/25 rounded-lg p-3.5 flex flex-col gap-3.5 relative">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-sky-500/20 text-sky-400 text-[10px] font-bold font-mono rounded-full flex items-center justify-center border border-sky-500/30">
                        B
                      </span>
                      <span className="text-sm font-bold text-slate-100">{layerB.name}</span>
                    </div>
                    {/* Select Dropdown */}
                    <select
                      value={layerBIndex}
                      onChange={(e) => setLayerBIndex(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      {ATMOSPHERE_LAYERS.map((l, i) => (
                        <option key={i} value={i}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Spec list */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/50 p-2 rounded border border-slate-850">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mb-0.5">Altitude</span>
                      <div className="overflow-hidden h-4 flex items-center">
                        <motion.span
                          key={layerBIndex}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="font-bold text-slate-200 font-mono truncate"
                          title={layerB.altitude}
                        >
                          {layerB.altitude.split(' ')[0]} {layerB.altitude.split(' ')[1]} {layerB.altitude.split(' ')[2]}
                        </motion.span>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 p-2 rounded border border-slate-850">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mb-0.5">Temperature</span>
                      <div className="overflow-hidden h-4 flex items-center">
                        <motion.span
                          key={layerBIndex}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="font-bold text-slate-200 font-mono truncate"
                          title={layerB.temperature}
                        >
                          {layerB.temperature.split(' ')[0]}
                        </motion.span>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 p-2 rounded border border-slate-850">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mb-0.5">Pressure</span>
                      <div className="overflow-hidden h-4 flex items-center">
                        <motion.span
                          key={layerBIndex}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="font-bold text-slate-200 font-mono truncate"
                          title={layerB.pressure}
                        >
                          {layerB.pressure}
                        </motion.span>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 p-2 rounded border border-slate-850">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mb-0.5">Density</span>
                      <div className="overflow-hidden h-4 flex items-center">
                        <motion.span
                          key={layerBIndex}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="font-bold text-slate-200 font-mono truncate"
                          title={layerB.density}
                        >
                          {layerB.density}
                        </motion.span>
                      </div>
                    </div>
                  </div>

                  {/* Gas Composition Bar Chart */}
                  <div className="bg-slate-900/50 p-3 rounded border border-slate-850 flex flex-col gap-2">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Gaseous Concentration</span>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex">
                      {layerB.composition.map((g) => (
                        <motion.div
                          key={g.name}
                          layout
                          initial={{ width: 0 }}
                          animate={{ width: `${g.percentage}%` }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                          className={`${g.color} h-full`}
                          title={`${g.name}: ${g.percentage}%`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-col gap-1">
                      {layerB.composition.map((g) => (
                        <div key={g.name} className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                          <span className="truncate max-w-[120px]">{g.name}</span>
                          <div className="font-bold text-slate-200 overflow-hidden h-3.5 flex items-center">
                            <motion.span
                              key={`${layerBIndex}-${g.name}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              {g.percentage}%
                            </motion.span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Core Function */}
                  <div className="text-[11px] text-slate-300 leading-normal bg-slate-900/40 p-2.5 rounded border border-slate-850/60">
                    <span className="font-mono text-[9px] font-bold text-sky-400 uppercase block mb-0.5">Shield Function</span>
                    {layerB.function}
                  </div>

                  {/* Causal Factors */}
                  <div className="bg-slate-900/40 p-2.5 rounded border border-slate-850/60">
                    <span className="font-mono text-[9px] font-bold text-fuchsia-400 uppercase block mb-1">State & Stressors</span>
                    <p className="text-[10px] text-slate-300 leading-relaxed italic">"{layerB.aiInsights.status}"</p>
                  </div>
                </div>

              </div>

              {/* Analytical Overlay / Comparative Summary */}
              <div className="bg-slate-950 border border-slate-850 rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-fuchsia-400 font-mono text-[10px] font-bold uppercase">
                  <Sparkles className="w-3.5 h-3.5" /> DUAL LAYER CLIMATE ASSESSMENT
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  Comparing <span className="text-amber-400 font-semibold">{layerA.name}</span> (Slot A) and <span className="text-sky-400 font-semibold">{layerB.name}</span> (Slot B) reveals significant structural gradients:
                  <ul className="list-disc pl-4 mt-2 space-y-1.5 text-slate-400">
                    <li>
                      <strong className="text-slate-300">Altitude Gap:</strong> Slot A spans from {layerA.altitude.split(' ')[0]} to {layerA.altitude.split(' ')[2]} km, whereas Slot B operates higher, spanning {layerB.altitude.split(' ')[0]} to {layerB.altitude.split(' ')[2]} km.
                    </li>
                    <li>
                      <strong className="text-slate-300">Thermal Profile:</strong> Slot A experiences {layerA.temperature.split(' (')[0]}, while Slot B fluctuates around {layerB.temperature.split(' (')[0]}.
                    </li>
                    <li>
                      <strong className="text-slate-300">Pressure Decay:</strong> Air density transitions from Slot A ({layerA.density.split(' to ')[0] || layerA.density}) down to Slot B ({layerB.density.split(' to ')[0] || layerB.density}), causing a pressure drop to {layerB.pressure}.
                    </li>
                    <li>
                      <strong className="text-slate-300">Gas Divergence:</strong> Slot A's chemical makeup includes {layerA.composition[0]?.name || 'N₂'} ({layerA.composition[0]?.percentage || 78}%) while Slot B features {layerB.composition.map(g => `${g.name} (${g.percentage}%)`).slice(0, 2).join(', ')}.
                    </li>
                  </ul>
                </div>
              </div>

            </div>
          ) : (
            /* --- Original Single Profile Detail Content --- */
            <>
              {/* Main header stats indicator block */}
              <div className="bg-slate-950 border border-slate-850 rounded-lg p-4 flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 pointer-events-none text-slate-800 font-mono text-[36px] font-bold opacity-10">
                  0{selectedLayerIndex + 1}
                </div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold tracking-wider uppercase">
                      ACTIVE PROFILE INTERCEPT
                    </span>
                    <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
                      {selectedLayer.name}
                      <span className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded font-mono">
                        L-{selectedLayerIndex + 1}
                      </span>
                    </h3>
                  </div>

                  {/* Speech Voice Narration trigger */}
                  <button
                    onClick={handleToggleVoice}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                      isSpeaking
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-amber-300 animate-bounce' : 'text-slate-400'}`} />
                    {isSpeaking ? 'PAUSE VOICE' : 'AI VOICE EXPLAIN'}
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-sky-500/40 pl-3 py-1 bg-slate-900/30 rounded-r">
                  "{selectedLayer.explanation}"
                </p>

                {/* Science Facts block */}
                <div className="bg-sky-500/5 border border-sky-500/15 p-2 rounded flex items-start gap-2 text-xs">
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono font-bold text-sky-400">Atmospheric Fact:</span>{' '}
                    <span className="text-slate-300">{selectedLayer.scientificFact}</span>
                  </div>
                </div>
              </div>

              {/* Technical Properties Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex flex-col gap-1.5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-sky-400" /> Altitude Range
                  </div>
                  <div className="text-xs font-semibold text-slate-100 font-mono overflow-hidden">
                    <motion.div
                      key={selectedLayerIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      {selectedLayer.altitude}
                    </motion.div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex flex-col gap-1.5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-orange-400" /> Temperature Curve
                  </div>
                  <div className="text-xs font-semibold text-slate-100 font-mono overflow-hidden">
                    <motion.div
                      key={selectedLayerIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      {selectedLayer.temperature}
                    </motion.div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex flex-col gap-1.5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-teal-400" /> Barometric Pressure
                  </div>
                  <div className="text-xs font-semibold text-slate-100 font-mono overflow-hidden">
                    <motion.div
                      key={selectedLayerIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      {selectedLayer.pressure}
                    </motion.div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex flex-col gap-1.5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-violet-400" /> Particle Density
                  </div>
                  <div className="text-xs font-semibold text-slate-100 font-mono overflow-hidden">
                    <motion.div
                      key={selectedLayerIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      {selectedLayer.density}
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Gas Composition Bar Chart */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 flex flex-col gap-3">
                <h4 className="text-[10px] font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-indigo-400" /> Gaseous Concentration Breakdown
                </h4>

                {/* Horizontal progress representation of atmosphere chemistry */}
                <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
                  {selectedLayer.composition.map((g) => (
                    <motion.div
                      key={g.name}
                      layout
                      initial={{ width: 0 }}
                      animate={{ width: `${g.percentage}%` }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                      className={`${g.color} h-full`}
                      title={`${g.name}: ${g.percentage}%`}
                    />
                  ))}
                </div>

                {/* Custom Legend */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedLayer.composition.map((g) => (
                    <div key={g.name} className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <div className={`w-2 h-2 rounded-sm ${g.color}`} />
                      <span className="truncate">{g.name}</span>
                      <div className="ml-auto font-bold text-slate-200 overflow-hidden h-4 flex items-center">
                        <motion.span
                          key={`${selectedLayerIndex}-${g.name}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                        >
                          {g.percentage}%
                        </motion.span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Environmental Impacts / Functions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 p-3 rounded border border-slate-850 text-xs">
                  <div className="font-mono text-[10px] font-bold text-sky-400 uppercase mb-1">
                    Primary Shield Function
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    {selectedLayer.function}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3 rounded border border-slate-850 text-xs">
                  <div className="font-mono text-[10px] font-bold text-rose-400 uppercase mb-1">
                    Pollution Vulnerability
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    {selectedLayer.pollutionImpact}
                  </p>
                </div>

                <div className="bg-slate-950/60 p-3 rounded border border-slate-850 text-xs">
                  <div className="font-mono text-[10px] font-bold text-emerald-400 uppercase mb-1">
                    Climate Core Role
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    {selectedLayer.climateImportance}
                  </p>
                </div>
              </div>

              {/* Explainable AI Predictions & Causal Factors */}
              <div className="bg-slate-950 border border-slate-850 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <span className="text-[10px] font-bold font-mono text-fuchsia-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> ASTRA-X EXPLAINABLE AI MODEL (XAI)
                  </span>
                  <span className="text-[9px] font-mono bg-fuchsia-500/10 text-fuchsia-400 px-2 py-0.5 rounded border border-fuchsia-500/20 inline-flex items-center">
                    Confidence:{" "}
                    <motion.span
                      key={selectedLayerIndex}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25 }}
                      className="ml-1 font-bold"
                    >
                      {selectedLayer.aiInsights.confidence}%
                    </motion.span>
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Layer State Assessment</span>
                    <span className="text-xs text-slate-200 font-semibold">{selectedLayer.aiInsights.status}</span>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">Causal Factors & Correlating Metrics</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLayer.aiInsights.factors.map((f, i) => (
                        <span key={i} className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-sky-400 shrink-0" /> {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5 pt-2 border-t border-slate-900">
                    <div className="bg-slate-900/60 p-2.5 rounded border border-slate-850">
                      <span className="text-[9px] font-mono text-slate-400 uppercase block mb-1">Future Trend Projection (10 Yr)</span>
                      <p className="text-[11px] text-slate-300 leading-snug">{selectedLayer.aiInsights.futureForecast}</p>
                    </div>
                    
                    <div className="bg-sky-950/20 p-2.5 rounded border border-sky-500/15">
                      <span className="text-[9px] font-mono text-sky-400 uppercase block mb-1">AI-Recommended Mitigation Action</span>
                      <p className="text-[11px] text-slate-300 leading-snug">{selectedLayer.aiInsights.suggestedAction}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Summary Modal Overlay */}
      <AnimatePresence>
        {showSummaryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[90%] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-950/45">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-sky-400" />
                  <div>
                    <h3 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wide">
                      {isComparisonMode ? 'Dual-Layer Comparative Report' : 'Atmospheric Environmental Report'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {isComparisonMode 
                        ? `${layerA.name} vs ${layerB.name} Profile` 
                        : `${selectedLayer.name} Environmental Profile`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body / Markdown Content */}
              <div className="flex-1 overflow-y-auto p-6 text-sm text-slate-300 space-y-4 scrollbar-thin">
                {isGeneratingSummary ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-4 border-sky-500/10 border-t-sky-400 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-sky-400 animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-mono text-slate-400 animate-pulse uppercase tracking-widest">
                        Generating Report via Gemini AI...
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">
                        Synthesizing atmospheric gradients, chemical compositions & climate factors
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
                    {/* Left side: 3D Visualization of thermal gradient */}
                    <div className="md:col-span-2">
                      <AtmosphereThermalChart
                        selectedLayerIndex={selectedLayerIndex}
                        isComparisonMode={isComparisonMode}
                        layerAIndex={layerAIndex}
                        layerBIndex={layerBIndex}
                      />
                    </div>
                    
                    {/* Right side: AI Report text */}
                    <div className="md:col-span-3 markdown-body prose prose-invert max-w-none prose-sm font-sans leading-relaxed
                      prose-headings:font-mono prose-headings:font-bold prose-headings:text-slate-100 prose-headings:uppercase prose-headings:tracking-wider prose-headings:border-b prose-headings:border-slate-800/60 prose-headings:pb-1.5 prose-headings:mt-6 prose-headings:mb-3
                      prose-p:text-slate-300 prose-p:leading-relaxed prose-p:my-2.5
                      prose-strong:text-sky-300 prose-strong:font-semibold
                      prose-ul:list-disc prose-ul:pl-5 prose-ul:my-2.5 prose-li:my-1
                      prose-code:font-mono prose-code:bg-slate-950 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sky-200"
                    >
                      <ReactMarkdown>{generatedSummaryText || ''}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-800 p-4 bg-slate-950/45 flex justify-end gap-3">
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="px-4 py-2 bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-900 rounded text-xs font-mono font-bold transition cursor-pointer"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
