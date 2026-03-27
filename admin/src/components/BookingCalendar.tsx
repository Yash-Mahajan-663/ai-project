"use client";

import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const hours = Array.from({ length: 12 }, (_, i) => {
  const h = i + 9;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h;
  return `${displayH}:00 ${ampm}`;
});

interface BookingCalendarProps {
  bookings?: any[];
}

// Date Helpers
const getWeekDates = (startDate: Date) => {
  const dates = [];
  const start = new Date(startDate);
  // Adjust to the nearest Monday
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const formatDateToMapKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatHeaderRange = (dates: Date[]) => {
  if (dates.length === 0) return "";
  const start = dates[0].toLocaleDateString('en-IN', { month: 'long', day: 'numeric' });
  const end = dates[dates.length - 1].toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${start} - ${end}`;
};

export function BookingCalendar({ bookings: propBookings }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const getBookingsForCell = (date: Date, hour: string) => {
    if (!propBookings) return [];
    const dateKey = formatDateToMapKey(date);
    return propBookings.filter(b => {
      // Check date match (YYYY-MM-DD)
      if (b.date !== dateKey) return false;
      
      // Check time match
      // DB time is e.g. "10:00 AM" or "10:30 AM"
      // Calendar hour is "10:00 AM"
      // We want to show all bookings within that hour
      const [h, m_ampm] = (b.time || "").split(':');
      const [m, ampm] = (m_ampm || "").split(' ');
      
      const [calH, calM_ampm] = hour.split(':');
      const [calM, calAmpm] = calM_ampm.split(' ');
      
      return h === calH && ampm === calAmpm;
    });
  };

  const getStatusStyles = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'booked':
        return "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50 text-green-600 shadow-green-500/5";
      case 'pending':
        return "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50 text-amber-600 shadow-amber-500/5";
      case 'cancelled':
        return "bg-gradient-to-br from-red-50 to-rose-50 border-red-200/50 text-red-500 shadow-red-500/5";
      default:
        return "bg-white border-blue-100 text-blue-600 shadow-blue-500/5";
    }
  };

  return (
    <div className="glass-panel rounded-[3rem] p-2 overflow-hidden shadow-2xl flex flex-col h-[700px] border-white/70">
      {/* Calendar Header */}
      <div className="p-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-white/50 border border-white rounded-3xl flex items-center justify-center shadow-lg shadow-black/5">
             <CalendarIcon className="w-7 h-7 text-blue-600" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-light text-slate-900 tracking-tight font-outfit">Booking <span className="text-blue-600 font-medium">Schedule</span></h2>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-light text-slate-400 uppercase tracking-[0.2em]">{formatHeaderRange(weekDates)}</span>
               <div className="flex items-center gap-1 bg-white/50 p-1 rounded-lg border border-white">
                  <button onClick={prevWeek} className="p-1 hover:bg-white rounded-md transition-all text-slate-600"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <button onClick={nextWeek} className="p-1 hover:bg-white rounded-md transition-all text-slate-600"><ChevronRight className="w-3.5 h-3.5" /></button>
               </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-white rounded-2xl text-[10px] font-light text-slate-900 uppercase tracking-widest shadow-xl shadow-black/[0.02] hover:scale-105 transition-all">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              Filter
           </button>
           <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 border border-blue-500 rounded-2xl text-[10px] font-light text-white uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 transition-all">
              <Download className="w-3.5 h-3.5" />
              Export
           </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto m-6 rounded-[2rem] glass-card border-white/50 relative custom-scrollbar">
        <div className="min-w-[1000px]">
          {/* Header Row */}
          <div className="grid grid-cols-8 sticky top-0 bg-white/60 backdrop-blur-2xl z-20 border-b border-white">
            <div className="p-6 text-center border-r border-white" />
            {weekDates.map((date) => (
              <div key={date.toString()} className="p-6 border-r border-white text-center">
                <span className="text-[10px] font-light text-slate-400 uppercase tracking-[0.2em] block mb-1">
                  {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                </span>
                <div className="text-2xl font-light text-slate-900 font-outfit leading-none">
                  {date.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="relative">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-black/[0.02] group hover:bg-blue-500/[0.01]">
                <div className="p-6 border-r border-white text-[10px] font-light text-slate-400 text-right uppercase tracking-tighter">
                  {hour}
                </div>
                {weekDates.map((date) => {
                  const cellBookings = getBookingsForCell(date, hour);
                  return (
                    <div key={date.toString() + hour} className="relative border-r border-white p-3 min-h-[80px]">
                      <AnimatePresence>
                        {cellBookings.map((b, idx) => (
                          <motion.div 
                            key={b._id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                              "absolute inset-1.5 p-3 rounded-2xl border shadow-lg cursor-pointer hover:scale-[1.02] transition-all group/slot z-10",
                              getStatusStyles(b.status)
                            )}
                            style={{ top: `${idx * 10 + 6}px` }} // Basic stack if multiple
                          >
                            <div className="flex flex-col h-full relative">
                              <span className="text-[9px] font-light uppercase tracking-widest mb-1 opacity-80">
                                {b.status} • {b.service || 'No Service'}
                              </span>
                              <span className="text-xs font-light text-slate-900 truncate">
                                {b.name || 'Anonymous'}
                              </span>
                              <div className="absolute top-0 right-0 opacity-0 group-hover/slot:opacity-100 transition-opacity">
                                <MoreVertical className="w-3 h-3 text-slate-400" />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
