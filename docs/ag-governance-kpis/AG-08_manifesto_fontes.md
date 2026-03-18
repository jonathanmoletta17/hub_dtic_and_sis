# AG-08 — Manifesto de Fontes e Proveniência

Data da auditoria: 2026-03-17 (America/Sao_Paulo)

## 1) Escopo auditado

Este manifesto valida a origem do pacote `AG-01..AG-07` e identifica fontes internas adicionais no Antigravity que são potencialmente base da construção.

Raízes auditadas:

- `docs/ag-governance-kpis`
- `C:\Users\jonathan-moletta\.gemini\antigravity\brain`
- `C:\Users\jonathan-moletta\.gemini\antigravity\conversations`
- `C:\Users\jonathan-moletta\.gemini\antigravity\knowledge`
- `C:\Users\jonathan-moletta\.gemini\antigravity\prompting`
- `C:\Users\jonathan-moletta\.gemini\antigravity\context_state`

## 2) Proveniência do pacote AG-01..AG-07

Resultado objetivo: os arquivos em `docs/ag-governance-kpis` são cópias exatas da variante `.resolved` do workspace interno `brain\12526e77-a636-445b-8c58-43042c1ce7e6`.

| Arquivo | docs len | brain `.md` len | brain `.resolved` len | docs == `.resolved` | docs == `.md` | Hash docs (16) | Hash `.md` (16) | Hash `.resolved` (16) |
|---|---:|---:|---:|:---:|:---:|---|---|---|
| AG-01_reconstrucao_historica.md | 8373 | 7784 | 8373 | ✅ | ❌ | `0CA4856D16E1B8A3` | `B63C42EBB994AF01` | `0CA4856D16E1B8A3` |
| AG-02_arquitetura_funcional_tecnica.md | 10465 | 9051 | 10465 | ✅ | ❌ | `49ECEB363355B49F` | `97985DB787D51345` | `49ECEB363355B49F` |
| AG-03_requisitos_negocio.md | 6196 | 5971 | 6196 | ✅ | ❌ | `A127006C1B497106` | `2ABFC0F2AF21CFB5` | `A127006C1B497106` |
| AG-04_governanca_dados_kpis.md | 9617 | 8961 | 9617 | ✅ | ❌ | `B67F6980BB076AB4` | `A84EA3640ABE509E` | `B67F6980BB076AB4` |
| AG-05_ux_narrativa_visual.md | 8203 | 7921 | 8203 | ✅ | ❌ | `AE012A884C1F95B3` | `0C6F24CB3041AF66` | `AE012A884C1F95B3` |
| AG-06_plano_integracao_hub.md | 7094 | 6911 | 7094 | ✅ | ❌ | `45B9AC818BEB3830` | `0F070B400A385E9D` | `45B9AC818BEB3830` |
| AG-07_checklist_validacao_executiva.md | 7208 | 7208 | 7208 | ✅ | ✅ | `628D0C3C10CE426D` | `628D0C3C10CE426D` | `628D0C3C10CE426D` |

Leitura: houve pós-processamento entre `brain/*.md` e `brain/*.md.resolved` em 6 de 7 artefatos.

## 3) Fontes internas adicionais relevantes (fora do pacote AG)

| Fonte | Evidência observada | Status no pacote AG |
|---|---|---|
| `C:\Users\jonathan-moletta\.gemini\antigravity\brain\3d3fba83-8119-4e5a-95a1-d798652f428c\consolidacao_definitiva.md` | `spokes/governance` na malha Docker (`L90`), migração de `App.tsx` 72KB (`L316`) | Parcialmente refletida (AG-01/AG-05/AG-06) |
| `C:\Users\jonathan-moletta\.gemini\antigravity\brain\4b713a2b-7897-4003-9907-d73186fc3216\dtic_permission_matrix.md` | seção explícita “Governance KPI / Dashboard Analítico Exclusivo” (`L39-L40`) | Parcialmente refletida |
| `C:\Users\jonathan-moletta\.gemini\antigravity\brain\19b260d0-5fbd-4106-86cb-e414c046545d\implementation_plan.md` | grupo `Hub-App-dtic-kpi` e lacunas de feature mapping (`L47-L58`) | Não explicitada em AG-01..AG-07 |
| `C:\Users\jonathan-moletta\.gemini\antigravity\brain\13d77e51-a5fe-4c9f-97a9-5f39611f0785\implementation_plan.md` | migração para MySQL direto + SSE (`L3-L10`, `L17-L31`) | Parcialmente refletida |
| `C:\Users\jonathan-moletta\.gemini\antigravity\brain\13d77e51-a5fe-4c9f-97a9-5f39611f0785\ouvinte_analysis.md` | CDC via polling + SSE endpoint (`L6-L15`) | Parcialmente refletida |
| `C:\Users\jonathan-moletta\.gemini\antigravity\brain\4d2e5999-25ce-46d6-afed-983f5797addb\governance_plan.md` | plano de governança IaC/TAG do ecossistema GLPI (`L1-L23`) | Relevância indireta |
| `C:\Users\jonathan-moletta\.gemini\antigravity\brain\4b097f9a-285e-4484-beec-affd196778e2\governance-handbook.md` | handbook metodológico genérico (`L1-L39`) | Baixa relevância para KPI Governance |

## 4) Cobertura de diretórios internos Antigravity

| Diretório | Arquivos |
|---|---:|
| `conversations` | 100 |
| `brain` | 13665 |
| `context_state` | 0 |
| `knowledge` | 1 |
| `prompting` | 2 |

## 5) Conclusão objetiva

1. A base imediata do pacote AG-01..AG-07 existe e foi localizada com rastreabilidade de hash.
2. O pacote foi produzido a partir das versões `.resolved`, não das versões `.md` brutas, em 6/7 artefatos.
3. Existem fontes internas adicionais que sustentam partes relevantes da narrativa, mas não foram explicitamente citadas em AG-01..AG-07.
4. A validação completa de origem ainda depende da decodificação/export textual das conversas em `conversations/*.pb` (ver AG-10).
