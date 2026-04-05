import React, { useState, useEffect, useMemo } from 'react';
import { Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useSystemState } from '../context/SystemContext';

// Utility for Quadratic Bezier Curve Generation
const generateCurvePoints = (start, end, control, steps = 200) => {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = Math.pow(1 - t, 2) * start[0] + 2 * (1 - t) * t * control[0] + Math.pow(t, 2) * end[0];
    const lng = Math.pow(1 - t, 2) * start[1] + 2 * (1 - t) * t * control[1] + Math.pow(t, 2) * end[1];
    points.push([lat, lng]);
  }
  return points;
};

const FlightAnimationLayer = ({ mission }) => {
  const { alertLog, setAlertLog, setMapState, setTelemetry, activeMissions, setActiveMissions, activeMission } = useSystemState();
  
  if (!mission || !mission.startTime) return null;

  // Determine Mission Parameters
  let targetLat = 18.5204;
  let targetLng = 73.8567;
  let assignedUnit = 'Swargate Drone';

  if (mission.lat) {
     targetLat = mission.lat;
     targetLng = mission.lng;
     assignedUnit = mission.droneId;
  } else {
     const alert = alertLog.find(a => a.id === mission.id);
     if (alert && alert.location) {
        targetLat = alert.location[0];
        targetLng = alert.location[1];
        assignedUnit = alert.assignedUnit || 'Swargate Drone';
     }
  }

  // Base Station Coordinates
  let startPos = [18.5018, 73.8636]; 
  if (assignedUnit.includes('Shivaji')) startPos = [18.5314, 73.8446];
  else if (assignedUnit.includes('Hadapsar')) startPos = [18.5089, 73.9259];
  else if (assignedUnit.includes('Kothrud')) startPos = [18.5074, 73.8077];
  
  const endPos = [targetLat, targetLng];

  // Route Generation Strategy
  const { outbound, inbound } = useMemo(() => {
    const s = startPos;
    const e = endPos;
    
    // Outbound Curve (veers right)
    const dx = e[0] - s[0];
    const dy = e[1] - s[1];
    const cOut = [s[0] + dx * 0.4 - dy * 0.2, s[1] + dy * 0.4 + dx * 0.2];
    
    // Inbound Curve (veers opposite side for variety)
    const cIn = [s[0] + dx * 0.6 + dy * 0.2, s[1] + dy * 0.6 - dx * 0.2];
    
    return {
      outbound: generateCurvePoints(s, e, cOut, 200),
      inbound: generateCurvePoints(e, s, cIn, 200)
    };
  }, [startPos[0], startPos[1], endPos[0], endPos[1]]);

  // Physics State
  const [currentPos, setCurrentPos] = useState(startPos);
  const [phase, setPhase] = useState('EN_ROUTE');
  const [drawnRoute, setDrawnRoute] = useState([]);

  // Real-world Physics Parameters
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  // Time-based Physics Engine
  useEffect(() => {
    const distKm = getDistance(startPos[0], startPos[1], endPos[0], endPos[1]);
    const maxSpeedKmph = 120; // 120 km/h tactical cruise speed
    
    // Real-world flight time calculation: Time(h) = Dist(km) / Speed(km/h) -> Convert to MS
    const flightTimeMs = (distKm / maxSpeedKmph) * 3600 * 1000;
    
    const EN_ROUTE_MS = Math.max(3000, flightTimeMs); // Minimum 3s for extremely close flights
    const HOVER_MS = 6000; // Increased hover time for incident resolution
    const RTB_MS = EN_ROUTE_MS; // Return trip takes identical time
    const TOTAL_MS = EN_ROUTE_MS + HOVER_MS + RTB_MS;

    let hasClearedSOS = false;
    let initialBattery = 98; // Fresh spawn

    // Initial telemetry launch setup (ONLY for primary tracking mission)
    const isPrimary = (activeMission === mission.id) || 
                      (!activeMission && activeMissions.length > 0 && activeMissions[activeMissions.length - 1].id === mission.id);
    
    if (isPrimary) {
      setTelemetry(prev => ({ 
        ...prev, 
        speed: '0 kmph', 
        eta: Math.ceil(EN_ROUTE_MS/1000) + 's',
        battery: initialBattery
      }));
    }

    const physicsTick = setInterval(() => {
      const elapsedMs = Date.now() - mission.startTime;

      // Finish Mission
      if (elapsedMs >= TOTAL_MS) {
        clearInterval(physicsTick);
        setActiveMissions(prev => prev.filter(m => m.id !== mission.id));
        if (isPrimary) {
          setTelemetry(prev => ({ ...prev, speed: '0 kmph', eta: 'Landed' }));
        }
        return;
      }

      // Calculations
      const tick = Math.floor(elapsedMs / 100);
      let newPhase = 'EN_ROUTE';
      let pos = outbound[0];
      let partialRoute = [];

      // 1. Outbound Leg
      if (elapsedMs < EN_ROUTE_MS) {
        newPhase = 'EN_ROUTE';
        const progress = elapsedMs / EN_ROUTE_MS;
        const idx = Math.min(199, Math.floor(progress * 200));
        pos = outbound[idx];
        partialRoute = outbound.slice(0, idx + 1);

        if (tick % 10 === 0 && isPrimary) {
          // Dynamic acceleration physics (slowly ramp up to ~120 km/h, slight random variance)
          const currSpeed = progress < 0.1 ? (progress * 10 * 120) : (118 + Math.random() * 4);
          
          setTelemetry(prev => ({
            ...prev,
            speed: currSpeed.toFixed(1) + ' kmph',
            eta: Math.ceil((EN_ROUTE_MS - elapsedMs)/1000) + 's',
            // Estimate battery drain: ranges from 100% to ~85% on a long 7km flight out
            battery: Math.max(0, initialBattery - Math.floor(progress * (distKm * 2.5))) 
          }));
        }
      } 
      // 2. Hover & Neutralize
      else if (elapsedMs < EN_ROUTE_MS + HOVER_MS) {
        newPhase = 'HOVER';
        pos = outbound[199];
        partialRoute = outbound;

        if (!hasClearedSOS) {
          hasClearedSOS = true;
          // Neutralize SOS Marker from Global Map!
          setMapState(prev => ({
            ...prev,
            markers: prev.markers.filter(m => m.type !== 'SOS_MARKER' && !m.id?.includes('SOS'))
          }));

          // Mark historical SOS log as RESOLVED (Incident neutralised!)
          setAlertLog(prev => prev.map(log => 
             log.id.includes('SOS') ? { ...log, status: 'RESOLVED' } : log
          ));
        }

        if (tick % 10 === 0 && isPrimary) {
          setTelemetry(prev => ({
            ...prev,
            speed: '0 kmph',
            eta: 'Hovering'
          }));
        }
      } 
      // 3. Return To Base
      else {
        newPhase = 'RTB';
        const rtbElapsed = elapsedMs - EN_ROUTE_MS - HOVER_MS;
        const progress = rtbElapsed / RTB_MS;
        const idx = Math.min(199, Math.floor(progress * 200));
        pos = inbound[idx];
        
        // When RTB, draw the entire outbound route very faded, and the inbound route up to the drone
        partialRoute = inbound.slice(0, idx + 1);

        if (tick % 10 === 0 && isPrimary) {
           const currSpeed = progress < 0.1 ? (progress * 10 * 120) : (118 + Math.random() * 4);
           setTelemetry(prev => ({
            ...prev,
            speed: currSpeed.toFixed(1) + ' kmph',
            eta: Math.ceil((RTB_MS - rtbElapsed)/1000) + 's',
            battery: Math.max(0, initialBattery - (distKm * 2.5) - Math.floor(progress * (distKm * 2.5))) 
          }));
        }
      }

      setCurrentPos(pos);
      setPhase(newPhase);
      setDrawnRoute(partialRoute);
    }, 100);

    return () => clearInterval(physicsTick);
  }, [mission, outbound, inbound, setMapState, setTelemetry, setActiveMissions, activeMissions, activeMission]);

  // Visual Assets
  const hubIcon = L.divIcon({
    className: 'custom-drone-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-24 h-24 rounded-full bg-cyan-500/10 border border-cyan-500/20"></div>
        <div class="w-8 h-8 rounded-full border border-cyan-400 bg-black/80 flex items-center justify-center shadow-[0_0_15px_#00e5ff]">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-cyan-400"><path d="M20 10c0-4.4-3.6-8-8-8s-8 3.6-8 8"/><path d="M2 10h20"/><path d="m15 10-3 3-3-3"/><path d="M12 13v8"/></svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <>
      <Polyline positions={drawnRoute} pathOptions={{ color: '#00e5ff', weight: 4, lineCap: 'round', opacity: 1 }} />
      {phase === 'RTB' && (
        <Polyline positions={outbound} pathOptions={{ color: '#00e5ff', weight: 2, dashArray: '8, 12', opacity: 0.3 }} />
      )}
      <Marker position={currentPos} icon={hubIcon} />
    </>
  );
};

export default FlightAnimationLayer;
