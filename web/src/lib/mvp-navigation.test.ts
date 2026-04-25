import { describe, expect, test } from "vitest";

import {
  getMvpDefaultRoute,
  getMvpMenuItems,
  getMvpPageTitle,
  isMvpRouteAllowed,
} from "./mvp-navigation";

describe("mvp-navigation", () => {
  test("restricts DTIC navigation to the operational MVP", () => {
    const items = getMvpMenuItems("dtic", ["tecnico"], ["dtic-metrics", "busca", "inventario"]);
    const ids = items.map((item) => item.id);
    const newTicketItem = items.find((item) => item.id === "new-ticket");

    expect(ids).toEqual(["new-ticket", "user-tickets", "dashboard"]);
    expect(newTicketItem?.label).toBe("Agentes");
    expect(ids).not.toContain("analytics");
    expect(ids).not.toContain("search");
    expect(ids).not.toContain("inventory");
  });

  test("keeps requester navigation minimal in SIS", () => {
    const items = getMvpMenuItems("sis", ["solicitante"], ["carregadores"]);
    const ids = items.map((item) => item.id);

    expect(ids).toEqual(["new-ticket", "user-tickets"]);
    expect(ids).not.toContain("dashboard");
    expect(ids).not.toContain("chargers");
  });

  test("prefers dashboard as the technical landing route", () => {
    expect(getMvpDefaultRoute("dtic", ["tecnico"], [])).toBe("/dtic/dashboard");
    expect(getMvpDefaultRoute("sis", ["solicitante"], [])).toBe("/sis/user");
  });

  test("allows ticket detail routes but blocks non-MVP modules", () => {
    expect(isMvpRouteAllowed("/dtic/dashboard", "dtic")).toBe(true);
    expect(isMvpRouteAllowed("/dtic/user", "dtic")).toBe(true);
    expect(isMvpRouteAllowed("/sis/new-ticket", "sis")).toBe(true);
    expect(isMvpRouteAllowed("/dtic/ticket/123", "dtic")).toBe(true);
    expect(isMvpRouteAllowed("/dtic/search", "dtic")).toBe(false);
    expect(isMvpRouteAllowed("/sis/gestao-carregadores", "sis")).toBe(false);
  });

  test("derives compact page titles for the shell header", () => {
    expect(getMvpPageTitle("/dtic/new-ticket", "dtic")).toBe("Agentes DTIC");
    expect(getMvpPageTitle("/sis/user", "sis")).toBe("Meus Chamados");
    expect(getMvpPageTitle("/sis/ticket/88", "sis")).toBe("Ticket");
  });
});
