"use client";

import React from "react";
import { Trophy, Timer, Zap } from "lucide-react";
import type { Charger, OperationSettings } from "../../types/charger";

interface Props {
  chargers: Charger[];
  settings: OperationSettings;
  onChargerClick?: (charger: Charger) => void;
}

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const formatMinutes = (totalMinutes: number): string => {
  if (totalMinutes <= 0) return "0h 0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}h ${minutes}m`;
};

export default function HorizontalRanking({ chargers, settings, onChargerClick }: Props) {
  const scheduleLabel = `${settings.businessStart ?? "08:00"} - ${settings.businessEnd ?? "18:00"}`;
  const topChargers = chargers
    .filter((c) => !c.is_deleted)
    .sort((a, b) => {
      const ticketDiff = (b.totalTicketsInPeriod || 0) - (a.totalTicketsInPeriod || 0);
      if (ticketDiff !== 0) return ticketDiff;
      return (b.totalServiceMinutes || 0) - (a.totalServiceMinutes || 0);
    });

  return (
    <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl backdrop-blur-md shadow-2xl mt-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">
          <Trophy size={18} className="text-yellow-500" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">Ranking de Carregadores</h3>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
            Performance & Produtividade • {scheduleLabel}
          </p>
        </div>
      </div>

      <div 
        className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar"
        onWheel={(e) => {
          if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
            e.currentTarget.scrollLeft += e.deltaY;
            // Removed e.preventDefault() to fix passive event listener error
          }
        }}
      >
        {topChargers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-600 border border-dashed border-slate-800 rounded-xl">
            <Zap size={24} className="mb-2 opacity-20" />
            <span className="text-xs font-bold uppercase tracking-tighter">
              Aguardando dados de performance
            </span>
          </div>
        ) : (
          topChargers.map((charger, index) => (
            <div
              key={charger.id}
              onClick={() => onChargerClick?.(charger)}
              className="flex-shrink-0 w-48 bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 hover:bg-slate-800/60 transition-all border-b-2 hover:border-b-yellow-500 group relative cursor-pointer"
            >
              <div className="absolute top-2 left-2 flex items-center justify-center w-6 h-6 rounded-lg bg-slate-900/80 border border-slate-700 text-[10px] font-black text-slate-400 group-hover:text-yellow-500 transition-colors z-20">
                #{index + 1}
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-xs font-black text-white border border-slate-600 shadow-inner group-hover:from-yellow-600 group-hover:to-yellow-800 transition-all">
                  {getInitials(charger.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {charger.name}
                  </p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mt-0.5">
                    Posição Atual
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-auto">
                <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800 flex flex-col justify-center">
                  <span className="block text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">
                    Histórico (30d)
                  </span>
                  <span className="text-lg font-black text-white leading-none">
                    {charger.totalTicketsInPeriod || 0}
                  </span>
                </div>
                <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800 flex flex-col justify-center">
                  <div className="flex items-center gap-1 mb-1">
                    <Timer size={8} className="text-slate-500" />
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest leading-none">
                      Total Horas
                    </span>
                  </div>
                  <span className="text-[13px] font-black text-slate-300 truncate block leading-none">
                    {formatMinutes(charger.totalServiceMinutes || 0)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
