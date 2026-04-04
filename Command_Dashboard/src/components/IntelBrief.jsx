import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, AlertTriangle, Shield, Flame, Activity } from 'lucide-react';

const IntelBrief = ({ intelBrief, onDismiss }) => {
  if (!intelBrief) return null;

  const { severity, priority, description, timestamp } = intelBrief;

  // Color mapping based on severity
  const getSeverityColor = (sev) => {
    if (sev >= 80) return { bar: 'bg-red-500', text: 'text-red-400', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]' };
    if (sev >= 50) return { bar: 'bg-amber-500', text: 'text-amber-400', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]' };
    return { bar: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' };
  };

  const getPriorityBadge = (p) => {
    switch (p?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      default:
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
    }
  };

  const getRecommendedGear = (desc) => {
    const lower = (desc || '').toLowerCase();
    if (lower.includes('fire') || lower.includes('smoke') || lower.includes('fuel')) {
      return '🔥 Thermal Scanners & Fire Suppression Kit';
    }
    if (lower.includes('medical') || lower.includes('injur') || lower.includes('bleed') || lower.includes('collision')) {
      return '🏥 First Aid Kit & Thermal Scanners';
    }
    if (lower.includes('crime') || lower.includes('weapon') || lower.includes('armed') || lower.includes('theft')) {
      return '🛡️ Spotlight, Loudspeaker & Evidence Camera';
    }
    return '📦 Standard Response Package';
  };

  const sevColors = getSeverityColor(severity);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`fixed bottom-4 right-4 z-[90] w-[360px] bg-[#0f0f12]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden ${sevColors.glow}`}
      >
        {/* Top accent line */}
        <div className={`h-[2px] w-full ${sevColors.bar}`} />

        {/* Header */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
            <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.15em]">
              Mission Intelligence Brief
            </span>
          </div>
          <button 
            onClick={onDismiss}
            className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-3 h-3 text-zinc-500" />
          </button>
        </div>

        {/* Timestamp */}
        <div className="px-5 pb-3">
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
            Intel Received: {timestamp}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 mx-5" />

        {/* Incident Summary */}
        <div className="px-5 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.15em]">Incident Summary</span>
          </div>
          <p className="text-[12px] font-semibold text-zinc-300 leading-relaxed">
            "{description}"
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 mx-5" />

        {/* Severity + Priority Row */}
        <div className="px-5 py-3 flex gap-4">
          {/* Severity Gauge */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-zinc-500" />
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Severity</span>
              </div>
              <span className={`text-sm font-black tabular-nums ${sevColors.text}`}>{severity}/100</span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-800/80 overflow-hidden">
              <div 
                className={`h-full rounded-full severity-bar-fill ${sevColors.bar}`}
                style={{ width: `${severity}%` }}
              />
            </div>
          </div>

          {/* Priority Badge */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Level</span>
            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-md border ${getPriorityBadge(priority)}`}>
              {priority}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 mx-5" />

        {/* Recommended Gear */}
        <div className="px-5 py-3 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-[0.15em]">Recommended Gear</span>
          </div>
          <p className="text-[11px] font-bold text-zinc-400">
            {getRecommendedGear(description)}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default IntelBrief;
