"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

import type { InventoryAsset, InventoryItemType } from "@/lib/api/models/inventory";
import type { LookupOption, TechnicianOption, UserOption } from "@/lib/api/models/lookups";

import { INVENTORY_ITEMTYPE_OPTIONS } from "../config";

interface InventoryAssetFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  asset: InventoryAsset | null;
  activeItemtype: InventoryItemType;
  states: LookupOption[];
  locations: LookupOption[];
  responsibleUsers: UserOption[];
  groups: LookupOption[];
  technicians: TechnicianOption[];
  manufacturers: LookupOption[];
  models: LookupOption[];
  saving: boolean;
  onClose: () => void;
  onItemtypeChange: (itemtype: InventoryItemType) => void;
  onSubmit: (params: { itemtype: InventoryItemType; input: Record<string, unknown> }) => Promise<void>;
}

interface InventoryFormState {
  itemtype: InventoryItemType;
  name: string;
  serial: string;
  otherserial: string;
  states_id: string;
  locations_id: string;
  users_id: string;
  groups_id: string;
  users_id_tech: string;
  groups_id_tech: string;
  manufacturers_id: string;
  model_id: string;
}

function buildInitialState(asset: InventoryAsset | null): InventoryFormState {
  return {
    itemtype: asset?.itemtype ?? "Computer",
    name: asset?.name ?? "",
    serial: asset?.serial ?? "",
    otherserial: asset?.assetTag ?? "",
    states_id: asset?.stateId ? String(asset.stateId) : "",
    locations_id: asset?.locationId ? String(asset.locationId) : "",
    users_id: asset?.responsibleUserId ? String(asset.responsibleUserId) : "",
    groups_id: asset?.responsibleGroupId ? String(asset.responsibleGroupId) : "",
    users_id_tech: asset?.techUserId ? String(asset.techUserId) : "",
    groups_id_tech: asset?.techGroupId ? String(asset.techGroupId) : "",
    manufacturers_id: asset?.manufacturerId ? String(asset.manufacturerId) : "",
    model_id: asset?.modelId ? String(asset.modelId) : "",
  };
}

function numericOrZero(value: string): number {
  return value ? Number(value) : 0;
}

export function InventoryAssetFormModal({
  open,
  mode,
  asset,
  activeItemtype,
  states,
  locations,
  responsibleUsers,
  groups,
  technicians,
  manufacturers,
  models,
  saving,
  onClose,
  onItemtypeChange,
  onSubmit,
}: InventoryAssetFormModalProps) {
  const [formState, setFormState] = useState<InventoryFormState>({ ...buildInitialState(asset), itemtype: activeItemtype });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const initialState = { ...buildInitialState(asset), itemtype: activeItemtype };
    setFormState(initialState);
    onItemtypeChange(initialState.itemtype);
    setError(null);
  }, [activeItemtype, asset, onItemtypeChange, open]);

  const itemtypeOption = useMemo(
    () => INVENTORY_ITEMTYPE_OPTIONS.find((option) => option.value === formState.itemtype) ?? INVENTORY_ITEMTYPE_OPTIONS[0],
    [formState.itemtype],
  );

  if (!open) {
    return null;
  }

  const fieldClass =
    "bg-surface-2 border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-text-2 outline-none focus:border-white/[0.18]";

  const handleSave = async () => {
    if (!formState.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }

    setError(null);
    await onSubmit({
      itemtype: formState.itemtype,
      input: {
        name: formState.name.trim(),
        serial: formState.serial.trim(),
        otherserial: formState.otherserial.trim(),
        states_id: numericOrZero(formState.states_id),
        locations_id: numericOrZero(formState.locations_id),
        users_id: numericOrZero(formState.users_id),
        groups_id: numericOrZero(formState.groups_id),
        users_id_tech: numericOrZero(formState.users_id_tech),
        groups_id_tech: numericOrZero(formState.groups_id_tech),
        manufacturers_id: numericOrZero(formState.manufacturers_id),
        [itemtypeOption.modelField]: numericOrZero(formState.model_id),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-4xl bg-surface-1 border border-white/[0.08] rounded-2xl overflow-hidden">
        <header className="px-6 py-4 border-b border-white/[0.06] flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-wide text-text-3/50">
              {mode === "create" ? "Novo ativo" : "Editar ativo"}
            </p>
            <h2 className="text-lg font-semibold text-text-1 mt-1">
              {mode === "create" ? "Cadastro patrimonial" : asset?.name || "Edição de ativo"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg border border-white/[0.08] hover:border-white/[0.18]">
            <X size={16} />
          </button>
        </header>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-text-3/60">Tipo</span>
              <select
                value={formState.itemtype}
                disabled={mode === "edit"}
                onChange={(event) => {
                  const nextItemtype = event.target.value as InventoryItemType;
                  setFormState((current) => ({ ...current, itemtype: nextItemtype, model_id: "" }));
                  onItemtypeChange(nextItemtype);
                }}
                className={fieldClass}
              >
                {INVENTORY_ITEMTYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-[12px] text-text-3/60">Nome</span>
              <input
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                className={fieldClass}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-text-3/60">Serial</span>
              <input
                value={formState.serial}
                onChange={(event) => setFormState((current) => ({ ...current, serial: event.target.value }))}
                className={fieldClass}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-text-3/60">Patrimônio</span>
              <input
                value={formState.otherserial}
                onChange={(event) => setFormState((current) => ({ ...current, otherserial: event.target.value }))}
                className={fieldClass}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-text-3/60">Estado</span>
              <select
                value={formState.states_id}
                onChange={(event) => setFormState((current) => ({ ...current, states_id: event.target.value }))}
                className={fieldClass}
              >
                <option value="">Não definido</option>
                {states.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-text-3/60">Localidade</span>
              <select
                value={formState.locations_id}
                onChange={(event) => setFormState((current) => ({ ...current, locations_id: event.target.value }))}
                className={fieldClass}
              >
                <option value="">Não definida</option>
                {locations.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-text-3/60">Usuário responsável</span>
              <select
                value={formState.users_id}
                onChange={(event) => setFormState((current) => ({ ...current, users_id: event.target.value }))}
                className={fieldClass}
              >
                <option value="">Não definido</option>
                {responsibleUsers.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-text-3/60">Grupo responsável</span>
              <select
                value={formState.groups_id}
                onChange={(event) => setFormState((current) => ({ ...current, groups_id: event.target.value }))}
                className={fieldClass}
              >
                <option value="">Não definido</option>
                {groups.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-text-3/60">Técnico</span>
              <select
                value={formState.users_id_tech}
                onChange={(event) => setFormState((current) => ({ ...current, users_id_tech: event.target.value }))}
                className={fieldClass}
              >
                <option value="">Não definido</option>
                {technicians.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-text-3/60">Grupo técnico</span>
              <select
                value={formState.groups_id_tech}
                onChange={(event) => setFormState((current) => ({ ...current, groups_id_tech: event.target.value }))}
                className={fieldClass}
              >
                <option value="">Não definido</option>
                {groups.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-text-3/60">Fabricante</span>
              <select
                value={formState.manufacturers_id}
                onChange={(event) => setFormState((current) => ({ ...current, manufacturers_id: event.target.value }))}
                className={fieldClass}
              >
                <option value="">Não definido</option>
                {manufacturers.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-text-3/60">{itemtypeOption.modelLabel}</span>
              <select
                value={formState.model_id}
                onChange={(event) => setFormState((current) => ({ ...current, model_id: event.target.value }))}
                className={fieldClass}
              >
                <option value="">Não definido</option>
                {models.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
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
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-400/30 hover:border-blue-300/50 text-sm text-blue-100 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {mode === "create" ? "Criar ativo" : "Salvar alterações"}
          </button>
        </footer>
      </div>
    </div>
  );
}
