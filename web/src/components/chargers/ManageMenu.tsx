"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Settings2, Plus, Trash2, ChevronDown, Settings, LogOut } from 'lucide-react';

interface ManageMenuProps {
  onOpenCreate: () => void;
  onOpenDelete: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function ManageMenu({ onOpenCreate, onOpenDelete, onOpenSettings, onLogout }: ManageMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-10 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl border border-blue-500/30 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 ${isOpen ? 'bg-blue-500 ring-2 ring-blue-400/30' : ''}`}
        title="Gerenciar Carregadores"
      >
        <Settings2 size={16} />
        <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Gerenciar</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50">
          <div className="p-1.5">
            <button
              onClick={() => { setIsOpen(false); onOpenCreate(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-blue-500/10 hover:text-blue-400 transition-all group"
            >
              <div className="bg-blue-500/10 p-1.5 rounded-md group-hover:bg-blue-500/20 transition-colors">
                <Plus size={14} className="text-blue-500" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Novo Carregador</span>
            </button>

            <div className="mx-3 my-1 border-t border-slate-800"></div>

            <button
              onClick={() => { setIsOpen(false); onOpenDelete(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-all group"
            >
              <div className="bg-red-500/10 p-1.5 rounded-md group-hover:bg-red-500/20 transition-colors">
                <Trash2 size={14} className="text-red-500" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Desativar Carregador</span>
            </button>

            <div className="mx-3 my-1 border-t border-slate-800"></div>

            <button
              onClick={() => { setIsOpen(false); onOpenSettings(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all group"
            >
              <div className="bg-slate-700/30 p-1.5 rounded-md group-hover:bg-slate-700/60 transition-colors">
                <Settings size={14} className="text-slate-400 group-hover:text-white transition-colors" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Expediente / Ajustes</span>
            </button>

            <div className="mx-3 my-1 border-t border-slate-800"></div>

            <button
              onClick={() => { setIsOpen(false); onLogout(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-orange-500/10 hover:text-orange-400 transition-all group"
            >
              <div className="bg-orange-500/10 p-1.5 rounded-md group-hover:bg-orange-500/20 transition-colors">
                <LogOut size={14} className="text-orange-500" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Sair (Logout)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
