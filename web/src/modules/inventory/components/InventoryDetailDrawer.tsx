"use client";

import { ExternalLink, X } from "lucide-react";

import { formatIsoDateTime } from "@/lib/datetime/iso";
import type { InventoryAssetDetail } from "@/lib/api/models/inventory";

import { INVENTORY_ITEMTYPE_LABELS } from "../config";

interface InventoryDetailDrawerProps {
  detail: InventoryAssetDetail | null;
  loading: boolean;
  onClose: () => void;
}

function renderPairs(pairs: Array<{ label: string; value: string | null | undefined }>) {
  return (
    <dl className="grid grid-cols-1 gap-3">
      {pairs.map((pair) => (
        <div key={pair.label}>
          <dt className="text-[12px] uppercase tracking-wide text-text-3/50">{pair.label}</dt>
          <dd className="text-sm text-text-1 mt-1">{pair.value || "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function InventoryDetailDrawer({ detail, loading, onClose }: InventoryDetailDrawerProps) {
  if (!detail && !loading) {
    return null;
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-background/80 backdrop-blur-sm">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 w-full max-w-2xl bg-surface-1 border-l border-white/[0.08] flex flex-col">
        <header className="px-6 py-4 border-b border-white/[0.06] flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-wide text-text-3/50">
              {detail ? INVENTORY_ITEMTYPE_LABELS[detail.asset.itemtype] : "Carregando"}
            </p>
            <h2 className="text-lg font-semibold text-text-1 mt-1">
              {detail ? detail.asset.name : "Detalhe do ativo"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {detail && (
              <a
                href={detail.asset.links.glpi}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.08] hover:border-white/[0.18] text-sm"
              >
                <ExternalLink size={14} />
                Abrir no GLPI
              </a>
            )}
            <button type="button" onClick={onClose} className="p-2 rounded-lg border border-white/[0.08] hover:border-white/[0.18]">
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading || !detail ? (
            <div className="text-text-3/60 text-sm">Carregando detalhe do ativo...</div>
          ) : (
            <>
              <section className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-4">Dados principais</h3>
                {renderPairs([
                  { label: "Nome", value: detail.asset.name },
                  { label: "Patrimônio", value: detail.asset.assetTag },
                  { label: "Serial", value: detail.asset.serial },
                  { label: "Estado", value: detail.asset.stateName },
                  { label: "Localidade", value: detail.asset.locationName },
                  { label: "Responsável", value: detail.asset.responsibleUserName },
                  { label: "Grupo responsável", value: detail.asset.responsibleGroupName },
                  { label: "Técnico", value: detail.asset.techUserName },
                  { label: "Grupo técnico", value: detail.asset.techGroupName },
                  { label: "Fabricante", value: detail.asset.manufacturerName },
                  { label: "Modelo", value: detail.asset.modelName },
                  { label: "Última modificação", value: formatIsoDateTime(detail.asset.dateMod) || null },
                  { label: "Último inventário", value: formatIsoDateTime(detail.asset.lastInventoryUpdate) || null },
                ])}
              </section>

              {detail.disks.length > 0 && (
                <section className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3">Discos</h3>
                  <div className="space-y-2">
                    {detail.disks.map((disk) => (
                      <div key={disk.id} className="rounded-lg border border-white/[0.06] px-3 py-2">
                        <p className="text-sm font-medium">{disk.name || disk.device || `Disco ${disk.id}`}</p>
                        <p className="text-[12px] text-text-3/60 mt-1">
                          {disk.mountpoint || "-"} · Total: {disk.totalSize ?? "-"} · Livre: {disk.freeSize ?? "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {detail.networkPorts.length > 0 && (
                <section className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3">Portas de rede</h3>
                  <div className="space-y-2">
                    {detail.networkPorts.map((port) => (
                      <div key={port.id} className="rounded-lg border border-white/[0.06] px-3 py-2">
                        <p className="text-sm font-medium">{port.name || `Porta ${port.id}`}</p>
                        <p className="text-[12px] text-text-3/60 mt-1">
                          MAC: {port.mac || "-"} · Status: {port.ifstatus || "-"} · Link: {port.ifconnectionstatus || "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {detail.softwareInstallations.length > 0 && (
                <section className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3">Softwares instalados</h3>
                  <div className="space-y-2">
                    {detail.softwareInstallations.map((software) => (
                      <div key={software.id} className="rounded-lg border border-white/[0.06] px-3 py-2">
                        <p className="text-sm font-medium">{software.softwareName || "Software sem nome"}</p>
                        <p className="text-[12px] text-text-3/60 mt-1">
                          Versão: {software.versionName || "-"} · Arquitetura: {software.arch || "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {detail.connections.length > 0 && (
                <section className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3">Conexões relacionadas</h3>
                  <div className="space-y-2">
                    {detail.connections.map((connection) => (
                      <div key={`${connection.itemtype}-${connection.id}`} className="rounded-lg border border-white/[0.06] px-3 py-2">
                        <p className="text-sm font-medium">{connection.name || `${connection.itemtype} ${connection.id}`}</p>
                        <p className="text-[12px] text-text-3/60 mt-1">
                          {connection.itemtype} · Serial: {connection.serial || "-"} · Patrimônio: {connection.assetTag || "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="bg-surface-2 border border-white/[0.06] rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Histórico</h3>
                {detail.logs.length === 0 ? (
                  <p className="text-sm text-text-3/60">Sem logs recentes para este ativo.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.logs.map((log) => (
                      <div key={log.id} className="rounded-lg border border-white/[0.06] px-3 py-2">
                        <p className="text-sm font-medium">{log.action || "Alteração"}</p>
                        <p className="text-[12px] text-text-3/60 mt-1">
                          {formatIsoDateTime(log.dateMod) || "-"} · {log.userName || "Sistema"}
                        </p>
                        {(log.oldValue || log.newValue) && (
                          <p className="text-[12px] text-text-2/70 mt-2 break-words">
                            {log.oldValue ? `Antes: ${log.oldValue}` : ""}
                            {log.oldValue && log.newValue ? " · " : ""}
                            {log.newValue ? `Depois: ${log.newValue}` : ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
