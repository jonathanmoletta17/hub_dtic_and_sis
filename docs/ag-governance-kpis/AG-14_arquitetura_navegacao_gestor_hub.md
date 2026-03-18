# AG-14 - Arquitetura de Navegacao do Gestor DTIC no Hub

Data: 2026-03-18

## 1. Objetivo

Definir como a experiencia do gestor DTIC deve existir dentro do Hub sem:

1. diluir a logica do legado `spokes/governance`
2. confundir a home operacional do tecnico com a home estrategica do gestor
3. quebrar o shell atual do Hub (`AppSidebar`, `selector`, `context-registry`)

Este documento nao desenha componentes finais. Ele fecha a arquitetura de navegacao e a distribuicao de responsabilidades entre:

- shell global do Hub
- home executiva do gestor
- boards especializados herdados do legado

## 2. Evidencia do estado atual do Hub

### 2.1 Shell e menu

Hoje o Hub ja possui um shell coerente e reutilizavel:

- `web/src/app/[context]/layout.tsx`
  - aplica `AuroraMesh`
  - usa `AppSidebar`
  - ja suporta `collapsed` em casos especiais como `/dtic/analytics`
- `web/src/components/ui/AppSidebar.tsx`
  - resolve o menu pelo `context-registry`
  - destaca rota ativa
  - usa o contexto atual para montar o menu

### 2.2 Menu DTIC existente

No estado atual, `dtic` expoe:

1. `Novo Chamado`
2. `Meus Chamados`
3. `Painel`
4. `Dashboard`
5. `Smart Search`
6. `Base de Conhecimento`
7. `Gestao de Acessos`

Fonte:

- `web/src/lib/config/features.json`
- `web/src/lib/config/labels.pt-BR.json`

Leitura funcional:

- `Painel` (`/[context]/dashboard`) = visao operacional
- `Dashboard` (`/[context]/analytics`) = visao analitica / TV / kiosk
- `Smart Search`, `Base de Conhecimento`, `Gestao de Acessos` = modulos especializados

### 2.3 Landing atual por papel

A landing nao depende apenas do menu lateral. Ela tambem depende de `hubRole.route`.

Fontes:

- `web/src/app/selector/page.tsx`
- `web/src/components/ui/UserProfileMenu.tsx`
- `web/src/store/useAuthStore.ts`

Hoje, ao selecionar contexto ou trocar perfil, a navegacao usa:

- `router.push(\`/${targetContext}/${primaryRole.route}\`)`

Isso significa que a "face do gestor" nao sera alterada apenas criando uma pagina nova. A arquitetura precisa decidir como o gestor chega nela por padrao.

## 3. Conclusao arquitetural principal

O Hub deve tratar o gestor DTIC como uma persona com percurso proprio.

Mas isso nao significa substituir tudo por uma unica "super dashboard".

A integracao correta e:

1. manter o shell e a identidade do Hub
2. criar um modulo proprio para governanca
3. usar esse modulo como landing preferencial do gestor DTIC
4. manter o `Painel` operacional disponivel como aprofundamento, nao como face principal

Em termos simples:

- tecnico entra para operar
- gestor entra para decidir

## 4. Recomendacao de arquitetura de informacao

## 4.1 Decisao recomendada

Criar um novo modulo de primeiro nivel no contexto DTIC:

- label: `Governanca`
- rota raiz: `/dtic/governanca`

Motivo para usar `Governanca` e nao `Gestao`:

1. o termo conversa diretamente com o legado auditado
2. evita ambiguidade com `Gestao de Acessos`
3. comporta bem os subdominios `Mapa`, `Indicadores`, `RACI` e `POPs`

## 4.2 Estrutura recomendada de rotas

```text
/dtic/governanca                    -> Resumo Executivo
/dtic/governanca/mapa               -> Mapa de Governanca
/dtic/governanca/indicadores        -> Catalogo de KPIs
/dtic/governanca/raci               -> Matriz RACI
/dtic/governanca/pops               -> POPs e Processos
```

### 4.3 Estrutura recomendada no menu lateral

Menu lateral DTIC para gestor, no estado alvo:

1. `Governanca`
2. `Dashboard`
3. `Painel`
4. `Smart Search`
5. `Base de Conhecimento`
6. `Gestao de Acessos`
7. `Meus Chamados`
8. `Novo Chamado`

Observacao importante:

O arquivo `context-registry.ts` esta em zona protegida e o comentario local diz que novas entradas podem ser registradas no final sem aprovacao, mas nao recomenda reordenar o contrato base sem plano explicito.

Portanto, ha dois modos de execucao possiveis:

### Modo seguro inicial

1. registrar `Governanca` no final do `features.json`
2. manter a ordem atual do sidebar
3. compensar a prioridade do modulo pela landing default do gestor

### Modo UX alvo

1. aprovar reorder do menu DTIC para gestor
2. mover `Governanca` para o topo do menu

Recomendacao: iniciar pelo modo seguro e validar uso real antes de tocar a ordem global do menu.

## 5. Landing default do gestor

## 5.1 O que nao fazer

Nao recomendo duas abordagens:

1. reutilizar `/dtic/dashboard` e trocar totalmente a pagina por role
2. enfiar o conteudo de governanca dentro do `Dashboard` analitico atual

Problemas:

- quebra expectativa de bookmark
- mistura operacao com governanca
- impede a preservacao da ordem cognitiva do legado

## 5.2 O que fazer

Definir que o gestor DTIC aterrissa por padrao em:

- `/dtic/governanca`

enquanto o tecnico continua em:

- `/dtic/dashboard`

## 5.3 Como fazer isso sem quebrar contratos protegidos

Evitar mudanca estrutural em `useAuthStore`.

A implementacao futura deve ocorrer fora da store protegida, usando uma camada de resolucao de rota default, por exemplo:

1. no `selector/page.tsx`
2. no `UserProfileMenu.tsx`

Regra:

```text
se role === "gestor" e context === "dtic" => default route = "/dtic/governanca"
senao => manter hubRole.route atual
```

Assim:

- o contrato de auth permanece estavel
- a persona gestor ganha uma entrada propria
- o tecnico nao sofre regressao

## 6. Arquitetura interna do modulo Governanca

O modulo `Governanca` nao deve ser uma tela unica. Ele deve ter:

1. uma pagina raiz executiva
2. quatro boards especializados

### 6.1 Pagina raiz: Resumo Executivo

Funcao:

- mostrar o que exige decisao hoje
- resumir o estado dos pilares
- apontar o proximo clique natural

Nao deve virar um "data wall".

Ela existe para:

- sintetizar risco
- sintetizar pendencia
- sintetizar evidencia
- distribuir o gestor para os boards corretos

### 6.2 Boards especializados

1. `Mapa de Governanca`
   - herdeiro direto do board narrativo do legado
2. `Indicadores`
   - herdeiro do catalogo de KPIs
3. `RACI`
   - herdeiro da tabela de responsabilizacao
4. `POPs`
   - herdeiro do catalogo de procedimentos

## 7. Regras de UX para o gestor

## 7.1 O que o gestor precisa ver primeiro

Na raiz do modulo:

1. semaforos de risco e aderencia
2. variacao de indicadores-chave
3. pendencias de comite, documento ou aprovacao
4. atalhos para boards

## 7.2 O que o gestor nao precisa ver na home

Nao trazer para a home executiva:

1. kanban operacional completo
2. lista extensa de tickets
3. tabelas grandes de chamados
4. detalhamento por tecnico como eixo principal

Esses dados podem existir como drill-down ou contextualizacao, mas nao como superficie dominante.

## 7.3 Linguagem visual recomendada

Preservar do Hub:

- sidebar
- background
- header/shell
- tokens de superficie e tipografia

Preservar do legado:

- ordem por assunto
- slide-over de evidencia
- relacao explicita entre norma, KPI, papel e processo

Traducao visual recomendada:

- menos densidade que o analytics kiosk
- mais documental que operacional
- cards e paineis calmos
- cor usada como semantica, nao como decoracao

## 8. Componente transversal obrigatorio: Drawer de Evidencia

O legado era forte porque cada board nao apenas mostrava status; ele mostrava materialidade.

Por isso, o modulo do Hub deve ter um drawer transversal de evidencia que possa abrir a partir de:

- node do mapa
- card de KPI
- linha da RACI
- card de POP

Comportamento recomendado:

1. abre pela direita
2. suporta deep link via query string
3. exibe documentos, origem, owner, referencias e status

Exemplo de deep link:

```text
/dtic/governanca/indicadores?drawer=sla-primeiro-atendimento
```

Isso preserva a principal vantagem do spoke legado: navegar por relacao, nao apenas por menu.

## 9. Mapa de responsabilidade entre modulos do Hub

### 9.1 Continua no modulo operacional atual

- fila
- tickets abertos
- busca de chamados
- acompanhamento transacional

### 9.2 Entra no modulo Governanca

- narrativa normativa
- catalogo de KPIs executivos
- matriz de responsabilidade
- POPs e processos
- evidencias e rastreabilidade

### 9.3 Cruza os dois mundos

- analytics
- indicadores operacionais com leitura executiva
- links de aprofundamento para tickets e filas quando necessario

## 10. Estrutura alvo no App Router

```text
web/src/app/[context]/governanca/page.tsx
web/src/app/[context]/governanca/mapa/page.tsx
web/src/app/[context]/governanca/indicadores/page.tsx
web/src/app/[context]/governanca/raci/page.tsx
web/src/app/[context]/governanca/pops/page.tsx

web/src/modules/governance/
  components/
  hooks/
  services/
  types/
```

Motivo:

- respeita o shell atual do App Router
- separa rota de pagina do modulo funcional
- evita repetir o anti-padrao do legado (`App.tsx` monolitico)

## 11. Decisoes tomadas

1. O gestor DTIC nao deve ter a mesma landing do tecnico.
2. O legado deve entrar como modulo especializado, nao como mega dashboard.
3. O nome de primeiro nivel recomendado e `Governanca`.
4. A rota raiz do modulo deve ser a home executiva do gestor.
5. `Painel` e `Dashboard` permanecem acessiveis, mas deixam de ser a face principal do gestor.
6. A mudanca de landing deve acontecer fora da store protegida.
7. O modulo deve preservar o drawer de evidencia e o cross-linking como comportamentos centrais.

## 12. Proxima etapa recomendada

Com esta arquitetura aprovada, o passo seguinte e desenhar wireframes textuais tela a tela para:

1. validar hierarquia de informacao
2. validar o que entra na home executiva e o que fica nos boards
3. evitar um novo concept board baguncado
