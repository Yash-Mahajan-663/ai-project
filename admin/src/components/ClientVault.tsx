"use client";

import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Phone,
  Calendar,
  MoreHorizontal,
  ArrowUpRight,
  X,
  CreditCard,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ClientVaultProps {
  clients?: any[];
}

function VisitDetailsModal({ client, onClose }: { client: any, onClose: () => void }) {
  if (!client) return null;

  const sortedVisits = [...(client.visitDetails || [])].sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white/90 glass-panel rounded-[2.5rem] w-full max-w-2xl overflow-hidden border-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-light shadow-lg shadow-blue-500/20">
              {client.name[0]}
            </div>
            <div>
              <h3 className="text-2xl font-medium text-slate-900 font-outfit">{client.name}</h3>
              <p className="text-sm tracking-wide">{client.phone} • Member Profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Loyalty Visit History</span>
          </div>

          <div className="space-y-4">
            {sortedVisits.length > 0 ? sortedVisits.map((visit: any, idx: number) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={idx}
                className="p-5 rounded-2xl bg-white border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{visit.service || 'General Service'}</p>
                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-tight">
                      {new Date(visit.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} • {visit.time}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-blue-600 font-medium">
                    <span className="text-[10px]">₹</span>
                    <span>{visit.price}</span>
                  </div>
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                    visit.status === 'booked' ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                  )}>
                    {visit.status}
                  </span>
                </div>
              </motion.div>
            )) : (
              <div className="py-10 text-center text-slate-300 uppercase text-[10px] tracking-[0.2em] font-light">
                No visit records available
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none mb-1">Lifetime Value</span>
              <span className="text-lg font-medium text-slate-900 font-outfit leading-none">{client.spend}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ClientVault({ clients: propClients }: ClientVaultProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const displayClients = (propClients || []).map(c => ({
    id: c._id,
    name: c.name || 'Anonymous',
    phone: c._id,
    spend: `₹${(c.totalSpend || 0).toLocaleString('en-IN')}`,
    visits: c.bookingCount || 0,
    visitDetails: c.visits || [],
    lastVisit: c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
  }));

  const filteredClients = displayClients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <>
      <div className="glass-panel rounded-[3rem] p-4 shadow-2xl relative overflow-hidden border-white/80">
        {/* Search Header */}
        <div className="p-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-light text-slate-900 tracking-tight font-outfit">Client <span className="text-blue-600 font-medium">Vault</span></h2>
            <p className="text-[10px] font-light text-slate-400 uppercase tracking-[0.2em]">{filteredClients.length} Profiles Found</p>
          </div>

          <div className="flex items-center gap-3 flex-grow max-lg shadow-sm">
            <div className="relative flex-grow group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-blue-600" />
              <input
                type="text"
                placeholder="Search Name, Phone or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                suppressHydrationWarning={true}
                className="w-full bg-white/60 border border-white rounded-[1.5rem] py-3 pl-12 pr-6 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-medium shadow-sm"
              />
            </div>
            <button className="w-12 h-12 flex items-center justify-center bg-white border border-white rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="m-4 overflow-hidden rounded-[2.5rem] bg-white/20 border border-white/40">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/[0.02] bg-white/30 backdrop-blur-md">
                  <th className="px-8 py-6 text-[11px] font-light text-slate-400 uppercase tracking-widest">Profile</th>
                  <th className="px-8 py-6 text-[11px] font-light text-slate-400 uppercase tracking-widest">Contact Info</th>
                  <th className="px-8 py-6 text-[11px] font-light text-slate-400 uppercase tracking-widest">Loyalty</th>
                  <th className="px-8 py-6 text-[11px] font-light text-slate-400 uppercase tracking-widest">Total Spend</th>
                  <th className="px-8 py-6 text-[11px] font-light text-slate-400 uppercase tracking-widest text-right">More</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.01]">
                {filteredClients.map((client, i) => (
                  <motion.tr
                    key={client.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group hover:bg-white/40 transition-all duration-300"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-white flex items-center justify-center text-blue-600 font-light text-sm uppercase shadow-sm group-hover:scale-110 transition-transform">
                          {client.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-light text-slate-900 tracking-tight">{client.name}</span>
                          <span className="text-[10px] text-slate-400 font-light uppercase tracking-tight">{client.lastVisit} • Last Visit</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 group/phone">
                        <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-green-600 border border-green-100 group-hover/phone:bg-green-600 group-hover/phone:text-white transition-colors">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-bold text-slate-600">{client.phone}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div
                        className="flex flex-col gap-1 cursor-pointer group/visits"
                        onClick={() => setSelectedClient(client)}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-blue-500 group-hover/visits:scale-125 transition-transform" />
                          <span className="text-sm font-light text-slate-900 group-hover/visits:text-blue-600 transition-colors">{client.visits} Visits</span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${Math.min(client.visits * 10, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1.5 font-light text-blue-600 text-lg font-outfit">
                        <span className="text-xs">₹</span>
                        {client.spend.replace('₹', '')}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="w-10 h-10 flex items-center justify-center bg-white/40 rounded-xl hover:bg-blue-600 hover:text-white transition-all group-hover:shadow-lg shadow-blue-500/20"
                      >
                        <ArrowUpRight className="w-5 h-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredClients.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Users className="w-10 h-10 text-slate-200" />
                <p className="text-xs text-slate-300 font-light uppercase tracking-widest">No clients found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedClient && (
          <VisitDetailsModal
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
