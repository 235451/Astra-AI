/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudRain, Wind, Droplets, Sun, Activity, Eye, Compass, Thermometer, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { WeatherData } from '../types';

interface SidebarWeatherProps {
  lat: number;
  lon: number;
  weatherData: WeatherData | null;
  isLoading: boolean;
  onSelectCity: (lat: number, lon: number) => void;
  realtimeWeatherOverlayEnabled: boolean;
  onToggleRealtimeWeatherOverlay: () => void;
  onSimulateExtreme?: () => void;
}

const PRESETS = [
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  { name: 'Reykjavik (Aurora)', lat: 64.1466, lon: -21.9426 },
  { name: 'Tokyo (Metropolis)', lat: 35.6762, lon: 139.6503 },
  { name: 'Sydney (Pacific)', lat: -33.8688, lon: 151.2093 },
  { name: 'Nairobi (Equatorial)', lat: -1.2921, lon: 36.8219 },
  { name: 'London (Eurasia)', lat: 51.5074, lon: -0.1278 }
];

export const SidebarWeather: React.FC<SidebarWeatherProps> = ({
  lat,
  lon,
  weatherData,
  isLoading,
  onSelectCity,
  realtimeWeatherOverlayEnabled,
  onToggleRealtimeWeatherOverlay,
  onSimulateExtreme,
}) => {
  const [activeTab, setActiveTab] = useState<'hourly' | 'daily'>('hourly');

  // Helper to color-code Air Quality Index (AQI)
  const getAQIBadge = (val: number) => {
    if (val <= 50) return { label: 'Good', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    if (val <= 100) return { label: 'Moderate', bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    return { label: 'Poor', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
  };

  const aqiBadge = weatherData ? getAQIBadge(weatherData.aqi) : null;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-4 gap-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} /> Weather Intelligence
          </h2>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
            LAT: {lat.toFixed(4)}° | LON: {lon.toFixed(4)}°
          </p>
        </div>
        {isLoading && (
          <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20 animate-pulse font-mono">
            FETCHING...
          </span>
        )}
      </div>

      {/* Spatial Predefined Coordinate Shortcuts */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
            Spatial Benchmarks
          </label>
          {onSimulateExtreme && (
            <button
              onClick={onSimulateExtreme}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
              title="Simulate hurricane force winds and severe storm weather to trigger warnings"
            >
              <AlertTriangle className="w-2.5 h-2.5" /> Simulate Hazard
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => onSelectCity(p.lat, p.lon)}
              className="text-left text-[11px] px-2 py-1.5 rounded bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition font-mono truncate"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Meteorological Core Data */}
      {weatherData ? (
        <div className="flex flex-col gap-4 overflow-y-auto grow pr-1 scrollbar-thin">
          {/* Real-time Weather Layer Overlay Toggle */}
          <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 shrink-0">
            <div className="flex items-center gap-2">
              <CloudRain className={`w-4 h-4 ${realtimeWeatherOverlayEnabled ? 'text-sky-400 animate-pulse' : 'text-slate-500'}`} />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-200">Globe Weather Overlay</span>
                <span className="text-[8px] text-slate-400 uppercase font-mono">Live Cloud & Precipitation</span>
              </div>
            </div>
            <button
              onClick={onToggleRealtimeWeatherOverlay}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                realtimeWeatherOverlayEnabled ? 'bg-sky-500' : 'bg-slate-800'
              }`}
              id="btn-weather-overlay-toggle"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  realtimeWeatherOverlayEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-3xl font-bold tracking-tight text-white font-mono">
                  {weatherData.temp}°C
                </span>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">{weatherData.description}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono">Feels Like</span>
                <p className="text-sm font-semibold text-slate-200 font-mono">{weatherData.feelsLike}°C</p>
              </div>
            </div>

            {/* Atmosphere PM Metrics */}
            <div className="mt-3 pt-3 border-t border-slate-900 grid grid-cols-3 gap-2">
              <div className="text-center bg-slate-900/50 p-1.5 rounded">
                <div className="text-[9px] font-mono text-slate-500">AQI (US)</div>
                <div className={`text-xs font-mono font-bold mt-0.5 ${aqiBadge?.bg || 'text-emerald-400'}`}>
                  {weatherData.aqi}
                </div>
              </div>
              <div className="text-center bg-slate-900/50 p-1.5 rounded">
                <div className="text-[9px] font-mono text-slate-500">PM2.5</div>
                <div className="text-xs font-mono font-bold text-slate-300 mt-0.5">
                  {(weatherData as any).pm25 || 8.4} <span className="text-[8px] text-slate-500">μg</span>
                </div>
              </div>
              <div className="text-center bg-slate-900/50 p-1.5 rounded">
                <div className="text-[9px] font-mono text-slate-500">CO₂ Col</div>
                <div className="text-xs font-mono font-bold text-sky-400 mt-0.5">
                  {(weatherData as any).co2 || 412} <span className="text-[8px] text-slate-500">ppm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Meteorological Bento Grid Details */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center gap-2.5">
              <div className="p-1.5 bg-sky-500/10 rounded text-sky-400">
                <Wind className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Wind Velocity</span>
                <span className="text-xs font-mono font-bold text-slate-200">{weatherData.windSpeed} km/h</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-500/10 rounded text-blue-400">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Humidity</span>
                <span className="text-xs font-mono font-bold text-slate-200">{weatherData.humidity}%</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center gap-2.5">
              <div className="p-1.5 bg-yellow-500/10 rounded text-yellow-400">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">UV Radiation</span>
                <span className="text-xs font-mono font-bold text-slate-200">{weatherData.uvIndex} UV</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center gap-2.5">
              <div className="p-1.5 bg-purple-500/10 rounded text-purple-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Air Pressure</span>
                <span className="text-xs font-mono font-bold text-slate-200">{weatherData.pressure} hPa</span>
              </div>
            </div>
          </div>

          {/* Forecast Progression Trend Charts (Hourly / Daily) */}
          <div className="flex flex-col gap-2 mt-2 grow min-h-[160px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Meteorological Trends</span>
              <div className="flex gap-1 bg-slate-950 p-0.5 rounded border border-slate-850 relative z-0">
                {(['hourly', 'daily'] as const).map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`text-[9px] px-2 py-0.5 rounded transition font-mono relative uppercase tracking-wider focus:outline-none ${
                        isActive ? 'text-sky-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="weatherTrendsTab"
                          className="absolute inset-0 bg-slate-850 rounded border border-slate-700/80"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{tab}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full h-32 bg-slate-950/80 rounded-lg p-2 border border-slate-850 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeTab === 'hourly' ? (
                  <motion.div
                    key="hourly"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="w-full h-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weatherData.forecastHourly} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" stroke="#64748b" fontSize={8} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={8} tickLine={false} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: '9px', fontFamily: 'monospace' }}
                        />
                        <Area type="monotone" dataKey="temp" stroke="#0ea5e9" strokeWidth={1.5} fillOpacity={1} fill="url(#colorTemp)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                ) : (
                  <motion.div
                    key="daily"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="flex flex-col gap-1.5 justify-center h-full"
                  >
                    {weatherData.forecastDaily.slice(0, 4).map((d, i) => (
                      <div key={i} className="flex justify-between items-center text-[10px] font-mono px-1">
                        <span className="text-slate-400 w-16 truncate">{d.day}</span>
                        <span className="text-slate-500 text-[9px] w-20 truncate">{d.condition}</span>
                        <div className="flex gap-2 text-right">
                          <span className="text-sky-400 font-bold">{d.tempMax}°</span>
                          <span className="text-slate-600">{d.tempMin}°</span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center grow text-slate-500 text-xs gap-2 py-12 border border-dashed border-slate-800 rounded-lg">
          <Activity className="w-5 h-5 text-slate-600 animate-pulse" />
          <span>Tap Globe to query weather telemetry</span>
        </div>
      )}
    </div>
  );
};
