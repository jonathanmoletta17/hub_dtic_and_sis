"use client";

import React from "react";
import { CheckCircle, Clock, XCircle, Users } from "lucide-react";
import type { OperationDashboardStats } from "../../types/charger";

interface Props {
  stats: OperationDashboardStats;
}

export default function StatCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {/* Disponíveis */}
      <div className="bg-green-600 rounded-xl p-3 shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200 border border-white/10">
        <div className="flex justify-between items-center z-10 relative">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg w-min border border-white/10">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black text-white tracking-tight leading-none">{stats.available}</h2>
              <p className="text-green-200 text-[11px] font-bold uppercase tracking-widest">Disponíveis</p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all" />
      </div>

      {/* Ocupados */}
      <div className="bg-orange-600 rounded-xl p-3 shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200 border border-white/10">
        <div className="flex justify-between items-center z-10 relative">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg w-min border border-white/10">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black text-white tracking-tight leading-none">{stats.occupied}</h2>
              <p className="text-orange-200 text-[11px] font-bold uppercase tracking-widest">Ocupados</p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all" />
      </div>

      {/* Offline */}
      <div className="bg-slate-700 rounded-xl p-3 shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200 border border-white/10">
        <div className="flex justify-between items-center z-10 relative">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg w-min border border-white/10">
              <XCircle className="w-5 h-5 text-gray-300" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black text-white tracking-tight leading-none">{stats.offline}</h2>
              <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest">Offline</p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all" />
      </div>

      {/* Total */}
      <div className="bg-blue-600 rounded-xl p-3 shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200 border border-white/10">
        <div className="flex justify-between items-center z-10 relative">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg w-min border border-white/10">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black text-white tracking-tight leading-none">{stats.total}</h2>
              <p className="text-blue-200 text-[11px] font-bold uppercase tracking-widest leading-tight">Total<span className="hidden xl:inline"> de Carregadores</span></p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all" />
      </div>
    </div>
  );
}
