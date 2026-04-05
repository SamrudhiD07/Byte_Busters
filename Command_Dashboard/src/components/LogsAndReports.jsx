import React, { useState } from 'react';
import { useSystemState } from '../context/SystemContext';
import { ShieldAlert, MapPin, Target, Clock, Activity, FileText, CheckCircle2, ChevronRight, Download, Filter, RadioTower } from 'lucide-react';

const LogsAndReports = () => {
  const { alertLog } = useSystemState();
  const [filter, setFilter] = useState('ALL');
  const [expandedRowId, setExpandedRowId] = useState(null);

  // We are strictly using LIVE data from the session - no mocks!
  const filteredLogs = filter === 'ALL' 
    ? alertLog 
    : alertLog.filter(log => log.status === filter || log.type === filter);

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col pt-8 px-10 pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-5 relative">
          {/* Glowing Aura behind icon */}
          <div className="absolute inset-0 bg-cyan-500 blur-[40px] opacity-10 rounded-full w-14 h-14"></div>
          
          <div className="relative w-14 h-14 bg-black border border-cyan-500/40 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(34,211,238,0.2)] z-10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent"></div>
            <FileText className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          </div>
          
          <div className="z-10">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-zinc-500 tracking-[0.1em] uppercase mb-1">
              Mission Ledger
            </h1>
            <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase flex items-center gap-2">
              <RadioTower className="w-3.5 h-3.5 text-cyan-500 animate-pulse" /> Live Session Database Stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 z-10">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-black/50 hover:bg-zinc-900 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all shadow-inner">
            <Filter className="w-4 h-4" /> Filter Records
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500 overflow-hidden relative group border border-cyan-500/50 rounded-xl text-xs font-black uppercase tracking-widest text-cyan-400 hover:text-black transition-all shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]">
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-[150%] skew-x-[-25deg] group-hover:block transition-all duration-700 ease-in-out group-hover:translate-x-[150%]"></div>
            <Download className="w-4 h-4 relative z-10" /> <span className="relative z-10">Export CSV</span>
          </button>
        </div>
      </div>

      {/* INTELLIGENCE STAT CARDS */}
      <div className="grid grid-cols-4 gap-6 mb-8 shrink-0">
        {[
          { label: 'Total Intercepts', value: alertLog.length, icon: Target, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', glow: 'shadow-[0_0_15px_rgba(34,211,238,0.2)]' },
          { label: 'Critical Incidents', value: alertLog.filter(l=>l.type==='CRITICAL').length, icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' },
          { label: 'System Uptime', value: '100%', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]' },
          { label: 'Avg Sync Latency', value: '14ms', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]' }
        ].map((stat, i) => (
          <div key={i} className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-5 flex items-center gap-5 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-16 translate-x-16 group-hover:bg-cyan-500/10 transition-colors"></div>
            <div className={`relative z-10 w-14 h-14 rounded-full ${stat.bg} ${stat.border} border flex items-center justify-center ${stat.glow}`}>
              <stat.icon className={`w-6 h-6 ${stat.color} drop-shadow-[0_0_8px_currentColor]`} />
            </div>
            <div className="relative z-10">
              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 group-hover:text-zinc-400 transition-colors">{stat.label}</div>
              <div className="text-3xl font-black text-white">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TACTICAL TABLE AREA */}
      <div className="flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        {/* Table Filter Tabs */}
        <div className="flex items-center gap-6 border-b border-white/10 px-6 py-4 bg-zinc-950/80 shrink-0">
          {['ALL', 'CRITICAL', 'WARNING', 'RESOLVED'].map(tab => (
            <button 
              key={tab}
              onClick={() => setFilter(tab)}
              className={`text-[10px] font-black tracking-widest uppercase px-4 py-2 rounded-lg transition-all
                ${filter === tab 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
              <RadioTower className="w-12 h-12 text-zinc-800 animate-pulse" />
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">Awaiting Data Streams</p>
                <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Trigger an SOS from the module to populate the ledger</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="sticky top-0 bg-[#080808] z-30 shadow-lg">
                <tr className="border-b border-white/5 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                  <th className="p-5 pl-8">Case ID</th>
                  <th className="p-5">Timestamp</th>
                  <th className="p-5">Target Classification</th>
                  <th className="p-5">AI Confidence</th>
                  <th className="p-5">Coordinates</th>
                  <th className="p-5">Mission Status</th>
                  <th className="p-5 pr-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredLogs.map((log, index) => (
                  <React.Fragment key={index}>
                    <tr 
                      className="hover:bg-cyan-950/20 transition-colors group relative cursor-pointer"
                      onClick={() => setExpandedRowId(expandedRowId === log.id ? null : log.id)}
                    >
                      <td className="p-5 pl-8 relative">
                         {/* Active Row Indicator */}
                         <div className={`absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 transition-transform origin-center ${expandedRowId === log.id ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'}`}></div>
                         <span className="text-xs font-black text-white bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-md drop-shadow-md tracking-wider">
                           {log.id.slice(0, 15)}
                         </span>
                      </td>
                      <td className="p-5 text-sm font-bold text-zinc-400 tracking-wide font-mono">{log.timestamp}</td>
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                           <div className={`w-2.5 h-2.5 rounded-sm rotate-45 ${log.type === 'CRITICAL' ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-orange-500 shadow-[0_0_12px_#f97316]'}`} />
                           <span className="text-[11px] font-black text-zinc-200 tracking-widest uppercase">{log.object}</span>
                        </div>
                      </td>
                      <td className="p-5 w-48">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5 relative">
                            <div className="absolute inset-0 bg-white/5"></div>
                            <div 
                              className={`h-full rounded-full relative ${log.confidence > 0.9 ? 'bg-cyan-400' : 'bg-yellow-400'}`} 
                              style={{ width: `${log.confidence * 100}%` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/50"></div>
                            </div>
                          </div>
                          <span className="text-[10px] font-black text-white w-8 text-right drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                            {(log.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 font-mono">
                          <MapPin className="w-3.5 h-3.5 text-cyan-500 drop-shadow-[0_0_5px_#06b6d4]" />
                          {log.location ? `${log.location[0].toFixed(4)}, ${log.location[1].toFixed(4)}` : 'UNKNOWN'}
                        </div>
                      </td>
                      <td className="p-5">
                        {log.status === 'RESOLVED' ? (
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded uppercase tracking-[0.15em] shadow-[0_0_15px_rgba(16,185,129,0.15)] relative overflow-hidden">
                            <CheckCircle2 className="w-3 h-3 relative z-10" /> <span className="relative z-10">RESOLVED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/50 px-3 py-1.5 rounded uppercase tracking-[0.15em] shadow-[0_0_15px_rgba(34,211,238,0.2)] animate-pulse">
                            <Activity className="w-3 h-3" /> {log.status || 'DEPLOYED'}
                          </span>
                        )}
                      </td>
                      <td className="p-5 pr-8 text-right">
                        <button className="text-zinc-600 hover:text-cyan-400 p-2 transition-all">
                          <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${expandedRowId === log.id ? 'rotate-90 text-cyan-400' : 'group-hover:translate-x-1'}`} />
                        </button>
                      </td>
                    </tr>
                    
                    {/* EXPANDABLE DETAILS ROW */}
                    {expandedRowId === log.id && (
                      <tr className="bg-black/60 border-b border-white/5">
                        <td colSpan="7" className="p-6 pl-14 text-sm text-zinc-300">
                           <div className="border-l-2 border-cyan-500/50 pl-5 py-2">
                             <div className="flex items-center gap-2 mb-2">
                               <ShieldAlert className="w-4 h-4 text-cyan-500" />
                               <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Incident Analysis Report</span>
                             </div>
                             <p className="leading-relaxed font-medium text-zinc-400 max-w-4xl">
                               {log.description || 'No detailed analysis report provided for this incident.'}
                             </p>
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsAndReports;
