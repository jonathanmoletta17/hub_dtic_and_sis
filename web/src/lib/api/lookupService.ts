import { apiGet, buildApiPath } from "./client";
import type {
  CategoriesResponseDto,
  LocationsResponseDto,
  LookupSource,
  TechniciansResponseDto,
} from "./contracts/lookups";
import {
  mapCategoriesResponseDto,
  mapLocationsResponseDto,
  mapTechniciansResponseDto,
} from "./mappers/lookups";
import type { LookupOption, TechnicianOption } from "./models/lookups";

export function fetchLocationOptions(context: string, treeRoot?: number): Promise<LookupOption[]> {
  return apiGet<LocationsResponseDto>(buildApiPath(context, "lookups/locations"), {
    tree_root: treeRoot,
  }).then(mapLocationsResponseDto);
}

export function fetchCategoryOptions(context: string, treeRoot?: number): Promise<LookupOption[]> {
  return apiGet<CategoriesResponseDto>(buildApiPath(context, "lookups/itilcategories"), {
    tree_root: treeRoot,
  }).then(mapCategoriesResponseDto);
}

export function fetchTechnicianOptions(context: string): Promise<TechnicianOption[]> {
  return apiGet<TechniciansResponseDto>(buildApiPath(context, "lookups/users/technicians"))
    .then(mapTechniciansResponseDto);
}

export function fetchLookupItems(
  context: string,
  source: LookupSource,
  treeRoot?: number,
): Promise<LookupOption[]> {
  if (source === "locations") {
    return fetchLocationOptions(context, treeRoot);
  }
  if (source === "itilcategories") {
    return fetchCategoryOptions(context, treeRoot);
  }
  if (source === "users") {
    return fetchTechnicianOptions(context).then((items) =>
      items.map(({ id, name, label }) => ({
        id,
        name,
        label,
      })),
    );
  }
  return Promise.resolve([]);
}
