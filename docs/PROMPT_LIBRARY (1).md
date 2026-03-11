# 📚 Prompt Library — hub_dtic_and_sis

> Repositório central de prompts padronizados para uso no fluxo de desenvolvimento.  
> Cada prompt é uma ferramenta reutilizável. Preencha os campos entre `[ ]` para cada uso.

---

## Convenções

| Campo | Significado |
|---|---|
| `CONTEXTO` | Cenário atual — o que existe, o que está em jogo |
| `OBJETIVO` | O que precisa ser alcançado nesta interação |
| `TAREFA` | Ações concretas que o agente deve executar |
| `FORMATO` | Como a resposta deve ser estruturada |
| `CRITÉRIOS` | O que define uma resposta válida e completa |

---

## P01 — Análise e Diagnóstico Técnico

> **Quando usar:** erro inesperado, comportamento anômalo, regressão, incidente em produção ou staging.

```
CONTEXTO
[Descreva o sistema afetado, o módulo ou funcionalidade envolvida, e o comportamento observado.
 Inclua stack, linguagem, infra relevante se houver.]

SINTOMA
[O que o usuário ou sistema está reportando / exibindo.]

ERRO TÉCNICO
[Código HTTP, stack trace, log ou mensagem de erro exata, se disponível.]

OBJETIVO
Identificar a causa raiz do problema antes de qualquer alteração em código ou configuração de produção.

TAREFA
1. Explicar tecnicamente o que esse erro/comportamento significa
2. Listar todos os pontos da arquitetura onde o problema pode estar originado
3. Mapear configurações ou dependências que tipicamente causam esse comportamento
4. Descrever um método de diagnóstico passo a passo para isolar a causa
5. Apresentar as estratégias de correção possíveis
6. Indicar riscos e trade-offs de cada abordagem

FORMATO DE SAÍDA
1. Diagnóstico técnico do problema
2. Hipóteses ordenadas por probabilidade
3. Pontos do sistema a verificar (com localização específica)
4. Roteiro de investigação
5. Opções de correção
6. Recomendação técnica fundamentada

CRITÉRIOS
- Nenhuma alteração deve ser sugerida sem diagnóstico confirmado
- Toda hipótese deve ter base técnica justificada
- A resposta deve permitir uma tomada de decisão informada
```

---

## P02 — Planejamento e Roadmap

> **Quando usar:** nova funcionalidade, refatoração, migração, ou qualquer demanda que exige divisão em etapas antes de executar.

```
CONTEXTO
[Descreva o sistema ou módulo envolvido, o estado atual, e o que motivou essa demanda.]

OBJETIVO
[Descreva claramente o estado final desejado — o que deve existir ou funcionar ao final.]

RESTRIÇÕES
[Liste limitações conhecidas: tecnologia fixada, prazo, dependências externas, risco de impacto em produção.]

TAREFA
1. Mapear o que já existe e o que precisa ser criado ou alterado
2. Identificar dependências entre etapas
3. Dividir o trabalho em fases executáveis e sequenciadas
4. Apontar riscos por fase
5. Indicar critérios de validação para cada etapa

FORMATO DE SAÍDA
1. Visão geral do plano
2. Fases com descrição, entregável e critério de conclusão
3. Dependências entre fases
4. Riscos mapeados
5. Ordem de execução recomendada

CRITÉRIOS
- O plano deve ser executável sem ambiguidade
- Cada fase deve ter um critério claro de "está feito"
- Nenhuma fase deve depender de suposições não confirmadas
```

---

## P03 — Extração de Conhecimento (pós-solução)

> **Quando usar:** após qualquer solução validada — correção, implementação ou decisão arquitetural confirmada.  
> Objetivo: transformar a solução em conhecimento persistido e reutilizável.

```
CONTEXTO DA SOLUÇÃO
[Descreva brevemente o problema que foi resolvido.]

SOLUÇÃO IMPLEMENTADA
[Descreva o que foi feito — mudança de código, configuração, decisão arquitetural.]

TAREFA
Com base no problema resolvido e na solução aplicada, gere um registro de conhecimento com:

1. Título curto (formato: [SISTEMA] — [PROBLEMA RESOLVIDO])
2. Causa raiz confirmada
3. Solução aplicada (com trechos de código ou config se relevante)
4. Por que essa solução resolve o problema (fundamento técnico)
5. Como detectar esse problema mais cedo no futuro
6. Como prevenir recorrência
7. Tags de categorização (ex: #nginx #autorizacao #glpi #backend)

FORMATO DE SAÍDA
Bloco Markdown pronto para inserção no Knowledge Base do projeto.

CRITÉRIOS
- Linguagem técnica e direta
- Sem repetição de contexto já conhecido
- Deve ser compreensível por qualquer dev do time sem precisar do histórico da conversa
```

---

## 📋 Registro de Conhecimento — Casos Documentados

> Cada entrada abaixo foi gerada ao final de uma solução validada.  
> Formato: `[DATA] — [SISTEMA] — [PROBLEMA]`

---

### [2026-03-09] — Hub / GLPI — Módulos Satélite Invisíveis após Migração de Perfis para Grupos

**Status:** ✅ Causa raiz identificada | 🔧 Correção pendente de validação dos IDs

---

**Causa Raiz Confirmada**  
Os grupos `Hub-App-*` **não existem na instância GLPI física**. A função `resolve_app_access` busca grupos com prefixo `Hub-App-` via API REST do GLPI e retorna `[]` quando nenhum é encontrado. Com `app_access = []`, o frontend (`ContextGuard` + `AppSidebar`) não exibe nenhum módulo protegido por `requireApp`.

---

**Arquitetura de Autorização do Hub**

O Hub usa dois mecanismos paralelos e independentes:

| Mecanismo | Resolve | Fonte | Arquivo |
|---|---|---|---|
| `resolve_hub_roles` | Perfil funcional do usuário (`tecnico`, `gestor`, `solicitante`) | `profile_map` + `group_map` em `contexts.yaml` | `auth_service.py` L64-122 |
| `resolve_app_access` | Quais módulos satélite o usuário pode ver | Grupos `Hub-App-*` no GLPI via API | `auth_service.py` L22-43 |

Perfis e grupos **não são intercambiáveis** no Hub — cada um alimenta um mecanismo diferente.

---

**Falhas Identificadas**

| # | Falha | Status | Impacto |
|---|---|---|---|
| F1 | Grupos `Hub-App-*` inexistentes no GLPI | ✅ **Confirmado** | Todos os módulos com `requireApp` ficam invisíveis |
| F2 | IDs dos grupos SIS (`22`, `21`) podem divergir do `contexts.yaml` | ⚠️ Não verificado | `tecnico-manutencao` e `tecnico-conservacao` não resolvem |
| F3 | `glpigroups` pode retornar formato inesperado na sessão | ⚠️ Não verificado | `groups[]` fica vazio silenciosamente |
| F4 | DTIC não tem `group_map` no `contexts.yaml` | 📋 Documentado | Sem impacto atual; bloqueia sub-roles futuras |

---

**Sequência de Correção (ordem obrigatória)**

```
1. [LEITURA] Capturar payload real:
   GET /api/v1/dtic/auth/diagnose-access?username=<usuario>

2. [LEITURA] Validar no painel GLPI (Administração > Grupos):
   - IDs reais dos grupos CC-MANUTENCAO e CC-CONSERVACAO
   - Confirmar se IDs batem com contexts.yaml (esperado: 22 e 21)

3. [AÇÃO - sem risco] Criar grupos Hub-App-* no GLPI:

   DTIC:
   - Hub-App-busca
   - Hub-App-permissoes

   SIS:
   - Hub-App-busca
   - Hub-App-carregadores
   - Hub-App-permissoes

4. [AÇÃO - sem risco] Atribuir grupos ao usuário jonathan-moletta:
   - DTIC: Hub-App-permissoes + Hub-App-busca
   - SIS:  Hub-App-permissoes + Hub-App-busca + Hub-App-carregadores

5. [VALIDAÇÃO] Se IDs dos grupos SIS divergirem → atualizar contexts.yaml
   (única alteração de código necessária)
```

---

**Prevenção Futura**  
Todo novo módulo satélite que usar `requireApp` exige que o grupo correspondente `Hub-App-<nome>` exista no GLPI **antes** do deploy. Documentar essa dependência no checklist de release do Hub.

**Tags:** `#glpi` `#autorizacao` `#hub` `#contexts-yaml` `#app-access` `#grupos`

---

*Última atualização: 2026-03-09*
