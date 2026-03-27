"use client";

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const data = [
  { value: 400 }, { value: 300 }, { value: 600 }, { value: 400 }, { value: 500 }, { value: 800 }, { value: 700 }
];

interface StatsCardProps {
  title: string;
  value: string;
  trend: string;
  trendType: 'up' | 'down';
  icon: React.ElementType;
}

export function StatsCard({ title, value, trend, trendType, icon: Icon }: StatsCardProps) {
  return (
    <div className="p-6 rounded-[2rem] glass-card group">
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 bg-white/50 rounded-2xl flex items-center justify-center shadow-sm border border-white group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
          <Icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
        </div>
        <div className="h-12 w-24 opacity-40 group-hover:opacity-100 transition-opacity duration-500">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={trendType === 'up' ? "#3B82F6" : "#E11D48"} 
                fillOpacity={0.1} 
                fill={trendType === 'up' ? "#3B82F6" : "#E11D48"} 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="space-y-1">
        <h3 className="text-slate-400 text-[10px] font-light uppercase tracking-[0.2em]">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-light text-slate-900 font-outfit tracking-tight">{value}</span>
          <span className={cn(
            "px-2 py-1 rounded-lg text-[9px] flex items-center gap-1 font-medium uppercase tracking-tighter",
            trendType === 'up' ? "bg-green-100/50 text-green-600 border border-green-200/50" : "bg-red-100/50 text-red-600 border border-red-200/50"
          )}>
            {trendType === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        </div>
      </div>
    </div>
  );
}
