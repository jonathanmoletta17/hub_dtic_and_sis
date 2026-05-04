import { describe, expect, it } from "vitest";

import {
  collectFileAnswerLabels,
  collectFileAnswers,
  filterVisibleAnswers,
  formatAnswersForSubmit,
} from "./ReviewStep";
import type { FormSchema } from "@/types/form-schema";

describe("ReviewStep submit contract", () => {
  it("formats regular answers and identifies file answers before JSON submit", () => {
    const schema: FormSchema = {
      id: 2,
      name: "NOMEIA / EXONERA",
      category: "1",
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
              id: 46,
              name: "ENVIAR ARQUIVO COM OS DADOS DE NOVO USUÁRIO",
              fieldtype: "file",
              required: true,
              row: 1,
              col: 0,
              width: 4,
              showRule: "always",
              conditions: [],
            },
            {
              id: 47,
              name: "Nome",
              fieldtype: "text",
              required: true,
              row: 2,
              col: 0,
              width: 4,
              showRule: "always",
              conditions: [],
            },
          ],
        },
      ],
    };
    const file = new File(["conteudo"], "usuarios.csv", { type: "text/csv" });

    expect(formatAnswersForSubmit({ q_47: "Cynthia" })).toEqual({ "47": "Cynthia" });
    expect(collectFileAnswerLabels(schema, { q_46: file, q_47: "Cynthia" })).toEqual([
      "ENVIAR ARQUIVO COM OS DADOS DE NOVO USUÁRIO",
    ]);
    expect(collectFileAnswers(schema, { q_46: file })).toEqual([
      {
        questionId: 46,
        label: "ENVIAR ARQUIVO COM OS DADOS DE NOVO USUÁRIO",
        required: true,
        file,
      },
    ]);
  });

  it("omits stale hidden answers from review and submit payloads", () => {
    const schema: FormSchema = {
      id: 3,
      name: "Condicional",
      category: "1",
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
              id: 10,
              name: "Tipo",
              fieldtype: "text",
              required: true,
              row: 1,
              col: 0,
              width: 4,
              showRule: "always",
              conditions: [],
            },
            {
              id: 11,
              name: "Detalhe oculto",
              fieldtype: "text",
              required: false,
              row: 2,
              col: 0,
              width: 4,
              showRule: "conditional",
              conditions: [{ questionId: 10, operator: "==", value: "sim", logic: "AND" }],
            },
          ],
        },
      ],
    };

    const visibleAnswers = filterVisibleAnswers(schema, { q_10: "nao", q_11: "stale" });

    expect(visibleAnswers).toEqual({ q_10: "nao" });
    expect(formatAnswersForSubmit(visibleAnswers)).toEqual({ "10": "nao" });
  });
});
