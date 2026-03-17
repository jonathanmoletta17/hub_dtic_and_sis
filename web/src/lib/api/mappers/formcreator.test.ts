import { describe, expect, it } from "vitest";

import { collectLookupRequests, mapFormSchemaDto, mapServiceCatalog } from "./formcreator";

describe("formcreator mappers", () => {
  it("groups services by cleaned category name and keeps checklist techOnly semantics", () => {
    const catalog = mapServiceCatalog(
      [
        { id: 1, name: "Manutenção", parent_id: 0, level: 1, completename: "Manutenção > Manutenção" },
        { id: 2, name: "Checklists", parent_id: 0, level: 1, completename: "Checklists" },
      ],
      [
        { id: 10, name: "Elétrica", description: "Troca de tomada", category_id: 1 },
        { id: 11, name: "Checklist diário", description: "Ronda", category_id: 2 },
      ],
    );

    expect(catalog).toEqual([
      {
        id: 1,
        group: "Manutenção",
        icon: "🔧",
        items: [
          {
            formId: 10,
            name: "Elétrica",
            description: "Troca de tomada",
            icon: "⚡",
            categoryId: 1,
            techOnly: false,
          },
        ],
      },
      {
        id: 2,
        group: "Checklists",
        icon: "📋",
        items: [
          {
            formId: 11,
            name: "Checklist diário",
            description: "Ronda",
            icon: "📋",
            categoryId: 2,
            techOnly: true,
          },
        ],
      },
    ]);
  });

  it("keeps only canonical form for known duplicated services", () => {
    const catalog = mapServiceCatalog(
      [{ id: 1, name: "Conservação", parent_id: 0, level: 1, completename: "Conservação" }],
      [
        { id: 3, name: "Carregadores", description: "Fluxo antigo", category_id: 1 },
        { id: 22, name: "Carregadores", description: "Fluxo novo", category_id: 1 },
      ],
    );

    expect(catalog).toHaveLength(1);
    expect(catalog[0].items).toHaveLength(1);
    expect(catalog[0].items[0]).toEqual({
      formId: 3,
      name: "Carregadores",
      description: "Fluxo antigo",
      icon: "🔋",
      categoryId: 1,
      techOnly: false,
    });
  });

  it("keeps both forms for explicitly allowed duplicate keys (Projeto)", () => {
    const catalog = mapServiceCatalog(
      [{ id: 1, name: "Conservação", parent_id: 0, level: 1, completename: "Conservação" }],
      [
        { id: 15, name: "Projeto", description: "Versão A", category_id: 1 },
        { id: 36, name: "Projeto", description: "Versão B", category_id: 1 },
      ],
    );

    expect(catalog).toHaveLength(1);
    expect(catalog[0].items).toHaveLength(2);
    expect(catalog[0].items).toEqual(
      expect.arrayContaining([
        {
          formId: 15,
          name: "Projeto (ID 15)",
          description: "Versão A",
          icon: "📋",
          categoryId: 1,
          techOnly: false,
        },
        {
          formId: 36,
          name: "Projeto (ID 36)",
          description: "Versão B",
          icon: "📋",
          categoryId: 1,
          techOnly: false,
        },
      ]),
    );
  });

  it("keeps unknown duplicate keys visible with ID disambiguation", () => {
    const catalog = mapServiceCatalog(
      [{ id: 9, name: "Teste", parent_id: 0, level: 1, completename: "Teste" }],
      [
        { id: 90, name: "Servico X", description: "A", category_id: 9 },
        { id: 91, name: "Servico X", description: "B", category_id: 9 },
      ],
    );

    expect(catalog).toHaveLength(1);
    expect(catalog[0].items).toHaveLength(2);
    expect(catalog[0].items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ formId: 90, name: "Servico X (ID 90)" }),
        expect.objectContaining({ formId: 91, name: "Servico X (ID 91)" }),
      ]),
    );
  });

  it("collects explicit lookup requests and maps the API schema into the internal wizard model", () => {
    const schemaDto = {
      form: {
        id: 7,
        name: "Abertura",
        plugin_formcreator_categories_id: 55,
        access_rights: 1,
      },
      sections: [
        {
          id: 1,
          name: "Dados",
          order: 1,
          show_rule: 0,
          questions: [
            {
              id: 100,
              name: "Local",
              fieldtype: "dropdown",
              required: true,
              layout: { row: 1, col: 0, width: 4 },
              lookup: {
                source: "locations",
                params: { show_tree_root: 12 },
              },
            },
            {
              id: 101,
              name: "Tipo",
              fieldtype: "select",
              required: true,
              layout: { row: 2, col: 0, width: 4 },
              options: [{ label: "Incidente", value: "incident" }],
              default_value: "incident",
            },
          ],
        },
      ],
      conditions: [
        {
          id: 5,
          controller_question_id: 101,
          target_itemtype: "PluginFormcreatorQuestion",
          target_items_id: 100,
          show_condition: 1,
          show_logic: 1,
          show_value: "incident",
          order: 1,
        },
      ],
      regexes: [],
      ranges: [],
    };

    expect(collectLookupRequests(schemaDto)).toEqual([
      {
        key: "locations:12",
        source: "locations",
        treeRoot: 12,
      },
    ]);

    expect(
      mapFormSchemaDto(schemaDto, {
        "locations:12": [
          {
            id: 1,
            name: "Patio",
            completename: "Campus > Patio",
            label: "Campus > Patio",
          },
        ],
      }),
    ).toEqual({
      id: 7,
      name: "Abertura",
      category: "55",
      accessRights: "PUBLIC",
      sections: [
        {
          id: 1,
          name: "Dados",
          order: 1,
          showRule: "always",
          conditions: [],
          questions: [
            {
              id: 100,
              name: "Local",
              fieldtype: "dropdown",
              required: true,
              row: 1,
              col: 0,
              width: 4,
              options: undefined,
              defaultValue: undefined,
              resolvedOptions: [{ id: 1, name: "Patio", completename: "Campus > Patio" }],
              showRule: "conditional",
              conditions: [
                {
                  questionId: 101,
                  operator: "==",
                  value: "incident",
                  logic: "AND",
                },
              ],
            },
            {
              id: 101,
              name: "Tipo",
              fieldtype: "select",
              required: true,
              row: 2,
              col: 0,
              width: 4,
              options: ["Incidente"],
              defaultValue: "incident",
              resolvedOptions: undefined,
              showRule: "always",
              conditions: [],
            },
          ],
        },
      ],
    });
  });
});
