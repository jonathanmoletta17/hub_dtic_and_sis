import type { TicketAttachment } from "@/lib/api/models/ticket-detail";

export type AttachmentPreviewKind = "image" | "pdf" | "unsupported";

export interface AttachmentPreviewState {
  attachment: TicketAttachment | null;
  objectUrl?: string;
  contentType?: string;
  loading: boolean;
  error?: string;
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"]);

function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}

export function getAttachmentPreviewKind(
  attachment: Pick<TicketAttachment, "filename" | "mimeType">,
  contentType?: string,
): AttachmentPreviewKind {
  const normalizedMime = (contentType || attachment.mimeType || "").toLowerCase();
  const extension = getFileExtension(attachment.filename || "");

  if (normalizedMime.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (normalizedMime === "application/pdf" || extension === ".pdf") {
    return "pdf";
  }

  return "unsupported";
}

export function canPreviewAttachment(attachment: Pick<TicketAttachment, "filename" | "mimeType">): boolean {
  return getAttachmentPreviewKind(attachment) !== "unsupported";
}
