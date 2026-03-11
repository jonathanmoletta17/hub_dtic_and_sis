# Correção: Categorias Duplicadas na Tela de Novo Chamado

## Contexto do Problema
A tela de "Novo Chamado" exibe categorias duplicadas e duas categorias novas ("Conservação" e "Manutenção") que antes não apareciam. A análise completa está documentada em [analise_categorias_duplicadas.md](file:///c:/Users/jonathan-moletta/.gemini/antigravity/brain/c226dfc7-86b1-4966-984e-422816c8f061/analise_categorias_duplicadas.md).

**Causa raiz:** O GLPI Formcreator retorna categorias com `completename` hierárquico (ex: `"Manutenção > Manutenção"`), e o frontend agrupa por `categoryId` numérico sem deduplicar por nome. Aliado a isso, um fallback estático com dados hardcoded ("Manutenção", "Conservação", "Checklists") pode ser ativado quando a API falha ou retorna zero formulários — injetando categorias "fantasma" que nunca existiram na API real.

---

## User Review Required

> [!IMPORTANT]
> **Decisão sobre o FALLBACK_CATALOG:** Proponho **remover** completamente o catálogo estático de fallback e o mock de schema. Se o backend estiver indisponível, a tela mostrará uma mensagem de erro informativa em vez de dados fictícios. Isso garante que o usuário **nunca** veja categorias que não existem no GLPI.

> [!WARNING]
> **Sobre "Conservação" e "Manutenção":** Essas categorias estão aparecendo porque o GLPI Formcreator do SIS **realmente possui** essas categorias de formulário. O frontend antigamente pode ter escondido elas via lógica de filtragem ou o fallback estático as mascarava. A correção fará apenas as categorias reais da API serem exibidas, com nomes simplificados (sem duplicação).

---

## Proposed Changes

### Component: Frontend — Catálogo de Serviços

#### [MODIFY] [useServiceCatalog.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/hooks/useServiceCatalog.ts)

**Objetivo:** Eliminar duplicação de categorias e remover fallback estático.

1. **Remover `FALLBACK_CATALOG`** (linhas 70-99) — 30 linhas de dados hardcoded com categorias fictícias
2. **Alterar lógica de fallback** (linha 141): em vez de `if (forms.length === 0) return FALLBACK_CATALOG`, retornar array vazio `[]`
3. **Limpar `groupName`**: quando `completename` contém repetição (`"Manutenção > Manutenção"`), extrair apenas o último segmento para evitar nomes confusos
4. **Manter** `SERVICE_ICON_MAP` e `CATEGORY_ICON_MAP` — continuam úteis, pois o Formcreator não fornece ícones nativos nas categorias

**Código obsoleto removido:** `FALLBACK_CATALOG` (30 linhas)

---

#### [MODIFY] [useFormSchema.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/hooks/useFormSchema.ts)

**Objetivo:** Remover schema mockado e melhorar tratamento de erro.

1. **Remover [buildMockSchema()](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/hooks/useFormSchema.ts#210-275)** (linhas 210-274) — 65 linhas de schema fictício
2. **Alterar o bloco catch** (linhas 63-71): em vez de cair no mock, propagar o erro para o componente exibir uma mensagem de indisponibilidade
3. **Remover fallback hardcoded**: `'sis-manutencao'` (linha 49) — se `activeContext` for null, não deveria tentar buscar schema

**Código obsoleto removido:** [buildMockSchema()](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/hooks/useFormSchema.ts#210-275) (65 linhas)

---

#### [MODIFY] [ReviewStep.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/modules/tickets/components/wizard/ReviewStep.tsx)

**Objetivo:** Remover fallback hardcoded.

1. **Remover fallback** `'sis-manutencao'` (linha 47): substituir por guard — se `activeContext` for null, desabilitar submit

---

### Component: Frontend — ServiceSelector (Sem alteração estrutural)

#### [MODIFY] [ServiceSelector.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/modules/tickets/components/wizard/ServiceSelector.tsx)

**Objetivo:** Melhorar UX quando catálogo está vazio por erro do backend.

1. **Ajustar mensagem de estado vazio**: quando `filteredCatalog.length === 0` e não há busca ativa, mostrar "Serviço indisponível. Tente novamente em alguns instantes." ao invés de mensagem de busca

---

### Component: Backend — SEM ALTERAÇÕES

O backend ([domain_formcreator.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/routers/domain_formcreator.py)) funciona corretamente. Ele já retorna apenas categorias e formulários ativos/visíveis da instância GLPI correta. O problema é exclusivamente de agrupamento e exibição no frontend.

---

## Resumo de Código Obsoleto a Remover

| Arquivo | Linhas | O que será removido | Motivo |
|---|---|---|---|
| [useServiceCatalog.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/hooks/useServiceCatalog.ts) | 70-99 | `FALLBACK_CATALOG` (30 linhas) | Dados fictícios que causam categorias fantasma |
| [useFormSchema.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/hooks/useFormSchema.ts) | 210-274 | [buildMockSchema()](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/hooks/useFormSchema.ts#210-275) (65 linhas) | Schema mockado que mascara erros reais |

**Total: ~95 linhas de código morto a serem removidas.**

---

## Verification Plan

### Testes Automatizados

Os seguintes testes existentes devem passar sem regressão:

```bash
# No diretório web/
cd c:\Users\jonathan-moletta\.gemini\antigravity\playground\tensor-aurora\web
npx vitest run
```

Testes existentes que serão validados:
- [src/lib/context-registry.test.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/lib/context-registry.test.ts) — Valida que contextos `dtic`, `sis`, `sis-manutencao`, `sis-memoria` continuam resolvidos corretamente
- [src/__tests__/menu.test.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/__tests__/menu.test.ts) — Valida que o `new-ticket` continua como primeiro item do menu

### Verificação Manual (Browser)

1. **Iniciar a aplicação** (`npm run dev` no diretório `web/`)
2. **Fazer login** e navegar para o contexto **SIS** (qualquer sub-contexto: sis, sis-manutencao, sis-memoria)
3. **Acessar "Novo Chamado"** e verificar:
   - ✅ Categorias **não** estão duplicadas
   - ✅ Nomes das categorias são limpos (sem repetição como "Manutenção > Manutenção")
   - ✅ As categorias exibidas correspondem exatamente ao que existe no GLPI Formcreator
4. **Simular backend offline** (parar o backend e recarregar a tela):
   - ✅ Deve exibir mensagem de erro informativa ao invés de categorias fictícias
   - ✅ NÃO deve aparecer "Manutenção", "Conservação" ou "Checklists" como fallback

### Validação de Build

```bash
# Garantir que o projeto compila sem erros
cd c:\Users\jonathan-moletta\.gemini\antigravity\playground\tensor-aurora\web
npx next build
```
