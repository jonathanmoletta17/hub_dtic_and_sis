# ⚡ MISSÃO CIRÚRGICA — Hub DTIC: Reconectar Autenticação End-to-End

## Contexto (leia, não pule)

O diagnóstico já foi feito. O problema é que o `session_token` real retornado pelo backend **nunca chega ao cookie que o middleware exige nem é tipado corretamente**. São 4 correções pontuais em 4 arquivos. Execute nesta ordem exata, validando após cada uma.

**Filosofia:** Root cause fix. Sem placeholders. Sem patches. Sem criar nada novo além do necessário.

---

## ANTES DE COMEÇAR — Leia os 4 arquivos

```bash
cat web/src/lib/api/glpiService.ts
cat web/src/app/page.tsx
cat web/src/app/selector/page.tsx
cat web/src/middleware.ts
cat app/main.py
```

Entenda o estado atual de cada um antes de tocar em qualquer coisa.

---

## CORREÇÃO 1 — CORS (Backend)

**Arquivo:** `app/main.py`

**O problema:** `allow_origins` só tem `localhost:3000`. O sistema roda via NPM em `carregadores.local`, então o browser bloqueia silenciosamente todas as requisições.

**Ação:** Substituir o bloco `CORSMiddleware` por:

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

**Validação:** `grep -A 10 "CORSMiddleware" app/main.py` — confirmar que os 4 origins estão lá.

---

## CORREÇÃO 2 — Tipar apiLogin (Frontend)

**Arquivo:** `web/src/lib/api/glpiService.ts`

**O problema:** `apiLogin` retorna `Promise<unknown>`. O `page.tsx` não consegue extrair o `session_token` real da resposta.

**Ação:** Encontrar a função `apiLogin` e adicionar a tipagem correta. Antes de editar, inspecione o que o backend realmente retorna no endpoint de login:

```bash
grep -r "session_token\|SessionToken\|LoginResponse" \
  web/src/store/useAuthStore.ts web/src/types/ 2>/dev/null
```

Use o tipo já existente no projeto (provavelmente `AuthMeResponse` ou similar). Se não houver, crie a interface mínima:

```typescript
interface LoginResponse {
  session_token: string;
  // adicione outros campos que o backend realmente retorna
}
```

Então tipe a função:

```typescript
export function apiLogin(context: string, payload: Record<string, string>) {
  return request<LoginResponse>(`/api/v1/${context}/auth/login`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
```

**Validação:** `npx tsc --noEmit` dentro de `web/` — zero erros de tipo relacionados a `apiLogin`.

---

## CORREÇÃO 3 — Cookie real no Login (Frontend)

**Arquivo:** `web/src/app/page.tsx`

**O problema:** Após o login bem-sucedido, o `session_token` retornado pelo backend é descartado. O middleware bloqueia todas as navegações porque nunca recebe o cookie que exige.

**Ação:** Modificar o handler de submit do login para:

1. Capturar o retorno de `apiLogin`
2. Gravar o `session_token` real no cookie
3. Só então fazer `router.push("/selector")`

```typescript
const response = await apiLogin("dtic", { username, password });
login(username, password);

// Gravar token real no cookie para o middleware Next.js
document.cookie = `sessionToken=${response.session_token}; path=/; max-age=86400; samesite=strict`;

router.push("/selector");
```

> ⚠️ ATENÇÃO: Inspecione o `page.tsx` atual antes. Se o contexto `"dtic"` está hardcoded, verifique se deve vir de uma variável. Se o projeto tem múltiplos contextos (dtic/sis), o `apiLogin` precisa receber o contexto correto — não assuma, leia o código.

**Validação:**
1. Abra o browser em modo dev
2. Faça login
3. Application → Cookies → confirmar que `sessionToken` existe com valor não-vazio
4. Confirmar que a navegação para `/selector` ocorre sem redirect loop

---

## CORREÇÃO 4 — Eliminar Login Duplo (Frontend)

**Arquivo:** `web/src/app/selector/page.tsx`

**O problema:** O `selector/page.tsx` chama `apiLogin` de novo (segundo login). Isso é redundante — o usuário já autenticou em `page.tsx`. Causa duas requisições ao GLPI por entrada.

**Ação:**
1. Leia o `selector/page.tsx` completo
2. Identifique onde `apiLogin` é chamado (em torno da linha 82 conforme diagnóstico)
3. Entenda o que ele faz com o resultado — se salva algum dado adicional no store ou apenas repete o login
4. Se for apenas repetição: remova a chamada e use os dados já presentes no Zustand (`useAuthStore`)
5. Se extrair dados adicionais: mova essa extração para a Correção 3 (uma única chamada, mais dados capturados)

> ⚠️ NÃO remova sem ler. Se o segundo login extrai `hub_roles` ou outros dados do perfil que o primeiro não extrai, a lógica de extração deve ser preservada — apenas a segunda chamada à API eliminada.

**Validação:** Abrir Network tab no browser. Fazer login completo até o dashboard. Deve aparecer exatamente **uma** chamada ao endpoint `/auth/login`.

---

## VALIDAÇÃO FINAL — Sistema Funciona?

Após as 4 correções, execute:

```bash
# Rebuild dos containers
docker compose down
docker compose up --build -d

# Aguardar serviços subirem
sleep 10

# Checar saúde
curl -s http://localhost:8080/health || echo "Backend não responde"
```

Então no browser:
1. Acesse `http://carregadores.local:8080`
2. Faça login com credenciais válidas
3. Deve navegar para `/selector` sem redirect loop
4. Selecione um contexto
5. Deve chegar ao dashboard sem nova autenticação
6. Abra DevTools → Network → confirmar ausência de erros CORS (sem `Access-Control-Allow-Origin` errors)
7. Application → Cookies → `sessionToken` presente com valor real

---

## SE ALGO NÃO FUNCIONAR

**Não tente novamente de forma diferente sem entender por quê falhou.**

Documente:
- Qual correção foi aplicada
- Qual erro específico apareceu (mensagem exata, arquivo, linha)
- O que o browser Network tab mostra (status codes, headers)

Então reavalie. O diagnóstico pode ter perdido alguma camada. Uma nova rodada de investigação focada é melhor do que patches empilhados.

---

## O QUE NÃO FAZER

- ❌ Não desabilite o `middleware.ts` — ele é a proteção de rotas do sistema
- ❌ Não use `sessionToken=authenticated` (placeholder) — use o token real
- ❌ Não adicione `try/catch` que silencia erros de auth — falhas devem ser visíveis
- ❌ Não mude o Zustand store — ele funciona, o problema está na camada de cookie
- ❌ Não altere o middleware — ele está correto, só precisa receber o cookie certo
