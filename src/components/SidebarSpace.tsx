/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Orbit, Compass, User, Globe, AlertOctagon, Rocket, ShieldAlert, Radio, TrendingUp, Activity, Zap, Navigation, CheckCircle2, Flame, ShieldCheck, Cpu, Trash2, Crosshair } from 'lucide-react';
import { SatelliteTelemetry } from '../types';

interface SidebarSpaceProps {
  satellites: SatelliteTelemetry[];
  selectedSat: SatelliteTelemetry | null;
  onSelectSat: (sat: SatelliteTelemetry | null) => void;
  onCenterMap: (lat: number, lon: number) => void;
  conjunctionAlert: {
    id: string;
    satelliteA: string;
    satelliteB: string;
    distanceKm: number;
    probability: number;
    etaMinutes: number;
  } | null;
  orbitalPredictorEnabled: boolean;
  onToggleOrbitalPredictor: () => void;
  decayTrajectoryEnabled: boolean;
  onToggleDecayTrajectory: () => void;
  timelineYear: number;
  onActiveDebrisRemoval?: (debrisName: string) => void;
}

export const SidebarSpace: React.FC<SidebarSpaceProps> = ({
  satellites,
  selectedSat,
  onSelectSat,
  onCenterMap,
  conjunctionAlert,
  orbitalPredictorEnabled,
  onToggleOrbitalPredictor,
  decayTrajectoryEnabled,
  onToggleDecayTrajectory,
  timelineYear,
  onActiveDebrisRemoval,
}) => {
  // Launch Countdown
  const [countdown, setCountdown] = useState<number>(1452); // seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 1800));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Avoidance Maneuver State
  const [selectedManeuver, setSelectedManeuver] = useState<'prograde' | 'retrograde' | 'radial'>('prograde');
  const [burnStatus, setBurnStatus] = useState<'idle' | 'arming' | 'precharge' | 'firing' | 'complete'>('idle');
  const [burnProgress, setBurnProgress] = useState(0);
  const [mitigatedAlertIds, setMitigatedAlertIds] = useState<string[]>([]);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);

  // Active Debris Removal State
  const [cleanupStatus, setCleanupStatus] = useState<'idle' | 'deploying' | 'intercepting' | 'capturing' | 'deorbiting' | 'complete'>('idle');
  const [cleanupProgress, setCleanupProgress] = useState(0);

  // For selected satellite on-demand maneuvers
  const [selectedSatBurnStatus, setSelectedSatBurnStatus] = useState<'idle' | 'firing' | 'complete'>('idle');

  useEffect(() => {
    if (conjunctionAlert) {
      if (conjunctionAlert.id !== activeAlertId) {
        setActiveAlertId(conjunctionAlert.id);
        if (!mitigatedAlertIds.includes(conjunctionAlert.id)) {
          setBurnStatus('idle');
          setBurnProgress(0);
        }
        setCleanupStatus('idle');
        setCleanupProgress(0);
      }
    } else {
      setActiveAlertId(null);
      setCleanupStatus('idle');
      setCleanupProgress(0);
    }
  }, [conjunctionAlert, activeAlertId, mitigatedAlertIds]);

  useEffect(() => {
    setSelectedSatBurnStatus('idle');
  }, [selectedSat]);

  const executeActiveDebrisRemoval = async () => {
    if (!conjunctionAlert) return;
    const targetName = conjunctionAlert.satelliteB;
    
    setCleanupStatus('deploying');
    setCleanupProgress(15);

    setTimeout(() => {
      setCleanupStatus('intercepting');
      setCleanupProgress(40);

      setTimeout(() => {
        setCleanupStatus('capturing');
        setCleanupProgress(70);

        setTimeout(() => {
          setCleanupStatus('deorbiting');
          setCleanupProgress(90);

          setTimeout(async () => {
            setCleanupStatus('complete');
            setCleanupProgress(100);

            // Call API on backend to persist removal
            try {
              await fetch('/api/space/cleanup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: targetName })
              });
            } catch (err) {
              console.error('Failed to post space cleanup API:', err);
            }

            // Fire callback to instantly update the local satellite state on client
            if (onActiveDebrisRemoval) {
              onActiveDebrisRemoval(targetName);
            }
          }, 1200);
        }, 1200);
      }, 1200);
    }, 1200);
  };

  const executeAvoidanceBurn = async () => {
    if (!conjunctionAlert) return;
    
    setBurnStatus('arming');
    
    // Stage 1: Arming (1000ms)
    setTimeout(() => {
      setBurnStatus('precharge');
      
      // Stage 2: Pre-charge (1000ms)
      setTimeout(() => {
        setBurnStatus('firing');
        
        // Stage 3: Firing (Progress bar)
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setBurnProgress(progress);
          if (progress >= 100) {
            clearInterval(interval);
            setBurnStatus('complete');
            
            // Add to mitigated alerts
            setMitigatedAlertIds(prev => [...prev, conjunctionAlert.id]);
            
            // Post audit log to server
            let burnDetails = '';
            if (selectedManeuver === 'prograde') {
              burnDetails = `Executed +0.45 m/s Prograde Orbit Boost on ${conjunctionAlert.satelliteA} to avoid ${conjunctionAlert.satelliteB}. Separation increased to ${(conjunctionAlert.distanceKm + 12.4).toFixed(1)} km. Fuel spent: 0.38 kg Hydrazine.`;
            } else if (selectedManeuver === 'retrograde') {
              burnDetails = `Executed -0.31 m/s Retrograde Phasing Burn on ${conjunctionAlert.satelliteA} to avoid ${conjunctionAlert.satelliteB}. Separation increased to ${(conjunctionAlert.distanceKm + 9.8).toFixed(1)} km. Fuel spent: 0.26 kg Hydrazine.`;
            } else {
              burnDetails = `Executed +0.62 m/s Radial Out-of-Plane Adjustment on ${conjunctionAlert.satelliteA} to avoid ${conjunctionAlert.satelliteB}. Separation increased to ${(conjunctionAlert.distanceKm + 15.6).toFixed(1)} km. Fuel spent: 0.52 kg Hydrazine.`;
            }

            fetch('/api/logs', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                user: 'Astra-X Core Engine',
                action: 'DEBRIS_AVOIDANCE_BURN',
                details: burnDetails
              })
            }).catch(err => console.error('Failed to post audit log:', err));
          }
        }, 150);
      }, 1000);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl p-4 gap-4 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Orbit className="w-4 h-4 text-sky-400 animate-pulse" /> Orbital Intelligence
          </h2>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
            Space Situational Awareness (SSA) Feed
          </p>
        </div>
      </div>

      {/* active launching banner */}
      <div className="bg-slate-950 p-3 rounded-lg border border-indigo-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 rounded text-indigo-400 animate-bounce">
            <Rocket className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-indigo-400 font-mono block font-bold">UPCOMING LAUNCH</span>
            <span className="text-xs font-semibold text-slate-100">Falcon 9 (Astra-IX)</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
            T- {formatCountdown(countdown)}
          </span>
        </div>
      </div>

      {/* Collision Conjunction Warnings Center */}
      <div className="bg-slate-950 p-2.5 rounded-lg border border-rose-500/25 flex flex-col gap-1.5 animate-fade-in">
        <div className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" /> CONJUNCTION ALERTS
          </span>
          {conjunctionAlert && mitigatedAlertIds.includes(conjunctionAlert.id) && (
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
              <ShieldCheck className="w-3 h-3" /> MITIGATED
            </span>
          )}
        </div>
        {conjunctionAlert ? (
          <div className="space-y-2">
            {/* Alert info */}
            <div className={`text-[11px] font-mono text-slate-300 space-y-1 p-2 rounded border ${
              mitigatedAlertIds.includes(conjunctionAlert.id)
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-rose-500/5 border-rose-500/10'
            }`}>
              <div className="text-white font-bold flex justify-between">
                <span>ALERT STATUS: {mitigatedAlertIds.includes(conjunctionAlert.id) ? 'MITIGATED' : 'EXTREME'}</span>
                <span className={mitigatedAlertIds.includes(conjunctionAlert.id) ? 'text-emerald-400 font-bold' : 'text-rose-400 animate-pulse'}>
                  {mitigatedAlertIds.includes(conjunctionAlert.id) ? '● SECURE' : '● CRITICAL'}
                </span>
              </div>
              <div>Asset A: <span className="text-sky-400">{conjunctionAlert.satelliteA}</span></div>
              <div>Debris: <span className="text-rose-400">{conjunctionAlert.satelliteB}</span></div>
              <div className="flex justify-between text-[10px] pt-1 border-t border-slate-900">
                <span>Separation: <span className={mitigatedAlertIds.includes(conjunctionAlert.id) ? 'text-emerald-400 font-bold' : 'text-yellow-400 font-bold'}>
                  {mitigatedAlertIds.includes(conjunctionAlert.id) 
                    ? (conjunctionAlert.distanceKm + (selectedManeuver === 'prograde' ? 12.4 : selectedManeuver === 'retrograde' ? 9.8 : 15.6)).toFixed(1)
                    : conjunctionAlert.distanceKm} km
                </span></span>
                <span>ETA: <span className={mitigatedAlertIds.includes(conjunctionAlert.id) ? 'text-slate-400' : 'text-rose-400 font-bold'}>
                  {mitigatedAlertIds.includes(conjunctionAlert.id) ? 'N/A (CLEARED)' : `${conjunctionAlert.etaMinutes} min`}
                </span></span>
              </div>
            </div>

            {/* Maneuver suggestions section */}
            {mitigatedAlertIds.includes(conjunctionAlert.id) ? (
              <div className="bg-emerald-950/20 border border-emerald-500/20 p-2 rounded text-[10px] font-mono text-slate-300 flex flex-col gap-1">
                <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Avoidance Maneuver Logged
                </span>
                <p className="text-[9px] text-slate-400 leading-normal">
                  Automatic burn completed. Reaction wheel orientations updated. Thrusters armed and returned to standby.
                </p>
                <div className="grid grid-cols-2 gap-1 mt-1 text-[9px] border-t border-slate-900/65 pt-1.5">
                  <div>Burn: <span className="text-slate-100 font-semibold">{selectedManeuver.toUpperCase()}</span></div>
                  <div>Fuel spent: <span className="text-slate-100 font-semibold">{selectedManeuver === 'prograde' ? '0.38 kg' : selectedManeuver === 'retrograde' ? '0.26 kg' : '0.52 kg'}</span></div>
                  <div className="col-span-2 text-emerald-400">✓ Mission risk downgraded to safe.</div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded p-2 flex flex-col gap-1.5 font-mono text-[10px]">
                {cleanupStatus !== 'idle' ? (
                  <div className="space-y-2 py-1">
                    <div className="text-purple-400 font-bold uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[9px] font-bold">
                        <Crosshair className="w-3.5 h-3.5 text-purple-400 animate-pulse shrink-0 font-bold" /> ACTIVE DEBRIS REMOVAL
                      </span>
                      <span className="text-[8px] bg-purple-500/10 text-purple-300 px-1 py-0.5 rounded border border-purple-500/20 font-bold">
                        MISSION ACTIVE
                      </span>
                    </div>
                    
                    <div className="bg-slate-950 p-2 rounded border border-purple-500/15 space-y-2">
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-purple-300 font-bold animate-pulse uppercase flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-purple-400 animate-spin" />
                          {cleanupStatus === 'deploying' && 'Deploying ADR interceptor craft...'}
                          {cleanupStatus === 'intercepting' && 'Matching velocity vectors...'}
                          {cleanupStatus === 'capturing' && 'Deploying capture envelope...'}
                          {cleanupStatus === 'deorbiting' && 'Engaging braking thrusters...'}
                          {cleanupStatus === 'complete' && 'Target Vaporized!'}
                        </span>
                        <span className="text-purple-300 font-mono font-bold">{cleanupProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded overflow-hidden border border-slate-800">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300 ease-out"
                          style={{ width: `${cleanupProgress}%` }}
                        />
                      </div>
                    </div>
                    
                    <p className="text-[9px] text-slate-400 leading-normal font-mono bg-slate-950/40 p-1.5 rounded border border-slate-900">
                      {cleanupStatus === 'deploying' && '» STATUS: Launch clearance received. Launching ADR-Chaser-1.'}
                      {cleanupStatus === 'intercepting' && `» STATUS: Intercept phase active. Matching velocity with ${conjunctionAlert.satelliteB}...`}
                      {cleanupStatus === 'capturing' && `» STATUS: Capturing target with space tether harpoon and magnetic net...`}
                      {cleanupStatus === 'deorbiting' && '» STATUS: Atmosphere reentry burn initiated. De-orbiting targeted debris.'}
                      {cleanupStatus === 'complete' && '» STATUS: Mission Success. Targeted debris burned up in atmosphere. Safe orbit restored.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-amber-400 font-bold uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[9px]">
                        <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" /> AI AVOIDANCE SUGGESTIONS
                      </span>
                      <span className="text-[8px] bg-amber-500/10 text-amber-300 px-1 py-0.5 rounded border border-amber-500/20">
                        REALTIME CALCULATED
                      </span>
                    </div>

                    {/* Tabs */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1.5 rounded border border-slate-850 relative z-0">
                      {(['prograde', 'retrograde', 'radial'] as const).map((maneuver) => {
                        const isActive = selectedManeuver === maneuver;
                        const label = maneuver === 'radial' ? 'RADIAL OUT' : maneuver.toUpperCase();
                        const activeBg = maneuver === 'prograde' ? 'bg-sky-500' : maneuver === 'retrograde' ? 'bg-amber-500' : 'bg-purple-500';
                        return (
                          <button
                            key={maneuver}
                            onClick={() => burnStatus === 'idle' && setSelectedManeuver(maneuver)}
                            disabled={burnStatus !== 'idle'}
                            className={`py-1 text-[8px] rounded transition-all duration-200 font-bold relative focus:outline-none ${
                              isActive
                                ? 'text-white'
                                : 'text-slate-400 hover:text-slate-200 disabled:opacity-50'
                            }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="maneuverActiveTab"
                                className={`absolute inset-0 ${activeBg} rounded`}
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}
                            <span className="relative z-10">{label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Maneuver Specs */}
                    <div className="bg-slate-950/60 p-1.5 rounded border border-slate-850 text-[9px] text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Target Adjustment:</span>
                        <span className="text-slate-200 font-semibold">
                          {selectedManeuver === 'prograde' ? 'Raise orbit altitude (+150m)' : selectedManeuver === 'retrograde' ? 'Lower orbit altitude (-120m)' : 'Shift orbit plane (+0.02°)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delta-V Required:</span>
                        <span className="text-yellow-400 font-semibold font-mono">
                          {selectedManeuver === 'prograde' ? '+0.45 m/s' : selectedManeuver === 'retrograde' ? '-0.31 m/s' : '+0.62 m/s'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Burn Duration:</span>
                        <span className="text-slate-200 font-mono font-semibold">
                          {selectedManeuver === 'prograde' ? '3.8 seconds' : selectedManeuver === 'retrograde' ? '2.6 seconds' : '5.2 seconds'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Propellant Consumption:</span>
                        <span className="text-slate-200 font-mono font-semibold">
                          {selectedManeuver === 'prograde' ? '0.38 kg (Hydrazine)' : selectedManeuver === 'retrograde' ? '0.26 kg (Hydrazine)' : '0.52 kg (Hydrazine)'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-900 text-[10px] text-emerald-400 font-bold">
                        <span>Expected Miss Distance:</span>
                        <span>
                          {(conjunctionAlert.distanceKm + (selectedManeuver === 'prograde' ? 12.4 : selectedManeuver === 'retrograde' ? 9.8 : 15.6)).toFixed(1)} km
                        </span>
                      </div>
                    </div>

                    {/* Execution Button and Statuses */}
                    {burnStatus === 'idle' ? (
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <button
                          onClick={executeAvoidanceBurn}
                          className="py-1.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-bold rounded shadow transition duration-200 flex items-center justify-center gap-1 tracking-wider uppercase font-mono text-[9px]"
                        >
                          <Flame className="w-3.5 h-3.5 fill-slate-950 shrink-0" /> Avoidance Burn
                        </button>
                        <button
                          onClick={executeActiveDebrisRemoval}
                          className="py-1.5 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold rounded shadow transition duration-200 flex items-center justify-center gap-1 tracking-wider uppercase font-mono text-[9px] border border-purple-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-purple-200 shrink-0" /> Cleanup Debris
                        </button>
                      </div>
                    ) : (
                      <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="text-sky-400 font-bold animate-pulse uppercase flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-sky-400 animate-spin" />
                            {burnStatus === 'arming' && 'Arming Thruster Systems...'}
                            {burnStatus === 'precharge' && 'Pre-pressurizing cold-gas conduits...'}
                            {burnStatus === 'firing' && 'Burn in progress (ACS/RCS Online)...'}
                          </span>
                          <span className="text-slate-400 font-mono">{burnProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded overflow-hidden border border-slate-800">
                          <div 
                            className={`h-full transition-all duration-150 ease-out ${
                              burnStatus === 'firing' ? 'bg-gradient-to-r from-red-500 to-amber-500' : 'bg-sky-500'
                            }`}
                            style={{ width: `${burnStatus === 'arming' ? 20 : burnStatus === 'precharge' ? 45 : burnProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[10px] font-mono text-slate-500 bg-slate-900/50 p-2 rounded border border-slate-900 text-center">
            No immediate orbital conjunction warnings. Space corridors clear.
          </div>
        )}
      </div>

      {/* Kessler Debris Risk & Simulation Summary Card */}
      <div className="bg-slate-950/70 p-3 rounded-lg border border-sky-500/20 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-sky-400 shrink-0" /> KESSLER COLLISION RISK
          </div>
          <span className="text-[9px] font-mono font-semibold text-slate-400">
            SIM YEAR: {timelineYear}
          </span>
        </div>

        {/* Risk Percentage and Level badge */}
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-white font-mono">
              {Math.min(99, Math.round(15 + ((timelineYear - 2016) / 20) * 77))}%
            </span>
            <span className="text-[9px] font-mono text-slate-400">RISK INDEX</span>
          </div>
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
            timelineYear < 2023 
              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25' 
              : timelineYear < 2030 
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/25' 
                : 'bg-red-500/10 text-red-400 border-red-500/25'
          }`}>
            {timelineYear < 2023 ? 'MODERATE' : timelineYear < 2030 ? 'HIGH' : 'CRITICAL CASCADE'}
          </span>
        </div>

        {/* Progress Bar indicator */}
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800/50">
          <div 
            className={`h-full transition-all duration-500 ease-out ${
              timelineYear < 2023 ? 'bg-yellow-500' : timelineYear < 2030 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, 15 + ((timelineYear - 2016) / 20) * 77)}%` }}
          />
        </div>

        {/* Dynamic statistics breakdown */}
        <div className="grid grid-cols-2 gap-2 mt-0.5 pt-2 border-t border-slate-900 text-[10px] font-mono">
          <div className="flex flex-col">
            <span className="text-slate-500 uppercase text-[8px]">Est. Debris Count</span>
            <span className="text-slate-200 font-bold">
              {Math.round(22000 + Math.pow(Math.max(1, timelineYear - 2015), 1.8) * 4500).toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 uppercase text-[8px]">Cascade Probability</span>
            <span className="text-slate-200 font-bold">
              {(Math.min(98.4, 4.5 + Math.pow(Math.max(1, timelineYear - 2015), 1.6) * 4.2)).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Orbit Trackers list */}
      <div className="flex flex-col gap-2 grow overflow-y-auto pr-1 scrollbar-thin max-h-[180px]">
        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
          Trackable Space Objects ({satellites.length})
        </label>
        {satellites.map((sat) => (
          <div
            key={sat.id}
            onClick={() => {
              onSelectSat(sat);
              onCenterMap(sat.lat, sat.lon);
            }}
            className={`p-2 rounded-lg border text-left cursor-pointer transition flex justify-between items-center ${
              selectedSat?.id === sat.id
                ? 'bg-sky-950/20 border-sky-500/50'
                : 'bg-slate-950 border-slate-850 hover:bg-slate-900/50 hover:border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                sat.type === 'station' ? 'bg-yellow-500' : sat.type === 'space_debris' ? 'bg-red-500' : 'bg-sky-400'
              }`} />
              <div>
                <span className="text-xs font-semibold text-slate-200 block truncate max-w-[150px]">{sat.name}</span>
                <span className="text-[9px] font-mono text-slate-500 uppercase">{sat.type}</span>
              </div>
            </div>
            <div className="text-right text-[10px] font-mono text-slate-400">
              {sat.lat.toFixed(1)}°, {sat.lon.toFixed(1)}°
            </div>
          </div>
        ))}
      </div>

      {/* Selected Satellite Inspector details */}
      <AnimatePresence mode="wait">
        {selectedSat ? (
          <motion.div
            key={selectedSat.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-t border-slate-800 pt-3 flex flex-col gap-2 overflow-hidden grow max-h-[220px]"
          >
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex flex-col gap-2 font-mono text-xs text-slate-300">
              <h3 className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                <Radio className="w-3.5 h-3.5 text-sky-400 shrink-0" /> Live Telemetry
              </h3>

              {/* Orbital Predictor Toggle */}
              <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded border border-slate-800/80 mb-2">
                <div className="flex items-center gap-1.5">
                  <Orbit className={`w-3.5 h-3.5 ${orbitalPredictorEnabled ? 'text-sky-400 animate-spin' : 'text-slate-500'}`} style={{ animationDuration: '8s' }} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-200">Orbital Predictor</span>
                    <span className="text-[8px] text-slate-400 uppercase font-mono">Keplerian Path</span>
                  </div>
                </div>
                <button
                  onClick={onToggleOrbitalPredictor}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    orbitalPredictorEnabled ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      orbitalPredictorEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Decay Trajectory Toggle */}
              <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded border border-slate-800/80 mb-2">
                <div className="flex items-center gap-1.5">
                  <Flame className={`w-3.5 h-3.5 ${decayTrajectoryEnabled ? 'text-amber-500 animate-pulse' : 'text-slate-500'}`} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-200">Reentry Path Overlay</span>
                    <span className="text-[8px] text-slate-400 uppercase font-mono">Atmospheric Decay</span>
                  </div>
                </div>
                <button
                  onClick={onToggleDecayTrajectory}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    decayTrajectoryEnabled ? 'bg-amber-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      decayTrajectoryEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span className="text-slate-500">Speed:</span>
                <span className="text-slate-100 font-bold">{selectedSat.velocity.toLocaleString()} km/h</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span className="text-slate-500">Altitude:</span>
                <span className="text-slate-100 font-bold">{selectedSat.alt} km</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span className="text-slate-500">Inclination:</span>
                <span className="text-slate-100 font-bold">{selectedSat.inclination}°</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span className="text-slate-500">Operator:</span>
                <span className="text-slate-200 font-medium truncate max-w-[120px]">{selectedSat.operator}</span>
              </div>

              {selectedSat.riskAssessment && (
                <div className="text-[10px] bg-red-500/5 p-2 rounded border border-red-500/15 mt-2 flex flex-col gap-1.5 font-mono text-[10px]">
                  <div className="text-red-400 font-bold flex items-center gap-1 uppercase tracking-wider text-[9px]">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-pulse" /> Debris Hazard Warning
                  </div>
                  <div className="text-slate-300 text-[9px] font-mono leading-normal">
                    {selectedSat.riskAssessment}
                  </div>
                  
                  {selectedSatBurnStatus === 'complete' ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded flex flex-col gap-1 text-emerald-400 text-[9px]">
                      <div className="flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> MANEUVER LOGGED
                      </div>
                      <span>Burn executed. Inclination adjusted (+0.02°). Trajectory cleared.</span>
                    </div>
                  ) : selectedSatBurnStatus === 'firing' ? (
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 space-y-2 text-[9px]">
                      <div className="flex items-center justify-between">
                        <span className="text-sky-400 font-bold animate-pulse uppercase flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-sky-400 animate-spin" /> Firing Thruster...
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-1 rounded overflow-hidden">
                        <div className="h-full bg-amber-500 animate-[pulse_1s_infinite]" style={{ width: '85%' }} />
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-slate-900 pt-1.5 mt-1">
                      <span className="text-slate-400 block mb-1 text-[8px] uppercase font-bold text-amber-400">Avoidance Advisor Rec:</span>
                      <p className="text-slate-400 text-[8px] leading-relaxed mb-2">
                        Initiate a 2.4s reaction system boost (Delta-V: +0.35 m/s) to shift relative epoch positioning by +12s.
                      </p>
                      <button
                        onClick={async () => {
                          setSelectedSatBurnStatus('firing');
                          setTimeout(async () => {
                            setSelectedSatBurnStatus('complete');
                            
                            // Post log for selected sat burn
                            const burnDetails = `Initiated on-demand debris avoidance maneuver for ${selectedSat.name}. Performed active delta-v correction of +0.35m/s to increase clearing corridor by 8.2km.`;
                            
                            try {
                              await fetch('/api/logs', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  user: 'Astra-X Operator',
                                  action: 'ON_DEMAND_SATELLITE_BURN',
                                  details: burnDetails
                                })
                              });
                            } catch (e) {
                              console.error(e);
                            }
                          }, 2500);
                        }}
                        className="w-full py-1 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 font-bold border border-rose-500/30 rounded text-[9px] transition uppercase tracking-wider font-mono"
                      >
                        Deploy Debris Avoidance Burn
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="fallback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-t border-slate-800 pt-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2 py-4"
          >
            <Orbit className="w-4 h-4 text-slate-600" />
            <span>Tap any orbiter on the Globe to hook active downlink streams</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
