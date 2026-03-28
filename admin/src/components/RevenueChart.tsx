"use client";

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

interface RevenueChartProps {
  data?: any[];
}

export function RevenueChart({ data: propData }: RevenueChartProps) {
  const chartData = (propData && propData.length > 0) ? propData : [];
  const isEmpty = chartData.length === 0;

  return (
    <div className="glass-panel rounded-[2.5rem] p-10 shadow-2xl shadow-black/[0.02] flex flex-col h-full relative overflow-hidden bg-white/30 border-white/60">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="flex items-center justify-between mb-12 relative z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h2 className="text-3xl font-extralight text-slate-800 tracking-tight font-outfit">Revenue <span className="text-blue-600">Analytics</span></h2>
          </div>
          <p className="text-sm text-slate-500 uppercase tracking-[0.2em] ml-1">Live stream performance</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-white/60 border border-white rounded-2xl text-xs text-slate-800 uppercase tracking-widest hover:bg-white transition-all shadow-sm">
          Last 30 Days
          <ArrowUpRight className="w-4 h-4 text-blue-600" />
        </button>
      </div>

      <div className="flex-1 min-h-[400px] w-full relative z-10">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <TrendingUp className="w-12 h-12 text-slate-200" />
            <p className="text-xs text-slate-300 uppercase tracking-widest">No revenue data yet</p>
            <p className="text-[10px] text-slate-200">Confirmed bookings with price will appear here</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 13, fontWeight: '300' }}
                dy={15}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 13, fontWeight: '300' }}
                tickFormatter={(value) => `₹${value}`}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.8)',
                  borderRadius: '24px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                  padding: '16px'
                }}
                itemStyle={{ color: '#2563EB', fontSize: '16px', fontWeight: '400' }}
                labelStyle={{ color: '#64748B', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '400', letterSpacing: '0.1em' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={5}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                animationDuration={2500}
                strokeLinecap="round"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
