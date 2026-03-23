"use client";

import React from "react";
import { CalendarClock, CheckCircle, Clock, Users, XCircle } from "lucide-react";

import type { OperationDashboardStats } from "../../types/charger";

interface Props {
  stats: OperationDashboardStats;
}

interface CardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  className: string;
  labelClassName: string;
}

function StatusCard({ label, value, icon, className, labelClassName }: CardProps) {
  return (
    <div
      className={`rounded-xl p-3 shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200 border border-white/10 ${className}`}
    >
      <div className="flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg w-min border border-white/10">{icon}</div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{value}</h2>
            <p className={`text-[11px] font-bold uppercase tracking-widest ${labelClassName}`}>{label}</p>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all" />
    </div>
  );
}

export default function StatCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
      <StatusCard
        label="Livres"
        value={stats.livres}
        icon={<CheckCircle className="w-5 h-5 text-white" />}
        className="bg-green-600"
        labelClassName="text-green-200"
      />
      <StatusCard
        label="Reservados"
        value={stats.reservados}
        icon={<CalendarClock className="w-5 h-5 text-white" />}
        className="bg-indigo-600"
        labelClassName="text-indigo-200"
      />
      <StatusCard
        label="Em Operacao"
        value={stats.emOperacao}
        icon={<Clock className="w-5 h-5 text-white" />}
        className="bg-orange-600"
        labelClassName="text-orange-200"
      />
      <StatusCard
        label="Offline"
        value={stats.offline}
        icon={<XCircle className="w-5 h-5 text-gray-300" />}
        className="bg-slate-700"
        labelClassName="text-gray-400"
      />
      <StatusCard
        label="Total"
        value={stats.total}
        icon={<Users className="w-5 h-5 text-white" />}
        className="bg-blue-600"
        labelClassName="text-blue-200"
      />
    </div>
  );
}
