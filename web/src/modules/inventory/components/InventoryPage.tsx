"use client";

import { useEffect, useMemo, useState } from "react";
import { Landmark } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  createInventoryAsset,
  deleteInventoryAsset,
  exportInventoryAssetsCsv,
  updateInventoryAsset,
} from "@/lib/api/inventoryService";
import type { InventoryAsset, InventoryItemType } from "@/lib/api/models/inventory";
import { formatIsoDateTime } from "@/lib/datetime/iso";
import { useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import { POLL_INTERVALS } from "@/lib/realtime/polling";

import { useInventoryData } from "../hooks/useInventoryData";
import { useInventoryLookups } from "../hooks/useInventoryLookups";
import {
  areInventoryFiltersEqual,
  buildInventoryQueryString,
  parseInventoryFiltersFromQuery,
} from "../urlState";
import { InventoryAssetFormModal } from "./InventoryAssetFormModal";
import { InventoryDeleteDialog } from "./InventoryDeleteDialog";
import { InventoryDetailDrawer } from "./InventoryDetailDrawer";
import { InventoryKpiCards } from "./InventoryKpiCards";
import { InventoryTable } from "./InventoryTable";
import { InventoryToolbar } from "./InventoryToolbar";

interface DetailTarget {
  itemtype: InventoryItemType;
  assetId: number;
}

export function InventoryPage({ context }: { context: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filtersFromQuery = useMemo(
    () => parseInventoryFiltersFromQuery(searchParams),
    [searchParams],
  );

  const [filters, setFilters] = useState(filtersFromQuery);
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formAsset, setFormAsset] = useState<InventoryAsset | null>(null);
  const [formItemtype, setFormItemtype] = useState<InventoryItemType>("Computer");
  const [deleteTarget, setDeleteTarget] = useState<InventoryAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [lastViewRefreshAt, setLastViewRefreshAt] = useState<string | null>(null);

  const { summary, assets, detail, loading, assetsLoading, detailLoading, error, refreshAll } = useInventoryData(
    context,
    filters,
    detailTarget,
  );

  const lookupItemtype = formOpen ? formItemtype : null;
  const lookups = useInventoryLookups(context, lookupItemtype);

  useLiveDataRefresh({
    context,
    domains: ["inventory"],
    onRefresh: refreshAll,
    enabled: true,
    pollIntervalMs: POLL_INTERVALS.inventory,
    minRefreshGapMs: 1000,
  });

  const summaryByType = useMemo(() => summary?.totalsByItemtype ?? [], [summary]);
  const summaryByState = useMemo(() => summary?.totalsByState ?? [], [summary]);
  const lookupErrorMessages = useMemo(() => {
    const pairs: Array<{ key: string; error: unknown }> = [
      { key: "estados", error: lookups.errors.states },
      { key: "localidades", error: lookups.errors.locations },
      { key: "usuários responsáveis", error: lookups.errors.responsibleUsers },
      { key: "grupos", error: lookups.errors.groups },
      { key: "técnicos", error: lookups.errors.technicians },
      { key: "fabricantes", error: lookups.errors.manufacturers },
      { key: "modelos", error: lookups.errors.models },
    ];

    return pairs
      .filter((pair) => pair.error)
      .map((pair) => pair.key);
  }, [lookups.errors]);

  const filtersQueryString = useMemo(
    () => buildInventoryQueryString(filters),
    [filters],
  );

  useEffect(() => {
    if (areInventoryFiltersEqual(filters, filtersFromQuery)) {
      return;
    }
    setFilters(filtersFromQuery);
  }, [filters, filtersFromQuery]);

  useEffect(() => {
    const currentQueryString = searchParams.toString();
    if (filtersQueryString === currentQueryString) {
      return;
    }
    const nextPath = filtersQueryString ? `${pathname}?${filtersQueryString}` : pathname;
    router.replace(nextPath, { scroll: false });
  }, [filtersQueryString, pathname, router, searchParams]);

  useEffect(() => {
    if (!loading && (summary || assets)) {
      setLastViewRefreshAt(new Date().toISOString());
    }
  }, [assets, loading, summary]);

  const openCreateModal = () => {
    setFormMode("create");
    setFormAsset(null);
    setFormItemtype("Computer");
    setFormOpen(true);
  };

  const openEditModal = (asset: InventoryAsset) => {
    setFormMode("edit");
    setFormAsset(asset);
    setFormItemtype(asset.itemtype);
    setFormOpen(true);
  };

  const handleExport = async () => {
    setExporting(true);
    setFeedback(null);
    try {
      const blob = await exportInventoryAssetsCsv(context, filters);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `inventario-dtic-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback({ type: "success", message: "Exportação concluída." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao exportar CSV.";
      setFeedback({ type: "error", message });
    } finally {
      setExporting(false);
    }
  };

  const handleFormSubmit = async (params: { itemtype: InventoryItemType; input: Record<string, unknown> }) => {
    setSaving(true);
    setFeedback(null);
    try {
      if (formMode === "create") {
        await createInventoryAsset(context, params.itemtype, params.input);
        setFeedback({ type: "success", message: "Ativo criado com sucesso." });
      } else if (formAsset) {
        await updateInventoryAsset(context, formAsset.itemtype, formAsset.id, params.input);
        setFeedback({ type: "success", message: "Ativo atualizado com sucesso." });
      }
      setFormOpen(false);
      await refreshAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao salvar ativo.";
      setFeedback({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setFeedback(null);
    try {
      await deleteInventoryAsset(context, deleteTarget.itemtype, deleteTarget.id);
      if (detailTarget?.itemtype === deleteTarget.itemtype && detailTarget.assetId === deleteTarget.id) {
        setDetailTarget(null);
      }
      setDeleteTarget(null);
      setFeedback({ type: "success", message: "Ativo enviado para exclusão lógica." });
      await refreshAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao excluir ativo.";
      setFeedback({ type: "error", message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full px-5 lg:px-8 py-5 gap-4 overflow-y-auto custom-scrollbar">
      <header className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] text-blue-200/70">
            <Landmark size={14} />
            Inventário de Ativos
          </div>
          <h1 className="text-xl lg:text-2xl font-semibold text-text-1 tracking-tight mt-2">
            Gestão patrimonial do DTIC
          </h1>
          <p className="text-text-2/50 text-[14px] mt-1">
            Tela dedicada para hardware patrimonial com leitura via banco e escrita auditável pela API do GLPI.
          </p>
        </div>

        <div className="text-[12px] text-text-3/50">
          {detail?.asset ? `Detalhe aberto: ${detail.asset.name}` : "Selecione um ativo para abrir o detalhe completo."}
        </div>
      </header>

      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm border ${
            feedback.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-300"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error instanceof Error ? error.message : "Falha ao carregar dados de inventário."}
        </div>
      )}

      {lookups.hasErrors && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-lg px-4 py-3 text-sm">
          Alguns filtros auxiliares não carregaram: {lookupErrorMessages.join(", ")}.
          A listagem principal segue operacional.
        </div>
      )}

      <InventoryToolbar
        filters={filters}
        states={lookups.states}
        locations={lookups.locations}
        groups={lookups.groups}
        onFiltersChange={setFilters}
        onCreate={openCreateModal}
        onExport={handleExport}
        exporting={exporting}
      />

      <InventoryKpiCards summary={summary} loading={loading} />

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <article className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-text-1 mb-3">Totais por tipo</h2>
          <div className="flex flex-wrap gap-2">
            {summaryByType.length === 0 ? (
              <span className="text-sm text-text-3/60">Sem dados no recorte atual.</span>
            ) : (
              summaryByType.map((bucket) => (
                <span key={bucket.key} className="px-3 py-2 rounded-lg bg-black/25 border border-white/[0.08] text-sm text-text-2">
                  {bucket.label}: <strong>{bucket.total}</strong>
                </span>
              ))
            )}
          </div>
        </article>

        <article className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-text-1 mb-3">Totais por estado</h2>
          <div className="flex flex-wrap gap-2">
            {summaryByState.length === 0 ? (
              <span className="text-sm text-text-3/60">Sem dados no recorte atual.</span>
            ) : (
              summaryByState.map((bucket) => (
                <span key={bucket.key} className="px-3 py-2 rounded-lg bg-black/25 border border-white/[0.08] text-sm text-text-2">
                  {bucket.label}: <strong>{bucket.total}</strong>
                </span>
              ))
            )}
          </div>
        </article>
      </section>

      <InventoryTable
        assets={assets?.data ?? []}
        total={assets?.total ?? 0}
        offset={filters.offset}
        limit={filters.limit}
        loading={assetsLoading}
        onPageChange={(offset) => setFilters((current) => ({ ...current, offset }))}
        onView={(asset) => setDetailTarget({ itemtype: asset.itemtype, assetId: asset.id })}
        onEdit={openEditModal}
        onDelete={setDeleteTarget}
      />

      {(summary || assets) && (
        <section className="text-[12px] text-text-3/50">
          Última atualização da visão: {formatIsoDateTime(lastViewRefreshAt) || "agora"}.
        </section>
      )}

      <InventoryDetailDrawer
        detail={detail}
        loading={detailLoading}
        onClose={() => setDetailTarget(null)}
      />

      <InventoryAssetFormModal
        open={formOpen}
        mode={formMode}
        asset={formAsset}
        activeItemtype={formItemtype}
        states={lookups.states}
        locations={lookups.locations}
        responsibleUsers={lookups.responsibleUsers}
        groups={lookups.groups}
        technicians={lookups.technicians}
        manufacturers={lookups.manufacturers}
        models={lookups.models}
        saving={saving}
        onClose={() => setFormOpen(false)}
        onItemtypeChange={setFormItemtype}
        onSubmit={handleFormSubmit}
      />

      <InventoryDeleteDialog
        open={Boolean(deleteTarget)}
        asset={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
