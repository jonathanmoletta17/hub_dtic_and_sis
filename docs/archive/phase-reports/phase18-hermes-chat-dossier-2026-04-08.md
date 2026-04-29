# Phase 18 - Hermes Chat Dossier - 2026-04-08

## Objetivo

Consolidar as interacoes reais observadas no laboratorio do Hermes para `DTIC`, com foco em:

- mensagem original do usuario
- como o Hermes interpretou a demanda
- qual resposta o Hermes devolveu no primeiro turno
- quais dados o Hermes extraiu
- em quais casos ele acertou e em quais casos ainda falha

Fontes desta consolidacao:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase18-hermes-corpus-lab\summary.json`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase18-hermes-corpus-lab\failed-cases.json`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase18-hermes-corpus-lab\submissions.json`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase17-hermes-semantic-v1-service-probes\probe-sei-request.json`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase17-hermes-semantic-v1-service-probes\probe-vague-access.json`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase17-hermes-semantic-v1-service-probes\probe-collective-outage.json`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase17-hermes-semantic-v1-service-probes\probe-sei-error-500.json`

## Como ler

Para cada caso:

- `Usuario`: texto bruto enviado ao Hermes
- `Hermes classificou`: tipo, categoria e necessidade de clarificacao
- `Hermes respondeu`: o que o agente efetivamente devolveu no primeiro turno
- `Dados extraidos`: entidades e sinais que guiaram a decisao
- `Status`: se apenas montou draft, se segurou, ou se abriu ticket real

## 10 padroes falhos

### 1. Provisionamento claro ainda segura demais

- Caso: `new-user-protocol`
- Usuario: `Usuario novo precisa de acesso ao sistema de protocolo`
- Hermes classificou: `request`, categoria `22`, clarificacao `true`
- Hermes respondeu: `Entendi que pode ser uma solicitacao de acesso. Confirme o sistema afetado, se precisa liberar perfil, criar usuario ou resetar senha, e informe se o impacto e individual ou coletivo.`
- Dados extraidos: `target_system=sistema de protocolo`, `action_kind=create_user_access`, `impact_scope=single_person`
- Confianca: intencao `0.75`, categoria `0.80`
- Diagnostico: o Hermes entendeu praticamente tudo, mas a banda media de confianca ainda o faz segurar um caso que ja poderia abrir confirmacao
- Status: `skipped_clarification`

### 2. Sintoma de impressora ainda nao vira sintoma valido

- Caso: `printer-blank-output`
- Usuario: `A impressora Zebra da recepcao imprime em branco`
- Hermes classificou: `incident`, categoria `14`, clarificacao `true`
- Hermes respondeu: `Nao consegui entender de forma confiavel. Descreva o sistema ou equipamento afetado, o que voce precisava fazer, qual erro ou sintoma apareceu e qual o impacto no seu trabalho.`
- Dados extraidos: `device_or_asset=impressora`, `location_or_device=impressora`
- Slots faltantes: `symptom`
- Confianca: intencao `0.40`, categoria `0.80`
- Diagnostico: `imprime em branco` ainda nao e reconhecido como sintoma suficiente
- Status: `not_submitted`

### 3. VPN remota contaminada por sinal de hardware

- Caso: `vpn-home-failure`
- Usuario: `A VPN nao conecta no notebook de casa`
- Hermes classificou: `incident`, categoria `34`, clarificacao `true`
- Hermes respondeu: `Nao consegui entender de forma confiavel. Descreva o sistema ou equipamento afetado, o que voce precisava fazer, qual erro ou sintoma apareceu e qual o impacto no seu trabalho.`
- Dados extraidos: `target_system=VPN`, `channel_or_system=VPN`, `device_or_asset=notebook`, `network_surface=rede`
- Slots faltantes: `symptom`
- Confianca: intencao `0.40`, categoria `0.80`
- Diagnostico: o sinal `notebook` ainda contamina demais a categoria e puxa hardware `34` quando o esperado era rede/VPN `51`
- Status: `not_submitted`

### 4. Ponto de rede ainda cai em rede generica

- Caso: `network-point-room-204`
- Usuario: `O ponto de rede da sala 204 nao ativa`
- Hermes classificou: `incident`, categoria `51`, clarificacao `true`
- Hermes respondeu: `Nao consegui entender de forma confiavel. Descreva o sistema ou equipamento afetado, o que voce precisava fazer, qual erro ou sintoma apareceu e qual o impacto no seu trabalho.`
- Dados extraidos: `target_system=rede`, `network_surface=rede`, `location_or_device=204`
- Confianca: intencao `0.40`, categoria `0.80`
- Diagnostico: `ponto de rede` ainda nao tem precedencia sobre `rede` generica, entao o caso nao chega em `54`
- Status: `not_submitted`

### 5. Periferico com frase comum ainda nao fecha sintoma

- Caso: `mouse-stopped-working`
- Usuario: `O mouse do financeiro parou de funcionar`
- Hermes classificou: `incident`, categoria `34`, clarificacao `true`
- Hermes respondeu: `Entendi que pode ser um problema de equipamento. Informe o equipamento afetado e descreva o sintoma observado.`
- Dados extraidos: `device_or_asset=mouse`, `location_or_device=mouse`
- Slots faltantes: `symptom`
- Confianca: intencao `0.65`, categoria `0.80`
- Diagnostico: `parou de funcionar` ainda nao e normalizado como sintoma suficiente
- Status: `not_submitted`

### 6. Sistema real fora do dicionario ainda trava acesso

- Caso: `siafem-access-request`
- Usuario: `Preciso de acesso ao SIAFEM para liquidacao`
- Hermes classificou: `request`, categoria `22`, clarificacao `true`
- Hermes respondeu: `Entendi que pode ser uma solicitacao de acesso. Confirme o sistema afetado, se precisa liberar perfil, criar usuario ou resetar senha, e informe se o impacto e individual ou coletivo.`
- Dados extraidos: `action_kind=grant_access`, `impact_scope=single_person`
- Slots faltantes: `target_system`
- Confianca: intencao `0.93`, categoria `0.80`
- Diagnostico: o Hermes entende que e acesso, mas nao reconhece `SIAFEM` como sistema valido
- Status: `not_submitted`

### 7. Falha de login em sistema real ainda pode ficar sem categoria

- Caso: `siafem-login-failure`
- Usuario: `Nao consigo acessar o SIAFEM`
- Hermes classificou: `incident`, categoria `null`, clarificacao `true`
- Hermes respondeu: `Entendi que parece um incidente, mas ainda faltam detalhes. Informe o sistema ou equipamento afetado, o erro ou sintoma e o impacto no trabalho.`
- Dados extraidos: `action_kind=investigate_error`, `error_or_symptom=nao consegue entrar`, `impact_scope=single_person`
- Confianca: intencao `0.83`, categoria `0.00`
- Diagnostico: a intencao esta boa, mas sem o sistema no dicionario o Hermes nao consegue sustentar categoria
- Status: `not_submitted`

### 8. Tela azul ainda nao entra como sintoma estruturado

- Caso: `notebook-blue-screen`
- Usuario: `O notebook da assessoria entra em tela azul ao iniciar`
- Hermes classificou: `incident`, categoria `34`, clarificacao `true`
- Hermes respondeu: `Nao consegui entender de forma confiavel. Descreva o sistema ou equipamento afetado, o que voce precisava fazer, qual erro ou sintoma apareceu e qual o impacto no seu trabalho.`
- Dados extraidos: `device_or_asset=notebook`, `location_or_device=notebook`
- Slots faltantes: `symptom`
- Confianca: intencao `0.40`, categoria `0.80`
- Diagnostico: `tela azul` ainda nao esta coberta no mapa de sintomas
- Status: `not_submitted`

### 9. Email que nao envia ainda nao fecha sintoma operacional

- Caso: `outlook-not-sending`
- Usuario: `O Outlook abre, mas nao envia email para fora do dominio`
- Hermes classificou: `incident`, categoria `2`, clarificacao `true`
- Hermes respondeu: `Nao consegui entender de forma confiavel. Descreva o sistema ou equipamento afetado, o que voce precisava fazer, qual erro ou sintoma apareceu e qual o impacto no seu trabalho.`
- Dados extraidos: `target_system=email`, `channel_or_system=email`, `impact_scope=single_person`
- Slots faltantes: `symptom_or_action`
- Confianca: intencao `0.40`, categoria `0.80`
- Diagnostico: `nao envia email` ainda nao e mapeado como sintoma valido para email
- Status: `not_submitted`

### 10. Pedido de perfil ainda nao vira acao de acesso

- Caso: `sei-profile-signing`
- Usuario: `Preciso de perfil para assinar processo no SEI`
- Hermes classificou: `request`, categoria `22`, clarificacao `true`
- Hermes respondeu: `Entendi que pode ser uma solicitacao de acesso. Confirme o sistema afetado, se precisa liberar perfil, criar usuario ou resetar senha, e informe se o impacto e individual ou coletivo.`
- Dados extraidos: `target_system=SEI`, `channel_or_system=SEI`, `impact_scope=single_person`
- Slots faltantes: `action_kind`
- Confianca: intencao `0.55`, categoria `0.62`
- Diagnostico: `perfil para assinar processo` ainda nao e reconhecido como uma acao valida de acesso/perfil
- Status: `not_submitted`

## 10 padroes assertivos

### 1. Incidente de notebook sem boot

- Caso: `hw-notebook-no-boot-urgent`
- Usuario: `Meu notebook nao liga e preciso trabalhar com urgencia.`
- Hermes classificou: `incident`, categoria `34`, clarificacao `false`
- Hermes respondeu com draft:
  - titulo: `Notebook nao liga e preciso trabalhar com urgencia`
  - conteudo: `Usuario relata que meu notebook nao liga e preciso trabalhar com urgencia.. Relato original: Meu notebook nao liga e preciso trabalhar com urgencia. Solicitante: Jonathan Moletta. Departamento: DTIC.`
- Dados extraidos: `error_or_symptom=nao liga`, `device_or_asset=notebook`, `impact_scope=single_person`
- Confianca: intencao `0.85`, categoria `0.80`
- Status: ticket real criado e limpo, id `13627`

### 2. Solicitacao clara de acesso ao SEI

- Caso: `access-sei-request`
- Usuario: `Preciso de acesso ao SEI`
- Hermes classificou: `request`, categoria `22`, clarificacao `false`
- Hermes respondeu com draft:
  - titulo: `Preciso de acesso ao SEI`
  - conteudo: `Usuario solicita liberacao de acesso ao SEI. Relato original: Preciso de acesso ao SEI. Solicitante: Jonathan Moletta. Departamento: DTIC.`
- Dados extraidos: `target_system=SEI`, `action_kind=grant_access`, `impact_scope=single_person`
- Confianca: intencao `0.99`, categoria `0.80`
- Status: ticket real criado e limpo, id `13628`

### 3. Relato vago de acesso foi corretamente segurado

- Caso: `access-vague`
- Usuario: `Nao sei o que aconteceu com meu acesso`
- Hermes classificou: `incident`, categoria `22`, clarificacao `true`
- Hermes respondeu: `Nao consegui entender de forma confiavel. Descreva o sistema ou equipamento afetado, o que voce precisava fazer, qual erro ou sintoma apareceu e qual o impacto no seu trabalho.`
- Dados extraidos: `impact_scope=single_person`
- Slots faltantes: `target_system`, `error_or_symptom`
- Confianca: intencao `0.40`, categoria `0.80`
- Status: `not_submitted`

### 4. Outage coletivo nao virou request

- Caso: `collective-protocol-outage`
- Usuario: `Estamos todos sem acesso ao sistema de protocolo`
- Hermes classificou: `incident`, categoria `22`, clarificacao `false`, urgencia `4`
- Hermes respondeu com draft:
  - titulo: `Estamos todos sem acesso ao sistema de protocolo`
  - conteudo: `Usuario relata sem acesso em sistema de protocolo. Relato original: Estamos todos sem acesso ao sistema de protocolo. Solicitante: Jonathan Moletta. Departamento: DTIC.`
- Dados extraidos: `target_system=sistema de protocolo`, `impact_scope=collective`, `error_or_symptom=sem acesso`, `action_kind=investigate_error`
- Confianca: intencao `0.96`, categoria `0.80`
- Status: ticket real criado e limpo, id `13629`

### 5. Usuario novo sem sistema foi corretamente segurado

- Caso: `new-user-no-system`
- Usuario: `Usuario novo precisa de acesso`
- Hermes classificou: `request`, categoria `22`, clarificacao `true`
- Hermes respondeu: `Entendi que pode ser uma solicitacao de acesso. Confirme o sistema afetado, se precisa liberar perfil, criar usuario ou resetar senha, e informe se o impacto e individual ou coletivo.`
- Dados extraidos: `action_kind=create_user_access`, `impact_scope=single_person`
- Slots faltantes: `target_system`
- Confianca: intencao `0.63`, categoria `0.80`
- Status: `not_submitted`

### 6. Falha de login em email institucional

- Caso: `email-login-failure`
- Usuario: `Nao consigo entrar no email institucional`
- Hermes classificou: `incident`, categoria `2`, clarificacao `false`
- Hermes respondeu com draft:
  - titulo: `Nao consigo entrar no email institucional`
  - conteudo: `Usuario relata nao consegue entrar em email. Relato original: Nao consigo entrar no email institucional. Solicitante: Jonathan Moletta. Departamento: DTIC.`
- Dados extraidos: `target_system=email`, `error_or_symptom=nao consegue entrar`, `action_kind=investigate_error`
- Confianca: intencao `0.95`, categoria `0.80`
- Status: ticket real criado e limpo, id `13630`

### 7. Reset de senha de email

- Caso: `email-password-reset`
- Usuario: `Preciso resetar a senha do email institucional`
- Hermes classificou: `request`, categoria `24`, clarificacao `false`
- Hermes respondeu com draft:
  - titulo: `Preciso resetar a senha do email institucional`
  - conteudo: `Usuario solicita preciso resetar a senha do email institucional. Relato original: Preciso resetar a senha do email institucional. Solicitante: Jonathan Moletta. Departamento: DTIC.`
- Dados extraidos: `target_system=email`, `action_kind=reset_password`, `impact_scope=single_person`
- Confianca: intencao `0.99`, categoria `0.80`
- Status: ticket real criado e limpo, id `13631`

### 8. Instalacao de software

- Caso: `office-install-request`
- Usuario: `Preciso instalar o Office no notebook da diretoria`
- Hermes classificou: `request`, categoria `20`, clarificacao `false`
- Hermes respondeu com draft:
  - titulo: `Preciso instalar o Office no notebook da diretoria`
  - conteudo: `Usuario solicita preciso instalar o office no notebook da diretoria. Relato original: Preciso instalar o Office no notebook da diretoria. Solicitante: Jonathan Moletta. Departamento: DTIC.`
- Dados extraidos: `software_name=Office`, `action_kind=install_software`, `device_or_asset=notebook`
- Confianca: intencao `0.99`, categoria `0.80`
- Status: `not_submitted`

### 9. Indisponibilidade de wifi

- Caso: `wifi-4th-floor-outage`
- Usuario: `O wifi do andar 4 esta indisponivel desde cedo`
- Hermes classificou: `incident`, categoria `37`, clarificacao `false`
- Hermes respondeu com draft:
  - titulo: `Wifi do andar 4 esta indisponivel desde cedo`
  - conteudo: `Usuario relata indisponivel em wifi. Relato original: O wifi do andar 4 esta indisponivel desde cedo. Solicitante: Jonathan Moletta. Departamento: DTIC.`
- Dados extraidos: `target_system=wifi`, `network_surface=wifi`, `location_or_device=4`, `error_or_symptom=indisponivel`
- Confianca: intencao `0.99`, categoria `0.80`
- Status: `not_submitted`

### 10. Erro 500 no SEI foi corretamente segurado

- Caso: `sei-error-500-sign`
- Usuario: `Erro 500 ao assinar processo no SEI`
- Hermes classificou: `incident`, categoria `22`, clarificacao `true`
- Hermes respondeu: `Entendi que pode ser um problema de acesso. Confirme o sistema afetado, descreva a mensagem de erro ou sintoma e informe se o impacto e individual ou coletivo.`
- Dados extraidos: `target_system=SEI`, `error_or_symptom=erro 500`, `action_kind=investigate_error`
- Confianca: intencao `0.99`, categoria `0.62`
- Diagnostico: esse caso passou porque a expectativa do corpus ja era segurar por baixa confianca de categoria
- Status: `not_submitted`

## Probes com shadow semantico respondendo

Estes probes vieram de uma execucao separada em que a camada semantica respondeu com sucesso. Eles ajudam a ver como o Hermes entende o caso quando o modelo local de fato participa.

### Probe 1. Acesso ao SEI

- Arquivo: `probe-sei-request.json`
- Usuario: `Preciso de acesso ao SEI`
- Heuristica: `request`, confianca `0.99`, categoria `22`
- Semantico: `request`, confianca `0.95`, categoria `22`
- Resultado: `agreement`
- O que o Hermes entendeu:
  - heuristica: `target_system=SEI`, `action_kind=grant_access`, `impact_scope=single_person`
  - semantico: `target_system=SEI`, `action_kind=grant_access`, `impact_scope=single_person`

### Probe 2. Acesso vago

- Arquivo: `probe-vague-access.json`
- Usuario: `Nao sei o que aconteceu com meu acesso`
- Heuristica: `incident`, confianca `0.40`, categoria `22`, faltando `target_system` e `error_or_symptom`
- Semantico: `incident`, confianca `0.56`, categoria `22`, faltando `target_system` e `error_or_symptom`
- Resultado: `agreement`
- Pergunta de clarificacao produzida pelo semantico: `Entendi que pode ser um problema de acesso. Confirme o sistema afetado e a mensagem de erro ou sintoma apresentado.`

### Probe 3. Outage coletivo

- Arquivo: `probe-collective-outage.json`
- Usuario: `Estamos todos sem acesso ao sistema de protocolo`
- Heuristica: `incident`, confianca `0.96`, categoria `22`, urgencia `4`
- Semantico: `incident`, confianca `0.96`, categoria `22`, urgencia `4`
- Resultado: `agreement`
- O que o Hermes entendeu:
  - `target_system=sistema de protocolo`
  - `impact_scope=collective`
  - `error_or_symptom=sem acesso`

### Probe 4. Erro 500 ao assinar no SEI

- Arquivo: `probe-sei-error-500.json`
- Usuario: `Portal do servidor deu erro 500 ao assinar processo no SEI`
- Heuristica: `incident`, confianca `0.99`, categoria `22`, categoria com confianca `0.62`
- Semantico: `incident`, confianca `0.93`, categoria `22`, categoria com confianca `0.46`
- Resultado: `shadow_winner=heuristic`
- Divergencia observada:
  - o semantico sugeriu falta de `action_kind`
  - a heuristica entendeu `investigate_error`
- Consequencia: o caso continua segurado para clarificacao, o que faz sentido operacionalmente

## Conclusao objetiva

O Hermes hoje interage bem em tres cenarios:

- quando a demanda e clara e o dicionario cobre o sistema e o sintoma
- quando o pedido exige clarificacao obvia e o agente precisa segurar
- quando o caso e outage coletivo e nao pode ser degradado para `request`

Os erros remanescentes concentram-se em quatro familias:

- sistemas reais fora do dicionario
- frases de sintoma muito comuns ainda nao lexicalizadas
- disputas de prioridade entre rede e hardware
- pedidos de perfil/permissao ainda sem acao formal mapeada

Esse e o ponto exato em que o Hermes esta: seguro para operar, mas ainda com lacunas importantes de cobertura semantica.
