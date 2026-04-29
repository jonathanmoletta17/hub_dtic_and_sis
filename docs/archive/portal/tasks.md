# Tasks - Portal Autoatendimento sobre hub-operacional-web

Data: 2026-04-08
Status geral: em andamento

## Concluido

- [x] Confirmar que `hub-operacional-web` ja e um nucleo funcional validado para tickets.
- [x] Consolidar evidencias de runtime, testes e E2E existentes no repo.
- [x] Confirmar que o backend atual opera com contextos `dtic` e `sis`.
- [x] Confirmar que o frontend atual ja possui login, selector, meus chamados, detalhe e abertura.
- [x] Criar `implementation_plan.md` no repo.
- [x] Criar `tasks.md` no repo.
- [x] Criar um dossie repo-local de reuso do hub como base do portal.
- [x] Criar a documentacao da fachada de portal sem tocar nas zonas protegidas.
- [x] Definir o mapeamento conceitual inicial `dtic -> ti` e `sis -> manutencao` como camada de apresentacao.
- [x] Criar a primeira rota de fachada do portal em `/portal`.
- [x] Expor a entrada do portal pelo selector atual.
- [x] Validar a fachada nova com `npm run lint`.
- [x] Validar a fachada nova com `npm run build`.

## Proximo lote

- [ ] Mapear quais componentes do frontend podem ser reutilizados diretamente na home estilo portal.
- [ ] Definir o menor conjunto de rotas novas ou wrappers para expor a experiencia do portal sobre o nucleo atual.
- [ ] Decidir se a rota `/portal` substitui ou complementa o fluxo atual de `/selector`.
- [ ] Adicionar smoke objetivo para a nova rota `/portal`.

## Dependencias externas

- [ ] Confirmar se `SIS` corresponde funcionalmente a `Manutencao`.
- [ ] Confirmar a existencia e os dados reais do GLPI de `Protocolo`.
- [ ] Fechar Azure app registration do portal.
- [ ] Fechar projeto Firebase alvo e seu papel na topologia.
- [ ] Fechar URLs publicas de Cloudflare.
- [ ] Fechar monitoramento, agente local e WhatsApp.

## Gates antes de mexer nas zonas protegidas

- [ ] Ter prova de que a fachada de portal cobre o caso de uso sem alterar contratos internos.
- [ ] Ter regressao planejada para login, selector, DTIC agent-first e SIS FormCreator.
- [ ] Ter smoke objetivo para qualquer mudanca em `context-registry.ts`, `contexts.yaml` ou `auth_service.py`.
