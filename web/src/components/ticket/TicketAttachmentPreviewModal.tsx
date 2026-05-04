import React, { useEffect } from "react";
import { AlertTriangle, Download, FileText, ImageIcon, Loader2, X } from "lucide-react";

import type { TicketAttachment } from "@/lib/api/models/ticket-detail";
import { getAttachmentPreviewKind, type AttachmentPreviewState } from "./attachmentPreview";

function formatContentType(contentType?: string): string {
  return contentType || "tipo nao informado";
}

export function TicketAttachmentPreviewModal({
  preview,
  onClose,
  onDownload,
}: {
  preview: AttachmentPreviewState;
  onClose: () => void;
  onDownload: (attachment: TicketAttachment) => void;
}) {
  const attachment = preview.attachment;

  useEffect(() => {
    if (!attachment) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [attachment, onClose]);

  if (!attachment) {
    return null;
  }

  const previewKind = getAttachmentPreviewKind(attachment, preview.contentType);
  const hasRenderableBlob = Boolean(preview.objectUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Pre-visualizacao de ${attachment.filename}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="theme-panel flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
              {previewKind === "image" ? (
                <ImageIcon size={17} className="text-blue-400" />
              ) : (
                <FileText size={17} className="text-blue-400" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-semibold text-text-1 sm:text-[15px]">
                {attachment.filename}
              </h3>
              <p className="theme-meta truncate text-[11px]">{formatContentType(preview.contentType || attachment.mimeType)}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onDownload(attachment)}
              className="theme-button-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition-colors"
            >
              <Download size={15} />
              Baixar
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar pre-visualizacao"
              className="theme-button-secondary rounded-xl p-2 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex min-h-[18rem] flex-1 items-center justify-center overflow-auto bg-black/5 p-4">
          {preview.loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="animate-spin text-accent-blue" />
              <span className="theme-copy-soft text-[13px]">Carregando pre-visualizacao...</span>
            </div>
          ) : preview.error ? (
            <div className="max-w-md text-center">
              <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: "var(--status-active)" }} />
              <p className="text-[14px] text-text-2">{preview.error}</p>
            </div>
          ) : previewKind === "image" && hasRenderableBlob ? (
            // Blob URLs are user-session data and cannot be fetched by the Next image optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.objectUrl}
              alt={attachment.filename}
              className="max-h-[calc(92dvh-9rem)] max-w-full object-contain"
            />
          ) : previewKind === "pdf" && hasRenderableBlob ? (
            <iframe
              src={preview.objectUrl}
              title={attachment.filename}
              className="h-[calc(92dvh-9rem)] min-h-[28rem] w-full rounded-xl border"
              style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
            />
          ) : (
            <div className="max-w-md text-center">
              <FileText size={36} className="theme-copy-soft mx-auto mb-3" />
              <p className="text-[14px] font-medium text-text-2">Pre-visualizacao indisponivel</p>
              <p className="theme-copy-soft mt-1 text-[12px]">
                Este formato ainda nao tem visualizacao integrada no Hub.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
