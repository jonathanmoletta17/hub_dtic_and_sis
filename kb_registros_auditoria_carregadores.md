# Knowledge Base — Registros: Auditoria Dashboard Carregadores
# Data: 2026-03-10 | Origem: auditoria_dashboard_carregadores_md.resolved
# Instrução: Cole cada bloco JSON individualmente no modal ⬡ IMPORT da Knowledge Base.
# O campo [ANÁLISE_INTERNA] pode ser omitido na importação manual — use os JSONs diretamente.

================================================================================
REGISTRO 1 — SOLUTION
================================================================================

{
  "type": "SOLUTION",
  "title": "Dashboard de Carregadores — Auditoria E2E completa, 8 partes validadas",
  "status": "VALIDADA",
  "tags": ["dashboard-carregadores", "auditoria-e2e", "swr", "glpi-mysql", "kanban", "charger-service", "sis"],
  "fields": {
    "problem_description": "O Dashboard de Carregadores nunca havia sido auditado de forma estruturada. Não havia evidência formal de funcionamento real de nenhuma das suas camadas — frontend, hook de dados, serviço HTTP, router backend, queries SQL ou comandos GLPI.",
    "root_cause_confirmed": "Ausência de processo de validação estruturada. A aplicação foi desenvolvida de forma incremental sem registro de evidências por camada.",
    "solution_applied": "Auditoria completa realizada via metodologia P02 (Mapeamento + Plano de Evidências).\n\nPARTES VALIDADAS:\n1. View Orquestradora (page.tsx) — loading state, relógio, stat cards, kanban 3 colunas\n2. useChargerData Hook — stats derivados corretos, SWR keys condicionais por contexto, keepPreviousData ativo\n3. chargerService.ts — tratamento dual RankingResponse/array nativo, verificação de permissão local pré-dispatch\n4. Backend Router + Auth Guard — rate limiter 30/min, guard de contexto sis, verify_session com 3 fontes de token\n5. Read Queries MySQL — 8 SQLs sem injection (text() + parâmetros nomeados), tabela plugin correta, categorias ITIL fixas\n6. Write Commands GLPI API — guard de duplicata em assign, bloco Fields injetado em create, soft delete seguro\n7. TicketDetailModal — dados reais do Ticket #6923, 10 carregadores disponíveis com checkboxes\n8. Modal de Gestão Rápida — lista 8+ carregadores, busca/filtro, Selecionar Todos\n\nESTADO VERIFICADO EM RUNTIME:\n- Relógio: 04:23:31 com Oper. Encerrada (correto fora do expediente)\n- Stat Cards: 10 Disponíveis | 0 Ocupados | 0 Offline | 10 Total\n- Kanban: Disponíveis (10), Em Atendimento (0), Aguardando Atribuição (6 demandas)\n- Ranking: 8 carregadores com posição, histórico e total de horas",
    "why_it_works": "A arquitetura segue fluxo unidirecional claro: autenticação via ContextGuard → SWR polling → chargerService → FastAPI router → MySQL (leitura) / GLPI PHP API (escrita). Cada camada tem responsabilidade única e contratos bem definidos. O SWR com keepPreviousData evita flicker. O soft delete e o guard de duplicata protegem integridade dos dados GLPI.",
    "prevention": "Para novos módulos satélite do Hub, seguir o mesmo processo de auditoria P02 antes de considerar o módulo estável:\n1. Mapear partes lógicas com fluxo de dados explícito\n2. Validar cada parte com evidência E2E (screenshot, payload, log)\n3. Registrar achados na Knowledge Base independente do status (✅ ou ⚠️)\nReferência: prompt_auditoria_dash_carregadores.md",
    "related_incident_id": "NÃO IDENTIFICADO NO TEXTO"
  }
}

================================================================================
REGISTRO 2 — INCIDENT (achado aberto — auth_guard)
================================================================================

{
  "type": "INCIDENT",
  "title": "auth_guard.py valida apenas presença do token, não integridade contra GLPI",
  "status": "ABERTO",
  "tags": ["auth-guard", "seguranca", "token-validation", "glpi-session", "fastapi", "backend"],
  "fields": {
    "symptom": "O endpoint de autenticação do backend aceita qualquer string como token válido. A verificação em auth_guard.py (L51) apenas confirma que o campo não está vazio — não há chamada ao GLPI para validar se o token ainda é ativo ou se foi emitido legitimamente. Um token expirado, revogado ou fabricado passa pelo guard sem rejeição.",
    "error_code": "Sem erro visível em runtime. Falha silenciosa de segurança. Comentário no código L51: 'verificação simplificada: token existe = válido'",
    "hypotheses": "H1: Token expirado ainda passa no auth_guard → proteção real só ocorre quando GLPIClient é instanciado downstream — risco se endpoint futuro não instanciar o cliente\nH2: Token inventado/forjado passa no guard → mesma dependência downstream\nH3: Janela de vulnerabilidade entre revogação no GLPI e próxima tentativa de uso do token no backend",
    "root_cause": "CONFIRMADO — Decisão de simplificação no auth_guard.py. A proteção real está delegada ao get_user_glpi_session() que instancia GLPIClient com o token — se inválido, o cliente GLPI falha. Porém, essa proteção é implícita e dependente de todos os endpoints seguirem o mesmo padrão de instanciar o cliente. Qualquer endpoint que use verify_session mas não instancie GLPIClient ficaria exposto.",
    "investigation_log": "Identificado durante auditoria E2E do Dashboard de Carregadores (2026-03-10)\nArquivo: app/core/auth_guard.py linha 51\nVerificação: comentário no próprio código confirma a simplificação intencional\nImpacto atual: baixo — todos os endpoints críticos instanciam GLPIClient\nRisco futuro: médio — padrão frágil que pode quebrar com expansão do backend"
  }
}

================================================================================
REGISTRO 3 — ADR (decisão consciente — categorias hardcoded)
================================================================================

{
  "type": "ADR",
  "title": "Categorias ITIL hardcoded no charger_queries.py como constante de domínio",
  "status": "ACEITO",
  "tags": ["charger-queries", "categorias-itil", "hardcoded", "glpi-mysql", "decisao-arquitetural"],
  "fields": {
    "context": "As queries SQL do Dashboard de Carregadores precisam filtrar tickets por categoria ITIL para identificar demandas de carregadores no GLPI. As categorias relevantes são: 55, 56, 57, 58, 101, 102, 103. Essas categorias foram mapeadas manualmente no GLPI da instituição e representam os tipos de solicitação do domínio de carregadores.",
    "decision": "Os IDs de categoria ITIL foram fixados diretamente no charger_queries.py como constante de domínio (tupla Python na cláusula IN do SQL). Não há lookup dinâmico ao GLPI nem tabela de configuração separada.",
    "alternatives_rejected": "Lookup dinâmico via API GLPI a cada request → rejeitado por latência adicional e dependência de disponibilidade da API em toda leitura\nTabela de configuração no banco local → rejeitado por complexidade desnecessária dado que as categorias são estáveis no ambiente institucional\nVariável de ambiente → rejeitado porque os IDs são dados de domínio do negócio, não configuração de infraestrutura",
    "consequences": "Acoplamento forte entre o código e os IDs do GLPI desta instância específica. Se as categorias forem renumeradas ou migradas no GLPI, o código precisará ser atualizado manualmente. Considerado aceitável dado o contexto institucional estável. Ponto de atenção obrigatório em qualquer migração de GLPI ou reindexação de categorias."
  }
}

================================================================================
REGISTRO 4 — PATTERN (padrão recorrente — configurações mock/hardcoded)
================================================================================

{
  "type": "PATTERN",
  "title": "Configurações de domínio implementadas como mock estático antes da feature completa",
  "status": "CONFIRMADO",
  "tags": ["mock-hardcoded", "tech-debt", "global-schedule", "operation-settings", "padrao-recorrente"],
  "fields": {
    "trigger_conditions": "Feature de configuração dinâmica ainda não implementada\nValor de domínio precisa existir para o sistema funcionar (não pode ser null)\nDecisão de entregar funcionalidade parcial antes de construir o CRUD de configuração",
    "frequency": "Identificado em pelo menos 2 pontos do Dashboard de Carregadores:\n1. Global schedule retorna 08:00-18:00 hardcoded (chargers.py L100-103)\n2. OperationSettings com campos duplicados camelCase + snake_case (types/charger.ts L32-38)\nPadrão provável em outros módulos do Hub em desenvolvimento incremental.",
    "standard_response": "1. Identificar todos os pontos hardcoded no módulo via busca no código ('hardcoded', 'TODO', 'mock', valores literais de horário/ID)\n2. Registrar cada ponto como INCIDENT com severidade Info na Knowledge Base\n3. Criar ADR para os que representam decisão consciente de adiar\n4. Priorizar no roadmap: global schedule é o próximo candidato a feature real\n5. Para OperationSettings: consolidar campos duplicados em snake_case (padrão do restante da codebase) em refatoração de limpeza",
    "related_solutions": "NÃO IDENTIFICADO NO TEXTO"
  }
}
