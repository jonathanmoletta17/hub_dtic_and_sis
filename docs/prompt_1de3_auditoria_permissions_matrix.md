# PROMPT 1/3 — Auditoria: PermissionsMatrix.tsx — Contratos e Estado Atual

> Sequência: ETAPA 1 → ETAPA 2 → ETAPA 3  
> Esta etapa PRECEDE qualquer implementação de backend.  
> Destino: antigravity  
> Regra absoluta: ZERO alterações. Apenas leitura, análise e extração de contratos.

---

## CONTEXTO

O relatório de estudo das bases GLPI confirmou que o componente `PermissionsMatrix.tsx`
já existe como "embrião avançado" — a interface, modais e toggles foram construídos.

O que falta são 3 endpoints no backend que o frontend está esperando.

**Antes de escrever uma linha de backend**, precisamos extrair com precisão cirúrgica
o contrato exato que o frontend espera — quais URLs chama, quais payloads envia,
quais respostas espera, como trata erros.

Implementar o backend sem esse mapeamento garante retrabalho.

---

## OBJETIVO

Extrair o contrato completo entre `PermissionsMatrix.tsx` (e componentes relacionados)
e o backend — para que o backend seja implementado exatamente do jeito que o frontend
precisa, sem divergência de campo, URL ou estrutura.

---

## FASE 1 — LEITURA COMPLETA DO COMPONENTE

### 1.1 — Ler todos os arquivos relacionados à tela de permissões

Identificar e ler na íntegra:
- `web/src/features/permissions/components/PermissionsMatrix.tsx`
- `web/src/app/[context]/permissoes/page.tsx`
- Qualquer hook, service ou tipo importado por esses arquivos
- Qualquer arquivo em `web/src/lib/api/` referenciado

### 1.2 — Mapear todas as chamadas HTTP

Para cada chamada HTTP encontrada no componente ou em seus serviços, registrar:

```
CHAMADA [n]
  Método: GET | POST | DELETE | PUT | PATCH
  URL: [exata — incluindo parâmetros de rota e query]
  Quando é disparada: [ação do usuário ou mount do componente]
  Payload enviado (body): [estrutura exata dos campos]
  Resposta esperada (sucesso): [estrutura dos campos esperados]
  Resposta esperada (erro): [como o componente trata falhas]
  Estado Zustand ou local afetado: [o que muda no store após a resposta]
```

### 1.3 — Identificar chamadas simuladas vs. reais

Classificar cada chamada como:
- **REAL** — chama endpoint que já existe no backend e retorna dados reais
- **SIMULADA** — chama endpoint que não existe, retorna mock local, ou está comentada
- **PENDENTE** — importada mas nunca chamada ainda

Para as **SIMULADAS** e **PENDENTES**: essas são os 3 endpoints que precisam ser criados.

---

## FASE 2 — EXTRAÇÃO DOS TIPOS TYPESCRIPT

### 2.1 — Tipos usados para dados de usuários/permissões

Localizar em `web/src/types/` ou inline no componente:
- O tipo que representa um usuário na listagem de permissões
- O tipo que representa um módulo/grupo Hub-App-*
- O tipo que representa um vínculo usuário ↔ módulo
- O tipo do payload de atribuição (POST)
- O tipo do payload de revogação (DELETE)
- O tipo da resposta de diagnóstico

Para cada tipo, registrar a definição exata:
```typescript
// nome do tipo → definição completa
type PermissionUser = {
  id: number
  name: string
  ...
}
```

### 2.2 — Identificar campos opcionais vs. obrigatórios

Para cada tipo que será parte do contrato de API:
- Quais campos são obrigatórios (sem `?`)
- Quais são opcionais
- Quais têm valores default no componente

### 2.3 — Identificar incompatibilidades com o modelo GLPI

O GLPI retorna dados em snake_case. O frontend React usa camelCase.
Identificar onde existe transformação e onde não existe — isso impacta o backend:
- O backend deve retornar camelCase (transformando do GLPI)?
- Ou o frontend faz a transformação?
- Há inconsistência entre os dois padrões no componente atual?

---

## FASE 3 — MAPEAMENTO DO ESTADO E FLUXOS

### 3.1 — Estado local e global do componente

- Quais `useState` existem e o que controlam
- Quais campos do Zustand store são lidos (`useAuthStore`)
- Como o contexto (`dtic` / `sis`) é obtido e passado para as chamadas

### 3.2 — Fluxos de ação do usuário

Para cada ação que o gestor pode realizar na tela, mapear o fluxo completo:

```
FLUXO: [nome da ação]
  Trigger: [clique em botão X / toggle Y]
  Estado antes: [o que está na tela]
  Chamada disparada: [método + URL + payload]
  Otimismo de UI: [a tela muda antes da resposta? ou espera?]
  Estado após sucesso: [o que muda na tela]
  Estado após erro: [como o erro é exibido]
```

### 3.3 — Loading states e feedback visual

- Onde existem spinners ou estados de loading
- Quais ações têm feedback visual de progresso
- Quais ações usam toast/notification após conclusão

---

## FASE 4 — CONTRATO FINAL DOS 3 ENDPOINTS

Com base nas Fases 1, 2 e 3, sintetizar o contrato definitivo de cada endpoint pendente.
Este contrato será a especificação exata para o prompt de implementação do backend.

```
════════════════════════════════
ENDPOINT 1 — Diagnóstico de usuários
════════════════════════════════
Método: GET
URL exata esperada pelo frontend: /api/v1/{context}/admin/users/diagnostics
Parâmetros de query: [lista]
Resposta esperada:
{
  users: [
    {
      id: number
      name: string
      [todos os campos que o componente usa]
    }
  ],
  alerts: [
    {
      type: string
      user_id: number
      [outros campos]
    }
  ]
}
Quando é chamado: [mount do componente? ação específica?]
Autenticação: [header esperado]

════════════════════════════════
ENDPOINT 2 — Atribuir módulo a usuário
════════════════════════════════
Método: POST
URL exata: /api/v1/{context}/admin/users/{user_id}/groups/{group_id}
Body esperado: [estrutura exata ou vazio]
Resposta de sucesso: [estrutura + status HTTP]
Resposta de erro: [estrutura]
Otimismo de UI: [sim/não]

════════════════════════════════
ENDPOINT 3 — Revogar módulo de usuário
════════════════════════════════
Método: DELETE
URL exata: /api/v1/{context}/admin/users/{user_id}/groups/{group_id}
Body (se houver): [estrutura]
Resposta de sucesso: [estrutura + status HTTP]
Resposta de erro: [estrutura]
```

---

## FORMATO DE ENTREGA

```
AUDITORIA: PermissionsMatrix.tsx
─────────────────────────────────

1. CHAMADAS HTTP ENCONTRADAS
   [n chamadas — tabela com método, URL, status REAL/SIMULADA/PENDENTE]

2. TIPOS TYPESCRIPT DO CONTRATO
   [definições completas de cada tipo relevante]

3. INCONSISTÊNCIAS ENCONTRADAS
   [campos que o componente espera mas que podem divergir do GLPI]
   [transformações camelCase/snake_case — onde ocorrem]

4. FLUXOS MAPEADOS
   [cada ação do gestor com trigger, chamada e estados]

5. CONTRATO DOS 3 ENDPOINTS (especificação completa)
   [Endpoint 1 — Diagnóstico]
   [Endpoint 2 — Atribuir]
   [Endpoint 3 — Revogar]

6. DEPENDÊNCIAS E RISCOS
   [o que pode quebrar durante a implementação do backend]
   [campos opcionais que podem causar undefined no frontend]
```

---

## CRITÉRIOS

- O contrato dos endpoints deve ser 100% derivado do que o frontend já espera
- Nenhum campo inventado — apenas o que o componente efetivamente consome
- Se o componente usa mock com estrutura diferente do GLPI real, documentar a divergência
- A entrega desta etapa é o insumo direto para o Prompt 2/3 (implementação do backend)
- Sem esta entrega completa, não iniciar o Prompt 2/3

---

*Gerado via PROMPT_LIBRARY — P01 Auditoria de Contrato | hub_dtic_and_sis | 2026-03-10 | Etapa 1/3*
