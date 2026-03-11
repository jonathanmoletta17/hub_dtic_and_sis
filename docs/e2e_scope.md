# Escopo de Testes End-to-End (E2E) — Tensor Aurora
**Status:** Planejamento Estrutural (Sessão Futura)
**Framework Recomendado:** Playwright

Este documento mapeia os fluxos críticos de negócio que exigem cobertura automatizada E2E no frontend, de acordo com o diagnóstico do *Relatório Técnico de Estabilização Arquitetural*.

---

## 5 Fluxos E2E Críticos

Estes fluxos devem ser mockados no nível de rede (interceptando respostas da API) ou validados contra uma instância estática de teste do GLPI.

### FLUXO 1: Login DTIC e Roteamento Principal
**Objetivo:** Validar a extração correta do perfil e o redirecionamento.
1. Acessa `/login/dtic`.
2. Mock de API retorna payload com `glpiactiveprofile` = "Gestor" (id=20).
3. Efetua login falso.
4. **Asserts:**
   - Usuário é redirecionado para `/dtic/dashboard`.
   - Sidebar exibe módulos compatíveis com *role* = `gestor`.

### FLUXO 2: Resolução Multi-Grupo SIS (Sub-Contextos)
**Objetivo:** Validar que múltiplos grupos no SIS injetam o `context_override` corretamente.
1. Acessa `/login/sis`.
2. Mock de API retorna payload com `glpigroups` = `[21, 22]` (Conservação e Manutenção).
3. Efetua login falso.
4. **Asserts:**
   - Sidebar exibe atalhos para contextos virtuais: `sis-memoria` e `sis-manutencao`.
   - Navegação para essas rotas passa corretamente o contexto no header HTTP.

### FLUXO 3: Atualização Matriz de Permissões
**Objetivo:** Garantir que o UI reage instantaneamente a ações administrativas.
1. Autenticado como Gestor DTIC, acessa módulo de controle de acessos.
2. Intercepta requisições `GET /admin/users` e simula resposta local.
3. Atribui grupo `Hub-App-busca` a um usuário na tabela.
4. Mock de POST retorna `AssignGroupResponse` (`success: true`).
5. **Asserts:**
   - UI exibe *toast* de sucesso.
   - Ícone (switch/badge) reflete imediatamente a adição para aquele usuário.

### FLUXO 4: Elevação Cross-Context (DTIC -> SIS)
**Objetivo:** Validar autenticação da Service Account para gerenciamento de outro contexto.
1. Autenticado como Gestor DTIC.
2. Tenta alterar permissão de usuário num módulo do SIS.
3. UI detecta `target_context` = `sis`.
4. API interceptada requer autorização via Service Account (simulada).
5. **Asserts:**
   - O request `POST/DELETE` sai com o token de Service Account, não o token do Gestor DTIC.

### FLUXO 5: Fallback de Segurança
**Objetivo:** Garantir que um perfil inválido não comprometa o front end nem vaze dados.
1. Login DTIC com payload contendo profile ID `9999` (desconhecido).
2. **Asserts:**
   - Backend calcula *role* = `solicitante`.
   - Redireciona para rota base `/user`.
   - Nenhuma permissão administrativa aparente na UI.

---

## Viabilidade e Implementação

**Avaliação Geração de Mocks:**
* Dado a arquitetura modular, o uso do Playwright com `page.route()` para mockar a API REST localmente é **Altamente Viável**.
* Elimina a necessidade de manter uma instância GLPI real instável, protegendo o pipeline CI/CD.

**Próximos Passos (Próxima Sessão):**
1. Instalar `@playwright/test`.
2. Configurar `playwright.config.ts`.
3. Escrever e estabilizar o FLUXO 1.
