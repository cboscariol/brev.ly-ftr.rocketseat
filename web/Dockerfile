# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Variáveis VITE_* são embutidas no bundle durante o build (não mudam em runtime).
ARG VITE_FRONTEND_URL=http://localhost:4173
ARG VITE_BACKEND_URL=http://localhost:3333
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL \
    VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN pnpm exec vite build

# Nginx sem privilégios de root, escutando na porta 8080
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
