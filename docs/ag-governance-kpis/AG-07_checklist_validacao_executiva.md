# AG-07 — Checklist de Validação Executiva Final

## Instruções de Uso
Este checklist deve ser utilizado na sessão de homologação com a diretoria. Cada item é **go/no-go**: todos devem estar ✅ para rollout. Um único 🔴 bloqueia o go-live.

---

## 1. Acurácia de KPI

| # | Verificação | Procedimento | Critério Go | Critério No-Go |
|---|-----------|-------------|------------|---------------|
| 1.1 | **SLA — valor coerente com GLPI** | Extrair relatório manual do GLPI para o mesmo período. Comparar com o valor exibido. | Diferença ≤ 2 pontos percentuais | Diferença > 5pp ou direção oposta (GLPI diz 70%, Hub diz 95%) |
| 1.2 | **SLA Virtual — cobertura declarada** | Badge "SLA VIRTUAL" aparece quando tickets sem SLA oficial estão sendo avaliados. | Badge visível + tooltip explicativo funcional | Badge ausente quando deveria estar lá |
| 1.3 | **TMA — média razoável** | Verificar se TMA está dentro de range plausível (1h–100h para mês típico). | Valor plausível + detalhe "Total Analisado" > 10 | TMA = 0h ou > 200h sem explicação |
| 1.4 | **TME — primeira interação** | Abrir um chamado teste, interagir em <1h, verificar se TME reflete. | TME atualiza no próximo ciclo (≤30s) com valor correto | TME não muda ou mostra "Sem dados" |
| 1.5 | **Incidentes — contagem por severidade** | Verificar contagem de incidentes altos/críticos contra painel GLPI. | Diferença ≤ 1 incidente | Diferença > 3 ou classificação invertida |
| 1.6 | **Reincidência — reopens reais** | Reabrir um ticket teste, verificar se % muda. | Contagem detecta reopen corretamente | Reopen não detectado |
| 1.7 | **Volumetria — abertos/fechados** | Comparar com contagem simples no GLPI (filtro por data + DTIC groups). | Diferença ≤ 2 tickets | Diferença > 10 tickets |
| 1.8 | **Mudanças — keyword accuracy** | Criar ticket com "mudança de sala" no título, verificar contagem. | Ticket contado | Ticket não contado |
| 1.9 | **Período — troca funcional** | Alternar entre "Mês Atual" e "Mês Anterior", verificar se valores mudam coerentemente. | Valores mudam de forma coerente | Mesmo valor para todos os períodos |

---

## 2. Confiabilidade da Atualização

| # | Verificação | Procedimento | Critério Go | Critério No-Go |
|---|-----------|-------------|------------|---------------|
| 2.1 | **Polling 30s funcional** | Observar console network: requests periódicos a `/governance/kpis`. | Requests a cada ~30s sem erros | Sem polling ou erros 5xx consecutivos |
| 2.2 | **SSE de documentos** | Adicionar documento via GLPI, verificar atualização automática na tela. | Documento aparece em <5s | Documento não aparece sem refresh manual |
| 2.3 | **Recuperação de erro** | Desligar o backend por 60s, religar. Verificar se frontend recupera. | Frontend exibe erro, depois recupera sozinho | Tela trava ou exige refresh manual |
| 2.4 | **Performance benchmark** | Verificar campo `performance` no response da API. | Nenhum KPI >3s | Qualquer KPI >5s |
| 2.5 | **Fallback graceful** | Se 1 KPI falha, outros devem continuar funcionando. | Card do KPI falho mostra "error" + mensagem; demais normais | Falha de 1 KPI trava todos os cards |

---

## 3. Coerência Visual para Tomada de Decisão

| # | Verificação | Procedimento | Critério Go | Critério No-Go |
|---|-----------|-------------|------------|---------------|
| 3.1 | **Semáforo intuitivo** | Mostrar dashboard para pessoa não-técnica. Pergunta: "Como está o SLA?" | Resposta correta em <5s baseada na cor | Pessoa confusa ou resposta errada |
| 3.2 | **Cross-link funcional** | Clicar "Ver POP" em um KPI, verificar se navega e destaca o POP correto. | Navegação + highlight amarelo 2.5s | Link quebrado ou destaque no item errado |
| 3.3 | **Grafo interativo** | Passar mouse sobre PDTI: conexões com Federal, Estadual, PSI devem iluminar. | Conexões corretas iluminadas; não-relacionados ficam dimmed | Conexões erradas ou sem feedback visual |
| 3.4 | **Thresholds visíveis** | Cada KPI com limites mostra Meta/Alerta/Crítico com valores numéricos. | 3 faixas visíveis com ícones de cor appropriada | Faixas ausentes ou valores errados |
| 3.5 | **Narrativa top-down** | Navegar de Board 0 → Board 1 → Board 2 → Board 3 conta história lógica. | Fluxo natural sem confusão | Usuário perde contexto entre boards |

---

## 4. Segurança / Permissão

| # | Verificação | Procedimento | Critério Go | Critério No-Go |
|---|-----------|-------------|------------|---------------|
| 4.1 | **Acesso autenticado** | Acessar `/governance/kpis` sem token. | Retorna 401 ou dados vazios | Retorna dados completos sem auth |
| 4.2 | **Token injection** | Verificar que token não aparece em URL pública ou logs do servidor. | Token apenas em header Authorization | Token visível em browser history ou server logs |
| 4.3 | **Upload restrito** | Tentar upload de arquivo >50MB ou de tipo executável (.exe). | Rejeitado com mensagem clara | Upload aceito |
| 4.4 | **Delete com confirmação** | Clicar delete em documento: modal de confirmação aparece. | Confirmação obrigatória antes de deletar | Deleta sem confirmação |
| 4.5 | **Escopo de dados** | Verificar que apenas dados dos grupos DTIC (89-92) são retornados. | Dados limitados ao escopo DTIC | Dados de outros departamentos vazam |

---

## 5. Desempenho em Tela Grande

| # | Verificação | Procedimento | Critério Go | Critério No-Go |
|---|-----------|-------------|------------|---------------|
| 5.1 | **Legibilidade a 3m** | Exibir dashboard em TV 55" 1080p. Ler SLA e status a 3 metros. | Texto e semáforo legíveis | Texto ilegível ou cores indistinguíveis |
| 5.2 | **Board 0 sem scroll** | Grafo de governança completo visível sem scrollar. | Todos os 7 nós e conexões visíveis | Nós cortados ou conexões fora da tela |
| 5.3 | **Board 1 — 7 cards visíveis** | Grid de KPIs ativos visível sem scroll excessivo. | Máximo 1 scroll para ver todos os 7 | Mais de 2 scrolls necessários |
| 5.4 | **Refresh sem flicker** | Auto-refresh a cada 30s não causa "piscar" da tela. | Transição suave (fade-in) | Tela inteira recarrega visivelmente |
| 5.5 | **CPU em idle** | Após load, CPU do browser deve estabilizar. | CPU < 5% em idle | CPU > 20% constante (leak ou re-render em loop) |

---

## Resumo Go/No-Go

| Dimensão | Total Itens | Mínimo para Go |
|---------|------------|----------------|
| Acurácia de KPI | 9 | 9/9 (todos obrigatórios) |
| Confiabilidade | 5 | 5/5 (todos obrigatórios) |
| Coerência Visual | 5 | 4/5 (3.4 pode ser waiver) |
| Segurança | 5 | 5/5 (todos obrigatórios) |
| Tela Grande | 5 | 4/5 (5.3 pode aceitar 2 scrolls) |

**Resultado:**
- ✅ **GO** se todas as dimensões atingem o mínimo
- 🔴 **NO-GO** se qualquer dimensão obrigatória falha

---

## Assinaturas de Homologação

| Papel | Nome | Data | Resultado |
|-------|------|------|----------|
| Diretor DTIC | _________________ | ____/____/____ | ⬜ GO / ⬜ NO-GO |
| Responsável Técnico | _________________ | ____/____/____ | ⬜ GO / ⬜ NO-GO |
| QA / Validação | _________________ | ____/____/____ | ⬜ GO / ⬜ NO-GO |
