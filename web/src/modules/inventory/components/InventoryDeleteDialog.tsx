"use client";

import { Loader2, Trash2, X } from "lucide-react";

import type { InventoryAsset } from "@/lib/api/models/inventory";

interface InventoryDeleteDialogProps {
  open: boolean;
  asset: InventoryAsset | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function InventoryDeleteDialog({
  open,
  asset,
  deleting,
  onClose,
  onConfirm,
}: InventoryDeleteDialogProps) {
  if (!open || !asset) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-surface-1 border border-white/[0.08] rounded-2xl overflow-hidden">
        <header className="px-6 py-4 border-b border-white/[0.06] flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-wide text-red-300/70">Exclusão lógica</p>
            <h2 className="text-lg font-semibold text-text-1 mt-1">Confirmar remoção do ativo</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg border border-white/[0.08] hover:border-white/[0.18]">
            <X size={16} />
          </button>
        </header>

        <div className="px-6 py-5 space-y-3 text-sm text-text-2">
          <p>
            O ativo <strong>{asset.name}</strong> será enviado para exclusão lógica no GLPI.
          </p>
          <p className="text-text-3/70">
            Tipo: {asset.itemtype} · ID: {asset.id} · Patrimônio: {asset.assetTag || "-"}
          </p>
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg px-4 py-3 text-[13px]">
            Esta ação segue a política do módulo: delete via API GLPI, sem purge físico na V1.
          </div>
        </div>

        <footer className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/[0.08] hover:border-white/[0.18] text-sm text-text-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-400/30 hover:border-red-300/50 text-sm text-red-100 disabled:opacity-50"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Confirmar exclusão
          </button>
        </footer>
      </div>
    </div>
  );
}
