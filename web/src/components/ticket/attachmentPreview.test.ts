import { describe, expect, it } from "vitest";

import { getAttachmentPreviewKind } from "./attachmentPreview";

describe("attachmentPreview", () => {
  it("detects visualizable image and pdf attachments by mime type or extension", () => {
    expect(getAttachmentPreviewKind({ filename: "print.png", mimeType: "application/octet-stream" })).toBe("image");
    expect(getAttachmentPreviewKind({ filename: "arquivo", mimeType: "image/jpeg" })).toBe("image");
    expect(getAttachmentPreviewKind({ filename: "relatorio.pdf", mimeType: "" })).toBe("pdf");
    expect(getAttachmentPreviewKind({ filename: "planilha.xlsx", mimeType: "application/octet-stream" })).toBe(
      "unsupported",
    );
  });
});
