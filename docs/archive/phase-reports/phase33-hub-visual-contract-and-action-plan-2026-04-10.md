# Phase 33 - Hub Visual Contract And Action Plan - 2026-04-10

## Objetivo

Fechar o contrato visual do hub antes de novas mudancas de UI, usando como base:

- a revisao visual do hub em `phase32`
- a estrategia de dark/light ja validada nos buscadores
- a disciplina de light mode documentada no dashboard DTIC

Este documento define:

- o que o produto deve parecer
- como os temas devem se comportar
- o que deve mudar primeiro
- o que nao deve mais acontecer

## Fontes revisadas

### Hub

- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase32-hub-frontend-screen-review-2026-04-09.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx`

### Referencia dos buscadores

- `C:\Users\jonathan-moletta\code\buscador-dtic\src\app\globals.css`
- `C:\Users\jonathan-moletta\code\buscador-dtic\src\components\ui\theme-toggle.tsx`

### Referencia metodologica do dashboard

- `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\docs\07-modo-claro-e-estrategia.md`

## Diagnostico consolidado

## 1. O hub tem tema, mas ainda nao tem contrato visual fechado

Hoje existe:

- tokenizacao de tema
- toggle funcional
- superficies principais adaptadas

Mas ainda nao existe acordo formal sobre:

- identidade do sidebar no modo claro
- contraste minimo aceitavel para superficies operacionais
- diferenca entre tela institucional e tela operacional
- hierarquia oficial do chat `DTIC/new-ticket`

## 2. O sidebar igual nos dois temas nao e bug; e decisao atual de implementacao

Em `globals.css`, o `--bg-sidebar` e escuro em ambos os temas:

- light: `#1e2330`
- dark: `#12151e`

Isso explica por que o menu lateral "segue da mesma cor".

Arquivos que provam isso:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx`

Conclusao:

- se quisermos um light mode coerente, essa decisao precisa mudar
- manter o sidebar sempre escuro pode funcionar em buscador/dash experimental, mas no hub ele esta ampliando a sensacao de produto montado por pecas

## 3. Os buscadores trazem a abordagem correta de tema

O que os buscadores provaram:

- `data-theme` como fonte de verdade
- light e dark como dois sistemas completos
- sem inversao bruta de cor
- sem reescrever anatomia da UI inteira

O que devemos reaproveitar:

- estrategia de tokens semanticos
- tema controlado por `data-theme`
- coexistencia limpa entre dark e light

O que nao devemos copiar literalmente:

- atmosfera mais "ferramenta isolada"
- tokens pensados para buscador, nao para shell corporativo multi-superficie

## 4. O dashboard documenta a regra metodologica correta

A regra central do documento `07-modo-claro-e-estrategia.md` continua valida para o hub:

- o modo claro nao pode nascer como inversao do escuro
- o dark atual precisa ser baseline protegido
- o rollout deve acontecer por camada interna e por painel

Esse principio deve ser mantido no hub.

## Contrato visual do hub

## 1. Identidade do produto

O hub deve parecer:

- um produto institucional-operacional
- um cockpit de atendimento interno
- um sistema de trabalho continuo entre login, selector, dashboard, chamados, chat e detalhe

O hub nao deve parecer:

- portal burocratico
- landing page governamental
- dashboard SaaS genérico
- experimento visual em transicao

## 2. Regra de composicao por familia de tela

### Auth

Inclui:

- login
- selector

Caracter:

- institucional
- centrado
- atmosferico
- mais cenografico que o resto do produto

### Shell operacional

Inclui:

- sidebar
- topbar mobile
- moldura das rotas protegidas

Caracter:

- estavel
- repetivel
- discreto
- sem competir com o conteudo

### Superficies operacionais

Inclui:

- dashboard
- meus chamados
- detalhe do ticket

Caracter:

- alto contraste
- densidade controlada
- leitura rapida
- prioridade para conteudo e status

### Superficie conversacional

Inclui:

- `DTIC/new-ticket`

Caracter:

- premium
- clara
- focada
- sem vazios mortos
- com sensacao de atendimento real

### Portal

Inclui:

- `portal`
- `portal/meus-chamados`

Caracter:

- entrada institucional simplificada
- menos tecnico que o hub interno
- sem falar de bastidor de integracao

## 3. Decisao formal para o sidebar

### Decisao

O sidebar **nao deve permanecer escuro no modo claro**.

### Comportamento correto

#### Dark mode

- sidebar escuro institucional
- tom mais profundo que o workspace
- contraste alto para navegacao
- identidade forte

#### Light mode

- sidebar claro elevado, em `slate` frio ou branco acinzentado
- diferente do canvas principal por borda e elevacao, nao por bloco escuro
- textos escuros
- item ativo com acento de contexto
- chancela institucional preservada por brasao, tipografia e microdetalhe, nao por massa escura

### Justificativa

- o sidebar fixo escuro quebra a unidade do tema claro
- ele deixa auth/selector e telas internas com linguagens diferentes demais
- ele concentra peso visual demais no trilho e esvazia o conteudo principal

## 4. Regra de contraste

### Light mode

- texto primario: forte e escuro
- texto secundario: legivel sem precisar aproximar
- metadados: discretos, mas nao lavados
- badges e chips: distinguir por cor e por contraste de fundo

### Dark mode

- manter o baseline atual como referencia protegida
- qualquer ajuste no dark precisa provar que nao degradou leitura

## 5. Regra de copy

### Permitido

- linguagem operacional direta
- verbos de acao
- nomes reais de servico e tela

### Proibido

- texto de memorial tecnico
- linguagem de arquitetura interna
- explicacao de stack, dependencias, handoff, fluxo validado, candidato, base de integracao

## 6. Regra de estados vazios e erro

- vazio deve orientar, nao parecer tela quebrada
- erro deve ser claro e resolvivel
- erro tecnico de sessao/contexto nao pode aparecer como estado normal de produto final

## Plano de execucao

## Frente A - Foundations e tema

### Objetivo

Fechar o contrato de tema sem alterar fluxo.

### Acoes

1. Separar tokens de sidebar por tema
2. Introduzir `sidebar-light` e `sidebar-dark`
3. Revisar `theme-shell-button`, `theme-sidebar-button` e estados de foco
4. Eliminar residuos de `white/black` hardcoded nas superficies canonicas

### Arquivos-alvo

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\theme-toggle.tsx`

### Aceite

- sidebar muda visualmente entre light e dark
- foco visivel consistente
- shell fica unificado com o tema selecionado

## Frente B - Shell e navegacao

### Objetivo

Fazer o trilho principal parecer parte do mesmo produto do login e do selector.

### Acoes

1. Revisar proporcao visual do sidebar
2. Reequilibrar pesos de logo, subtitulo, nav item e perfil
3. Rever estados ativo, hover e collapse
4. Garantir que mobile shell siga a mesma linguagem

### Arquivos-alvo

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\AppSidebar.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\UserProfileMenu.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\OperationalShell.tsx`

### Aceite

- sidebar deixa de parecer bloco separado do resto
- navegacao tem leitura clara em ambos os temas

## Frente C - Dashboard e Meus Chamados

### Objetivo

Recuperar contraste e leitura operacional no modo claro.

### Acoes

1. Subir contraste de subtitulos, ids, contadores e previews
2. Rever opacidades em `ticket-card` e `kanban-column`
3. Reduzir sensacao de tela lavada
4. Ajustar estados de filtro e busca

### Arquivos-alvo

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\dashboard\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\user\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\ticket-card.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\kanban-column.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\status-badge.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\category-badge.tsx`

### Aceite

- leitura rapida a distancia em light mode
- cards deixam de parecer desbotados

## Frente D - Chat DTIC

### Objetivo

Transformar `DTIC/new-ticket` em superficie premium e clara.

### Acoes

1. Redesenhar o estado inicial para remover vazio morto
2. Integrar melhor primeira mensagem, header e composer
3. Reduzir excesso de pills pequenas no topo
4. Fazer o draft lateral aparecer apenas quando realmente agregar valor
5. Reescrever microcopy do chat com base em linguagem operacional real

### Arquivos-alvo

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\new-ticket\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx`

### Aceite

- a tela parece atendimento pronto, nao scaffold
- o estado inicial tem densidade suficiente
- o composer parece parte do chat, nao rodape solto

## Frente E - Portal

### Objetivo

Reposicionar o portal como produto final, nao memorial tecnico.

### Acoes

1. Remover copy de bastidor e dependencias internas
2. Reescrever hero e secoes para linguagem de servico
3. Tratar `portal/meus-chamados` com fluxo de sessao robusto
4. Melhorar empty/error states

### Arquivos-alvo

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\portal\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\portal\meus-chamados\page.tsx`

### Aceite

- portal fala linguagem de usuario final
- estados de erro nao parecem bug interno

## Frente F - Guarda visual canonica

### Objetivo

Parar de validar frontend apenas por percepcao tardia em runtime.

### Acoes

1. Introduzir Storybook no `web`
2. Criar stories das superficies canonicas:
   - sidebar
   - dashboard cards
   - listagem de chamados
   - chat DTIC
   - portal cards
3. Adicionar baseline visual local com Playwright
4. Versionar screenshots de referencia das superficies mais sensiveis

### Arquivos/areas

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\package.json`
- `.storybook/*`
- stories por componente
- config visual local

### Aceite

- toda mudanca visual relevante passa a ter story
- tela nao volta a degradar sem ser percebida

## Ordem obrigatoria

1. Frente A
2. Frente B
3. Frente C
4. Frente D
5. Frente E
6. Frente F

## O que nao fazer

- nao mexer primeiro em dezenas de telas isoladas
- nao continuar com sidebar igual nos dois temas
- nao tratar o problema como apenas CSS
- nao redesenhar sem antes fechar o contrato visual do shell
- nao confiar em `lint` e `build` como validacao visual suficiente

## Resultado esperado

Ao final dessas frentes, o hub deve passar a ter:

- modo claro e escuro realmente distintos e coerentes
- shell corporativo unificado
- superficies operacionais legiveis
- chat DTIC com qualidade de produto principal
- portal com linguagem de servico
- guarda visual para evitar regressao
