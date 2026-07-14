/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDir: number;
  uvIndex: number;
  aqi: number;
  dewPoint: number;
  cloudCover: number;
  visibility: number;
  description: string;
  forecastHourly: Array<{ time: string; temp: number; pop: number }>;
  forecastDaily: Array<{ day: string; tempMax: number; tempMin: number; condition: string; pop: number }>;
}

export interface SatelliteTelemetry {
  id: string;
  name: string;
  type: 'satellite' | 'space_debris' | 'station';
  lat: number;
  lon: number;
  alt: number; // km
  velocity: number; // km/h
  inclination: number; // degrees
  operator: string;
  epoch: string;
  orbitPath: Array<[number, number]>; // [lat, lon] points
  coverageRadius: number; // km
  riskAssessment?: string;
}

export interface DisasterEvent {
  id: string;
  title: string;
  type: 'earthquake' | 'wildfire' | 'cyclone' | 'volcano' | 'flood';
  lat: number;
  lon: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  magnitude?: number;
  depth?: number;
  areaKm2?: number;
  impactedPopulation: number;
  timestamp: string;
  predictedPath?: Array<[number, number]>;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  ip: string;
  details: string;
}

export interface Bookmark {
  id: string;
  name: string;
  lat: number;
  lon: number;
  zoom: number;
  layers: string[];
  timestamp: string;
}

export interface SimulationSnapshot {
  id: string;
  name: string;
  year: number;
  lat: number;
  lon: number;
  zoom: number;
  layers: string[];
  timestamp: string;
}

export interface DrawingElement {
  id: string;
  type: 'line' | 'polygon' | 'marker';
  coordinates: Array<[number, number]>;
  color: string;
  label: string;
}

export interface GISLayer {
  id: string;
  name: string;
  category: 'base' | 'weather' | 'environment' | 'space' | 'disaster';
  enabled: boolean;
  opacity: number;
  description: string;
}
