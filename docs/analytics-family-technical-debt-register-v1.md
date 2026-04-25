# Analytics Family Technical Debt Register v1

## Escopo

Este registro consolida a divida tecnica residual da familia `analytics` apos o piloto do hub e o rollout dos dashboards standalone:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web`
- `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi`
- `C:\Users\jonathan-moletta\code\dashboard-sis-manutencao`
- `C:\Users\jonathan-moletta\code\dashboard-sis-conservacao`

## Debitos resolvidos nesta rodada

### 1. Vulnerabilidade direta de Next.js

- status anterior: `next` em faixa vulneravel (`16.1.6` no hub e `16.2.1` nos dashboards)
- acao: bump de `next` e `eslint-config-next` para `16.2.3`
- resultado:
  - dashboards com `npm audit` zerado
  - hub `web` com `npm audit` zerado

### 2. Lint contaminado por artefato gerado

- status anterior: os dashboards SIS deixavam `eslint` inspecionar `storybook-static`
- acao:
  - ajuste de `eslint.config.mjs`
  - alinhamento de `.gitignore`
  - limpeza automatica no script `validate-analytics-family.ps1`
- resultado: validacao consolidada verde sem sujeira residual

### 3. Dossie do piloto DTIC com encoding inconsistente

- status anterior: texto com mojibake em secoes de validacao e governanca
- acao: reescrita integral do documento em ASCII limpo
- resultado: evidencia e leitura do piloto ficaram consistentes

### 4. Flakiness no smoke apos rebuild Docker

- status anterior: o validador consolidado podia chamar o smoke Playwright cedo demais e pegar `ERR_EMPTY_RESPONSE`
- acao: inclusao de `Wait-ForHttpReady` em `validate-analytics-family.ps1` antes do smoke
- resultado: a rodada consolidada voltou a fechar verde com Docker nos tres dashboards

### 5. Ausencia de mecanismo de sincronizacao da base estrutural

- status anterior: a familia detectava drift com guardrail, mas ainda dependia de patches manuais repo-a-repo para corrigir a base comum
- acao:
  - criacao de `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\scripts\analytics-family.config.psd1`
  - criacao de `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\scripts\analytics-family.common.ps1`
  - criacao de `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\scripts\sync-analytics-family.ps1`
  - manutencao do `assert-analytics-family-sync.ps1` como prova posterior a sincronizacao
- resultado:
  - a familia ganhou um gerador interno local, sem shared package
  - `package.json` dos dashboards SIS voltou a ficar alinhado e legivel
  - `validate-analytics-family.ps1 -IncludeDocker` permaneceu verde apos a introducao do gerador

## Divida tecnica residual

### A. Refinamento visual residual por dominio na familia `analytics`

- prioridade: media
- impacto: a familia agora tem gramatica visual institucional compartilhada, mas ainda existem blocos de dominio que pedem uma segunda passada para ganhar mais clareza operacional
- status atual:
  - command bar, KPI row, rail lateral, ranking inferior e fundacao visual ja foram implantados e validados nos tres dashboards
  - a divida principal de identidade fraca da familia deixou de ser o problema dominante
  - uma segunda passada local nos painois centrais tambem ja foi implantada e revalidada com `validate-analytics-family.ps1 -IncludeDocker`
  - uma passada editorial adicional de legibilidade tambem ja foi implantada em `TopListPanel`, `TechnicianRankingStrip`, `NewTicketsPanel` e tipografia compartilhada do modo claro
- sintomas residuais:
  - ainda existe margem para um refinamento de densidade no dashboard DTIC, principalmente na leitura dos blocos do painel principal em light mode
  - o ranking inferior pode receber refinamento editorial adicional se a familia quiser uma assinatura ainda mais forte, sem reabrir a estrutura atual
  - qualquer nova passada deve ser tratada como polimento, nao como reabertura da fundacao compartilhada
- referencia:
  - `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\docs\13-analytics-family-visual-identity-v1.md`
- proximo passo recomendado:
  - tratar os painois centrais de dominio como refinamento local controlado
  - preservar a gramatica de familia ja implantada
  - evitar reabrir a fundacao visual sem evidencia nova de regressao

### B. Duplicacao de stack entre os tres dashboards

- prioridade: media
- impacto: mudancas de tooling ainda exigem patch repo-a-repo
- evidencias:
  - dependencias e scripts equivalentes em tres `package.json`
  - configs de Storybook, Playwright e Docker mantidas em paralelo
- mitigacao ja implantada:
  - `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\scripts\assert-analytics-family-sync.ps1`
  - `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\scripts\sync-analytics-family.ps1`
  - `C:\Users\jonathan-moletta\code\dashboard-dtic-glpi\scripts\validate-analytics-family.ps1` agora falha antes dos gates por repo se houver drift estrutural
- proximo passo recomendado:
  - manter o gerador interno como mecanismo oficial de convergencia desta familia
  - reavaliar shared package apenas se a duplicacao atravessar o limite de dashboards e passar a afetar outras familias

### C. Warning de chunk grande no build do Storybook

- prioridade: baixa
- impacto: ruido operacional e tempo de build, sem bloqueio atual
- evidencias:
  - aviso recorrente do Vite sobre bundles acima de `500 kB`
  - `iframe` e `axe` aparecem como principais pesos nas rodadas de `storybook build`
- proximo passo recomendado:
  - revisar necessidade de addons ativos em todos os repos
  - medir custo real antes de mexer em chunk splitting

### D. Workspace do hub sem controle Git local na raiz usada pela sessao

- prioridade: baixa
- impacto: nao bloqueia execucao, mas reduz rastreabilidade local nesta sessao
- evidencia:
  - `Test-Path C:\Users\jonathan-moletta\code\hub-operacional-web\.git` retornou `False`
- proximo passo recomendado:
  - confirmar se o versionamento do hub esta acima desta pasta ou fora do espaco atual
  - nao tratar como bug de produto; tratar como decisao operacional de workspace

## Criterio de fechamento desta rodada

Uma nova rodada so deve reabrir esta lista se houver:

- regressao em `npm audit`
- volta de artefato gerado contaminando `lint`
- divergencia de scripts/configs entre os dashboards da familia
