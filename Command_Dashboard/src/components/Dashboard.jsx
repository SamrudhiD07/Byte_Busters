import React from 'react';
import { toast } from 'react-hot-toast';
import { 
  Video, Grid, Crosshair, Users, Layers, MoreHorizontal, 
  ChevronDown, Phone, Shield, Radio, Signal, Battery, Navigation, Plus, Camera
} from 'lucide-react';
import { useSystemState } from '../context/SystemContext';
import CommandMap from './CommandMap';
import LiveDroneHUD from './LiveDroneHUD';
import LiveDroneFeed from './LiveDroneFeed';
import MissionHUD from './MissionHUD';
import DeployModal from './DeployModal';
import FeedsView from './FeedsView';
import IntelBrief from './IntelBrief';
import { Peer } from 'peerjs';

const Dashboard = () => {
  const { 
    mapState, fleetStatus, telemetry, alertLog, deployDrone, 
    setCurrentActiveDroneSource, 
    sosEmergency, setSosEmergency,
    intelBrief, setIntelBrief
  } = useSystemState();
  
  const [peerStatus, setPeerStatus] = React.useState('OFFLINE');
  const [activeMission, setActiveMission] = React.useState(null); 
  const [activeView, setActiveView] = React.useState('dashboard'); 
  const [isDeployModalOpen, setIsDeployModalOpen] = React.useState(false);
  const [pendingAlertId, setPendingAlertId] = React.useState(null);

  // VIDEO UPLOAD STATE
  const [isVideoUploadModalOpen, setIsVideoUploadModalOpen] = React.useState(false);
  const [uploadVideoFile, setUploadVideoFile] = React.useState(null);
  const [uploadCameraId, setUploadCameraId] = React.useState('');

  const PUNE_CAMERAS = [
    { id: 'CAM_PUN_01', name: 'Katraj Junction' },
    { id: 'CAM_PUN_02', name: 'Swargate Square' },
    { id: 'CAM_PUN_03', name: 'Shivajinagar Station' },
    { id: 'CAM_PUN_04', name: 'Kothrud Stand' },
    { id: 'CAM_PUN_05', name: 'Deccan Gymkhana' },
    { id: 'CAM_PUN_06', name: 'Hinjewadi Phase 1' },
    { id: 'CAM_PUN_07', name: 'Baner Road' },
    { id: 'CAM_PUN_08', name: 'Kharadi Bypass' },
    { id: 'CAM_PUN_09', name: 'Viman Nagar' },
    { id: 'CAM_PUN_10', name: 'Wakad Bridge' }
  ];

  // Function to handle global redirects from any component
  const handleDroneRedirect = (source) => {
    setCurrentActiveDroneSource(source);
    setActiveView('drone');
    setActiveMission('MANUAL_FEED');
  };

  // Filter for high-priority alerts that need manual approval
  const pendingAlerts = alertLog.filter(a => a.status === 'PENDING_AUTHORITY');

  // ── AUTO-OPEN DEPLOY MODAL ON SOS ──
  React.useEffect(() => {
    if (sosEmergency) {
      setIsDeployModalOpen(true);
    }
  }, [sosEmergency]);

  // Maintain PeerJS logic for backend connectivity
  React.useEffect(() => {
    const peer = new Peer('skynetra-hub-01');
    peer.on('open', () => setPeerStatus('ONLINE'));
    peer.on('call', (call) => {
      call.answer();
      call.on('stream', (stream) => {
        setIsConnected(true);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      });
    });
    return () => peer.destroy();
  }, []);

  const handleDeploy = (caseId, droneId = 'SN_DRONE01') => {
    // Update drone target in system context if needed
    deployDrone(caseId, droneId); 
    setActiveMission(caseId);
    setActiveView('drone');
  };

  const handleEndMission = () => {
    setActiveMission(null);
    setActiveView('dashboard');
  };

  // Handle SOS deploy confirmation
  const handleSOSDeploy = (droneId) => {
    setIsDeployModalOpen(false);
    if (sosEmergency) {
      // Deploy the first pending alert
      const firstPending = alertLog.find(a => a.status === 'PENDING_AUTHORITY');
      if (firstPending) {
        handleDeploy(firstPending.id, droneId);
      } else {
        handleDeploy('SOS_MISSION', droneId);
      }
    } else if (pendingAlertId) {
      handleDeploy(pendingAlertId, droneId);
      setPendingAlertId(null);
    } else {
      handleDeploy('MANUAL_MISSION', droneId);
    }
    setSosEmergency(null);
  };

  // Handle SOS standby (dismiss without deploying)
  const handleSOSStandby = () => {
    setSosEmergency(null);
    setPendingAlertId(null);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsDeployModalOpen(false);
    setSosEmergency(null);
    setPendingAlertId(null);
  };

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0a] text-white font-sans overflow-hidden select-none">
      
      {/* 4. THE LEFT SIDEBAR (Global App Shell) */}
      <aside className="fixed left-0 top-0 h-screen w-16 bg-[#0f0f11] border-r border-[#27272a] flex flex-col items-center py-4 z-50">
        <div className="mb-8">
          <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center cursor-pointer hover:bg-zinc-700 transition-colors border border-[#27272a]">
            <Shield className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <nav className="flex flex-col gap-4 items-center">
          <SidebarIcon 
            icon={Grid} 
            active={activeView === 'dashboard'} 
            onClick={() => { setActiveView('dashboard'); setActiveMission(null); }} 
          />
          <SidebarIcon 
            icon={Crosshair} 
            active={activeView === 'drone'} 
            onClick={() => setActiveView('drone')}
          />
          <SidebarIcon 
            icon={Video} 
            active={activeView === 'feeds'} 
            onClick={() => { setActiveView('feeds'); setActiveMission('MANUAL_FEED'); }}
          />

          {/* New Video Upload Button */}
          <div 
            onClick={() => setIsVideoUploadModalOpen(true)}
            className="p-2.5 transition-all cursor-pointer group flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500" 
            title="Upload Video Feed"
          >
            <Camera className="w-5 h-5 transition-colors group-hover:text-cyan-400" />
          </div>

          <SidebarIcon icon={Users} active={activeView === 'team'} onClick={() => setActiveView('team')} />
          <SidebarIcon icon={Layers} active={activeView === 'layers'} onClick={() => setActiveView('layers')} />
        </nav>

        <div className="mt-auto">
          <SidebarIcon icon={MoreHorizontal} />
        </div>
      </aside>

      {/* 2. MAIN VIEWPORT */}
      <main className="flex-1 ml-16 relative overflow-hidden">
        
        {/* Dynamic Content Rendering based on activeView */}
        {activeView === 'feeds' && (
          <div className="absolute inset-0 z-10 transition-all duration-500 animate-in fade-in">
            <FeedsView onGoToLive={handleDroneRedirect} />
          </div>
        )}

        {activeView === 'dashboard' && (
          <div className="absolute inset-0 z-0 bg-black">
            <CommandMap 
              mapState={mapState} 
              onDeployClick={() => setIsDeployModalOpen(true)}
            />
            
            {/* OVERVIEW MODE OVERLAYS (City View) */}
            <div className="absolute top-4 right-4 z-50 flex justify-end pointer-events-auto">
              <div className="bg-[#18181b]/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 cursor-default shadow-2xl">
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5 shadow-inner">
                  <Users className="w-4 h-4 text-zinc-400" />
                </div>
                <span className="text-xs font-semibold text-white/90">Aayush Aade</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </div>
            </div>

            {/* FLOATING RIGHT WIDGETS */}
            <div className="absolute top-20 right-4 w-[340px] z-10 flex flex-col gap-4 pointer-events-auto">
              <div className="bg-[#18181b]/70 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all hover:bg-[#18181b]/80">
                <h3 className="text-sm font-semibold tracking-tight mb-4 text-white/90 uppercase tracking-widest">SkyNetra Fleet</h3>
                <div className="flex gap-2">
                  {fleetStatus.map(f => (
                    <FleetPill key={f.id} label={f.status} count={f.count} color={`${f.color} shadow-[0_0_10px_rgba(0,0,0,0.2)]`} />
                  ))}
                </div>
              </div>

              <div className="bg-[#18181b]/70 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all hover:bg-[#18181b]/80">
                <div className="text-[11px] font-bold text-red-500 mb-2 font-black uppercase tracking-wider flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] ${pendingAlerts.length > 0 ? 'animate-pulse' : 'opacity-20'}`} />
                  Active Service Calls ({pendingAlerts.length})
                </div>
                
                {pendingAlerts.length > 0 ? (
                  pendingAlerts.map(alert => (
                    <div key={alert.id} className="border border-red-500/40 bg-red-950/20 rounded-lg p-3 group transition-all hover:border-red-500/60 hover:bg-red-950/30 mb-2 animate-in fade-in slide-in-from-right-4">
                      <div className="text-[10px] font-black text-red-400 mb-1 tracking-widest uppercase">CASE ID: {alert.id.slice(-8)}</div>
                      <div className="text-[9px] font-bold text-white/70 mb-3 uppercase">{alert.object} DETECTED</div>
                      <button 
                        onClick={() => {
                          setPendingAlertId(alert.id);
                          setIsDeployModalOpen(true);
                        }}
                        className="bg-[#00E5FF] hover:bg-cyan-400 text-black text-[10px] font-black w-full rounded-md py-2 transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(0,229,255,0.3)] active:scale-95"
                      >
                        Deploy Drone
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] font-bold text-white/20 text-center py-4 uppercase tracking-tighter">
                    No active anomalies detected
                  </div>
                )}
              </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
              <button 
                onClick={() => setIsDeployModalOpen(true)}
                className="bg-[#00e5ff] hover:bg-cyan-400 text-black px-6 py-2.5 rounded-full font-bold shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">New Deployment</span>
              </button>
            </div>
          </div>
        )}

        {activeView === 'drone' && (
          <div className="absolute inset-0 z-30 transition-all duration-500 animate-in fade-in">
            <LiveDroneHUD 
               onBack={() => setActiveView('dashboard')}
               caseId={activeMission || 'Manual Feed'} 
            />
          </div>
        )}
        
        {/* Placeholder for other views */}
        {(activeView === 'team' || activeView === 'layers') && (
          <div className="flex items-center justify-center h-full bg-zinc-900/50">
            <h1 className="text-zinc-500 font-black text-4xl uppercase tracking-widest">{activeView} View</h1>
          </div>
        )}

        {/* Deploy Modal — handles both manual and SOS-triggered deployments */}
        <DeployModal 
          isOpen={isDeployModalOpen}
          onClose={handleModalClose}
          emergencyData={sosEmergency}
          onStandby={handleSOSStandby}
          onDeploy={handleSOSDeploy}
        />

        {/* Mission Intelligence Brief — visible in ALL views */}
        <IntelBrief 
          intelBrief={intelBrief}
          onDismiss={() => setIntelBrief(null)}
        />

        {/* Video Upload Selection Modal */}
        {isVideoUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Upload Camera Feed</h2>
              <p className="text-zinc-400 text-sm mb-6">Select a regional camera ID and upload the video source to initiate pipeline analysis.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Camera Location</label>
                  <select 
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    value={uploadCameraId}
                    onChange={(e) => setUploadCameraId(e.target.value)}
                  >
                    <option value="" disabled>Select a location...</option>
                    {PUNE_CAMERAS.map(cam => (
                      <option key={cam.id} value={cam.id}>
                        {cam.id} - {cam.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Video Source</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="video/*"
                      id="video-upload-input"
                      className="hidden"
                      onChange={(e) => setUploadVideoFile(e.target.files[0])}
                    />
                    <label 
                      htmlFor="video-upload-input"
                      className="w-full flex items-center justify-between bg-[#0a0a0a] border border-dashed border-white/20 hover:border-cyan-500/50 rounded-lg p-3 cursor-pointer transition-colors"
                    >
                      <span className={`text-sm ${uploadVideoFile ? 'text-cyan-400 font-medium' : 'text-zinc-500'}`}>
                        {uploadVideoFile ? uploadVideoFile.name : 'Choose video file...'}
                      </span>
                      <Video className="w-4 h-4 text-zinc-400" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button 
                  className="px-4 py-2 rounded-lg text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => {
                    setIsVideoUploadModalOpen(false);
                    setUploadVideoFile(null);
                    setUploadCameraId('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  disabled={!uploadVideoFile || !uploadCameraId}
                  className="px-6 py-2 rounded-lg text-sm font-bold bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                  onClick={async () => {
                    const formData = new FormData();
                    formData.append('video', uploadVideoFile);
                    formData.append('camera_id', uploadCameraId);
                    
                    try {
                      const res = await fetch(`http://${window.location.hostname}:5002/upload_video`, {
                        method: 'POST',
                        body: formData
                      });
                      
                      const data = await res.json();
                      if (data.status === 'SUCCESS') {
                        toast.success(`Video uploaded successfully to ${uploadCameraId}`);
                        console.log('Server response:', data);
                      } else {
                        toast.error(`Upload failed: ${data.message}`);
                      }
                    } catch (err) {
                      console.error('Upload connection error:', err);
                      // Show the actual error message in the toast to understand what failed
                      toast.error(`Connection failed: ${err.message || 'Server completely unreachable'}`);
                    }
                    
                    setIsVideoUploadModalOpen(false);
                    setUploadVideoFile(null);
                    setUploadCameraId('');
                  }}
                >
                  Confirm Upload
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

const SidebarIcon = ({ icon: Icon, active = false, onClick }) => (
  <div 
    onClick={onClick}
    className={`p-2.5 transition-all cursor-pointer group flex items-center justify-center rounded-lg 
      ${active 
        ? 'bg-cyan-900/20 border border-cyan-500 text-cyan-400' 
        : 'hover:bg-zinc-800 text-zinc-500'}`}
  >
    <Icon className={`w-5 h-5 transition-colors group-hover:text-cyan-400`} />
  </div>
);

const FleetPill = ({ label, count, color }) => (
  <div className={`flex-1 flex flex-col items-center py-1.5 rounded-lg border ${color}`}>
    <span className="text-[10px] font-bold opacity-80">{label}: {count}</span>
  </div>
);

export default Dashboard;
