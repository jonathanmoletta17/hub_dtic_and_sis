# NPM audit residual risk - Hub Operacional

Data: 2026-04-25

## Decisao operacional

A correcao de dependencias foi limitada a updates compativeis e auditaveis. Nao foi usado `npm audit fix --force`, downgrade de Next, nem override agressivo de dependencia interna.

## Alteracoes aplicadas

- `next`: `16.2.3` -> `16.2.4`.
- `follow-redirects`: `1.15.11` -> `1.16.0` como dependencia transitiva de `http-proxy`.
- `postcss`: `8.5.9` -> `8.5.10` para a dependencia transitiva compartilhada por Tailwind/Vite.

## Resultado do audit

`npm audit --omit=dev` ainda reporta 2 vulnerabilidades moderadas:

- `next`
- `postcss`

A causa residual e `node_modules/next/node_modules/postcss@8.4.31`, empacotado pelo proprio Next `16.2.4`.

`npm audit` completo ainda reporta 4 vulnerabilidades moderadas:

- `@storybook/nextjs-vite`
- `next`
- `postcss`
- `vite-plugin-storybook-nextjs`

## Politica de tratamento

- Nao forcar `next@9.3.3`, pois isso seria downgrade semver-major e incompatível com a arquitetura atual.
- Nao adicionar `postcss` ou `follow-redirects` como dependencia direta de producao apenas para silenciar audit.
- Manter Storybook nesta etapa; alertas dev-only ficam registrados como risco residual.
- Reavaliar quando houver patch de Next que atualize o PostCSS interno ou quando Storybook publicar cadeia compatível sem o alerta.
