# Phase 22 - Hub native agent chat plan - 2026-04-09

## Objetivo

Substituir a tela atual de `DTIC/new-ticket` por uma experiencia de chat nativa do hub, limpa, sofisticada e coerente com o shell operacional ja existente, sem mover a logica de negocio do Hermes para dentro deste repositorio.

## Diagnostico do estado atual

Hoje a entrada `DTIC/new-ticket` e um fluxo de transicao. O usuario nao conversa com o agente; ele preenche um montador de handoff e depois abre outra interface.

Arquivos que sustentam esse estado:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\new-ticket\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\DticAgentEntry.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\dtic-agent-flow.ts`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\streamlit_app.py`

Problemas observados:

- o usuario precisa classificar manualmente agente, urgencia, escopo e superficie antes de iniciar
- a mesma informacao reaparece em varias caixas: triagem, handoff, texto pronto, checklist e CTA
- o CTA principal abre um runtime externo em popup
- o Hermes repete contexto, handoff e confirmacao em outra interface
- a linguagem atual ainda carrega muito bastidor tecnico para a superficie final

Conclusao:

- a tela atual funciona como prova de integracao
- ela nao e a UX final desejada para abertura de chamados

## Principios de produto

O novo fluxo deve obedecer estes principios:

- `um caminho principal`: clicar em `Abrir chamado` e entrar direto na conversa
- `uma interface`: o usuario permanece no hub do inicio ao fim
- `uma conversa`: o chat e a superficie principal, nao um painel secundario
- `uma confirmacao clara`: o draft aparece como etapa natural da conversa
- `zero ruído operacional`: sem `payload`, `handoff`, `texto para transferencia` ou checklist tecnico na primeira camada
- `coerencia de shell`: o chat deve parecer parte do hub, nao widget externo ou tela de laboratorio

## Direcao arquitetural recomendada

### Decisao principal

Construir um chat nativo React no hub e transformar o Hermes em backend conversacional acessado por API.

### O que NAO fazer como solucao final

- nao manter popup para `http://localhost:8501`
- nao usar `iframe` como destino final
- nao continuar exigindo pre-triagem manual por agente/urgencia/superficie
- nao mover a logica do Hermes para dentro do hub

### O que pode existir como fase intermediaria

`iframe` ou view embed compacta do Hermes pode servir como prototipo rapido, mas nao deve ser o estado alvo porque:

- dificulta padronizacao visual
- limita testes e observabilidade
- mantem acoplamento com Streamlit como interface do usuario final
- enfraquece a experiencia de produto do hub

## Estado alvo da UX

### Estrutura da pagina

A rota continua em `DTIC/new-ticket`, mas o conteudo muda para uma pagina de conversa.

Composicao recomendada:

- `AgentChatPage`
- `AgentConversationPane`
- `AgentMessageList`
- `AgentComposer`
- `AgentDraftReviewCard`
- `AgentContextBar`
- `AgentStatusRail`

### Layout alvo

Coluna principal:

- mensagens do usuario e do agente
- feedback de processamento
- composer fixo no rodape

Coluna lateral secundaria:

- contexto resumido do atendimento
- status da sessao
- card de confirmacao do draft quando existir

Em mobile:

- a lateral vira drawer ou sheet
- o composer fica sempre acessivel

### Fluxo alvo

1. usuario entra em `DTIC/new-ticket`
2. o chat ja abre pronto para a primeira mensagem
3. o agente responde, pede clarificacao ou gera draft
4. quando o draft estiver pronto, surge um card de confirmacao no proprio hub
5. usuario confirma criacao
6. ticket e criado e o hub oferece navegar para detalhe ou acompanhar

## Direcao visual

## Base visual existente

O hub ja tem base suficiente para uma interface premium:

- shell operacional em `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx`
- sidebar e hierarquia do produto em `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx`
- tokens globais em `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css`
- temas por contexto em `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\config\themes.json`

## Regras visuais recomendadas

- manter o gradiente/aurora do contexto DTIC como pano de fundo
- usar paineis escuros elevados, com contraste alto e borda sutil
- reduzir texto institucional ao minimo
- valorizar tipografia, espacamento e estados de sistema
- tratar a conversa como `workspace`, nao como formulario
- usar animacao sutil de entrada e transicao para mensagens, draft e estados
- evitar cara de chatbot genérico de suporte

## Linguagem da interface

Trocar a copy atual para algo mais direto:

- titulo da pagina: `Abrir chamado com agente`
- subtitulo: `Descreva o problema ou pedido. O agente organiza, confirma e abre o chamado.`
- placeholder do composer: `Escreva o que esta acontecendo`
- estados:
  - `Ouvindo`
  - `Organizando o atendimento`
  - `Preciso confirmar alguns detalhes`
  - `Chamado pronto para confirmacao`

## Contrato tecnico recomendado com o Hermes

Hoje o Hermes expoe:

- UI Streamlit
- servico Python interno em `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\service.py`

O passo necessario para o chat nativo e introduzir uma API HTTP minima no Hermes.

### Endpoints sugeridos

- `POST /api/chat/session`
  - inicia sessao
  - recebe contexto do hub, identidade e handoff inicial opcional
  - retorna `session_id` e estado inicial

- `POST /api/chat/message`
  - recebe `session_id` e mensagem do usuario
  - retorna mensagens do agente, estado da sessao, draft parcial ou pedido de clarificacao

- `GET /api/chat/session/{id}`
  - devolve historico e estado atual

- `POST /api/chat/session/{id}/confirm`
  - confirma criacao do ticket
  - retorna `ticket_id`

- `POST /api/chat/session/{id}/discard`
  - descarta draft

### Payload minimo do hub para iniciar sessao

- `context: dtic`
- `source: hub-operacional-web`
- `user_context`
  - `name`
  - `email`
  - `department`
  - `requester_id`
  - `entity_id`
- `initial_handoff`
  - opcional
  - pode carregar texto inicial ou contexto silencioso

### Regras de ownership

- o Hermes continua dono da logica de classificacao, clarificacao, draft e submit
- o hub continua dono da experiencia visual, navegacao, contexto de produto e autenticacao local
- o contrato entre os dois deve ser HTTP e tipado

## Requisitos de frontend no hub

### Estado local

Criar um store dedicado para a sessao conversacional, separado do wizard atual:

- `useAgentChatStore`

Estado minimo:

- `sessionId`
- `messages`
- `status`
- `pendingDraft`
- `isSending`
- `isConfirming`
- `error`
- `isHydratedFromRoute`

### Tipos recomendados

- `AgentChatMessage`
- `AgentChatSession`
- `AgentDraftState`
- `AgentSessionStatus`
- `AgentTransportError`

### Camada de servico

Criar cliente dedicado:

- `web/src/lib/api/agentChatService.ts`

Responsabilidades:

- iniciar sessao
- enviar mensagem
- consultar sessao
- confirmar draft
- descartar draft

Esse cliente deve seguir o padrao atual de fetch ja usado no frontend via `resolveApiBase`.

### Estrutura de componentes recomendada

- `web/src/modules/tickets/components/agent-chat/AgentChatPage.tsx`
- `web/src/modules/tickets/components/agent-chat/AgentConversationPane.tsx`
- `web/src/modules/tickets/components/agent-chat/AgentMessageBubble.tsx`
- `web/src/modules/tickets/components/agent-chat/AgentComposer.tsx`
- `web/src/modules/tickets/components/agent-chat/AgentDraftReviewCard.tsx`
- `web/src/modules/tickets/components/agent-chat/AgentContextBar.tsx`
- `web/src/modules/tickets/components/agent-chat/AgentEmptyState.tsx`

## Estrategia de migracao

### Fase A - Descoplamento do fluxo atual

Objetivo:

- parar de tratar `DticAgentEntry` como experiencia final

Acoes:

- manter `DticAgentEntry` apenas como referencia legada temporaria
- preparar a nova rota `DTIC/new-ticket` para renderizar o chat nativo
- remover a copy de transicao da pagina

### Fase B - API do Hermes

Objetivo:

- tornar o Hermes consumivel pelo hub sem Streamlit

Acoes:

- criar camada HTTP minima no Hermes
- preservar o Streamlit como console de laboratorio e suporte
- serializar sessao e draft em memoria de processo na primeira iteracao

### Fase C - Chat nativo no hub

Objetivo:

- entregar a nova UX principal

Acoes:

- construir shell conversacional
- integrar com API do Hermes
- mapear draft e confirmacao no proprio hub
- manter feature flag curta para fallback

### Fase D - Remocao do fluxo de transicao

Objetivo:

- remover a tela montadora de handoff como entrada principal

Acoes:

- substituir completamente `DticAgentEntry`
- reescrever os testes E2E
- manter fallback tecnico apenas para operacao interna, se necessario

## Consideracoes de arquitetura

### Identidade

O hub ja conhece contexto e sessao local. O novo contrato deve enviar identidade para o Hermes logo no inicio, evitando que o usuario final interaja com campos de identidade que hoje vivem na sidebar do Streamlit.

### Conversa e memoria

A memoria da sessao nao pode depender do frontend remontar o prompt inteiro a cada turno. O backend do Hermes deve manter estado conversacional por `session_id`.

### Observabilidade

Cada sessao deve carregar:

- `session_id`
- `context`
- `user_context`
- `llm_status`
- `decision_source`
- `draft_state`
- `ticket_id` quando existir

### Seguranca

- nao expor requester/entity como campos editaveis no hub final
- validar contexto `dtic` no backend do Hermes
- impedir confirmacao sem draft valido

## Testes necessarios

### Unitarios frontend

- render do estado vazio
- envio de mensagem
- clarificacao
- exibicao de draft
- confirmacao e descarte
- erros de transporte

### Unitarios Hermes

- endpoints da API de chat
- sessao e memoria
- draft e confirmacao
- validacao de identidade recebida do hub

### E2E hub

Substituir os testes que hoje esperam popup por fluxo inline:

- entrar em `DTIC/new-ticket`
- enviar mensagem realista
- receber clarificacao ou draft
- confirmar criacao
- validar ticket no hub
- limpar ticket ao final

## Criterios de pronto

O novo chat so deve ser promovido quando cumprir:

- o usuario abre `DTIC/new-ticket` e consegue conversar sem pre-triagem manual
- a pagina parece nativa do hub
- o draft aparece de forma clara e compacta
- a criacao real no GLPI continua verde ponta a ponta
- os testes Playwright do hub continuam verdes
- o fluxo antigo deixa de ser necessario para o uso normal

## Recomendacao final

Implementar o chat nativo do hub como novo produto-alvo do `DTIC/new-ticket`, com Hermes atras de API HTTP dedicada.

Nao recomendo investir em refinamento cosmético do `DticAgentEntry`. O problema principal nao e acabamento; e o modelo de interacao. A tela atual e uma etapa de transicao e deve ser tratada como tal.
