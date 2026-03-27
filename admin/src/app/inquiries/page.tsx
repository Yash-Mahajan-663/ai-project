"use client";

import React from 'react';
import { InquiryMonitor } from '@/components/InquiryMonitor';
import { motion } from 'framer-motion';
import { fetchInquiries } from '@/lib/api';
import { Sparkles } from 'lucide-react';

export default function InquiriesPage() {
  const [inquiries, setInquiries] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const i = await fetchInquiries();
        setInquiries(i.data);
      } catch (err) {
        console.error('Error loading inquiries:', err);
      } finally {
        setLoading(false);
      }
    }

    // Initial load
    loadData();

    // Auto-poll every 5 seconds
    const interval = setInterval(loadData, 5000);
    
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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="space-y-12"
    >
      <div className="flex flex-col gap-2 relative">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-blue-50 rounded-xl">
              <Sparkles className="w-6 h-6 text-blue-600" />
           </div>
           <h1 className="text-5xl font-light tracking-tighter font-outfit text-slate-900 leading-none">AI <span className="text-blue-600 font-medium">Reception</span></h1>
        </div>
        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-[0.3em] pl-1">Live WhatsApp Intelligence & Interaction</p>
        
        {/* Floating Decorative Text */}
        <div className="absolute -top-10 right-0 opacity-[0.03] text-8xl font-light select-none pointer-events-none uppercase font-outfit">WHATSAPP</div>
      </div>

      <InquiryMonitor sessions={inquiries} />
    </motion.div>
  );
}
