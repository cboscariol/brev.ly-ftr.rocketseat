# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

# Dependências completas (inclui drizzle-kit, tsup e TypeScript)
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Compilação
FROM deps AS build
COPY . .
RUN pnpm build

# Imagem para executar as migrations: docker build --target migrate
FROM deps AS migrate
COPY drizzle.config.ts tsconfig.json ./
COPY drizzle ./drizzle
COPY src/db ./src/db
USER node
CMD ["node_modules/.bin/drizzle-kit", "migrate"]

# Somente dependências de produção
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Imagem final da API
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3333
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 3333
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" > /dev/null || exit 1
CMD ["node", "dist/server.js"]
