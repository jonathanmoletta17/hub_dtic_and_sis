"use client";

import useSWR from "swr";

import {
  fetchLocationOptions,
  fetchManufacturerOptions,
  fetchModelOptions,
  fetchResponsibleGroupOptions,
  fetchResponsibleUserOptions,
  fetchStateOptions,
  fetchTechnicianOptions,
} from "@/lib/api/lookupService";
import type { InventoryItemType } from "@/lib/api/models/inventory";

export function useInventoryLookups(context: string, itemtype: InventoryItemType | null) {
  const statesRequest = useSWR(
    context ? `inventory-lookups-states-${context}` : null,
    () => fetchStateOptions(context),
  );
  const locationsRequest = useSWR(
    context ? `inventory-lookups-locations-${context}` : null,
    () => fetchLocationOptions(context),
  );
  const responsibleUsersRequest = useSWR(
    context ? `inventory-lookups-responsible-users-${context}` : null,
    () => fetchResponsibleUserOptions(context),
  );
  const groupsRequest = useSWR(
    context ? `inventory-lookups-groups-${context}` : null,
    () => fetchResponsibleGroupOptions(context),
  );
  const techniciansRequest = useSWR(
    context ? `inventory-lookups-technicians-${context}` : null,
    () => fetchTechnicianOptions(context),
  );
  const manufacturersRequest = useSWR(
    context ? `inventory-lookups-manufacturers-${context}` : null,
    () => fetchManufacturerOptions(context),
  );
  const modelsRequest = useSWR(
    context && itemtype ? `inventory-lookups-models-${context}-${itemtype}` : null,
    () => fetchModelOptions(context, itemtype!),
  );

  const states = statesRequest.data ?? [];
  const locations = locationsRequest.data ?? [];
  const responsibleUsers = responsibleUsersRequest.data ?? [];
  const groups = groupsRequest.data ?? [];
  const technicians = techniciansRequest.data ?? [];
  const manufacturers = manufacturersRequest.data ?? [];
  const models = modelsRequest.data ?? [];

  return {
    states,
    locations,
    responsibleUsers,
    groups,
    technicians,
    manufacturers,
    models,
    errors: {
      states: statesRequest.error,
      locations: locationsRequest.error,
      responsibleUsers: responsibleUsersRequest.error,
      groups: groupsRequest.error,
      technicians: techniciansRequest.error,
      manufacturers: manufacturersRequest.error,
      models: modelsRequest.error,
    },
    hasErrors: Boolean(
      statesRequest.error
      || locationsRequest.error
      || responsibleUsersRequest.error
      || groupsRequest.error
      || techniciansRequest.error
      || manufacturersRequest.error
      || modelsRequest.error,
    ),
    isLoading:
      statesRequest.isLoading
      || locationsRequest.isLoading
      || responsibleUsersRequest.isLoading
      || groupsRequest.isLoading
      || techniciansRequest.isLoading
      || manufacturersRequest.isLoading
      || modelsRequest.isLoading,
  };
}
