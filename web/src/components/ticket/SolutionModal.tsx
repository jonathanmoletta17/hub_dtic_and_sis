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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="theme-panel w-full max-w-xl rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="border-b px-6 py-4" style={{ borderColor: "var(--border-subtle)" }}>
          <h3 className="text-[16px] font-semibold text-text-1">Adicionar solucao</h3>
          <p className="theme-copy-soft mt-1 text-[13px]">
            Descreva a solucao aplicada ao chamado #{ticketId}
          </p>
        </div>
        <div className="p-6">
          <textarea
            value={solutionText}
            onChange={(event) => setSolutionText(event.target.value)}
            placeholder="Descreva a solucao aplicada..."
            rows={6}
            className="theme-input w-full resize-none rounded-xl px-4 py-3 text-[14px] outline-none transition-colors"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-3 border-t px-6 py-4" style={{ borderColor: "var(--border-subtle)" }}>
          <button
            onClick={() => {
              onClose();
              setSolutionText("");
            }}
            className="theme-button-secondary rounded-lg px-4 py-2.5 text-[13px] font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!solutionText.trim() || actionLoading === "solution"}
            className="theme-button-primary rounded-lg px-5 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-45"
          >
            {actionLoading === "solution" ? <Loader2 size={14} className="animate-spin" /> : "Enviar solucao"}
          </button>
        </div>
      </div>
    </div>
  );
}
