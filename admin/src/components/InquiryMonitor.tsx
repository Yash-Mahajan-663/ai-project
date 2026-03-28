"use client";

import React from 'react';
import {
  MessageSquare,
  User,
  Clock,
  Smartphone,
  Bot,
  CheckCircle2,
  Zap,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface InquiryMonitorProps {
  sessions: any[];
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return 'unknown';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function InquiryMonitor({ sessions }: InquiryMonitorProps) {
  const [activeSession, setActiveSession] = React.useState(sessions[0] || null);

  React.useEffect(() => {
    if (!activeSession && sessions.length > 0) {
      setActiveSession(sessions[0]);
    }
  }, [sessions, activeSession]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
      {/* Sessions Sidebar */}
      <div className="lg:w-80 space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Active Channels</h3>
          <span className="bg-blue-600 text-[10px] text-white px-2 py-0.5 rounded-lg shadow-lg shadow-blue-500/10">{sessions.length} Live</span>
        </div>
        <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
          {sessions.length > 0 ? sessions.map((session) => (
            <motion.div
              key={session._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setActiveSession(session)}
              className={cn(
                "glass-card p-5 rounded-[2rem] cursor-pointer transition-all duration-500 border-white/60 relative overflow-hidden group",
                activeSession?._id === session._id ? "bg-white shadow-2xl shadow-blue-500/10 scale-[1.02] border-blue-500/20" : "hover:bg-white/50"
              )}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                  activeSession?._id === session._id ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
                )}>
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-sm tracking-tight block truncate transition-colors",
                    activeSession?._id === session._id ? "text-slate-900" : "text-slate-600"
                  )}>{session.name || session.phone || 'Anonymous'}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Zap className="w-3 h-3 text-blue-600 animate-pulse" />
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">{(session.stage || 'IDLE').replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-[9px] text-slate-300 mt-0.5 block">{timeAgo(session.updated_at)}</span>
                </div>
              </div>
              {activeSession?._id === session._id && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-2xl" />
              )}
            </motion.div>
          )) : (
            <div className="glass-card rounded-[2rem] p-10 text-center border-dashed border-2 bg-white/10">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">No Active Sessions</span>
            </div>
          )}
        </div>
      </div>

      {/* Live Interaction Canvas */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {activeSession ? (
            <motion.div
              key={activeSession._id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="glass-panel rounded-[3rem] p-8 shadow-2xl shadow-blue-500/5 flex flex-col h-full bg-white/30 border-white/80"
            >
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-black/[0.03]">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-2xl text-slate-900 font-outfit tracking-tight">AI Bot <span className="text-blue-600 font-medium">Active</span></h4>
                      <span className="px-2 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded-lg text-[9px] uppercase tracking-widest">Connected</span>
                    </div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Phone: {activeSession.phone} • Last active: {timeAgo(activeSession.updated_at)}</p>
                  </div>
                </div>
                <button className="p-3 bg-white border border-white rounded-2xl text-slate-500 hover:text-slate-900 transition-all shadow-sm">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              {/* Interaction Timeline */}
              <div className="flex-1 relative pl-12 space-y-12 before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-[2px] before:bg-blue-500/10">
                {[
                  { label: 'Session Initialized', time: timeAgo(activeSession.updated_at), type: 'complete' },
                  { label: `Stage: ${(activeSession.stage || 'IDLE').replace(/_/g, ' ')}`, time: 'Live Now', type: 'active' },
                  {
                    label: activeSession.draft_booking_id
                      ? `Draft: ${activeSession.draft_booking_id.service || 'Service'} on ${activeSession.draft_booking_id.date || 'TBD'}`
                      : 'Awaiting Client Input',
                    time: 'Pending',
                    type: 'future'
                  },
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="relative"
                  >
                    <div className={cn(
                      "absolute -left-12 top-0 w-10 h-10 rounded-full flex items-center justify-center border-4 border-[#F8FAFC] shadow-xl transition-all duration-700",
                      step.type === 'complete' ? "bg-green-500 text-white shadow-green-500/20" :
                        step.type === 'active' ? "bg-blue-600 text-white shadow-blue-600/20 scale-125 animate-pulse" :
                          "bg-white text-slate-300 border-white shadow-black/5"
                    )}>
                      {step.type === 'complete' && <CheckCircle2 className="w-5 h-5" />}
                      {step.type === 'active' && <Clock className="w-5 h-5" />}
                      {step.type === 'future' && <div className="w-2 h-2 rounded-full bg-slate-300" />}
                    </div>
                    <div className="flex flex-col gap-1.5 pt-1">
                      <span className={cn(
                        "text-base uppercase tracking-tight font-outfit",
                        step.type === 'active' ? "text-blue-600 font-medium" : "text-slate-900"
                      )}>{step.label}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">{step.time}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bot Action Logic */}
              <div className="mt-12 p-6 rounded-[2rem] bg-indigo-50/50 border border-indigo-100/50 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-indigo-600 uppercase tracking-widest">Bot Intelligence</span>
                  <p className="text-sm text-slate-900 tracking-tight">Intervene if client seems confused?</p>
                </div>
                <div className="flex gap-4">
                  <button className="px-6 py-3 bg-white border border-white rounded-[1.2rem] text-[10px] text-slate-900 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">Restart Bot</button>
                  <button className="px-6 py-3 bg-indigo-600 rounded-[1.2rem] text-[10px] text-white uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">Manual takeover</button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="glass-panel rounded-[3.5rem] h-full flex flex-col items-center justify-center text-center p-20 border-white/50 bg-white/20 border-dashed border-4">
              <div className="w-24 h-24 bg-white/50 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-black/5">
                <MessageSquare className="w-10 h-10 text-slate-300" />
              </div>
              <h4 className="text-2xl text-slate-300 font-outfit uppercase tracking-widest">Deep Sleep Mode</h4>
              <p className="max-w-xs text-sm text-slate-500 mt-4 leading-relaxed uppercase tracking-tight">Your AI Bot is waiting for the next WhatsApp inquiry. Sessions will ignite here in real-time.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
