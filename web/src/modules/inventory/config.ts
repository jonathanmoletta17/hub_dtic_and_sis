import type { InventoryFilters, InventoryItemType, InventorySortKey } from "@/lib/api/models/inventory";

export interface InventoryItemTypeOption {
  value: InventoryItemType;
  label: string;
  modelField: string;
  modelLabel: string;
}

export const INVENTORY_ITEMTYPE_OPTIONS: InventoryItemTypeOption[] = [
  { value: "Computer", label: "Computadores", modelField: "computermodels_id", modelLabel: "Modelo" },
  { value: "Monitor", label: "Monitores", modelField: "monitormodels_id", modelLabel: "Modelo" },
  { value: "Printer", label: "Impressoras", modelField: "printermodels_id", modelLabel: "Modelo" },
  { value: "NetworkEquipment", label: "Equipamentos de Rede", modelField: "networkequipmentmodels_id", modelLabel: "Modelo" },
  { value: "Peripheral", label: "Periféricos", modelField: "peripheralmodels_id", modelLabel: "Modelo" },
  { value: "Phone", label: "Telefones", modelField: "phonemodels_id", modelLabel: "Modelo" },
];

export const INVENTORY_ITEMTYPE_LABELS: Record<InventoryItemType, string> = Object.fromEntries(
  INVENTORY_ITEMTYPE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<InventoryItemType, string>;

export const INVENTORY_SORT_OPTIONS: Array<{ value: InventorySortKey; label: string }> = [
  { value: "name", label: "Nome" },
  { value: "date_mod", label: "Última modificação" },
  { value: "last_inventory_update", label: "Último inventário" },
  { value: "state_name", label: "Estado" },
  { value: "location_name", label: "Localidade" },
];

export const DEFAULT_INVENTORY_FILTERS: InventoryFilters = {
  itemtypes: [],
  statesId: [],
  locationsId: [],
  groupsId: [],
  q: "",
  onlyMissingOwner: false,
  onlyMissingLocation: false,
  onlyMissingTechGroup: false,
  onlyStaleInventory: false,
  limit: 50,
  offset: 0,
  sort: "name",
  order: "asc",
};

export const COMMON_FORM_FIELDS = [
  "name",
  "serial",
  "otherserial",
  "states_id",
  "locations_id",
  "users_id",
  "groups_id",
  "users_id_tech",
  "groups_id_tech",
  "manufacturers_id",
] as const;
