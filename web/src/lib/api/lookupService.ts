import { apiGet, buildApiPath } from "./client";
import type {
  CategoriesResponseDto,
  GroupsResponseDto,
  LocationsResponseDto,
  ManufacturersResponseDto,
  LookupSource,
  ModelsResponseDto,
  StatesResponseDto,
  TechniciansResponseDto,
  UsersResponseDto,
} from "./contracts/lookups";
import {
  mapCategoriesResponseDto,
  mapGroupsResponseDto,
  mapManufacturersResponseDto,
  mapModelsResponseDto,
  mapLocationsResponseDto,
  mapStatesResponseDto,
  mapTechniciansResponseDto,
  mapUsersResponseDto,
} from "./mappers/lookups";
import type { LookupOption, TechnicianOption, UserOption } from "./models/lookups";

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

export function fetchResponsibleUserOptions(context: string): Promise<UserOption[]> {
  return apiGet<UsersResponseDto>(buildApiPath(context, "lookups/users/responsible"))
    .then(mapUsersResponseDto);
}

export function fetchStateOptions(context: string): Promise<LookupOption[]> {
  return apiGet<StatesResponseDto>(buildApiPath(context, "lookups/states"))
    .then(mapStatesResponseDto);
}

export function fetchManufacturerOptions(context: string): Promise<LookupOption[]> {
  return apiGet<ManufacturersResponseDto>(buildApiPath(context, "lookups/manufacturers"))
    .then(mapManufacturersResponseDto);
}

export function fetchResponsibleGroupOptions(context: string): Promise<LookupOption[]> {
  return apiGet<GroupsResponseDto>(buildApiPath(context, "lookups/groups/responsible"))
    .then(mapGroupsResponseDto);
}

export function fetchModelOptions(context: string, itemtype: string): Promise<LookupOption[]> {
  return apiGet<ModelsResponseDto>(buildApiPath(context, "lookups/models"), { itemtype })
    .then(mapModelsResponseDto);
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
  if (source === "responsible-users") {
    return fetchResponsibleUserOptions(context).then((items) =>
      items.map(({ id, name, label }) => ({
        id,
        name,
        label,
      })),
    );
  }
  if (source === "states") {
    return fetchStateOptions(context);
  }
  if (source === "manufacturers") {
    return fetchManufacturerOptions(context);
  }
  if (source === "groups") {
    return fetchResponsibleGroupOptions(context);
  }
  return Promise.resolve([]);
}
