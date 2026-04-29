# Phase 39 - Hub Light Mode Review And Frontend Skill Foundations - 2026-04-10

## Objetivo

Consolidar um estudo canônico do que funcionou e do que falhou na introdução do `light mode` do hub, para duas finalidades:

- corrigir a qualidade visual do próprio hub com base em evidência, não em percepção tardia;
- extrair regras reutilizáveis para uma futura skill compartilhada de frontend que padronize design e layout das aplicações da Casa Civil RS.

Esta fase é **diagnóstico e extração de conhecimento**. Não altera runtime nem componentes.

## Base de evidência

### Runtime e screenshots já gerados

Foram usados os artefatos locais já validados no repositório:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase32-frontend-review-screens\login-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase34-foundations-sidebar-check\selector-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase35-shell-refinement-check\dtic_dashboard-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase35-shell-refinement-check\dtic_user-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase36-dtic-chat-surface-check\dtic_new_ticket-light.png`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase37-portal-review-after\portal-light.png`

### Código revisado

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\globals.css`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\selector\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\dashboard\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\portal\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ui\glass-card.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\TicketSidebar.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\components\ticket\TicketActions.tsx`

### Referências de processo

- `operations-frontend://visual-review-stack`
- `operations-frontend://development-protocol`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase32-hub-frontend-screen-review-2026-04-09.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase38-hub-storybook-visual-guard-2026-04-10.md`

## Leitura executiva

O hub já tem `light mode` funcional. O problema agora não é mais ausência de tema claro.

O problema real é este:

- o tema claro foi estabilizado tecnicamente;
- mas a qualidade visual ainda não está consistente entre as superfícies;
- os piores pontos não são "cor errada" de forma bruta, e sim:
  - contraste insuficiente;
  - excesso de opacidade baixa;
  - sombras pensadas para dark reaproveitadas no light;
  - pouca separação entre canvas, panel e card;
  - textos auxiliares cinza demais;
  - superfície de chat ainda sem densidade de produto.

Isso significa que a futura skill compartilhada não pode ser só uma coleção de cores. Ela precisa codificar regras de superfície, contraste, tipografia, sombra, revisão visual e ordem de validação.

## Achados por superfície

### 1. Login é a melhor referência atual do light mode

Leitura visual:

- mantém hierarquia clara;
- o conteúdo principal continua legível;
- a assinatura visual não colapsa no tema claro.

Conclusão:

- o login deve ser tratado como referência positiva do que preservar;
- a futura skill deve capturar dele o equilíbrio entre identidade, contraste e composição.

### 2. Selector ficou lavado

Evidência de código:

- `selector/page.tsx:182` usa `text-text-2 opacity-80`
- `selector/page.tsx:253` usa `text-text-3 opacity-70`
- `selector/page.tsx:259` usa `text-text-3/40`
- `selector/page.tsx:273` usa `opacity-40`

Leitura visual:

- cards muito próximos do canvas;
- descrições suaves demais;
- footer e microcopy praticamente somem;
- hover ainda usa sombra pesada de dark:
  - `selector/page.tsx:210` aplica `group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]`

Conclusão:

- o selector não está quebrado, mas está subcontrastado;
- a arquitetura de light mode precisa proibir opacidade baixa em microcopy estrutural;
- sombra de destaque precisa ser específica para light, não herdada de dark.

### 3. Dashboard e lista ficaram tecnicamente corretos, mas operativamente fracos

Evidência de código:

- `dashboard/page.tsx:144` usa `text-text-3/80`
- `dashboard/page.tsx:150` usa `text-text-3/70`
- `dashboard/page.tsx:171` usa `text-text-3/75`
- `ticket-card.tsx` e `kanban` ainda dependem da mesma família de `text-text-*` suavizada

Leitura visual:

- o operador consegue usar a tela;
- mas a leitura rápida piorou;
- contadores, labels, indicadores e ícones ficaram cinza demais;
- canvas, blocos e cards ainda estão próximos demais em luminosidade.

Conclusão:

- o problema aqui é de hierarquia operacional, não de theming básico;
- a futura skill precisa distinguir explicitamente:
  - `screen canvas`
  - `section surface`
  - `working panel`
  - `interactive card`
  - `muted support panel`

### 4. Chat DTIC continua sendo a superfície mais sensível

Evidência de código:

- `DticAgentChatEntry.tsx:419` usa `text-text-3/70`
- `DticAgentChatEntry.tsx:426` usa `text-text-2/82`
- `DticAgentChatEntry.tsx:442` usa `shadow-[0_16px_40px_rgba(0,0,0,0.14)]`
- `DticAgentChatEntry.tsx:475` usa `shadow-[0_16px_40px_rgba(0,0,0,0.18)]`
- `DticAgentChatEntry.tsx:483` usa `placeholder:text-text-3/34`
- `DticAgentChatEntry.tsx:487` usa `text-text-3/55`

Leitura visual:

- o layout já é melhor do que nas fases iniciais;
- mas o tema claro ainda deixa a superfície "leve demais";
- intro, chips, texto auxiliar e composer estão suaves demais;
- a sombra do card lateral e do composer foi reaproveitada de uma lógica escura e pesa mal no claro.

Conclusão:

- o chat precisa de uma regra própria de densidade e foco;
- `agent chat` deve virar um arquétipo oficial da futura skill, não uma página montada com as mesmas heurísticas de cards gerais.

### 5. Portal melhorou, mas ainda está abaixo do nível institucional desejado

Evidência de código:

- `portal/page.tsx:127` usa `text-text-3/65`
- `portal/page.tsx:134` usa `text-text-2/72`
- `portal/page.tsx:182` usa `text-text-3/55`
- `portal/page.tsx:186` usa `text-text-2/72`
- `portal/page.tsx:203` usa `text-text-3/55`
- `portal/page.tsx:206` usa `text-text-2/70`

Leitura visual:

- a estrutura é boa;
- o conteúdo principal é compreensível;
- mas os apoios de leitura ainda estão suaves demais;
- o light mode tira força do portal porque praticamente tudo relevante fora do H1 desce para uma faixa cinza muito baixa.

Conclusão:

- o portal já está numa zona de refinamento, não de reconstrução;
- a regra extraída aqui é: superfícies institucionais podem ser mais leves do que as operacionais, mas nunca ao custo de microcopy desaparecer.

### 6. Ticket detail ainda carrega débito de contraste para light mode

Evidência de código:

- `TicketSidebar.tsx:127` usa `text-text-3/60`
- `TicketSidebar.tsx:133` usa `text-text-3/60`
- `TicketSidebar.tsx:143` usa `text-text-2/50`
- `TicketSidebar.tsx:160` usa `text-red-400/80` e `text-amber-400/70`
- `TicketSidebar.tsx:193` usa `text-emerald-500/80`
- `TicketActions.tsx:111` usa `text-amber-500/80`
- `TicketActions.tsx:137` usa `text-emerald-500/80`
- `TicketActions.tsx:150` usa `text-text-3/40`

Leitura:

- mesmo sem screenshot nova nesta fase, o padrão de código já mostra risco alto de texto suave demais;
- o detalhe do ticket ainda mistura tokens semânticos com cores diretas e opacidade parcial.

Conclusão:

- a futura skill precisa proibir status text em `500/80` arbitrário no light mode;
- status precisam nascer de tokens de estado, não de utilitários cromáticos avulsos.

## Causas-raiz consolidadas

### Causa 1. Excesso de opacidade para resolver hierarquia

O tema claro ficou dependente demais de estratégias como:

- `text-text-2/72`
- `text-text-3/55`
- `opacity-40`
- `opacity-70`

Isso funciona melhor no dark do que no light. Em light mode, esse padrão degrada leitura e transmite "lavado".

### Causa 2. Sombras de dark mode reaproveitadas no light

Evidência:

- `globals.css:76-77`
- `glass-card.tsx:21`
- `DticAgentChatEntry.tsx:442`
- `DticAgentChatEntry.tsx:475`

No claro, esse tipo de sombra:

- escurece demais o entorno;
- cria sensação de sujeira visual;
- piora a separação sem resolver hierarquia.

### Causa 3. Pouca escala semântica de superfície

Hoje existem bons tokens de base:

- `globals.css:38-77`

Mas a superfície ainda é pobre em papéis visuais. Falta um contrato mais claro entre:

- `base canvas`
- `page shell`
- `section panel`
- `raised card`
- `support panel`
- `floating composer / modal surface`

Sem isso, muitas telas caem na mesma combinação: branco sobre cinza-claro com texto cinza.

### Causa 4. Light mode foi estabilizado como tema, mas não ainda como linguagem operacional

O trabalho já fez:

- persistência;
- anti-flash;
- cards claros;
- sidebar coerente;
- storybook guard.

Mas ainda não fechou:

- hierarquia operacional em listas, tickets e dashboard;
- densidade conversacional do chat;
- política de contraste por tipo de conteúdo.

## Regras que devem sair desta fase

Essas regras devem entrar tanto nas próximas correções do hub quanto na futura skill compartilhada.

### Regra 1. Light mode não pode depender de opacidade como mecanismo principal de hierarquia

Usar opacidade apenas para detalhe decorativo. Não usar para:

- subtítulo principal de tela;
- descrição de card;
- metadata operacional importante;
- hint de ação;
- placeholder de campo principal de trabalho.

### Regra 2. Toda superfície precisa declarar seu papel visual

Cada bloco deve pertencer explicitamente a uma das famílias:

- `canvas`
- `surface`
- `surface-muted`
- `card`
- `card-interactive`
- `floating`
- `sidebar`

A skill futura deve ensinar isso como contrato, não como preferência.

### Regra 3. Sombras precisam ter política por tema

Dark:

- sombras podem ser profundas, difusas e atmosféricas.

Light:

- sombras devem ser contidas, limpas e de baixa sujeira cromática;
- borda e separação por tom têm mais peso do que sombra.

### Regra 4. Chat é um arquétipo próprio

O atendimento por IA não deve ser tratado como variação de painel genérico.

A skill futura precisa ter um bloco específico para:

- header de atendimento;
- área de conversa;
- estado vazio guiado;
- composer;
- painel lateral de revisão;
- contraste de bolha, hint e ação.

### Regra 5. Texto operacional nunca pode entrar na zona "quase invisível"

No light mode, itens como:

- ids;
- datas;
- contadores;
- labels de status;
- hints de busca;
- copy de apoio de contexto

precisam permanecer legíveis em leitura rápida, não apenas "existentes".

### Regra 6. A guarda visual entra antes da aprovação de UX

O fluxo correto fica:

1. diagnosticar a superfície;
2. modelar story;
3. validar `storybook:test`;
4. validar `storybook:visual`;
5. só depois revisar no app inteiro.

## O que a futura skill frontend deve conter

### 1. Doutrina de tema

- `dark` como baseline protegido;
- `light` como sistema paralelo, não como inversão;
- tokens semânticos obrigatórios;
- superfícies nomeadas por papel.

### 2. Doutrina de contraste

- proibição de `opacity` como solução principal de hierarquia;
- política de texto por prioridade:
  - primário
  - secundário
  - suporte
  - decorativo
- regras separadas para light e dark.

### 3. Doutrina de sombra e borda

- sombra do dark não migra automaticamente para light;
- light depende mais de borda, altitude e separação tonal;
- chat, modal e card elevado têm shadow recipes próprias.

### 4. Arquétipos visuais oficiais

A skill deve ensinar pelo menos estes arquétipos:

- `auth`
- `selector`
- `dashboard`
- `ticket list`
- `ticket detail`
- `agent chat`
- `portal / service entry`

### 5. Workflow obrigatório

- story antes de tela inteira;
- baseline visual antes de aprovação;
- validação no app real por último;
- evidência por screenshot ou Storybook, nunca só por descrição.

### 6. Anti-padrões explícitos

A skill precisa proibir:

- hardcode de sombra pensada para dark em superfície light;
- `text-* /40` ou `/50` em conteúdo operacional relevante;
- `placeholder` quase invisível em campo primário;
- telas inteiras revisadas só por Playwright funcional;
- "modo claro" tratado como redesign geral sem preservar a linguagem existente.

## O que ainda precisa ser feito no hub antes da skill ser consolidada

1. Corrigir a calibração fina de contraste em:
   - selector
   - dashboard
   - user
   - chat DTIC
   - ticket detail
   - portal
2. Rodar essas correções pelo guardião visual recém-implantado em `phase38`.
3. Só então congelar a doutrina em skill compartilhada.

## Conclusão

É totalmente possível consolidar uma skill compartilhada de frontend para padronizar as aplicações da Casa Civil RS.

Mas a skill só será útil se nascer deste aprendizado concreto:

- o modo claro não falha por falta de cores;
- ele falha quando tema, contraste, superfície e revisão visual não estão suficientemente formalizados.

O hub agora já tem base suficiente para fornecer essa doutrina. O próximo passo correto é fazer uma rodada objetiva de correção fina no hub e, em seguida, transformar as regras desta fase em uma skill reutilizável para os demais produtos.
