"use client";

import React from 'react';
import { Settings, Shield, Bell, Palette, Database, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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

export default function SettingsPage() {
  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-12 pb-20"
    >
      <div className="flex flex-col gap-2 relative">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-blue-50 rounded-xl">
              <Settings className="w-6 h-6 text-blue-600" />
           </div>
           <h1 className="text-5xl font-light tracking-tighter font-outfit text-slate-900 leading-none">System <span className="text-blue-600 font-medium">Control</span></h1>
        </div>
        <p className="text-[11px] text-slate-400 font-light uppercase tracking-[0.3em] pl-1">Global configuration & system parameters</p>
        <div className="absolute -top-10 right-0 opacity-[0.03] text-8xl font-light select-none pointer-events-none uppercase font-outfit">SETTINGS</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl">
         {[
           { icon: Palette, title: 'Branding', desc: 'Custom colors, logos and premium themes.', color: 'text-indigo-600', bg: 'bg-indigo-50' },
           { icon: Bell, title: 'Notifications', desc: 'WhatsApp and Email alert intelligence.', color: 'text-blue-600', bg: 'bg-blue-50' },
           { icon: Shield, title: 'Security', desc: 'Administrative roles and access protocols.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
           { icon: Database, title: 'Data Vault', desc: 'Cloud synchronization and secure backups.', color: 'text-rose-600', bg: 'bg-rose-50' },
         ].map((setting) => (
           <motion.div 
             key={setting.title}
             variants={item}
             className="glass-panel group p-8 rounded-[2.5rem] flex items-center justify-between hover:scale-[1.02] transition-all cursor-pointer border-white/60 bg-white/20"
           >
              <div className="flex items-start gap-6">
                 <div className={cn("p-4 rounded-2xl border border-white shadow-sm transition-transform group-hover:scale-110", setting.bg, setting.color)}>
                    <setting.icon className="w-6 h-6" />
                 </div>
                 <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-light text-slate-900 tracking-tight font-outfit">{setting.title}</h3>
                    <p className="text-xs text-slate-400 font-light leading-relaxed tracking-tight max-w-[200px]">{setting.desc}</p>
                 </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/50 border border-white flex items-center justify-center text-slate-300 group-hover:text-blue-600 transition-colors shadow-sm">
                 <ChevronRight className="w-5 h-5" />
              </div>
           </motion.div>
         ))}
      </div>
      
      {/* Decorative Text */}
      <div className="fixed -bottom-10 -right-10 opacity-[0.02] text-[15rem] font-light select-none pointer-events-none uppercase font-outfit">SYSTEM</div>
    </motion.div>
  );
}
