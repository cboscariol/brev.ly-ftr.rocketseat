# brev.ly

Encurtador de links — desafio Rocketseat (Frontend, Backend e DevOps).

- `server/` — API em TypeScript + Fastify + Drizzle ORM + PostgreSQL
- `web/` — SPA em React + TypeScript + Vite

## Pré-requisitos

- Node.js 22+
- pnpm 10 (`corepack enable pnpm`)
- Docker (para o PostgreSQL)

## Execução local

```bash
docker compose up -d postgres

cd server
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm dev

cd ../web
cp .env.example .env
pnpm install
pnpm dev
```

A documentação completa (variáveis, contrato da API, Docker, Cloudflare R2) está em evolução; decisões do projeto em [`docs/decisions.md`](docs/decisions.md).
