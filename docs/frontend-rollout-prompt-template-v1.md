# Frontend Rollout Prompt Template v1

## Objetivo

Este arquivo e um prompt operacional pronto para reaplicar o workflow visual validado no hub em outro repositorio da Casa Civil RS.

Use este prompt quando o alvo for:

- dashboard
- buscador
- portal
- hub
- modulo de atendimento

Nao use este prompt para:

- alterar backend
- mudar autenticacao
- migrar stack
- redesenhar fluxo de produto sem pedido explicito

## Prompt pronto para uso

```text
Use o workflow validado no hub operacional como referencia canonica desta rodada.

Antes de alterar qualquer coisa:
1. Leia as instrucoes locais do repo.
2. Identifique a stack real do projeto e a URL/runtime canonica.
3. Trate `DTIC_SYSTEM_PROMPT_V2.md` como doutrina de produto e design, nao como contrato literal de stack.
4. Registre explicitamente que nesta fase nao havera migracao de stack.

Hierarquia de verdade desta execucao:
- produto/design: `DTIC_SYSTEM_PROMPT_V2.md`
- contrato tecnico: stack real do repo alvo
- processo de revisao visual: workflow Storybook primeiro, baseline local depois, runtime real por ultimo
- Figma: somente leitura nesta fase

Regras obrigatorias:
- nao alterar contratos backend/auth
- nao redesenhar fluxo funcional sem pedido explicito
- nao usar patch superficial de cor hardcoded
- nao fechar mudanca visual relevante sem story correspondente
- nao depender de escrita no Figma
- se nao houver arquivo Figma fornecido para a superficie, registrar `sem fonte Figma para comparacao`

Execute nesta ordem:

1. Diagnostico sem mutacao
- mapear as superficies tocadas
- listar problemas visuais reais
- identificar o menor componente coerente para Storybook

2. Extracao apresentacional
- quando necessario, extrair a camada visual minima para um componente reutilizavel
- manter a logica de pagina, auth, fetch e roteamento onde ja estao
- evitar story de pagina inteira quando houver dependencia forte de runtime

3. Storybook
- criar ou ajustar stories reais, nao cenograficas
- cobrir light e dark
- cobrir loading, error ou empty quando houver impacto visual real

4. Implementacao
- aplicar os ajustes no componente real
- manter consistencia com tokens, contraste e hierarquia visual do ecossistema

5. Validacao local
- `npm run lint`
- `npm run build`
- `npm run storybook:test`
- `npm run storybook:visual`
- se houver novos snapshots intencionais: `npm run storybook:visual:update` antes do `storybook:visual`

6. Validacao runtime
- rebuildar o runtime real da aplicacao
- validar a URL canonica final
- rodar smoke/E2E do repo quando existirem

7. Fechamento
- informar arquivos alterados
- informar stories criadas/ajustadas
- informar comandos executados
- informar URL validada
- informar riscos residuais

Saida esperada:
- nenhuma alteracao visual depende de revisao “no olho” sem story
- nenhuma decisao exige migracao de stack
- nenhuma parte depende de escrita no Figma
- light/dark e runtime real fecham verdes
```

## Como adaptar

Substitua apenas:

- nome do repo alvo
- superficies do alvo
- comandos reais de validacao do repo
- URL canônica do runtime

Preserve:

- hierarquia de verdade
- Storybook-first
- baseline local
- runtime real por ultimo
- Figma read-only

## Referencias do hub

Use estes documentos como fonte de calibracao:

- [hub-visual-standard-v1.md](/C:/Users/jonathan-moletta/code/hub-operacional-web/docs/hub-visual-standard-v1.md)
- [hub-visual-review-workflow-v1.md](/C:/Users/jonathan-moletta/code/hub-operacional-web/docs/hub-visual-review-workflow-v1.md)
- [hub-visual-pilot-dossier-v1.md](/C:/Users/jonathan-moletta/code/hub-operacional-web/docs/hub-visual-pilot-dossier-v1.md)

## Observacao operacional

Se o alvo tiver runtime externo dependente, como um agente separado:

- o smoke deve validar o runtime externo real
- health superficial nao basta quando o fluxo depende de API e UI ao mesmo tempo
- se houver falso positivo de health, registrar a causa raiz antes de fechar a rodada
