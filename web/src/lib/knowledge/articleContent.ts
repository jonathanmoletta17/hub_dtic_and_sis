const EMBEDDED_DOC_ID_ATTR = "data-kb-embedded-docid";

function parseHtml(html: string): Document | null {
  if (!html || typeof DOMParser === "undefined") {
    return null;
  }
  return new DOMParser().parseFromString(html, "text/html");
}

export function extractKBEmbeddedDocumentId(rawUrl: string | null | undefined): number | null {
  if (!rawUrl) {
    return null;
  }

  const normalizedUrl = rawUrl.trim().replace(/&amp;/gi, "&");
  let url: URL;

  try {
    url = new URL(normalizedUrl, "http://hub.local");
  } catch {
    return null;
  }

  if (!url.pathname.toLowerCase().endsWith("/document.send.php")) {
    return null;
  }

  const documentId = url.searchParams.get("docid");
  if (!documentId || !/^\d+$/.test(documentId)) {
    return null;
  }

  return Number(documentId);
}

export function buildKBEmbeddedImageSkeleton(html: string): string {
  const document = parseHtml(html);
  if (!document) {
    return html;
  }

  for (const image of Array.from(document.querySelectorAll("img[src]"))) {
    const documentId = extractKBEmbeddedDocumentId(image.getAttribute("src"));
    if (!documentId) {
      continue;
    }
    image.setAttribute(EMBEDDED_DOC_ID_ATTR, String(documentId));
    image.removeAttribute("src");
  }

  return document.body.innerHTML;
}

export function collectKBEmbeddedImageDocumentIds(html: string): number[] {
  const document = parseHtml(html);
  if (!document) {
    return [];
  }

  const documentIds = new Set<number>();
  for (const image of Array.from(document.querySelectorAll("img"))) {
    const attrDocumentId = image.getAttribute(EMBEDDED_DOC_ID_ATTR);
    const documentId = attrDocumentId && /^\d+$/.test(attrDocumentId)
      ? Number(attrDocumentId)
      : extractKBEmbeddedDocumentId(image.getAttribute("src"));
    if (documentId) {
      documentIds.add(documentId);
    }
  }

  return Array.from(documentIds);
}

export function applyKBEmbeddedImageSources(
  html: string,
  objectUrlByDocumentId: ReadonlyMap<number, string>,
): string {
  if (!objectUrlByDocumentId.size) {
    return html;
  }

  const document = parseHtml(html);
  if (!document) {
    return html;
  }

  for (const image of Array.from(document.querySelectorAll("img"))) {
    const attrDocumentId = image.getAttribute(EMBEDDED_DOC_ID_ATTR);
    const documentId = attrDocumentId && /^\d+$/.test(attrDocumentId)
      ? Number(attrDocumentId)
      : extractKBEmbeddedDocumentId(image.getAttribute("src"));
    if (!documentId) {
      continue;
    }

    const objectUrl = objectUrlByDocumentId.get(documentId);
    if (!objectUrl) {
      continue;
    }

    image.setAttribute("src", objectUrl);
    image.removeAttribute(EMBEDDED_DOC_ID_ATTR);
  }

  return document.body.innerHTML;
}
