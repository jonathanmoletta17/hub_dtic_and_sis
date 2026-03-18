"use client";

import type { ChangeEvent } from "react";
import { Download, FilterX, Plus, Search } from "lucide-react";

import type { LookupOption } from "@/lib/api/models/lookups";
import type { InventoryFilters } from "@/lib/api/models/inventory";

import { INVENTORY_ITEMTYPE_OPTIONS, INVENTORY_SORT_OPTIONS } from "../config";

interface InventoryToolbarProps {
  filters: InventoryFilters;
  states: LookupOption[];
  locations: LookupOption[];
  groups: LookupOption[];
  onFiltersChange: (next: InventoryFilters) => void;
  onCreate: () => void;
  onExport: () => void;
  exporting: boolean;
}

function selectedValues(event: ChangeEvent<HTMLSelectElement>): number[] {
  return Array.from(event.target.selectedOptions)
    .map((option) => Number(option.value))
    .filter((value) => Number.isFinite(value));
}

function selectedItemtypes(event: ChangeEvent<HTMLSelectElement>) {
  return Array.from(event.target.selectedOptions).map((option) => option.value);
}

export function InventoryToolbar({
  filters,
  states,
  locations,
  groups,
  onFiltersChange,
  onCreate,
  onExport,
  exporting,
}: InventoryToolbarProps) {
  const fieldClass =
    "bg-surface-2 border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-text-2 outline-none focus:border-white/[0.18]";
  const checkboxClass = "w-4 h-4 rounded border-white/20 bg-surface-2";
  const activeFiltersCount =
    filters.itemtypes.length
    + filters.statesId.length
    + filters.locationsId.length
    + filters.groupsId.length
    + (filters.q.trim() ? 1 : 0)
    + (filters.onlyMissingOwner ? 1 : 0)
    + (filters.onlyMissingLocation ? 1 : 0)
    + (filters.onlyMissingTechGroup ? 1 : 0)
    + (filters.onlyStaleInventory ? 1 : 0);

  return (
    <section className="bg-gradient-to-br from-surface-2 to-surface-1 border border-white/[0.06] rounded-xl p-4 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-1">Filtros do Inventário</h2>
          <p className="text-[12px] text-text-3/60 mt-1">
            Hardware patrimonial do DTIC com leitura via banco e escrita via GLPI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-lg border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[12px] text-text-2">
            Filtros ativos: {activeFiltersCount}
          </span>
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 bg-black/20 border border-white/[0.08] hover:border-white/[0.18] px-3 py-2 rounded-lg text-[13px] text-text-2 disabled:opacity-50"
          >
            <Download size={14} className={exporting ? "animate-pulse" : ""} />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 hover:border-blue-300/50 px-3 py-2 rounded-lg text-[13px] text-blue-100"
          >
            <Plus size={14} />
            Novo ativo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[12px] text-text-3/60">Busca</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3/40" size={14} />
            <input
              value={filters.q}
              onChange={(event) => onFiltersChange({ ...filters, q: event.target.value, offset: 0 })}
              placeholder="Nome, serial ou patrimônio"
              className={`${fieldClass} w-full pl-9`}
            />
          </div>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] text-text-3/60">Tipos</span>
          <select
            multiple
            value={filters.itemtypes}
            onChange={(event) => onFiltersChange({ ...filters, itemtypes: selectedItemtypes(event) as InventoryFilters["itemtypes"], offset: 0 })}
            className={`${fieldClass} min-h-[108px]`}
          >
            {INVENTORY_ITEMTYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] text-text-3/60">Estados</span>
          <select
            multiple
            value={filters.statesId.map(String)}
            onChange={(event) => onFiltersChange({ ...filters, statesId: selectedValues(event), offset: 0 })}
            className={`${fieldClass} min-h-[108px]`}
          >
            {states.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] text-text-3/60">Localidades</span>
          <select
            multiple
            value={filters.locationsId.map(String)}
            onChange={(event) => onFiltersChange({ ...filters, locationsId: selectedValues(event), offset: 0 })}
            className={`${fieldClass} min-h-[108px]`}
          >
            {locations.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[12px] text-text-3/60">Grupos</span>
          <select
            multiple
            value={filters.groupsId.map(String)}
            onChange={(event) => onFiltersChange({ ...filters, groupsId: selectedValues(event), offset: 0 })}
            className={`${fieldClass} min-h-[108px]`}
          >
            {groups.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-[12px] text-text-3/55 -mt-1">
        Use Ctrl (Windows/Linux) ou Cmd (macOS) para selecionar múltiplas opções nos campos de lista.
      </p>

      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-[13px] text-text-2">
            <input
              type="checkbox"
              checked={filters.onlyMissingOwner}
              onChange={(event) => onFiltersChange({ ...filters, onlyMissingOwner: event.target.checked, offset: 0 })}
              className={checkboxClass}
            />
            Sem responsável
          </label>
          <label className="inline-flex items-center gap-2 text-[13px] text-text-2">
            <input
              type="checkbox"
              checked={filters.onlyMissingLocation}
              onChange={(event) => onFiltersChange({ ...filters, onlyMissingLocation: event.target.checked, offset: 0 })}
              className={checkboxClass}
            />
            Sem localidade
          </label>
          <label className="inline-flex items-center gap-2 text-[13px] text-text-2">
            <input
              type="checkbox"
              checked={filters.onlyMissingTechGroup}
              onChange={(event) => onFiltersChange({ ...filters, onlyMissingTechGroup: event.target.checked, offset: 0 })}
              className={checkboxClass}
            />
            Sem grupo técnico
          </label>
          <label className="inline-flex items-center gap-2 text-[13px] text-text-2">
            <input
              type="checkbox"
              checked={filters.onlyStaleInventory}
              onChange={(event) => onFiltersChange({ ...filters, onlyStaleInventory: event.target.checked, offset: 0 })}
              className={checkboxClass}
            />
            Inventário desatualizado
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.sort}
            onChange={(event) => onFiltersChange({ ...filters, sort: event.target.value as InventoryFilters["sort"] })}
            className={fieldClass}
          >
            {INVENTORY_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Ordenar por: {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.order}
            onChange={(event) => onFiltersChange({ ...filters, order: event.target.value as InventoryFilters["order"] })}
            className={fieldClass}
          >
            <option value="asc">Ascendente</option>
            <option value="desc">Descendente</option>
          </select>

          <button
            type="button"
            onClick={() =>
              onFiltersChange({
                ...filters,
                itemtypes: [],
                statesId: [],
                locationsId: [],
                groupsId: [],
                q: "",
                onlyMissingOwner: false,
                onlyMissingLocation: false,
                onlyMissingTechGroup: false,
                onlyStaleInventory: false,
                offset: 0,
              })
            }
            className="inline-flex items-center gap-2 bg-black/20 border border-white/[0.08] hover:border-white/[0.18] px-3 py-2 rounded-lg text-[13px] text-text-2"
          >
            <FilterX size={14} />
            Limpar
          </button>
        </div>
      </div>
    </section>
  );
}
