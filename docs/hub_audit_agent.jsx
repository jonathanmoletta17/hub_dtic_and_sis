import { useState, useEffect } from "react";

const SYSTEM_PROMPT = `Você é um engenheiro sênior de segurança e arquitetura de software especializado em sistemas de autorização. Sua tarefa é realizar uma auditoria técnica completa e rigorosa de uma implementação de matriz permissional.

Você receberá o estado atual do sistema (grupos GLPI criados, IDs reais, mapeamentos do contexts.yaml, e regras esperadas) e deve validar cada ponto com profundidade técnica, identificando inconsistências, riscos e gaps.

REGRAS DA AUDITORIA:
1. Nunca assumir que algo está correto sem evidência — marcar como "não verificável" se a informação estiver ausente
2. Separar claramente: o que está correto, o que está inconsistente, o que está ausente
3. Para cada problema encontrado, indicar: severidade (CRÍTICO / ALTO / MÉDIO / BAIXO), impacto concreto, e ação corretiva específica
4. Verificar coerência entre todas as camadas: GLPI físico → integração → contexts.yaml → frontend
5. Ao final, emitir um veredicto claro: APROVADO / APROVADO COM RESSALVAS / REPROVADO

Responda em português (pt-BR). Use markdown com headers, tabelas e blocos de código onde aplicável.`;

const AUDIT_CONTEXT = `# Contexto da Auditoria — Hub Permissional

## Sistema
Hub unificado de atendimentos com autenticação via GLPI REST API.
Backend: Python (FastAPI) | Frontend: React/TypeScript | Auth: GLPI REST

## Arquitetura de Autorização (duas camadas independentes)

### Camada 1: resolve_hub_roles (auth_service.py L64-122)
Traduz perfis e grupos GLPI → HubRoles funcionais (solicitante/tecnico/gestor).
Fonte: contexts.yaml → profile_map + group_map (IDs numéricos fixos)

### Camada 2: resolve_app_access (auth_service.py L22-43)
Busca grupos com prefixo Hub-App-* via API REST.
Retorna lista de módulos que o usuário pode ver na Sidebar.
Fonte: grupos GLPI com nome Hub-App-<módulo>

---

## Estado Atual — Grupos Hub-App-* Criados no GLPI

### Contexto DTIC (instância CAU — cau.piratini.intra.rs.gov.br)
| Nome do Grupo | ID Real no GLPI | Entidade |
|---|---|---|
| Hub-App-busca | 109 | Entidade raiz > PIRATINI |
| Hub-App-dtic-infra | 114 | Entidade raiz > PIRATINI |
| Hub-App-dtic-kpi | 113 | Entidade raiz > PIRATINI |
| Hub-App-dtic-metrics | 112 | Entidade raiz > PIRATINI |
| Hub-App-permissoes | 110 | Entidade raiz > PIRATINI |

### Contexto SIS (instância SIS — cau.piratini.intra.rs.gov.br/sis)
| Nome do Grupo | ID Real no GLPI | Entidade |
|---|---|---|
| Hub-App-busca | 102 | Origem > PIRATINI |
| Hub-App-carregadores | 104 | Origem > PIRATINI |
| Hub-App-permissoes | 103 | Origem > PIRATINI |
| Hub-App-sis-dashboard | 105 | Origem > PIRATINI |

---

## Especificação Esperada (mapeamento_grupos_glpi.md)

### Tags Globais
| Grupo | Funcionalidade | Quem deve ter |
|---|---|---|
| Hub-App-busca | Smart Search | Técnicos e Gestores |
| Hub-App-permissoes | Gestão de Acessos | Administradores e Governadores |

### Tags SIS
| Grupo | Funcionalidade | Quem deve ter |
|---|---|---|
| Hub-App-sis-dashboard | Dashboard Geral (Manutenção e Conservação) | Gestores e Coordenadores SIS |
| Hub-App-carregadores | Dashboard de Carregadores | Gestores de frotas |

### Tags DTIC
| Grupo | Funcionalidade | Quem deve ter |
|---|---|---|
| Hub-App-dtic-metrics | Dashboard de Métricas/SLA | Gestores e técnicos DTIC |
| Hub-App-dtic-kpi | Dashboard de Governança/KPIs | Direção e Coordenadores |
| Hub-App-dtic-infra | Dashboard de Infraestrutura | Equipe de Infra |

---

## contexts.yaml — Mapeamentos de Roles

### DTIC
profile_map:
  9: solicitante (Self-Service)
  6: tecnico (Technician)
  20: gestor (Super-Admin)
group_map: NÃO DEFINIDO

### SIS
profile_map:
  9: solicitante
  3: gestor (Supervisor)
group_map:
  22: tecnico-manutencao (context_override: sis-manutencao)
  21: tecnico-conservacao (context_override: sis-memoria)

---

## Lógica de Visibilidade Frontend (context-registry.ts)
Cada módulo pode ter: requiredRoles[] e/ou requireApp (nome do grupo Hub-App-*)
ContextGuard verifica ambos via Zustand store ← payload do /auth/login

---

## Pergunta Central da Auditoria
Com os grupos criados acima, o sistema funcionará corretamente de ponta a ponta?
Há inconsistências entre os IDs reais dos grupos SIS (102-105) e o group_map do contexts.yaml (espera IDs 22 e 21)?
Os grupos Hub-App-* criados cobrem todos os módulos especificados?
Existe algum gap, risco ou ação pendente antes de considerar a implementação completa?`;

const THINKING_COLOR = "#1a1a2e";
const SURFACE = "#0f1117";
const CARD = "#16181f";
const BORDER = "#2a2d3a";
const ACCENT = "#00d4aa";
const ACCENT2 = "#7c6af7";
const TEXT = "#e2e8f0";
const MUTED = "#64748b";
const SUCCESS = "#22c55e";
const WARN = "#f59e0b";
const DANGER = "#ef4444";
const INFO = "#3b82f6";

const statusColors = {
  APROVADO: SUCCESS,
  "APROVADO COM RESSALVAS": WARN,
  REPROVADO: DANGER,
};

function ThinkingBlock({ content }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(124,106,247,0.08)", border: `1px solid ${ACCENT2}33`,
          borderRadius: 6, padding: "6px 12px", cursor: "pointer",
          color: ACCENT2, fontSize: 12, fontFamily: "monospace", letterSpacing: 1,
        }}
      >
        <span style={{ fontSize: 10 }}>{open ? "▼" : "▶"}</span>
        PROCESSO DE RACIOCÍNIO ESTENDIDO — {content.length} chars
      </button>
      {open && (
        <pre style={{
          background: `${ACCENT2}08`, border: `1px solid ${ACCENT2}22`,
          borderRadius: "0 0 6px 6px", padding: 16, marginTop: -1,
          color: `${ACCENT2}cc`, fontSize: 11, lineHeight: 1.6,
          whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 400, overflowY: "auto",
          fontFamily: "monospace",
        }}>
          {content}
        </pre>
      )}
    </div>
  );
}

function MarkdownRenderer({ text }) {
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  let tableBuffer = [];
  let inTable = false;
  let codeBuffer = [];
  let inCode = false;
  let codeLang = "";

  const flushTable = () => {
    if (!tableBuffer.length) return;
    const rows = tableBuffer.map(r => r.split("|").map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1));
    const head = rows[0];
    const body = rows.slice(2);
    elements.push(
      <div key={`t${i}`} style={{ overflowX: "auto", margin: "16px 0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>{head.map((h, j) => (
              <th key={j} style={{ padding: "8px 12px", borderBottom: `1px solid ${ACCENT}44`, color: ACCENT, textAlign: "left", fontFamily: "monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: `1px solid ${BORDER}` }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: "7px 12px", color: TEXT, fontSize: 13, lineHeight: 1.5 }}
                    dangerouslySetInnerHTML={{ __html: formatInline(cell) }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
    inTable = false;
  };

  const flushCode = () => {
    elements.push(
      <pre key={`c${i}`} style={{ background: "#0d0e12", border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16, margin: "12px 0", overflowX: "auto", fontSize: 12, lineHeight: 1.7, color: "#a9b1d6", fontFamily: "monospace" }}>
        {codeBuffer.join("\n")}
      </pre>
    );
    codeBuffer = [];
    inCode = false;
  };

  const formatInline = (t) => t
    .replace(/`([^`]+)`/g, `<code style="background:#1a1d2e;color:${ACCENT};padding:1px 5px;border-radius:3px;font-size:11px;font-family:monospace">$1</code>`)
    .replace(/\*\*([^*]+)\*\*/g, `<strong style="color:${TEXT}">$1</strong>`)
    .replace(/\*([^*]+)\*/g, `<em>$1</em>`)
    .replace(/CRÍTICO/g, `<span style="color:${DANGER};font-weight:700">CRÍTICO</span>`)
    .replace(/\bALTO\b/g, `<span style="color:${WARN};font-weight:700">ALTO</span>`)
    .replace(/\bMÉDIO\b/g, `<span style="color:${INFO};font-weight:700">MÉDIO</span>`)
    .replace(/\bBAIXO\b/g, `<span style="color:${SUCCESS};font-weight:700">BAIXO</span>`)
    .replace(/✅/g, `<span style="color:${SUCCESS}">✅</span>`)
    .replace(/❌/g, `<span style="color:${DANGER}">❌</span>`)
    .replace(/⚠️/g, `<span style="color:${WARN}">⚠️</span>`);

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inTable) flushTable();
      if (inCode) { flushCode(); i++; continue; }
      inCode = true; codeLang = line.slice(3); i++; continue;
    }
    if (inCode) { codeBuffer.push(line); i++; continue; }

    if (line.startsWith("|")) {
      inTable = true; tableBuffer.push(line); i++; continue;
    }
    if (inTable) flushTable();

    if (!line.trim()) { elements.push(<div key={`sp${i}`} style={{ height: 8 }} />); }
    else if (line.startsWith("### ")) elements.push(<h3 key={i} style={{ color: ACCENT, fontSize: 14, fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase", marginTop: 24, marginBottom: 8, borderBottom: `1px solid ${ACCENT}33`, paddingBottom: 4 }}>{line.slice(4)}</h3>);
    else if (line.startsWith("## ")) elements.push(<h2 key={i} style={{ color: TEXT, fontSize: 16, fontWeight: 700, marginTop: 28, marginBottom: 10, borderLeft: `3px solid ${ACCENT}`, paddingLeft: 10 }}>{line.slice(3)}</h2>);
    else if (line.startsWith("# ")) elements.push(<h1 key={i} style={{ color: TEXT, fontSize: 20, fontWeight: 800, marginTop: 20, marginBottom: 14 }}>{line.slice(2)}</h1>);
    else if (line.match(/^[-*] /)) elements.push(<li key={i} style={{ color: TEXT, fontSize: 13, lineHeight: 1.7, marginLeft: 18, marginBottom: 3 }} dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />);
    else if (line.match(/^\d+\. /)) elements.push(<li key={i} style={{ color: TEXT, fontSize: 13, lineHeight: 1.7, marginLeft: 18, marginBottom: 3, listStyleType: "decimal" }} dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^\d+\. /, "")) }} />);
    else if (line.startsWith("---")) elements.push(<hr key={i} style={{ border: "none", borderTop: `1px solid ${BORDER}`, margin: "20px 0" }} />);
    else elements.push(<p key={i} style={{ color: TEXT, fontSize: 13, lineHeight: 1.8, margin: "4px 0" }} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />);

    i++;
  }
  if (inTable) flushTable();
  if (inCode) flushCode();

  return <div>{elements}</div>;
}

function StatusBadge({ verdict }) {
  if (!verdict) return null;
  const key = Object.keys(statusColors).find(k => verdict.toUpperCase().includes(k));
  const color = key ? statusColors[key] : MUTED;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: `${color}18`, border: `1px solid ${color}44`,
      borderRadius: 20, padding: "6px 16px",
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
      <span style={{ color, fontWeight: 700, fontSize: 13, fontFamily: "monospace", letterSpacing: 1 }}>
        {verdict}
      </span>
    </div>
  );
}

export default function HubAuditAgent() {
  const [phase, setPhase] = useState("idle"); // idle | thinking | streaming | done | error
  const [thinkingBlocks, setThinkingBlocks] = useState([]);
  const [responseText, setResponseText] = useState("");
  const [verdict, setVerdict] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [timerRef, setTimerRef] = useState(null);

  const extractVerdict = (text) => {
    const match = text.match(/APROVADO COM RESSALVAS|REPROVADO|APROVADO/i);
    return match ? match[0].toUpperCase() : null;
  };

  const startTimer = () => {
    const start = Date.now();
    const ref = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    setTimerRef(ref);
    return ref;
  };

  const stopTimer = (ref) => clearInterval(ref);

  const runAudit = async () => {
    setPhase("thinking");
    setThinkingBlocks([]);
    setResponseText("");
    setVerdict(null);
    setElapsed(0);
    const ref = startTimer();

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-5-20251101",
          max_tokens: 16000,
          thinking: { type: "enabled", budget_tokens: 10000 },
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: AUDIT_CONTEXT }],
        }),
      });

      stopTimer(ref);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // Fallback to sonnet if opus not available
        if (res.status === 404 || res.status === 400) {
          await runAuditFallback(ref);
          return;
        }
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const thinking = data.content.filter(b => b.type === "thinking").map(b => b.thinking);
      const text = data.content.filter(b => b.type === "text").map(b => b.text).join("\n");

      setThinkingBlocks(thinking);
      setResponseText(text);
      setVerdict(extractVerdict(text));
      setPhase("done");
    } catch (e) {
      stopTimer(ref);
      setResponseText(`**Erro ao executar auditoria:** ${e.message}`);
      setPhase("error");
    }
  };

  const runAuditFallback = async (ref) => {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: AUDIT_CONTEXT }],
        }),
      });

      stopTimer(ref);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const text = data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
      setResponseText(text);
      setVerdict(extractVerdict(text));
      setPhase("done");
    } catch (e) {
      stopTimer(ref);
      setResponseText(`**Erro:** ${e.message}`);
      setPhase("error");
    }
  };

  const groups = {
    dtic: [
      { name: "Hub-App-busca", id: 109 },
      { name: "Hub-App-dtic-infra", id: 114 },
      { name: "Hub-App-dtic-kpi", id: 113 },
      { name: "Hub-App-dtic-metrics", id: 112 },
      { name: "Hub-App-permissoes", id: 110 },
    ],
    sis: [
      { name: "Hub-App-busca", id: 102 },
      { name: "Hub-App-carregadores", id: 104 },
      { name: "Hub-App-permissoes", id: 103 },
      { name: "Hub-App-sis-dashboard", id: 105 },
    ],
  };

  return (
    <div style={{ background: SURFACE, minHeight: "100vh", fontFamily: "'IBM Plex Mono', 'Fira Code', monospace", color: TEXT }}>
      {/* Header */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⬡</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: TEXT }}>Hub Audit Agent</div>
            <div style={{ fontSize: 10, color: MUTED, letterSpacing: 1 }}>Matriz Permissional — Validação End-to-End</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {(phase === "thinking" || phase === "streaming") && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: ACCENT2, fontSize: 11 }}>
              <span style={{ animation: "pulse 1s infinite" }}>◉</span>
              PROCESSANDO — {elapsed}s
            </div>
          )}
          {verdict && <StatusBadge verdict={verdict} />}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px" }}>
        {/* Groups grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {Object.entries(groups).map(([ctx, list]) => (
            <div key={ctx} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: ctx === "dtic" ? ACCENT2 : ACCENT }} />
                <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: ctx === "dtic" ? ACCENT2 : ACCENT }}>
                  {ctx === "dtic" ? "DTIC — CAU" : "SIS — Manutenção"}
                </span>
              </div>
              {list.map(g => (
                <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${BORDER}44` }}>
                  <span style={{ fontSize: 12, color: TEXT }}>{g.name}</span>
                  <span style={{ fontSize: 11, color: MUTED, background: `${BORDER}88`, padding: "2px 8px", borderRadius: 4 }}>ID {g.id}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Context summary */}
        <div style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}22`, borderRadius: 8, padding: "14px 20px", marginBottom: 24, display: "flex", gap: 32 }}>
          {[
            ["Grupos DTIC", "5 criados"],
            ["Grupos SIS", "4 criados"],
            ["Camadas validadas", "GLPI → API → YAML → Frontend"],
            ["Modelo", "claude-opus-4-5 + thinking"],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: MUTED, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
              <div style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Trigger */}
        {phase === "idle" && (
          <button
            onClick={runAudit}
            style={{
              width: "100%", padding: "16px", background: `linear-gradient(135deg, ${ACCENT}22, ${ACCENT2}22)`,
              border: `1px solid ${ACCENT}44`, borderRadius: 10, cursor: "pointer",
              color: TEXT, fontSize: 13, letterSpacing: 2, textTransform: "uppercase",
              transition: "all 0.2s", marginBottom: 24,
            }}
            onMouseEnter={e => e.target.style.borderColor = ACCENT}
            onMouseLeave={e => e.target.style.borderColor = `${ACCENT}44`}
          >
            ▶  Executar Auditoria Completa
          </button>
        )}

        {(phase === "thinking" || phase === "streaming") && (
          <div style={{ textAlign: "center", padding: "48px 0", color: MUTED }}>
            <div style={{ fontSize: 32, marginBottom: 12, animation: "spin 3s linear infinite", display: "inline-block" }}>⬡</div>
            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>
              {phase === "thinking" ? "Raciocínio estendido em progresso..." : "Gerando relatório..."}
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>{elapsed}s decorridos</div>
          </div>
        )}

        {/* Results */}
        {phase === "done" && (
          <div>
            {thinkingBlocks.map((t, i) => <ThinkingBlock key={i} content={t} />)}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 11, color: MUTED, letterSpacing: 2, textTransform: "uppercase" }}>Relatório de Auditoria</span>
                {verdict && <StatusBadge verdict={verdict} />}
              </div>
              <MarkdownRenderer text={responseText} />
            </div>
            <button
              onClick={() => { setPhase("idle"); setResponseText(""); setThinkingBlocks([]); setVerdict(null); }}
              style={{ marginTop: 16, padding: "10px 20px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, color: MUTED, fontSize: 11, cursor: "pointer", letterSpacing: 1 }}
            >
              ↺ Nova auditoria
            </button>
          </div>
        )}

        {phase === "error" && (
          <div style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}33`, borderRadius: 8, padding: 20 }}>
            <MarkdownRenderer text={responseText} />
            <button onClick={() => setPhase("idle")} style={{ marginTop: 12, padding: "8px 16px", background: "transparent", border: `1px solid ${DANGER}44`, borderRadius: 6, color: DANGER, fontSize: 11, cursor: "pointer" }}>
              Tentar novamente
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
