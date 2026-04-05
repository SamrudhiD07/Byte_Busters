import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { useMap } from 'react-leaflet';
import CommandMap from './CommandMap';
import {
  Video, Grid, Crosshair, Users, Layers, MoreHorizontal,
  ChevronDown, Phone, Shield, Radio, Signal, Battery,
  Navigation, Plus, ChevronLeft, Mic, Target, Maximize,
  Settings, Minus, Map as MapIcon, Camera, Disc, Thermometer,
  Wind, Cloud
} from 'lucide-react';
import { useSystemState } from '../context/SystemContext';

// 1. MiniMap Controls Component
const MiniMapControls = ({ toggleExpand, isExpanded }) => {
  const map = useMap();

  return (
    <>
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-[1000] pointer-events-auto">
        <MapControlButton
          icon={Target}
          onClick={() => map.setView([18.5204, 73.8567], 15)}
          tooltip="Locate Asset"
        />
        <div className="flex flex-col bg-black/60 rounded-lg border border-white/10 overflow-hidden">
          <MapControlButton
            icon={Plus}
            onClick={() => map.zoomIn()}
            tooltip="Zoom In"
          />
          <div className="h-px bg-white/10 mx-1" />
          <MapControlButton
            icon={Minus}
            onClick={() => map.zoomOut()}
            tooltip="Zoom Out"
          />
        </div>
        <MapControlButton
          icon={Navigation}
          tooltip="Center Map"
        />
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto">
        <MapControlButton
          icon={Maximize}
          active={isExpanded}
          onClick={toggleExpand}
          tooltip={isExpanded ? "Minimize" : "Full View"}
        />
      </div>

      <div className="absolute top-4 right-4 z-[1000] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
        <MapControlButton icon={Settings} />
      </div>

      {/* Location Pill logic moved inside for proper positioning over map */}
      <div className="absolute top-4 right-12 z-[1000] bg-white/90 backdrop-blur border border-slate-200 rounded-xl px-4 py-2.5 flex gap-3 items-center shadow-xl pointer-events-none">
        <div className="w-8 h-8 bg-[#EDE9FE] border border-[#7C3AED]/20 rounded-full flex items-center justify-center">
          <Navigation className="w-4 h-4 text-[#7C3AED]" />
        </div>
        <div className="flex flex-col">
          <span className="text-[12px] font-black text-[#1A1A2E] leading-none mb-0.5">Pune, MH</span>
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider uppercase">Sector 7 Command</span>
        </div>
      </div>
    </>
  );
};

const LiveDroneHUD = ({ onBack, caseId }) => {
  const { mapState, alertLog, telemetry } = useSystemState();

  const isDirectObject = typeof caseId === 'object' && caseId !== null;

  let targetLat = 18.5204;
  let targetLng = 73.8567;
  let assignedUnit = 'Swargate Drone';

  if (isDirectObject) {
    targetLat = caseId.lat;
    targetLng = caseId.lng;
    assignedUnit = caseId.droneId;
  } else {
    const alert = alertLog.find(a => a.id === caseId) || alertLog[0];
    if (alert) {
      targetLat = alert.location ? alert.location[0] : 18.5204;
      targetLng = alert.location ? alert.location[1] : 73.8567;
      assignedUnit = alert.assignedUnit || 'Swargate Drone';
    }
  }

  let tempStartPos = [18.5018, 73.8636];
  if (assignedUnit.includes('Shivaji')) tempStartPos = [18.5314, 73.8446];
  else if (assignedUnit.includes('Hadapsar')) tempStartPos = [18.5089, 73.9259];
  else if (assignedUnit.includes('Kothrud')) tempStartPos = [18.5074, 73.8077];

  const tempEndPos = [targetLat, targetLng];

  const [isAutopilot, setIsAutopilot] = useState(true);
  const [isDeployed, setIsDeployed] = useState(true); // START DEPLOYED!
  const [activeCamera, setActiveCamera] = useState('gimbal');
  const [activePayload, setActivePayload] = useState('L');
  const [isMicLive, setIsMicLive] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Real-Time Clock & WebRTC States
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const videoRef = useRef(null);
  const peerInstance = useRef(null);

  // New States for Telemetry and Media
  const [isRecording, setIsRecording] = useState(false);
  const [flash, setFlash] = useState(false);

  // 1. Real-Time Clock Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Bulletproof PeerJS for React Strict Mode
  useEffect(() => {
    if (!peerInstance.current) {
      const peerOptions = {
        host: window.location.hostname,
        port: 9000,
        path: '/peerjs',
        secure: false,
        debug: 2,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      };

      const peer = new Peer('skynetra-hub-01', peerOptions);
      peerInstance.current = peer;

      peer.on('open', (id) => {
        console.log('📡 Hub listening on ID:', id);
      });

      peer.on('call', (call) => {
        console.log('⚠️ Incoming drone transmission...');
        call.answer();

        call.on('stream', (remoteStream) => {
          console.log('✅ Video stream received!');
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
          }
        });

        call.on('error', (err) => {
          console.error('PeerJS Call Error:', err);
        });
      });
    }

    return () => {
      if (peerInstance.current) {
        peerInstance.current.disconnect();
        peerInstance.current.destroy();
        peerInstance.current = null;
      }
    };
  }, []);

  // Added: Function to handle telemetry updates from the child map
  // Function logic deprecated, relying on SystemContext global telemetry instead.
  const handleTelemetryUpdate = (data) => { };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    console.log("Recording state:", !isRecording);
  };

  const takeScreenshot = () => {
    console.log("Screenshot captured and saved to local state.");
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
  };

  // Keyboard Listeners for R and P
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'r') {
        toggleRecording();
      } else if (e.key.toLowerCase() === 'p') {
        takeScreenshot();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording]); // Include isRecording to ensure toggleRecording has fresh state access if needed

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none z-0">

      {/* 0. ACTUAL WEBRTC VIDEO FEED - ROOT LAYER */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0 bg-slate-200"
      />

      {/* Mock Video Gradient / Scanlines Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-white/20 pointer-events-none z-[1]" />
      <div className="absolute inset-10 border border-white/5 pointer-events-none z-[1]" />
      <div className="absolute inset-0 pointer-events-none opacity-5 tactical-grid z-[1]" />

      {/* Flash Effect */}
      {flash && <div className="absolute inset-0 bg-white z-[100] opacity-80 transition-opacity" />}

      {/* 1. MAIN HUD CONTAINER (Left Padding removed, children use absolute positions) */}
      <div className="w-full h-full relative z-10">

        {/* 2. TOP NAVIGATION (z-40) - SKYNETRA BRANDING */}
        <div className="absolute top-1 left-10 flex flex-col z-40 pointer-events-auto">
          <span className="text-3xl font-black tracking-tighter text-[#1A1A2E] uppercase">SKYNETRA</span>
          <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-[0.2em] -mt-1">Active Mission Feed</span>
        </div>

        {/* Top Center: Telemetry & Weather Pills */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center gap-4 z-40">
          <div className="flex items-center gap-5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-100 px-6 py-3.5 text-[12px] font-black tabular-nums shadow-xl shadow-purple-500/5 transition-all">
            <div className="flex items-center gap-2"><Navigation className="w-4 h-4 text-[#64748B]" /> <span className="text-[#7C3AED]">{telemetry?.speed || '0 KMPH'}</span></div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2"><Target className="w-4 h-4 text-[#64748B]" /> <span className="text-[#7C3AED]">{telemetry?.alt || 200} FT</span></div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2 tabular-nums uppercase tracking-widest text-[10px] text-[#64748B]">{currentTime}</div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2"><Battery className={`w-4 h-4 ${telemetry?.battery < 20 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} /> <span className="text-[#1A1A2E]">{telemetry?.battery || 64}%</span></div>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-100 px-5 py-3.5 text-[12px] font-black flex items-center gap-3 cursor-pointer shadow-xl shadow-purple-500/5">
            <span className="text-[#1A1A2E]">51°F</span>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-[#64748B]">
              <Wind className="w-4 h-4" />
              <span>NW 10 MPH</span>
            </div>
            <ChevronDown className="w-4 h-4 text-[#64748B]" />
          </div>
        </div>

        {/* Top Right: Station/User Info */}
        <div className="absolute top-1 right-8 flex items-center gap-5 z-40">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-100 px-4 py-3 flex items-center gap-4 shadow-xl shadow-purple-500/5">
            <div className="flex flex-col">
              <span className="text-[9px] text-[#64748B] uppercase font-black tracking-widest mb-0.5">Base station</span>
              <span className="text-[11px] font-black text-[#1A1A2E]">3457TZ-MH</span>
            </div>
          </div>

          <div className="bg-white/90 border border-slate-100 rounded-full px-5 py-2.5 flex items-center gap-3 cursor-default shadow-xl shadow-purple-500/5 backdrop-blur-md">
            <div className="w-8 h-8 rounded-full bg-[#EDE9FE] flex items-center justify-center border border-slate-100 overflow-hidden">
              <Users className="w-4 h-4 text-[#7C3AED]" />
            </div>
            <span className="text-xs font-black text-[#1A1A2E]">Aayush Aade</span>
            <ChevronDown className="w-4 h-4 text-[#64748B]" />
          </div>
        </div>

        <div className={`absolute top-24 right-8 z-40 bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden border border-slate-100 transition-all duration-300 group shadow-2xl shadow-purple-500/10 ${isMapExpanded ? 'w-[640px] h-[440px]' : 'w-84 h-64'}`}>
          <CommandMap mapState={{ ...mapState, zoom: 12, center: tempStartPos }} isTactical={true}>
            <MiniMapControls
              isExpanded={isMapExpanded}
              toggleExpand={() => setIsMapExpanded(!isMapExpanded)}
            />
          </CommandMap>
        </div>

        {/* 4. QUICK ACTION TOOLBAR (Left, z-40) */}
        <div className="absolute top-1/2 -translate-y-1/2 left-8 flex flex-col gap-6 z-40">
          <div className="flex flex-col gap-3">
            <ActionButton
              hint="R"
              icon={Disc}
              color={isRecording ? "text-red-500 animate-pulse" : "text-[#7C3AED]"}
              onClick={toggleRecording}
            />
            <ActionButton
              hint="P"
              icon={Camera}
              onClick={takeScreenshot}
            />
          </div>

          <div className="flex items-center gap-4 pointer-events-auto">
            <div
              onClick={() => setIsMicLive(!isMicLive)}
              className={`w-12 h-12 rounded-2xl transition-all cursor-pointer active:scale-95 flex items-center justify-center shadow-lg
                ${isMicLive
                  ? 'bg-red-500 text-white shadow-red-500/30 animate-pulse'
                  : 'bg-[#7C3AED] text-white shadow-purple-500/30'}`}
            >
              <Mic className={`w-6 h-6 text-white`} />
            </div>
            <div className="bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-100 shadow-xl shadow-purple-500/5">
              <span className="text-[11px] font-black text-[#1A1A2E] tracking-tight">
                {isMicLive ? 'MIC TRANSMITTING...' : 'Press "K" to dispatch audio'}
              </span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md px-5 py-4 rounded-2xl border border-slate-100 shadow-xl shadow-purple-500/5 flex items-center gap-5">
            <div className="w-6 h-6 bg-[#EDE9FE] rounded-lg flex items-center justify-center text-[11px] font-black text-[#7C3AED]">G</div>
            <div className="flex items-center gap-4 text-[12px] font-black tabular-nums text-[#1A1A2E]">
              <div className="flex items-center gap-2"><Thermometer className="w-4 h-4 text-[#64748B] rotate-90" /> -36°</div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-2"><Target className="w-4 h-4 text-[#64748B]" /> -24°</div>
            </div>
          </div>
        </div>

        {/* 5. BOTTOM CONTROLS (z-40) */}

        {/* Bottom Left: Payload Tools */}
        <div className="absolute bottom-8 left-8 flex gap-2 bg-white/80 backdrop-blur-md border border-slate-100 rounded-2xl p-2 z-40 pointer-events-auto shadow-xl shadow-purple-500/5">
          {[
            { tag: 'L', title: 'Laser Target Designator' },
            { tag: 'F', title: 'Floodlight' },
            { tag: 'E', title: 'Acoustic Emitter / Siren' },
            { tag: 'N', title: 'IR Night Vision Toggle' },
            { tag: 'T', title: 'Thermal PIP' },
            { tag: 'Y', title: 'Yaw Lock' },
            { tag: 'J', title: 'Jettison Payload' }
          ].map((item) => (
            <PayloadButton
              key={item.tag}
              hint={item.tag}
              title={item.title}
              active={activePayload === item.tag}
              onClick={() => setActivePayload(item.tag)}
            />
          ))}
        </div>

        {/* Bottom Center: Autopilot */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-40">
          <button
            onClick={() => setIsAutopilot(!isAutopilot)}
            className={`backdrop-blur-md px-8 py-3.5 rounded-full flex items-center gap-4 transition-all active:scale-95 pointer-events-auto shadow-xl
              ${isAutopilot
                ? 'bg-[#7C3AED] text-white shadow-purple-500/30'
                : 'bg-white/60 border-slate-100 text-[#64748B]'}`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isAutopilot ? 'bg-white animate-pulse' : 'bg-slate-300'}`} />
            <span className={`text-[11px] font-black tracking-[0.2em] uppercase`}>
              Autopilot Mode: {isAutopilot ? 'Active' : 'Manual'}
            </span>
          </button>
        </div>

        {/* Bottom Right: Camera Switcher */}
        <div className="absolute bottom-8 right-8 flex items-center gap-5 z-40 pointer-events-auto">
          <div className="flex bg-white/80 backdrop-blur-md border border-slate-100 rounded-2xl overflow-hidden p-2 gap-2 shadow-xl shadow-purple-500/5">
            <CameraSwitcherButton
              label="Gimbal"
              active={activeCamera === 'gimbal'}
              onClick={() => {
                setActiveCamera('gimbal');
                setIsDeployed(true); // Trigger Dispatch
              }}
            />
            <CameraSwitcherButton
              label="Forward"
              active={activeCamera === 'forward'}
              onClick={() => {
                setActiveCamera('forward');
                setIsDeployed(true); // Trigger Dispatch
              }}
            />
            <CameraSwitcherButton
              label="Thermal"
              active={activeCamera === 'thermal'}
              onClick={() => {
                setActiveCamera('thermal');
                setIsDeployed(true); // Trigger Dispatch
              }}
            />
          </div>

          <button className="bg-[#7C3AED] text-white p-3.5 rounded-2xl shadow-lg shadow-purple-500/30 transition-all hover:scale-105 active:scale-95">
            <Maximize className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

// UI Components
const SidebarIconButton = ({ icon: Icon, active = false, size = 20, onClick }) => (
  <div
    onClick={onClick}
    className={`p-2.5 rounded-lg cursor-pointer transition-all border ${active ? 'bg-cyan-900/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)]' : 'border-transparent text-zinc-500 hover:text-white'}`}
  >
    <Icon size={size} />
  </div>
);

const MapControlButton = ({ icon: Icon, active, onClick, tooltip }) => (
  <button
    title={tooltip}
    onClick={onClick}
    className={`w-10 h-10 flex items-center justify-center backdrop-blur-md rounded-xl transition-all shadow-lg
      ${active ? 'bg-[#7C3AED] text-white' : 'bg-white/80 border border-slate-100 text-[#64748B] hover:bg-[#EDE9FE]'}`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-[#64748B]'}`} />
  </button>
);

const ActionButton = ({ icon: Icon, hint, color, onClick }) => (
  <div className="flex items-center gap-4 group pointer-events-auto">
    <div
      onClick={onClick}
      className="w-12 h-12 bg-white/90 backdrop-blur-md border border-slate-100 rounded-2xl flex items-center justify-center hover:bg-[#EDE9FE] cursor-pointer transition-all shadow-xl shadow-purple-500/5 relative"
    >
      <Icon className={`w-6 h-6 ${color || 'text-[#7C3AED]'}`} />
      {hint && <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#7C3AED] rounded-lg border border-white flex items-center justify-center text-[9px] font-black text-white leading-none shadow-md">{hint}</span>}
    </div>
  </div>
);

const PayloadButton = ({ hint, active, onClick, title }) => (
  <div
    onClick={onClick}
    title={title}
    className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black transition-all cursor-pointer border
      ${active ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-lg shadow-purple-500/30' : 'bg-slate-50 border-slate-100 text-[#64748B] hover:bg-[#EDE9FE]'}`}>
    {hint}
  </div>
);

const CameraSwitcherButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2.5 text-[11px] font-black rounded-xl transition-all uppercase tracking-tight
      ${active ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-500/20' : 'text-[#64748B] hover:bg-[#EDE9FE] hover:text-[#7C3AED]'}`}>
    {label}
  </button>
);

export default LiveDroneHUD;
