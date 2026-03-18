export interface KBAttachmentCandidate {
  name: string;
  size: number;
  type?: string | null;
}

export const KB_MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const KB_MAX_ATTACHMENTS_PER_REQUEST = 10;

const KB_ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
  ".ppt",
  ".pptx",
]);

const KB_ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
]);

export function getKBAttachmentExtension(filename: string): string {
  const normalized = filename.trim().toLowerCase();
  const lastDot = normalized.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === normalized.length - 1) return "";
  return normalized.slice(lastDot);
}

export function validateKBAttachments(files: readonly KBAttachmentCandidate[]): string | null {
  if (files.length > KB_MAX_ATTACHMENTS_PER_REQUEST) {
    return `Limite de ${KB_MAX_ATTACHMENTS_PER_REQUEST} arquivos por envio excedido.`;
  }

  for (const file of files) {
    const filename = file.name || "anexo";
    const mimeType = (file.type || "application/octet-stream").toLowerCase();
    const extension = getKBAttachmentExtension(filename);

    if (file.size <= 0) {
      return `Arquivo '${filename}' vazio.`;
    }

    if (file.size > KB_MAX_ATTACHMENT_SIZE_BYTES) {
      return `Arquivo '${filename}' excede o limite de ${KB_MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024)} MB.`;
    }

    if (
      !KB_ALLOWED_ATTACHMENT_EXTENSIONS.has(extension) &&
      !KB_ALLOWED_ATTACHMENT_MIME_TYPES.has(mimeType)
    ) {
      return `Tipo de arquivo nao permitido para '${filename}'.`;
    }
  }

  return null;
}
