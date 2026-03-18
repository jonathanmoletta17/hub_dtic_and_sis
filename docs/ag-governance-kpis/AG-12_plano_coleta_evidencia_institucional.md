# AG-12 — Plano de Coleta de Evidência Institucional (Claims SE)

Data de emissão: 2026-03-18 (America/Sao_Paulo)

## 1) Objetivo

Fechar a lacuna de compliance narrativo para os claims SE, sem interromper a trilha técnica de integração no Hub.

## 2) Escopo do plano

Este plano cobre apenas evidências **não-técnicas**:

1. Motivação/diretriz executiva associada ao Governance KPI.
2. Registro formal de decisão (ata, ofício, e-mail institucional, despacho).
3. Encerramento formal de itens não evidenciáveis por código.

Não cobre refatoração, API, SQL, frontend ou deploy.

## 3) Claims-alvo e evidência aceitável

| ID | Claim SE (resumo) | Evidência primária aceitável | Responsável primário | Prioridade |
|---|---|---|---|---|
| SE-01 | Diretriz executiva vinculada ao CIG-TIC/SI para o dashboard | Ata de reunião, ofício ou e-mail institucional com decisão explícita | Secretaria do CIG-TIC/SI | Alta |
| SE-02 | Motivação executiva para foco em KPI/governança na forma implementada | Despacho do diretor, memorando técnico ou e-mail de diretriz | Gabinete da Diretoria DTIC | Alta |
| SE-03 | Preferência executiva de formato de apresentação/uso (painel executivo) | Registro formal de requisito (ata, solicitação oficial, termo de referência) | Diretoria DTIC + PMO/coordenação do Hub | Média |

## 4) Cronograma e SLAs

| Marco | Data limite | Entregável | Dono |
|---|---|---|---|
| M1 — Disparo das solicitações formais | 2026-03-19 | 3 solicitações emitidas com protocolo | Coordenação técnica do Hub |
| M2 — Primeiro retorno institucional | 2026-03-23 | Recebimento de resposta ou confirmação de tramitação | Cada área demandada |
| M3 — Consolidação de evidências | 2026-03-25 | Dossiê único com anexos e índice | PMO/coordenação do Hub |
| M4 — Decisão de fechamento | 2026-03-26 | Fechado por evidência ou fechado por limitação estrutural documentada | Governança do programa |

## 5) Fluxo operacional

1. Emitir solicitação formal por canal institucional (e-mail funcional ou SEI/protocolo equivalente).
2. Registrar número de protocolo e data/hora no dossiê.
3. Anexar documento original (PDF/MSG/ata assinada) sem edição.
4. Relacionar cada anexo a um claim específico (SE-01/02/03).
5. Validar autenticidade mínima (origem, data, assinatura/responsável).
6. Publicar parecer de fechamento: “evidenciado” ou “não evidenciável”.

## 6) Regras de aceite

Um claim SE é considerado **fechado por evidência** quando:

1. Existe documento institucional com autoria identificável.
2. O texto contém decisão/diretriz explícita relacionada ao claim.
3. O documento está anexado e indexado no dossiê.

Um claim SE é considerado **fechado por limitação estrutural** quando:

1. Houve solicitação formal com rastreabilidade de protocolo.
2. Não houve retorno até a data limite, ou não existe registro histórico recuperável.
3. A ausência foi formalmente registrada e aprovada pela governança do programa.

## 7) Estrutura de armazenamento recomendada

Criar diretório:

`docs/ag-governance-kpis/evidencias-institucionais/`

Padrão de arquivo:

`EVID-<ID>-<YYYYMMDD>-<origem>.pdf`

Índice mestre:

`docs/ag-governance-kpis/evidencias-institucionais/INDEX.md`

Campos mínimos do índice:

1. `evidencia_id`
2. `claim_id`
3. `origem`
4. `data_documento`
5. `protocolo`
6. `status_validacao`
7. `link_arquivo`

## 8) Resultado esperado

1. Engenharia segue sem bloqueio (GO técnico mantido).
2. Compliance narrativo fica fechado com prova documental ou limitação formalmente aceita.
3. Cadeia de decisão fica auditável para futuras revisões internas/externas.
