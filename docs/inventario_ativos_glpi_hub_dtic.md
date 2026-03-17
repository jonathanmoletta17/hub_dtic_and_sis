# Levantamento Técnico — Inventário de Ativos no Hub DTIC

Data da coleta: 2026-03-17  
Projeto: `tensor-aurora`  
Escopo validado: instância DTIC (`/glpi/apirest.php`) e base DTIC (`glpi2db`)  
Versão GLPI validada na API: `10.0.2`

## Resumo Executivo

O cenário atual permite construir uma tela de Inventário de Ativos no Hub com boa cobertura para hardware, desde que a tela siga a regra operacional correta:

- `READ`: banco MySQL/GLPI
- `CREATE/UPDATE/DELETE`: API REST do GLPI

Os principais achados foram:

- A base DTIC tem volume suficiente e estrutura consistente para uma visão unificada de hardware: `829` computadores, `953` monitores, `132` equipamentos de rede, `81` impressoras, `424` periféricos e `86` telefones.
- A API REST do GLPI 10.0.2 respondeu normalmente para `initSession`, `listSearchOptions`, leitura de itens, sub-recursos e logs.
- O relacionamento de software em computador, nesta instância, aparece como `Item_SoftwareVersion` e tabela `glpi_items_softwareversions`; não apareceu como `Computer_SoftwareVersion`.
- Não há evidência de plugin oficial `Fields` instalado na base DTIC; não foram encontradas tabelas `glpi_plugin_fields%`.
- Há problemas relevantes de qualidade de dados para a futura tela: muitos ativos sem localização, sem grupo técnico, sem técnico responsável e, em alguns tipos, sem estado.
- `Software` e `SoftwareLicense` existem, mas o comportamento funcional é distinto de inventário patrimonial de hardware; misturar tudo em uma única grade principal é um risco de UX e semântica.

## Metodologia Executada

### Fase 1 — Pesquisa Web Oficial

Pesquisei documentação oficial do GLPI e do ecossistema oficial para:

- endpoints REST genéricos e sub-recursos
- suporte a bulk e massive actions
- histórico/log
- campos customizados
- práticas atuais de inventário e agente

### Fase 2 — Validação no Banco

Queries executadas na base DTIC `glpi2db`:

- `SHOW TABLES LIKE 'glpi_%'`
- `DESCRIBE` das tabelas principais
- contagem por tipo de ativo
- estados, localidades, grupos responsáveis
- resumo de logs
- inspeção de indícios de custom fields

Todas as queries pedidas responderam com sucesso.

### Fase 3 — Validação na API GLPI

Chamadas reais executadas na API DTIC:

- `GET /initSession`
- `GET /getGlpiConfig`
- `GET /listSearchOptions/{ItemType}`
- `GET /Computer?searchText[groups_id]=17&range=0-5`
- `GET /Computer/{id}?with_logs=true&with_disks=true&with_softwares=true&with_networkports=true&with_connections=true`
- `GET /Computer/{id}/Log`
- `GET /Computer/{id}/Item_Disk`
- `GET /Computer/{id}/NetworkPort`
- `GET /Computer/{id}/Item_SoftwareVersion`
- `GET /Log?range=0-5`

## Fase 1 — Pesquisa Web Oficial

### Endpoints REST relevantes do GLPI

O GLPI expõe uma API REST genérica por `itemtype`. Para os ativos deste levantamento, o padrão oficial é o mesmo para `Computer`, `Monitor`, `Printer`, `NetworkEquipment`, `Phone`, `Software`, `Peripheral`, `SoftwareLicense`, além dos relacionamentos e logs.[S1]

Principais endpoints oficiais:

- Sessão:
  - `GET /initSession`
  - `GET /killSession`
  - `GET /getFullSession`
  - `GET /getGlpiConfig`
- Descoberta de schema de busca:
  - `GET /listSearchOptions/{ItemType}`
  - `GET /search/{ItemType}`
- CRUD genérico:
  - `GET /{ItemType}`
  - `GET /{ItemType}/{id}`
  - `POST /{ItemType}`
  - `PUT /{ItemType}/{id}`
  - `DELETE /{ItemType}/{id}`
- Sub-recursos:
  - `GET /{ItemType}/{id}/{SubItemType}`
- Bulk genérico:
  - `POST /{ItemType}` com `"input": [ ... ]`
  - `PUT /{ItemType}` com `"input": [ ... ]`
  - `DELETE /{ItemType}` com `"input": [ ... ]`
- Massive actions:
  - `GET /getMassiveActions/{ItemType}/`
  - `GET /getMassiveActionParameters/{ItemType}/`
  - `POST /applyMassiveAction/{ItemType}/`

### Endpoints/relacionamentos relevantes para inventário

Pelos docs oficiais e pela validação real na instância:

- `Computer/{id}/Log` ou `GET /Computer/{id}?with_logs=true`
- `Computer/{id}/Item_Disk` ou `GET /Computer/{id}?with_disks=true`
- `Computer/{id}/NetworkPort` ou `GET /Computer/{id}?with_networkports=true`
- `Computer/{id}/Item_SoftwareVersion` ou `GET /Computer/{id}?with_softwares=true`
- `Computer/{id}?with_connections=true` para conexões como monitor associado
- `GET /Log` para leitura paginada de logs como itemtype próprio

### Campos disponíveis por itemtype

Oficialmente, o modo correto de descobrir campos pesquisáveis por itemtype é `listSearchOptions/{ItemType}`.[S1]  
Na instância DTIC, isso confirmou a presença dos campos de negócio esperados:

- `serial`
- `name`
- `locations_id`
- `states_id`
- `users_id_tech`
- `groups_id_tech`
- `manufacturers_id`
- campos de modelo por tipo, por exemplo:
  - `computermodels_id`
  - `monitormodels_id`
  - `networkequipmentmodels_id`
  - `printermodels_id`
  - `phonemodels_id`
  - `peripheralmodels_id`

Observação importante:

- Na API, `listSearchOptions` expôs claramente `groups_id_tech` como opção de busca para grupo responsável técnico.
- Já os registros retornados pelo endpoint base expõem tanto `groups_id` quanto `groups_id_tech`.
- Na instância DTIC, o filtro `searchText[groups_id]=17` funcionou; `searchText[groups_id_tech]=17` voltou vazio para a amostra testada.

### Campos customizados: nativo vs plugin

Situação oficial:

- O plugin oficial atual para campos adicionais é o `Fields`.[S2]
- O plugin `customfields` está oficialmente descontinuado e substituído pelo `Fields`.[S3]

Conclusão para esta instância:

- Não foram encontradas tabelas `glpi_plugin_fields%`.
- `SHOW TABLES LIKE '%custom%'` retornou vazio.
- Foram encontradas apenas tabelas core relacionadas a hidden/mandatory/predefined fields de templates, o que não caracteriza o plugin `Fields`.

Implicação prática:

- Hoje a instância DTIC parece operar sem um mecanismo oficial de campos adicionais por ativo.
- Se a tela exigir atributos patrimoniais extras que não cabem nas colunas nativas, será necessário decidir entre:
  - expandir o modelo nativo do GLPI com campos já existentes e governança de uso
  - instalar e governar o plugin oficial `Fields`

### Boas práticas de inventário GLPI em 2024/2025

Boas práticas ancoradas em documentação oficial:

- Não hardcode IDs de search options; use `listSearchOptions/{ItemType}` para descobrir campos pesquisáveis.[S1]
- Use paginação/range e trate `206 Partial Content` como comportamento normal em listagens paginadas.[S1]
- Reutilize `App-Token` + `Session-Token`; abra sessão com `initSession` e encerre com `killSession`.[S1]
- Para tarefas em lote, use arrays em `"input"` ou `applyMassiveAction` em vez de serializar ação item a item.[S1]
- Distribua a carga de inventário do agente com atraso aleatório (`--wait`) ou agendamento distribuído, para evitar picos no servidor.[S5][S7]
- Não desabilite verificação SSL em produção; o default do agente é validar certificado, e o caminho recomendado é CA confiável ou `ssl-fingerprint`.[S4]
- Inventário de rede exige que o ativo já exista no GLPI e que haja credenciais SNMP corretas; isso impacta equipamentos de rede e impressoras.[S6]

## Fase 2 — Validação no Banco

### Tabelas relevantes encontradas

A consulta `SHOW TABLES LIKE 'glpi_%'` retornou `482` tabelas.  
Entre as relevantes para a tela:

- `glpi_computers`
- `glpi_monitors`
- `glpi_networkequipments`
- `glpi_printers`
- `glpi_peripherals`
- `glpi_phones`
- `glpi_softwares`
- `glpi_softwarelicenses`
- `glpi_states`
- `glpi_locations`
- `glpi_groups`
- `glpi_manufacturers`
- `glpi_computermodels`
- `glpi_monitormodels`
- `glpi_networkequipmentmodels`
- `glpi_printermodels`
- `glpi_phonemodels`
- `glpi_peripheralmodels`
- `glpi_items_disks`
- `glpi_networkports`
- `glpi_items_softwareversions`
- `glpi_softwareversions`
- `glpi_logs`

### Estrutura real das tabelas principais

Campos principais confirmados no banco:

- `glpi_computers`
  - `id`, `name`, `serial`, `otherserial`, `users_id_tech`, `groups_id_tech`, `locations_id`, `computermodels_id`, `manufacturers_id`, `users_id`, `groups_id`, `states_id`, `is_dynamic`, `last_inventory_update`
- `glpi_monitors`
  - `id`, `name`, `serial`, `otherserial`, `users_id_tech`, `groups_id_tech`, `locations_id`, `monitormodels_id`, `manufacturers_id`, `users_id`, `groups_id`, `states_id`, `is_dynamic`
- `glpi_networkequipments`
  - `id`, `name`, `serial`, `otherserial`, `users_id_tech`, `groups_id_tech`, `locations_id`, `networkequipmentmodels_id`, `manufacturers_id`, `users_id`, `groups_id`, `states_id`, `is_dynamic`, `last_inventory_update`, `snmpcredentials_id`
- `glpi_printers`
  - `id`, `name`, `serial`, `otherserial`, `users_id_tech`, `groups_id_tech`, `locations_id`, `printermodels_id`, `manufacturers_id`, `users_id`, `groups_id`, `states_id`, `is_dynamic`, `last_inventory_update`, `snmpcredentials_id`
- `glpi_peripherals`
  - `id`, `name`, `serial`, `otherserial`, `users_id_tech`, `groups_id_tech`, `locations_id`, `peripheralmodels_id`, `manufacturers_id`, `users_id`, `groups_id`, `states_id`, `is_dynamic`
- `glpi_phones`
  - `id`, `name`, `serial`, `otherserial`, `users_id_tech`, `groups_id_tech`, `locations_id`, `phonemodels_id`, `manufacturers_id`, `users_id`, `groups_id`, `states_id`, `is_dynamic`, `last_inventory_update`
- `glpi_softwares`
  - `id`, `name`, `locations_id`, `users_id_tech`, `groups_id_tech`, `manufacturers_id`, `users_id`, `groups_id`, `softwarecategories_id`, `is_valid`
- `glpi_softwarelicenses`
  - `id`, `softwares_id`, `name`, `serial`, `otherserial`, `softwareversions_id_buy`, `softwareversions_id_use`, `locations_id`, `users_id_tech`, `groups_id_tech`, `users_id`, `groups_id`, `states_id`, `manufacturers_id`

## Fase 3 — Validação na API

### Sessão e versão

- `GET /initSession`: `200 OK`
- `GET /getGlpiConfig`: `200 OK`
- versão reportada pela API: `10.0.2`
- `dbversion`: `10.0.2@a130db99c7d9b131c2e2ea59fe0d6260fe93d831`

### `listSearchOptions` validado

Contagem de search options retornadas:

- `Computer`: `190`
- `Monitor`: `120`
- `NetworkEquipment`: `137`
- `Phone`: `118`
- `Software`: `114`
- `Peripheral`: `116`
- `SoftwareLicense`: `84`
- `Log`: `1`

Campos de busca confirmados na prática:

- `Computer`
  - `serial`, `otherserial`, `name`, `users_id_tech`, `groups_id_tech`, `State`, `Location`, `ComputerModel`
- `Monitor`
  - `serial`, `otherserial`, `name`, `users_id_tech`, `groups_id_tech`, `State`, `Location`, `MonitorModel`
- `NetworkEquipment`
  - `serial`, `otherserial`, `name`, `users_id_tech`, `groups_id_tech`, `State`, `Location`, `NetworkEquipmentModel`
- `Phone`
  - `serial`, `otherserial`, `name`, `users_id_tech`, `groups_id_tech`, `State`, `Location`, `PhoneModel`
- `Peripheral`
  - `serial`, `otherserial`, `name`, `users_id_tech`, `groups_id_tech`, `State`, `Location`, `PeripheralModel`
- `SoftwareLicense`
  - `serial`, `otherserial`, `name`, `users_id_tech`, `groups_id_tech`, `State`, `Location`, `softwareversions_id_buy`, `softwareversions_id_use`

### Busca por grupo DTIC

Teste solicitado:

- `GET /Computer?searchText[groups_id]=17&range=0-5`
  - resposta: `206 Partial Content`
  - retornou `6` itens na janela `0-5`
  - exemplos: ids `1`, `56`, `63`
  - todos com `groups_id = 17`

Teste complementar:

- `GET /Computer?searchText[groups_id_tech]=17&range=0-5`
  - resposta: `200 OK`
  - retornou `0` itens

Leitura prática:

- para o conjunto amostrado, o agrupamento útil de computadores está muito mais em `groups_id` do que em `groups_id_tech`

### Sub-recursos e histórico validados

Para `Computer/1`:

- `GET /Computer/1?with_logs=true&with_disks=true&with_softwares=true&with_networkports=true&with_connections=true`
  - `200 OK`
  - retornou `_disks`, `_networkports`, `_softwares`, `_connections`

Para um computador com log recente no banco (`Computer/762`):

- `GET /Computer/762/Log`
  - `206 Partial Content`
  - retornou logs reais
- `GET /Computer/762?with_logs=true`
  - `200 OK`
  - retornou `_logs`

Sub-recursos específicos:

- `GET /Computer/1/Item_Disk`
  - `200 OK`
  - retornou `4` discos
- `GET /Computer/1/NetworkPort`
  - `200 OK`
  - retornou `4` portas
- `GET /Computer/1/Item_SoftwareVersion`
  - `206 Partial Content`
  - retornou `30` instalações na janela paginada
- `GET /Log?range=0-5`
  - `206 Partial Content`
  - itemtype `Log` acessível como recurso próprio

### Campos retornados na API

Os recursos base de hardware retornaram, no mínimo:

- `id`
- `name`
- `serial`
- `otherserial`
- `users_id_tech`
- `groups_id_tech`
- `locations_id`
- `manufacturers_id`
- `users_id`
- `groups_id`
- `states_id`
- `is_deleted`
- `is_dynamic`
- `date_creation`
- `date_mod`
- `links`

### Quais campos são editáveis via API

Confirmação objetiva:

- O GLPI documenta `POST`, `PUT` e `DELETE` genéricos por `itemtype`.[S1]
- Os campos básicos retornados no recurso principal coincidem com as colunas reais do banco para os ativos testados.

Limitação importante:

- A API não expôs um schema de editabilidade por campo.
- O teste `OPTIONS /Computer` respondeu `200`, porém sem cabeçalho `Allow` útil.
- Por segurança, não executei escrita real em produção para “provar” campo por campo.

Conclusão pragmática:

- Para a tela do Hub, considerar como editáveis via API os campos escalares nativos do recurso base do ativo, desde que façam parte da whitelist de negócio do Hub e do payload `input`.
- Para campos relacionais ou derivados, tratar em fluxo específico.

## 4.1 Mapa de Entidades de Ativos

| itemtype | tabela_bd | endpoint_api | campos_principais | suporta_bulk |
|---|---|---|---|---|
| `Computer` | `glpi_computers` | `/Computer` | `name`, `serial`, `otherserial`, `states_id`, `locations_id`, `users_id`, `users_id_tech`, `groups_id`, `groups_id_tech`, `manufacturers_id`, `computermodels_id`, `last_inventory_update` | Sim |
| `Monitor` | `glpi_monitors` | `/Monitor` | `name`, `serial`, `otherserial`, `states_id`, `locations_id`, `users_id`, `users_id_tech`, `groups_id`, `groups_id_tech`, `manufacturers_id`, `monitormodels_id` | Sim |
| `Printer` | `glpi_printers` | `/Printer` | `name`, `serial`, `otherserial`, `states_id`, `locations_id`, `users_id`, `users_id_tech`, `groups_id`, `groups_id_tech`, `manufacturers_id`, `printermodels_id`, `last_inventory_update` | Sim |
| `NetworkEquipment` | `glpi_networkequipments` | `/NetworkEquipment` | `name`, `serial`, `otherserial`, `states_id`, `locations_id`, `users_id`, `users_id_tech`, `groups_id`, `groups_id_tech`, `manufacturers_id`, `networkequipmentmodels_id`, `snmpcredentials_id`, `last_inventory_update` | Sim |
| `Phone` | `glpi_phones` | `/Phone` | `name`, `serial`, `otherserial`, `states_id`, `locations_id`, `users_id`, `users_id_tech`, `groups_id`, `groups_id_tech`, `manufacturers_id`, `phonemodels_id`, `last_inventory_update` | Sim |
| `Peripheral` | `glpi_peripherals` | `/Peripheral` | `name`, `serial`, `otherserial`, `states_id`, `locations_id`, `users_id`, `users_id_tech`, `groups_id`, `groups_id_tech`, `manufacturers_id`, `peripheralmodels_id` | Sim |
| `Software` | `glpi_softwares` | `/Software` | `name`, `locations_id`, `users_id`, `users_id_tech`, `groups_id`, `groups_id_tech`, `manufacturers_id`, `softwarecategories_id`, `is_valid` | Sim |
| `SoftwareLicense` | `glpi_softwarelicenses` | `/SoftwareLicense` | `name`, `serial`, `otherserial`, `softwares_id`, `softwareversions_id_buy`, `softwareversions_id_use`, `states_id`, `locations_id`, `users_id`, `users_id_tech`, `groups_id`, `groups_id_tech`, `manufacturers_id` | Sim |

Relações e histórico relevantes:

| itemtype lógico | tabela_bd | endpoint_api de leitura | observação |
|---|---|---|---|
| Logs | `glpi_logs` | `/Log` ou `/{ItemType}/{id}/Log` | histórico operacional |
| Discos de item | `glpi_items_disks` | `/Computer/{id}/Item_Disk` | leitura direta confirmada |
| Portas de rede | `glpi_networkports` | `/Computer/{id}/NetworkPort` | leitura direta confirmada |
| Instalações de software | `glpi_items_softwareversions` | `/Computer/{id}/Item_SoftwareVersion` | relação real confirmada na instância |

## 4.2 Volumes Reais por Tipo de Ativo

### Volumes pedidos no roteiro

| tipo | total |
|---|---:|
| computers | 829 |
| monitors | 953 |
| networkequipments | 132 |
| printers | 81 |
| peripherals | 424 |
| softwares | 17206 |

### Volumes complementares úteis

| tipo | total |
|---|---:|
| phones | 86 |
| softwarelicenses | 11 |
| item_softwareversion | 231508 |
| item_disk | 3422 |
| networkport | 2590 |

Leitura de negócio:

- `Software` é volumoso e funciona mais como catálogo lógico do que como unidade patrimonial.
- Para rastreabilidade real de software por equipamento, `glpi_items_softwareversions` é muito mais relevante que `glpi_softwares`.

### Estados disponíveis

| id | name | comment |
|---|---|---|
| 4 | 2024 |  |
| 5 | 2024 |  |
| 1 | Ativo | Equipamento Em uso |
| 3 | Estoque |  |
| 2 | Estoque Baixa |  |
| 6 | Inativo |  |

### Localidades

- Total de localidades cadastradas: `50`
- A hierarquia via `completename` está disponível e é adequada para filtro cascata.

Exemplos:

- `CAFF`
- `CAFF > 1А Andar - Ouvidoria`
- `Casa Civil 1005 > Subsolo`
- `Defesa Civil / Andrade Neves > 07А Andar`

### Grupos responsáveis DTIC identificados

| id | name | completename |
|---|---|---|
| 17 | CC-SE-SUBADM-DTIC | CC-SE-SUBADM-DTIC |
| 18 | CC-DTIC-RESTRITO | CC-DTIC-RESTRITO |
| 89 | N1 | CC-SE-SUBADM-DTIC > N1 |
| 90 | N2 | CC-SE-SUBADM-DTIC > N2 |
| 91 | N3 | CC-SE-SUBADM-DTIC > N3 |
| 92 | N4 | CC-SE-SUBADM-DTIC > N4 |

### Logs recentes por itemtype

Top 10 por volume:

| item_type | total_logs | ultimo_log |
|---|---:|---|
| Computer | 96914 | 2026-03-17 03:10:17 |
| Software | 80509 | 2026-03-17 03:10:17 |
| SoftwareVersion | 79471 | 2026-03-17 03:10:17 |
| Agent | 14502 | 2026-03-17 03:10:17 |
| Ticket | 8128 | 2026-03-16 18:01:35 |
| OperatingSystem | 6106 | 2026-03-17 03:10:17 |
| Monitor | 4098 | 2026-03-17 02:49:43 |
| Peripheral | 1433 | 2026-03-17 00:55:56 |
| User | 1122 | 2026-03-17 00:41:31 |
| PluginFormcreatorFormAnswer | 559 | 2026-03-16 16:24:01 |

## 4.3 Mapa de Endpoints API e Queries de Leitura

### Regra operacional consolidada

| operação | canal | padrão |
|---|---|---|
| `CREATE` | API GLPI | `POST /{ItemType}` |
| `READ` lista | Banco | `SELECT ... FROM glpi_*` |
| `READ` detalhe | Banco | `SELECT ...` com `JOIN` em `states`, `locations`, `groups`, `manufacturers`, modelos e relações |
| `UPDATE` | API GLPI | `PUT /{ItemType}/{id}` |
| `DELETE` | API GLPI | `DELETE /{ItemType}/{id}` |

### Leituras recomendadas por entidade

| entidade | leitura principal |
|---|---|
| Hardware base | `SELECT ... FROM glpi_computers / glpi_monitors / glpi_printers / glpi_networkequipments / glpi_peripherals / glpi_phones WHERE is_deleted = 0` |
| Estados | `SELECT id, name, comment FROM glpi_states` |
| Localidades | `SELECT id, name, completename FROM glpi_locations` |
| Grupos | `SELECT id, name, completename FROM glpi_groups WHERE is_assign = 1` |
| Fabricantes | `SELECT id, name FROM glpi_manufacturers` |
| Modelos | `SELECT id, name FROM glpi_*models` conforme o tipo |
| Discos | `SELECT ... FROM glpi_items_disks WHERE itemtype = 'Computer'` |
| Portas | `SELECT ... FROM glpi_networkports WHERE itemtype = 'Computer'` |
| Software instalado | `SELECT ... FROM glpi_items_softwareversions WHERE itemtype = 'Computer'` |
| Histórico | `SELECT ... FROM glpi_logs WHERE itemtype = ? AND items_id = ?` |

### Escritas recomendadas por entidade

| entidade | create | update | delete |
|---|---|---|---|
| `Computer` | `POST /Computer` | `PUT /Computer/{id}` | `DELETE /Computer/{id}` |
| `Monitor` | `POST /Monitor` | `PUT /Monitor/{id}` | `DELETE /Monitor/{id}` |
| `Printer` | `POST /Printer` | `PUT /Printer/{id}` | `DELETE /Printer/{id}` |
| `NetworkEquipment` | `POST /NetworkEquipment` | `PUT /NetworkEquipment/{id}` | `DELETE /NetworkEquipment/{id}` |
| `Phone` | `POST /Phone` | `PUT /Phone/{id}` | `DELETE /Phone/{id}` |
| `Peripheral` | `POST /Peripheral` | `PUT /Peripheral/{id}` | `DELETE /Peripheral/{id}` |
| `Software` | `POST /Software` | `PUT /Software/{id}` | `DELETE /Software/{id}` |
| `SoftwareLicense` | `POST /SoftwareLicense` | `PUT /SoftwareLicense/{id}` | `DELETE /SoftwareLicense/{id}` |

### Bulk

Opções oficiais:

- bulk CRUD genérico via arrays no campo `"input"` em `POST`, `PUT` e `DELETE` do itemtype.[S1]
- `applyMassiveAction/{ItemType}` para ações em massa oficiais do GLPI.[S1]

Recomendação:

- para criação/edição operacional do Hub, prefira payloads explícitos por item
- para grandes saneamentos, use massive actions ou jobs administrativos dedicados

## 4.4 Proposta de Estrutura da Tela de Inventário

### Escopo recomendado de primeira entrega

Primeira versão focada em hardware patrimonial:

- `Computer`
- `Monitor`
- `NetworkEquipment`
- `Printer`
- `Peripheral`
- `Phone`

`Software` e `SoftwareLicense` devem entrar em aba própria ou segunda fase.

Justificativa:

- `Software` tem `17206` registros e semântica de catálogo
- o valor patrimonial por item está muito mais em licença e instalação por ativo
- misturar software com hardware degrada leitura operacional

### Filtros disponíveis

Filtros mínimos:

- contexto: `DTIC` agora, `SIS` como expansão futura
- tipo de ativo
- localidade
- estado
- grupo responsável (`groups_id`)
- grupo técnico (`groups_id_tech`)
- usuário responsável (`users_id`)
- técnico responsável (`users_id_tech`)
- fabricante
- modelo
- ativo dinâmico/manual
- com inventário recente / inventário desatualizado
- sem localização
- sem responsável
- sem grupo técnico
- busca textual por `name`, `serial`, `otherserial`

### Colunas sugeridas para a tabela principal

- tipo
- nome
- patrimônio / número de inventário (`otherserial`)
- número de série (`serial`)
- estado
- localidade
- usuário responsável
- grupo responsável
- técnico responsável
- grupo técnico
- fabricante
- modelo
- dinâmico
- última atualização de inventário
- última modificação

### Ações sugeridas

- criar ativo
- editar ativo
- inativar / excluir
- abrir detalhe
- abrir histórico
- exportar CSV/XLSX
- copiar link do ativo no GLPI

### Painel lateral ou detalhe expansível

- metadados do ativo
- discos
- portas de rede
- softwares instalados
- monitores conectados
- histórico/log

### KPIs possíveis

KPIs operacionais recomendados:

- total de ativos por tipo
- total por estado
- total por localidade
- ativos sem usuário responsável
- ativos sem grupo responsável
- ativos sem técnico responsável
- ativos sem grupo técnico
- ativos sem localização
- ativos com inventário desatualizado
- ativos dinâmicos vs manuais

KPIs com base real já observada:

- computadores sem localização: `647/829`
- computadores sem grupo técnico: `829/829`
- computadores com inventário desatualizado há mais de 30 dias: `355`
- monitores sem estado: `721/953`
- periféricos sem estado: `391/424`

## 4.5 Gaps e Riscos Identificados

### 1. Qualidade de dados desigual entre tipos

Há uma assimetria forte entre tipos:

- computadores estão bem povoados em `users_id`, `groups_id`, `serial`
- monitores e periféricos têm muitos vazios em `states_id` e `locations_id`
- grupos/técnicos técnicos estão majoritariamente zerados em vários tipos

Isso impacta:

- filtros
- KPIs
- confiança do usuário na tela

### 2. `groups_id` parece mais útil que `groups_id_tech` para computadores

Na prática:

- `groups_id=17` retornou itens
- `groups_id_tech=17` não retornou itens na amostra

Risco:

- se a tela partir apenas do conceito “grupo técnico”, vai esconder a realidade operacional atual do cadastro

### 3. Estados duplicados/inconsistentes

Existem dois estados distintos com nome `2024`:

- `id=4`
- `id=5`

Risco:

- relatórios e filtros por nome ficam ambíguos

### 4. Localizações com indício de problema de encoding

Foram encontrados nomes com caracteres inconsistentes, por exemplo:

- `1А Andar`
- `CM - Central de Doaчѕes`
- `Torreуo`

Risco:

- busca textual ruim
- ordenação ruim
- percepção de baixa qualidade da tela

### 5. Mistura de hardware com software é conceitualmente perigosa

`Software` não se comporta como unidade patrimonial individual:

- quase todos sem localização
- quase todos sem responsável
- o que interessa para rastreio é instalação por item e licença

Risco:

- uma grade única “Ativos” virar uma tela incoerente

### 6. Ausência de plugin oficial de campos adicionais

Hoje não há evidência de `Fields` instalado.

Risco:

- se a equipe precisar de atributos patrimoniais extras, não haverá suporte pronto no GLPI para isso

### 7. Confirmação de editabilidade por campo ficou indireta

Não houve escrita real em produção.

Risco:

- alguns campos podem exigir regras adicionais, perfil/permissão, ou fluxo específico do GLPI

Mitigação:

- validar payload mínimo de escrita em ambiente de homologação antes de liberar edição na nova tela

## 4.6 Recomendação de Próximos Passos

### Prioridade 1 — Definir o escopo da V1

Implementar primeiro a tela de inventário patrimonial de hardware com:

- `Computer`
- `Monitor`
- `NetworkEquipment`
- `Printer`
- `Peripheral`
- `Phone`

### Prioridade 2 — Criar uma camada de leitura unificada no backend

Construir uma query unificada ou view lógica por `UNION ALL` com colunas normalizadas:

- `itemtype`
- `id`
- `name`
- `serial`
- `otherserial`
- `states_id`
- `locations_id`
- `users_id`
- `groups_id`
- `users_id_tech`
- `groups_id_tech`
- `manufacturers_id`
- `model_id`
- `model_name`
- `is_dynamic`
- `date_mod`
- `last_inventory_update`

### Prioridade 3 — Tratar lookup tables e filtros

Materializar endpoints internos de leitura via banco para:

- estados
- localidades
- grupos
- fabricantes
- modelos por tipo

### Prioridade 4 — Definir whitelist de campos editáveis por tipo

Antes de liberar edição:

- listar campos permitidos por itemtype
- validar payload mínimo em ambiente seguro
- documentar regras de negócio do Hub para cada campo

### Prioridade 5 — Expor histórico e rastreabilidade como diferencial

A tela deve ter:

- histórico resumido por ativo
- trilha de alterações
- vínculo de software instalado, discos e rede para computadores

### Prioridade 6 — Saneamento mínimo de dados mestres

Atuar antes ou junto da entrega:

- consolidar estados duplicados
- revisar localizações com problema de encoding
- revisar estratégia de uso de `groups_id` vs `groups_id_tech`

### Prioridade 7 — Decidir estratégia para campos patrimoniais extras

Se a área precisar de campos fora do nativo:

- decidir se cabe no modelo nativo
- ou avaliar instalação/governança do plugin oficial `Fields`

## Recomendação Arquitetural Direta

Estrutura recomendada para o Hub:

- leitura consolidada via banco
- escrita restrita via API GLPI
- foco inicial em hardware
- detalhe por ativo com relacionamentos e histórico
- software/licenças como módulo separado ou segunda fase

Essa abordagem respeita a regra de ouro do projeto, reduz acoplamento com a API para consulta, e usa a API exatamente onde ela é mais adequada: escrita auditável e aderente às regras internas do GLPI.

## Fontes Oficiais

- [S1] GLPI REST API (`apirest.md`) — https://github.com/glpi-project/glpi/blob/master/apirest.md
- [S2] Plugin oficial `Fields` — https://github.com/pluginsGLPI/fields
- [S3] Plugin `customfields` descontinuado — https://github.com/pluginsGLPI/customfields
- [S4] GLPI Agent configuration 1.15 — https://glpi-agent.readthedocs.io/en/1.15/configuration.html
- [S5] GLPI Agent man page / execução e `--wait` — https://glpi-agent.readthedocs.io/en/1.9/man/glpi-agent.html
- [S6] GLPI Agent network inventory — https://glpi-agent.readthedocs.io/en/1.10/tasks/network-inventory.html
- [S7] GLPI Agent usage / distribuição de carga e importação — https://glpi-agent.readthedocs.io/en/1.7/usage.html
