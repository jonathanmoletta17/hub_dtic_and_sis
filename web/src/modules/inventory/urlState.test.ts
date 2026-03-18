import { describe, expect, it } from "vitest";

import type { InventoryFilters } from "@/lib/api/models/inventory";

import { DEFAULT_INVENTORY_FILTERS } from "./config";
import {
  areInventoryFiltersEqual,
  buildInventoryQueryString,
  parseInventoryFiltersFromQuery,
} from "./urlState";

function paramsFrom(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("inventory url state", () => {
  it("parses URL query into normalized filters", () => {
    const parsed = parseInventoryFiltersFromQuery(
      paramsFrom(
        [
          "itemtypes=Computer",
          "itemtypes=Monitor",
          "states_id=4",
          "states_id=5",
          "locations_id=10",
          "groups_id=17",
          "q= notebook ",
          "only_missing_owner=1",
          "only_missing_location=true",
          "only_stale_inventory=1",
          "offset=100",
          "limit=25",
          "sort=state_name",
          "order=desc",
        ].join("&"),
      ),
    );

    expect(parsed).toEqual({
      itemtypes: ["Computer", "Monitor"],
      statesId: [4, 5],
      locationsId: [10],
      groupsId: [17],
      q: "notebook",
      onlyMissingOwner: true,
      onlyMissingLocation: true,
      onlyMissingTechGroup: false,
      onlyStaleInventory: true,
      offset: 100,
      limit: 25,
      sort: "state_name",
      order: "desc",
    });
  });

  it("builds compact query string and omits default values", () => {
    const filters: InventoryFilters = {
      ...DEFAULT_INVENTORY_FILTERS,
      itemtypes: ["Phone", "Computer"],
      statesId: [2, 1],
      q: "asset 01",
      onlyMissingTechGroup: true,
      sort: "location_name",
    };

    const query = buildInventoryQueryString(filters);
    const params = paramsFrom(query);

    expect(params.getAll("itemtypes")).toEqual(["Computer", "Phone"]);
    expect(params.getAll("states_id")).toEqual(["1", "2"]);
    expect(params.get("q")).toBe("asset 01");
    expect(params.get("only_missing_tech_group")).toBe("1");
    expect(params.get("sort")).toBe("location_name");
    expect(params.get("order")).toBeNull();
    expect(params.get("limit")).toBeNull();
    expect(params.get("offset")).toBeNull();
  });

  it("round-trips query state with stable equality", () => {
    const source: InventoryFilters = {
      ...DEFAULT_INVENTORY_FILTERS,
      itemtypes: ["Peripheral", "Computer"],
      groupsId: [22, 17],
      statesId: [5, 4],
      q: "abc",
      onlyMissingOwner: true,
      onlyMissingLocation: true,
      onlyMissingTechGroup: true,
      onlyStaleInventory: true,
      limit: 100,
      offset: 300,
      sort: "date_mod",
      order: "desc",
    };

    const parsed = parseInventoryFiltersFromQuery(
      paramsFrom(buildInventoryQueryString(source)),
    );

    expect(areInventoryFiltersEqual(source, parsed)).toBe(true);
  });
});
