# Casa Civil Frontend Validation Protocol v1

## Objetivo

Definir o protocolo oficial de validacao do `Casa Civil Frontend System v2`.

Este protocolo existe para impedir:

- aceite por impressao subjetiva
- falso verde local
- regressao visual silenciosa
- integracao prematura de tooling experimental
- mudanca de UI sem prova de estado

## Papel deste documento

No sistema:

- [casa-civil-frontend-system-v2.md](casa-civil-frontend-system-v2.md) define a verdade principal;
- [casa-civil-frontend-foundation-contract-v1.md](casa-civil-frontend-foundation-contract-v1.md) define a fundacao;
- [casa-civil-frontend-family-contracts-v1.md](casa-civil-frontend-family-contracts-v1.md) define as familias;
- este documento define como uma entrega prova qualidade.

## Principio operacional

Uma mudanca frontend nao esta pronta quando “parece boa”.

Ela esta pronta quando:

- a superficie foi modelada corretamente;
- os gates adequados foram executados;
- o runtime real confirmou a entrega;
- a evidencia foi registrada.

## Regras de base

## 1. Toda mudanca deve ser classificada

Antes de implementar, a mudanca deve ser classificada em uma ou mais trilhas.

Trilhas:

- `domain`
- `ui`
- `tooling`
- `runtime`
- `governance`

## 2. Cada trilha tem gate proprio

Uma entrega so fecha se passar pelo gate da trilha correspondente.

## 3. Gates canonicos vencem percepcao local

Se o gate oficial falhar:

- a entrega nao fecha

mesmo que screenshots locais “parecam boas”.

## 4. Gates que compartilham workspace mutavel rodam em serie

Exemplos:

- `npm ci`
- `npm run build`
- `npm run build-storybook`
- suites que dependem da mesma arvore de dependencias

## 5. Tooling experimental fica fora do caminho oficial

Pesquisa nao autoriza adocao.

## Trilhas oficiais

## Trilha `domain`

Quando usar:

- transicao de estado
- regra de negocio
- classificacao
- semantica operacional
- agregacao de dado

Gate minimo:

1. teste unitario ou integrado
2. teste do contexto novo
3. teste negativo quando houver risco colateral
4. reproducao real ou prova controlada

Nao fecha se:

- reutilizou fluxo antigo em contexto novo sem teste proprio
- o dado mudou, mas a semantica visual nao foi revalidada quando necessaria

## Trilha `ui`

Quando usar:

- layout
- contraste
- hierarquia
- copy de superficie
- card, modal, header, shell
- empty, loading, error

Gate minimo:

1. diagnostico
2. idealizacao
3. story correspondente
4. `storybook:test`
5. `storybook:visual`
6. validacao no runtime real

Regra:

- screenshot de runtime sem story correspondente nao fecha alteracao visual relevante

Nao fecha se:

- a mudanca foi aprovada apenas no app inteiro
- a story nao representa estado real
- a arquitetura visual ainda nao foi decidida

## Trilha `tooling`

Quando usar:

- Storybook
- Playwright visual
- Percy
- Chromatic
- scripts
- dependencias
- presets
- builders

Gate minimo:

1. install limpo quando aplicavel
2. build local
3. build das ferramentas tocadas
4. validacao do fluxo prometido
5. build canonico do app

Nao fecha se:

- depende de workaround instavel
- depende de `node_modules` anterior
- a ferramenta ainda e experimental e mesmo assim entra no caminho principal

## Trilha `runtime`

Quando usar:

- Docker
- compose
- env
- rebuild
- URL canonica
- deploy interno

Gate minimo:

1. rebuild limpo
2. health check
3. smoke da superficie tocada
4. evidencia da URL canonica

Nao fecha se:

- apenas build local passou
- o runtime servido ao usuario nao foi revalidado

## Trilha `governance`

Quando usar:

- mudanca de token
- nova primitive
- nova familia
- excecao local
- mudanca de contrato do sistema

Gate minimo:

1. decisao registrada
2. impacto em fundacao/familia/superficie explicitado
3. prova em pelo menos uma superficie real quando houver implementacao

Nao fecha se:

- ninguem sabe se aquilo e fundacao ou excecao

## Fluxo oficial de validacao

## Passo 1 - Declarar a trilha

Antes de implementar:

- dizer quais trilhas a mudanca toca
- dizer quais gates vao fechar a entrega

## Passo 2 - Garantir os artefatos obrigatorios

Para UI relevante:

- diagnostico
- state inventory
- story
- baseline

Para runtime:

- evidencia de rebuild
- health
- URL

Para governance:

- decisao escrita

## Passo 3 - Executar o gate em ordem

Ordem recomendada:

1. story/component
2. visual baseline local
3. build
4. runtime proof
5. smoke real

## Passo 4 - Registrar evidencia

Toda rodada deve registrar:

- arquivos alterados
- comandos executados
- resultado de cada gate
- URL canônica validada
- riscos residuais

## Artefatos obrigatorios por superficie

## Nova superficie importante

Obrigatorio:

- `surface-brief`
- `state-inventory`
- stories
- baseline visual
- runtime proof

## Refactor visual relevante

Obrigatorio:

- diagnostico
- state delta
- stories ajustadas
- baseline atualizada
- runtime proof

## Evolucao de tooling

Obrigatorio:

- justificativa
- fluxo de uso
- prova local
- prova de build canônico

## Definicao oficial de pronto

Uma entrega frontend **nao esta pronta** se qualquer item abaixo for verdadeiro:

- o gate da trilha principal nao passou
- nao existe story quando a mudanca e visual
- nao existe baseline quando a mudanca e visual
- build local falhou
- build canônico falhou
- runtime real nao foi provado
- a ferramenta continua experimental
- o destino em fundacao/familia/excecao nao foi decidido quando necessario

## Regras especificas para Storybook

## Obrigatorio

- stories reais
- fixtures estaveis
- estados principais da superficie

## Quando congelar tempo

Sempre que a story depender de:

- `Date.now()`
- hora atual
- tempo relativo
- janela operacional

## Ferramentas homologadas hoje

Com base no conhecimento local atual:

- Storybook
- Playwright visual local
- Percy como camada complementar dependente de token
- Chromatic como camada complementar dependente de token

## Ferramenta nao homologada

- Loki

## Regras especificas para runtime proof

## Minimo obrigatorio

- identificar runtime real
- rebuildar o servico correto
- validar pela URL canonica
- evitar confiar em porta interna ou aba cacheada

## Evidencia minima

- comando de rebuild
- resultado de health check
- smoke da superficie

## Regras especificas por familia

## `workspace-shell`

Validar:

- identidade institucional
- legibilidade imediata
- CTA principal
- transicao clara entre contextos

## `search`

Validar:

- campo de busca
- refinamento
- resultado
- estado vazio
- filtros

## `analytics`

Validar:

- leitura a distancia
- densidade
- comparacao entre blocos
- estabilidade de layout

## `operations`

Validar:

- coerencia entre coluna, badge, contador e acao
- estados vivos
- modais de decisao
- feedback local

## Antipadroes de validacao

- aprovar no olho sem evidence
- aceitar screenshot isolada como gate suficiente
- validar local e esquecer Docker/runtime
- adicionar ferramenta nova e chamar de pronta sem install/build limpo
- avaliar UI sem state model

## Resultado esperado

Quando este protocolo e seguido:

- a qualidade para de depender de uma rodada especialmente boa;
- a regressao cai;
- o portfolio fica mais coerente;
- a equipe consegue iterar com confianca real.

## Proximo passo

Depois deste protocolo, o sistema precisa fechar:

1. skillset modular
2. primeiro piloto oficial por familia
