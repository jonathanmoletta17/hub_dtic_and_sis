# Fronteira de Entrega da Etapa Atual

Esta etapa fecha a onda de estabilização e consistência dos domínios UX-críticos.

## Incluído na entrega

- contrato same-origin `hub.local` com proxy declarativo;
- endurecimento de auth, sessão e validação de token;
- persistência local dos carregadores em SQLite de runtime;
- contrato de datas timezone-aware no backend;
- `response_model` explícito nos reads principais;
- frontend organizado em `contracts/`, `mappers/` e `models` para:
  - tickets/search;
  - knowledge base;
  - chargers;
  - ticket detail/workflow;
  - formcreator;
  - lookups;
- suíte Playwright versionada cobrindo:
  - login e navegação canônica;
  - criação real de chamado via wizard;
  - workflow real de ticket;
  - carregamento real de lookups críticos.

## Fora da entrega desta etapa

- extração de `auth/admin` para o mesmo padrão de domínio;
- endurecimento final de `app/schemas/formcreator.py`;
- limpeza de documentos, prompts e materiais auxiliares que não pertencem ao código entregue.

## Artefatos locais que não devem entrar como entrega

- `data/local_state.db`: estado local de runtime;
- `output/playwright/`: traces e artefatos de falha do Playwright;
- `*.Zone.Identifier`: metadados do Windows.

## Observação de worktree

O repositório continua com mudanças paralelas fora do escopo desta etapa. A fronteira correta de entrega deve considerar apenas backend, frontend, proxy, testes automatizados e documentação técnica diretamente ligados aos itens acima.
