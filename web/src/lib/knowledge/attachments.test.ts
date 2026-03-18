import { describe, expect, it } from "vitest";

import {
  KB_MAX_ATTACHMENT_SIZE_BYTES,
  getKBAttachmentExtension,
  validateKBAttachments,
} from "./attachments";

describe("knowledge attachment validation", () => {
  it("extracts normalized extensions", () => {
    expect(getKBAttachmentExtension(" Manual.DOCX ")).toBe(".docx");
    expect(getKBAttachmentExtension("sem-extensao")).toBe("");
  });

  it("accepts allowed files", () => {
    expect(
      validateKBAttachments([
        { name: "nota.txt", size: 512, type: "text/plain" },
        {
          name: "manual.docx",
          size: 2048,
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      ]),
    ).toBeNull();
  });

  it("rejects markdown files", () => {
    expect(
      validateKBAttachments([
        { name: "readme.md", size: 128, type: "text/markdown" },
      ]),
    ).toBe("Tipo de arquivo nao permitido para 'readme.md'.");
  });

  it("rejects oversized files", () => {
    expect(
      validateKBAttachments([
        { name: "manual.pdf", size: KB_MAX_ATTACHMENT_SIZE_BYTES + 1, type: "application/pdf" },
      ]),
    ).toBe("Arquivo 'manual.pdf' excede o limite de 10 MB.");
  });
});
