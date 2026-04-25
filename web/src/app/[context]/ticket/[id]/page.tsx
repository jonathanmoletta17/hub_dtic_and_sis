"use client";

import React, { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Paperclip, Send } from "lucide-react";

import { TicketAttachments } from "@/components/ticket/TicketAttachments";
import { SolutionModal } from "@/components/ticket/SolutionModal";
import { TicketSidebar } from "@/components/ticket/TicketSidebar";
import { TicketTimeline } from "@/components/ticket/TicketTimeline";
import { TransferModal } from "@/components/ticket/TransferModal";
import { useTicketDetail } from "@/components/ticket/useTicketDetail";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = Number(params.id);
  const context = params.context as string;

  const {
    ticket,
    timeline,
    attachments,
    requesterName,
    technicianName,
    technicianUserId,
    groupName,
    loading,
    error,
    actionLoading,
    currentUserId,
    currentUserName,
    isTechOrManager,
    canActOnTicket,
    handleAddFollowup,
    handleUploadAttachments,
    handleDownloadAttachment,
    handleAssumeTicket,
    handleAddSolution,
    handleSetPending,
    handleResume,
    handleReturnToQueue,
    handleReopenTicket,
    handleApproveSolution,
    handleRejectSolution,
    handleTransferTicket,
  } = useTicketDetail(ticketId, context);

  const [newMessage, setNewMessage] = useState("");
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  if (loading) {
    return (
      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-accent-blue" />
          <span className="theme-copy-soft text-sm">Carregando chamado...</span>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="relative z-10 flex h-full items-center justify-center px-4">
        <div className="max-w-md text-center">
          <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: "var(--status-active)" }} />
          <p className="mb-2 text-lg text-text-2">{error || "Chamado nao encontrado"}</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="theme-copy-soft text-sm transition-colors hover:text-text-1"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const isClosed = ticket.statusId === 6;
  const canSendMessage = !isClosed;

  const onSendFollowup = () => {
    handleAddFollowup(newMessage);
    setNewMessage("");
  };

  const onChooseAttachment = () => {
    attachmentInputRef.current?.click();
  };

  return (
    <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
      <TicketSidebar
        ticket={ticket}
        requesterName={requesterName}
        technicianName={technicianName}
        groupName={groupName}
        isTechOrManager={isTechOrManager}
        canActOnTicket={canActOnTicket}
        actionLoading={actionLoading}
        onAssumeTicket={handleAssumeTicket}
        onShowSolutionModal={() => setShowSolutionModal(true)}
        onSetPending={handleSetPending}
        onReturnToQueue={handleReturnToQueue}
        onResume={handleResume}
        onReopenTicket={handleReopenTicket}
        onApproveSolution={handleApproveSolution}
        onRejectSolution={handleRejectSolution}
        onShowTransferModal={() => setShowTransferModal(true)}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TicketTimeline
          ticket={ticket}
          timeline={timeline}
          requesterName={requesterName}
          currentUserId={currentUserId}
          technicianUserId={technicianUserId}
          chatEndRef={chatEndRef}
          isTechOrManager={isTechOrManager}
        />

        <TicketAttachments
          attachments={attachments}
          disabled={actionLoading === "attachment"}
          loading={actionLoading === "attachment"}
          onDownload={handleDownloadAttachment}
        />

        <div
          className="shrink-0 border-t px-4 py-3 lg:px-6 lg:py-4"
          style={{
            borderColor: "var(--border-subtle)",
            background: "color-mix(in srgb, var(--bg-surface) 74%, transparent)",
          }}
        >
          <input
            ref={attachmentInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              if (files.length) {
                void handleUploadAttachments(files);
              }
              event.currentTarget.value = "";
            }}
          />

          <div className="mx-auto flex max-w-3xl items-end gap-2.5">
            <button
              type="button"
              onClick={onChooseAttachment}
              disabled={!canSendMessage || actionLoading === "attachment"}
              className="theme-button-secondary shrink-0 rounded-xl p-2.5 transition-colors disabled:cursor-not-allowed disabled:opacity-45"
            >
              {actionLoading === "attachment" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Paperclip size={18} />
              )}
            </button>

            <textarea
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && canSendMessage) {
                  event.preventDefault();
                  onSendFollowup();
                }
              }}
              disabled={!canSendMessage || actionLoading === "followup"}
              placeholder={
                canSendMessage
                  ? `Escrever acompanhamento como ${currentUserName}...`
                  : "Ticket fechado - somente leitura"
              }
              rows={1}
              className="theme-input flex-grow resize-none rounded-xl px-4 py-3 text-[14px] outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-45"
            />

            <button
              type="button"
              onClick={onSendFollowup}
              disabled={!newMessage.trim() || !canSendMessage || actionLoading === "followup"}
              className="theme-button-primary shrink-0 rounded-xl p-2.5 transition-colors disabled:cursor-not-allowed disabled:opacity-45"
            >
              {actionLoading === "followup" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>

          {canSendMessage ? (
            <div className="theme-copy-soft mx-auto mt-2 flex max-w-3xl flex-wrap items-center gap-2 text-[11px]">
              <span>Enter envia</span>
              <span>|</span>
              <span>Shift+Enter quebra linha</span>
              <span>|</span>
              <span>Clipe anexa arquivo</span>
            </div>
          ) : null}
        </div>
      </div>

      <SolutionModal
        ticketId={ticket.id}
        show={showSolutionModal}
        actionLoading={actionLoading}
        onClose={() => setShowSolutionModal(false)}
        onSubmit={(text) => {
          handleAddSolution(text);
          setShowSolutionModal(false);
        }}
      />

      <TransferModal
        context={context}
        show={showTransferModal}
        actionLoading={actionLoading}
        onClose={() => setShowTransferModal(false)}
        onSubmit={(techId) => {
          handleTransferTicket(techId);
          setShowTransferModal(false);
        }}
      />
    </div>
  );
}
