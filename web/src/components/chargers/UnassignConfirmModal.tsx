"use client";

import React from "react";
import { X } from "lucide-react";

interface UnassignConfirmModalProps {
  chargerName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const UnassignConfirmModal: React.FC<UnassignConfirmModalProps> = ({
  chargerName,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <X size={20} className="text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-red-400">Desvincular Carregador</h3>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <p className="text-slate-300 text-sm leading-relaxed">
            Tem certeza que deseja remover <strong className="text-white">{chargerName}</strong> do
            atendimento atual? Ele retornará imediatamente para a lista de Disponíveis.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold text-sm transition-colors border border-slate-600"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            Desvincular
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnassignConfirmModal;
