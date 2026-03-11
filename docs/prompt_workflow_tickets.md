# PROMPT — Modelagem do Workflow de Tickets: Status, Ações, Permissões e Transições

> Template: P02 — Planejamento e Roadmap  
> Destino: antigravity  
> Escopo: Módulo de Chamados — modelo operacional de atendimento  
> Regra absoluta: Nenhuma implementação antes do modelo estar validado e documentado.

---

## CONTEXTO

O Hub (`tensor-aurora`) possui um módulo de chamados integrado ao GLPI.
O GLPI já implementa um modelo inspirado em ITIL — o objetivo não é criar um fluxo novo,
mas **adaptar o fluxo GLPI ao Hub**, expondo apenas o que é operacionalmente relevante
para os técnicos e gestores que usam o sistema.

Uma análise prévia identificou que o módulo atual carece de um **modelo operacional formal**:
status e ações estão acoplados, não há definição clara de quem pode fazer o quê em cada fase,
e decisões de design importantes ainda não foram respondidas.

Esta tarefa tem como produto final um **documento de workflow** que servirá de
"constituição" do sistema de atendimento antes de qualquer implementação.

---

## OBJETIVO

Produzir o modelo operacional completo do módulo de chamados, cobrindo:

1. Estados do sistema (status)
2. Transições possíveis entre estados
3. Ações disponíveis por estado
4. Permissões por papel (role)
5. Decisões de design pendentes respondidas
6. Mapeamento de impacto no código existente

---

## FASE 1 — MAPEAMENTO DO ESTADO ATUAL

Antes de propor qualquer modelo, mapeie o que já existe no código.

### 1.1 — Status usados hoje

Buscar em todo o projeto (`.py`, `.ts`, `.tsx`) por:
- Constantes ou enums de status de ticket
- Referências a `status`, `ticket_status`, `glpi_status`
- Valores numéricos de status usados nas queries SQL
- Mapeamentos de status na camada de apresentação (Kanban, listas, badges)

### 1.2 — Ações implementadas hoje

Identificar todas as ações que o usuário pode executar sobre um ticket:
- Botões e handlers no frontend (`.tsx`)
- Endpoints de mutação no backend (`chargers.py`, routers relacionados)
- Funções em `charger_commands.py` ou equivalente para tickets

### 1.3 — Modelo de permissões atual

Como o sistema decide hoje o que cada usuário pode fazer?
- Verificar `ContextGuard`, `requiredRoles`, `requireApp`
- Verificar se há validação de permissão por ação nos endpoints

**Formato de saída da Fase 1:**
```
STATUS EXISTENTES NO CÓDIGO
  [ID numérico GLPI] → [nome no sistema] → [onde é usado]

AÇÕES EXISTENTES
  [nome da ação] → [componente frontend] → [endpoint backend]

PERMISSÕES ATUAIS
  [role] → [o que pode fazer hoje]
```

---

## FASE 2 — MODELO PROPOSTO

Com base no mapeamento da Fase 1 e nas definições abaixo, construa o modelo completo.

### 2.1 — Estados operacionais do Kanban

O Kanban expõe 4 colunas operacionais. Internamente podem existir mais status no GLPI
(planejado, aguardando terceiro, etc.) — o Kanban filtra e agrupa conforme abaixo:

| Coluna Kanban | Status GLPI correspondente | Significado operacional |
|---|---|---|
| **NOVO** | Novo / Não atribuído | Aberto, nenhum técnico assumiu |
| **EM ATENDIMENTO** | Em atendimento / Atribuído | Técnico responsável definido, trabalho em curso |
| **PENDENTE** | Pendente | Atendimento pausado aguardando fator externo |
| **SOLUCIONADO** | Solucionado / Fechado | Problema resolvido |

### 2.2 — Ações por estado

Para cada coluna, defina as ações disponíveis e a ação principal (CTA):

**NOVO**
- Ação principal: `Assumir chamado`
  - Efeito: atribui o ticket ao técnico logado → status muda para EM ATENDIMENTO
- Ações secundárias: Visualizar detalhes | Alterar prioridade

**EM ATENDIMENTO**
- Ação principal: `Adicionar atualização`
- Ações secundárias:
  - Abrir chat com solicitante
  - Adicionar solução
  - Alterar status (→ Pendente | Planejado | Solucionado)
  - Transferir atendimento

**PENDENTE**
- Ação principal: `Retomar atendimento` (→ Em atendimento)
- Ações secundárias:
  - Chat
  - Adicionar solução
  - Alterar status (→ Em atendimento | Solucionado)

**SOLUCIONADO**
- Ações: Visualizar histórico | Comentário final | Reabrir ticket (→ Em atendimento)

### 2.3 — Decisões de design a responder

Para cada questão abaixo, analisar o código existente e propor a resposta adequada
ao contexto institucional do projeto. Se o código já implica uma resposta, identificar.

```
D1: Um ticket pode ter mais de um técnico atribuído simultaneamente?
    → Impacto: modelo de dados, lógica de assign, exibição no Kanban

D2: Quando um técnico assume, ele vira responsável exclusivo?
    → Impacto: guard de duplicata no assign, permissões de ação dos demais

D3: O solicitante pode responder no chat diretamente pelo Hub?
    → Impacto: autenticação do solicitante, interface de followup, notificações

D4: A solução precisa de aprovação antes de fechar ou pode ser finalizada diretamente?
    → Impacto: transição de estado, roles com permissão de fechar

D5: Um ticket solucionado pode ser reaberto automaticamente (ex: por nova mensagem)?
    → Impacto: webhook ou polling, lógica de reabertura, notificação ao técnico

D6: O status "Planejado" aparece no Kanban ou apenas internamente?
    → Impacto: quantidade de colunas, filtros, agrupamento de status

D7: A solução registrada pode alimentar automaticamente a base de conhecimento?
    → Impacto: integração com módulo de Memória Institucional, schema de solução
```

Para cada decisão, entregar:
```
D[n]: [pergunta]
  Estado atual no código: [o que o código implica hoje]
  Recomendação técnica: [proposta baseada no contexto]
  Impacto de implementação: [o que precisaria ser alterado]
```

### 2.4 — Modelo de permissões por role

Construir a matriz completa:

| Ação | solicitante | tecnico | gestor |
|---|---|---|---|
| Visualizar ticket | ✓ próprios | ✓ todos | ✓ todos |
| Assumir chamado | — | ✓ | ✓ |
| Adicionar mensagem | ✓ | ✓ | ✓ |
| Adicionar solução | — | ✓ | ✓ |
| Alterar status | — | ✓ limitado | ✓ todos |
| Transferir atendimento | — | ✓ | ✓ |
| Reabrir ticket | ✓ | ✓ | ✓ |
| Fechar ticket | — | ✓ | ✓ |

Verificar se essa matriz é compatível com os roles definidos em `contexts.yaml` do projeto.
Ajustar onde houver divergência.

---

## FASE 3 — DOCUMENTO FINAL DE WORKFLOW

Consolidar tudo em um único documento estruturado com:

```
WORKFLOW DE TICKETS — hub_dtic_and_sis
Versão: 1.0 | Data: [data]

1. ESTADOS
   [tabela: estado | significado | status GLPI correspondente]

2. DIAGRAMA DE TRANSIÇÕES
   NOVO → (assumir) → EM ATENDIMENTO
   EM ATENDIMENTO → (pausar) → PENDENTE
   EM ATENDIMENTO → (solucionar) → SOLUCIONADO
   PENDENTE → (retomar) → EM ATENDIMENTO
   PENDENTE → (solucionar) → SOLUCIONADO
   SOLUCIONADO → (reabrir) → EM ATENDIMENTO

3. AÇÕES POR ESTADO
   [tabela por estado: ação | quem pode | efeito | endpoint]

4. DECISÕES DE DESIGN
   [D1 a D7 respondidas]

5. MATRIZ DE PERMISSÕES
   [tabela role × ação]

6. IMPACTO NO CÓDIGO
   [lista de arquivos que precisam ser alterados para implementar este modelo]
```

---

## FASE 4 — ROADMAP DE IMPLEMENTAÇÃO

Com o modelo validado, propor as fases de implementação em ordem de prioridade e dependência:

```
FASE A — Fundação (sem isso nada funciona)
  - [ ] item

FASE B — Operação básica (fluxo mínimo viável)
  - [ ] item

FASE C — Qualidade e UX
  - [ ] item

FASE D — Inteligência (features avançadas)
  - [ ] item: solução → base de conhecimento
```

---

## CRITÉRIOS

- O documento final deve ser autocontido: qualquer dev do time deve implementar
  o modelo sem precisar de contexto adicional
- Nenhuma decisão de design pode ser deixada em aberto — todas as 7 devem ser respondidas
- O impacto no código deve listar arquivos específicos, não áreas genéricas
- O roadmap deve respeitar dependências — itens da Fase A não podem depender da Fase B

---

## NOTA SOBRE MEMÓRIA INSTITUCIONAL

A decisão D7 (solução → base de conhecimento) é estratégica.
Se aprovada, cada ticket solucionado pode gerar automaticamente um registro do tipo
SOLUTION na Knowledge Base do projeto. Isso transforma o histórico de atendimento em
aprendizado institucional acumulado.
Avaliar viabilidade técnica e propor o contrato de dados entre o módulo de chamados
e o módulo de Memória Institucional.

---

*Gerado via PROMPT_LIBRARY — P02 Planejamento | hub_dtic_and_sis | 2026-03-10*
