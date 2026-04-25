import { describe, expect, it, vi } from "vitest";

import {
  buildFamilies,
  buildPresentedServices,
  buildQuickActions,
  filterPresentedServices,
} from "./serviceCatalogPresentation";

describe("serviceCatalogPresentation", () => {
  const catalog = [
    {
      id: 1,
      group: "DMCPP",
      icon: "x",
      items: [
        { formId: 5, name: "Elétrica", categoryId: 1, icon: "x", techOnly: false },
        { formId: 40, name: "Multiplas Demandas", categoryId: 1, icon: "x", techOnly: false },
        { formId: 49, name: "CHECKLIST CALHAS E PLUVIAIS", categoryId: 1, icon: "x", techOnly: true },
        { formId: 15, name: "Projeto (ID 15)", categoryId: 1, icon: "x", techOnly: false },
        { formId: 36, name: "Projeto (ID 36)", categoryId: 1, icon: "x", techOnly: false },
      ],
    },
    {
      id: 2,
      group: "CONSERVACAO",
      icon: "x",
      items: [{ formId: 38, name: "CONSERVAÇÃO", categoryId: 2, icon: "x", techOnly: false }],
    },
  ];

  const hasDraft = vi.fn((formId: number) => formId === 5);

  it("maps raw catalog to friendly presented services", () => {
    const services = buildPresentedServices(catalog, hasDraft);

    expect(services.find((service) => service.formId === 5)).toEqual(
      expect.objectContaining({
        displayName: "Eletrica",
        familyId: "infra",
        hasDraft: true,
      }),
    );

    expect(services.find((service) => service.formId === 49)).toEqual(
      expect.objectContaining({
        familyId: "checklists",
        badge: "Tecnico",
      }),
    );

    expect(services.find((service) => service.formId === 38)).toEqual(
      expect.objectContaining({
        displayName: "Conservacao geral",
        familyId: "general",
      }),
    );

    expect(services.find((service) => service.formId === 15)).toEqual(
      expect.objectContaining({
        displayName: "Projeto",
        helperText: "Fluxo principal de projeto.",
      }),
    );

    expect(services.find((service) => service.formId === 36)).toEqual(
      expect.objectContaining({
        displayName: "Projeto complementar",
      }),
    );
  });

  it("builds families with counts from presented services", () => {
    const families = buildFamilies(buildPresentedServices(catalog, hasDraft));

    expect(families.find((family) => family.id === "all")?.count).toBe(6);
    expect(families.find((family) => family.id === "projects")?.count).toBe(2);
    expect(families.find((family) => family.id === "checklists")?.count).toBe(1);
  });

  it("filters and ranks services by aliases and drafts", () => {
    const services = buildPresentedServices(catalog, hasDraft);
    const filtered = filterPresentedServices(services, "all", "tomada");

    expect(filtered[0]).toEqual(
      expect.objectContaining({
        formId: 5,
        displayName: "Eletrica",
      }),
    );
  });

  it("builds quick actions from drafts and assisted entries", () => {
    const quickActions = buildQuickActions(buildPresentedServices(catalog, hasDraft));

    expect(quickActions.map((action) => action.label)).toEqual(
      expect.arrayContaining([
        "Continuar Eletrica",
        "Nao sei qual servico escolher",
        "Abrir demanda de projeto",
      ]),
    );
  });
});
