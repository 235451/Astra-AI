/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RefreshCw, ZoomIn, ZoomOut, Move, Navigation, Layers, Compass, Tag, Orbit, Trash2, ShieldAlert, Globe, Flame, Activity, AlertTriangle, Wind, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SatelliteTelemetry, DisasterEvent, DrawingElement, Bookmark, WeatherData } from '../types';

interface GlobeRendererProps {
  satellites: SatelliteTelemetry[];
  disasters: DisasterEvent[];
  selectedSat: SatelliteTelemetry | null;
  onSelectSat: (sat: SatelliteTelemetry | null) => void;
  selectedDisaster: DisasterEvent | null;
  onSelectDisaster: (dis: DisasterEvent | null) => void;
  selectedLayers: string[];
  timelineOffset: number; // minutes from present
  is3D: boolean;
  setIs3D: (val: boolean) => void;
  drawings: DrawingElement[];
  setDrawings: React.Dispatch<React.SetStateAction<DrawingElement[]>>;
  activeTool: 'none' | 'marker' | 'line' | 'polygon' | 'measure';
  setActiveTool: (tool: 'none' | 'marker' | 'line' | 'polygon' | 'measure') => void;
  viewLat: number;
  viewLon: number;
  viewZoom: number;
  setViewLat: (lat: number) => void;
  setViewLon: (lon: number) => void;
  setViewZoom: (zoom: number) => void;
  onCoordinateClick: (lat: number, lon: number) => void;
  timelineSpeed: number; // 0 (paused) to 10
  timelineYear: number;
  orbitalPredictorEnabled?: boolean;
  decayTrajectoryEnabled?: boolean;
  realtimeWeatherOverlayEnabled?: boolean;
  weatherData?: WeatherData | null;
}

// Low-resolution mathematical vector approximations of major continents for custom 3D sphere projection
const CONTINENTS: Array<Array<[number, number]>> = [
  // North America
  [[-168, 65], [-120, 70], [-80, 75], [-60, 60], [-55, 50], [-95, 15], [-110, 15], [-115, 30], [-125, 48], [-160, 58], [-168, 65]],
  // Greenland
  [[-70, 70], [-60, 80], [-30, 80], [-40, 60], [-50, 60], [-70, 70]],
  // South America
  [[-80, 10], [-40, -5], [-35, -5], [-40, -20], [-65, -53], [-75, -45], [-80, -15], [-80, 10]],
  // Africa
  [[-15, 15], [0, 35], [30, 30], [50, 10], [40, -20], [20, -35], [10, -30], [-10, 5], [-15, 15]],
  // Europe / Asia (Eurasia)
  [[0, 50], [10, 60], [30, 70], [60, 75], [90, 75], [120, 75], [170, 65], [140, 35], [120, 30], [100, 15], [80, 10], [60, 25], [45, 15], [35, 30], [30, 40], [15, 40], [0, 50]],
  // India
  [[70, 20], [78, 8], [85, 20]],
  // Indochina & Southeast Asia
  [[100, 20], [108, 10], [105, 1], [98, 8], [100, 20]],
  // Australia
  [[113, -25], [143, -15], [151, -33], [140, -38], [115, -34], [113, -25]],
  // Antarctica
  [[-180, -80], [-120, -75], [-60, -75], [0, -72], [60, -75], [120, -75], [180, -80]]
];

/**
 * Predicts the future orbital track points for a satellite over a given duration.
 * Uses a simplified circular Keplerian ground track model that accounts for the
 * satellite's inclination, speed, altitude, and the Earth's diurnal rotation.
 */
function predictFuturePath(sat: SatelliteTelemetry, stepsCount = 100, stepMin = 1.5): Array<[number, number]> {
  const futurePoints: Array<[number, number]> = [];
  const Re = 6371; // Earth mean radius in km
  const H = sat.alt || 400; // default 400km LEO altitude
  const R = Re + H;
  const v = sat.velocity || 27000; // velocity in km/h
  const omega = v / R; // angular velocity in rad/hour
  const incRad = (sat.inclination || 45) * Math.PI / 180; // inclination in radians

  // Derive initial orbital phase (theta_0) from current latitude
  const latRad = (sat.lat || 0) * Math.PI / 180;
  const sinInc = Math.sin(incRad);
  let theta0 = 0;
  
  if (Math.abs(sinInc) > 0.01) {
    const val = Math.sin(latRad) / sinInc;
    theta0 = Math.asin(Math.max(-1, Math.min(1, val)));
  } else {
    theta0 = (sat.lon || 0) * Math.PI / 180;
  }

  // Check if satellite has a downward direction by looking at past path points
  let isDescending = false;
  if (sat.orbitPath && sat.orbitPath.length > 1) {
    const p1 = sat.orbitPath[0];
    const p2 = sat.orbitPath[sat.orbitPath.length - 1];
    if (p2[0] < p1[0]) {
      isDescending = true;
    }
  }
  if (isDescending) {
    theta0 = Math.PI - theta0;
  }

  const lon0Rad = (sat.lon || 0) * Math.PI / 180;
  const omegaEarth = 2 * Math.PI / 24; // Earth's rotation rate in rad/hour

  for (let step = 0; step <= stepsCount; step++) {
    const tMin = step * stepMin;
    const tHours = tMin / 60;
    
    // Keplerian orbital position phase
    const theta = theta0 + omega * tHours;
    
    // Latitude derived from inclination and argument of latitude
    const futureLatRad = Math.asin(Math.sin(incRad) * Math.sin(theta));
    const futureLat = futureLatRad * 180 / Math.PI;

    // Relative longitude inside the orbit's coordinate reference plane
    const relLon0Rad = Math.atan2(Math.cos(incRad) * Math.sin(theta0), Math.cos(theta0));
    let relLonRad = Math.atan2(Math.cos(incRad) * Math.sin(theta), Math.cos(theta));
    if (isNaN(relLonRad)) {
      relLonRad = theta;
    }
    
    // Westward drift due to Earth's rotation
    const driftRad = omegaEarth * tHours;
    const futureLonRad = lon0Rad + (relLonRad - relLon0Rad) - driftRad;
    
    // Normalize longitude to [-180, 180] degrees
    let futureLon = (futureLonRad * 180 / Math.PI) % 360;
    if (futureLon > 180) futureLon -= 360;
    if (futureLon < -180) futureLon += 360;

    futurePoints.push([futureLat, futureLon]);
  }
  
  return futurePoints;
}

/**
 * Simulates a spiraling decay trajectory for a space debris object down to the 80km atmospheric entry point.
 */
function predictDecayPath(sat: SatelliteTelemetry, stepsCount = 120): Array<{ coords: [number, number]; alt: number }> {
  const points: Array<{ coords: [number, number]; alt: number }> = [];
  const Re = 6371; // Earth mean radius in km
  const startH = sat.alt || 400; // default 400km LEO altitude
  const incRad = (sat.inclination || 45) * Math.PI / 180; // inclination in radians

  // Derive initial orbital phase (theta_0) from current latitude
  const latRad = (sat.lat || 0) * Math.PI / 180;
  const sinInc = Math.sin(incRad);
  let theta0 = 0;
  
  if (Math.abs(sinInc) > 0.01) {
    const val = Math.sin(latRad) / sinInc;
    theta0 = Math.asin(Math.max(-1, Math.min(1, val)));
  } else {
    theta0 = (sat.lon || 0) * Math.PI / 180;
  }

  // Check if descending
  let isDescending = false;
  if (sat.orbitPath && sat.orbitPath.length > 1) {
    const p1 = sat.orbitPath[0];
    const p2 = sat.orbitPath[sat.orbitPath.length - 1];
    if (p2[0] < p1[0]) {
      isDescending = true;
    }
  }
  if (isDescending) {
    theta0 = Math.PI - theta0;
  }

  const lon0Rad = (sat.lon || 0) * Math.PI / 180;
  const omegaEarth = 2 * Math.PI / 24; // Earth's rotation rate in rad/hour
  const vStart = sat.velocity || 27000; // velocity in km/h

  for (let step = 0; step <= stepsCount; step++) {
    const progress = step / stepsCount;
    // Decaying altitude from current down to 80 km
    const H = startH - (startH - 80) * progress;
    const R = Re + H;
    
    // As altitude decays, orbital speed increases, creating tighter spirals
    const currentV = vStart * Math.sqrt((Re + startH) / R);
    const omega = currentV / R; // rad/hour

    const tHours = (progress * 1.5); // total simulation duration is 1.5 hours
    const theta = theta0 + omega * tHours;

    const futureLatRad = Math.asin(Math.sin(incRad) * Math.sin(theta));
    const futureLat = futureLatRad * 180 / Math.PI;

    const relLon0Rad = Math.atan2(Math.cos(incRad) * Math.sin(theta0), Math.cos(theta0));
    let relLonRad = Math.atan2(Math.cos(incRad) * Math.sin(theta), Math.cos(theta));
    if (isNaN(relLonRad)) {
      relLonRad = theta;
    }
    
    const driftRad = omegaEarth * tHours;
    const futureLonRad = lon0Rad + (relLonRad - relLon0Rad) - driftRad;
    
    let futureLon = (futureLonRad * 180 / Math.PI) % 360;
    if (futureLon > 180) futureLon -= 360;
    if (futureLon < -180) futureLon += 360;

    points.push({ coords: [futureLat, futureLon], alt: H });
  }

  return points;
}

export const GlobeRenderer: React.FC<GlobeRendererProps> = ({
  satellites,
  disasters,
  selectedSat,
  onSelectSat,
  selectedDisaster,
  onSelectDisaster,
  selectedLayers,
  timelineOffset,
  is3D,
  setIs3D,
  drawings,
  setDrawings,
  activeTool,
  setActiveTool,
  viewLat,
  viewLon,
  viewZoom,
  setViewLat,
  setViewLon,
  setViewZoom,
  onCoordinateClick,
  timelineSpeed,
  timelineYear,
  orbitalPredictorEnabled = false,
  decayTrajectoryEnabled = false,
  realtimeWeatherOverlayEnabled = false,
  weatherData = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Projection rotation angles
  const [rotationYaw, setRotationYaw] = useState<number>(0);   // longitude rotation
  const [rotationPitch, setRotationPitch] = useState<number>(30); // latitude rotation
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef({ x: 0, y: 0, yaw: 0, pitch: 0 });
  const [measurePoints, setMeasurePoints] = useState<Array<[number, number]>>([]);
  const [measureResult, setMeasureResult] = useState<{ distance: number; bearing: number } | null>(null);

  // Hover tracking states for animated tooltips
  const [hoveredSat, setHoveredSat] = useState<SatelliteTelemetry | null>(null);
  const [hoveredDisaster, setHoveredDisaster] = useState<DisasterEvent | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  // Real-time original high-resolution globe data state
  const [geojsonData, setGeojsonData] = useState<any | null>(null);

  // Floating map legend collapse state
  const [isLegendCollapsed, setIsLegendCollapsed] = useState<boolean>(false);

  useEffect(() => {
    fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_land.geojson')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load live geodata');
        return res.json();
      })
      .then((data) => {
        setGeojsonData(data);
      })
      .catch((err) => {
        console.error('Failed to fetch real-time high-fidelity globe, using local vector fallback:', err);
      });
  }, []);

  // Sync rotationYaw/Pitch to viewLat/viewLon when updated externally
  useEffect(() => {
    setRotationYaw(-viewLon);
    setRotationPitch(viewLat);
  }, [viewLat, viewLon]);

  // Keep Earth rotating when timeline is running
  useEffect(() => {
    if (timelineSpeed === 0) return;
    let animId: number;
    const rotate = () => {
      setRotationYaw((prev) => (prev + timelineSpeed * 0.05) % 360);
      animId = requestAnimationFrame(rotate);
    };
    animId = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(animId);
  }, [timelineSpeed]);

  // Great-Circle calculation for professional GIS measurements
  const calculateGreatCircle = (p1: [number, number], p2: [number, number]) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
    const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Bearing calculation
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

    return { distance, bearing };
  };

  // Convert Spherical Lat/Lon into 3D Cartesian Coordinate
  const latLonTo3D = (lat: number, lon: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + rotationYaw) * (Math.PI / 180);

    // Dynamic rotation pitching
    const pitchRad = rotationPitch * (Math.PI / 180);

    const x0 = radius * Math.sin(phi) * Math.sin(theta);
    const y0 = radius * Math.cos(phi);
    const z0 = radius * Math.sin(phi) * Math.cos(theta);

    // Apply rotation about X-axis (Pitch)
    const x = x0;
    const y = y0 * Math.cos(pitchRad) - z0 * Math.sin(pitchRad);
    const z = y0 * Math.sin(pitchRad) + z0 * Math.cos(pitchRad);

    return { x, y, z, visible: z > 0 }; // If z > 0, it's on the front-facing hemisphere
  };

  // Drag and Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDragging(true);
    dragStart.current = { x, y, yaw: rotationYaw, pitch: rotationPitch };
    
    // Clear hover tooltips immediately when dragging starts
    setHoveredSat(null);
    setHoveredDisaster(null);
    setHoverPosition(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      const dx = x - dragStart.current.x;
      const dy = y - dragStart.current.y;

      // Rotate globe based on mouse dragging speed
      const sensitivity = 0.5;
      let newYaw = (dragStart.current.yaw + dx * sensitivity) % 360;
      if (newYaw < 0) {
        newYaw += 360;
      }
      let newPitch = dragStart.current.pitch - dy * sensitivity;
      newPitch = Math.max(-85, Math.min(85, newPitch)); // clamp pitch to prevent flipping

      setRotationYaw(newYaw);
      setRotationPitch(newPitch);

      // Normalize longitude for user view state
      let calculatedLon = -newYaw;
      calculatedLon = ((calculatedLon + 180) % 360 + 360) % 360 - 180;

      setViewLon(Number(calculatedLon.toFixed(1)));
      setViewLat(Number(newPitch.toFixed(1)));

      setHoveredSat(null);
      setHoveredDisaster(null);
      setHoverPosition(null);
    } else {
      // Hover hit detection when not dragging
      const baseRadius = Math.min(rect.width, rect.height) * 0.35;
      const zoomScale = is3D ? (1 + (viewZoom - 3) * 0.15) : Math.pow(1.15, viewZoom - 1);
      const radius = baseRadius * zoomScale;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const projectLocal = (lat: number, lon: number) => {
        if (is3D) {
          const coord = latLonTo3D(lat, lon, radius);
          return {
            x: cx + coord.x,
            y: cy + coord.y,
            visible: coord.visible,
          };
        } else {
          const px = cx + ((lon + rotationYaw) / 180) * (rect.width * 0.35 * zoomScale);
          const py = cy - (lat / 90) * (rect.height * 0.35 * zoomScale);
          return { x: px, y: py, visible: true };
        }
      };

      let matchedSat: SatelliteTelemetry | null = null;
      let matchedDisaster: DisasterEvent | null = null;
      let matchedPos: { x: number; y: number } | null = null;
      let minDistance = 14; // pixels hover range

      // Check disasters first
      disasters.forEach((dis) => {
        const pt = projectLocal(dis.lat, dis.lon);
        if (pt.visible) {
          const dist = Math.sqrt(Math.pow(pt.x - x, 2) + Math.pow(pt.y - y, 2));
          if (dist < minDistance) {
            minDistance = dist;
            matchedDisaster = dis;
            matchedSat = null;
            matchedPos = { x: pt.x, y: pt.y };
          }
        }
      });

      // Check satellites
      satellites.forEach((sat) => {
        const pt = projectLocal(sat.lat, sat.lon);
        if (pt.visible) {
          const dist = Math.sqrt(Math.pow(pt.x - x, 2) + Math.pow(pt.y - y, 2));
          if (dist < minDistance) {
            minDistance = dist;
            matchedSat = sat;
            matchedDisaster = null;
            matchedPos = { x: pt.x, y: pt.y };
          }
        }
      });

      setHoveredSat(matchedSat);
      setHoveredDisaster(matchedDisaster);
      setHoverPosition(matchedPos);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check click hit target (coordinates mapping)
    const clickLatLon = getCoordsFromCanvas(clickX, clickY);
    if (clickLatLon) {
      const [lat, lon] = clickLatLon;

      if (activeTool === 'measure') {
        const newPoints = [...measurePoints, [lat, lon] as [number, number]];
        if (newPoints.length > 2) {
          setMeasurePoints([[lat, lon]]);
          setMeasureResult(null);
        } else {
          setMeasurePoints(newPoints);
          if (newPoints.length === 2) {
            setMeasureResult(calculateGreatCircle(newPoints[0], newPoints[1]));
          }
        }
      } else if (activeTool === 'marker') {
        const marker: DrawingElement = {
          id: `draw-${Date.now()}`,
          type: 'marker',
          coordinates: [[lat, lon]],
          color: '#ef4444',
          label: `Zone ${drawings.length + 1}`,
        };
        setDrawings([...drawings, marker]);
        setActiveTool('none');
      } else if (activeTool === 'line') {
        if (measurePoints.length === 0) {
          setMeasurePoints([[lat, lon]]);
        } else {
          const line: DrawingElement = {
            id: `draw-${Date.now()}`,
            type: 'line',
            coordinates: [measurePoints[0], [lat, lon]],
            color: '#3b82f6',
            label: `Sector Line ${drawings.length + 1}`,
          };
          setDrawings([...drawings, line]);
          setMeasurePoints([]);
          setActiveTool('none');
        }
      } else if (activeTool === 'polygon') {
        if (measurePoints.length < 3) {
          setMeasurePoints([...measurePoints, [lat, lon]]);
        } else {
          const poly: DrawingElement = {
            id: `draw-${Date.now()}`,
            type: 'polygon',
            coordinates: [...measurePoints, [lat, lon]],
            color: 'rgba(16, 185, 129, 0.3)',
            label: `AOI Region ${drawings.length + 1}`,
          };
          setDrawings([...drawings, poly]);
          setMeasurePoints([]);
          setActiveTool('none');
        }
      } else {
        // Standard Coordinate inspection
        onCoordinateClick(lat, lon);

        // Click Satellite hit test
        let foundSat = false;
        satellites.forEach((sat) => {
          const dist = Math.sqrt(Math.pow(sat.lat - lat, 2) + Math.pow(sat.lon - lon, 2));
          if (dist < 8) {
            onSelectSat(sat);
            foundSat = true;
          }
        });
        if (!foundSat) {
          onSelectSat(null);
        }

        // Click Disaster hit test
        let foundDis = false;
        disasters.forEach((dis) => {
          const dist = Math.sqrt(Math.pow(dis.lat - lat, 2) + Math.pow(dis.lon - lon, 2));
          if (dist < 6) {
            onSelectDisaster(dis);
            foundDis = true;
          }
        });
        if (!foundDis) {
          onSelectDisaster(null);
        }
      }
    }
  };

  // Convert canvas pixel back to latitude/longitude (simplified map/orthographic inverse mapping)
  const getCoordsFromCanvas = (x: number, y: number): [number, number] | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    if (is3D) {
      // Orthographic Globe Inverse
      const r = Math.min(w, h) * 0.35 * (1 + (viewZoom - 3) * 0.15);
      const dx = x - cx;
      const dy = y - cy;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);

      if (distFromCenter <= r) {
        // Map onto sphere surface
        const z = Math.sqrt(r * r - distFromCenter * distFromCenter);
        
        // Dynamic pitch rotation inversion
        const pitchRad = rotationPitch * (Math.PI / 180);
        
        // Un-rotate pitch
        const y0 = dy * Math.cos(-pitchRad) - z * Math.sin(-pitchRad);
        const z0 = dy * Math.sin(-pitchRad) + z * Math.cos(-pitchRad);
        const x0 = dx;

        const phi = Math.acos(y0 / r);
        const theta = Math.atan2(x0, z0);

        const lat = 90 - (phi * 180) / Math.PI;
        let lon = (theta * 180) / Math.PI - rotationYaw;

        // Wrap lon between -180 and 180
        lon = ((lon + 180) % 360 + 360) % 360 - 180;

        return [Number(lat.toFixed(4)), Number(lon.toFixed(4))];
      }
      return null;
    } else {
      // Flat 2D Map projection mapping
      const zoomScale = Math.pow(1.15, viewZoom - 1);
      const lon = ((x - cx) / (w * 0.35 * zoomScale)) * 180 - rotationYaw;
      const lat = -((y - cy) / (h * 0.35 * zoomScale)) * 90 + rotationPitch;

      const wrappedLon = ((lon + 180) % 360 + 360) % 360 - 180;
      const clampedLat = Math.max(-90, Math.min(90, lat));

      return [Number(clampedLat.toFixed(4)), Number(wrappedLon.toFixed(4))];
    }
  };

  // Primary High-Performance Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match rendering resolution perfectly to display size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resizeCanvas();

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Clear background
    ctx.clearRect(0, 0, w, h);

    // Apply Sky/Cosmic Theme Background
    ctx.fillStyle = '#030712'; // Slate Deep Void
    ctx.fillRect(0, 0, w, h);

    // Render Ambient Space Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i++) {
      const starX = (Math.sin(i * 382.2) * 0.5 + 0.5) * w;
      const starY = (Math.cos(i * 923.1) * 0.5 + 0.5) * h;
      const brightness = Math.sin(Date.now() * 0.002 + i) * 0.4 + 0.6;
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.4})`;
      ctx.fillRect(starX, starY, 1.5, 1.5);
    }

    // Radius calculation based on zoom level
    const baseRadius = Math.min(w, h) * 0.35;
    const zoomScale = is3D ? (1 + (viewZoom - 3) * 0.15) : Math.pow(1.15, viewZoom - 1);
    const radius = baseRadius * zoomScale;

    // Helper functions for projection
    const project = (lat: number, lon: number) => {
      if (is3D) {
        const coord = latLonTo3D(lat, lon, radius);
        return {
          x: cx + coord.x,
          y: cy + coord.y,
          visible: coord.visible,
        };
      } else {
        // Flat orthorectified projection
        const x = cx + ((lon + rotationYaw) / 180) * (w * 0.35 * zoomScale);
        const y = cy - (lat / 90) * (h * 0.35 * zoomScale);
        return { x, y, visible: true };
      }
    };

    // -------------------------------------------------------------------------
    // 1. GLOBE BODY / OCEAN
    // -------------------------------------------------------------------------
    if (is3D) {
      // Glow atmosphere aura behind Earth
      const atmosphereGlow = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.15);
      atmosphereGlow.addColorStop(0, 'rgba(56, 189, 248, 0.3)'); // cyan aura
      atmosphereGlow.addColorStop(0.5, 'rgba(56, 189, 248, 0.1)');
      atmosphereGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = atmosphereGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // Earth body ocean solid base
      ctx.fillStyle = selectedLayers.includes('layer-night') ? '#080c14' : '#0f172a'; // Deep ocean
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Ambient shade shadow on the edge
      const edgeShadow = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.2, radius * 0.5, cx, cy, radius);
      edgeShadow.addColorStop(0, 'rgba(15, 23, 42, 0)');
      edgeShadow.addColorStop(1, 'rgba(3, 7, 18, 0.85)'); // Earth terminator shadows
      ctx.fillStyle = edgeShadow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 2D grid background border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.strokeRect(cx - (w * 0.35 * zoomScale), cy - (h * 0.35 * zoomScale), w * 0.7 * zoomScale, h * 0.7 * zoomScale);
    }

    // -------------------------------------------------------------------------
    // 2. COORDINATE GRID LINES (LAT / LON)
    // -------------------------------------------------------------------------
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)'; // Light blue coordinate grids
    ctx.lineWidth = 1;

    // Draw Longitude meridians
    for (let lon = -180; lon < 180; lon += 30) {
      ctx.beginPath();
      let first = true;
      for (let lat = -80; lat <= 80; lat += 5) {
        const pt = project(lat, lon);
        if (pt.visible) {
          if (first) {
            ctx.moveTo(pt.x, pt.y);
            first = false;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        } else if (is3D) {
          first = true; // reset line on invisible hemisphere
        }
      }
      ctx.stroke();
    }

    // Draw Latitude parallels
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let first = true;
      for (let lon = -180; lon <= 180; lon += 5) {
        const pt = project(lat, lon);
        if (pt.visible) {
          if (first) {
            ctx.moveTo(pt.x, pt.y);
            first = false;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        } else if (is3D) {
          first = true;
        }
      }
      ctx.stroke();
    }

    // -------------------------------------------------------------------------
    // 3. CONTINENT LANDMASS RENDERING
    // -------------------------------------------------------------------------
    ctx.fillStyle = selectedLayers.includes('layer-satellite')
      ? 'rgba(34, 197, 94, 0.25)' // Green forestry
      : selectedLayers.includes('layer-night')
        ? 'rgba(31, 41, 55, 0.7)' // Slate night ground
        : 'rgba(30, 41, 59, 0.85)'; // Normal slate theme land
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)'; // land borders
    ctx.lineWidth = 1.2;

    const drawPolygon = (rings: any[]) => {
      if (!rings || rings.length === 0) return;
      const exterior = rings[0]; // exterior ring
      ctx.beginPath();
      let first = true;
      let drawnCount = 0;
      
      exterior.forEach(([lon, lat]: [number, number]) => {
        const pt = project(lat, lon);
        if (pt.visible) {
          if (first) {
            ctx.moveTo(pt.x, pt.y);
            first = false;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
          drawnCount++;
        } else if (is3D) {
          first = true;
        }
      });

      if (drawnCount > 1) {
        ctx.fill();
        ctx.stroke();
      }
    };

    if (geojsonData && geojsonData.features) {
      geojsonData.features.forEach((feature: any) => {
        const geom = feature.geometry;
        if (!geom) return;

        if (geom.type === 'Polygon') {
          drawPolygon(geom.coordinates);
        } else if (geom.type === 'MultiPolygon') {
          geom.coordinates.forEach((polyCoords: any) => {
            drawPolygon(polyCoords);
          });
        }
      });
    } else {
      // Offline / Pre-load local high-speed vector fallback
      CONTINENTS.forEach((poly) => {
        ctx.beginPath();
        let first = true;
        let drawnCount = 0;
        
        poly.forEach(([lon, lat]) => {
          const pt = project(lat, lon);
          if (pt.visible) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
            drawnCount++;
          } else if (is3D) {
            first = true;
          }
        });

        if (drawnCount > 1) {
          ctx.fill();
          ctx.stroke();
        }
      });
    }

    // -------------------------------------------------------------------------
    // 4. WEATHER HEATMAP OVERLAYS (Simulated active meteorological currents)
    // -------------------------------------------------------------------------
    if (selectedLayers.includes('layer-weather') || selectedLayers.includes('layer-climate')) {
      const weatherColors = [
        { lat: 40, lon: -74, radius: 25, color: 'rgba(239, 68, 68, 0.2)' }, // Heat Dome NA
        { lat: 15, lon: 120, radius: 45, color: 'rgba(59, 130, 246, 0.25)' }, // Monsoon cyclone
        { lat: 50, lon: 10, radius: 30, color: 'rgba(16, 185, 129, 0.2)' }, // Stable pressure
        { lat: -25, lon: 135, radius: 35, color: 'rgba(249, 115, 22, 0.18)' }, // Outback thermal
      ];

      weatherColors.forEach((wc) => {
        const pt = project(wc.lat, wc.lon);
        if (pt.visible) {
          const cloudGrad = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, wc.radius * zoomScale);
          cloudGrad.addColorStop(0, wc.color);
          cloudGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = cloudGrad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, wc.radius * zoomScale, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // -------------------------------------------------------------------------
    // 4b. SIMULATED DEBRIS DENSITY HEATMAP (Kessler Syndrome Simulation)
    // -------------------------------------------------------------------------
    if (selectedLayers.includes('layer-debris-density')) {
      const severityFactor = Math.max(0.1, (timelineYear - 2015) / 21); // 0.1 (in 2016) to 1.0 (in 2036)
      
      const heatmapPoints = [
        { lat: 75, lon: -10, baseRadius: 35, intensity: 0.35 },
        { lat: -75, lon: 45, baseRadius: 30, intensity: 0.30 },
        { lat: 0, lon: -30, baseRadius: 40, intensity: 0.40 },
        { lat: 0, lon: 75, baseRadius: 45, intensity: 0.45 },
        { lat: 0, lon: -150, baseRadius: 35, intensity: 0.35 },
        { lat: 40, lon: -80, baseRadius: 30, intensity: 0.50 },
        { lat: 50, lon: 20, baseRadius: 35, intensity: 0.55 },
        { lat: 35, lon: 120, baseRadius: 32, intensity: 0.60 },
      ];

      heatmapPoints.forEach((hp) => {
        const pt = project(hp.lat, hp.lon);
        if (pt.visible) {
          const shimmer = Math.sin(Date.now() * 0.0015 + hp.lat + hp.lon) * 0.05;
          const currentIntensity = Math.min(0.9, (hp.intensity * severityFactor + shimmer));
          const currentRadius = hp.baseRadius * (0.7 + severityFactor * 0.6) * zoomScale;

          const grad = ctx.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, currentRadius);
          grad.addColorStop(0, `rgba(239, 68, 68, ${currentIntensity * 0.6})`); // rose/red core
          grad.addColorStop(0.3, `rgba(249, 115, 22, ${currentIntensity * 0.35})`); // orange transition
          grad.addColorStop(0.6, `rgba(234, 179, 8, ${currentIntensity * 0.15})`); // yellow edge glow
          grad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, currentRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // -------------------------------------------------------------------------
    // 4c. REAL-TIME CLOUD & PRECIPITATION HEATMAP (Derived from live WeatherData)
    // -------------------------------------------------------------------------
    if (realtimeWeatherOverlayEnabled && weatherData) {
      const pt = project(viewLat, viewLon);
      if (pt.visible) {
        const cloudCover = weatherData.cloudCover ?? 0;
        const humidity = weatherData.humidity ?? 0;
        
        // Define cloud radius and precipitation radius
        const cloudRadius = (35 + (cloudCover / 100) * 45) * zoomScale;
        const rainRadius = (25 + (humidity / 100) * 35) * zoomScale;
        
        // Draw real-time cloud coverage gradient (soft white/gray mist)
        if (cloudCover > 5) {
          const cloudOpacity = (cloudCover / 100) * 0.35;
          const cloudGrad = ctx.createRadialGradient(pt.x, pt.y, 5, pt.x, pt.y, cloudRadius);
          cloudGrad.addColorStop(0, `rgba(241, 245, 249, ${cloudOpacity})`); // fluffy center
          cloudGrad.addColorStop(0.5, `rgba(203, 213, 225, ${cloudOpacity * 0.4})`);
          cloudGrad.addColorStop(1, 'rgba(0,0,0,0)');
          
          ctx.fillStyle = cloudGrad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, cloudRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw real-time precipitation intensity gradient (pulsing blue/cyan gradient)
        const isRainy = /rain|drizzle|shower|storm|precip|snow/i.test(weatherData.description);
        const precipIntensity = isRainy ? 0.85 : (humidity > 60 ? (humidity - 60) / 40 : 0);
        
        if (precipIntensity > 0) {
          const pulse = Math.sin(Date.now() * 0.003) * 0.08;
          const rainOpacity = Math.max(0.05, (precipIntensity * 0.4) + pulse);
          const rainGrad = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, rainRadius);
          rainGrad.addColorStop(0, `rgba(14, 165, 233, ${rainOpacity * 0.9})`); // deep sky blue core
          rainGrad.addColorStop(0.4, `rgba(56, 189, 248, ${rainOpacity * 0.4})`); // cyan mid
          rainGrad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.fillStyle = rainGrad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, rainRadius, 0, Math.PI * 2);
          ctx.fill();

          // Draw concentric radar-like rain rings
          ctx.strokeStyle = `rgba(56, 189, 248, ${rainOpacity * 0.3})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, rainRadius * (0.4 + (Date.now() % 1500) / 1500 * 0.6), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // -------------------------------------------------------------------------
    // 5. DRAWINGS AND USER GEOMETRY ANNOTATIONS
    // -------------------------------------------------------------------------
    drawings.forEach((d) => {
      ctx.strokeStyle = d.color;
      ctx.fillStyle = d.type === 'polygon' ? d.color : 'transparent';
      ctx.lineWidth = 2;

      ctx.beginPath();
      let first = true;
      let visiblePoints = 0;

      d.coordinates.forEach(([lat, lon]) => {
        const pt = project(lat, lon);
        if (pt.visible) {
          if (first) {
            ctx.moveTo(pt.x, pt.y);
            first = false;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
          visiblePoints++;
        }
      });

      if (d.type === 'polygon' && visiblePoints > 2) {
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (d.type === 'line' && visiblePoints > 1) {
        ctx.stroke();
      } else if (d.type === 'marker') {
        const pt = project(d.coordinates[0][0], d.coordinates[0][1]);
        if (pt.visible) {
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // Render Label Tag
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(d.label, pt.x + 10, pt.y + 3);
        }
      }
    });

    // Draw active drawing helper lines
    if (measurePoints.length > 0) {
      ctx.strokeStyle = '#e11d48';
      ctx.fillStyle = 'rgba(225, 29, 72, 0.15)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      let first = true;
      measurePoints.forEach(([lat, lon]) => {
        const pt = project(lat, lon);
        if (pt.visible) {
          if (first) {
            ctx.moveTo(pt.x, pt.y);
            first = false;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
      });
      ctx.stroke();

      // Draw helper anchors
      measurePoints.forEach(([lat, lon]) => {
        const pt = project(lat, lon);
        if (pt.visible) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#e11d48';
          ctx.stroke();
        }
      });
    }

    // -------------------------------------------------------------------------
    // 6. SATELLITES & SPACE DEBRIS ORBIT LINES
    // -------------------------------------------------------------------------
    satellites.forEach((sat) => {
      const isSelected = selectedSat && selectedSat.id === sat.id;

      if (isSelected && decayTrajectoryEnabled) {
        // Draw color-coded "heat trail" on the orbital path when Decay Trajectory is enabled
        for (let i = 0; i < sat.orbitPath.length - 1; i++) {
          const [olat1, olon1] = sat.orbitPath[i];
          const [olat2, olon2] = sat.orbitPath[i + 1];

          const pt1 = project(olat1, olon1);
          const pt2 = project(olat2, olon2);

          if (pt1.visible && pt2.visible) {
            // Calculate a simulated atmospheric drag factor (0.0 to 1.0)
            // 1. Altitude variation (elliptical orbit apogee/perigee)
            const altFactor = 0.5 + 0.5 * Math.sin((i / sat.orbitPath.length) * Math.PI * 2);
            // 2. Latitude-based air density variance + time dynamic wave for flare/glow effect
            const latFactor = 0.5 + 0.5 * Math.sin((olat1 * Math.PI) / 180 + Date.now() * 0.002);
            // Combined atmospheric drag coefficient
            const dragIntensity = 0.25 * altFactor + 0.75 * latFactor;

            let strokeColor = '#10b981'; // Green (Safe)
            let lineWidth = 2;
            if (dragIntensity > 0.8) {
              strokeColor = '#ef4444'; // Red (Extreme drag)
              lineWidth = 4;
            } else if (dragIntensity > 0.55) {
              strokeColor = '#f97316'; // Orange (High friction)
              lineWidth = 3;
            } else if (dragIntensity > 0.25) {
              strokeColor = '#eab308'; // Yellow (Moderate drag)
              lineWidth = 2.5;
            }

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(pt1.x, pt1.y);
            ctx.lineTo(pt2.x, pt2.y);
            ctx.stroke();
          }
        }
      } else {
        // Draw Orbit Path Ribbon
        ctx.strokeStyle = isSelected
          ? 'rgba(56, 189, 248, 0.45)' // Cyan solid path
          : sat.type === 'space_debris'
            ? 'rgba(239, 68, 68, 0.15)' // Red debris track
            : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = isSelected ? 2 : 1;

        ctx.beginPath();
        let pathFirst = true;
        sat.orbitPath.forEach(([olat, olon]) => {
          const pt = project(olat, olon);
          if (pt.visible) {
            if (pathFirst) {
              ctx.moveTo(pt.x, pt.y);
              pathFirst = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else if (is3D) {
            pathFirst = true; // Break lines when disappearing behind globe
          }
        });
        ctx.stroke();
      }

      // Draw future Keplerian path projection if enabled and selected
      if (isSelected && orbitalPredictorEnabled) {
        const futurePath = predictFuturePath(sat);
        ctx.strokeStyle = '#eab308'; // Amber/Gold dotted projection
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]); // Dotted style pattern

        ctx.beginPath();
        let fPathFirst = true;
        futurePath.forEach(([fLat, fLon]) => {
          const fPt = project(fLat, fLon);
          if (fPt.visible) {
            if (fPathFirst) {
              ctx.moveTo(fPt.x, fPt.y);
              fPathFirst = false;
            } else {
              ctx.lineTo(fPt.x, fPt.y);
            }
          } else if (is3D) {
            fPathFirst = true; // Break lines when disappearing behind globe
          }
        });
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash pattern

        // Draw labeled future timeline coordinates along the path
        const futurePathForMarkers = predictFuturePath(sat, 4, 20); // T+20, T+40, T+60, T+80 minutes
        futurePathForMarkers.forEach((coords, idx) => {
          if (idx === 0) return; // Skip starting point
          const [fLat, fLon] = coords;
          const fPt = project(fLat, fLon);
          if (fPt.visible) {
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.arc(fPt.x, fPt.y, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = 'bold 8px JetBrains Mono, monospace';
            ctx.fillStyle = '#fef08a';
            ctx.fillText(`+${idx * 20}m`, fPt.x + 6, fPt.y + 3);
          }
        });
      }

      // Draw simulated atmospheric decay trajectory overlay if enabled and selected
      if (isSelected && decayTrajectoryEnabled) {
        const decayPath = predictDecayPath(sat);
        
        // Draw the decay line segments
        ctx.lineWidth = 2.5;
        ctx.setLineDash([2, 1]); // Dense dash pattern for decay
        
        for (let i = 0; i < decayPath.length - 1; i++) {
          const ptA = project(decayPath[i].coords[0], decayPath[i].coords[1]);
          const ptB = project(decayPath[i + 1].coords[0], decayPath[i + 1].coords[1]);
          
          if (ptA.visible && ptB.visible) {
            // Gradient from bright orange to fiery rose red
            const ratio = i / decayPath.length;
            ctx.strokeStyle = ratio < 0.4 
              ? '#f97316' // Orange
              : ratio < 0.85 
                ? '#ef4444' // Red
                : '#ec4899'; // Pink (Plasma ionization)
            
            ctx.beginPath();
            ctx.moveTo(ptA.x, ptA.y);
            ctx.lineTo(ptB.x, ptB.y);
            ctx.stroke();
          }
        }
        ctx.setLineDash([]); // Reset dash pattern

        // Draw a reentry point marker at the final element of the decay trajectory
        if (decayPath.length > 0) {
          const finalPoint = decayPath[decayPath.length - 1];
          const fPt = project(finalPoint.coords[0], finalPoint.coords[1]);
          
          if (fPt.visible) {
            // Draw a pulsing plasma halo
            ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
            ctx.beginPath();
            ctx.arc(fPt.x, fPt.y, 8 + Math.sin(Date.now() * 0.015) * 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw crosshair at the reentry center
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(fPt.x, fPt.y, 4, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(fPt.x - 8, fPt.y);
            ctx.lineTo(fPt.x + 8, fPt.y);
            ctx.moveTo(fPt.x, fPt.y - 8);
            ctx.lineTo(fPt.x, fPt.y + 8);
            ctx.stroke();

            // Label the reentry point
            ctx.font = 'bold 9px JetBrains Mono, monospace';
            ctx.fillStyle = '#fbcfe8';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillText(`🔥 Reentry Breakup Point (~80km)`, fPt.x + 10, fPt.y - 4);
            
            // Coordinates of reentry point
            ctx.font = '8px JetBrains Mono, monospace';
            ctx.fillStyle = '#f472b6';
            ctx.fillText(`LAT: ${finalPoint.coords[0].toFixed(2)}° | LON: ${finalPoint.coords[1].toFixed(2)}°`, fPt.x + 10, fPt.y + 6);
            ctx.shadowBlur = 0; // reset
          }
        }
      }

      // Draw Satellite Telemetry Node
      const pt = project(sat.lat, sat.lon);
      if (pt.visible) {
        // Pulse ring if selected
        if (isSelected) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 10 + Math.sin(Date.now() * 0.01) * 3, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Color coding by type
        ctx.fillStyle = sat.type === 'station'
          ? '#eab308' // Gold ISS
          : sat.type === 'space_debris'
            ? '#ef4444' // Red Debris
            : '#38bdf8'; // Blue Satellite

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isSelected ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fill();

        // Label on hover/selection
        if (isSelected) {
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(sat.name, pt.x + 10, pt.y - 5);
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.fillText(`${sat.velocity} km/h`, pt.x + 10, pt.y + 7);
        }

        // Draw Coverage Bubble radius ring
        if (isSelected && sat.coverageRadius > 0 && is3D) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
          ctx.fillStyle = 'rgba(56, 189, 248, 0.03)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          // Convert km coverage into approximate pixel scale
          const bubblePx = (sat.coverageRadius / 6371) * radius;
          ctx.arc(pt.x, pt.y, bubblePx, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    });

    // -------------------------------------------------------------------------
    // 7. REAL-TIME ACTIVE DISASTER INDICATORS
    // -------------------------------------------------------------------------
    disasters.forEach((dis) => {
      const isSelected = selectedDisaster && selectedDisaster.id === dis.id;
      const pt = project(dis.lat, dis.lon);

      if (pt.visible) {
        const pulseSize = 6 + Math.sin(Date.now() * 0.006) * 4;

        // Custom visuals depending on Disaster Type
        if (dis.type === 'earthquake') {
          // Dynamic red rings mapping epicenters
          ctx.strokeStyle = isSelected ? '#f43f5e' : 'rgba(244, 63, 94, 0.7)';
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pulseSize, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (dis.type === 'wildfire') {
          // Yellow-orange fire flare icon
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y - 7);
          ctx.lineTo(pt.x + 5, pt.y + 2);
          ctx.lineTo(pt.x - 5, pt.y + 2);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pulseSize + 2, 0, Math.PI * 2);
          ctx.stroke();
        } else if (dis.type === 'volcano') {
          // Purple/brown mountain vulcan
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y - 6);
          ctx.lineTo(pt.x + 6, pt.y + 4);
          ctx.lineTo(pt.x - 6, pt.y + 4);
          ctx.closePath();
          ctx.fill();
        } else if (dis.type === 'cyclone') {
          // Blue revolving hurricane swirls
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 12, 0, Math.PI, true);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 12, Math.PI, Math.PI * 2, false);
          ctx.stroke();
        }

        if (isSelected) {
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(dis.title, pt.x + 10, pt.y - 4);
          ctx.fillStyle = '#fda4af';
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillText(`SEVERITY: ${dis.severity.toUpperCase()}`, pt.x + 10, pt.y + 8);
        }
      }
    });

    // -------------------------------------------------------------------------
    // 8. 3D LIGHTING & SHADOW GLOW TERMINATOR
    // -------------------------------------------------------------------------
    if (is3D) {
      // Atmospheric outer ring gradient
      const atmosphereGlowOuter = ctx.createRadialGradient(cx, cy, radius * 0.99, cx, cy, radius * 1.03);
      atmosphereGlowOuter.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
      atmosphereGlowOuter.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.strokeStyle = atmosphereGlowOuter;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.015, 0, Math.PI * 2);
      ctx.stroke();
    }

    // -------------------------------------------------------------------------
    // 9. ATMOSPHERIC DRAG HEAT PATH LEGEND
    // -------------------------------------------------------------------------
    if (selectedSat && decayTrajectoryEnabled) {
      // Draw a neat HUD box in the bottom-left corner of the canvas
      const hudX = 20;
      const hudY = h - 140;
      const hudW = 210;
      const hudH = 120;

      // Draw background panel
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)'; // Pink/Plasma border for decay mode
      ctx.lineWidth = 1.5;
      
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(hudX, hudY, hudW, hudH, 6);
      } else {
        ctx.rect(hudX, hudY, hudW, hudH);
      }
      ctx.fill();
      ctx.stroke();

      // Title
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.fillStyle = '#fbcfe8';
      ctx.fillText('ATMOSPHERIC DRAG PROFILE', hudX + 10, hudY + 18);

      // Subtitle / Target details
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.fillStyle = '#fda4af';
      ctx.fillText(`Target: ${selectedSat.name.slice(0, 22)}`, hudX + 10, hudY + 30);

      // Color segments indicator
      const items = [
        { color: '#10b981', label: 'Safe / Low Drag', range: '< 150 nN/m²' },
        { color: '#eab308', label: 'Moderate Friction', range: '150-500 nN/m²' },
        { color: '#f97316', label: 'High Friction Zone', range: '500-1200 nN/m²' },
        { color: '#ef4444', label: 'Extreme Drag / Plasma', range: '> 1200 nN/m²' },
      ];

      items.forEach((item, idx) => {
        const itemY = hudY + 47 + idx * 16;
        
        // Color block
        ctx.fillStyle = item.color;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(hudX + 10, itemY - 7, 8, 8, 2);
        } else {
          ctx.rect(hudX + 10, itemY - 7, 8, 8);
        }
        ctx.fill();

        // Label
        ctx.font = '8px Inter, sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(item.label, hudX + 24, itemY);

        // Range value
        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(item.range, hudX + 138, itemY);
      });
    }

  }, [is3D, rotationYaw, rotationPitch, satellites, disasters, selectedSat, selectedDisaster, selectedLayers, viewZoom, drawings, measurePoints, activeTool, timelineYear, orbitalPredictorEnabled, decayTrajectoryEnabled, geojsonData, realtimeWeatherOverlayEnabled, weatherData]);

  return (
    <div className="relative w-full h-full min-h-[480px] bg-slate-950 overflow-hidden flex flex-col rounded-xl border border-slate-800">
      {/* HUD GIS Header Control Rail */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-2 items-center justify-between pointer-events-none">
        <div className="flex gap-2 items-center pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 shadow-xl">
          <Navigation className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-mono text-slate-300">
            LAT: <span className="text-white font-bold">{viewLat > 0 ? `+${viewLat}` : viewLat}°</span> | 
            LON: <span className="text-white font-bold">{viewLon > 0 ? `+${viewLon}` : viewLon}°</span>
          </span>
        </div>

        <div className="flex gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 shadow-xl">
          <button
            onClick={() => setIs3D(true)}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              is3D ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            3D Globe
          </button>
          <button
            onClick={() => setIs3D(false)}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              !is3D ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            2D Flat Grid
          </button>
        </div>
      </div>

      {/* Floating, Collapsible Map Legend Component */}
      <div 
        id="gis-map-legend"
        className="absolute top-16 left-4 z-10 w-64 pointer-events-auto flex flex-col bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-800 shadow-2xl transition-all duration-300 hover:border-slate-700/85 overflow-hidden"
      >
        {/* Header */}
        <div 
          onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
          className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-850/80 cursor-pointer select-none hover:bg-slate-950/40 transition"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="font-mono text-[10px] font-bold tracking-wider text-slate-300 uppercase">
              Map Legend
            </span>
          </div>
          <button className="text-slate-500 hover:text-slate-300 focus:outline-none transition-colors">
            {isLegendCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Content Body */}
        <AnimatePresence initial={false}>
          {!isLegendCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-3.5 flex flex-col gap-3 max-h-[340px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                
                {/* 1. DISASTERS & HAZARDS SECTION */}
                {selectedLayers.includes('layer-disaster') && (
                  <div className="flex flex-col gap-1.5 border-b border-slate-850/40 pb-2.5 last:border-0 last:pb-0">
                    <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-500" /> USGS Hazard Pins
                    </span>
                    <div className="grid grid-cols-1 gap-1.5 pl-1.5 mt-1 text-[11px] text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-rose-400" />
                          <span>Earthquake (Rose Rings)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        <div className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-400" />
                          <span>Wildfire (Orange Flare)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-purple-400" />
                          <span>Volcano (Purple Peak)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <div className="flex items-center gap-1">
                          <Wind className="w-3 h-3 text-blue-400" />
                          <span>Cyclone / Typhoon Swirl</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SATELLITES & SPACE OPERATIONS */}
                {selectedLayers.includes('layer-space') && (
                  <div className="flex flex-col gap-1.5 border-b border-slate-850/40 pb-2.5 last:border-0 last:pb-0">
                    <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1">
                      <Orbit className="w-3 h-3 text-sky-500" /> Orbit Corridors
                    </span>
                    <div className="grid grid-cols-1 gap-1.5 pl-1.5 mt-1 text-[11px] text-slate-300 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.5)]"></span>
                        <span>Space Station (Gold ISS)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.5)]"></span>
                        <span>Telemetry Node (Cyan Dot)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"></span>
                        <span>Space Debris (Red Debris)</span>
                      </div>
                      <div className="flex flex-col gap-1 mt-1 border-t border-slate-800/40 pt-1.5 text-[10px] text-slate-400 font-sans">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-0.5 bg-sky-500/40" />
                          <span>Active Selected Orbit Track</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-0.5 border-t border-dashed border-slate-600" />
                          <span>Faint Standard Orbit Path</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-0.5 bg-rose-500/25" />
                          <span>Faint Space Debris Track</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. KESSLER DEBRIS HEATMAP */}
                {selectedLayers.includes('layer-debris-density') && (
                  <div className="flex flex-col gap-1.5 border-b border-slate-850/40 pb-2.5 last:border-0 last:pb-0">
                    <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-500" /> Debris Density Heat
                    </span>
                    <p className="text-[10px] text-slate-400 leading-normal pl-1.5">
                      Visualizes concentrations of untracked small debris fragments.
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 pl-1.5">
                      <div className="h-2 w-full rounded-full bg-gradient-to-r from-emerald-500/20 via-yellow-500/50 to-red-600" />
                      <span className="text-[9px] font-mono text-slate-500 shrink-0">Low → Critical</span>
                    </div>
                  </div>
                )}

                {/* 4. WEATHER OVERLAY */}
                {selectedLayers.includes('layer-weather') && (
                  <div className="flex flex-col gap-1.5 border-b border-slate-850/40 pb-2.5 last:border-0 last:pb-0">
                    <span className="text-[10px] font-mono font-bold text-sky-300 uppercase tracking-widest flex items-center gap-1">
                      <Wind className="w-3 h-3 text-sky-300" /> Weather Clouds
                    </span>
                    <p className="text-[10px] text-slate-400 leading-normal pl-1.5">
                      Live precipitation cloud cover, storm cells and atmospheric humidity.
                    </p>
                  </div>
                )}

                {/* 5. CLIMATE OVERLAY */}
                {selectedLayers.includes('layer-climate') && (
                  <div className="flex flex-col gap-1.5 border-b border-slate-850/40 pb-2.5 last:border-0 last:pb-0">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-500" /> Sea Surface Temp
                    </span>
                    <p className="text-[10px] text-slate-400 leading-normal pl-1.5">
                      Sea Surface Temperature (SST) anomalies mapping climate warning indicators.
                    </p>
                  </div>
                )}

                {/* 6. BASE GRID / SATELLITE / NIGHT LAYERS */}
                {(selectedLayers.includes('layer-base') || selectedLayers.includes('layer-satellite') || selectedLayers.includes('layer-night')) && (
                  <div className="flex flex-col gap-1.5 border-b border-slate-850/40 pb-2.5 last:border-0 last:pb-0">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-500" /> Base Cartography
                    </span>
                    <div className="grid grid-cols-1 gap-1 pl-1.5 mt-0.5 text-[10px] text-slate-400 leading-relaxed">
                      {selectedLayers.includes('layer-base') && (
                        <div>• <b className="text-slate-300">Tactical Grid:</b> Coordinate grid lines and vector frontiers</div>
                      )}
                      {selectedLayers.includes('layer-satellite') && (
                        <div>• <b className="text-slate-300">Sentinel True Color:</b> Photorealistic space-borne surface mapping</div>
                      )}
                      {selectedLayers.includes('layer-night') && (
                        <div>• <b className="text-slate-300">Night Earth Lights:</b> Megacity glowing power grids and infrastructure</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fallback when NO layers are selected */}
                {selectedLayers.filter(l => l !== 'layer-base').length === 0 && (
                  <div className="text-slate-500 text-[10px] py-2 text-center font-mono">
                    No active incident, weather or orbit layers selected. Enable them in sidebar to populate legend indicators.
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dynamic Floating Compass Rose */}
      <div className="absolute top-16 right-4 z-10 pointer-events-auto flex flex-col items-center gap-1 bg-slate-900/95 backdrop-blur-md p-2 rounded-xl border border-slate-800 shadow-2xl transition-all duration-300 hover:border-slate-700/80 select-none min-w-[80px]">
        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider text-center block">
          Bearing
        </span>
        
        {/* Rotating Compass Dial */}
        <button
          onClick={() => {
            setViewLon(0);
            setViewLat(0);
          }}
          title="Click to reset orientation to prime meridian (0°, 0°)"
          className="relative w-14 h-14 rounded-full bg-slate-950/90 border border-slate-800/80 flex items-center justify-center transition hover:border-sky-500/50 group focus:outline-none focus:ring-1 focus:ring-sky-500/40"
        >
          {/* Compass Star / Rose SVG */}
          <svg
            viewBox="0 0 100 100"
            className="w-12 h-12 transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${-rotationYaw}deg)` }}
          >
            {/* Compass Rings */}
            <circle cx="50" cy="50" r="46" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="50" cy="50" r="41" fill="none" stroke="#1e293b" strokeWidth="1.5" />
            
            {/* Degree ticks */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={deg}
                x1="50"
                y1="8"
                x2="50"
                y2="11"
                stroke={deg % 90 === 0 ? '#38bdf8' : '#475569'}
                strokeWidth={deg % 90 === 0 ? '1.5' : '1'}
                transform={`rotate(${deg} 50 50)`}
              />
            ))}

            {/* Cardinal Markers */}
            <text x="50" y="21" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#f8fafc" fontFamily="Inter, sans-serif">N</text>
            <text x="81" y="54" textAnchor="middle" fontSize="9" fontWeight="semibold" fill="#94a3b8" fontFamily="Inter, sans-serif">E</text>
            <text x="50" y="86" textAnchor="middle" fontSize="9" fontWeight="semibold" fill="#94a3b8" fontFamily="Inter, sans-serif">S</text>
            <text x="19" y="54" textAnchor="middle" fontSize="9" fontWeight="semibold" fill="#94a3b8" fontFamily="Inter, sans-serif">W</text>

            {/* Double Needle styling */}
            {/* North pointer (Red/Orange hazard warning aesthetic) */}
            <polygon points="50,24 54,50 50,45" fill="#ef4444" />
            <polygon points="50,24 46,50 50,45" fill="#b91c1c" />
            
            {/* South pointer */}
            <polygon points="50,76 54,50 50,55" fill="#94a3b8" />
            <polygon points="50,76 46,50 50,55" fill="#475569" />

            {/* Pivot Center */}
            <circle cx="50" cy="50" r="4" fill="#020617" stroke="#38bdf8" strokeWidth="1.5" />
          </svg>
          
          {/* Static North Anchor pointer at top */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-sky-500 rounded-full group-hover:bg-sky-400 transition-colors" />
        </button>

        {/* Numeric Readouts */}
        <div className="flex flex-col items-center mt-0.5 leading-none">
          <span className="text-[10px] font-mono font-bold text-sky-400">
            {Math.round(((rotationYaw % 360) + 360) % 360)}°
          </span>
          <span className="text-[8px] font-mono text-slate-400 tracking-wider mt-0.5">
            {(() => {
              const deg = ((rotationYaw % 360) + 360) % 360;
              const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
              const idx = Math.round(deg / 45) % 8;
              return directions[idx];
            })()}
          </span>
        </div>
      </div>

      {/* Primary HTML5 Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredSat(null);
          setHoveredDisaster(null);
          setHoverPosition(null);
        }}
        className={`w-full h-full grow transition-all duration-150 ${
          isDragging 
            ? 'cursor-grabbing' 
            : (hoveredSat || hoveredDisaster) 
              ? 'cursor-pointer' 
              : 'cursor-grab'
        }`}
        id="astra-gis-canvas"
      />

      {/* Immersive Glassmorphism Hover Tooltip */}
      <AnimatePresence>
        {hoverPosition && (hoveredSat || hoveredDisaster) && (
          <motion.div
            key={hoveredSat?.name || hoveredDisaster?.title || 'tooltip'}
            initial={{ opacity: 0, scale: 0.95, y: hoverPosition.y < 220 ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: hoverPosition.y < 220 ? 10 : -10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute z-30 pointer-events-none"
            style={{
              left: `${hoverPosition.x}px`,
              top: `${hoverPosition.y}px`,
              transform: `translate(-50%, ${hoverPosition.y < 220 ? '16px' : 'calc(-100% - 16px)'})`,
            }}
          >
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-lg p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(56,189,248,0.15)] max-w-[280px] min-w-[220px] font-sans text-slate-200">
              {/* Corner Decorative Accent */}
              <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-lg ${
                hoveredSat 
                  ? hoveredSat.type === 'station' ? 'bg-amber-500' : hoveredSat.type === 'space_debris' ? 'bg-rose-500' : 'bg-sky-500'
                  : hoveredDisaster?.severity === 'critical' || hoveredDisaster?.severity === 'high' ? 'bg-rose-500' : 'bg-amber-500'
              }`} />

              {hoveredSat && (
                <div className="flex flex-col gap-2.5">
                  {/* Header */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                        {hoveredSat.type === 'station' ? 'Space Station' : hoveredSat.type === 'space_debris' ? 'Space Debris' : 'Telemetry Node'}
                      </span>
                      <h4 className="text-xs font-bold text-white tracking-tight mt-0.5 truncate max-w-[160px]">
                        {hoveredSat.name}
                      </h4>
                    </div>
                    <div className={`p-1 rounded ${
                      hoveredSat.type === 'station' ? 'bg-amber-500/10 text-amber-400' : hoveredSat.type === 'space_debris' ? 'bg-rose-500/10 text-rose-400' : 'bg-sky-500/10 text-sky-400'
                    }`}>
                      {hoveredSat.type === 'space_debris' ? <Trash2 className="w-3.5 h-3.5" /> : <Orbit className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-2 text-[11px] font-mono">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase">Velocity</span>
                      <span className="text-slate-200 font-bold mt-0.5">{hoveredSat.velocity.toLocaleString()} km/h</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase">Altitude</span>
                      <span className="text-slate-200 font-bold mt-0.5">{hoveredSat.alt} km</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase">Inclination</span>
                      <span className="text-slate-200 font-bold mt-0.5">{hoveredSat.inclination}°</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase">Operator</span>
                      <span className="text-slate-200 font-bold mt-0.5 truncate max-w-[85px]">{hoveredSat.operator}</span>
                    </div>
                  </div>

                  {/* Coverage or Risk */}
                  {hoveredSat.riskAssessment && (
                    <div className="bg-rose-500/5 border border-rose-500/20 rounded p-1.5 flex items-center gap-1.5 text-[10px]">
                      <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="text-rose-300 leading-none font-medium truncate">{hoveredSat.riskAssessment}</span>
                    </div>
                  )}
                  
                  {hoveredSat.coverageRadius > 0 && !hoveredSat.riskAssessment && (
                    <div className="bg-sky-500/5 border border-sky-500/15 rounded p-1.5 flex items-center gap-1.5 text-[10px]">
                      <Globe className="w-3 h-3 text-sky-400 shrink-0" />
                      <span className="text-sky-300 leading-none font-medium">Coverage: {hoveredSat.coverageRadius} km</span>
                    </div>
                  )}
                </div>
              )}

              {hoveredDisaster && (
                <div className="flex flex-col gap-2.5">
                  {/* Header */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className={`text-[9px] font-mono font-bold tracking-widest uppercase ${
                        hoveredDisaster.severity === 'critical' || hoveredDisaster.severity === 'high' ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        {hoveredDisaster.severity.toUpperCase()} ALERT
                      </span>
                      <h4 className="text-xs font-bold text-white tracking-tight mt-0.5 truncate max-w-[160px]">
                        {hoveredDisaster.title}
                      </h4>
                    </div>
                    <div className={`p-1 rounded ${
                      hoveredDisaster.severity === 'critical' || hoveredDisaster.severity === 'high' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {hoveredDisaster.type === 'wildfire' ? <Flame className="w-3.5 h-3.5" /> : 
                       hoveredDisaster.type === 'earthquake' ? <Activity className="w-3.5 h-3.5" /> : 
                       hoveredDisaster.type === 'cyclone' ? <Wind className="w-3.5 h-3.5" /> : 
                       <AlertTriangle className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-2 text-[11px] font-mono">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase">Impacted Pop</span>
                      <span className="text-slate-200 font-bold mt-0.5">{hoveredDisaster.impactedPopulation.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase">Coordinates</span>
                      <span className="text-slate-200 font-bold mt-0.5">{hoveredDisaster.lat.toFixed(1)}°, {hoveredDisaster.lon.toFixed(1)}°</span>
                    </div>
                    {hoveredDisaster.magnitude !== undefined && (
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 uppercase">Magnitude</span>
                        <span className="text-rose-400 font-bold mt-0.5">{hoveredDisaster.magnitude} Mw</span>
                      </div>
                    )}
                    {hoveredDisaster.depth !== undefined && (
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 uppercase">Depth</span>
                        <span className="text-slate-200 font-bold mt-0.5">{hoveredDisaster.depth} km</span>
                      </div>
                    )}
                    {hoveredDisaster.areaKm2 !== undefined && (
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 uppercase">Burn Area</span>
                        <span className="text-orange-400 font-bold mt-0.5">{hoveredDisaster.areaKm2.toLocaleString()} km²</span>
                      </div>
                    )}
                    <div className="flex flex-col col-span-2">
                      <span className="text-[9px] text-slate-500 uppercase">Trigger Time</span>
                      <span className="text-slate-400 font-medium mt-0.5 text-[10px]">
                        {new Date(hoveredDisaster.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professional GIS Canvas Toolbars */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur px-3 py-2 rounded-lg border border-slate-800 flex flex-col gap-2 shadow-xl">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3 h-3 text-sky-500" /> Professional GIS Tools
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                setActiveTool('measure');
                setMeasurePoints([]);
                setMeasureResult(null);
              }}
              title="Measure Distance & Bearing"
              className={`p-1.5 rounded transition ${
                activeTool === 'measure' ? 'bg-sky-600 text-white' : 'bg-slate-850 text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setActiveTool('marker');
                setMeasurePoints([]);
              }}
              title="Place custom Marker"
              className={`p-1.5 rounded transition ${
                activeTool === 'marker' ? 'bg-sky-600 text-white' : 'bg-slate-850 text-slate-400 hover:text-white'
              }`}
            >
              <Tag className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setActiveTool('line');
                setMeasurePoints([]);
              }}
              title="Draw Vector Line"
              className={`p-1.5 rounded transition ${
                activeTool === 'line' ? 'bg-sky-600 text-white' : 'bg-slate-850 text-slate-400 hover:text-white'
              }`}
            >
              <Move className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setActiveTool('polygon');
                setMeasurePoints([]);
              }}
              title="Draw Polygon boundary"
              className={`p-1.5 rounded transition ${
                activeTool === 'polygon' ? 'bg-sky-600 text-white' : 'bg-slate-850 text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setDrawings([]);
                setMeasurePoints([]);
                setMeasureResult(null);
                setActiveTool('none');
              }}
              title="Clear GIS layers"
              className="p-1.5 rounded bg-slate-850 text-slate-400 hover:text-rose-400 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* GIS Measurement Result Output HUD */}
        {activeTool === 'measure' && measurePoints.length > 0 && (
          <div className="bg-slate-900/95 backdrop-blur p-2.5 rounded-lg border border-rose-500/30 text-[11px] font-mono shadow-xl text-slate-300 max-w-xs animate-fade-in">
            <div className="font-bold text-white mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              GIS Tactical Vector
            </div>
            <div>Anchor A: {measurePoints[0][0].toFixed(2)}°, {measurePoints[0][1].toFixed(2)}°</div>
            {measurePoints.length > 1 ? (
              <>
                <div>Anchor B: {measurePoints[1][0].toFixed(2)}°, {measurePoints[1][1].toFixed(2)}°</div>
                {measureResult && (
                  <div className="mt-1 pt-1 border-t border-slate-800 text-sky-400 font-bold">
                    Range: {measureResult.distance.toLocaleString([], { maximumFractionDigits: 1 })} km<br />
                    Bearing: {measureResult.bearing.toFixed(1)}° (North)
                  </div>
                )}
              </>
            ) : (
              <div className="text-slate-500 text-[10px] mt-0.5 animate-pulse">Click second point on Globe...</div>
            )}
          </div>
        )}
      </div>

      {/* Zoom and Grid Navigation Controller */}
      <div className="absolute bottom-4 right-4 z-10 flex gap-2 pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur p-1 rounded-lg border border-slate-800 flex gap-1 shadow-xl">
          <button
            onClick={() => setViewZoom(Math.max(1, viewZoom - 1))}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-850 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewZoom(Math.min(10, viewZoom + 1))}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-850 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
