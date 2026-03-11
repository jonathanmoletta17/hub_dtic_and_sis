# PROMPT — Blindagem: Comentários de Proteção nos Arquivos Críticos

> Destino: antigravity  
> Escopo: 4 arquivos críticos — inserção de comentários de proteção  
> Regra absoluta: APENAS inserir comentários. Zero alteração de lógica.  
> Duração esperada: curta — é inserção cirúrgica, não refatoração.

---

## CONTEXTO

O arquivo `ARCHITECTURE_RULES.md` foi criado na raiz do repositório
definindo zonas de proteção arquitetural.

O próximo passo é reforçar essas regras **diretamente no código** — inserindo
blocos de comentário no topo dos 4 arquivos mais críticos do sistema.

Quando o antigravity abrir qualquer um desses arquivos em sessões futuras,
o comentário é a primeira coisa que ele lê — antes de qualquer lógica.
Isso cria um segundo ponto de proteção independente do ARCHITECTURE_RULES.md.

---

## REGRA DESTA TAREFA

```
✅ Inserir o bloco de comentário no topo de cada arquivo
✅ Ler o arquivo antes de inserir (confirmar que o bloco não existe já)
❌ ZERO alteração em qualquer lógica existente
❌ ZERO refatoração, ZERO limpeza, ZERO "melhorias" aproveitando a abertura
❌ Se encontrar um bug durante a leitura → documentar, NÃO corrigir agora
```

---

## ARQUIVO 1 — app/services/auth_service.py

Inserir exatamente este bloco **na primeira linha do arquivo**,
antes de qualquer import:

```python
# ╔══════════════════════════════════════════════════════════════════╗
# ║  ZONA PROTEGIDA — auth_service.py                               ║
# ║  Qualquer alteração aqui exige plano pré-aprovado.              ║
# ╠══════════════════════════════════════════════════════════════════╣
# ║  PROIBIDO:                                                       ║
# ║    · Reescrever fallback_login (L182-278)                        ║
# ║    · Reescrever build_login_response                             ║
# ║    · Alterar ordenação de roles em resolve_hub_roles             ║
# ║    · Remover qualquer tratamento de erro ou fallback             ║
# ╠══════════════════════════════════════════════════════════════════╣
# ║  PERMITIDO (sem aprovação):                                      ║
# ║    · Adicionar logging                                           ║
# ║    · Adicionar novos providers no final do arquivo               ║
# ╠══════════════════════════════════════════════════════════════════╣
# ║  DEPENDENTES: toda a API + todo o frontend (via hub_roles)       ║
# ║  REFERÊNCIA: ARCHITECTURE_RULES.md → Zonas de Proteção          ║
# ╚══════════════════════════════════════════════════════════════════╝
```

---

## ARQUIVO 2 — web/src/store/useAuthStore.ts

Inserir exatamente este bloco **na primeira linha do arquivo**,
antes de qualquer import:

```typescript
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ZONA PROTEGIDA — useAuthStore.ts                               ║
// ║  Qualquer alteração aqui exige plano pré-aprovado.              ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  PROIBIDO:                                                       ║
// ║    · Alterar chaves omitidas do persist (_credentials)           ║
// ║    · Reescrever a topologia dos tipos base (AuthMeResponse)      ║
// ║    · Renomear campos do contrato: session_token, hub_roles,      ║
// ║      app_access, active_hub_role                                 ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  PERMITIDO (sem aprovação):                                      ║
// ║    · Adicionar seletores de leitura (get somente)                ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  DEPENDENTES: ContextGuard, ProtectedRoute, AppSidebar,          ║
// ║               PermissionsMatrix, middleware.ts                   ║
// ║  REFERÊNCIA: ARCHITECTURE_RULES.md → Contratos Imutáveis        ║
// ╚══════════════════════════════════════════════════════════════════╝
```

---

## ARQUIVO 3 — web/src/lib/api/httpClient.ts

Inserir exatamente este bloco **na primeira linha do arquivo**:

```typescript
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ZONA PROTEGIDA — httpClient.ts                                 ║
// ║  Qualquer alteração aqui exige plano pré-aprovado.              ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  PROIBIDO:                                                       ║
// ║    · Alterar regex/replace de normalização de paths de contexto  ║
// ║    · Mudar lógica de injeção de Session-Token                    ║
// ║    · Alterar interceptores sem mapear TODOS os paths afetados    ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  PERMITIDO (sem aprovação):                                      ║
// ║    · Adicionar headers específicos para novos endpoints          ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  DEPENDENTES: todos os módulos frontend (100% dos requests)      ║
// ║  RISCO: regex malformada → 404 em toda a aplicação               ║
// ║  REFERÊNCIA: ARCHITECTURE_RULES.md → Zonas de Proteção          ║
// ╚══════════════════════════════════════════════════════════════════╝
```

---

## ARQUIVO 4 — web/src/lib/context-registry.ts

Inserir exatamente este bloco **na primeira linha do arquivo**:

```typescript
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ZONA PROTEGIDA — context-registry.ts                           ║
// ║  Qualquer alteração aqui exige plano pré-aprovado.              ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  PROIBIDO:                                                       ║
// ║    · Alterar a interface base ContextManifest                    ║
// ║    · Remover qualquer entrada existente de módulo                ║
// ║    · Renomear keys de módulos (quebra AppSidebar e guards)       ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  PERMITIDO (sem aprovação):                                      ║
// ║    · Registrar novas entradas de módulo no final                 ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  DEPENDENTES: AppSidebar, ContextGuard, todos os menus de nav    ║
// ║  RISCO: entry removida → módulo some silenciosamente da UI       ║
// ║  REFERÊNCIA: ARCHITECTURE_RULES.md → Zonas de Proteção          ║
// ╚══════════════════════════════════════════════════════════════════╝
```

---

## ARQUIVO BÔNUS — app/core/contexts.yaml

Este é YAML, sem suporte a comentários de bloco formatado.
Inserir este comentário simples **no topo do arquivo**:

```yaml
# ══════════════════════════════════════════════════════════════
# ZONA CRÍTICA — contexts.yaml
# IDs abaixo são confirmados via GLPI físico. Não alterar sem
# verificação real na instância correspondente.
# Alterar este arquivo OBRIGATORIAMENTE requer verificação em:
#   → app/services/auth_service.py (resolve_hub_roles)
#   → web/src/lib/context-registry.ts
# Referência: ARCHITECTURE_RULES.md
# ══════════════════════════════════════════════════════════════
```

---

## VALIDAÇÃO

Após inserir os 5 blocos:

```
[ ] auth_service.py — bloco aparece antes do primeiro import
[ ] useAuthStore.ts — bloco aparece antes do primeiro import
[ ] httpClient.ts   — bloco aparece antes do primeiro import
[ ] context-registry.ts — bloco aparece antes do primeiro import
[ ] contexts.yaml   — comentário aparece no topo do arquivo
[ ] Nenhum arquivo teve lógica alterada (confirmar via diff)
[ ] Servidor sobe normalmente após as inserções
[ ] Login funciona (smoke test rápido)
```

---

## FORMATO DE ENTREGA

```
INSERÇÕES REALIZADAS
  auth_service.py:      ✅ inserido na linha [n]
  useAuthStore.ts:      ✅ inserido na linha [n]
  httpClient.ts:        ✅ inserido na linha [n]
  context-registry.ts:  ✅ inserido na linha [n]
  contexts.yaml:        ✅ inserido na linha [n]

OBSERVAÇÕES DURANTE LEITURA
  [qualquer inconsistência encontrada — documentar, não corrigir]

VALIDAÇÃO
  Servidor sobe: ✅
  Login funciona: ✅
  Diff limpo (apenas inserções): ✅
```

---

*Gerado via PROMPT_LIBRARY — Blindagem Arquitetural | hub_dtic_and_sis | 2026-03-10*
