"use client";

import React, { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertTriangle, Paperclip, Send } from "lucide-react";

import { useTicketDetail } from "@/components/ticket/useTicketDetail";
import { TicketSidebar } from "@/components/ticket/TicketSidebar";
import { TicketTimeline } from "@/components/ticket/TicketTimeline";
import { SolutionModal } from "@/components/ticket/SolutionModal";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = Number(params.id);
  const context = params.context as string;

  const {
    ticket,
    timeline,
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
    handleAddFollowup,
    handleAssumeTicket,
    handleAddSolution,
    handleSetPending,
    handleResume,
    handleReturnToQueue,
  } = useTicketDetail(ticketId, context);

  const [newMessage, setNewMessage] = useState("");
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center relative z-10">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-accent-blue" />
          <span className="text-text-3/50 text-sm">Carregando ticket...</span>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex h-screen items-center justify-center relative z-10">
        <div className="text-center max-w-md">
          <AlertTriangle size={32} className="text-red-400/60 mx-auto mb-3" />
          <p className="text-text-3/50 text-lg mb-2">{error || "Ticket não encontrado"}</p>
          <button onClick={() => router.back()} className="text-blue-400 hover:text-blue-300 text-sm">← Voltar</button>
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

  return (
    <div className="flex h-screen overflow-hidden relative z-10">
      <TicketSidebar
        ticket={ticket}
        requesterName={requesterName}
        technicianName={technicianName}
        groupName={groupName}
        isTechOrManager={isTechOrManager}
        actionLoading={actionLoading}
        onAssumeTicket={handleAssumeTicket}
        onShowSolutionModal={() => setShowSolutionModal(true)}
        onSetPending={handleSetPending}
        onReturnToQueue={handleReturnToQueue}
        onResume={handleResume}
      />

      <div className="flex-grow flex flex-col overflow-hidden">
        <TicketTimeline
          ticket={ticket}
          timeline={timeline}
          requesterName={requesterName}
          currentUserId={currentUserId}
          technicianUserId={technicianUserId}
          chatEndRef={chatEndRef}
        />

        {/* ──── Message Input ──── */}
        <div className="px-6 py-4 border-t border-white/[0.06] shrink-0 bg-surface-1/50">
          <div className="max-w-3xl mx-auto flex items-end gap-2.5">
            <button disabled className="p-2 text-text-3/20 cursor-not-allowed shrink-0">
              <Paperclip size={18} />
            </button>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && canSendMessage) {
                  e.preventDefault();
                  onSendFollowup();
                }
              }}
              disabled={!canSendMessage || actionLoading === "followup"}
              placeholder={canSendMessage ? `Escrever acompanhamento como ${currentUserName}...` : "Ticket fechado — somente leitura"}
              rows={1}
              className="flex-grow bg-surface-2 border border-white/[0.06] rounded-xl py-3 px-4 text-[14px] text-text-2 placeholder:text-text-3/30 outline-none focus:border-white/[0.12] transition-colors resize-none disabled:opacity-30 disabled:cursor-not-allowed"
            />
            <button
              onClick={onSendFollowup}
              disabled={!newMessage.trim() || !canSendMessage || actionLoading === "followup"}
              className="p-2.5 rounded-xl bg-blue-500/90 hover:bg-blue-500 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              {actionLoading === "followup" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <div className="max-w-3xl mx-auto mt-2 flex items-center gap-3 text-[11px] text-text-3/25">
            <span>Enter envia</span><span>•</span><span>Shift+Enter nova linha</span>
          </div>
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
    </div>
  );
}
