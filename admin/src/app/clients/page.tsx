"use client";

import React from 'react';
import { ClientVault } from '@/components/ClientVault';
import { motion } from 'framer-motion';
import { fetchClients } from '@/lib/api';
import { Users } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const c = await fetchClients();
        setClients(c.data);
      } catch (err) {
        console.error('Error loading clients:', err);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="space-y-12"
    >
      <div className="flex flex-col gap-2 relative">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-5xl font-outfit text-slate-900 leading-none">Client <span className="text-blue-600 font-medium">Profiles</span></h1>
        </div>
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-[0.3em] pl-1">Comprehensive customer database & loyalty</p>
        <div className="absolute -top-10 right-0 opacity-[0.03] text-8xl select-none pointer-events-none uppercase font-outfit">CUSTOMERS</div>
      </div>

      <ClientVault clients={clients} />
    </motion.div>
  );
}
