"use client";

import React, { useState, useEffect } from 'react';
import { X, Plus, User, MapPin } from 'lucide-react';
import { getLocations } from '@/lib/api/glpiService';

interface CreateChargerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, locationId: number) => Promise<void>;
  loading: boolean;
  context: string;
}

export default function CreateChargerModal({ isOpen, onClose, onCreate, loading, context }: CreateChargerModalProps) {
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState<number | ''>('');
  const [locations, setLocations] = useState<{id: number, name: string, completename: string}[]>([]);
  const [fetchingLocations, setFetchingLocations] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFetchingLocations(true);
      getLocations(context).then(data => {
        const locs = data.locations || [];
        setLocations(locs);
        if (locs.length > 0) setLocationId(locs[0].id);
        setFetchingLocations(false);
      }).catch(() => setFetchingLocations(false));
    }
  }, [isOpen, context]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || locationId === '') return;
    try {
      await onCreate(name, locationId as number);
      setName('');
      onClose();
    } catch (error) {
      console.error("Submit failed", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
              <Plus className="text-blue-500" size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Novo Carregador</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome do Carregador</label>
            <div className="relative group">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <input 
                autoFocus
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: CARREGADOR 10"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-blue-500/50 transition-all font-medium"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Localização</label>
            <div className="relative group">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <select 
                value={locationId}
                onChange={(e) => setLocationId(parseInt(e.target.value))}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-blue-500/50 transition-all appearance-none font-medium cursor-pointer"
                disabled={loading || fetchingLocations}
              >
                {fetchingLocations ? (
                  <option>Carregando localizações...</option>
                ) : locations.length === 0 ? (
                  <option>Nenhuma localização encontrada</option>
                ) : (
                  locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.completename ? `(${loc.completename})` : ''}
                    </option>
                  ))
                )}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all"
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              disabled={loading || !name.trim() || locationId === '' || fetchingLocations}
            >
              {loading ? 'Criando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
