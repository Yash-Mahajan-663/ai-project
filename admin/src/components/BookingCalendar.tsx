"use client";

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  X,
  Clock,
  User,
  Phone,
  Scissors,
  IndianRupee
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Generate hours from 8 AM to 9 PM (salon operating hours)
const hours = Array.from({ length: 14 }, (_, i) => {
  const h = i + 8;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return { label: `${displayH}:00 ${ampm}`, hour24: h };
});

interface Booking {
  _id: string;
  name?: string;
  phone?: string;
  date?: string | null;
  time?: string | null;
  service?: string | null;
  price?: number;
  status?: string;
  created_at?: string;
}

interface BookingCalendarProps {
  bookings?: Booking[];
}

// Parse time string like "8:00 PM", "11:30 AM" into 24h hour
function parseTimeToHour24(time: string | null | undefined): number | null {
  if (!time || typeof time !== 'string') return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h;
}

// Validate if a date string is actually a valid YYYY-MM-DD date
function isValidDateStr(d: string | null | undefined): d is string {
  if (!d || typeof d !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

// Date Helpers
const getWeekDates = (startDate: Date) => {
  const dates: Date[] = [];
  const start = new Date(startDate);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const formatDateToKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatHeaderRange = (dates: Date[]) => {
  if (dates.length === 0) return "";
  const start = dates[0].toLocaleDateString('en-IN', { month: 'long', day: 'numeric' });
  const end = dates[dates.length - 1].toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${start} – ${end}`;
};

const isToday = (date: Date) => {
  const t = new Date();
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
};

export function BookingCalendar({ bookings: propBookings }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilter, setShowFilter] = useState(false);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  // Filter out invalid bookings and apply status filter
  const validBookings = useMemo(() => {
    if (!propBookings) return [];
    return propBookings.filter(b => {
      if (!isValidDateStr(b.date)) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      return true;
    });
  }, [propBookings, statusFilter]);

  // Pre-compute a map: dateKey -> hour24 -> bookings[]
  const bookingMap = useMemo(() => {
    const map: Record<string, Record<number, Booking[]>> = {};
    for (const b of validBookings) {
      const dateKey = b.date!;
      const h = parseTimeToHour24(b.time);
      if (h === null) continue;
      if (!map[dateKey]) map[dateKey] = {};
      if (!map[dateKey][h]) map[dateKey][h] = [];
      map[dateKey][h].push(b);
    }
    return map;
  }, [validBookings]);

  // Count bookings per date key for the mini stats
  const bookingsPerDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of validBookings) {
      const key = b.date!;
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [validBookings]);

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

  const goToToday = () => setCurrentDate(new Date());

  const getBookingsForCell = (date: Date, hour24: number): Booking[] => {
    const dateKey = formatDateToKey(date);
    return bookingMap[dateKey]?.[hour24] || [];
  };

  const getStatusStyles = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case 'booked':
        return {
          bg: "bg-gradient-to-br from-emerald-50 to-green-100/80 border-emerald-200/60",
          text: "text-emerald-700",
          dot: "bg-emerald-500",
          badge: "bg-emerald-500/10 text-emerald-600"
        };
      case 'pending':
        return {
          bg: "bg-gradient-to-br from-amber-50 to-orange-100/80 border-amber-200/60",
          text: "text-amber-700",
          dot: "bg-amber-500",
          badge: "bg-amber-500/10 text-amber-600"
        };
      case 'cancelled':
        return {
          bg: "bg-gradient-to-br from-red-50 to-rose-100/80 border-red-200/60",
          text: "text-red-600",
          dot: "bg-red-500",
          badge: "bg-red-500/10 text-red-600"
        };
      default:
        return {
          bg: "bg-gradient-to-br from-blue-50 to-indigo-100/80 border-blue-200/60",
          text: "text-blue-700",
          dot: "bg-blue-500",
          badge: "bg-blue-500/10 text-blue-600"
        };
    }
  };

  // Stats for the current week
  const weekStats = useMemo(() => {
    let total = 0, booked = 0, pending = 0, cancelled = 0;
    for (const date of weekDates) {
      const key = formatDateToKey(date);
      const count = bookingsPerDay[key] || 0;
      total += count;
    }
    for (const b of validBookings) {
      const bDate = new Date(b.date + 'T00:00:00');
      if (bDate >= weekDates[0] && bDate <= weekDates[6]) {
        if (b.status === 'booked') booked++;
        else if (b.status === 'pending') pending++;
        else if (b.status === 'cancelled') cancelled++;
      }
    }
    return { total, booked, pending, cancelled };
  }, [weekDates, validBookings, bookingsPerDay]);

  return (
    <>
      <div className="glass-panel rounded-[3rem] p-2 overflow-hidden shadow-2xl flex flex-col border-white/70">
        {/* Calendar Header */}
        <div className="p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white/50 border border-white rounded-3xl flex items-center justify-center shadow-lg shadow-black/5">
              <CalendarIcon className="w-7 h-7 text-blue-600" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl text-slate-900 tracking-tight font-outfit">Booking <span className="text-blue-600 font-medium">Schedule</span></h2>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">{formatHeaderRange(weekDates)}</span>
                <div className="flex items-center gap-1 bg-white/50 p-1 rounded-lg border border-white">
                  <button onClick={prevWeek} className="p-1 hover:bg-white rounded-md transition-all text-slate-600"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <button onClick={goToToday} className="px-2 py-0.5 hover:bg-white rounded-md transition-all text-[9px] uppercase tracking-wider text-blue-600 font-medium">Today</button>
                  <button onClick={nextWeek} className="p-1 hover:bg-white rounded-md transition-all text-slate-600"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          </div>

          {/* Week Stats Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 border border-white rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[10px] font-medium text-slate-600">{weekStats.total} Total</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/60 border border-emerald-100 rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-medium text-emerald-600">{weekStats.booked} Booked</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/60 border border-amber-100 rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] font-medium text-amber-600">{weekStats.pending} Pending</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50/60 border border-red-100 rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-[10px] font-medium text-red-500">{weekStats.cancelled} Cancelled</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-white rounded-2xl text-[10px] text-slate-900 uppercase tracking-widest shadow-xl shadow-black/[0.02] hover:scale-105 transition-all"
              >
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                Filter
                {statusFilter !== 'all' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute top-2 right-2" />
                )}
              </button>
              <AnimatePresence>
                {showFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 bg-white/90 backdrop-blur-xl border border-white rounded-2xl shadow-2xl p-3 z-50 min-w-[160px]"
                  >
                    {['all', 'booked', 'pending', 'cancelled'].map(s => (
                      <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setShowFilter(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-xs capitalize transition-all",
                          statusFilter === s ? "bg-blue-50 text-blue-600 font-medium" : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {s === 'all' ? 'All Bookings' : s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => {
                // Export all valid bookings as CSV
                const csvHeader = 'Name,Phone,Date,Time,Service,Price,Status\n';
                const csvRows = validBookings.map(b =>
                  `"${b.name || 'Anonymous'}","${b.phone || ''}","${b.date || ''}","${b.time || ''}","${b.service || ''}","${b.price || 0}","${b.status || ''}"`
                ).join('\n');
                const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bookings_${statusFilter}_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 border border-blue-500 rounded-2xl text-[10px] text-white uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto m-6 rounded-[2rem] glass-card border-white/50 relative custom-scrollbar" style={{ maxHeight: '700px' }}>
          <div className="min-w-[1000px]">
            {/* Header Row */}
            <div className="grid grid-cols-8 sticky top-0 bg-white/70 backdrop-blur-2xl z-20 border-b border-white/60">
              <div className="p-4 text-center border-r border-white/40" />
              {weekDates.map((date) => {
                const dateKey = formatDateToKey(date);
                const dayCount = bookingsPerDay[dateKey] || 0;
                const today = isToday(date);
                return (
                  <div key={date.toString()} className={cn(
                    "p-4 border-r border-white/40 text-center relative transition-colors",
                    today && "bg-blue-50/50"
                  )}>
                    <span className={cn(
                      "text-[10px] uppercase tracking-[0.2em] block mb-1",
                      today ? "text-blue-600" : "text-slate-500"
                    )}>
                      {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                    </span>
                    <div className={cn(
                      "text-2xl font-outfit leading-none",
                      today ? "text-blue-600" : "text-slate-900"
                    )}>
                      {date.getDate()}
                    </div>
                    {dayCount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="mt-1.5 inline-flex items-center justify-center bg-blue-500 text-white text-[8px] font-bold rounded-full w-5 h-5"
                      >
                        {dayCount}
                      </motion.div>
                    )}
                    {today && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-full" />}
                  </div>
                );
              })}
            </div>

            {/* Time Slots */}
            <div className="relative">
              {hours.map(({ label, hour24 }) => (
                <div key={label} className="grid grid-cols-8 border-b border-black/[0.03] group hover:bg-blue-500/[0.02] transition-colors">
                  <div className="p-4 border-r border-white/40 text-[15px] text-slate-500 text-right uppercase flex items-start justify-end pt-5">
                    {label}
                  </div>
                  {weekDates.map((date) => {
                    const cellBookings = getBookingsForCell(date, hour24);
                    const today = isToday(date);
                    return (
                      <div
                        key={date.toString() + hour24}
                        className={cn(
                          "relative border-r border-white/40 p-1.5 min-h-[72px]",
                          today && "bg-blue-50/20"
                        )}
                      >
                        <AnimatePresence>
                          {cellBookings.map((b, idx) => {
                            const styles = getStatusStyles(b.status);
                            return (
                              <motion.div
                                key={b._id}
                                initial={{ opacity: 0, scale: 0.85, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => setSelectedBooking(b)}
                                className={cn(
                                  "p-2.5 rounded-xl border shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.03] transition-all mb-1",
                                  styles.bg
                                )}
                              >
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center justify-between">
                                    <span className={cn("text-[8px] font-semibold uppercase tracking-widest", styles.text)}>
                                      {b.status}
                                    </span>
                                    <span className="text-[8px] text-slate-500">{b.time}</span>
                                  </div>
                                  <span className="text-[11px] font-medium text-slate-800 truncate leading-tight">
                                    {b.name || 'Anonymous'}
                                  </span>
                                  {b.service && (
                                    <span className="text-[9px] text-slate-500 truncate">
                                      {b.service}
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* No bookings message */}
        {validBookings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
              <CalendarIcon className="w-10 h-10 text-blue-300" />
            </div>
            <p className="text-lg text-slate-500 font-outfit">No bookings found</p>
            <p className="text-xs text-slate-300">Bookings will appear here once customers schedule appointments</p>
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setSelectedBooking(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/80 backdrop-blur-2xl border border-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 relative overflow-hidden"
            >
              {/* Decorative gradient */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />

              <button
                onClick={() => setSelectedBooking(null)}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>

              <div className="relative z-10">
                {/* Status Badge */}
                <div className="mb-6">
                  {(() => {
                    const styles = getStatusStyles(selectedBooking.status);
                    return (
                      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-widest", styles.badge)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", styles.dot)} />
                        {selectedBooking.status}
                      </span>
                    );
                  })()}
                </div>

                {/* Client Name */}
                <h3 className="text-2xl text-slate-900 font-outfit mb-1">
                  {selectedBooking.name || 'Anonymous'}
                </h3>
                <p className="text-xs text-slate-500 mb-6">Booking Details</p>

                {/* Details Grid */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-2xl">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest block">Phone</span>
                      <span className="text-sm font-medium text-slate-700">{selectedBooking.phone || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-2xl">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                      <CalendarIcon className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest block">Date & Time</span>
                      <span className="text-sm font-medium text-slate-700">
                        {selectedBooking.date ? new Date(selectedBooking.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                        {selectedBooking.time && ` • ${selectedBooking.time}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-2xl">
                    <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center">
                      <Scissors className="w-4 h-4 text-pink-500" />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest block">Service</span>
                      <span className="text-sm font-medium text-slate-700">{selectedBooking.service || 'Not specified'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-2xl">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <IndianRupee className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest block">Price</span>
                      <span className="text-sm font-medium text-slate-700">₹{(selectedBooking.price || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {selectedBooking.created_at && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-2xl">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest block">Booked On</span>
                        <span className="text-sm font-medium text-slate-700">
                          {new Date(selectedBooking.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
