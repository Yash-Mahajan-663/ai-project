"use client";

import React from 'react';
import { 
  Bell, 
  Calendar, 
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ActivityFeedProps {
  bookings?: any[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const statusColor: Record<string, string> = {
  booked: 'text-green-600 bg-green-50 border-green-100',
  pending: 'text-amber-600 bg-amber-50 border-amber-100',
  cancelled: 'text-red-500 bg-red-50 border-red-100',
};

export function ActivityFeed({ bookings: propBookings }: ActivityFeedProps) {
  const activities = (propBookings || []).map(b => ({
    id: b._id,
    user: b.name || 'Anonymous',
    action: `${b.service || 'a service'}${b.date ? ' • ' + b.date : ''}${b.time ? ' ' + b.time : ''}`,
    time: timeAgo(b.created_at),
    status: b.status,
  }));

  return (
    <div className="glass-panel rounded-[2rem] p-6 shadow-xl flex flex-col h-full relative overflow-hidden">
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex flex-col gap-1">
          <h2 className="text-md font-light text-slate-900 tracking-tight flex items-center gap-2 font-outfit uppercase">
            <Bell className="w-5 h-5 text-indigo-500" />
            Activity <span className="text-indigo-600 font-light">Stream</span>
          </h2>
          <p className="text-[10px] text-slate-400 font-light uppercase tracking-widest pl-1">Recent Bookings</p>
        </div>
      </div>

      <div className="flex-1 space-y-5 relative z-10">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
            <Calendar className="w-8 h-8 text-slate-200" />
            <p className="text-xs text-slate-300 font-light uppercase tracking-widest">No bookings yet</p>
          </div>
        ) : (
          activities.map((activity, i) => (
            <motion.div 
              key={activity.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="group flex items-start gap-4 transition-all"
            >
              <div className="w-10 h-10 rounded-2xl bg-white/60 border border-white flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900 leading-tight truncate">{activity.user}</span>
                  <span className="text-[9px] text-slate-400 font-medium bg-white/40 px-1.5 py-0.5 rounded-lg border border-white/50 flex-shrink-0">
                    {activity.time}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-slate-500 font-medium tracking-tight truncate">{activity.action}</span>
                  <span className={`text-[8px] font-medium uppercase px-1.5 py-0.5 rounded-md border flex-shrink-0 ${statusColor[activity.status] || 'text-slate-400 bg-slate-50 border-slate-100'}`}>
                    {activity.status}
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
      
      <div className="mt-8 pt-4 border-t border-black/[0.03] relative z-10">
        <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/30 flex items-center justify-between group cursor-pointer hover:bg-indigo-50 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-medium text-indigo-600 uppercase tracking-widest">
              {activities.length > 0 ? `${activities.length} bookings shown` : 'Waiting for bookings'}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-indigo-400 transform group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}
