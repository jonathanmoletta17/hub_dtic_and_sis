# Contrato de anexos do FormCreator - 2026-05-04

Este documento consolida a fronteira atual entre anexos comuns do GLPI e campos de arquivo do plugin FormCreator.

## Escopo real observado

Consulta read-only em `glpi_plugin_formcreator_questions` mostrou:

- `SIS`: nenhum campo `fieldtype='file'` obrigatorio.
- `DTIC`: um unico campo de arquivo obrigatorio, condicional.

Caso DTIC encontrado:

- Formulario: `NOMEIA / EXONERA`
- Categoria: `DRH > INCLUSAO/EXCLUSAO DE SERVIDOR`
- Secao: `Dados Gerais`
- Campo: `ENVIAR ARQUIVO COM OS DADOS DE NOVO USUARIO`
- Pergunta: `46`
- Condicao: aparece quando a pergunta `TIPO:` (`85`) tem valor `INGRESSO - ANEXO DE ARQUIVO DO RHE`

## Regra operacional

Anexo comum de ticket/acompanhamento/solucao/tarefa usa `Document` + `Document_Item` e e suportado pelo Hub.

Campo `file` opcional do FormCreator pode ser recebido pelo Hub como multipart, enviado para `Document` e vinculado a resposta FormCreator e ao ticket gerado quando houver relacao.

Campo `file` obrigatorio do FormCreator nao deve ser forçado pelo Hub via `Document` REST. O plugin valida esse tipo de campo antes da geracao da resposta usando o upload temporario nativo da tela GLPI:

- `_formcreator_field_*`
- `_prefix_formcreator_field_*`
- `_tag_formcreator_field_*`

Sem esse ciclo temporario nativo, criar apenas um `Document` depois do submit nao satisfaz a validacao do FormCreator.

## Decisao atual no Hub

O Hub bloqueia de forma explicita campos `file` obrigatorios visiveis no fluxo FormCreator.

Essa decisao nao afeta o fluxo principal atual:

- `DTIC/new-ticket` usa entrada assistida por agente.
- `SIS/new-ticket` usa FormCreator e nao possui arquivos obrigatorios.

Se o formulario DTIC `NOMEIA / EXONERA` voltar a ser exposto no Hub, o caso `TIPO = INGRESSO - ANEXO DE ARQUIVO DO RHE` deve ser tratado como excecao de produto: usar GLPI nativo ou implementar o upload temporario nativo antes de liberar submit pelo Hub.
