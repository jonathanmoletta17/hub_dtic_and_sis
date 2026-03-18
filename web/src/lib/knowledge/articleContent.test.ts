import { describe, expect, it } from "vitest";

import {
  applyKBEmbeddedImageSources,
  buildKBEmbeddedImageSkeleton,
  collectKBEmbeddedImageDocumentIds,
  extractKBEmbeddedDocumentId,
} from "./articleContent";

describe("knowledge article embedded content", () => {
  it("extracts document ids from GLPI document links", () => {
    expect(
      extractKBEmbeddedDocumentId(
        "http://cau.ppiratini.intra.rs.gov.br/glpi/front/document.send.php?docid=951&tickets_id=4064",
      ),
    ).toBe(951);
    expect(
      extractKBEmbeddedDocumentId(
        "/glpi/front/document.send.php?docid=17&amp;tickets_id=1",
      ),
    ).toBe(17);
    expect(extractKBEmbeddedDocumentId("https://example.com/imagem.png")).toBeNull();
  });

  it("builds a skeleton for embedded images without external src requests", () => {
    const html = `
      <p>
        <a href="http://cau.ppiratini.intra.rs.gov.br/glpi/front/document.send.php?docid=951&tickets_id=4064">
          <img src="http://cau.ppiratini.intra.rs.gov.br/glpi/front/document.send.php?docid=951&tickets_id=4064" alt="Imagem" />
        </a>
      </p>
    `;

    const skeleton = buildKBEmbeddedImageSkeleton(html);

    expect(skeleton).toContain('data-kb-embedded-docid="951"');
    expect(skeleton).not.toContain('img src="http://cau.ppiratini.intra.rs.gov.br');
    expect(collectKBEmbeddedImageDocumentIds(skeleton)).toEqual([951]);
  });

  it("hydrates embedded image sources with blob URLs", () => {
    const skeleton = `
      <p>
        <img data-kb-embedded-docid="951" alt="Imagem" />
      </p>
    `;

    const hydrated = applyKBEmbeddedImageSources(
      skeleton,
      new Map([[951, "blob:kb-image"]]),
    );

    expect(hydrated).toContain('src="blob:kb-image"');
    expect(hydrated).not.toContain("data-kb-embedded-docid");
  });
});
