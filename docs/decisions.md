# Decisões, premissas e contrato — brev.ly

Este documento complementa `docs/PLANO_EXECUCAO.md`. Quando houver divergência, **este documento prevalece**.

## 1. Inventário inicial (Fase 0)

- Repositório `cboscariol/brev.ly-ftr.rocketseat` (público), branch `main`, apenas `README.md` no commit inicial.
- Ambiente local: Node 22, pnpm 10 (via corepack), Docker (OrbStack). Sem PostgreSQL nativo — o banco roda via Docker Compose.

## 2. Mapa dos frames do Figma

Arquivo: `uO3QRYJpv1isWDZXENX0IU` (Encurtador de Links — Community). Todos os frames foram acessados via Figma MCP.

| Node | Viewport | Conteúdo |
|---|---|---|
| `1085-710` | — | Style Guide: cores, tipografia, ícones, vetores e componentes |
| `3157-654` | Desktop 1366 | Home com lista vazia; "Salvar link" e "Baixar CSV" desabilitados |
| `3157-707` | Mobile 390 | Home com lista vazia |
| `3118-697` | Desktop 1366 | Home com formulário preenchido e lista com 4 links |
| `1055-362` | Mobile 390 | Home com lista (URLs truncadas com reticências) |
| `3118-783` | Desktop 1366 | Página "Redirecionando..." com link "Acesse aqui" |
| `3118-853` | Mobile 390 | Página "Redirecionando..." |
| `3130-441` | Desktop 1366 | Página 404 "Link não encontrado" |

### Tokens observados (Style Guide)

- **Cores:** `blue-base #2C46B1`, `blue-dark #2C4091`, `white #FFFFFF`, `gray-100 #F9F9FB`, `gray-200 #E4E6EC`, `gray-300 #CDCFD5`, `gray-400 #74798B`, `gray-500 #4D505C`, `gray-600 #1F2025`, `danger #B12C4D`.
- **Fonte:** Open Sans (Google Fonts). Logo usa vetor próprio.
- **Escala tipográfica:** Text Xl 24/32 bold · Text Lg 18/24 bold · Text Md 14/18 semibold · Text Sm 12/16 regular · Text Xs 10/14 regular uppercase · Body Md 14/18 regular.
- **Ícones:** Phosphor Icons (copy, trash, warning, download-simple, link).
- **Componentes:** Button primary (default/hover/disabled), Button secondary (default/hover/disabled), Icon button (default/hover), Input (empty/filled × default/active/error, com ícone de alerta e mensagem de erro).
- **Layout:** cards `gray-100`, raio 8px, padding 32px (24px no mobile), fundo `gray-200`. Desktop: card do formulário 380px + card da lista 580px, gap 20px. Inputs 48px de altura, raio 8px, borda `gray-300`.

### Estados não desenhados no Figma

Loading da lista, feedback de sucesso/erro da API (toast), página de erro temporário no redirecionamento e confirmação de exclusão. Serão implementados com os tokens acima, sem afirmar fidelidade a um design inexistente.

## 3. Decisões confirmadas com a autora

1. **Campo "Link encurtado":** o usuário digita apenas o código; o prefixo `brev.ly/` é visual (input com prefixo).
2. **Maiúsculas/minúsculas:** o código é armazenado **como digitado** (ex.: `Portfolio-Dev`), mas a unicidade e a resolução são **case-insensitive** — índice único em `lower(short_code)`.
3. **URL sem protocolo:** o formulário aceita `linkedin.com/in/x` e completa com `https://`. A API continua exigindo `http:`/`https:` (o frontend normaliza antes de enviar). A lista exibe a URL original sem o protocolo, como no Figma.
4. **Exibição vs cópia:** o texto `brev.ly/<código>` é marca visual; o botão copiar e o link apontam para `VITE_FRONTEND_URL/<código>`.
5. **DevOps:** o enunciado não detalha. Objetivo: deixar tudo pronto para publicar no ecossistema Cloudflare — frontend no **Cloudflare Pages** (com `_redirects` para fallback SPA), CSV no **R2**, backend como **container Docker** publicável em qualquer host de containers, Postgres gerenciado. Sem deploy automático configurado.
6. **Conta Cloudflare:** a autora ainda não tem. Os testes usam storage mockado; o README terá o passo a passo de criação do bucket R2 público e das chaves.
7. **Git:** um commit por fase na `main`; push somente com autorização.
8. **Gerenciador de pacotes:** pnpm (padrão da Rocketseat), com `pnpm-lock.yaml` em cada projeto.

## 4. Decisões técnicas adotadas

- **Estilo:** Tailwind CSS v4 com tokens declarados via `@theme` em um único arquivo (`web/src/styles/index.css`).
- **Paginação:** API paginada (`page`/`pageSize`); a UI carrega mais itens ao rolar (sem controles de página, pois o Figma não mostra).
- **Exclusão:** confirmação com `window.confirm` (sem modal no design).
- **Botões desabilitados:** "Baixar CSV" desabilitado com lista vazia ou durante exportação; "Salvar link" desabilitado durante envio.
- **Redirecionamento:** a rota `/:shortCode` exibe a tela "Redirecionando..." enquanto resolve e contabiliza; o link "Acesse aqui" aponta para a URL original assim que conhecida.
- **Lint/format:** Biome (um único binário, sem plugins).
- **Variável extra no backend:** `FRONTEND_URL` — necessária para a API e o CSV montarem a URL encurtada completa. `CORS_ORIGIN` aceita lista separada por vírgula e, se ausente, usa `FRONTEND_URL`.

## 5. Contrato da API

Prefixo `/api`. Erros sempre no formato:

```json
{ "error": { "code": "LINK_NOT_FOUND", "message": "Link não encontrado." } }
```

### Regras de validação

- `originalUrl`: URL válida, protocolo `http:` ou `https:`, até 2048 caracteres.
- `shortCode`: regex `^[A-Za-z0-9_-]{3,32}$`; não pode ser reservado (`api`, `assets`, `health`, `404`, `not-found`). Comparação case-insensitive.

| Método e rota | Sucesso | Erros |
|---|---|---|
| `POST /api/links` `{ originalUrl, shortCode }` | `201` link | `400 VALIDATION_ERROR`, `409 SHORT_CODE_TAKEN` |
| `GET /api/links?page=1&pageSize=20` | `200 { items, page, pageSize, total, totalPages }` (pageSize máx. 100) | `400 VALIDATION_ERROR` |
| `GET /api/links/resolve/:shortCode` | `200 { id, originalUrl, shortCode, shortUrl }` | `404 LINK_NOT_FOUND` |
| `POST /api/links/:id/access` | `200 { id, accessCount }` | `400`, `404 LINK_NOT_FOUND` |
| `DELETE /api/links/:id` | `204` | `400`, `404 LINK_NOT_FOUND` |
| `POST /api/links/export` | `201 { fileName, downloadUrl }` | `503 STORAGE_NOT_CONFIGURED`, `502 STORAGE_UPLOAD_FAILED` |
| `GET /health` | `200 { status: "ok" }` | — |

Formato do link: `{ id, originalUrl, shortCode, shortUrl, accessCount, createdAt }` (`createdAt` em ISO 8601 UTC).

Ordenação da listagem: `created_at DESC, id DESC`.

### CSV

- Colunas: `original_url,short_url,access_count,created_at`.
- Delimitador vírgula, UTF-8 com BOM (compatibilidade com Excel), datas ISO 8601 UTC.
- Valores começando com `=`, `+`, `-`, `@`, tab ou CR recebem prefixo `'` (proteção contra CSV injection).
- Nome: `exports/links-<uuid>.csv`. Leitura em lotes (keyset por `created_at, id`) e upload em streaming multipart.

## 6. Riscos e limitações

- Sem conta Cloudflare, a exportação real só pode ser validada depois que o bucket for criado.
- O incremento de acessos é público (sem autenticação, por escopo); qualquer cliente pode inflar a contagem.
