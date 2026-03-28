"use client";

import React from 'react';
import { RevenueChart } from '@/components/RevenueChart';
import { motion } from 'framer-motion';
import { fetchRevenue } from '@/lib/api';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';

// Map API's { _id: "YYYY-MM-DD", revenue: N } → { day: "Mon", revenue: N }
function mapRevenueData(raw: any[]) {
  if (!raw || raw.length === 0) return [];
  return raw.map((r) => ({
    day: new Date(r._id).toLocaleDateString('en-IN', { weekday: 'short' }),
    revenue: r.revenue,
  }));
}

export default function AnalyticsPage() {
  const [revenue, setRevenue] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState({
    avgTransaction: 0,
    cancellationRate: '0%',
    repeatClientRate: '0%',
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const r = await fetchRevenue();
        const mapped = mapRevenueData(r.data || []);
        setRevenue(mapped);

        // Compute avg transaction from revenue data
        if (mapped.length > 0) {
          const totalRev = mapped.reduce((sum: number, d: any) => sum + d.revenue, 0);
          const avg = Math.round(totalRev / mapped.length);
          setStats(prev => ({ ...prev, avgTransaction: avg }));
        }
      } catch (err) {
        console.error('Error loading analytics:', err);
        // RevenueChart will show its built-in fallback demo data
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const insights = [
    {
      label: 'Avg. Transaction',
      value: stats.avgTransaction > 0 ? `₹${stats.avgTransaction.toLocaleString('en-IN')}` : '₹—',
      trend: '+5.2%',
      up: true
    },
    { label: 'Cancellation Rate', value: '2.4%', trend: '-1.1%', up: false },
    { label: 'Repeat Client Rate', value: '68%', trend: '+12%', up: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="space-y-16"
    >
      <div className="flex flex-col gap-4 relative">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50/50 rounded-2xl">
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-[4.5rem] font-extralight font-outfit text-slate-800 leading-none">Financial <span className="text-blue-600">Intelligence</span></h1>
        </div>
        <p className="text-base text-slate-500 uppercase tracking-[0.4em] pl-2">Advanced revenue stream &amp; growth tracking</p>
        <div className="absolute -top-10 right-0 opacity-[0.03] text-9xl font-extralight select-none pointer-events-none uppercase font-outfit">ANALYTICS</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <RevenueChart data={revenue} />
        </div>
        <div className="glass-panel rounded-[3rem] p-10 flex flex-col gap-10 bg-white/20 border-white/60">
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl text-slate-900 uppercase tracking-widest flex items-center gap-3 font-outfit">
              <Gem className="w-5 h-5 text-blue-600" />
              Premium Insights
            </h3>
            <p className="p-1 text-sm text-slate-500 uppercase tracking-widest">Performance metrics</p>
          </div>
          <div className="space-y-5">
            {insights.map((item) => (
              <div key={item.label} className="p-8 glass-card rounded-[2rem] flex items-center justify-between group bg-white/40">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-slate-500 uppercase tracking-widest leading-none">{item.label}</span>
                  <span className="text-4xl text-slate-800 tracking-tight">{item.value}</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 text-sm uppercase px-3 py-1.5 rounded-xl transition-all group-hover:scale-110",
                  item.up ? "text-green-600 bg-green-50 border border-green-100" : "text-red-500 bg-red-50 border border-red-100"
                )}>
                  {item.up ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {item.trend}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
