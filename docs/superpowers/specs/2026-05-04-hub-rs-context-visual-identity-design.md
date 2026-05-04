# Hub RS Context Visual Identity Design

Data: 2026-05-04

## Decisao

O Hub deve ter uma identidade institucional comum da Casa Civil do Estado do RS e tres identidades operacionais reais:

- DTIC
- SIS Conservacao
- SIS Manutencao

Nao deve haver identidade visual separada para GG neste momento. GG pode aparecer como requerente, origem de demanda, filtro ou agrupamento operacional quando houver dado real suficiente, mas nao como contexto visual proprio.

## Base Institucional Comum

Todos os contextos devem preservar a mesma base:

- brasao do Estado do RS no shell;
- assinatura "Casa Civil do Estado do RS";
- faixa tricolor discreta do RS como marcador institucional;
- layout, navegacao, cards, inputs, timeline e botoes com a mesma anatomia;
- densidade operacional, sem composicao de landing page;
- fundos claros, neutros e legiveis;
- modo escuro mantido como suporte, mas nao como linguagem principal da identidade.

A referencia institucional usada como diretriz e o Manual de Identidade Visual do Governo RS 2023:

- https://cultura.rs.gov.br/upload/arquivos/202305/08143924-miv-o-futuro-nos-une.pdf

## Contextos

## Politica De Chaves E Rotas

O alvo visual e `DTIC`, `SIS Conservacao` e `SIS Manutencao`.

Na implementacao, a chave visual preferida para Conservacao e `sis-conservacao`. Se o contrato atual de autenticacao/perfil ainda entregar o contexto generico `sis`, ele deve ser tratado como alias de `SIS Conservacao` ate que o contrato de roles seja revisado. Essa decisao evita criar uma quarta identidade visual generica.

Qualquer chave legada ligada a memoria deve permanecer sem investimento visual novo ate que exista evidencia operacional suficiente. Ela nao deve ser removida sem mapear rotas, permissoes e usuarios afetados.

### DTIC

Finalidade visual: tecnologia, acessos, sistemas, suporte tecnico e rastreabilidade.

Direcao:

- acento principal: azul operacional;
- apoio: azul claro para superficies sutis;
- linguagem: chamados, sistemas, acesso, rede, equipamentos, anexos, historico;
- icones esperados: rede, ticket, painel, busca, inventario, seguranca;
- tom: preciso, tecnico, confiavel.

Exemplo de token:

```txt
context: dtic
accent: #0f6cbf
accentSoft: #eef7ff
accentLine: #c9ddf4
```

### SIS Conservacao

Finalidade visual: conservacao, servicos internos, apoio operacional e demandas recorrentes.

Direcao:

- acento principal: vinho sobrio;
- apoio: oliva institucional;
- linguagem: conservacao, servicos, apoio, ambiente, organizacao, demandas GG quando aplicavel;
- GG aparece como dado de demanda, nao como contexto;
- tom: cuidado, continuidade, servico interno, preservacao.

Exemplo de token:

```txt
context: sis-conservacao
accent: #76516e
accentSoft: #fbf7fa
accentLine: #dfcedc
support: #90a224
```

### SIS Manutencao

Finalidade visual: manutencao predial, execucao em campo, agenda, material e ordens tecnicas.

Direcao:

- acento principal: oliva;
- apoio: ambar;
- linguagem: ordem, fila predial, sala, predio, agenda, materiais, equipe, campo;
- tom: pratico, tecnico, executavel.

Exemplo de token:

```txt
context: sis-manutencao
accent: #5f7b36
accentSoft: #f4f8ed
accentLine: #cbdcb2
support: #d08a1d
```

## Regras De Uso

1. A identidade do RS deve aparecer como assinatura estrutural, nao como ornamento pesado.
2. O usuario deve perceber que esta sempre no mesmo Hub da Casa Civil.
3. O contexto deve ser reconhecido por acento, texto, icone e dados, nao por layout diferente.
4. Nenhum contexto deve trocar a anatomia dos componentes principais.
5. O selector deve apresentar apenas os tres contextos reais.
6. A sidebar deve mostrar o nome especifico do contexto, nao um texto generico para todos os SIS.
7. O login pode citar o Hub Casa Civil e os tres ambientes, sem vender o produto como landing page.
8. Os mockups sao referencia visual, nao especificacao pixel-perfect.

## Impacto No App Atual

Arquivos que provavelmente precisarao de revisao em uma futura implementacao:

- `web/src/lib/config/themes.json`
- `web/src/lib/config/labels.pt-BR.json`
- `web/src/lib/config/features.json`
- `web/src/components/ui/AppSidebar.tsx`
- `web/src/components/ui/OperationalShell.tsx`
- `web/src/app/globals.css`
- `web/src/app/selector/page.tsx`
- `web/src/app/_components/LoginSurface.tsx`

O arquivo `web/src/lib/context-registry.ts` e zona protegida. Se for necessario mexer nele, a alteracao deve ter plano explicito e regressao.

## Fora Do Escopo

- Criar ou alterar tickets reais.
- Criar identidade visual para GG.
- Remover permissao, role ou rota sem mapear contratos.
- Redesenhar a arquitetura de autenticacao ou sessao.
- Transformar o Hub em site institucional ou landing page.
- Substituir o GLPI, SIS, Hermes ou sistemas externos.

## Validacao Esperada

Quando implementado, validar:

- `git diff --check`;
- testes frontend existentes;
- build frontend;
- smoke read-only `npm run smoke:hub`;
- conferencia visual em desktop e mobile;
- health do runtime com `auth_mode=user_password_session` e `service_session_status=disabled`;
- ausencia de smoke destrutivo, salvo pedido explicito.

## Artefatos De Apoio

Mockups locais gerados durante brainstorming:

- `.superpowers/brainstorm/13791-1777876666/content/three-context-identities-filled-designs.html`
- `.superpowers/brainstorm/13791-1777876666/content/identity-three-dtic.png`
- `.superpowers/brainstorm/13791-1777876666/content/identity-three-conservacao.png`
- `.superpowers/brainstorm/13791-1777876666/content/identity-three-manutencao.png`

Esses artefatos sao auxiliares locais e nao precisam ser versionados junto com a especificacao.
