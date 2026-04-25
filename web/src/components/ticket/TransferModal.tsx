"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Loader2, UserPlus } from "lucide-react";

import { fetchTechnicianOptions } from "@/lib/api/lookupService";

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

  const loadTechnicians = useCallback(async () => {
    setLoadingTechs(true);
    try {
      setTechnicians(await fetchTechnicianOptions(context));
    } catch (err) {
      console.error("Erro ao buscar tecnicos para transferencia", err);
    } finally {
      setLoadingTechs(false);
    }
  }, [context]);

  const handleClose = () => {
    setSelectedTech("");
    onClose();
  };

  useEffect(() => {
    if (show && technicians.length === 0) {
      void loadTechnicians();
    }
  }, [show, technicians.length, loadTechnicians]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="theme-panel flex w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15">
              <UserPlus size={16} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold leading-snug text-text-1">Delegar chamado</h3>
              <p className="theme-copy-soft text-[12px]">Transferir a responsabilidade de atendimento.</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={actionLoading === "transfer"}
            className="theme-button-secondary rounded-lg p-2 transition-colors disabled:opacity-45"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-grow space-y-4 overflow-y-auto p-6">
          {loadingTechs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-blue-400" />
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-[13px] font-medium text-text-2">Selecione o tecnico</label>
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(Number(e.target.value))}
                disabled={actionLoading === "transfer"}
                className="theme-input w-full rounded-xl px-4 py-3 text-[14px] outline-none transition-colors disabled:opacity-45"
              >
                <option value="" disabled>
                  Escolha um profissional
                </option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.login}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div
          className="flex justify-end gap-3 border-t px-6 py-4"
          style={{
            borderColor: "var(--border-subtle)",
            background: "color-mix(in srgb, var(--bg-surface-alt) 72%, transparent)",
          }}
        >
          <button
            onClick={handleClose}
            disabled={actionLoading === "transfer"}
            className="theme-button-secondary rounded-xl px-5 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-45"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSubmit(selectedTech as number)}
            disabled={!selectedTech || actionLoading === "transfer"}
            className="theme-button-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-45"
          >
            {actionLoading === "transfer" ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Confirmar transferencia
          </button>
        </div>
      </div>
    </div>
  );
}
