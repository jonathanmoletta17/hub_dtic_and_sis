"use client";

import React, { useState, useMemo } from 'react';
import { X, Settings, Clock, AlertTriangle, Save, Loader2, Calendar, CheckSquare, Square, Zap, Search, Power, MessageSquare } from 'lucide-react';
import { KanbanAvailableResource, OperationSettings } from '@/types/charger';
import { updateChargerSchedule, toggleChargerOffline, batchUpdateChargers, request } from '@/lib/api/chargerService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chargers: KanbanAvailableResource[];
  context: string;
  onUpdate: () => void;
}

export default function SettingsModal({ isOpen, onClose, chargers, context, onUpdate }: SettingsModalProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  
  // States for Batch Actions
  const [businessStart, setBusinessStart] = useState("08:00");
  const [businessEnd, setBusinessEnd] = useState("18:00");
  const [isOffline, setIsOffline] = useState(false);
  const [offlineReason, setOfflineReason] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");
  const [applySchedule, setApplySchedule] = useState(false);
  const [applyOffline, setApplyOffline] = useState(false);
  
  // Local Loading for quick actions
  const [localLoading, setLocalLoading] = useState<Record<number, boolean>>({});

  const filteredChargers = useMemo(() => {
    return chargers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.location || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [chargers, searchTerm]);

  // === SINCRONIZAÇÃO de campos ao mudar seleção ===
  // Quando o usuário seleciona/desseleciona carregadores, resetamos applySchedule/applyOffline
  // e populamos os inputs com os valores reais dos selecionados.
  const syncFieldsFromSelection = (ids: number[]) => {
    setApplySchedule(false);
    setApplyOffline(false);
    
    if (ids.length === 0) return;

    const selected = chargers.filter(c => ids.includes(c.id));
    if (selected.length === 1) {
      // Seleção individual: carrega valores reais desse carregador
      const ch = selected[0];
      setBusinessStart(ch.business_start || "08:00");
      setBusinessEnd(ch.business_end || "18:00");
      setIsOffline(ch.is_offline);
      setOfflineReason(ch.offline_reason || "");
      setExpectedReturn(ch.expected_return || "");
    } else {
      // Seleção múltipla: verifica se todos possuem o mesmo expediente
      const starts = new Set(selected.map(c => c.business_start || "08:00"));
      const ends = new Set(selected.map(c => c.business_end || "18:00"));
      setBusinessStart(starts.size === 1 ? [...starts][0] : "08:00");
      setBusinessEnd(ends.size === 1 ? [...ends][0] : "18:00");
      setIsOffline(false);
      setOfflineReason("");
      setExpectedReturn("");
    }
  };

  if (!isOpen) return null;

  const toggleSelect = (id: number) => {
    const next = selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id];
    setSelectedIds(next);
    syncFieldsFromSelection(next);
  };

  const selectAll = () => {
    if (selectedIds.length === filteredChargers.length) {
      setSelectedIds([]);
      syncFieldsFromSelection([]);
    } else {
      const allIds = filteredChargers.map(c => c.id);
      setSelectedIds(allIds);
      syncFieldsFromSelection(allIds);
    }
  };

  const handleQuickStatusToggle = async (e: React.MouseEvent, charger: KanbanAvailableResource) => {
    e.stopPropagation();
    if (localLoading[charger.id]) return; // Evita duplo clique

    setLocalLoading(prev => ({ ...prev, [charger.id]: true }));
    try {
      await toggleChargerOffline(context, charger.id, !charger.is_offline, "Ação Rápida via Painel", "");
      onUpdate();
    } catch (error) {
      alert("Erro na ação rápida.");
    } finally {
      setLocalLoading(prev => ({ ...prev, [charger.id]: false }));
    }
  };

  const handleApplyBatch = async () => {
    if (selectedIds.length === 0) {
      alert("Selecione ao menos um carregador.");
      return;
    }

    setLoading(true);
    try {
      const data = await request<any>(`/api/v1/${context}/chargers/batch-action`, {
        method: "POST",
        body: JSON.stringify({
          charger_ids: selectedIds,
          update_schedule: applySchedule,
          schedule: {
            business_start: businessStart,
            business_end: businessEnd,
            work_on_weekends: false
          },
          update_offline: applyOffline,
          offline: {
            is_offline: isOffline,
            reason: offlineReason || null,
            expected_return: expectedReturn || null
          }
        }),
      });
      
      if (data.success) {
        const failures = data.results?.filter((r: any) => 
          r.updates.some((u: any) => !u.success)
        );

        if (failures && failures.length > 0) {
          alert(`Ação concluída com ${failures.length} falhas parciais. Verifique os carregadores afetados.`);
        }
        
        onUpdate();
        onClose();
      } else {
        throw new Error(data.message || "Batch failed");
      }
    } catch (error) {
      alert("Erro ao aplicar em lote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div 
        className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-5xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
              <Settings size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white leading-tight tracking-tight">Gestão Rápida de Operação</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">Configuração em lote • Expediente • Status</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2.5 hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-700">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Selection List */}
          <div className="w-[380px] border-r border-slate-800/80 flex flex-col bg-slate-900/30">
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Filtrar carregadores ou local..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedIds.length} selecionados</span>
                <button onClick={selectAll} className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:underline">
                  {selectedIds.length === filteredChargers.length ? "Desmarcar Todos" : "Selecionar Todos"}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredChargers.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => toggleSelect(c.id)}
                  className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                    selectedIds.includes(c.id) 
                      ? 'bg-blue-500/10 border-blue-500/30' 
                      : 'hover:bg-slate-800/50 border-transparent'
                  }`}
                >
                  <div className="shrink-0">
                    {selectedIds.includes(c.id) ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} className="text-slate-700" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold truncate ${selectedIds.includes(c.id) ? 'text-blue-400' : 'text-slate-300'}`}>{c.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium truncate">{c.location || "Sem local"}</p>
                  </div>
                  <button 
                    onClick={(e) => handleQuickStatusToggle(e, c)}
                    disabled={localLoading[c.id]}
                    className={`shrink-0 p-2 rounded-lg transition-all ${c.is_offline ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/5 text-emerald-500/40 opacity-0 group-hover:opacity-100 border border-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-400'} disabled:opacity-30`}
                    title={c.is_offline ? "Reativar agora" : "Tornar Offline"}
                  >
                    {localLoading[c.id] ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-900/10 custom-scrollbar">
            {selectedIds.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                 <div className="relative">
                   <Zap size={64} className="text-slate-800 animate-pulse" />
                   <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                 </div>
                 <div className="space-y-2">
                   <h4 className="text-xl font-black text-slate-400">Seleção Pendente</h4>
                   <p className="text-sm text-slate-600 max-w-[300px]">Ative os carregadores à esquerda para realizar ajustes massivos de expediente ou status.</p>
                 </div>
               </div>
            ) : (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg"><Clock size={16} className="text-blue-400" /></div>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">Definição de Horário</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 focus-within:border-blue-500/50 transition-all shadow-inner">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Check-In (Início)</label>
                      <input 
                        type="time" 
                        value={businessStart} 
                        onChange={e => {
                          setBusinessStart(e.target.value);
                          setApplySchedule(true);
                        }} 
                        className="w-full bg-transparent text-2xl font-black text-white focus:outline-none" 
                      />
                    </div>
                    <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 focus-within:border-blue-500/50 transition-all shadow-inner">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Check-Out (Fim)</label>
                      <input 
                        type="time" 
                        value={businessEnd} 
                        onChange={e => {
                          setBusinessEnd(e.target.value);
                          setApplySchedule(true);
                        }} 
                        className="w-full bg-transparent text-2xl font-black text-white focus:outline-none" 
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                   <div className="flex items-center gap-3">
                      <div className="bg-red-500/20 p-2 rounded-lg"><AlertTriangle size={16} className="text-red-400" /></div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest">Inatividade Forçada</h4>
                    </div>
                  <div className={`p-8 rounded-[32px] border transition-all duration-500 ${isOffline ? 'bg-red-500/5 border-red-500/30' : 'bg-slate-950/50 border-slate-800'}`}>
                    <div className="flex items-center justify-between mb-8">
                       <div className="space-y-1">
                          <h4 className="text-lg font-bold text-white">Status Offline</h4>
                          <p className="text-xs text-slate-500 font-bold uppercase">Aplica inatividade a todos os selecionados</p>
                       </div>
                       <button
                         onClick={() => {
                           setIsOffline(!isOffline);
                           setApplyOffline(true);
                         }}
                         className={`relative h-8 w-16 items-center rounded-full transition-all ${isOffline ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-slate-700'}`}
                       >
                         <span className={`absolute h-6 w-6 left-1 rounded-full bg-white transition-all transform ${isOffline ? 'translate-x-8' : 'translate-x-0'}`} />
                       </button>
                    </div>
                    {isOffline && (
                      <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-top-4 duration-300">
                         <div className="bg-slate-950 p-5 rounded-2xl border border-red-500/20">
                          <label className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
                            <MessageSquare size={12} /> Motivo da Inatividade
                          </label>
                          <textarea 
                            value={offlineReason} 
                            onChange={e => {
                              setOfflineReason(e.target.value);
                              setApplyOffline(true);
                            }} 
                            placeholder="Descreva aqui..." 
                            className="w-full bg-transparent text-sm font-bold text-slate-200 focus:outline-none h-24 resize-none" 
                          />
                        </div>
                        <div className="bg-slate-950 p-5 rounded-2xl border border-red-500/20">
                          <label className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
                            <Calendar size={12} /> Data de Retorno
                          </label>
                          <input 
                            type="date" 
                            value={expectedReturn} 
                            onChange={e => {
                              setExpectedReturn(e.target.value);
                              setApplyOffline(true);
                            }} 
                            className="w-full bg-transparent text-lg font-black text-white focus:outline-none" 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-800/80 bg-slate-900/90 backdrop-blur-2xl flex items-center justify-between shrink-0">
           <div className="flex items-center gap-4">
              <div className="bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 shadow-inner">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alvos Ativos</p>
                <p className="text-xl font-black text-white mt-1">{selectedIds.length} <span className="text-xs text-slate-400 font-bold">RECURSOS</span></p>
              </div>
           </div>
           <div className="flex gap-4">
              <button onClick={onClose} className="px-8 py-4 rounded-2xl text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-white transition-all">Cancelar</button>
              <button
                onClick={handleApplyBatch}
                disabled={loading || selectedIds.length === 0}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black px-12 py-4 rounded-2xl shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-4 uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {loading ? 'Executando...' : 'Aplicar Alterações'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
