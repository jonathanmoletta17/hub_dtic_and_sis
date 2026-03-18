import { describe, expect, it } from "vitest";

import { inferDomainsFromSsePayload } from "./liveDataBus";

describe("inferDomainsFromSsePayload", () => {
  it("maps knowledge events from itemtype alone", () => {
    expect(
      inferDomainsFromSsePayload({
        itemtype: "KnowbaseItem",
      }),
    ).toContain("knowledge");
  });

  it("maps inventory events from the real glpi_logs schema", () => {
    expect(
      inferDomainsFromSsePayload({
        itemtype: "SoftwareVersion",
        itemtype_link: "Item_SoftwareVersion",
        user_name: "inventory",
        old_value: "",
        new_value: "CM-PP-WS1513887",
      }),
    ).toContain("inventory");
  });

  it("maps permission events from profile and group item types", () => {
    const domains = inferDomainsFromSsePayload({
      itemtype: "Profile",
      itemtype_link: "Group_User",
      user_name: "admin",
    });

    expect(domains).toContain("permissions");
  });
});
