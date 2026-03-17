"use client";

import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Search } from 'lucide-react';
import type { KanbanAvailableResource } from '@/types/charger';

interface DeleteChargerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: number) => Promise<void>;
  chargers: KanbanAvailableResource[];
}

export default function DeleteChargerModal({ isOpen, onClose, onDelete, chargers }: DeleteChargerModalProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  if (!isOpen) return null;

  const selectedCharger = chargers.find(c => c.id === selectedId);
  const isConfirmed = selectedCharger && confirmName.trim().toUpperCase() === selectedCharger.name.trim().toUpperCase();

  const filteredChargers = chargers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
    if (!selectedId || !isConfirmed) return;
    setDeleting(true);
    setFeedback(null);
    try {
      await onDelete(selectedId);
      setFeedback({ type: 'success', message: 'Carregador desativado com sucesso!' });
      setTimeout(() => {
        setSelectedId(null);
        setConfirmName('');
        setSearchTerm('');
        setFeedback(null);
        onClose();
      }, 1500);
    } catch {
      setFeedback({ type: 'error', message: 'Falha ao desativar. Tente novamente.' });
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setFeedback(null);
    setSelectedId(null);
    setConfirmName('');
    setSearchTerm('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20">
              <Trash2 className="text-red-500" size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Desativar Carregador</h2>
          </div>
          <button onClick={handleClose} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {feedback && (
          <div className={`px-6 py-3 border-b text-sm font-medium flex items-center gap-2 ${feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
            {feedback.type === 'error' && <AlertTriangle size={16} />}
            {feedback.message}
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-red-400 transition-colors" />
            <input
              type="text"
              placeholder="Buscar carregador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white outline-none focus:border-red-500/30 transition-all"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar">
            {filteredChargers.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-4">Nenhum carregador encontrado</p>
            ) : (
              filteredChargers.map(charger => (
                <button
                  key={charger.id}
                  onClick={() => { setSelectedId(charger.id); setConfirmName(''); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center justify-between group ${
                    selectedId === charger.id
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                      : 'bg-slate-800/40 border border-transparent text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <span className="text-sm font-medium truncate">{charger.name}</span>
                  {selectedId === charger.id && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md">
                      Selecionado
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {selectedCharger && (
            <div className="bg-slate-800/40 rounded-xl p-4 border border-red-500/20 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para confirmar, digite o nome <span className="text-white font-bold">&quot;{selectedCharger.name}&quot;</span> abaixo:
                </p>
              </div>
              <input
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={selectedCharger.name}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:border-red-500/50 transition-all font-medium"
                autoFocus
              />
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all"
              disabled={deleting}
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
              disabled={!isConfirmed || deleting}
            >
              <Trash2 size={14} />
              {deleting ? 'Desativando...' : 'Desativar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
