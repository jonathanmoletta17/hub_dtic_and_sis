import type { InventoryFilters, InventoryItemType, InventoryOrder, InventorySortKey } from "@/lib/api/models/inventory";

import { DEFAULT_INVENTORY_FILTERS } from "./config";

const VALID_ITEMTYPES: InventoryItemType[] = [
  "Computer",
  "Monitor",
  "Printer",
  "NetworkEquipment",
  "Peripheral",
  "Phone",
];

const VALID_SORT_KEYS: InventorySortKey[] = [
  "name",
  "date_mod",
  "last_inventory_update",
  "state_name",
  "location_name",
];

const VALID_ORDERS: InventoryOrder[] = ["asc", "desc"];

function getAllValues(params: URLSearchParams, key: string): string[] {
  const values = [...params.getAll(key), ...params.getAll(`${key}[]`)];
  if (values.length === 0) {
    return [];
  }
  return values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseNumberArray(params: URLSearchParams, key: string): number[] {
  return Array.from(
    new Set(
      getAllValues(params, key)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
        .sort((a, b) => a - b),
    ),
  );
}

function parseItemtypes(params: URLSearchParams): InventoryItemType[] {
  const validSet = new Set<string>(VALID_ITEMTYPES);
  return Array.from(
    new Set(
      getAllValues(params, "itemtypes")
        .filter((value): value is InventoryItemType => validSet.has(value))
        .sort(),
    ),
  );
}

function parseBoolean(value: string | null): boolean {
  if (!value) {
    return false;
  }
  return value === "1" || value.toLowerCase() === "true";
}

function parseInteger(value: string | null, fallback: number, minimum: number, maximum: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const normalized = Math.trunc(parsed);
  if (normalized < minimum) {
    return fallback;
  }
  if (normalized > maximum) {
    return fallback;
  }
  return normalized;
}

function parseSort(value: string | null): InventorySortKey {
  if (!value) {
    return DEFAULT_INVENTORY_FILTERS.sort;
  }
  return (VALID_SORT_KEYS as string[]).includes(value)
    ? (value as InventorySortKey)
    : DEFAULT_INVENTORY_FILTERS.sort;
}

function parseOrder(value: string | null): InventoryOrder {
  if (!value) {
    return DEFAULT_INVENTORY_FILTERS.order;
  }
  return (VALID_ORDERS as string[]).includes(value)
    ? (value as InventoryOrder)
    : DEFAULT_INVENTORY_FILTERS.order;
}

export function parseInventoryFiltersFromQuery(params: URLSearchParams): InventoryFilters {
  return {
    itemtypes: parseItemtypes(params),
    statesId: parseNumberArray(params, "states_id"),
    locationsId: parseNumberArray(params, "locations_id"),
    groupsId: parseNumberArray(params, "groups_id"),
    q: (params.get("q") || "").trim(),
    onlyMissingOwner: parseBoolean(params.get("only_missing_owner")),
    onlyMissingLocation: parseBoolean(params.get("only_missing_location")),
    onlyMissingTechGroup: parseBoolean(params.get("only_missing_tech_group")),
    onlyStaleInventory: parseBoolean(params.get("only_stale_inventory")),
    limit: parseInteger(params.get("limit"), DEFAULT_INVENTORY_FILTERS.limit, 1, 200),
    offset: parseInteger(params.get("offset"), DEFAULT_INVENTORY_FILTERS.offset, 0, 1_000_000),
    sort: parseSort(params.get("sort")),
    order: parseOrder(params.get("order")),
  };
}

export function buildInventoryQueryString(filters: InventoryFilters): string {
  const params = new URLSearchParams();

  [...filters.itemtypes].sort().forEach((itemtype) => params.append("itemtypes", itemtype));
  [...filters.statesId].sort((a, b) => a - b).forEach((stateId) => params.append("states_id", String(stateId)));
  [...filters.locationsId].sort((a, b) => a - b).forEach((locationId) => params.append("locations_id", String(locationId)));
  [...filters.groupsId].sort((a, b) => a - b).forEach((groupId) => params.append("groups_id", String(groupId)));

  const q = filters.q.trim();
  if (q) {
    params.set("q", q);
  }

  if (filters.onlyMissingOwner) {
    params.set("only_missing_owner", "1");
  }
  if (filters.onlyMissingLocation) {
    params.set("only_missing_location", "1");
  }
  if (filters.onlyMissingTechGroup) {
    params.set("only_missing_tech_group", "1");
  }
  if (filters.onlyStaleInventory) {
    params.set("only_stale_inventory", "1");
  }

  if (filters.limit !== DEFAULT_INVENTORY_FILTERS.limit) {
    params.set("limit", String(filters.limit));
  }
  if (filters.offset !== DEFAULT_INVENTORY_FILTERS.offset) {
    params.set("offset", String(filters.offset));
  }
  if (filters.sort !== DEFAULT_INVENTORY_FILTERS.sort) {
    params.set("sort", filters.sort);
  }
  if (filters.order !== DEFAULT_INVENTORY_FILTERS.order) {
    params.set("order", filters.order);
  }

  return params.toString();
}

export function areInventoryFiltersEqual(a: InventoryFilters, b: InventoryFilters): boolean {
  return (
    a.q === b.q
    && a.onlyMissingOwner === b.onlyMissingOwner
    && a.onlyMissingLocation === b.onlyMissingLocation
    && a.onlyMissingTechGroup === b.onlyMissingTechGroup
    && a.onlyStaleInventory === b.onlyStaleInventory
    && a.limit === b.limit
    && a.offset === b.offset
    && a.sort === b.sort
    && a.order === b.order
    && JSON.stringify([...a.itemtypes].sort()) === JSON.stringify([...b.itemtypes].sort())
    && JSON.stringify([...a.statesId].sort((x, y) => x - y)) === JSON.stringify([...b.statesId].sort((x, y) => x - y))
    && JSON.stringify([...a.locationsId].sort((x, y) => x - y)) === JSON.stringify([...b.locationsId].sort((x, y) => x - y))
    && JSON.stringify([...a.groupsId].sort((x, y) => x - y)) === JSON.stringify([...b.groupsId].sort((x, y) => x - y))
  );
}
