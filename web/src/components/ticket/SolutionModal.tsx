import React, { useState } from "react";
import { Loader2 } from "lucide-react";

export function SolutionModal({
  ticketId,
  show,
  onClose,
  onSubmit,
  actionLoading,
}: {
  ticketId: number;
  show: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  actionLoading: string | null;
}) {
  const [solutionText, setSolutionText] = useState("");

  if (!show) return null;

  const handleSubmit = () => {
    onSubmit(solutionText);
    setSolutionText("");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-white/[0.08] rounded-2xl w-full max-w-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-[16px] font-semibold text-text-1">Adicionar Solução</h3>
          <p className="text-[13px] text-text-3/50 mt-1">Descreva a solução aplicada para o ticket #{ticketId}</p>
        </div>
        <div className="p-6">
          <textarea
            value={solutionText}
            onChange={(e) => setSolutionText(e.target.value)}
            placeholder="Descreva a solução aplicada..."
            rows={6}
            className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-3 px-4 text-[14px] text-text-2 placeholder:text-text-3/30 outline-none focus:border-white/[0.12] transition-colors resize-none"
            autoFocus
          />
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
          <button 
            onClick={() => { onClose(); setSolutionText(""); }} 
            className="px-4 py-2.5 rounded-lg text-text-3/60 hover:text-text-2 hover:bg-white/[0.04] text-[13px] font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!solutionText.trim() || actionLoading === "solution"}
            className="px-5 py-2.5 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-white text-[13px] font-medium transition-colors disabled:opacity-30"
          >
            {actionLoading === "solution" ? <Loader2 size={14} className="animate-spin" /> : "Enviar Solução"}
          </button>
        </div>
      </div>
    </div>
  );
}
