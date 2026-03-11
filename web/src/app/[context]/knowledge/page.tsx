"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BookOpen,
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
} from "lucide-react";
import {
  fetchKBCategories,
  fetchKBArticles,
  fetchKBArticle,
  createKBArticle,
  updateKBArticle,
  deleteKBArticle,
  type KBCategory,
  type KBArticleSummary,
  type KBArticleDetail,
  type KBArticlePayload,
} from "@/lib/api/knowledgeService";
import { useAuthStore } from "@/store/useAuthStore";


const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const contextData: Record<string, { color: string; accentClass: string }> = {
  dtic: { color: "text-accent-blue", accentClass: "bg-accent-blue" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// ─── Toast Component ───
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

// ─── Delete Confirmation Modal ───
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
        <p className="text-red-400/70 text-[12px] mb-6">⚠ Esta ação não pode ser desfeita. O artigo será removido permanentemente do GLPI.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={loading} className="px-5 py-2.5 rounded-lg text-[13px] font-medium text-text-3/70 hover:text-text-2 hover:bg-white/[0.04] transition-all">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} className="px-5 py-2.5 rounded-lg text-[13px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Formatting Toolbar ───
function FormatToolbar({ textareaRef, onUpdate }: { textareaRef: React.RefObject<HTMLTextAreaElement | null>; onUpdate: (v: string) => void }) {
  const wrap = (before: string, after: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const selected = text.substring(start, end) || "texto";
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    onUpdate(newText);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + selected.length); }, 0);
  };
  const insert = (tag: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const text = ta.value;
    const newText = text.substring(0, pos) + tag + text.substring(pos);
    onUpdate(newText);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + tag.length, pos + tag.length); }, 0);
  };

  const tools = [
    { label: "B", title: "Negrito", action: () => wrap("<b>", "</b>"), style: "font-bold" },
    { label: "I", title: "Itálico", action: () => wrap("<i>", "</i>"), style: "italic" },
    { label: "H", title: "Título", action: () => wrap("<h3>", "</h3>"), style: "font-semibold" },
    { label: "•", title: "Lista", action: () => insert("\n<ul>\n  <li>Item</li>\n</ul>\n"), style: "" },
    { label: "🔗", title: "Link", action: () => wrap('<a href="url">', "</a>"), style: "" },
    { label: "<>", title: "Código", action: () => wrap("<code>", "</code>"), style: "font-mono text-[11px]" },
  ];

  return (
    <div className="flex gap-1 mb-1.5">
      {tools.map((t) => (
        <button key={t.label} type="button" onClick={t.action} title={t.title}
          className={`px-2.5 py-1.5 rounded-md text-[12px] bg-white/[0.04] hover:bg-white/[0.08] text-text-3/60 hover:text-text-2 transition-all border border-white/[0.04] ${t.style}`}
        >{t.label}</button>
      ))}
    </div>
  );
}

// ─── Article Form (Create/Edit) ───
function ArticleForm({
  categories,
  initial,
  onSave,
  onCancel,
  loading,
}: {
  categories: KBCategory[];
  initial?: KBArticleDetail | null;
  onSave: (payload: KBArticlePayload) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [answer, setAnswer] = useState(initial?.answer || "");
  const [categoryId, setCategoryId] = useState<number | undefined>(initial?.category_id ?? undefined);
  const [isFaq, setIsFaq] = useState(initial?.is_faq ? 1 : 0);
  const [previewMode, setPreviewMode] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const isEdit = !!initial;
  const canSave = name.trim().length >= 3 && answer.trim().length > 0;

  const handleSubmit = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      answer,
      knowbaseitemcategories_id: categoryId || null,
      is_faq: isFaq,
    });
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
              <span className="text-[14px]">{isFaq ? "Marcado como FAQ" : "Não é FAQ"}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] font-semibold uppercase tracking-[0.1em] text-text-3/50">Conteúdo *</label>
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
              dangerouslySetInnerHTML={{ __html: answer || "<p style='color:rgba(255,255,255,0.3)'>Preview do conteúdo...</p>" }}
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
                  placeholder="Conteúdo do artigo (suporta HTML)"
                  rows={14}
                  className="w-full bg-transparent py-3 px-4 text-[14px] outline-none text-text-2 placeholder:text-text-3/30 resize-y font-mono leading-relaxed border-none"
                />
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
            {isEdit ? "Salvar Alterações" : "Criar Artigo"}
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
  const current = contextData[context] || contextData["dtic"];

  useEffect(() => {
    if (context !== "dtic") {
      router.replace(`/${context}/user`);
    }
  }, [context, router]);

  if (context !== "dtic") return null;

  return <KBContent context={context} current={current} router={router} />;
}


function KBContent({
  context,
  current,
  router,
}: {
  context: string;
  current: { color: string; accentClass: string };
  router: ReturnType<typeof useRouter>;
}) {
  // Auth state
  const { currentUserRole, getSessionToken } = useAuthStore();
  const sessionToken = getSessionToken("dtic");

  // Permissão via hub_role.role (fonte de verdade semântica — imune a mudanças de IDs)
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

  // Debounce
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Load categories (solicitante vê apenas FAQs, técnico/gestor vê tudo)
  const reloadCategories = useCallback(() => {
    const params = !canViewAll ? { is_faq: true } : undefined;
    fetchKBCategories(params).then(setCategories).catch(() => { });
  }, [canViewAll]);

  useEffect(() => {
    reloadCategories();
  }, [reloadCategories]);

  // Load articles
  const loadArticles = useCallback(async () => {
    setLoading(true);
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
    } catch (err: any) {
      setError(err.message || "Erro ao carregar artigos");
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, activeCategory, faqOnly, canViewAll]);

  useEffect(() => { loadArticles(); }, [loadArticles]);

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

  // ─── CRUD Handlers ───

  const handleCreate = async (payload: KBArticlePayload) => {
    if (!sessionToken) { setToast({ message: "Sessão expirada. Faça login novamente.", type: "error" }); return; }
    setSaving(true);
    try {
      await createKBArticle(sessionToken, payload);
      setToast({ message: "Artigo criado com sucesso!", type: "success" });
      setFormMode(null);
      await loadArticles();
      reloadCategories();
    } catch (err: any) {
      setToast({ message: err.message || "Erro ao criar artigo.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (payload: KBArticlePayload) => {
    if (!sessionToken || !editArticle) return;
    setSaving(true);
    try {
      await updateKBArticle(sessionToken, editArticle.id, payload);
      setToast({ message: "Artigo atualizado com sucesso!", type: "success" });
      setFormMode(null);
      setEditArticle(null);
      setSelectedArticle(null);
      await sleep(500);
      await loadArticles();
      reloadCategories();
    } catch (err: any) {
      setToast({ message: err.message || "Erro ao atualizar artigo.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sessionToken || !deleteTarget) return;
    setSaving(true);
    try {
      await deleteKBArticle(sessionToken, deleteTarget.id);
      setToast({ message: "Artigo excluído com sucesso!", type: "success" });
      setDeleteTarget(null);
      setSelectedArticle(null);
      await loadArticles();
      reloadCategories();
    } catch (err: any) {
      setToast({ message: err.message || "Erro ao excluir artigo.", type: "error" });
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
      setToast({ message: "Erro ao carregar artigo para edição.", type: "error" });
    } finally {
      setArticleLoading(false);
    }
  };

  return (
        <div className="flex flex-col h-full px-5 lg:px-8 py-5">
          {/* Header — escondido durante formulário/artigo */}
          {!formMode && !selectedArticle && (
          <header className="mb-5 shrink-0 flex items-start justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-text-1 tracking-tight">Base de Conhecimento</h1>
              <p className="text-text-2/50 text-[14px] mt-0.5">
                {total > 0 ? `${total} artigos disponíveis` : "Encontre respostas e soluções"}
              </p>
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
                onBack={() => setSelectedArticle(null)}
                canManageArticles={canManageArticles}
                onEdit={() => startEdit(selectedArticle.id)}
                onDelete={() => setDeleteTarget({ id: selectedArticle.id, name: selectedArticle.name })}
              />
            ) : (
                  <div className="flex gap-4 h-full min-h-0">
                    {/* Coluna Esquerda — Categorias */}
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

                    {/* Coluna Direita — Artigos */}
                    <div className="flex-grow flex flex-col min-h-0 min-w-0">
                      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-3/50 mb-3 shrink-0">
                        {debouncedQuery ? `Resultados para "${debouncedQuery}"` : faqOnly ? "Perguntas Frequentes" : activeCategory ? "Artigos da Categoria" : "Artigos Recentes"}
                      </h2>

                      <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
                      {loading ? (
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


/* ── Article Detail Component ── */
function ArticleView({
  article,
  onBack,
  canManageArticles,
  onEdit,
  onDelete,
}: {
  article: KBArticleDetail;
  onBack: () => void;
  canManageArticles: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
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
          <span className="flex items-center gap-1"><Eye size={11} /> {article.view_count} visualizações</span>
        </div>
      </div>

      <div className="h-px bg-white/[0.06] mb-6" />

      {/* Article content */}
      <div
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
        dangerouslySetInnerHTML={{ __html: article.answer }}
      />
    </div>
  );
}
