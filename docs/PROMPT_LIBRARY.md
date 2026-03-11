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

### [DIAGNÓSTICO PENDENTE] — Hub / GLPI — Inconsistência de Permissões após Migração de Perfis para Grupos

**Status:** 🔍 Em investigação

**Contexto**  
O Hub (central unificada de atendimentos — dashboards de Carregadores, DTIC, Conservação, Manutenção, abertura de tickets) passou a usar **grupos do GLPI** como base da matriz permissional, substituindo o modelo anterior baseado em **perfis**.

Após essa migração, algumas aplicações satélites que já estavam implementadas pararam de ser exibidas para os usuários.

**Hipóteses técnicas (ordenadas por probabilidade)**

| # | Hipótese | Local provável |
|---|---|---|
| 1 | Lógica de visibilidade do Hub ainda filtra por `perfil`, não por `grupo` | Código do Hub — lógica de roteamento/exibição |
| 2 | Parâmetros de grupo no GLPI não foram populados corretamente para os usuários | GLPI — configuração de grupos |
| 3 | Inconsistência entre definições de grupos no projeto e o que foi configurado no GLPI | Documento de projeto vs. GLPI admin |
| 4 | A API/integração do GLPI retorna o campo de grupo em estrutura diferente do esperado | Camada de integração Hub ↔ GLPI |

**Pontos do sistema a verificar**

1. **No código do Hub** — buscar toda lógica condicional que decide quais apps exibir. Verificar se usa `profile`, `perfil`, `group` ou `grupo` como chave de decisão.
2. **No GLPI** — confirmar que os usuários estão atribuídos corretamente aos grupos esperados.
3. **No documento de projeto** — confrontar os grupos definidos com os grupos existentes no GLPI (nomes, IDs, hierarquia).
4. **Na integração** — verificar o payload retornado pelo GLPI para um usuário autenticado e confirmar se o campo de grupo está presente e no formato esperado.

**Roteiro de investigação sugerido**

```
1. Autenticar com um usuário afetado
2. Capturar o payload de retorno do GLPI (grupos atribuídos)
3. Comparar com o que o Hub espera receber
4. Buscar no código do  por referências a "perfil" ou "profile"
5. Verificar se existe uma tabela/config de mapeamento grupo → apps permitidas
6. Confrontar com o documento de projeto (definições de permissão)
```

**Prompt de diagnóstico para uso imediato**

```
CONTEXTO
Estamos desenvolvendo o Hub — central unificada de atendimentos (dashboards: Carregadores, DTIC,
Conservação, Manutenção; funcionalidades: abertura de tickets e outros módulos satélite).
O Hub usa o GLPI como base de autenticação e controle de acesso.

SINTOMA
Após migrarmos a matriz permissional de "perfis" para "grupos" do GLPI, algumas aplicações
satélites pararam de ser exibidas para os usuários. O sistema autentica normalmente, mas os
módulos não aparecem.

OBJETIVO
Identificar a causa da inconsistência antes de qualquer alteração em produção.

TAREFA
1. Explicar como o GLPI diferencia perfis de grupos e como isso impacta integrações externas
2. Mapear os pontos onde um sistema integrado ao GLPI pode estar usando perfil em vez de grupo
   como critério de autorização
3. Descrever como diagnosticar se o problema está no GLPI, na integração ou na lógica do Hub
4. Listar as configurações do GLPI que precisam ser verificadas após uma migração desse tipo
5. Apresentar estratégias de correção possíveis

FORMATO DE SAÍDA
1. Diferença técnica perfil vs. grupo no GLPI
2. Pontos de falha prováveis
3. Roteiro de diagnóstico
4. Configurações do GLPI a verificar
5. Opções de correção com riscos

CRITÉRIOS
- Nenhuma alteração antes do diagnóstico confirmado
- Toda hipótese deve ser verificável antes de tocar no código
```

---

*Última atualização: 2026-03-09*
