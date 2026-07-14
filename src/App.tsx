/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  Globe as GlobeIcon, AlertTriangle, Orbit, ShieldAlert, BookMarked,
  Play, Pause, RefreshCw, Layers, Sparkles, Shield, Bookmark,
  TrendingUp, Radio, Wind, X, Info, CheckCircle, AlertCircle, Camera, Sun,
  GripVertical, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { WeatherData, SatelliteTelemetry, DisasterEvent, DrawingElement, Bookmark as BookmarkType, AuditLog, SimulationSnapshot } from './types';
import { GlobeRenderer } from './components/GlobeRenderer';
import { SidebarWeather } from './components/SidebarWeather';
import { SidebarDisasters } from './components/SidebarDisasters';
import { SidebarSpace } from './components/SidebarSpace';
import { SidebarAnalytics } from './components/SidebarAnalytics';
import { AuditLogViewer } from './components/AuditLogViewer';
import { AtmosphereExplorer } from './components/AtmosphereExplorer';

// Helper for robust fetch with automatic retries and exponential backoff
const fetchWithRetry = async (url: string, options?: RequestInit, retries = 3, delay = 1000): Promise<Response> => {
  try {
    const res = await fetch(url, options);
    // If the server is still booting or returns a bad status, retry
    if (!res.ok && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    throw err;
  }
};

export default function App() {
  // Navigation View State
  const [is3D, setIs3D] = useState<boolean>(true);
  const [viewLat, setViewLat] = useState<number>(37.7749);
  const [viewLon, setViewLon] = useState<number>(-122.4194);
  const [viewZoom, setViewZoom] = useState<number>(3);

  // Active module focus tabs
  const [activeTab, setActiveTab] = useState<'weather' | 'disaster' | 'space' | 'analytics' | 'logs'>('weather');
  const [activeRole, setActiveRole] = useState<string>('disaster');
  const [isAtmosphereOpen, setIsAtmosphereOpen] = useState<boolean>(false);

  // Toast Notification system
  interface Toast {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title?: string;
  }
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type, title }]);
    // Auto-remove after 5.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const simulateExtremeWeather = () => {
    setWeatherData({
      temp: 39.4,
      feelsLike: 44.8,
      humidity: 89,
      pressure: 985.4,
      windSpeed: 48.6,
      windDir: 235,
      uvIndex: 11.0,
      aqi: 185,
      dewPoint: 28.5,
      cloudCover: 100,
      visibility: 1.2,
      description: "Severe Thunderstorm with Hurricane Force Winds (Simulated)",
      forecastHourly: [
        { time: "Now", temp: 39.4, pop: 100 },
        { time: "+1h", temp: 36.2, pop: 95 },
        { time: "+2h", temp: 33.1, pop: 90 },
      ],
      forecastDaily: [
        { day: "Today", tempMax: 39.4, tempMin: 22.0, condition: "Severe Thunderstorm", pop: 100 },
        { day: "Tomorrow", tempMax: 28.0, tempMin: 18.0, condition: "Rainy", pop: 80 },
      ]
    });
    postLog('EXTREME_WEATHER_SIMULATED', 'Injected simulated extreme weather parameters for testing toast alerts.');
    addToast('Simulating severe weather hazard parameters: wind velocity 48.6 km/h, heavy precipitation.', 'info', 'Simulation Mode Active');
  };

  // Real-time backend data
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const lastProcessedWeatherRef = useRef<string>('');
  const [satellites, setSatellites] = useState<SatelliteTelemetry[]>([]);
  const [disasters, setDisasters] = useState<DisasterEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [conjunctionAlert, setConjunctionAlert] = useState<any>(null);

  // Selected Inspect targets
  const [selectedSat, setSelectedSat] = useState<SatelliteTelemetry | null>(null);
  const [selectedDisaster, setSelectedDisaster] = useState<DisasterEvent | null>(null);
  const [orbitalPredictorEnabled, setOrbitalPredictorEnabled] = useState<boolean>(false);
  const [decayTrajectoryEnabled, setDecayTrajectoryEnabled] = useState<boolean>(false);
  const [realtimeWeatherOverlayEnabled, setRealtimeWeatherOverlayEnabled] = useState<boolean>(false);

  // Toggleable tactical layer ids
  const [selectedLayers, setSelectedLayers] = useState<string[]>([
    'layer-base', 'layer-disaster', 'layer-space'
  ]);

  // Drawings and user custom geometry
  const [drawings, setDrawings] = useState<DrawingElement[]>([]);
  const [activeTool, setActiveTool] = useState<'none' | 'marker' | 'line' | 'polygon' | 'measure'>('none');

  // Bookmarks state (persisted)
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [newBookmarkName, setNewBookmarkName] = useState('');

  // Simulation snapshots state (persisted)
  const [simulationSnapshots, setSimulationSnapshots] = useState<SimulationSnapshot[]>([]);

  // Sidebar customizable drag-reorder & collapse states
  const [sidebarOrder, setSidebarOrder] = useState<string[]>(() => {
    const stored = localStorage.getItem('astra_gis_sidebar_order');
    return stored ? JSON.parse(stored) : ['weather', 'disaster', 'space', 'analytics', 'logs', 'bookmarks'];
  });

  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('astra_gis_sidebar_collapsed');
    return stored ? JSON.parse(stored) : {
      weather: false,
      disaster: true,
      space: true,
      analytics: true,
      logs: true,
      bookmarks: false,
    };
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const toggleCollapse = (moduleId: string) => {
    setCollapsedModules((prev) => {
      const updated = { ...prev, [moduleId]: !prev[moduleId] };
      localStorage.setItem('astra_gis_sidebar_collapsed', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDragStart = (e: any, index: number) => {
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    }
  };

  const handleDragOver = (e: any, index: number) => {
    if (e.preventDefault) e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newOrder = [...sidebarOrder];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    setSidebarOrder(newOrder);
    setDraggedIndex(index);
  };

  const handleDrop = (e: any) => {
    if (e.preventDefault) e.preventDefault();
    setDraggedIndex(null);
    localStorage.setItem('astra_gis_sidebar_order', JSON.stringify(sidebarOrder));
    postLog('SIDEBAR_REORDERED', `Prioritized sidebar panels: ${sidebarOrder.map(s => s.toUpperCase()).join(' > ')}`);
    addToast('Sidebar priority order updated', 'success', 'Layout Updated');
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const selectTabModule = (moduleId: string) => {
    setActiveTab(moduleId as any);
    
    setCollapsedModules((prev) => {
      const updated = { ...prev, [moduleId]: false };
      localStorage.setItem('astra_gis_sidebar_collapsed', JSON.stringify(updated));
      return updated;
    });

    setTimeout(() => {
      const element = document.getElementById(`sidebar-module-${moduleId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        element.classList.add('ring-2', 'ring-sky-500/50', 'shadow-[0_0_15px_rgba(14,165,233,0.3)]');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-sky-500/50', 'shadow-[0_0_15px_rgba(14,165,233,0.3)]');
        }, 1200);
      }
    }, 150);
  };

  // Timeline Simulation parameters
  const [timelineSpeed, setTimelineSpeed] = useState<number>(0); // 0 = paused, 1-10 speed
  const [timelineYear, setTimelineYear] = useState<number>(2026); // 2016 (hist) to 2036 (future)

  // Loading States
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);
  const [isDisastersLoading, setIsDisastersLoading] = useState<boolean>(false);
  const [isGeneratingMitigation, setIsGeneratingMitigation] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Output response payloads from Gemini
  const [mitigationReport, setMitigationReport] = useState<string | null>(null);
  const [analyticsOutput, setAnalyticsOutput] = useState<string | null>(null);
  const [aiInsightsSummary, setAiInsightsSummary] = useState<string | null>(null);

  // Fetch Core Weather data from local server proxy
  const fetchWeather = async (lat: number, lon: number) => {
    setIsWeatherLoading(true);
    try {
      const res = await fetchWithRetry(`/api/weather?lat=${lat}&lon=${lon}`);
      if (res.ok) {
        const data = await res.json();
        
        // Apply 4D Timeline simulation modifier effects to simulated weather conditions
        if (weatherData) {
          const yearDiff = timelineYear - 2026;
          if (yearDiff > 0) {
            // Global warming scenario temperature raise
            data.temp = Number((data.temp + yearDiff * 0.15).toFixed(1));
            data.feelsLike = Number((data.feelsLike + yearDiff * 0.15).toFixed(1));
            data.description += ` (+${(yearDiff * 0.15).toFixed(1)}°C Temp Projection)`;
          } else if (yearDiff < 0) {
            data.temp = Number((data.temp + yearDiff * 0.1).toFixed(1));
            data.feelsLike = Number((data.feelsLike + yearDiff * 0.1).toFixed(1));
          }
        }

        setWeatherData(data);
      }
    } catch (err) {
      console.error('Error fetching weather:', err);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  // Fetch core USGS disaster events
  const fetchDisasters = async () => {
    setIsDisastersLoading(true);
    try {
      const res = await fetchWithRetry('/api/disasters');
      if (res.ok) {
        const data = await res.json();
        setDisasters(data.events || []);
      }
    } catch (err) {
      console.error('Error fetching disasters:', err);
    } finally {
      setIsDisastersLoading(false);
    }
  };

  // Fetch compliance audit logs
  const fetchAuditLogs = async () => {
    try {
      const res = await fetchWithRetry('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  // Post compliance audit log action
  const postLog = async (action: string, details: string) => {
    try {
      await fetchWithRetry('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: activeRole.toUpperCase(), action, details }),
      });
      fetchAuditLogs();
    } catch (err) {
      console.error('Error posting log:', err);
    }
  };

  // Run Gemini active disaster response evacuation route assessment
  const handleRunAiMitigation = async (disaster: DisasterEvent) => {
    setIsGeneratingMitigation(true);
    setMitigationReport(null);
    try {
      const res = await fetchWithRetry('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentState: `Active ${disaster.type} warning`,
          locationName: disaster.title,
          disasters: [disaster],
          weather: weatherData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMitigationReport(data.summary || 'AI analysis completed with secure results.');
        postLog('AI_MITIGATION_RUN', `Generated evacuation routes and hazard analysis for ${disaster.title}`);
      }
    } catch (err) {
      console.error('Error generating mitigation plans:', err);
    } finally {
      setIsGeneratingMitigation(false);
    }
  };

  // Run Gemini GeoAnalytics on user drawing geometry bounds
  const handleRunAnalytics = async () => {
    setIsAnalyzing(true);
    setAnalyticsOutput(null);
    try {
      const res = await fetchWithRetry('/api/gemini/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geometryData: drawings,
          selectedLayers,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnalyticsOutput(data.assessment);
        postLog('AI_GEOANALYTICS_RUN', `Executed custom anomaly and path optimization report on drawings layer.`);
      }
    } catch (err) {
      console.error('Error analyzing geospatial layers:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Establish live Server-Sent Events stream for high-frequency orbits and alerts tracking
  useEffect(() => {
    const sse = new EventSource('/api/sse');

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'telemetry_update') {
          let updatedSats = data.satellites || [];

          // Simulate Kessler accumulation of space debris / satellite decay depending on 4D timeline year
          const yearDiff = timelineYear - 2026;
          if (yearDiff > 0) {
            // Debris density grows exponentially
            const expansionCount = Math.floor(yearDiff * 1.5);
            const extraDebris: SatelliteTelemetry[] = [];
            for (let i = 0; i < expansionCount; i++) {
              extraDebris.push({
                id: `debris-generated-${i}`,
                name: `Kessler Debris Cluster #${200 + i}`,
                type: 'space_debris',
                lat: Number((Math.sin(Date.now() * 0.0001 + i) * 60).toFixed(4)),
                lon: Number(((Date.now() * 0.00005 * i) % 360 - 180).toFixed(4)),
                alt: 400 + (i * 20),
                velocity: 28000,
                inclination: 53.0 + i,
                operator: 'Debris (Kessler Accumulation)',
                epoch: new Date().toISOString(),
                orbitPath: [],
                coverageRadius: 0,
              });
            }
            updatedSats = [...updatedSats, ...extraDebris];
          }

          setSatellites(updatedSats);
          
          if (data.conjunctionAlert) {
            setConjunctionAlert(data.conjunctionAlert);
          } else {
            setConjunctionAlert(null);
          }
        }
      } catch (err) {
        console.error('Error parsing SSE event data:', err);
      }
    };

    return () => {
      sse.close();
    };
  }, [timelineYear]);

  // Initial Sync and Polling Loop
  useEffect(() => {
    fetchWeather(viewLat, viewLon);
    fetchDisasters();
    fetchAuditLogs();

    const interval = setInterval(() => {
      fetchDisasters();
      fetchAuditLogs();
    }, 15000);

    // Initial bookmarks loading from browser storage
    const stored = localStorage.getItem('astra_gis_bookmarks');
    if (stored) {
      try {
        setBookmarks(JSON.parse(stored));
      } catch (e) {
        console.error('Could not load bookmarks', e);
      }
    }

    // Initial simulation snapshots loading from browser storage
    const storedSnapshots = localStorage.getItem('astra_gis_simulation_snapshots');
    if (storedSnapshots) {
      try {
        setSimulationSnapshots(JSON.parse(storedSnapshots));
      } catch (e) {
        console.error('Could not load simulation snapshots', e);
      }
    }

    return () => clearInterval(interval);
  }, []);

  // Monitor weatherData changes to trigger toast notifications on extreme conditions
  useEffect(() => {
    if (!weatherData) return;

    const weatherKey = `${weatherData.temp}-${weatherData.windSpeed}-${weatherData.description}-${weatherData.aqi}`;
    if (lastProcessedWeatherRef.current === weatherKey) {
      return;
    }
    lastProcessedWeatherRef.current = weatherKey;

    const extremeAlerts: Array<{ message: string; type: 'warning' | 'error'; title: string }> = [];

    // 1. High Wind Warning (e.g., windSpeed >= 25 km/h)
    if (weatherData.windSpeed >= 25) {
      const type = weatherData.windSpeed >= 40 ? 'error' : 'warning';
      const title = weatherData.windSpeed >= 40 ? 'Extreme Wind Warning' : 'High Wind Advisory';
      extremeAlerts.push({
        title,
        message: `High velocity winds detected: ${weatherData.windSpeed} km/h (direction: ${weatherData.windDir}°). Limit outdoor exposure and secure loose gear.`,
        type
      });
    }

    // 2. Severe Storm Indicator (e.g., weather description contains storm/heavy/violent)
    const desc = weatherData.description.toLowerCase();
    if (
      desc.includes('storm') ||
      desc.includes('thunderstorm') ||
      desc.includes('violent') ||
      desc.includes('heavy rain') ||
      desc.includes('heavy snow') ||
      desc.includes('dense drizzle')
    ) {
      extremeAlerts.push({
        title: 'Severe Weather Warning',
        message: `Dangerous atmospheric system active: "${weatherData.description}". High storm/precipitation intensity.`,
        type: 'error'
      });
    }

    // 3. Extreme Heat / Cold Warnings
    if (weatherData.temp >= 38) {
      extremeAlerts.push({
        title: 'Extreme Heat Advisory',
        message: `Dangerous temperatures reaching ${weatherData.temp}°C (feels like ${weatherData.feelsLike}°C). Risk of thermal exhaustion or dehydration.`,
        type: 'warning'
      });
    } else if (weatherData.temp <= -5) {
      extremeAlerts.push({
        title: 'Extreme Cold Advisory',
        message: `Subzero freeze warning: Temperature is ${weatherData.temp}°C. Risks of frostbite and localized equipment freezing.`,
        type: 'warning'
      });
    }

    // 4. Hazardous Air Quality (AQI > 100)
    if (weatherData.aqi > 100) {
      const isSevere = weatherData.aqi > 150;
      extremeAlerts.push({
        title: isSevere ? 'Hazardous Air Quality Alert' : 'Poor Air Quality Warning',
        message: `Aerosol/PM density is elevated (US AQI: ${weatherData.aqi}). Sensitive groups should wear filtration masks.`,
        type: isSevere ? 'error' : 'warning'
      });
    }

    // Add toast for each active alert
    extremeAlerts.forEach((alert) => {
      addToast(alert.message, alert.type, alert.title);
      postLog('EXTREME_WEATHER_ALERT_TRIGGERED', `${alert.title}: ${alert.message}`);
    });
  }, [weatherData]);

  // Update bookmarks in storage
  const saveBookmark = () => {
    if (!newBookmarkName.trim()) return;
    const item: BookmarkType = {
      id: `bk-${Date.now()}`,
      name: newBookmarkName,
      lat: viewLat,
      lon: viewLon,
      zoom: viewZoom,
      layers: selectedLayers,
      timestamp: new Date().toISOString(),
    };
    const updated = [item, ...bookmarks];
    setBookmarks(updated);
    localStorage.setItem('astra_gis_bookmarks', JSON.stringify(updated));
    setNewBookmarkName('');
    postLog('BOOKMARK_CREATED', `Saved location bookmark "${item.name}"`);
  };

  const deleteBookmark = (id: string, name: string) => {
    const updated = bookmarks.filter((b) => b.id !== id);
    setBookmarks(updated);
    localStorage.setItem('astra_gis_bookmarks', JSON.stringify(updated));
    postLog('BOOKMARK_DELETED', `Deleted location bookmark "${name}"`);
  };

  const restoreBookmark = (b: BookmarkType) => {
    setViewLat(b.lat);
    setViewLon(b.lon);
    setViewZoom(b.zoom);
    setSelectedLayers(b.layers);
    fetchWeather(b.lat, b.lon);
    postLog('BOOKMARK_RESTORED', `Restored view parameters using bookmark "${b.name}"`);
  };

  // Simulation Snapshots persistence and restoration
  const saveSimulationSnapshot = (nameInput?: string) => {
    const name = nameInput || `Scenario ${timelineYear} (${viewLat.toFixed(1)}°, ${viewLon.toFixed(1)}°)`;
    const item: SimulationSnapshot = {
      id: `snap-${Date.now()}`,
      name: name,
      year: timelineYear,
      lat: viewLat,
      lon: viewLon,
      zoom: viewZoom,
      layers: selectedLayers,
      timestamp: new Date().toISOString(),
    };
    const updated = [item, ...simulationSnapshots];
    setSimulationSnapshots(updated);
    localStorage.setItem('astra_gis_simulation_snapshots', JSON.stringify(updated));
    postLog('SIMULATION_SNAPSHOT_CREATED', `Saved simulation snapshot "${item.name}"`);
    addToast(`Saved simulation snapshot "${item.name}"`, 'success', 'Snapshot Captured');
  };

  const deleteSimulationSnapshot = (id: string, name: string) => {
    const updated = simulationSnapshots.filter((s) => s.id !== id);
    setSimulationSnapshots(updated);
    localStorage.setItem('astra_gis_simulation_snapshots', JSON.stringify(updated));
    postLog('SIMULATION_SNAPSHOT_DELETED', `Deleted simulation snapshot "${name}"`);
    addToast(`Deleted snapshot "${name}"`, 'info', 'Snapshot Removed');
  };

  const restoreSimulationSnapshot = (s: SimulationSnapshot) => {
    setTimelineYear(s.year);
    setViewLat(s.lat);
    setViewLon(s.lon);
    setViewZoom(s.zoom);
    setSelectedLayers(s.layers);
    fetchWeather(s.lat, s.lon);
    postLog('SIMULATION_SNAPSHOT_RESTORED', `Restored simulation state for year ${s.year} at ${s.lat.toFixed(1)}°, ${s.lon.toFixed(1)}°`);
    addToast(`Restored state for Year ${s.year}`, 'success', 'Snapshot Restored');
  };

  // Import Custom GeoJSON polygon datasets
  const handleImportGeoJSON = (geojson: any) => {
    const importedElements: DrawingElement[] = [];
    if (geojson.type === 'FeatureCollection' && geojson.features) {
      geojson.features.forEach((feat: any, idx: number) => {
        const geom = feat.geometry || {};
        const props = feat.properties || {};
        if (geom.type === 'Polygon' && geom.coordinates) {
          importedElements.push({
            id: `imported-${Date.now()}-${idx}`,
            type: 'polygon',
            coordinates: geom.coordinates[0],
            color: props.color || 'rgba(56, 189, 248, 0.3)',
            label: props.label || `Imported AOI #${idx + 1}`,
          });
        } else if (geom.type === 'LineString' && geom.coordinates) {
          importedElements.push({
            id: `imported-${Date.now()}-${idx}`,
            type: 'line',
            coordinates: geom.coordinates,
            color: props.color || '#38bdf8',
            label: props.label || `Imported Track #${idx + 1}`,
          });
        } else if (geom.type === 'Point' && geom.coordinates) {
          importedElements.push({
            id: `imported-${Date.now()}-${idx}`,
            type: 'marker',
            coordinates: [[geom.coordinates[1], geom.coordinates[0]]],
            color: props.color || '#ef4444',
            label: props.label || `Imported Landmark #${idx + 1}`,
          });
        }
      });
    }

    if (importedElements.length > 0) {
      setDrawings([...drawings, ...importedElements]);
      postLog('GEOJSON_IMPORTED', `Loaded ${importedElements.length} vector features from external GeoJSON pipeline.`);
    }
  };

  const getModuleIcon = (moduleId: string) => {
    switch (moduleId) {
      case 'weather': return <Sun className="w-3.5 h-3.5 text-amber-400" />;
      case 'disaster': return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'space': return <Orbit className="w-3.5 h-3.5 text-sky-400" />;
      case 'analytics': return <Layers className="w-3.5 h-3.5 text-emerald-400" />;
      case 'logs': return <Shield className="w-3.5 h-3.5 text-slate-400" />;
      case 'bookmarks': return <BookMarked className="w-3.5 h-3.5 text-indigo-400" />;
      default: return null;
    }
  };

  const getModuleTitle = (moduleId: string) => {
    switch (moduleId) {
      case 'weather': return 'Tactical Watch';
      case 'disaster': return 'Disaster Center';
      case 'space': return 'Orbital Space';
      case 'analytics': return 'Geo-Analytics';
      case 'logs': return 'Governance Logs';
      case 'bookmarks': return 'Bookmarks';
      default: return moduleId;
    }
  };

  const renderModuleContent = (moduleId: string) => {
    switch (moduleId) {
      case 'weather':
        return (
          <SidebarWeather
            lat={viewLat}
            lon={viewLon}
            weatherData={weatherData}
            isLoading={isWeatherLoading}
            onSelectCity={(lat, lon) => {
              setViewLat(lat);
              setViewLon(lon);
              fetchWeather(lat, lon);
              postLog('SPATIAL_SELECTION', `Adjusted map focus point to preset coordinate location: ${lat}°, ${lon}°`);
            }}
            realtimeWeatherOverlayEnabled={realtimeWeatherOverlayEnabled}
            onToggleRealtimeWeatherOverlay={() => {
              const nextState = !realtimeWeatherOverlayEnabled;
              setRealtimeWeatherOverlayEnabled(nextState);
              postLog('REALTIME_WEATHER_OVERLAY_TOGGLED', `Real-time weather data canvas projection toggled ${nextState ? 'ON' : 'OFF'}`);
            }}
            onSimulateExtreme={simulateExtremeWeather}
          />
        );
      case 'disaster':
        return (
          <SidebarDisasters
            disasters={disasters}
            selectedDisaster={selectedDisaster}
            onSelectDisaster={setSelectedDisaster}
            onCenterMap={(lat, lon) => {
              setViewLat(lat);
              setViewLon(lon);
              fetchWeather(lat, lon);
            }}
            onRunAiMitigation={handleRunAiMitigation}
            isGeneratingMitigation={isGeneratingMitigation}
            mitigationReport={mitigationReport}
          />
        );
      case 'space':
        return (
          <SidebarSpace
            satellites={satellites}
            selectedSat={selectedSat}
            onSelectSat={setSelectedSat}
            onCenterMap={(lat, lon) => {
              setViewLat(lat);
              setViewLon(lon);
              fetchWeather(lat, lon);
            }}
            conjunctionAlert={conjunctionAlert}
            orbitalPredictorEnabled={orbitalPredictorEnabled}
            onToggleOrbitalPredictor={() => {
              const newState = !orbitalPredictorEnabled;
              setOrbitalPredictorEnabled(newState);
              postLog('ORBITAL_PREDICTOR_TOGGLED', `Orbital Predictor projection toggled ${newState ? 'ON' : 'OFF'}`);
            }}
            decayTrajectoryEnabled={decayTrajectoryEnabled}
            onToggleDecayTrajectory={() => {
              const newState = !decayTrajectoryEnabled;
              setDecayTrajectoryEnabled(newState);
              postLog('DECAY_TRAJECTORY_TOGGLED', `Atmospheric decay trajectory overlay toggled ${newState ? 'ON' : 'OFF'}`);
            }}
            timelineYear={timelineYear}
            onActiveDebrisRemoval={(debrisName) => {
              setSatellites((prev) => prev.filter((s) => s.name !== debrisName));
              if (conjunctionAlert && conjunctionAlert.satelliteB === debrisName) {
                setConjunctionAlert(null);
              }
              if (selectedSat && selectedSat.name === debrisName) {
                setSelectedSat(null);
              }
              fetchAuditLogs();
            }}
          />
        );
      case 'analytics':
        return (
          <SidebarAnalytics
            selectedLayers={selectedLayers}
            onToggleLayer={(id) => {
              setSelectedLayers((prev) =>
                prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
              );
            }}
            drawings={drawings}
            disasters={disasters}
            onImportGeoJSON={handleImportGeoJSON}
            onSelectRole={(role) => {
              setActiveRole(role);
              postLog('ROLE_MODAL_SHIFT', `Switched ASTRA-X session clearance level to ${role.toUpperCase()}`);
            }}
            activeRole={activeRole}
            isAnalyzing={isAnalyzing}
            onRunAnalytics={handleRunAnalytics}
            analyticsOutput={analyticsOutput}
            aiInsightsSummary={aiInsightsSummary}
          />
        );
      case 'logs':
        return <AuditLogViewer logs={auditLogs} />;
      case 'bookmarks':
        return (
          <div className="bg-slate-900/40 p-4 flex flex-col gap-3">
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Save current coordinates..."
                value={newBookmarkName}
                onChange={(e) => setNewBookmarkName(e.target.value)}
                className="grow bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-700"
              />
              <button
                onClick={saveBookmark}
                className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-3 rounded transition font-mono animate-pulse"
              >
                SAVE
              </button>
            </div>

            {bookmarks.length > 0 && (
              <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {bookmarks.map((b) => (
                  <div key={b.id} className="flex justify-between items-center bg-slate-950/60 p-2 rounded border border-slate-850">
                    <button
                      onClick={() => restoreBookmark(b)}
                      className="text-left text-[11px] font-mono text-slate-300 hover:text-white truncate grow mr-2"
                    >
                      {b.name}
                    </button>
                    <button
                      onClick={() => deleteBookmark(b.id, b.name)}
                      className="text-[10px] text-slate-500 hover:text-rose-400 px-2 font-mono transition"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans">
      
      {/* Top Banner Control Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap gap-4 items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-600/15 rounded-lg border border-sky-500/25 text-sky-400">
            <GlobeIcon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              ASTRA-X <span className="text-xs bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20 font-mono">GIS MODULE</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Geospatial, Atmospheric & Orbital Situational Intelligence
            </p>
          </div>
        </div>

        {/* Global Tab Navigation */}
        <div className="flex gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-850 relative z-0">
          {(['weather', 'disaster', 'space', 'analytics', 'logs'] as const).map((tabId) => {
            const isActive = activeTab === tabId;
            const getTabLabel = () => {
              if (tabId === 'weather') return 'Tactical Watch';
              if (tabId === 'disaster') return 'Disaster Center';
              if (tabId === 'space') return 'Orbital Space';
              if (tabId === 'analytics') return 'Geo-Analytics';
              return 'Governance';
            };
            const getTabColorClass = () => {
              if (tabId === 'weather') return 'text-sky-400 font-bold';
              if (tabId === 'disaster') return 'text-rose-400 font-bold';
              if (tabId === 'space') return 'text-yellow-400 font-bold';
              if (tabId === 'analytics') return 'text-emerald-400 font-bold';
              return 'text-slate-300 font-bold';
            };
            return (
              <button
                key={tabId}
                onClick={() => selectTabModule(tabId)}
                className={`px-3 py-1.5 rounded text-xs font-medium relative transition duration-200 focus:outline-none ${
                  isActive ? `${getTabColorClass()}` : 'text-slate-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="globalActiveTab"
                    className="absolute inset-0 bg-slate-800 rounded shadow"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{getTabLabel()}</span>
              </button>
            );
          })}
          
          <button
            onClick={() => {
              setIsAtmosphereOpen(true);
              postLog('ATMOSPHERE_LAUNCHED', 'Opened the multi-dimensional 3D Atmosphere Explorer profile screen');
            }}
            className="px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 bg-gradient-to-r from-sky-600/10 to-indigo-600/15 border border-sky-500/25 text-sky-400 hover:from-sky-600/20 hover:to-indigo-600/30 shadow-[0_0_10px_rgba(56,189,248,0.05)]"
          >
            <Wind className="w-3.5 h-3.5 animate-pulse text-sky-400" />
            Atmosphere 3D
          </button>
        </div>
      </header>

      {/* Main Multi-Column Workspace Grid */}
      <main className="grow p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Column Controls / Active Tab Panel - Drag-and-Drop Reorderable Modules Stack */}
        <section className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-140px)] pr-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {/* Draggable panel layout configuration header */}
          <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between px-2.5 py-1.5 bg-slate-950/40 rounded-lg border border-slate-900 shrink-0 select-none">
            <span className="flex items-center gap-1.5">
              <GripVertical className="w-3 h-3 text-slate-600 animate-pulse" />
              DRAG PANELS TO PRIORITIZE WORKSPACE
            </span>
            <button
              onClick={() => {
                setSidebarOrder(['weather', 'disaster', 'space', 'analytics', 'logs', 'bookmarks']);
                setCollapsedModules({
                  weather: false,
                  disaster: true,
                  space: true,
                  analytics: true,
                  logs: true,
                  bookmarks: false,
                });
                localStorage.removeItem('astra_gis_sidebar_order');
                localStorage.removeItem('astra_gis_sidebar_collapsed');
                addToast('Reset workspace panels to defaults', 'info', 'Workspace Reset');
                postLog('WORKSPACE_RESET', 'User reset sidebar modules order to default system configuration.');
              }}
              className="text-[9px] text-sky-500 hover:text-sky-400 font-bold transition focus:outline-none"
            >
              RESET
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {sidebarOrder.map((moduleId, index) => (
              <motion.div
                key={moduleId}
                id={`sidebar-module-${moduleId}`}
                layout
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                className={`relative flex flex-col rounded-xl border ${
                  draggedIndex === index
                    ? 'opacity-40 scale-[0.98] border-sky-500/50 bg-slate-950/40'
                    : collapsedModules[moduleId]
                    ? 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700/80 shadow-md'
                    : 'border-slate-800 bg-slate-900/30 shadow-xl'
                }`}
              >
                {/* Panel drag header block */}
                <div
                  onClick={() => toggleCollapse(moduleId)}
                  className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/85 rounded-t-xl select-none cursor-grab active:cursor-grabbing group border-b border-slate-900"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded hover:bg-slate-800 transition cursor-grab" title="Drag to reorder panel">
                      <GripVertical className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition" />
                    </div>
                    <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-slate-400 group-hover:text-slate-200 transition flex items-center gap-1.5">
                      {getModuleIcon(moduleId)}
                      {getModuleTitle(moduleId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Active state indicator dot */}
                    {!collapsedModules[moduleId] && (
                      <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" title="Active Module Panel" />
                    )}
                    <button
                      onClick={() => toggleCollapse(moduleId)}
                      className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition focus:outline-none"
                      title={collapsedModules[moduleId] ? 'Expand Panel' : 'Collapse Panel'}
                    >
                      {collapsedModules[moduleId] ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Smooth animated panel container body */}
                <AnimatePresence initial={false}>
                  {!collapsedModules[moduleId] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="p-1">
                        {renderModuleContent(moduleId)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Right Column Interactive Map Viewer */}
        <section className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6 overflow-hidden">
          <div className="grow rounded-xl relative overflow-hidden bg-slate-950">
            <GlobeRenderer
              satellites={satellites}
              disasters={disasters}
              selectedSat={selectedSat}
              onSelectSat={setSelectedSat}
              selectedDisaster={selectedDisaster}
              onSelectDisaster={setSelectedDisaster}
              selectedLayers={selectedLayers}
              timelineOffset={0}
              is3D={is3D}
              setIs3D={setIs3D}
              drawings={drawings}
              setDrawings={setDrawings}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              viewLat={viewLat}
              viewLon={viewLon}
              viewZoom={viewZoom}
              setViewLat={setViewLat}
              setViewLon={setViewLon}
              setViewZoom={setViewZoom}
              onCoordinateClick={(lat, lon) => {
                setViewLat(lat);
                setViewLon(lon);
                fetchWeather(lat, lon);
                postLog('SPATIAL_COORDINATES_INSPECTED', `User inspected location coordinate values: ${lat}°, ${lon}°`);
              }}
              timelineSpeed={timelineSpeed}
              timelineYear={timelineYear}
              orbitalPredictorEnabled={orbitalPredictorEnabled}
              decayTrajectoryEnabled={decayTrajectoryEnabled}
              realtimeWeatherOverlayEnabled={realtimeWeatherOverlayEnabled}
              weatherData={weatherData}
            />
          </div>

          {/* 4D Simulation Timeline Scrubber Rail */}
          <footer className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  4D Climate & Kessler Orbit Simulation
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTimelineSpeed((prev) => (prev > 0 ? 0 : 5))}
                  className="bg-slate-950 hover:bg-slate-800 p-1.5 rounded transition text-slate-300 flex items-center gap-1.5 text-xs font-mono border border-slate-850"
                >
                  {timelineSpeed > 0 ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /> PAUSE SCENARIOS
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" /> ACTIVE SIMULATION
                    </>
                  )}
                </button>
                <button
                  onClick={() => saveSimulationSnapshot()}
                  className="bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white px-2.5 py-1.5 rounded transition flex items-center gap-1.5 text-xs font-mono border border-sky-500/20 shadow-lg shadow-sky-500/10"
                  title="Save current year, active layers, and coordinates as a Simulation Snapshot"
                >
                  <Camera className="w-3.5 h-3.5" /> SAVE SNAPSHOT
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-slate-500 uppercase w-20">
                Timeline Year:
              </span>
              <input
                type="range"
                min="2016"
                max="2036"
                step="1"
                value={timelineYear}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTimelineYear(val);
                  postLog('TIMELINE_SCRUBBED', `Time-series simulation year shifted to: ${val}`);
                }}
                className="grow h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="text-sm font-mono font-bold text-sky-400 bg-sky-950/30 px-3 py-1 rounded border border-sky-500/15">
                {timelineYear} {timelineYear === 2026 ? '(PRESENT)' : timelineYear < 2026 ? '(HISTORICAL)' : '(FUTURE MODEL)'}
              </span>
            </div>

            {/* Simulation Snapshots List */}
            {simulationSnapshots.length > 0 && (
              <div className="border-t border-slate-800/80 pt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                    Simulation Snapshots ({simulationSnapshots.length})
                  </span>
                  <button
                    onClick={() => {
                      setSimulationSnapshots([]);
                      localStorage.removeItem('astra_gis_simulation_snapshots');
                      postLog('SIMULATION_SNAPSHOT_CLEARED', 'Cleared all simulation snapshots');
                      addToast('Cleared all snapshots', 'info', 'Snapshots Cleared');
                    }}
                    className="text-[9px] font-mono text-slate-500 hover:text-red-400 transition"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {simulationSnapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="flex items-center gap-2 bg-slate-950/80 hover:bg-slate-850/90 border border-slate-800/80 hover:border-sky-500/30 rounded-lg px-2.5 py-1.5 transition text-xs shrink-0 group shadow-md"
                    >
                      <button
                        onClick={() => restoreSimulationSnapshot(snap)}
                        className="text-left font-mono flex flex-col focus:outline-none"
                      >
                        <span className="font-bold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse"></span>
                          {snap.name}
                        </span>
                        <span className="text-[9px] text-slate-500 mt-0.5">
                          Year {snap.year} • {snap.lat.toFixed(1)}°, {snap.lon.toFixed(1)}°
                        </span>
                      </button>
                      <button
                        onClick={() => deleteSimulationSnapshot(snap.id, snap.name)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition ml-1 focus:outline-none"
                        title="Delete snapshot"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Simulation Context Legend */}
            <div className="text-[10px] font-mono text-slate-500 flex justify-between pt-1">
              <span>● 2016: Cooler temperature metrics, standard debris counts.</span>
              <span>● 2026: Live satellite streams, current weather feeds.</span>
              <span>● 2036: Kessler debris cloud multiplication, global warming adjustments (+1.5°C).</span>
            </div>
          </footer>
        </section>
      </main>

      {/* Atmospheric Science Explorer Immersive Modal */}
      {isAtmosphereOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <AtmosphereExplorer onClose={() => setIsAtmosphereOpen(false)} />
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-3 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className={`p-4 rounded-xl border shadow-2xl backdrop-blur-md flex gap-3 pointer-events-auto overflow-hidden relative ${
                toast.type === 'error'
                  ? 'bg-red-950/85 border-red-500/40 text-red-100 shadow-red-950/20'
                  : toast.type === 'warning'
                  ? 'bg-amber-950/85 border-amber-500/40 text-amber-100 shadow-amber-950/20'
                  : toast.type === 'success'
                  ? 'bg-emerald-950/85 border-emerald-500/40 text-emerald-100 shadow-emerald-950/20'
                  : 'bg-slate-900/90 border-slate-700/55 text-slate-100 shadow-slate-950/30'
              }`}
            >
              {/* Colored Side Bar */}
              <div
                className={`absolute top-0 left-0 bottom-0 w-1 ${
                  toast.type === 'error'
                    ? 'bg-red-500'
                    : toast.type === 'warning'
                    ? 'bg-amber-500'
                    : toast.type === 'success'
                    ? 'bg-emerald-500'
                    : 'bg-sky-500'
                }`}
              />
              
              <div className="shrink-0 mt-0.5">
                {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
              </div>

              <div className="grow flex flex-col gap-0.5">
                {toast.title && (
                  <h4 className="text-xs font-bold font-sans uppercase tracking-wider">
                    {toast.title}
                  </h4>
                )}
                <p className="text-[11px] leading-relaxed opacity-90 font-mono">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-white transition p-0.5 self-start rounded hover:bg-slate-800/50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
