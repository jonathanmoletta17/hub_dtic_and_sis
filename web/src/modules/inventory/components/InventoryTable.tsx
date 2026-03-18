"use client";

import { ExternalLink, Eye, Pencil, Trash2 } from "lucide-react";

import { formatIsoDateTime } from "@/lib/datetime/iso";
import type { InventoryAsset } from "@/lib/api/models/inventory";

import { INVENTORY_ITEMTYPE_LABELS } from "../config";

interface InventoryTableProps {
  assets: InventoryAsset[];
  total: number;
  offset: number;
  limit: number;
  loading: boolean;
  onPageChange: (offset: number) => void;
  onView: (asset: InventoryAsset) => void;
  onEdit: (asset: InventoryAsset) => void;
  onDelete: (asset: InventoryAsset) => void;
}

export function InventoryTable({
  assets,
  total,
  offset,
  limit,
  loading,
  onPageChange,
  onView,
  onEdit,
  onDelete,
}: InventoryTableProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const qualityIssues = (asset: InventoryAsset): string[] => {
    const issues: string[] = [];
    if (!asset.responsibleUserId && !asset.responsibleGroupId) {
      issues.push("Sem responsável");
    }
    if (!asset.locationId) {
      issues.push("Sem localidade");
    }
    if (!asset.techGroupId) {
      issues.push("Sem grupo técnico");
    }
    if (asset.inventoryStale) {
      issues.push("Inventário desatualizado");
    }
    return issues;
  };

  return (
    <section className="bg-surface-2 border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-text-1">Ativos</h2>
          <p className="text-[12px] text-text-3/60 mt-1">{total} registro(s) no recorte atual.</p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-text-3/60">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(offset - limit, 0))}
            disabled={offset <= 0}
            className="px-3 py-1.5 rounded-lg border border-white/[0.08] disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(offset + limit)}
            disabled={offset + limit >= total}
            className="px-3 py-1.5 rounded-lg border border-white/[0.08] disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-black/20 text-text-3/70">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Tipo</th>
              <th className="text-left px-4 py-3 font-medium">Nome</th>
              <th className="text-left px-4 py-3 font-medium">Patrimônio</th>
              <th className="text-left px-4 py-3 font-medium">Serial</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
              <th className="text-left px-4 py-3 font-medium">Localidade</th>
              <th className="text-left px-4 py-3 font-medium">Grupo responsável</th>
              <th className="text-left px-4 py-3 font-medium">Grupo técnico</th>
              <th className="text-left px-4 py-3 font-medium">Última modificação</th>
              <th className="text-left px-4 py-3 font-medium">Qualidade</th>
              <th className="text-left px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-text-3/60">
                  Carregando ativos...
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-text-3/60">
                  Nenhum ativo encontrado com os filtros atuais.
                </td>
              </tr>
            ) : (
              assets.map((asset) => {
                const rowIssues = qualityIssues(asset);
                return (
                  <tr
                    key={`${asset.itemtype}-${asset.id}`}
                    className="border-t border-white/[0.05] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-text-2">{INVENTORY_ITEMTYPE_LABELS[asset.itemtype]}</td>
                    <td className="px-4 py-3 text-text-1 font-medium">{asset.name}</td>
                    <td className="px-4 py-3 text-text-2">{asset.assetTag || "-"}</td>
                    <td className="px-4 py-3 text-text-2">{asset.serial || "-"}</td>
                    <td className="px-4 py-3 text-text-2">{asset.stateName || "Sem estado"}</td>
                    <td className="px-4 py-3 text-text-2">{asset.locationName || "Sem localidade"}</td>
                    <td className="px-4 py-3 text-text-2">{asset.responsibleGroupName || "-"}</td>
                    <td className="px-4 py-3 text-text-2">{asset.techGroupName || "-"}</td>
                    <td className="px-4 py-3 text-text-3/70">{formatIsoDateTime(asset.dateMod) || "-"}</td>
                    <td className="px-4 py-3">
                      {rowIssues.length === 0 ? (
                        <span className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                          OK
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {rowIssues.map((issue) => (
                            <span
                              key={issue}
                              className="inline-flex rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200"
                            >
                              {issue}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => onView(asset)} className="p-2 rounded-lg border border-white/[0.08] hover:border-white/[0.2]">
                          <Eye size={14} />
                        </button>
                        <button type="button" onClick={() => onEdit(asset)} className="p-2 rounded-lg border border-white/[0.08] hover:border-white/[0.2]">
                          <Pencil size={14} />
                        </button>
                        <button type="button" onClick={() => onDelete(asset)} className="p-2 rounded-lg border border-white/[0.08] hover:border-red-400/40 text-red-300">
                          <Trash2 size={14} />
                        </button>
                        <a
                          href={asset.links.glpi}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg border border-white/[0.08] hover:border-white/[0.2]"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
