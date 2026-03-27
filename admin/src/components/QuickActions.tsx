"use client";

import React from 'react';
import { Plus, X, Calendar, UserPlus, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function QuickActions() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 right-0 mb-4 flex flex-col gap-3 items-end"
          >
            {[
              { icon: Calendar, label: 'New Booking', color: 'bg-green-500' },
              { icon: UserPlus, label: 'Add Client', color: 'bg-blue-600' },
              { icon: Receipt, label: 'Manual Order', color: 'bg-indigo-600' },
            ].map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 group"
              >
                <span className="bg-white/80 backdrop-blur-md border border-white px-3 py-1.5 rounded-lg text-xs font-black text-[#2563EB] shadow-lg uppercase tracking-widest leading-none ring-1 ring-blue-500/10">
                  {item.label}
                </span>
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-transform hover:scale-110",
                  item.color
                )}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 bg-[#2563EB] text-white transition-all duration-300 hover:rotate-90",
          isOpen && "bg-white/40 text-blue-600 backdrop-blur-xl border border-white/60 rotate-45"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  );
}
