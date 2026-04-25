# Phase 19 - Hermes Follow-up Lab - 2026-04-08

## Objetivo

Simular a segunda interacao dos `10` casos falhos do laboratorio anterior, preservando o comportamento real do app Streamlit:

- turno 1: usuario envia a mensagem original
- turno 1: Hermes pede clarificacao
- turno 2: usuario responde a clarificacao
- turno 2: Hermes reprocessa apenas a ultima mensagem, sem memoria explicita do turno anterior

## Artefatos

- Corpus de follow-up no Hermes:
  - `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\scripts\dtic_followup_lab_corpus.json`
- Runner do laboratorio:
  - `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\scripts\run_followup_clarification_lab.py`
- Evidencias geradas no hub:
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase19-hermes-followup-lab\summary.json`
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase19-hermes-followup-lab\transcripts.json`
  - `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase19-hermes-followup-lab\submissions.json`

## Comando executado

```powershell
python C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\scripts\run_followup_clarification_lab.py --output-dir C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase19-hermes-followup-lab
```

## Resultado consolidado

- casos testados: `10`
- todos chegaram em clarificacao no turno 1: `10`
- destravaram no turno 2: `6`
- continuaram em clarificacao no turno 2: `4`
- follow-ups que bateram exatamente a expectativa ideal: `4`
- follow-ups que ainda falharam de alguma forma: `6`
- submissoes reais de follow-up resolvido: `4`
- tickets criados e limpos com sucesso: `4`

## Achado estrutural principal

O Hermes hoje nao conversa com memoria de estado no chat. No Streamlit atual, o turno 2 nao reaproveita o texto do turno 1. Ele roda `prepare_ticket()` apenas sobre a ultima mensagem do usuario.

Na pratica:

- se o usuario responde a clarificacao com linguagem que ja contem sistema, sintoma e acao em termos que o parser reconhece, o agente pode destravar
- se o usuario responde de modo natural, mas usando termos fora do dicionario ou fora dos patterns, o agente continua travando ou pode destravar para a categoria errada

## Grupos observados

### Grupo A - Destravou corretamente no turno 2

- `printer-blank-output`
- `mouse-stopped-working`
- `notebook-blue-screen`
- `outlook-not-sending`

### Grupo B - Destravou, mas resolveu errado

- `vpn-home-failure`
  - virou `incident` categoria `34` em vez de `51`
- `network-point-room-204`
  - virou `incident` categoria `51` em vez de `54`

### Grupo C - Continuou travado

- `new-user-protocol`
  - continuou em clarificacao e foi para categoria `35`, nao `22`
- `siafem-access-request`
  - virou `incident` em vez de `request` e continuou sem `target_system`
- `siafem-login-failure`
  - continuou em clarificacao por falta de `target_system`
- `sei-profile-signing`
  - continuou em clarificacao por falta de `action_kind`

## Chats completos do laboratorio

### 1. new-user-protocol

```text
Usuario: Usuario novo precisa de acesso ao sistema de protocolo
Hermes: Entendi que pode ser uma solicitacao de acesso. Confirme o sistema afetado, se precisa liberar perfil, criar usuario ou resetar senha, e informe se o impacto e individual ou coletivo.
Usuario: Sistema de protocolo, criar usuario novo para servidora recem admitida, impacto individual.
Hermes: Nao consegui entender de forma confiavel. Descreva o sistema ou equipamento afetado, o que voce precisava fazer, qual erro ou sintoma apareceu e qual o impacto no seu trabalho.
```

Resultado do turno 2:

- tipo: `request`
- categoria: `35`
- clarificacao: `true`
- diagnostico: mesmo entendendo `create_user_access` e `sistema de protocolo`, o Hermes continua segurando por banda media e ainda muda a categoria para `35`

### 2. printer-blank-output

```text
Usuario: A impressora Zebra da recepcao imprime em branco
Hermes: Nao consegui entender de forma confiavel. Descreva o sistema ou equipamento afetado, o que voce precisava fazer, qual erro ou sintoma apareceu e qual o impacto no seu trabalho.
Usuario: E a impressora Zebra da recepcao. O sintoma e que nao funciona e imprime em branco.
Hermes: Draft gerado. Revise a confirmacao abaixo antes de criar o ticket.
```

Resultado do turno 2:

- tipo: `incident`
- categoria: `14`
- clarificacao: `false`
- ticket real criado e limpo: `#13633`

### 3. vpn-home-failure

```text
Usuario: A VPN nao conecta no notebook de casa
Hermes: Nao consegui entender de forma confiavel. Descreva o sistema ou equipamento afetado, o que voce precisava fazer, qual erro ou sintoma apareceu e qual o impacto no seu trabalho.
Usuario: E VPN no notebook de casa. O sintoma e que nao funciona e nao conecta.
Hermes: Draft gerado. Revise a confirmacao abaixo antes de criar o ticket.
```

Resultado do turno 2:

- tipo: `incident`
- categoria: `34`
- clarificacao: `false`
- ticket real criado e limpo: `#13634`
- diagnostico: destrava, mas o sinal `notebook` ainda contamina a categorizacao e puxa hardware no lugar de rede/VPN

### 4. network-point-room-204

```text
Usuario: O ponto de rede da sala 204 nao ativa
Hermes: Nao consegui entender de forma confiavel. Descreva o sistema ou equipamento afetado, o que voce precisava fazer, qual erro ou sintoma apareceu e qual o impacto no seu trabalho.
Usuario: E o ponto de rede cabeada da sala 204. O sintoma e que nao funciona.
Hermes: Draft gerado. Revise a confirmacao abaixo antes de criar o ticket.
```

Resultado do turno 2:

- tipo: `incident`
- categoria: `51`
- clarificacao: `false`
- ticket real criado e limpo: `#13635`
- diagnostico: destrava, mas `ponto de rede` continua sendo reduzido a `rede` generica

### 5. mouse-stopped-working

```text
Usuario: O mouse do financeiro parou de funcionar
Hermes: Entendi que pode ser um problema de equipamento. Informe o equipamento afetado e descreva o sintoma observado.
Usuario: E o mouse do financeiro. O sintoma e que nao funciona e nao move o cursor.
Hermes: Draft gerado. Revise a confirmacao abaixo antes de criar o ticket.
```

Resultado do turno 2:

- tipo: `incident`
- categoria: `34`
- clarificacao: `false`
- ticket real criado e limpo: `#13636`

### 6. siafem-access-request

```text
Usuario: Preciso de acesso ao SIAFEM para liquidacao
Hermes: Entendi que pode ser uma solicitacao de acesso. Confirme o sistema afetado, se precisa liberar perfil, criar usuario ou resetar senha, e informe se o impacto e individual ou coletivo.
Usuario: E acesso ao SIAFEM para liquidacao. Precisa liberar perfil, impacto individual.
Hermes: Nao consegui entender de forma confiavel. Descreva o sistema ou equipamento afetado, o que voce precisava fazer, qual erro ou sintoma apareceu e qual o impacto no seu trabalho.
```

Resultado do turno 2:

- tipo: `incident`
- categoria: `22`
- clarificacao: `true`
- diagnostico: o Hermes perde a intencao de `request` e, sem reconhecer `SIAFEM`, continua sem fechar os slots certos

### 7. siafem-login-failure

```text
Usuario: Nao consigo acessar o SIAFEM
Hermes: Entendi que parece um incidente, mas ainda faltam detalhes. Informe o sistema ou equipamento afetado, o erro ou sintoma e o impacto no trabalho.
Usuario: E o SIAFEM. O sintoma e sem acesso ao entrar, impacto individual.
Hermes: Entendi que pode ser um problema de acesso. Confirme o sistema afetado, descreva a mensagem de erro ou sintoma e informe se o impacto e individual ou coletivo.
```

Resultado do turno 2:

- tipo: `incident`
- categoria: `22`
- clarificacao: `true`
- diagnostico: melhora a categoria, mas ainda trava porque `SIAFEM` nao entra como `target_system`

### 8. notebook-blue-screen

```text
Usuario: O notebook da assessoria entra em tela azul ao iniciar
Hermes: Nao consegui entender de forma confiavel. Descreva o sistema ou equipamento afetado, o que voce precisava fazer, qual erro ou sintoma apareceu e qual o impacto no seu trabalho.
Usuario: E o notebook da assessoria. O sintoma e que nao funciona e entra em tela azul ao iniciar.
Hermes: Draft gerado. Revise a confirmacao abaixo antes de criar o ticket.
```

Resultado do turno 2:

- tipo: `incident`
- categoria: `34`
- clarificacao: `false`
- diagnostico: o caso so destrava porque o follow-up inclui o pattern reconhecido `nao funciona`

### 9. outlook-not-sending

```text
Usuario: O Outlook abre, mas nao envia email para fora do dominio
Hermes: Nao consegui entender de forma confiavel. Descreva o sistema ou equipamento afetado, o que voce precisava fazer, qual erro ou sintoma apareceu e qual o impacto no seu trabalho.
Usuario: E o email Outlook. O sintoma e que deu erro e nao envia mensagens para fora do dominio.
Hermes: Draft gerado. Revise a confirmacao abaixo antes de criar o ticket.
```

Resultado do turno 2:

- tipo: `incident`
- categoria: `2`
- clarificacao: `false`
- diagnostico: o caso destrava quando o usuario troca `nao envia` por `deu erro`, que ja existe no mapa de sintomas

### 10. sei-profile-signing

```text
Usuario: Preciso de perfil para assinar processo no SEI
Hermes: Entendi que pode ser uma solicitacao de acesso. Confirme o sistema afetado, se precisa liberar perfil, criar usuario ou resetar senha, e informe se o impacto e individual ou coletivo.
Usuario: E no SEI. Preciso liberar perfil de assinatura para assinar processo, impacto individual.
Hermes: Entendi que pode ser uma solicitacao de acesso. Confirme o sistema afetado, se precisa liberar perfil, criar usuario ou resetar senha, e informe se o impacto e individual ou coletivo.
```

Resultado do turno 2:

- tipo: `request`
- categoria: `22`
- clarificacao: `true`
- diagnostico: o Hermes continua sem transformar `perfil de assinatura` em `action_kind`

## Leitura final

O turno 2 confirma duas coisas ao mesmo tempo:

- o Hermes consegue se recuperar quando a resposta do usuario usa exatamente os sinais que o parser ja reconhece
- o desenho atual do chat ainda e fraco porque nao preserva contexto multi-turno e continua dependente de um vocabulário muito estreito

## Prioridades tecnicas abertas

- adicionar memoria de conversa ou reenriquecimento do turno 2 com o turno 1
- corrigir prioridade de `VPN` versus `notebook`
- corrigir prioridade de `ponto de rede` versus `rede`
- adicionar sistemas reais como `SIAFEM`
- adicionar `perfil de assinatura` e similares como `action_kind`
- revisar porque provisionamento claro de usuario novo cai em categoria `35` no follow-up
