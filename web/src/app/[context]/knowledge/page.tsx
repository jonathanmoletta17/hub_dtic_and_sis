"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Search,
  FileText,
  ChevronRight,
  ChevronLeft,
  Star,
  Eye,
  Calendar,
  Loader2,
  FolderOpen,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Save,
  Paperclip,
  Download,
  ExternalLink,
} from "lucide-react";
import {
  fetchKBCategories,
  fetchKBArticles,
  fetchKBArticle,
  createKBArticle,
  updateKBArticle,
  deleteKBArticle,
  uploadKBArticleAttachments,
  deleteKBArticleAttachment,
  fetchKBEmbeddedDocumentBlob,
  viewKBArticleAttachment,
  viewKBEmbeddedDocument,
  downloadKBArticleAttachment,
  type KBCategory,
  type KBArticleAttachment,
  type KBArticleSummary,
  type KBArticleDetail,
  type KBArticlePayload,
} from "@/lib/api/knowledgeService";
import { formatIsoDate } from "@/lib/datetime/iso";
import {
  applyKBEmbeddedImageSources,
  buildKBEmbeddedImageSkeleton,
  collectKBEmbeddedImageDocumentIds,
  extractKBEmbeddedDocumentId,
} from "@/lib/knowledge/articleContent";
import {
  getKBAttachmentExtension,
  validateKBAttachments,
} from "@/lib/knowledge/attachments";
import { useAuthStore } from "@/store/useAuthStore";
import { useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import { POLL_INTERVALS } from "@/lib/realtime/polling";

// Colors usually handled here but currently KBContent relies on context registry from other parts

function formatDate(dateStr: string | null): string {
  return formatIsoDate(dateStr) || "";
}

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PREVIEWABLE_EXTENSIONS = new Set([
  "txt",
  "csv",
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "htm",
  "html",
  "json",
  "xml",
]);

function isPreviewableAttachment(attachment: KBArticleAttachment): boolean {
  const mimeType = (attachment.mime_type || "").toLowerCase();
  if (mimeType.startsWith("text/")) return true;
  if (mimeType.startsWith("image/")) return true;
  if (mimeType === "application/pdf") return true;

  const extension = getKBAttachmentExtension(attachment.filename || "").replace(/^\./, "");
  return PREVIEWABLE_EXTENSIONS.has(extension);
}

function extractCreatedArticleId(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const directId = root.id;
  if (typeof directId === "number") return directId;
  if (typeof directId === "string" && /^\d+$/.test(directId)) return Number(directId);
  const nested = root["0"];
  if (nested && typeof nested === "object") {
    const nestedId = (nested as Record<string, unknown>).id;
    if (typeof nestedId === "number") return nestedId;
    if (typeof nestedId === "string" && /^\d+$/.test(nestedId)) return Number(nestedId);
  }
  return null;
}

// a”€a”€a”€ Toast Component a”€a”€a”€
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-4 fade-in duration-300 ${type === "success"
        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
        : "bg-red-500/15 border-red-500/30 text-red-400"
      }`}>
      {type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
      <span className="text-[13px] font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity"><X size={14} /></button>
    </div>
  );
}

// a”€a”€a”€ Delete Confirmation Modal a”€a”€a”€
function DeleteModal({ articleName, onConfirm, onCancel, loading }: {
  articleName: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-2 border border-white/[0.08] rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-text-1">Excluir Artigo</h3>
        </div>
        <p className="text-text-2/70 text-[14px] mb-2">Tem certeza que deseja excluir o artigo:</p>
        <p className="text-text-1 font-medium text-[14px] mb-4 px-3 py-2 bg-white/[0.04] rounded-lg truncate">&quot;{articleName}&quot;</p>
        <p className="text-red-400/70 text-[12px] mb-6">Atencao: Esta acao nao pode ser desfeita. O artigo sera removido permanentemente do GLPI.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={loading} className="px-5 py-2.5 rounded-lg text-[13px] font-medium text-text-3/70 hover:text-text-2 hover:bg-white/[0.04] transition-all">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} className="px-5 py-2.5 rounded-lg text-[13px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Confirmar Exclusao
          </button>
        </div>
      </div>
    </div>
  );
}

function FormatToolbar({ textareaRef, onUpdate }: { textareaRef: React.RefObject<HTMLTextAreaElement | null>; onUpdate: (v: string) => void }) {
  const handleAction = useCallback((type: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const selected = text.substring(start, end) || "texto";

    let wrapB = ""; let wrapA = ""; let tag = "";
    if (type === "B") { wrapB = "<b>"; wrapA = "</b>"; }
    else if (type === "I") { wrapB = "<i>"; wrapA = "</i>"; }
    else if (type === "H") { wrapB = "<h3>"; wrapA = "</h3>"; }
    else if (type === "LINK") { wrapB = '<a href="url">'; wrapA = "</a>"; }
    else if (type === "CODE") { wrapB = "<code>"; wrapA = "</code>"; }
    else if (type === "LIST") { tag = "\n<ul>\n  <li>Item</li>\n</ul>\n"; }

    let newText = "";
    let focusPos = 0;
    if (tag) {
      newText = text.substring(0, start) + tag + text.substring(start);
      focusPos = start + tag.length;
    } else {
      newText = text.substring(0, start) + wrapB + selected + wrapA + text.substring(end);
      focusPos = start + wrapB.length + selected.length;
    }

    onUpdate(newText);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(type === "LIST" ? focusPos : start + wrapB.length, focusPos); }, 0);
  }, [textareaRef, onUpdate]);

  return (
    <div className="flex gap-1 mb-1.5">
      <button type="button" onClick={() => handleAction("B")} title="Negrito" className="px-2.5 py-1.5 rounded-md text-[12px] bg-white/[0.04] hover:bg-white/[0.08] text-text-3/60 hover:text-text-2 transition-all border border-white/[0.04] font-bold">B</button>
      <button type="button" onClick={() => handleAction("I")} title="Italico" className="px-2.5 py-1.5 rounded-md text-[12px] bg-white/[0.04] hover:bg-white/[0.08] text-text-3/60 hover:text-text-2 transition-all border border-white/[0.04] italic">I</button>
      <button type="button" onClick={() => handleAction("H")} title="Titulo" className="px-2.5 py-1.5 rounded-md text-[12px] bg-white/[0.04] hover:bg-white/[0.08] text-text-3/60 hover:text-text-2 transition-all border border-white/[0.04] font-semibold">H</button>
      <button type="button" onClick={() => handleAction("LIST")} title="Lista" className="px-2.5 py-1.5 rounded-md text-[12px] bg-white/[0.04] hover:bg-white/[0.08] text-text-3/60 hover:text-text-2 transition-all border border-white/[0.04]">*</button>
      <button type="button" onClick={() => handleAction("LINK")} title="Link" className="px-2.5 py-1.5 rounded-md text-[12px] bg-white/[0.04] hover:bg-white/[0.08] text-text-3/60 hover:text-text-2 transition-all border border-white/[0.04]">Link</button>
      <button type="button" onClick={() => handleAction("CODE")} title="Codigo" className="px-2.5 py-1.5 rounded-md text-[12px] bg-white/[0.04] hover:bg-white/[0.08] text-text-3/60 hover:text-text-2 transition-all border border-white/[0.04] font-mono text-[11px]">&lt;&gt;</button>
    </div>
  );
}

// a”€a”€a”€ Article Form (Create/Edit) a”€a”€a”€
function ArticleForm({
  categories,
  initial,
  onSave,
  onCancel,
  loading,
}: {
  categories: KBCategory[];
  initial?: KBArticleDetail | null;
  onSave: (payload: KBArticlePayload, files: File[], removedAttachmentIds: number[]) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [answer, setAnswer] = useState(initial?.answer || "");
  const [categoryId, setCategoryId] = useState<number | undefined>(initial?.category_id ?? undefined);
  const [isFaq, setIsFaq] = useState(initial?.is_faq ? 1 : 0);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<KBArticleAttachment[]>(initial?.attachments || []);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const isEdit = !!initial;
  const canSave = name.trim().length >= 3 && answer.trim().length > 0;

  useEffect(() => {
    setExistingAttachments(initial?.attachments || []);
    setRemovedAttachmentIds([]);
  }, [initial]);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    setPendingFiles((current) => [...current, ...selected]);
    event.target.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const removeExistingAttachment = (attachmentId: number) => {
    setExistingAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId),
    );
    setRemovedAttachmentIds((current) =>
      current.includes(attachmentId) ? current : [...current, attachmentId],
    );
  };

  const handleSubmit = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      answer,
      knowbaseitemcategories_id: categoryId || null,
      is_faq: isFaq,
    }, pendingFiles, removedAttachmentIds);
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-200">
      <button onClick={onCancel} className="flex items-center gap-1.5 text-text-3/60 hover:text-text-2 transition-colors mb-5 text-[13px] group">
        <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Voltar
      </button>

      <h2 className="text-xl font-semibold text-text-1 mb-6">
        {isEdit ? "Editar Artigo" : "Novo Artigo"}
      </h2>

      <div className="space-y-5 max-w-3xl">
        {/* Name */}
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-text-3/50 mb-2">Assunto *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Assunto do artigo"
            className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-3 px-4 text-[14px] outline-none focus:border-white/[0.15] transition-all text-text-2 placeholder:text-text-3/30"
          />
        </div>

        {/* Category + FAQ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-text-3/50 mb-2">Categoria</label>
            <select
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-3 px-4 text-[14px] outline-none focus:border-white/[0.15] transition-all text-text-2 appearance-none"
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-text-3/50 mb-2">FAQ</label>
            <button
              onClick={() => setIsFaq(isFaq === 1 ? 0 : 1)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all w-full ${isFaq ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-surface-2 border-white/[0.06] text-text-3/50"
                }`}
            >
              <Star size={14} fill={isFaq ? "currentColor" : "none"} />
              <span className="text-[14px]">{isFaq ? "Marcado como FAQ" : "Nao e FAQ"}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] font-semibold uppercase tracking-[0.1em] text-text-3/50">Conteudo *</label>
            <div className="flex gap-1">
              <button
                onClick={() => setPreviewMode(false)}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${!previewMode ? "bg-white/[0.08] text-text-1" : "text-text-3/50 hover:text-text-2"}`}
              >
                Editar
              </button>
              <button
                onClick={() => setPreviewMode(true)}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${previewMode ? "bg-white/[0.08] text-text-1" : "text-text-3/50 hover:text-text-2"}`}
              >
                Preview
              </button>
            </div>
          </div>
          {previewMode ? (
            <div
              className="w-full bg-surface-2 border border-white/[0.06] rounded-xl p-4 min-h-[300px] prose prose-invert prose-sm max-w-none prose-headings:text-text-1 prose-p:text-text-2/80 prose-a:text-accent-blue prose-img:rounded-lg prose-img:max-w-full"
              dangerouslySetInnerHTML={{ __html: answer || "<p style='color:rgba(255,255,255,0.3)'>Preview do conteudo...</p>" }}
            />
          ) : (
              <div className="bg-surface-2 border border-white/[0.06] rounded-xl overflow-hidden focus-within:border-white/[0.15] transition-all">
                <div className="px-3 pt-2.5 pb-1.5 border-b border-white/[0.04]">
                  <FormatToolbar textareaRef={textareaRef} onUpdate={setAnswer} />
                </div>
                <textarea
                  ref={textareaRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Conteudo do artigo (suporta HTML)"
                  rows={14}
                  className="w-full bg-transparent py-3 px-4 text-[14px] outline-none text-text-2 placeholder:text-text-3/30 resize-y font-mono leading-relaxed border-none"
                />
              </div>
          )}
        </div>

        {/* Attachments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] font-semibold uppercase tracking-[0.1em] text-text-3/50">
              Anexos
            </label>
            <label className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[12px] text-text-2 cursor-pointer transition-colors">
              Selecionar Arquivos
              <input
                type="file"
                multiple
                onChange={handleFileSelection}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx"
              />
            </label>
          </div>

          {existingAttachments.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[12px] text-text-3/50">Anexos ja vinculados</p>
              {existingAttachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-surface-2 px-3 py-2 text-[13px]">
                  <span className="truncate text-text-2">{attachment.filename}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-text-3/50">{formatFileSize(attachment.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeExistingAttachment(attachment.id)}
                      className="text-text-3/60 hover:text-red-400 transition-colors"
                      title="Remover anexo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingFiles.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[12px] text-text-3/50">Arquivos para envio nesta operacao</p>
              {pendingFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-accent-blue/30 bg-accent-blue/10 px-3 py-2 text-[13px]">
                  <span className="truncate text-text-2">{file.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-text-3/50">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removePendingFile(index)}
                      className="text-text-3/60 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button onClick={onCancel} disabled={loading} className="px-5 py-2.5 rounded-lg text-[13px] font-medium text-text-3/70 hover:text-text-2 hover:bg-white/[0.04] transition-all">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSave || loading}
            className="px-6 py-2.5 rounded-lg text-[13px] font-medium bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isEdit ? "Salvar Alteracoes" : "Criar Artigo"}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function KnowledgeBasePage() {
  const params = useParams();
  const router = useRouter();
  const context = params.context as string;

  useEffect(() => {
    if (context !== "dtic") {
      router.replace(`/${context}/user`);
    }
  }, [context, router]);

  if (context !== "dtic") return null;

  return <KBContent />;
}


function KBContent() {
  // Auth state
  const { currentUserRole, getSessionToken } = useAuthStore();
  const sessionToken = getSessionToken("dtic");

  // Permissao via hub_role.role (fonte de verdade semÃ¢ntica a€” imune a mudancas de IDs)
  const hubRoles = currentUserRole?.hub_roles || [];
  const activeHubRole =
    currentUserRole?.active_hub_role ||
    hubRoles[0];
  const hubRole = activeHubRole?.role || "";

  const canManageArticles = hubRole === "tecnico" || hubRole === "gestor";
  const canViewAll = hubRole === "gestor" || hubRole === "tecnico";

  // Data
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [articles, setArticles] = useState<KBArticleSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [faqOnly, setFaqOnly] = useState(false);

  // Article view
  const [selectedArticle, setSelectedArticle] = useState<KBArticleDetail | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);

  // CRUD state
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editArticle, setEditArticle] = useState<KBArticleDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const hasLoadedOnceRef = useRef(false);

  // Debounce
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Load categories (solicitante ve apenas FAQs, tecnico/gestor ve tudo)
  const reloadCategories = useCallback(() => {
    const params = !canViewAll ? { is_faq: true } : undefined;
    fetchKBCategories(params).then(setCategories).catch(() => { });
  }, [canViewAll]);

  useEffect(() => {
    reloadCategories();
  }, [reloadCategories]);

  // Load articles
  const loadArticles = useCallback(async () => {
    const isInitialLoad = !hasLoadedOnceRef.current;
    if (isInitialLoad) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const result = await fetchKBArticles({
        q: debouncedQuery || undefined,
        category_id: activeCategory || undefined,
        is_faq: !canViewAll ? true : (faqOnly ? true : undefined),
        limit: 100,
      });
      setArticles(result.articles);
      setTotal(result.total);
      hasLoadedOnceRef.current = true;
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Erro ao carregar artigos");
      if (!hasLoadedOnceRef.current) {
        setArticles([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedQuery, activeCategory, faqOnly, canViewAll]);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  useLiveDataRefresh({
    context: "dtic",
    domains: ["knowledge"],
    onRefresh: async () => {
      await Promise.all([
        loadArticles(),
        Promise.resolve(reloadCategories()),
      ]);
    },
    pollIntervalMs: POLL_INTERVALS.knowledge,
    enabled: !formMode && !saving,
    minRefreshGapMs: 1_000,
  });

  // Open article
  const openArticle = async (id: number) => {
    setArticleLoading(true);
    try {
      const article = await fetchKBArticle(id);
      setSelectedArticle(article);
    } catch {
      setError("Erro ao carregar artigo");
    } finally {
      setArticleLoading(false);
    }
  };

  // a”€a”€a”€ CRUD Handlers a”€a”€a”€

  const handleCreate = async (payload: KBArticlePayload, files: File[], _removedAttachmentIds: number[]) => {
    if (!sessionToken) { setToast({ message: "Sessao expirada. Faca login novamente.", type: "error" }); return; }
    const validationError = validateKBAttachments(files);
    if (validationError) {
      setToast({ message: validationError, type: "error" });
      return;
    }
    setSaving(true);
    let createdArticleId: number | null = null;
    try {
      const createResult = await createKBArticle(sessionToken, payload);
      const articleId = extractCreatedArticleId(createResult.data);
      createdArticleId = articleId;
      if (files.length > 0) {
        if (!articleId) {
          throw new Error("Artigo criado, mas o ID retornado pela API e invalido para envio de anexos.");
        }
        await uploadKBArticleAttachments(sessionToken, articleId, files);
      }
      setToast({
        message: files.length > 0 ? "Artigo e anexos enviados com sucesso!" : "Artigo criado com sucesso!",
        type: "success",
      });
      setFormMode(null);
      await loadArticles();
      reloadCategories();
    } catch (err: unknown) {
      const baseMessage = err instanceof Error && err.message ? err.message : "Erro ao criar artigo.";

      if (createdArticleId && files.length > 0) {
        try {
          await deleteKBArticle(sessionToken, createdArticleId);
          setToast({ message: `${baseMessage} O artigo criado foi revertido.`, type: "error" });
          return;
        } catch {
          setToast({ message: `${baseMessage} O artigo pode ter sido criado sem os anexos.`, type: "error" });
          return;
        }
      }

      setToast({ message: baseMessage, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (payload: KBArticlePayload, files: File[], removedAttachmentIds: number[]) => {
    if (!sessionToken || !editArticle) return;
    const validationError = validateKBAttachments(files);
    if (validationError) {
      setToast({ message: validationError, type: "error" });
      return;
    }
    setSaving(true);
    try {
      await updateKBArticle(sessionToken, editArticle.id, payload);
      for (const attachmentId of removedAttachmentIds) {
        await deleteKBArticleAttachment(sessionToken, editArticle.id, attachmentId);
      }
      if (files.length > 0) {
        await uploadKBArticleAttachments(sessionToken, editArticle.id, files);
      }
      setToast({
        message: (files.length > 0 || removedAttachmentIds.length > 0)
          ? "Artigo e anexos atualizados com sucesso!"
          : "Artigo atualizado com sucesso!",
        type: "success",
      });
      setFormMode(null);
      setEditArticle(null);
      setSelectedArticle(null);
      await loadArticles();
      reloadCategories();
    } catch (err: unknown) {
      setToast({ message: err instanceof Error && err.message ? err.message : "Erro ao atualizar artigo.", type: "error" });
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!sessionToken || !deleteTarget) return;
    setSaving(true);
    try {
      await deleteKBArticle(sessionToken, deleteTarget.id);
      setToast({ message: "Artigo excluido com sucesso!", type: "success" });
      setDeleteTarget(null);
      setSelectedArticle(null);
      await loadArticles();
      reloadCategories();
    } catch (err: unknown) {
      setToast({ message: err instanceof Error && err.message ? err.message : "Erro ao excluir artigo.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = async (articleId: number) => {
    setArticleLoading(true);
    try {
      const article = await fetchKBArticle(articleId);
      setEditArticle(article);
      setFormMode("edit");
      setSelectedArticle(null);
    } catch {
      setToast({ message: "Erro ao carregar artigo para edicao.", type: "error" });
    } finally {
      setArticleLoading(false);
    }
  };

  const handleViewAttachment = async (articleId: number, attachment: KBArticleAttachment) => {
    if (!sessionToken) {
      setToast({ message: "Sessao expirada. Faca login novamente.", type: "error" });
      return;
    }
    try {
      if (!isPreviewableAttachment(attachment)) {
        await downloadKBArticleAttachment(sessionToken, articleId, attachment);
        setToast({ message: "Formato sem visualizacao no navegador. Download iniciado.", type: "success" });
        return;
      }
      await viewKBArticleAttachment(sessionToken, articleId, attachment);
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : "Erro ao visualizar anexo.", type: "error" });
    }
  };

  const handleDownloadAttachment = async (articleId: number, attachment: KBArticleAttachment) => {
    if (!sessionToken) {
      setToast({ message: "Sessao expirada. Faca login novamente.", type: "error" });
      return;
    }
    try {
      await downloadKBArticleAttachment(sessionToken, articleId, attachment);
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : "Erro ao baixar anexo.", type: "error" });
    }
  };

  return (
        <div className="flex flex-col h-full px-5 lg:px-8 py-5">
          {/* Header a€” escondido durante formulario/artigo */}
          {!formMode && !selectedArticle && (
          <header className="mb-5 shrink-0 flex items-start justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-text-1 tracking-tight">Base de Conhecimento</h1>
              <p className="text-text-2/50 text-[14px] mt-0.5">
                {total > 0 ? `${total} artigos disponiveis` : "Encontre respostas e solucoes"}
              </p>
              {refreshing && (
                <p className="inline-flex items-center gap-1 text-[11px] text-text-3/50 mt-1">
                  <Loader2 size={12} className="animate-spin" />
                  Atualizando base
                </p>
              )}
            </div>
              {canManageArticles && (
              <button
                onClick={() => { setFormMode("create"); setEditArticle(null); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-blue/15 text-accent-blue hover:bg-accent-blue/25 transition-all text-[13px] font-medium"
              >
                <Plus size={15} />
                <span className="hidden lg:inline">Novo Artigo</span>
              </button>
            )}
          </header>
          )}

          {/* Search + Filters (hidden during form/article) */}
          {!formMode && !selectedArticle && (
            <div className="flex flex-col lg:flex-row gap-3 mb-5 shrink-0">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-3/30" size={18} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar artigos, tutoriais, procedimentos..."
                  className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-3.5 pl-12 pr-4 text-[14px] outline-none focus:border-white/[0.12] transition-all text-text-2 placeholder:text-text-3/40"
                />
              </div>
              {canViewAll && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setActiveCategory(null); setFaqOnly(false); }}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${!activeCategory && !faqOnly ? "bg-white/[0.08] text-text-1" : "text-text-3/60 hover:text-text-2 hover:bg-white/[0.03]"}`}
                >Todos</button>
                <button
                  onClick={() => { setFaqOnly(!faqOnly); setActiveCategory(null); }}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all flex items-center gap-1.5 ${faqOnly ? "bg-amber-500/15 text-amber-400" : "text-text-3/60 hover:text-text-2 hover:bg-white/[0.03]"}`}
                >
                  <Star size={12} /> FAQ
                </button>
              </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4 shrink-0">{error}</div>
          )}

          {/* Main Content */}
          <div className="flex-grow min-h-0 overflow-y-auto pr-1" style={{ scrollbarWidth: "none" }}>
            {formMode ? (
              <ArticleForm
                categories={categories}
              initial={formMode === "edit" ? editArticle : null}
              onSave={formMode === "edit" ? handleEdit : handleCreate}
              onCancel={() => { setFormMode(null); setEditArticle(null); }}
              loading={saving}
            />
            ) : selectedArticle ? (
              <ArticleView
                article={selectedArticle}
                sessionToken={sessionToken ?? null}
                onBack={() => setSelectedArticle(null)}
                canManageArticles={canManageArticles}
                onEdit={() => startEdit(selectedArticle.id)}
                onDelete={() => setDeleteTarget({ id: selectedArticle.id, name: selectedArticle.name })}
                onViewAttachment={(attachment) => handleViewAttachment(selectedArticle.id, attachment)}
                onDownloadAttachment={(attachment) => handleDownloadAttachment(selectedArticle.id, attachment)}
                onContentError={(message) => setToast({ message, type: "error" })}
              />
            ) : (
                  <div className="flex gap-4 h-full min-h-0">
                    {/* Coluna Esquerda a€” Categorias */}
                    {!debouncedQuery && !faqOnly && categories.length > 0 && (
                      <div className="w-56 lg:w-64 shrink-0 flex flex-col min-h-0">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-3/50 mb-2 px-1 shrink-0">Categorias</h2>
                        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-0.5 pr-1">
                          <button
                            onClick={() => setActiveCategory(null)}
                            className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all ${!activeCategory
                              ? "bg-white/[0.06] text-text-1"
                              : "text-text-3/60 hover:text-text-2 hover:bg-white/[0.03]"
                              }`}
                          >
                            <FolderOpen size={14} className={!activeCategory ? "text-accent-blue" : "text-text-3/35"} />
                            <span className="text-[13px] font-medium truncate flex-grow">Todos</span>
                            <span className="text-[10px] text-text-3/30 font-mono">{total}</span>
                          </button>
                          {categories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                              className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all ${activeCategory === cat.id
                                ? "bg-accent-blue/10 border-l-2 border-accent-blue text-text-1"
                                : "text-text-3/60 hover:text-text-2 hover:bg-white/[0.03]"
                                }`}
                            >
                              <FolderOpen size={14} className={activeCategory === cat.id ? "text-accent-blue" : "text-text-3/35"} />
                              <span className="text-[13px] font-medium truncate flex-grow">{cat.name}</span>
                              <span className="text-[10px] text-text-3/30 font-mono shrink-0">{cat.article_count}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Coluna Direita a€” Artigos */}
                    <div className="flex-grow flex flex-col min-h-0 min-w-0">
                      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-3/50 mb-3 shrink-0">
                        {debouncedQuery ? `Resultados para "${debouncedQuery}"` : faqOnly ? "Perguntas Frequentes" : activeCategory ? "Artigos da Categoria" : "Artigos Recentes"}
                      </h2>

                      <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
                      {loading && articles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-text-3/40 gap-3">
                          <Loader2 size={28} className="animate-spin" />
                          <p className="text-sm">Carregando artigos...</p>
                        </div>
                      ) : articles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-text-3/40 gap-3">
                          <AlertTriangle size={28} />
                          <p className="text-sm">Nenhum artigo encontrado.</p>
                        </div>
                      ) : (
                            <div className="space-y-1">
                              {articles.map((article) => (
                                <div key={article.id} className="flex items-center group">
                                  <button
                                    onClick={() => openArticle(article.id)}
                                    className="flex-grow text-left flex items-center gap-3.5 p-3.5 rounded-lg hover:bg-white/[0.04] transition-all"
                                  >
                                    <FileText size={15} className="text-text-3/30 group-hover:text-text-3/50 transition-colors shrink-0" />
                                    <div className="flex-grow min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-[14px] font-medium text-text-2 group-hover:text-text-1 transition-colors truncate">{article.name}</h4>
                                {article.is_faq && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 shrink-0">FAQ</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                {article.category && <span className="text-[11px] text-text-3/40 uppercase tracking-wider">{article.category}</span>}
                                <span className="text-[11px] text-text-3/30 flex items-center gap-1"><Eye size={10} /> {article.view_count}</span>
                                <span className="text-[11px] text-text-3/30 flex items-center gap-1"><Calendar size={10} /> {formatDate(article.date_mod)}</span>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-text-3/20 group-hover:text-text-3/50 transition-colors shrink-0" />
                          </button>
                          {canManageArticles && (
                            <div className="flex gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(article.id)} className="p-2 rounded-lg text-text-3/40 hover:text-accent-blue hover:bg-accent-blue/10 transition-all" title="Editar">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setDeleteTarget({ id: article.id, name: article.name })} className="p-2 rounded-lg text-text-3/40 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Excluir">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                            </div>
                        )}
                      </div>
                    </div>
                  </div>
            )}
          </div>

          {/* Loading overlay for article */}
          {articleLoading && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
              <div className="bg-surface-2 rounded-xl p-6 flex items-center gap-3">
                <Loader2 size={20} className="animate-spin text-accent-blue" />
                <span className="text-text-2 text-sm">Carregando artigo...</span>
              </div>
            </div>
      )}
      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          articleName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={saving}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}


/* a”€a”€ Article Detail Component a”€a”€ */
function ArticleView({
  article,
  sessionToken,
  onBack,
  canManageArticles,
  onEdit,
  onDelete,
  onViewAttachment,
  onDownloadAttachment,
  onContentError,
}: {
  article: KBArticleDetail;
  sessionToken: string | null;
  onBack: () => void;
  canManageArticles: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onViewAttachment: (attachment: KBArticleAttachment) => void;
  onDownloadAttachment: (attachment: KBArticleAttachment) => void;
  onContentError: (message: string) => void;
}) {
  const embeddedImageSkeleton = useMemo(
    () => buildKBEmbeddedImageSkeleton(article.answer),
    [article.answer],
  );
  const [renderedAnswer, setRenderedAnswer] = useState(embeddedImageSkeleton);
  const embeddedObjectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    setRenderedAnswer(embeddedImageSkeleton);
  }, [embeddedImageSkeleton]);

  useEffect(() => {
    const revokeEmbeddedObjectUrls = () => {
      for (const objectUrl of embeddedObjectUrlsRef.current) {
        URL.revokeObjectURL(objectUrl);
      }
      embeddedObjectUrlsRef.current = [];
    };

    revokeEmbeddedObjectUrls();

    if (!sessionToken) {
      setRenderedAnswer(embeddedImageSkeleton);
      return revokeEmbeddedObjectUrls;
    }

    const embeddedDocumentIds = collectKBEmbeddedImageDocumentIds(embeddedImageSkeleton);
    if (!embeddedDocumentIds.length) {
      setRenderedAnswer(embeddedImageSkeleton);
      return revokeEmbeddedObjectUrls;
    }

    let cancelled = false;

    void (async () => {
      const resolvedObjectUrls = new Map<number, string>();
      const objectUrls: string[] = [];

      for (const documentId of embeddedDocumentIds) {
        try {
          const blob = await fetchKBEmbeddedDocumentBlob(sessionToken, documentId);
          if (!blob.type.toLowerCase().startsWith("image/")) {
            continue;
          }

          const objectUrl = URL.createObjectURL(blob);
          resolvedObjectUrls.set(documentId, objectUrl);
          objectUrls.push(objectUrl);
        } catch (error) {
          console.warn("Falha ao carregar imagem embutida da KB", documentId, error);
        }
      }

      if (cancelled) {
        for (const objectUrl of objectUrls) {
          URL.revokeObjectURL(objectUrl);
        }
        return;
      }

      embeddedObjectUrlsRef.current = objectUrls;
      if (resolvedObjectUrls.size > 0) {
        setRenderedAnswer(
          applyKBEmbeddedImageSources(embeddedImageSkeleton, resolvedObjectUrls),
        );
      } else {
        setRenderedAnswer(embeddedImageSkeleton);
      }
    })();

    return () => {
      cancelled = true;
      revokeEmbeddedObjectUrls();
    };
  }, [embeddedImageSkeleton, sessionToken]);

  const handleContentClick = useCallback(async (event: React.MouseEvent<HTMLDivElement>) => {
    if (!sessionToken) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const anchor = target?.closest("a");
    if (!anchor) {
      return;
    }

    const documentId = extractKBEmbeddedDocumentId(anchor.getAttribute("href"));
    if (!documentId) {
      return;
    }

    event.preventDefault();

    try {
      await viewKBEmbeddedDocument(sessionToken, documentId);
    } catch (error: unknown) {
      onContentError(error instanceof Error ? error.message : "Erro ao abrir documento embutido.");
    }
  }, [onContentError, sessionToken]);

  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-text-3/60 hover:text-text-2 transition-colors text-[13px] group">
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Voltar aos artigos
        </button>
        {canManageArticles && (
          <div className="flex gap-1.5">
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium text-accent-blue/80 hover:text-accent-blue hover:bg-accent-blue/10 transition-all">
              <Pencil size={13} /> Editar
            </button>
            <button onClick={onDelete} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all">
              <Trash2 size={13} /> Excluir
            </button>
          </div>
        )}
      </div>

      {/* Article header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {article.is_faq && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">FAQ</span>}
          {article.category && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/[0.06] text-text-3/60 uppercase tracking-wider">{article.category}</span>
          )}
        </div>
        <h2 className="text-xl font-semibold text-text-1 leading-tight mb-3">{article.name}</h2>
        <div className="flex items-center gap-4 text-[12px] text-text-3/40">
          {article.author && <span>Por <span className="text-text-2/60">{article.author}</span></span>}
          <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(article.date_mod)}</span>
          <span className="flex items-center gap-1"><Eye size={11} /> {article.view_count} visualizacoes</span>
        </div>
      </div>

      {article.attachments.length > 0 && (
        <div className="mb-6 rounded-xl border border-white/[0.06] bg-surface-2/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-text-3/50">
            <Paperclip size={14} />
            Anexos
          </div>
          <div className="space-y-2">
            {article.attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-surface-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-text-2">{attachment.filename}</p>
                  <p className="text-[11px] text-text-3/50">
                    {formatFileSize(attachment.size)}
                    {attachment.date_upload ? ` • ${formatDate(attachment.date_upload)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {isPreviewableAttachment(attachment) ? (
                    <button
                      onClick={() => onViewAttachment(attachment)}
                      className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] text-text-2/80 hover:bg-white/[0.06] hover:text-text-1 transition-colors"
                    >
                      <ExternalLink size={12} />
                      Visualizar
                    </button>
                  ) : (
                    <span className="rounded-md px-2.5 py-1.5 text-[11px] text-text-3/45">
                      Sem preview
                    </span>
                  )}
                  <button
                    onClick={() => onDownloadAttachment(attachment)}
                    className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] text-accent-blue hover:bg-accent-blue/10 transition-colors"
                  >
                    <Download size={12} />
                    Baixar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-px bg-white/[0.06] mb-6" />

      {/* Article content */}
      <div
        onClick={handleContentClick}
        className="kb-article-content prose prose-invert prose-sm max-w-none
          prose-headings:text-text-1 prose-headings:font-semibold
          prose-p:text-text-2/80 prose-p:leading-relaxed
          prose-a:text-accent-blue prose-a:no-underline hover:prose-a:underline
          prose-strong:text-text-1
          prose-ul:text-text-2/80 prose-ol:text-text-2/80
          prose-li:marker:text-text-3/40
          prose-code:text-accent-blue prose-code:bg-surface-3 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-surface-3 prose-pre:border prose-pre:border-white/[0.06] prose-pre:rounded-lg
          prose-img:rounded-lg prose-img:border prose-img:border-white/[0.06] prose-img:max-w-full
          prose-table:border-collapse
          prose-th:bg-surface-3 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-text-2 prose-th:text-[13px] prose-th:border prose-th:border-white/[0.06]
          prose-td:px-3 prose-td:py-2 prose-td:text-text-2/80 prose-td:text-[13px] prose-td:border prose-td:border-white/[0.06]
        "
        dangerouslySetInnerHTML={{ __html: renderedAnswer }}
      />
    </div>
  );
}


