# PROMPT — Auditoria de Saúde do Codebase: Mapeamento, Limpeza e Consolidação

> Template: P01 — Análise e Diagnóstico Técnico  
> Destino: antigravity  
> Escopo: Projeto completo — frontend + backend + configuração + infra  
> Regra absoluta: ZERO adições nesta tarefa. Apenas mapear, analisar e propor remoções/substituições.

---

## CONTEXTO

O projeto `hub_dtic_and_sis` (`tensor-aurora`) foi construído de forma incremental,
com múltiplos ciclos de desenvolvimento assistido por IA.

Esse modelo de desenvolvimento tem um efeito colateral crítico:
**o código só cresce — nunca encolhe.**

A cada correção, uma nova camada é adicionada em cima da anterior.
A cada refatoração, o código antigo frequentemente permanece ao lado do novo.
A cada nova feature, dependências que ela substituiu continuam presentes.

O resultado acumulado é:
- Funções definidas mas nunca chamadas
- Componentes importados mas nunca renderizados
- Endpoints implementados mas sem consumidor
- Tipos e interfaces duplicados ou sobrepostos
- Configurações conflitantes convivendo no mesmo arquivo
- Lógica de permissão misturada entre dois modelos (ID numérico + role semântico)
- Variáveis de ambiente declaradas mas não usadas
- Arquivos inteiros que podem ter sido substituídos mas não removidos

**Esta tarefa não adiciona nada. Ela mapeia, avalia e propõe remoções.**

---

## OBJETIVO

Produzir um inventário técnico completo do projeto identificando:

1. Código morto (dead code) — definido mas nunca executado
2. Código obsoleto — foi substituído mas não removido
3. Código duplicado — mesma lógica em dois ou mais lugares
4. Código frágil — funciona mas vai quebrar com qualquer mudança futura
5. Inconsistências arquiteturais — partes que contradizem o padrão adotado
6. Dependências desnecessárias — importadas mas não usadas, ou substituíveis

---

## REGRA CENTRAL DESTA TAREFA

```
NÃO ADICIONE NADA.
NÃO CRIE NOVOS ARQUIVOS.
NÃO IMPLEMENTE NENHUMA CORREÇÃO AINDA.

Esta fase é exclusivamente de levantamento e diagnóstico.
Toda proposta de ação deve ser listada no plano de limpeza da Fase 4.
A implementação acontece em uma tarefa separada, após validação do mapa.
```

---

## FASE 1 — MAPEAMENTO ESTRUTURAL DO PROJETO

Antes de analisar qualquer código, construa o mapa completo do que existe.

### 1.1 — Estrutura de diretórios

Listar a árvore completa do projeto com descrição de responsabilidade de cada pasta:

```
tensor-aurora/
  app/                    → [responsabilidade]
    routers/              → [o que está aqui]
    services/             → [o que está aqui]
    core/                 → [o que está aqui]
    schemas/              → [o que está aqui]
  web/
    src/
      app/                → [rotas Next.js / páginas]
      components/         → [componentes reutilizáveis]
      hooks/              → [custom hooks]
      lib/                → [utilitários, API clients, constantes]
      stores/             → [Zustand stores]
      types/              → [TypeScript types e interfaces]
```

### 1.2 — Inventário de arquivos por categoria

Para cada categoria, listar todos os arquivos com uma linha de descrição:

**Backend (Python):**
- Routers: endpoints expostos por arquivo
- Services: lógica de negócio por arquivo
- Queries: queries SQL por arquivo
- Schemas: modelos Pydantic por arquivo
- Core: auth, guards, configuração

**Frontend (TypeScript/React):**
- Pages/routes: cada rota do app
- Components: cada componente (UI, auth, modals, etc.)
- Hooks: cada custom hook e o que ele faz
- Stores: cada Zustand store e seu estado
- Services/API: cada arquivo de chamada HTTP
- Types: cada arquivo de tipos e interfaces
- Constants/Config: arquivos de configuração estática

---

## FASE 2 — ANÁLISE DE CÓDIGO MORTO E OBSOLETO

### 2.1 — Frontend: imports não utilizados

Buscar em todos os arquivos `.tsx` e `.ts`:
- Imports declarados mas não referenciados no arquivo
- Componentes importados mas nunca renderizados
- Types/interfaces importados mas não usados

Formato de saída:
```
ARQUIVO: web/src/components/X.tsx
  Import não usado: { ComponenteY } de './ComponenteY'
  Import não usado: { TypeZ } de '../types/z'
```

### 2.2 — Frontend: componentes sem consumidor

Identificar componentes em `components/` que não são importados por nenhum outro arquivo.
Verificar se são:
- Genuinamente órfãos (podem ser removidos)
- Usados dinamicamente (ex: lazy load, string-based import)
- Planejados mas não implementados

### 2.3 — Frontend: funções e variáveis declaradas mas não usadas

Buscar por:
- Funções declaradas (`const fn = () =>`) mas nunca chamadas no arquivo ou exportadas
- Variáveis `const` declaradas mas nunca lidas
- Props de componente declaradas no tipo mas nunca desestruturadas no componente

### 2.4 — Frontend: código comentado

Identificar blocos de código comentado (`// `, `/* */`) que representam código antigo
não removido. Distinguir de comentários explicativos legítimos.

### 2.5 — Frontend: lógica duplicada

Identificar casos onde a mesma lógica existe em dois ou mais lugares:
- Funções de formatação de data/hora duplicadas
- Lógica de verificação de permissão duplicada entre componentes
- Chamadas de API duplicadas em hooks diferentes para o mesmo endpoint
- Constantes duplicadas definidas em múltiplos arquivos

### 2.6 — Backend: endpoints sem consumidor frontend

Para cada endpoint em `app/routers/`:
- Verificar se existe chamada correspondente no frontend (`chargerService.ts`, `httpClient.ts` ou similar)
- Listar endpoints implementados mas sem chamada conhecida no frontend

### 2.7 — Backend: funções em services nunca chamadas

Para cada função em `app/services/`:
- Verificar se é chamada por algum router ou outro service
- Listar funções definidas mas sem chamador identificado

### 2.8 — Backend: schemas Pydantic sem uso

Para cada modelo em `app/schemas/`:
- Verificar se é referenciado por algum router ou service
- Listar modelos definidos mas sem uso confirmado

### 2.9 — Backend: queries SQL duplicadas ou obsoletas

Em `charger_queries.py` e similares:
- Identificar queries que fazem buscas sobrepostas
- Identificar queries que podem ter sido substituídas por versões mais novas
- Verificar se todas as queries definidas são chamadas

---

## FASE 3 — ANÁLISE DE INCONSISTÊNCIAS ARQUITETURAIS

### 3.1 — Dois modelos de permissão coexistindo

**Modelo correto (semântico):** `hub_role.role === "gestor"` — agnóstico a IDs  
**Modelo frágil (numérico):** `profileId === 6 || profileId === 20` — quebrável

Busca global por todos os usos do modelo frágil:
- `profile_id`, `profileId`, `PROFILE_ID`
- Comparações com valores numéricos de perfil
- Constantes `*_PROFILE_ID`

Para cada ocorrência: arquivo, linha, o que decide, se pode ser migrado para o modelo semântico.

### 3.2 — Dois padrões de chamada HTTP

Verificar se o projeto usa consistentemente um único cliente HTTP ou se há chamadas
diretas com `fetch`/`axios` misturadas com o `httpClient.ts` centralizado.

### 3.3 — Tipos TypeScript duplicados ou inconsistentes

Em `web/src/types/`:
- Interfaces com campos duplicados (ex: `OperationSettings` com camelCase + snake_case — bug conhecido)
- Tipos que representam o mesmo dado com estruturas diferentes
- Tipos do backend (`schemas/`) que deveriam ser espelhados no frontend mas divergem

### 3.4 — Configurações conflitantes

Verificar:
- `contexts.yaml` — há entradas sobrepostas ou contraditórias?
- Variáveis de ambiente — há `.env`, `.env.local`, `.env.production` com valores conflitantes?
- `docker-compose.yml` — há serviços definidos mas não usados?
- Configuração do Nginx Proxy Manager vs. portas expostas nos containers — divergências?

### 3.5 — Padrões de nomenclatura inconsistentes

Identificar arquivos ou funções que quebram a convenção adotada:
- Mistura de `camelCase` e `snake_case` em nomes de função/variável no mesmo contexto
- Componentes React sem sufixo de função clara
- Arquivos de serviço com naming inconsistente

---

## FASE 4 — PLANO DE LIMPEZA PRIORIZADO

Com base nas Fases 1, 2 e 3, produzir o plano de ação organizado por impacto e risco.

### Categorias de ação

**REMOVER** — código que pode ser deletado sem impacto  
**SUBSTITUIR** — código que deve ser trocado pela versão correta (ex: ID numérico → role semântico)  
**CONSOLIDAR** — código duplicado que deve ser unificado em um único lugar  
**DOCUMENTAR** — código que parece obsoleto mas há dúvida — marcar para decisão humana

### Formato do plano

```
ITEM [n]
  Tipo: REMOVER | SUBSTITUIR | CONSOLIDAR | DOCUMENTAR
  Prioridade: ALTA | MÉDIA | BAIXA
  Risco: NENHUM | BAIXO | MÉDIO
  Arquivo(s): [caminhos]
  Descrição: [o que é e por que pode ser removido/substituído]
  Impacto estimado: [quantas linhas removidas, quantos arquivos afetados]
  Dependências: [precisa ser feito antes/depois de outro item?]
```

### Critérios de priorização

**ALTA prioridade:**
- Lógica de permissão com modelo frágil (ID numérico) — risco de bug silencioso
- Código duplicado em camada crítica (auth, permissão, API calls)
- Tipos inconsistentes que causam bugs de runtime

**MÉDIA prioridade:**
- Componentes órfãos (sem consumidor)
- Endpoints sem chamador frontend
- Imports não usados em arquivos core

**BAIXA prioridade:**
- Código comentado antigo
- Constantes duplicadas em arquivos utilitários
- Inconsistências de nomenclatura

---

## FASE 5 — MÉTRICAS DO PROJETO ANTES DA LIMPEZA

Registrar o estado atual como baseline para medir o impacto da limpeza:

```
BASELINE — [data]

Frontend:
  Total de arquivos .tsx/.ts: [n]
  Linhas de código: [n]
  Componentes identificados: [n]
  Hooks identificados: [n]
  Stores: [n]

Backend:
  Total de arquivos .py: [n]
  Linhas de código: [n]
  Endpoints: [n]
  Funções de serviço: [n]
  Queries SQL: [n]

Diagnóstico:
  Imports não usados: [n]
  Componentes órfãos: [n]
  Endpoints sem consumidor: [n]
  Funções sem chamador: [n]
  Ocorrências de modelo de permissão frágil: [n]
  Tipos duplicados/inconsistentes: [n]
  
Estimativa de redução após limpeza:
  Linhas a remover: ~[n]
  Arquivos a remover: ~[n]
```

---

## FORMATO DE SAÍDA FINAL

```
1. MAPA ESTRUTURAL DO PROJETO
   [Árvore com descrições — Fase 1]

2. INVENTÁRIO DE CÓDIGO MORTO/OBSOLETO
   [Lista numerada por categoria — Fase 2]

3. INCONSISTÊNCIAS ARQUITETURAIS
   [Lista com arquivo, linha, problema, correção proposta — Fase 3]

4. PLANO DE LIMPEZA PRIORIZADO
   [Lista de ações REMOVER/SUBSTITUIR/CONSOLIDAR/DOCUMENTAR — Fase 4]

5. MÉTRICAS BASELINE
   [Números antes da limpeza — Fase 5]

6. ORDEM DE EXECUÇÃO RECOMENDADA
   [Sequência segura para aplicar as limpezas sem quebrar o sistema]
```

---

## CRITÉRIOS DE QUALIDADE

- Todo item do plano deve ter risco avaliado — nada de "provavelmente pode remover"
- Itens com dúvida devem ser marcados como DOCUMENTAR, não REMOVER
- A ordem de execução deve respeitar dependências — nunca remover algo que outro item ainda usa
- As métricas baseline são obrigatórias — sem elas não é possível medir o resultado da limpeza
- Esta tarefa termina com um plano, não com código alterado

---

## NOTA OPERACIONAL

Esta é uma tarefa de **pré-condição**.
Nenhuma nova feature deve ser adicionada ao projeto enquanto o plano de limpeza
não for executado.

O padrão atual de "só adicionar" cria dívida técnica composta:
cada nova camada adicionada sobre código obsoleto aumenta o custo de manutenção
e o risco de regressão de forma exponencial.

Após a execução deste plano, o projeto terá uma base limpa e coesa sobre a qual
novas features podem ser adicionadas com segurança e previsibilidade.

---

*Gerado via PROMPT_LIBRARY — P01 Análise Técnica | hub_dtic_and_sis | 2026-03-10*
