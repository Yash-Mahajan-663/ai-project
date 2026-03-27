"use client";

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  MessageSquare,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/' },
  { icon: Users, label: 'Client Vault', href: '/clients' },
  { icon: TrendingUp, label: 'Analytics', href: '/analytics' },
  { icon: MessageSquare, label: 'Inquiries', href: '/inquiries' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-6 top-6 bottom-6 w-64 glass-panel rounded-[2.5rem] p-6 hidden lg:flex flex-col z-50 shadow-2xl shadow-blue-500/5">
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Zap className="text-white w-6 h-6 fill-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-light text-slate-900 font-outfit leading-none mb-0.5 tracking-tight">Saloon<span className="text-blue-600 font-light">AI</span></span>
          <span className="text-[10px] font-light text-slate-400 uppercase tracking-[0.2em]">Dashboard</span>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 relative group",
                isActive 
                  ? "bg-white shadow-lg shadow-black/5 text-blue-600 scale-[1.02]" 
                  : "text-slate-500 hover:bg-white/50 hover:text-slate-900 hover:scale-[1.02]",
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 w-1.5 h-6 bg-blue-600 rounded-r-full"
                />
              )}
              <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-900")} />
              <span className="text-sm font-light tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
