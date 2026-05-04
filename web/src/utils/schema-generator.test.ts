import { describe, expect, it } from "vitest";

import { buildVisibilityMap, evaluateConditions, generateZodSchema } from "./schema-generator";
import type { FormSection } from "@/types/form-schema";

describe("schema-generator visibility", () => {
  it("supports contains/not_contains conditions for section visibility", () => {
    expect(
      evaluateConditions(
        [{ questionId: 10, operator: "contains", value: "inc", logic: "AND" }],
        { q_10: "incident" },
      ),
    ).toBe(true);
    expect(
      evaluateConditions(
        [{ questionId: 10, operator: "not_contains", value: "inc", logic: "AND" }],
        { q_10: "incident" },
      ),
    ).toBe(false);

    const sections: FormSection[] = [
      {
        id: 1,
        name: "Complemento",
        order: 1,
        showRule: "conditional",
        conditions: [{ questionId: 10, operator: "contains", value: "inc", logic: "AND" }],
        questions: [],
      },
    ];

    expect(buildVisibilityMap(sections, { q_10: "incident" }).get("section_1")).toBe(true);
  });

  it("requires visible mandatory file fields", () => {
    const sections: FormSection[] = [
      {
        id: 1,
        name: "Dados",
        order: 1,
        showRule: "always",
        conditions: [],
        questions: [
          {
            id: 46,
            name: "Anexo",
            fieldtype: "file",
            required: true,
            row: 1,
            col: 0,
            width: 4,
            showRule: "always",
            conditions: [],
          },
        ],
      },
    ];
    const visibilityMap = buildVisibilityMap(sections, {});
    const schema = generateZodSchema(sections, visibilityMap);

    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ q_46: new File(["x"], "x.txt", { type: "text/plain" }) }).success).toBe(true);
  });
});
