# AG-05 — UX, Narrativa Visual e Operação em TV/Kiosk

## 1. Hierarquia Visual e Storytelling

A aplicação conta uma história normativa de **cima para baixo** (top-down):

```
NÍVEL 1 — Normativo Externo
  ┌─────────────────────┐  ┌──────────────────────┐
  │ Normativas Federais │  │ Normativas Estaduais │
  │ (EFGD, SISP, IN SGD)│  │ (Decretos RS)        │
  └─────────┬───────────┘  └──────────┬───────────┘
            │  exige/orienta           │  institui/alinha
            └──────────┬──────────────┘
                       ▼
NÍVEL 2 — Planejamento Estratégico
  ┌──────────────────────────┐  ───── aprova/acompanha ───── ┌──────────────┐
  │        PDTI              │                               │  CIG-TIC/SI  │
  │  (Plano Diretor TI)      │                               │  (Comitê)    │
  └──────────┬───────────────┘                               └──────────────┘
             │  estrutura/vincula
             ▼
  ┌──────────────────────────┐
  │         PSI              │
  │ (Política de Segurança)  │
  └──────────┬───────────────┘
             │  desdobra/complementa
             ▼
NÍVEL 3 — Tático
  ┌──────────────────────────┐
  │     INs do DTIC          │
  │ (7 normativas internas)  │
  └──────────┬───────────────┘
             │  operacionaliza
             ▼
NÍVEL 4 — Operacional
  ┌──────────────────────────┐
  │   Manual Operacional     │
  │    (Documento vivo)      │
  └──────┬──────┬──────┬─────┘
         │      │      │
         ▼      ▼      ▼
NÍVEL 5 — Execução (3 boards navegáveis)
  ┌────────┐ ┌──────┐ ┌──────┐
  │ KPIs   │ │ RACI │ │ POPs │
  └────────┘ └──────┘ └──────┘
```

**Narrativa:** "As normativas federais e estaduais exigem um PDTI. O PDTI gera a PSI. A PSI se desdobra em INs. As INs operacionalizam no Manual. O Manual é monitorado por KPIs, define responsabilidades (RACI) e é executado via POPs."

---

## 2. Por Que Cada Componente Existe e Sua Posição

| Componente | Posição | Razão de Existir |
|-----------|---------|-----------------|
| **Header com Logo RS** | Top fixo | Identidade institucional. Clique volta ao Board 0. `Versão 2.1` no footer. |
| **Navbar com 4 boards** | Top fixo | Navegação principal. Indicador ativo com borda verde. |
| **Breadcrumb** | Abaixo da nav | Contexto de onde o usuário está. Necessário para TV onde não há cursor. |
| **Board 0 — Grafo** | Página inicial | **Entrada narrativa.** Conta a história antes dos números. Hover ilumina conexões. |
| **Slide-over** | Lateral direita | Detalhes do nó selecionado sem sair do contexto (back-drop + backdrop-blur). |
| **Board 1 — KPIs** | Segundo board | **Centro analítico.** Grid 3 colunas. Semáforo tricolor. Period selector no canto. |
| **Widget "MOVIMENTAÇÃO TOTAL"** | Ao lado do period selector | Contexto volumétrico antes de mergulhar nos KPIs individuais. |
| **Board 2 — RACI** | Terceiro board | **Tabela de responsabilidades.** Sticky header + coluna processo. Badges R/A/C/I com cores distintas. |
| **Board 3 — POPs** | Quarto board | **Procedimentos.** Agrupados por cluster (Service / Transversal / Continuity). Steps como pipeline visual. |
| **Cross-link buttons** | Footer de cada card | Rastreabilidade: "Ver POP", "Ver RACI", "Ver KPI". Scroll automático + highlight 2.5s. |

---

## 3. Decisões de Densidade/Legibilidade para TV

| Decisão | Implementação | Motivo |
|---------|--------------|--------|
| **Font-size mínimo 10px** | `text-[10px]` para labels menores | Legível a 3m em TV 55" |
| **Semáforo tricolor** | Verde/amarelo/vermelho com fundo preenchido | Legível sem óculos em TV |
| **Cards espaçados** | Grid com `gap-6`, padding `p-5` | Evita claustrofobia visual |
| **Scroll minimizado** | Board 0 cabe em viewport 1080p sem scroll | TV não tem scroll natural |
| **Auto-refresh 30s** | `setInterval(fetchData, 30000)` | Tela ligada sem interação |
| **SSE debounce 1.5s** | Limita updates de documentos | Evita flicker em TV |
| **Tipografia Inter** | Google Fonts | Pesos definidos, alta legibilidade |
| **Custom scrollbar** | 8px, cores suaves | Quando necessário, não é intrusivo |

---

## 4. Problemas Encontrados em Iterações

| Problema | Iteração | Solução |
|---------|---------|--------|
| **KPIs mostrando "0%" quando sem dados** | V1 | Retornar `null` + status `"unavailable"` + mensagem contextual |
| **SLA irreal (100%) por falta de referência** | V1 | Implementar SLA Virtual com badge visual "SLA VIRTUAL" + tooltip |
| **Grafo ilegível com muitas conexões** | V1.5 | Hover interativo: não-hovered fica `opacity-40 blur grayscale` |
| **Preview PDF lento** | V2 | PDF worker via CDN (`pdfjs-dist`), loading spinner com texto |
| **Upload sem feedback** | V1.5 | Spinner no botão + text "Enviando..." + reset do input após upload |
| **Cross-link perdido após navegação** | V1.5 | [useHighlightScroll()](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance/App.tsx#47-70) com delay 300ms para garantir DOM render |
| **RACI table overflow em telas menores** | V2 | Sticky first column com shadow `2px_0_5px_-2px` |
| **Tabela RACI com hoveredNode global** | V1 | Isolamento: RACI e POPs usam [useHighlightScroll](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance/App.tsx#47-70) independente |
| **Token GLPI perdido após refresh** | V2 | Extração de token do hash (`#?glpi_token=xxx`) e salvamento em localStorage |

---

## 5. Anti-Padrões a Evitar na Integração com o Hub

> [!CAUTION]
> Estes anti-padrões foram aprendidos dolorosamente durante a construção do spoke.

| Anti-Padrão | Por Que Evitar | Alternativa |
|------------|---------------|-------------|
| **Monólito frontend em arquivo único** | [App.tsx](file://wsl.localhost/NVIDIA-Workbench/home/workbench/code/apps/spokes/governance/App.tsx) com 1546 linhas é impossível de manter. No Hub, nunca permitir >300 linhas/componente. | Componentização real com diretório `components/`, `pages/`, `hooks/` |
| **Dados estáticos em constants.ts** | Qualquer mudança normativa exige redeploy. | Governança nodes, KPIs, RACI e POPs devem vir de API ou CMS |
| **Token via query string** | URL com token aparece no histórico do navegador e em logs de proxy. | Auth via cookie HttpOnly ou header Authorization com refresh token |
| **SQL inline com string concatenation** | `f"...IN ({groups_str})"` é vulnerável a injection (embora mitigado por IDs fixos). | Parameterized queries com bind variables |
| **Sem testes de KPI** | Qualquer mudança na fórmula SQL sem teste esconde regressão silenciosa. | Testes unitários com banco mock ou snapshot testing das queries |
| **Polling de 30s para atualização** | Em escala, N clientes × 7 queries × 30s = carga significativa no MySQL. | Cache server-side com TTL (Redis ou in-memory) + invalidação por SSE |
| **EventSource sem reconnect controlado** | `EventSource` nativo reconecta, mas sem backoff. Em rede instável, pode floodar. | Implementar exponential backoff com max delay |
| **Sem loading skeleton** | Cards passam de vazio para preenchido sem transição. | Skeleton placeholders para cada card na posição final |
