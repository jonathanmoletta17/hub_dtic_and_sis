This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Smoke Test

The canonical end-to-end smoke test runs against the local edge proxy on `http://hub.local:8080`.

```bash
npm run smoke:hub:install
SMOKE_USERNAME=seu.usuario SMOKE_PASSWORD='sua-senha' npm run smoke:hub
```

For this repository mounted from WSL on Windows, use the wrapper below from PowerShell so the browser runner executes from a local Windows temp directory instead of a UNC path:

```powershell
powershell -ExecutionPolicy Bypass -File ..\scripts\run_hub_smoke_windows.ps1 `
  -Username seu.usuario `
  -Password 'sua-senha'
```

Optional variables:

- `SMOKE_BASE_URL` to override the target host when needed

The suite validates:

- login through the real UI
- `/selector` reload without losing cross-context access
- navigation to `dtic/dashboard`, `dtic/search`, `dtic/knowledge`, `sis/dashboard` and `sis/gestao-carregadores`
- same-origin API calls under `/api/v1/*`
- abertura de chamado real via FormCreator em `sis/new-ticket`
- workflow real de ticket via UI dedicada (`assume`, `followup`, `pending`, `resume`)
- carregamento real dos lookups normalizados de técnicos e localizações

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
