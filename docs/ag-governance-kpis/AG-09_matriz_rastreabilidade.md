# AG-09 — Matriz de Rastreabilidade (AG-01..AG-07)

## Critério

- **Forte**: claim no pacote AG + evidência convergente em fonte interna fora do pacote.
- **Moderada**: claim no pacote AG + evidência indireta/parcial fora do pacote.
- **Fraca**: claim só encontrado no próprio pacote AG ou em referência externa não acessível no workspace atual.

## Matriz

| ID | Claim (resumo) | Local no pacote AG | Evidência correlata fora do pacote | Nível | Observação |
|---|---|---|---|---|---|
| T01 | Arquitetura adotada como `spoke` (`spokes/governance`) | `AG-01:L12-L17` | `brain/3d3f.../consolidacao_definitiva.md:L90` (`governance-dtic` em `spokes/governance`) | **Forte** | Corrobora existência do spoke no landscape de deploy. |
| T02 | Governança precisava de decomposição por monólito grande | `AG-01:L118`; `AG-05:L108` | `brain/3d3f.../consolidacao_definitiva.md:L106`, `L316` (`App.tsx` 72KB) | **Forte** | Corroboração textual direta. |
| T03 | Estratégia de dados via GLPI/MySQL com agregações | `AG-01:L22`; `AG-04` (catálogo KPI) | `brain/13d77.../implementation_plan.md:L3-L10`, `L17-L23` | **Forte** | Plano externo confirma SQL direto e motivos de performance. |
| T04 | CDC/SSE por polling para atualização quase real-time | `AG-01:L55-L60`; `AG-02:L82-L87` | `brain/13d77.../ouvinte_analysis.md:L6-L15` | **Forte** | Corrobora modelo polling + SSE e endpoint de stream. |
| T05 | Contexto executivo CIG-TIC/SI e pressão normativa | `AG-01:L6-L8`, `L74` | Sem fonte textual externa inequívoca localizada | **Fraca** | Depende de histórico conversacional e/ou docs não localizados. |
| T06 | SLA Virtual Fallback por prioridade (8/16/24/40h) | `AG-01:L33`; `AG-03:L71` | Sem fonte externa inequívoca localizada | **Fraca** | Provável origem em conversa/prompt; requer extração de transcript. |
| T07 | Cross-linking KPI↔RACI↔POP com `useHighlightScroll` | `AG-01:L46-L51`; `AG-05:L94-L96` | Sem validação local do arquivo alvo `file://.../spokes/governance/App.tsx` | **Fraca** | Links apontam para ambiente externo (`NVIDIA-Workbench`). |
| T08 | Gestão documental com upload/preview multi-formato | `AG-01:L64-L67`; `AG-02` seção de componentes | Sem evidência externa independente consolidada | **Moderada** | Aparece de forma consistente no pacote, mas sem confirmação adicional local. |
| T09 | Seletor de período com 6 opções (Mês, YTD, etc.) | `AG-01:L71-L74`; `AG-03:L24` | Sem fonte externa inequívoca localizada | **Fraca** | Requer transcript conversacional ou snapshot de código referenciado. |
| T10 | Extração do backend legado e convivência com rollback | `AG-01:L78-L82`; `AG-06` (fases de integração) | `brain/3d3f.../consolidacao_definitiva.md:L85-L90` (mapa de portas) | **Moderada** | Corrobora parte da topologia, não todos os detalhes de rollback. |
| T11 | Planejamento de integração em fases com migração de governança | `AG-06` (Fases 0-3) | `brain/3d3f.../consolidacao_definitiva.md:L307-L317` | **Forte** | Estruturas de fase convergentes. |
| T12 | Regra de acesso do Governance KPI para perfis DTIC elevados | `AG-03` (diretrizes de escopo/acesso) | `brain/4b713.../dtic_permission_matrix.md:L39-L40` | **Moderada** | Matriz permissional externa confirma intenção de restrição. |
| T13 | Dependência de links de código externos `file://wsl.localhost/NVIDIA-Workbench/...` | `AG-01:L42,L51,L81,L102,L118,L120`; `AG-02` múltiplas linhas; `AG-04`, `AG-05`, `AG-06` | Arquivos alvo não estão no workspace atual | **Fraca** | Rastreio existe, validação técnica local não. |

## Síntese

1. Núcleo arquitetural (spoke, monólito, SSE/polling, integração em fases) tem boa sustentação em fontes externas ao pacote AG.
2. Requisitos executivos, thresholds exatos e detalhes finos de UX/compliance ainda dependem de histórico conversacional e de referências `file://` fora do workspace.
3. Para elevar a rastreabilidade a nível “forense”, é necessário converter `conversations/*.pb` em transcript textual e anexar snapshot dos arquivos citados nos links externos.
