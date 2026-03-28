"use client";

import React from 'react';
import {
  DollarSign,
  CalendarCheck,
  Users,
  Clock,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';
import { RevenueChart } from '@/components/RevenueChart';
import { ActivityFeed } from '@/components/ActivityFeed';
import { motion } from 'framer-motion';
import { fetchStats, fetchRevenue, fetchBookings, fetchClients } from '@/lib/api';

const container = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.1,
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1] as any
    }
  }
};

const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 }
};

// Map API's { _id: "YYYY-MM-DD", revenue: N } → { day: "Mon", revenue: N }
function mapRevenueData(raw: any[]) {
  if (!raw || raw.length === 0) return [];
  return raw.map((r) => ({
    day: new Date(r._id).toLocaleDateString('en-IN', { weekday: 'short' }),
    revenue: r.revenue,
  }));
}

export default function Dashboard() {
  const [stats, setStats] = React.useState<any>(null);
  const [revenueData, setRevenueData] = React.useState<any[]>([]);
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      // Independent fetches — one failure won't crash the whole dashboard
      const [sRes, rRes, bRes, cRes] = await Promise.allSettled([
        fetchStats(),
        fetchRevenue(),
        fetchBookings(),
        fetchClients(),
      ]);

      if (sRes.status === 'fulfilled') setStats(sRes.value.data);
      if (rRes.status === 'fulfilled') setRevenueData(mapRevenueData(rRes.value.data));
      if (bRes.status === 'fulfilled') setBookings(bRes.value.data || []);
      if (cRes.status === 'fulfilled') setClients(cRes.value.data || []);

      setLoading(false);
    }

    // Initial load
    loadData();

    // Auto-poll stats every 10 seconds
    const interval = setInterval(loadData, 10000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-12 pb-20"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-6xl font-outfit text-slate-900 leading-none">
              Executive <span className="text-blue-600 font-medium">Vision</span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 font-medium uppercase tracking-[0.4em] pl-1">Operational intelligence dashboard</p>
        </div>

        <div className="flex items-center gap-4 glass-card px-6 py-3 rounded-[2rem] border-white/80 shadow-2xl shadow-blue-500/5 group cursor-pointer hover:scale-105 transition-transform">
          <div className="flex -space-x-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-10 h-10 rounded-2xl border-4 border-white bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center shadow-lg" />
            ))}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-900 leading-none">+{clients.length} Clients</span>
            <span className="text-[9px] font-medium text-blue-600 uppercase tracking-widest mt-1">Total in database</span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <motion.div variants={item}>
          <StatsCard
            title="Gross Revenue"
            value={`₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`}
            trend="+12.5%"
            trendType="up"
            icon={DollarSign}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatsCard
            title="Bookings Today"
            value={(stats?.todayBookings ?? 0).toString()}
            trend="+4"
            trendType="up"
            icon={CalendarCheck}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatsCard
            title="Total Clients"
            value={(stats?.newClients ?? 0).toString()}
            trend="+15%"
            trendType="up"
            icon={Users}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatsCard
            title="Active AI Sessions"
            value={(stats?.pendingInquiries ?? 0).toString().padStart(2, '0')}
            trend="-2"
            trendType="down"
            icon={Clock}
          />
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <motion.div variants={item} className="lg:col-span-2 min-h-[450px]">
          <RevenueChart data={revenueData} />
        </motion.div>
        <motion.div variants={item}>
          <ActivityFeed bookings={bookings.slice(0, 6)} />
        </motion.div>
      </div>

      <div className="fixed -bottom-10 -left-10 opacity-[0.02] text-[15rem] select-none pointer-events-none uppercase font-outfit">SALOON</div>
    </motion.div>
  );
}
