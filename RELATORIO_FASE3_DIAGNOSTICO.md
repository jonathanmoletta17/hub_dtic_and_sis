# 🚨 RELATÓRIO FASE 3 — Diagnóstico do Problema de Roteamento/Redirect

## Root Cause Identificado

O projeto **não está "quebrado por uma mudança recente"**. O problema é estritamente **arquitetural**: o `middleware.ts` do Next.js foi adicionado com uma lógica que é **incompatível** com o modelo de autenticação do projeto (Zustand + localStorage). Nunca poderia ter funcionado com o middleware como está.

A cadeia de falha é a seguinte:

```
1. Usuário acessa http://carregadores.local:8080 → NPM → Frontend → page.tsx (Login)
2. Usuário envia credenciais → apiLogin() → Backend retorna 200 OK com session_token
3. Frontend salva dados no Zustand (localStorage) → login(username, password)
4. Frontend faz router.push("/selector")
5. Next.js Middleware intercepta /selector antes de renderizar
6. Middleware procura cookie "sessionToken" → NÃO EXISTE
7. Middleware retorna 307 Redirect → /?session_expired=1
8. Usuário volta à tela de login (loop infinito)
```

**O cookie NUNCA é criado durante o login.** A única linha que cria o cookie (`document.cookie = ...`) está no `selector/page.tsx` (linha 61), que é a página que o Middleware bloqueia. O código que deveria setar o cookie está atrás do muro que exige o cookie. É um deadlock lógico.

---

## Evidências

### Evidência 1: `middleware.ts` (L22-31)
```typescript
const token = request.cookies.get('sessionToken')?.value || 
              request.headers.get('Session-Token') || 
              request.headers.get('X-Session-Token');

if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('session_expired', '1');
    return NextResponse.redirect(url);  // ← 307 Redirect
}
```
O middleware exige `sessionToken` cookie para prosseguir.

### Evidência 2: `page.tsx` (L27-31) — Login
```typescript
await apiLogin("dtic", { username, password });
login(username, password);  // ← Zustand only, NO COOKIE
router.push("/selector");   // ← Bloqueado pelo middleware
```
Nenhum `document.cookie` é setado aqui.

### Evidência 3: `selector/page.tsx` (L60-62) — Código Inalcançável
```typescript
if (typeof document !== 'undefined' && identity.session_token) {
    document.cookie = `sessionToken=${identity.session_token}; path=/; max-age=86400; samesite=strict`;
}
```
Este é o único ponto que cria o cookie, mas está na página que o middleware bloqueia.

### Evidência 4: CORS (`app/main.py` L72-74)
```python
allow_origins=["http://localhost:3000"]
```
Quando o browser acessa via `http://carregadores.local:8080`, o frontend faz requests para `http://api.carregadores.local:8080`. A origin é `http://carregadores.local:8080`, que **não** está na lista de CORS → requests são bloqueados pelo browser (mesmo com NPM funcionando perfeitamente).

### Evidência 5: Network Log do Usuário
```
login          200  fetch  httpClient.ts:82  47ms
selector?_rsc  307  fetch  page.tsx:31       11ms   ← BLOQUEIO
?session_expired=1  200  fetch  23ms                ← LOOP
```

---

## Problemas Secundários Encontrados

| # | Problema | Arquivo | Severidade |
|---|---|---|---|
| 1 | `_credentials` armazena senha em texto claro no browser (memória, não persist) | `useAuthStore.ts:63` | 🟡 Alto |
| 2 | Login duplo: primeiro em `page.tsx`, segundo em `selector/page.tsx` (`apiLogin` é chamada duas vezes) | `page.tsx:29` + `selector/page.tsx:82` | 🟡 Médio |
| 3 | `useAuthStore.login()` reseta `sessionTokens: {}` a cada login, perdendo tokens anteriores | `useAuthStore.ts:114` | 🟡 Médio |
| 4 | Frontend Dockerfile: `ENV PORT=3001` mas CMD usa `-p 3000` (inconsistente) | `web/Dockerfile:15,20` | 🟢 Baixo |
| 5 | `[context]/layout.tsx` não tem nenhum auth check (apenas visual) — depende de ProtectedRoute dentro de cada page | `app/[context]/layout.tsx` | 🟢 Info |
| 6 | `formcreator` router não tem auth guard | `app/routers/domain_formcreator.py` | 🟡 Médio |

---

## Plano de Correção (Priorizado)

### Correção 1 (Crítica — sem isso nada funciona): Setar Cookie no Login

**O que fazer:** No `page.tsx`, após o login bem-sucedido e antes do `router.push("/selector")`, criar o cookie `sessionToken` que o middleware espera.

**Por que:** O middleware precisa do cookie para permitir a navegação. Sem isso, todas as rotas (exceto `/`) retornam 307.

**Arquivo:** `web/src/app/page.tsx`

**Código proposto (após L29-30):**
```typescript
await apiLogin("dtic", { username, password });
login(username, password);

// ★ NOVO: Setar cookie para o middleware Next.js
document.cookie = `sessionToken=authenticated; path=/; max-age=86400; samesite=strict`;

router.push("/selector");
```

> ⚠️ Nota: O valor `authenticated` é um placeholder. O ideal seria usar o `session_token` real retornado pelo backend. Isso exige que `apiLogin` retorne o token (atualmente retorna `unknown`).

---

### Correção 2 (Crítica — sem isso CORS bloqueia): Adicionar origins ao CORS

**O que fazer:** Adicionar os domínios `.local` à lista de CORS.

**Por que:** O browser bloqueia silenciosamente requisições cross-origin quando a origin não está na whitelist.

**Arquivo:** `app/main.py`

**Código proposto:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://carregadores.local:8080",
        "http://carregadores.local:3000",
        "http://api.carregadores.local:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### Correção 3 (Alta — causa instabilidade): Tipar retorno do `apiLogin`

**O que fazer:** `apiLogin()` retorna `Promise<unknown>`. Deve retornar `Promise<LoginResponse>` para que a page.tsx possa extrair o `session_token`.

**Por que:** Sem o tipo correto, o `page.tsx` não sabe que a resposta contém um `session_token` e não consegue gravá-lo no cookie com um valor real.

**Arquivo:** `web/src/lib/api/glpiService.ts`

**Código proposto:**
```typescript
import type { AuthMeResponse } from '@/store/useAuthStore';

export function apiLogin(context: string, payload: Record<string, string>) {
  return request<AuthMeResponse>(`/api/v1/${context}/auth/login`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
```

---

### Correção 4 (Média — melhoria arquitetural): Eliminar duplo-login

**O que fazer:** O `page.tsx` faz login na API, descarta o resultado, e depois o `selector/page.tsx` faz LOGIN DE NOVO. Refatorar para que o primeiro login já retorne e armazene o token, eliminando o segundo.

**Arquivos:** `web/src/app/page.tsx` + `web/src/app/selector/page.tsx`

---

## O que NÃO fazer

| Armadilha | Por que é perigoso |
|---|---|
| ❌ Desabilitar o `middleware.ts` inteiro | Remove toda proteção de rota do sistema |
| ❌ Mudar o middleware para aceitar qualquer cookie | Transforma o guard numa porta aberta |
| ❌ Criar um Server Action para autenticação sem entender o estado atual | Pode conflitar com o Zustand persist e criar estado inconsistente |
| ❌ Patching sobre o código do selector com `try/catch` que ignora erros | Mascara o problema real e cria regressões futuras |

---

## Arquivos que PRECISAM ser Criados/Recriados do Zero

Nenhum arquivo precisa ser criado do zero. Os arquivos existem, mas precisam de **correções pontuais** nos seguintes pontos:

| Arquivo | Ação |
|---|---|
| `web/src/app/page.tsx` | Adicionar `document.cookie` após login |
| `web/src/middleware.ts` | Revisar matcher para excluir `/selector` OU confiar no cookie |
| `app/main.py` | Expandir CORS origins |
| `web/src/lib/api/glpiService.ts` | Tipar retorno do `apiLogin` |

---

## ✅ FASE 3 CONCLUÍDA — Missão Completa
