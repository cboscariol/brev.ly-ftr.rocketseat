# brev.ly

Encurtador de links — desafio Rocketseat (Frontend, Backend e DevOps).

| Pasta | Stack |
|---|---|
| [`server/`](server) | TypeScript, Fastify, Drizzle ORM, PostgreSQL, Zod, AWS SDK (Cloudflare R2) |
| [`web/`](web) | React 19, TypeScript, Vite (SPA), React Router, TanStack Query, React Hook Form, Zod, Tailwind CSS |

Decisões de projeto e contrato detalhado: [`docs/decisions.md`](docs/decisions.md).

## Funcionalidades

- Criar link com validação da URL original e do código curto (formato e duplicidade, sem diferenciar maiúsculas/minúsculas)
- Listar links (paginação com carregamento progressivo), copiar, abrir e excluir
- Resolver `/:código` no frontend: tela "Redirecionando...", contagem de **um** acesso por visita e redirecionamento
- Página 404 para códigos inexistentes e rotas desconhecidas
- Exportar todos os links para CSV no Cloudflare R2, com nome único e URL pública
- Layout mobile first fiel ao Figma, com estados de vazio, carregamento, erro e ações bloqueadas durante requisições

## Pré-requisitos

- Node.js 22+
- pnpm 10 — `corepack enable pnpm`
- Docker (para o PostgreSQL ou para a stack completa)

## Executando localmente

### 1. Banco de dados

```bash
docker compose up -d postgres
```

Cria os bancos `brevly` (desenvolvimento) e `brevly_test` (testes automatizados) na porta 5432.

### 2. API (`server/`)

```bash
cd server
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm dev
```

API em `http://localhost:3333` — healthcheck em `GET /health`.

### 3. Frontend (`web/`)

```bash
cd web
cp .env.example .env
pnpm install
pnpm dev
```

Aplicação em `http://localhost:5173`.

### Stack completa com Docker Compose

```bash
docker compose up --build
```

| Serviço | Endereço | Observação |
|---|---|---|
| `postgres` | `localhost:5432` | dados persistidos no volume `postgres-data` |
| `migrate` | — | executa `drizzle-kit migrate` e encerra |
| `server` | `http://localhost:3333` | inicia só após as migrations; usa `server/.env` (se existir) para as credenciais do R2 |
| `web` | `http://localhost:4173` | build estático servido por Nginx com fallback de SPA |

## Variáveis de ambiente

### `server/.env`

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PORT` | não (3333) | Porta HTTP da API |
| `NODE_ENV` | não | `development`, `test` ou `production` |
| `DATABASE_URL` | sim | Conexão PostgreSQL |
| `FRONTEND_URL` | sim | URL pública do frontend — usada para montar a URL encurtada na API e no CSV |
| `CORS_ORIGIN` | não | Origens permitidas, separadas por vírgula (padrão: `FRONTEND_URL`) |
| `CLOUDFLARE_ACCOUNT_ID` | para exportar | ID da conta Cloudflare |
| `CLOUDFLARE_ACCESS_KEY_ID` | para exportar | Access Key ID do token R2 |
| `CLOUDFLARE_SECRET_ACCESS_KEY` | para exportar | Secret Access Key do token R2 |
| `CLOUDFLARE_BUCKET` | para exportar | Nome do bucket |
| `CLOUDFLARE_PUBLIC_URL` | para exportar | URL pública do bucket (`https://pub-xxxx.r2.dev` ou domínio próprio) |

Sem as variáveis do Cloudflare a API funciona normalmente, mas `POST /api/links/export` responde `503 STORAGE_NOT_CONFIGURED`. A API valida as variáveis na inicialização e nunca imprime seus valores.

### `web/.env`

| Variável | Descrição |
|---|---|
| `VITE_FRONTEND_URL` | URL onde o frontend é servido (usada no link copiado) |
| `VITE_BACKEND_URL` | URL da API, acessível pelo navegador |

Variáveis `VITE_*` são embutidas no bundle durante o build — nunca coloque segredos nelas.

## Scripts

Disponíveis em `server/` e em `web/`:

| Script | Descrição |
|---|---|
| `pnpm dev` | Ambiente de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm test` | Testes (Vitest) |
| `pnpm typecheck` | Verificação de tipos |
| `pnpm lint` / `pnpm lint:fix` | Lint e formatação (Biome) |

Apenas em `server/`:

| Script | Descrição |
|---|---|
| `pnpm db:migrate` | Aplica as migrations versionadas em `server/drizzle/` |
| `pnpm db:generate` | Gera uma nova migration a partir de `src/db/schema.ts` |
| `pnpm db:studio` | Abre o Drizzle Studio |

Os testes do backend usam o banco `brevly_test` (criado pelo Compose). O schema é recriado e as migrations aplicadas do zero a cada execução. Para outro banco, defina `TEST_DATABASE_URL`.

## API

Erros seguem sempre o formato `{ "error": { "code": "LINK_NOT_FOUND", "message": "Link não encontrado." } }`.

| Método e rota | Sucesso | Erros |
|---|---|---|
| `POST /api/links` — `{ originalUrl, shortCode }` | `201` link criado | `400 VALIDATION_ERROR`, `409 SHORT_CODE_TAKEN` |
| `GET /api/links?page=1&pageSize=20` | `200 { items, page, pageSize, total, totalPages }` | `400` |
| `GET /api/links/resolve/:shortCode` | `200 { id, originalUrl, shortCode, shortUrl }` | `404 LINK_NOT_FOUND` |
| `POST /api/links/:id/access` | `200 { id, accessCount }` | `400`, `404` |
| `DELETE /api/links/:id` | `204` | `400`, `404` |
| `POST /api/links/export` | `201 { fileName, downloadUrl }` | `503 STORAGE_NOT_CONFIGURED`, `502 STORAGE_UPLOAD_FAILED` |
| `GET /health` | `200 { status: "ok" }` | — |

Link: `{ id, originalUrl, shortCode, shortUrl, accessCount, createdAt }`.

Regras:

- `originalUrl` deve ser http(s). O frontend completa `https://` quando o usuário omite o protocolo.
- `shortCode` aceita de 3 a 32 letras, números, `-` ou `_`. É armazenado como digitado, mas é único e resolvido sem diferenciar maiúsculas de minúsculas (índice único em `lower(short_code)`).
- A listagem é ordenada por `created_at DESC, id DESC`, com `pageSize` máximo de 100.
- O incremento de acessos é atômico (`access_count = access_count + 1`).

### CSV exportado

- Colunas: `original_url, short_url, access_count, created_at`
- Formato: UTF-8 com BOM, separador vírgula, quebra de linha CRLF e datas em ISO 8601 (UTC)
- Valores iniciados por `=`, `+`, `-` ou `@` recebem `'` na frente, como proteção contra CSV injection
- Os links são lidos do banco em lotes (cursor por `created_at, id`) e enviados ao R2 em streaming multipart, sem carregar a tabela inteira em memória
- O arquivo é salvo como `exports/links-<uuid>.csv`

## Configurando o Cloudflare R2 (exportação de CSV)

1. Crie uma conta gratuita em [dash.cloudflare.com](https://dash.cloudflare.com/sign-up). Para ativar o R2, a Cloudflare pede uma forma de pagamento, mas o plano gratuito inclui 10 GB de armazenamento por mês.
2. No menu lateral, abra **R2 Object Storage** e clique em **Create bucket**. Use um nome como `brevly`; esse é o valor de `CLOUDFLARE_BUCKET`.
3. Para liberar a leitura pública, abra o bucket → **Settings** → **Public access** → **R2.dev subdomain** → **Allow**. Copie a URL `https://pub-<hash>.r2.dev`; esse é o valor de `CLOUDFLARE_PUBLIC_URL`. Em produção, prefira conectar um domínio próprio em **Custom Domains**, porque o `r2.dev` tem limite de requisições.
4. Na página inicial do R2, copie o **Account ID**; esse é o valor de `CLOUDFLARE_ACCOUNT_ID`.
5. Para gerar as chaves de acesso, vá em R2 → **Manage API tokens** → **Create API token** e escolha:
   - **Permissions:** *Object Read & Write*
   - **Specify bucket:** apenas o bucket criado
6. Copie o **Access Key ID** e o **Secret Access Key** (a chave secreta só aparece uma vez). Eles são `CLOUDFLARE_ACCESS_KEY_ID` e `CLOUDFLARE_SECRET_ACCESS_KEY`.
7. Preencha as variáveis em `server/.env`, reinicie a API e clique em **Baixar CSV**.

## Deploy (preparado para Cloudflare)

O enunciado não define um provedor, então nenhum deploy automático foi configurado. O projeto está pronto para:

- **Frontend — Cloudflare Workers (static assets):** o arquivo [`web/wrangler.jsonc`](web/wrangler.jsonc) já configura o fallback da SPA. Defina `VITE_FRONTEND_URL` e `VITE_BACKEND_URL` e rode:

  ```bash
  pnpm build && pnpm dlx wrangler deploy
  ```

  No Cloudflare Pages via Git, use a raiz `web`, o comando `pnpm build` e a saída `dist`; o fallback da SPA é o comportamento padrão do Pages.
- **CSV:** Cloudflare R2, conforme a seção acima.
- **Backend:** a imagem `server/Dockerfile` (alvo `runtime`) roda em qualquer host de containers, como Cloudflare Containers, Fly.io, Railway ou Render. Ela usa a variável `PORT`, escuta em `0.0.0.0`, roda com usuário não-root e tem `HEALTHCHECK` em `/health`.
- **Banco:** qualquer PostgreSQL gerenciado (por exemplo, Neon ou Supabase).
- **Migrations em produção:** são executadas como etapa explícita do deploy, nunca na inicialização da API. Use a imagem de migração:

  ```bash
  docker build --target migrate -t brevly-migrate server
  docker run --rm -e DATABASE_URL=... brevly-migrate
  ```

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda em todo push na `main` e em pull requests:

- **server:** PostgreSQL de serviço, `pnpm install --frozen-lockfile`, `db:migrate`, lint, typecheck, testes e build
- **web:** lint, typecheck, testes e build
- **docker:** build das imagens `runtime`, `migrate` e `web`

## Limitações conhecidas

- A contagem de acessos é feita pelo frontend e não exige autenticação (fora do escopo), então qualquer cliente pode chamar o endpoint.
- Se o registro do acesso falhar por erro de rede ou servidor, o visitante é redirecionado mesmo assim, priorizando a experiência de quem clicou.
- Toasts, o estado de carregamento da lista e a tela de erro temporário não existem no Figma. Eles foram criados com os tokens do Style Guide.
