# Matriz de Dívida Técnica

Data-base: 2026-03-15

| ID | Domínio | Dívida | Comportamento atual | Risco | Impacto no usuário | Custo estimado | Prioridade | Ação recomendada |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TD-01 | Auth / Session | `activeView` definido por tela | páginas `dashboard` e `user` ajustam a visão operacional manualmente | Alto | papel ativo pode divergir da identidade real em fluxos mais complexos | Médio | P1 | substituir por modelo de identidade ativa derivado de papel/contexto |
| TD-02 | Auth / Session | múltiplas fontes de verdade de sessão | cookie, store, cache por contexto e tokens coexistem | Alto | regressões sutis em reload, troca de contexto e autorização | Médio | P1 | consolidar política de sessão e responsabilidades do store |
| TD-03 | Frontend API | coexistência entre `types.ts` e contratos por domínio | parte da UI usa modelos novos, parte ainda depende de façade legada | Médio | inconsistência de tipos e adaptação duplicada | Médio | P1 | transformar `types.ts` em compat layer temporária e desmontá-la por domínio |
| TD-04 | Frontend Infra | centralização excessiva em `httpClient.ts` | resolução de base, normalização de contexto e token injection no mesmo módulo | Médio | mudanças nessa peça têm blast radius global | Médio | P2 | manter estável agora; extrair política de sessão/contexto na próxima onda |
| TD-05 | Backend Platform | ordem dos routers é arquitetural | rotas específicas precisam vir antes do catch-all | Médio | regressão potencial ao adicionar novas rotas | Baixo | P2 | documentar regra e isolar melhor a superfície genérica |
| TD-06 | GLPI Integration | endpoints genéricos ainda existem no backend | `items.py` continua como infraestrutura de escape hatch | Alto | expansão indevida desse contrato pode reabrir acoplamento na UI | Baixo | P1 | manter interno e proibir expansão para consumo direto da UI |
| TD-07 | FormCreator | schema bruto muito elástico | backend e frontend ainda lidam com `Any`, `Dict` e heurísticas de lookup/layout | Alto | maior chance de regressão em formulários reais | Alto | P1 | endurecimento incremental do schema e redução de heurísticas no renderer |
| TD-08 | FormCreator | modelo interno ainda depende de shape histórico | `form-schema.ts` concentra o shape do renderer | Médio | atrito para evolução controlada do wizard | Médio | P2 | convergir schema interno com contratos explícitos por etapas |
| TD-09 | Admin / Permissões | domínio fora do padrão final de contratos | tipado, mas não totalmente alinhado ao modelo novo | Baixo | baixa visibilidade para o usuário final | Médio | P3 | migrar depois de sessão/contexto e FormCreator |
| TD-10 | Repo / Processo | fronteira de entrega ruidosa | docs, prompts, relatórios e artefatos convivem com código de produto | Médio | leitura arquitetural mais cara e revisões menos previsíveis | Baixo | P2 | separar documentação viva, histórico e material operacional |
| TD-11 | Backend Modularidade | fronteiras mais conceituais que estruturais | `main.py` ainda coordena muitos domínios diretamente | Médio | manutenção cresce com novas superfícies | Médio | P2 | explicitar bounded contexts sem quebrar o monólito |
| TD-12 | Lookups | domínio já extraído, mas dependente de áreas frágeis | suporta FormCreator e modais críticos | Baixo | falhas nesse ponto afetam vários fluxos | Baixo | P3 | manter e apenas consolidar contrato ao redor do FormCreator |

## Priorização Consolidada

### P1
- TD-01
- TD-02
- TD-03
- TD-06
- TD-07

### P2
- TD-04
- TD-05
- TD-08
- TD-10
- TD-11

### P3
- TD-09
- TD-12

## Leitura da Matriz
- `P1`: entra nas próximas ondas executáveis.
- `P2`: deve ser planejado e atacado depois de estabilizar as fontes de verdade principais.
- `P3`: backlog controlado, sem urgência operacional.

## Decisão de Encaminhamento
A próxima fase de implementação não deve tentar resolver tudo. A ordem correta é:

1. Sessão, contexto e identidade.
2. Convergência final de contratos no frontend.
3. Endurecimento progressivo do FormCreator.
4. Ajustes de modularidade interna e limpeza de fronteira/processo.
