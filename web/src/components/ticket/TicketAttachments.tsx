import React from "react";
import { Download, FileText, Loader2 } from "lucide-react";

import { formatIsoDateTime } from "@/lib/datetime/iso";
import type { TicketAttachment } from "@/lib/api/models/ticket-detail";

function formatBytes(size: number): string {
  if (!size) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export function TicketAttachments({
  attachments,
  disabled,
  loading,
  onPreview,
  onDownload,
}: {
  attachments: TicketAttachment[];
  disabled?: boolean;
  loading?: boolean;
  onPreview: (attachment: TicketAttachment) => void;
  onDownload: (attachment: TicketAttachment) => void;
}) {
  if (!attachments.length) {
    return null;
  }

  return (
    <div
      className="shrink-0 border-t px-4 py-3 lg:px-6"
      style={{
        borderColor: "var(--border-subtle)",
        background: "color-mix(in srgb, var(--bg-surface) 74%, transparent)",
      }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center gap-2">
          <FileText size={14} className="theme-copy-soft" />
          <span className="theme-copy-soft text-[12px] font-medium uppercase tracking-[0.18em]">
            Anexos
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={`${attachment.id}-${attachment.relationId ?? "na"}`}
              className="theme-card inline-flex min-w-0 items-center gap-2 rounded-xl text-left"
            >
              <button
                type="button"
                onClick={() => onPreview(attachment)}
                disabled={disabled || loading}
                className="inline-flex min-w-0 flex-1 flex-col px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Abrir pre-visualizacao de ${attachment.filename}`}
              >
                <span className="truncate text-[12px] font-medium text-text-2">
                  {attachment.filename}
                </span>
                <span className="theme-meta text-[10px]">
                  {formatBytes(attachment.size)}
                  {attachment.dateUpload ? ` - ${formatIsoDateTime(attachment.dateUpload)}` : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDownload(attachment)}
                disabled={disabled || loading}
                className="theme-copy-soft shrink-0 rounded-lg p-2.5 transition-colors hover:text-text-1 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Baixar ${attachment.filename}`}
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
