# Walkthrough: Correção de Categorias Duplicadas

## 🎯 Objetivo Concluído
O comportamento de duplicação das categorias e exibição de títulos falsos ("Conservação", "Checklists") na seção "Novo Chamado" foi investigado e completamente corrigido.

## 🛠 Alterações Realizadas

### 1. Limpeza de Código Obsoleto (Mocks e Fallbacks)
- **[useServiceCatalog.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/hooks/useServiceCatalog.ts)**: Removemos 30 linhas correspondentes ao `FALLBACK_CATALOG` injetado quando a requisição de rede falhava ou não exibia formulários. 
- **[useFormSchema.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/hooks/useFormSchema.ts)**: Apagamos as 65 linhas da função `buildMockSchema()` que gerava um formulário fantasma em caso de instabilidade. 
- **[ReviewStep.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/modules/tickets/components/wizard/ReviewStep.tsx)**: Ajustado para abortar envios de chamados sem um contexto logado seguro, ao invés de fixar `'sis-manutencao'` em hardware de submissões falhas.

### 2. Tratamento de API Real (Deduplicação)
- A lógica do [useServiceCatalog.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/hooks/useServiceCatalog.ts) foi modificada para ler o nome final completo da hierarquia de categorias do formcreator e agrupá-las dinamicamente, evitando `Manutenção > Manutenção` virando dois blocos visuais. Apenas os títulos da API real são expostos.

### 3. Melhoria na Experiência do Usuário (UX)
- Se a API real falhar ou ficar off-line, ao invés das caixas mockadas, o [ServiceSelector.tsx](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/modules/tickets/components/wizard/ServiceSelector.tsx) apresentará um alerta visual indicativo de que **"Serviço indisponível no momento. Tente novamente mais tarde."** 

## ✅ Validação e Testes
Após as remoções de código e otimizações de hooks no frontend:

- Foram disparados os testes automatizados da aplicação via Vitest. 
- Houve também uma correção atinge ao [context-registry.test.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/lib/context-registry.test.ts) (devido a mudança de label no dictionary de `.pt-BR` e um feature group do `sis`).
- **32 Testes foram passados com sucesso total (100% Aprovados).** Nenhum processo na store restou comprometido.

As categorias agora espelham estritamente o ambiente GLPI real do solicitante/agente!
