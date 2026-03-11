# Relatório Técnico: Investigação de Categorias Duplicadas e Comportamentos Inconsistentes

## 1. Visão Geral
Este relatório detalha a análise técnica realizada para identificar a causa da duplicação de categorias na tela de "Novo Chamado" e o surgimento inesperado das categorias **"Manutenção"** e **"Conservação"**. Todo o processo foi realizado em modo de apenas leitura, respeitando a premissa de não alteração de código.

---

## 2. Resultados da Análise

### A. Mecanismo de Fallback (Frontend)
Identificamos no arquivo [web/src/hooks/useServiceCatalog.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/hooks/useServiceCatalog.ts) a existência de um catálogo estático (`FALLBACK_CATALOG`) que contém exatamente as categorias citadas:
- **"Manutenção"** (ID: -1)
- **"Conservação"** (ID: -2)
- **"Checklists"** (ID: -3)

**Evidência:** Se a API do backend falhar ou retornar zero formulários, o hook [useServiceCatalog](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/hooks/useServiceCatalog.ts#103-189) injeta automaticamente esses dados mockados para garantir que a tela não fique vazia. 
> [!IMPORTANT]
> O surgimento dessas categorias pode indicar uma falha momentânea de comunicação com o backend ou a ausência de formulários ativos no contexto selecionado.

### B. Normalização de Contextos (Backend)
No backend ([app/core/session_manager.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/session_manager.py)), sub-contextos como `sis-manutencao` e `sis-memoria` são normalizados para o contexto base `sis`.
- O [SessionManager](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/core/session_manager.py#18-103) utiliza o `registry.get_base_context(context)` para buscar as credenciais.
- Isso significa que, ao listar categorias, o sistema consulta a base do SIS de forma ampla.

### C. Duplicidade de Nomes no GLPI
Analisando o dump de dados do GLPI ([glpi_dump.md](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/glpi_dump.md)), notamos que existem entidades/categorias com nomes idênticos em diferentes níveis ou instâncias:
- **SIS Instance (ID: 24, 25, 26):** 
    - Departamento de Manutenção e Conservação...
    - Divisão Conservação (ID 25)
    - Divisão Manutenção (ID 26)
- **DTIC Instance (ID 74, 83, 84):**
    - Departamento de Manutenção e Conservação...
    - Divisão Manutenção (ID 83)
    - Divisão Conservação (ID 84)

Como o frontend ([useServiceCatalog.ts](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/hooks/useServiceCatalog.ts)) agrupa itens pelo `completename` ou `name` vindo da API, se o GLPI retornar duas categorias chamadas "Manutenção" (mesmo com IDs diferentes), o catálogo as mostrará como grupos separados se os formulários estiverem vinculados a IDs distintos.

---

## 3. Conclusões sobre o Comportamento

1.  **Por que as categorias estão duplicadas?**
    O agrupamento no frontend é feito por `categoryId`. Se existirem duas categorias com o mesmo nome no GLPI (ex: uma categoria "Manutenção" pai e uma subcategoria também chamada "Manutenção"), elas aparecerão como dois grupos no catálogo do Hub.

2.  **O que mudou para aparecerem "Conservação" e "Manutenção"?**
    Existem duas hipóteses validadas:
    - **Cenário de Erro:** O backend não retornou dados e o sistema ativou o `FALLBACK_CATALOG` definido no frontend.
    - **Cenário de Contexto:** O usuário mudou para um contexto (ex: `sis-manutencao`) que, após a normalização no backend, passou a enxergar categorias que antes estavam ocultas ou filtradas por outras regras de visibilidade no GLPI.

3.  **Inconsistência vs. Funcionamento Anterior:**
    Anteriormente, o sistema talvez estivesse operando sob um contexto mais restrito ou com o backend 100% estável (evitando o fallback). A introdução de novos perfis ou grupos técnico/gestor pode ter ampliado a visão do `Formcreator` via API, trazendo categorias "irmãs" que possuem o mesmo nome mas IDs diferentes no GLPI.

---

## 4. Próxima Etapa: Reflexão
Com base nestas evidências, estamos prontos para iniciar o processo de reflexão para entender em qual momento da evolução do código essas proteções de filtragem ou estabilidade de backend foram mitigadas.
