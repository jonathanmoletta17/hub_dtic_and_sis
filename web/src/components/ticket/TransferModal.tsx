"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, UserPlus } from "lucide-react";
import { getTechnicians } from "@/lib/api/glpiService";

export function TransferModal({
  context,
  show,
  actionLoading,
  onClose,
  onSubmit,
}: {
  context: string;
  show: boolean;
  actionLoading: string | null;
  onClose: () => void;
  onSubmit: (technicianId: number) => void;
}) {
  const [technicians, setTechnicians] = useState<{ id: number; name: string; login: string }[]>([]);
  const [selectedTech, setSelectedTech] = useState<number | "">("");
  const [loadingTechs, setLoadingTechs] = useState(false);

  useEffect(() => {
    if (show && technicians.length === 0) {
      setLoadingTechs(true);
      getTechnicians(context)
        .then((res) => {
          if (res && res.technicians) {
            setTechnicians(res.technicians);
          }
        })
        .catch((err) => console.error("Erro ao puxar tecnicos para transf", err))
        .finally(() => setLoadingTechs(false));
    }
    if (!show) {
      setSelectedTech("");
    }
  }, [show, context, technicians.length]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 border border-white/[0.08] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center">
              <UserPlus size={16} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-text-1 leading-snug">Delegar Ticket</h3>
              <p className="text-[12px] text-text-3/60">Transferir responsabilidade de atendimento.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={actionLoading === "transfer"}
            className="p-2 text-text-3/40 hover:text-text-2 hover:bg-white/[0.04] rounded-lg transition-colors disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-grow overflow-y-auto">
          {loadingTechs ? (
            <div className="py-8 flex justify-center items-center">
              <Loader2 size={24} className="animate-spin text-blue-400" />
            </div>
          ) : (
            <div>
              <label className="block text-[13px] font-medium text-text-2/80 mb-2">Selecione o Técnico</label>
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(Number(e.target.value))}
                disabled={actionLoading === "transfer"}
                className="w-full bg-surface-2 border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-text-2 outline-none focus:border-blue-500/50 transition-colors disabled:opacity-50"
              >
                <option value="" disabled>Escolha um profissional</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.login}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] bg-surface-2/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={actionLoading === "transfer"}
            className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-text-3/80 hover:text-text-2 hover:bg-white/[0.04] transition-colors disabled:opacity-30"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSubmit(selectedTech as number)}
            disabled={!selectedTech || actionLoading === "transfer"}
            className="px-5 py-2.5 rounded-xl text-[13px] font-medium bg-blue-500/90 hover:bg-blue-500 text-white transition-colors flex items-center gap-2 disabled:opacity-30"
          >
            {actionLoading === "transfer" ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Confirmar Transferência
          </button>
        </div>
      </div>
    </div>
  );
}
