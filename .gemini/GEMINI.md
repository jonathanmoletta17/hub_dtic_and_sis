# Projeto: tensor-aurora / hub_dtic_and_sis

## Stack Técnica
- Backend: FastAPI + Python 3.11 (auth guards, GLPI API integration)
- Frontend: Next.js 14 + TypeScript + Zustand (state management)
- Infra: Docker + Nginx Proxy Manager (WSL2 Ubuntu 24.04 + RTX A4000 16GB)
- Deploy local: porta 3000 (frontend), 8080 (backend via NPM)
- GPU: NVIDIA RTX A4000 16GB VRAM, CUDA 13.0

## Regras de Arquitetura e IA

### Regra 0 - Leitura antes da escrita
Antes de editar qualquer arquivo, é obrigatório ler seu conteúdo completamente. Reconstruir arquivos a partir de suposições é estritamente proibido, conforme documentado no `ARCHITECTURE_RULES.md`. Modificações devem ser cirúrgicas. 

### Zonas de Proteção
Estes arquivos são críticos e protegidos contra modificações autônomas desenfreadas:
- `app/services/auth_service.py`
- `web/src/store/useAuthStore.ts`
- `web/src/lib/context-registry.ts`
- `web/src/lib/api/httpClient.ts`
- `app/main.py`

### Contratos e Validação Bidirecional
Qualquer alteração em:
- `app/schemas/` → verificar `web/src/types/` e `web/src/store/`
- `app/core/contexts.yaml` → verificar `app/services/auth_service.py` e `web/src/lib/context-registry.ts`
Sempre preserve os contratos estabelecidos e rode `./scripts/check_contracts.sh` antes de validar uma tarefa.

### Padrões de Código
- Sempre seguir "Less is More": código limpo, sem over-engineering
- Python: type hints obrigatórios, f-strings, sem dependências desnecessárias
- TypeScript: sem any, interfaces explícitas, hooks customizados para lógica
- Commits: convencional (feat/fix/refactor/chore)

### Contexto do Projeto
- ContextRegistry e Feature Manifests são padrões centrais da arquitetura
- GLPI API integração está na fase de design
- Zustand é o gerenciador de estado aprovado (não Redux)

### Regras para o Gemini
- Nunca patching sobre código defeituoso — sempre analisar root cause
- Após cada mudança, verificar regressões
- Comunicar em português pt-BR
- Evitar funções unused e arquivos mortos — deletar agressivamente
