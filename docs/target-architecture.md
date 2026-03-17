# Arquitetura-Alvo Pragmática

Data-base: 2026-03-15

## Objetivo
Definir a arquitetura de referência para os próximos ciclos sem reescrever a base atual. O foco é previsibilidade, simplicidade e redução de acoplamento implícito.

## Princípios
- manter o produto como monólito modular;
- reduzir fontes duplicadas de verdade;
- tornar contratos explícitos onde a UI depende do backend;
- impedir que componentes adaptem payload bruto;
- impedir que páginas definam identidade operacional;
- aceitar dinamismo apenas quando a variabilidade do domínio realmente exigir.

## Backend-Alvo

### Estrutura lógica desejada

```text
app/
  core/                 -> infraestrutura compartilhada de plataforma
  integrations/glpi/    -> gateway, clientes, mapeamentos de integração
  domains/
    auth/
    tickets/
    knowledge/
    chargers/
    formcreator/
    admin/
  routers/              -> apenas composição HTTP por domínio
  schemas/              -> contratos HTTP explícitos
```

### Fronteiras desejadas
- `platform/core`
  - config
  - database
  - rate limiting
  - cache
  - observabilidade básica
- `integrations/glpi`
  - sessão GLPI
  - client REST
  - adapters de integração
- `auth`
  - login/logout
  - auth/me
  - seleção de papel/contexto
- `tickets`
  - search
  - listagens
  - detail/workflow
- `knowledge`
  - categorias
  - listagem
  - artigo detalhado
- `chargers`
  - expediente global
  - métricas/kanban
  - regras locais operacionais
- `formcreator`
  - catálogo
  - schema
  - submit
  - lookup binding
- `admin`
  - permissões
  - usuários
  - superfície administrativa

### Política de contratos
- toda superfície suportada pela UI deve ter `response_model` explícito;
- endpoints genéricos podem existir, mas apenas como infraestrutura interna;
- datas expostas para a UI devem seguir ISO 8601 com offset;
- regras de domínio ficam no backend; o frontend só orquestra.

## Frontend-Alvo

### Estrutura lógica desejada

```text
web/src/
  lib/
    config/             -> runtime, environment, same-origin policy
    datetime/           -> helpers de tempo
    api/
      infra/            -> http/session internals
      contracts/        -> DTO bruto
      mappers/          -> dto -> model
      models/           -> shape consumido pela UI
      services/         -> chamadas por domínio
  store/                -> estado de autenticação e estado de fluxo
  hooks/                -> apenas orquestração
  components/           -> UI
  app/                  -> rotas e composição de página
```

### Regras obrigatórias
- componentes não consomem DTO bruto;
- páginas não definem papel operacional;
- hooks não fazem transformação de contrato;
- services só transportam, selecionam DTO e delegam para mapper;
- store de autenticação não deve acumular lógica de navegação;
- `types.ts` legado deve virar compat layer com remoção planejada.

## Sessão e Identidade

### Estado atual aceito temporariamente
- store mantém `activeContext`, `currentUserRole`, cache por contexto e tokens;
- `activeView` ainda existe.

### Estado-alvo
- identidade ativa definida por:
  - contexto ativo;
  - papel ativo;
  - sessão válida do contexto.
- `activeView` deixa de ser fonte principal e passa a ser:
  - removido; ou
  - derivado de papel/contexto, nunca definido por tela.

### Política final
- browser usa same-origin `/api/*`;
- token por contexto continua permitido;
- identidade e autorização são derivadas do contrato de sessão, não da navegação.

## Política para FormCreator

### O que manter
- renderer dinâmico;
- catálogo e schema por domínio;
- lookups resolvidos pelo backend + mapper frontend.

### O que mudar
- endurecer gradualmente o schema bruto do backend;
- reduzir `Any` e dicionários abertos onde o produto já tem shape estável;
- limitar dinamismo a:
  - opções dinâmicas;
  - regras de exibição;
  - layout necessário;
- impedir novas heurísticas implícitas no frontend.

### Estado-alvo
- backend expõe schema mais explícito e menos frouxo;
- frontend continua usando modelo interno, mas com menos inferência.

## Política para Endpoints Genéricos
- manter `items` e operações genéricas apenas como infraestrutura interna;
- UI não pode depender diretamente dessa superfície;
- qualquer fluxo suportado pelo produto deve ter endpoint e service de domínio próprios.

## Estado Atual vs Estado-Alvo

| Tema | Estado atual | Estado-alvo |
| --- | --- | --- |
| Arquitetura geral | monólito modular funcional | monólito modular com fronteiras explícitas |
| Sessão/contexto | múltiplas fontes de verdade | contrato de identidade ativa unificado |
| Frontend contracts | transição entre legado e novo padrão | apenas contratos por domínio + compat layer temporária mínima |
| FormCreator | dinâmico e frouxo | dinâmico apenas onde necessário, com schema mais explícito |
| Endpoints genéricos | ainda presentes no backend | mantidos, mas estritamente internos |
| Processo de entrega | fronteira ruidosa | fronteira clara entre produto, docs vivos e histórico |

## Gaps por Domínio

| Domínio | Gap principal | Decisão |
| --- | --- | --- |
| Auth / Session | identidade operacional ainda dependente de tela | refatorar primeiro |
| Tickets/Search | gap baixo | manter |
| Ticket Workflow | gap moderado em dependência de sessão/role | consolidar após sessão |
| Knowledge | gap baixo | manter |
| Chargers | gap baixo a moderado | manter e evoluir com prudência |
| Lookups | gap moderado por dependência de FormCreator | consolidar junto com FormCreator |
| FormCreator | gap alto de contrato | endurecer por etapas |
| Admin | gap moderado de padrão | deixar para onda posterior |

## Decisão Consolidada
A arquitetura-alvo do Tensor Aurora não é mais distribuída nem mais abstrata. Ela é apenas mais explícita:
- fronteiras de domínio mais claras;
- menos fontes de verdade;
- contratos mais firmes;
- menos dependência de convenção implícita.
