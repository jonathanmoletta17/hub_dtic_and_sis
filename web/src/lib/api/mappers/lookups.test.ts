import { describe, expect, it } from "vitest";

import {
  mapCategoriesResponseDto,
  mapLocationsResponseDto,
  mapTechniciansResponseDto,
} from "./lookups";

describe("lookup mappers", () => {
  it("maps location and category envelopes to normalized options", () => {
    expect(
      mapLocationsResponseDto({
        context: "sis",
        locations: [{ id: 1, name: "Patio", completename: "Campus > Patio" }],
      }),
    ).toEqual([
      {
        id: 1,
        name: "Patio",
        completename: "Campus > Patio",
        label: "Campus > Patio",
      },
    ]);

    expect(
      mapCategoriesResponseDto({
        context: "sis",
        categories: [{ id: 2, name: "Rede", completename: "Infra > Rede" }],
      }),
    ).toEqual([
      {
        id: 2,
        name: "Rede",
        completename: "Infra > Rede",
        label: "Infra > Rede",
      },
    ]);
  });

  it("maps technicians to a normalized reusable model", () => {
    expect(
      mapTechniciansResponseDto({
        context: "sis",
        technicians: [{ id: 9, name: "Carlos", login: "carlos" }],
      }),
    ).toEqual([
      {
        id: 9,
        name: "Carlos",
        login: "carlos",
        label: "Carlos",
      },
    ]);
  });
});
