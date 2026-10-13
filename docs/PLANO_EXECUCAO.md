# Plano de execução — Encurtador de Links

> **Atualização (Fase 0):** as decisões confirmadas após a análise do Figma — códigos com maiúsculas preservadas e unicidade case-insensitive, normalização de URL sem protocolo, variável `FRONTEND_URL` no backend, tela "Redirecionando...", alvo Cloudflare (Pages + R2) e uso de pnpm — estão em [`decisions.md`](./decisions.md), que prevalece sobre este plano em caso de divergência.

## 1. Objetivo

Entregar um repositório público no GitHub com uma aplicação React SPA e uma API para gerenciar links encurtados, persistência PostgreSQL, exportação CSV para armazenamento acessível por CDN e infraestrutura/documentação suficiente para executar e validar o projeto.

Este documento transforma os requisitos recebidos em uma sequência de trabalho para Codex ou Claude Code. Execute as fases na ordem indicada; valide cada fase antes de avançar. Não tente implementar tudo de uma vez.

## 2. Requisitos confirmados

### Backend

- TypeScript, Fastify, Drizzle ORM e PostgreSQL são obrigatórios.
- Criar links, validar dados, impedir códigos encurtados inválidos e duplicados, excluir links, resolver links, listar registros e incrementar acessos.
- Exportar CSV com URL original, URL encurtada, número de acessos e data de criação.
- O CSV precisa de nome aleatório/único e deve ser servido por CDN/armazenamento público, como Cloudflare R2 ou Amazon S3.
- A listagem/exportação deve ser eficiente.
- O arquivo `.env.example` deve documentar `PORT`, `DATABASE_URL`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ACCESS_KEY_ID`, `CLOUDFLARE_SECRET_ACCESS_KEY`, `CLOUDFLARE_BUCKET` e `CLOUDFLARE_PUBLIC_URL`.
- O `package.json` do backend precisa ter a chave de script exata `db:migrate` para executar as migrations.
- Deve haver `server/Dockerfile` e CORS habilitado.

### Frontend

- React + TypeScript + Vite, em formato SPA e sem framework SSR.
- `.env.example` com `VITE_FRONTEND_URL` e `VITE_BACKEND_URL`.
- `/` exibe formulário de cadastro e lista de links.
- `/:url-encurtada` resolve o código dinâmico consultando a API.
- Rotas inválidas ou códigos inexistentes mostram a página de não encontrado.
- Criar, excluir, listar, resolver e contabilizar acessos; oferecer download do CSV.
- Reproduzir o Figma com fidelidade e ser responsivo, priorizando mobile first.
- UX inclui empty states, loading, erros e bloqueio de ações incompatíveis com o estado atual.

### Entrega e organização

- Um repositório público deve conter os desafios de frontend, backend e DevOps.
- A raiz deve conter as subpastas `web/` e `server/`.
- O repositório deve incluir o código das funcionalidades obrigatórias e instruções de execução.

## 3. Decisões propostas e premissas

Estas são propostas para tornar o plano executável, não requisitos explicitamente definidos pelo enunciado. O agente deve verificar o Figma e qualquer código existente antes de adotá-las; se encontrar evidência em contrário, documente a diferença e atualize o contrato antes de codificar.

1. **Código curto informado pelo usuário:** o texto exige validar formato e duplicidade da URL encurtada, portanto a premissa inicial é que o formulário permita informar um código curto (`shortCode`). A interface deve compor a URL completa usando `VITE_FRONTEND_URL`. Se o Figma indicar outro fluxo — por exemplo, campo com a URL curta completa — adapte a camada de formulário para normalizá-la para o mesmo `shortCode` interno.
2. **Formato inicial do código:** normalizar para minúsculas e aceitar letras, números, hífen e sublinhado, com tamanho de 3 a 32 caracteres. Rejeitar espaços, barras, protocolo, query string, fragmento e códigos reservados da aplicação. Documentar essa regra na UI e na API. Se o Figma ou um critério formal indicar regra diferente, atualizar antes de implementar.
3. **Identificador consistente:** usar `id` nos endpoints de exclusão e incremento explícito de acessos (`DELETE /api/links/:id`, `POST /api/links/:id/access`). A resolução por código curto retorna o `id` para que o frontend possa contabilizar a visita sem mudar o padrão dessas operações.
4. **Resolução e acessos:** `GET /api/links/resolve/:shortCode` não altera dados; após obter a URL e o `id`, a navegação deve registrar um único acesso por visita via endpoint de incremento e só então navegar para o destino. Use React Router com `loader` ou mecanismo equivalente, evitando que o `useEffect` em `StrictMode` duplique contabilizações.
5. **Exportação:** usar Cloudflare R2 por meio de API compatível com S3, pois as variáveis fornecidas são específicas de Cloudflare. A URL devolvida será construída a partir de `CLOUDFLARE_PUBLIC_URL`; o bucket/domínio deve estar configurado para leitura pública/CDN. Não expor credenciais no frontend.
6. **DevOps:** o enunciado recebido não especifica provedor de deploy nem pipeline obrigatório. Entregar no mínimo Dockerfile do backend, configuração Docker Compose para desenvolvimento, `.dockerignore`, documentação e CI para validar build/testes. Não configurar deploy automático em uma nuvem sem um alvo definido.
7. **Paginação:** a API de listagem será paginada para evitar carregar quantidades ilimitadas no browser. A tela deve manter o comportamento e o layout previstos pelo Figma; se o design não mostrar paginação, escolha uma apresentação compatível sem esconder registros indevidamente. O CSV sempre deverá incluir todos os links, não apenas a página atual.

## 4. Arquitetura proposta

### Estrutura do repositório

```text
.
├── web/
│   ├── src/
│   │   ├── app/                 # router, providers e inicialização
│   │   ├── pages/               # Home, Redirect, NotFound
│   │   ├── features/links/      # formulário, lista e hooks
│   │   ├── components/          # elementos reutilizáveis
│   │   ├── lib/                 # cliente HTTP, helpers e validação
│   │   └── styles/              # tokens e estilos globais
│   ├── public/
│   ├── .env.example
│   ├── Dockerfile               # recomendado para o stack local completo
│   ├── nginx.conf               # se servir a SPA via Nginx
│   └── package.json
├── server/
│   ├── src/
│   │   ├── app.ts               # registra plugins e rotas
│   │   ├── server.ts            # inicializa o servidor
│   │   ├── config/              # leitura/validação das variáveis
│   │   ├── db/                  # conexão Drizzle e schema
│   │   ├── modules/links/       # rotas, schemas, serviço e repositório
│   │   ├── modules/exports/     # geração/upload de CSV
│   │   └── plugins/             # CORS e plugins Fastify
│   ├── drizzle/                 # migrations geradas e versionadas
│   ├── tests/
│   ├── .env.example
│   ├── .dockerignore
│   ├── Dockerfile
│   └── package.json
├── .github/workflows/ci.yml
├── compose.yaml
├── .gitignore
└── README.md
```

Respeite a estrutura existente se o repositório já tiver arquivos úteis. Não apague nem sobrescreva alterações do usuário sem autorização.

### Stack sugerida

- Backend: TypeScript, Fastify, Drizzle ORM, PostgreSQL e `drizzle-kit`.
- Armazenamento CSV: AWS SDK v3 compatível com R2; use streaming/multipart se necessário para não manter todo o CSV em memória.
- Frontend: React, TypeScript, Vite, React Router, TanStack Query para estado remoto e React Hook Form + Zod para formulário/validação.
- Testes: Vitest; React Testing Library no frontend; Fastify `inject` e PostgreSQL de teste no backend. Adicione testes E2E se couber no ambiente, sem substituir testes de unidade/integração.
- Estilo: extraia os tokens visuais do Style Guide primeiro. Escolha Tailwind ou CSS convencional/CSS Modules após examinar o Figma; não escolha uma ferramenta de estilo só por preferência pessoal.

## 5. Contrato inicial da API

O contrato abaixo deverá ser implementado de modo uniforme e documentado no README. Se a análise inicial revelar um contrato preexistente, atualize este documento antes de prosseguir.

### `POST /api/links` — criar link

Request sugerido:

```json
{
  "originalUrl": "https://example.com/path?query=1",
  "shortCode": "meu-link"
}
```

Resposta `201 Created` com `id`, `originalUrl`, `shortCode`, `shortUrl`, `accessCount` e `createdAt`.

Validações:
- `originalUrl` precisa ser uma URL válida com protocolo `http:` ou `https:`.
- `shortCode` precisa respeitar o formato definido e não pode ser reservado.
- Normalizar o código antes de verificar unicidade; o banco também deve impor constraint única.
- Código já usado: `409 Conflict`.
- Entrada malformada: `400 Bad Request`.

### `GET /api/links` — listar links

Aceitar `page` e `pageSize` com valores padrão documentados e limites máximos. Retornar `items` e metadados de paginação (`page`, `pageSize`, `total`, `totalPages`). Ordenação estável por data de criação decrescente, com desempate por `id`.

Cada item contém ao menos `id`, `originalUrl`, `shortCode`, `shortUrl`, `accessCount` e `createdAt`.

### `GET /api/links/resolve/:shortCode` — resolver link

Retornar a informação necessária para redirecionar (`id`, `originalUrl`, `shortCode`, `shortUrl`). Não encontrado: `404 Not Found`. Não incrementar acessos neste endpoint, para manter explícito e testável o passo de contabilização.

### `POST /api/links/:id/access` — incrementar acessos

Fazer incremento atômico no banco (`access_count = access_count + 1`) e retornar a nova contagem. `id` inexistente: `404 Not Found`. A operação deve ser idempotente quanto à execução SQL? Não: cada chamada representa uma visita; portanto o frontend precisa garantir que faça apenas uma chamada por navegação.

### `DELETE /api/links/:id` — excluir link

Retornar `204 No Content`. `id` inexistente: `404 Not Found`. Frontend deve atualizar/refazer a consulta da lista após sucesso.

### `POST /api/links/export` — gerar relatório CSV

Gerar um arquivo contendo **todos** os links, com colunas para URL original, URL encurtada, contagem de acessos e data de criação. Upload com nome único, por exemplo `exports/links-<uuid>.csv`. Retornar `201 Created` com `downloadUrl` e `fileName`. Se a configuração de storage estiver ausente ou indisponível, retornar erro claro e não simular um link de download.

A exportação deve buscar registros em lotes ordenados por uma chave indexada, escrever CSV com escaping correto e enviar os dados ao storage sem materializar toda a tabela em memória. Adotar UTF-8 e documentar delimitador/formato de data. Proteger contra CSV injection para valores que comecem com caracteres interpretados como fórmula por planilhas.

### `GET /health` — verificação de saúde

Retornar estado simples para healthcheck. Não vazar credenciais nem conteúdo de variáveis de ambiente.

### Erros e CORS

Padronizar erros, por exemplo:

```json
{
  "error": {
    "code": "LINK_NOT_FOUND",
    "message": "Link não encontrado."
  }
}
```

Habilitar CORS para a origem do frontend configurada em variável de ambiente; aceitar localhost nos ambientes de desenvolvimento conforme configuração explícita. Não usar `*` indiscriminadamente em produção.

## 6. Modelo de dados sugerido

Tabela `links`:

| Coluna | Tipo sugerido | Regra |
|---|---|---|
| `id` | UUID | primary key, gerado no servidor/banco |
| `original_url` | text | obrigatório, URL http/https validada |
| `short_code` | varchar | obrigatório, normalizado, unique e indexado |
| `access_count` | bigint/integer | obrigatório, default `0`, nunca negativo |
| `created_at` | timestamp with time zone | obrigatório, default `now()` |

Criar e versionar migrations pelo Drizzle. A constraint única no banco é obrigatória mesmo havendo validação prévia na aplicação, para tratar requisições concorrentes. Não utilizar `drizzle-kit push` como substituto permanente das migrations versionadas.

## 7. Variáveis de ambiente

### `server/.env.example`

Incluir todas as variáveis requeridas pelo enunciado, com valores vazios/de exemplo e sem segredos reais:

```dotenv
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/url_shortener
CLOUDFLARE_ACCOUNT_ID=""
CLOUDFLARE_ACCESS_KEY_ID=""
CLOUDFLARE_SECRET_ACCESS_KEY=""
CLOUDFLARE_BUCKET=""
CLOUDFLARE_PUBLIC_URL=""
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

Ajustar o hostname de `DATABASE_URL` conforme execução local ou Docker. Validar as variáveis no startup e mostrar mensagens úteis sem imprimir credenciais.

### `web/.env.example`

```dotenv
VITE_FRONTEND_URL=http://localhost:5173
VITE_BACKEND_URL=http://localhost:3000
```

Variáveis `VITE_*` são incorporadas ao bundle visível pelo browser; nunca armazenar credenciais ou chaves privadas nelas.

## 8. Plano de execução por fases

### Fase 0 — Auditoria inicial, Figma e plano técnico

**Objetivo:** entender o estado real antes de alterar arquivos.

1. Verificar diretório atual, branch, `git status`, arquivos e scripts existentes.
2. Confirmar que a raiz terá `web/` e `server/`; identificar trabalho pré-existente e preservá-lo.
3. Tentar abrir os frames e o Style Guide no Figma/Dev Mode ou por integração MCP disponível no ambiente do agente.
4. Examinar primeiro o Style Guide: cores, tipografia, espaçamentos, raios, sombras, ícones, breakpoints e variantes de componentes.
5. Examinar os sete frames fornecidos e classificar cada um: tela, estado de validação, estado vazio, loading, exclusão ou mobile. Não presumir o conteúdo apenas pelo ID.
6. Se o Figma não estiver acessível, registrar explicitamente essa limitação; não inventar tokens como se fossem fatos. Continuar com estrutura funcional e concentrar decisões visuais em tokens fáceis de ajustar.
7. Escrever `docs/decisions.md` com decisões, hipóteses e dúvidas, incluindo o significado do campo de URL curta.
8. Finalizar contrato de API a partir deste documento e do que a interface realmente mostrar.

**Critérios de aceite:** inventário dos arquivos existente; mapa dos frames, se acessíveis; lista explícita de premissas; contrato inicial da API aprovado pelo próprio agente sem contradições entre frontend e backend.

**Não fazer ainda:** não escrever toda a aplicação nem instalar um grande conjunto de dependências antes de concluir a auditoria.

### Fase 1 — Estrutura e ferramentas

1. Criar ou ajustar as pastas `web/` e `server/` sem remover arquivos preexistentes.
2. Configurar TypeScript estrito, lint/format se escolhidos, scripts de `dev`, `build`, `test` e `typecheck` para cada parte.
3. Criar `.gitignore`, exemplos de ambiente e documentação curta das instalações.
4. Criar os testes mínimos e comandos que serão usados nas próximas fases.
5. Escolher versões compatíveis e estáveis das dependências, instalar com lockfile e evitar dependências redundantes.

**Critérios de aceite:** ambos os projetos inicializam e compilam com arquivos mínimos; `.env.example` não possui credenciais reais; os comandos documentados funcionam.

### Fase 2 — Banco de dados e migrations

1. Configurar conexão PostgreSQL por `DATABASE_URL` e Drizzle.
2. Implementar o schema `links`, índice único para `short_code` e índices úteis para ordenação/listagem.
3. Configurar `drizzle-kit` e migrations versionadas no diretório convencionado.
4. Adicionar no `server/package.json` a chave literal `"db:migrate"` que execute as migrations, por exemplo `drizzle-kit migrate`.
5. Criar teste/rotina de verificação que execute a migration em banco de teste vazio.
6. Não depender de alteração manual de schema em produção.

**Critérios de aceite:** migrations podem ser executadas numa base vazia; a tabela e constraints esperadas existem; executar migrations novamente não quebra o banco; `npm run db:migrate` funciona no diretório `server/`.

### Fase 3 — API principal de links

Implementar serviços, repositórios, schemas de entrada/saída e rotas para:

1. Criar link.
2. Listar links com paginação e ordenação estável.
3. Resolver código curto.
4. Incrementar acessos por `id` com update atômico.
5. Excluir link por `id`.
6. Healthcheck, CORS e tratamento centralizado de erros.

Boas práticas:
- separar rotas, lógica de negócio e acesso a dados;
- validar entrada e tipos em runtime, não confiar apenas em TypeScript;
- mapear erro de unique constraint para `409`;
- usar consultas parametrizadas/ORM;
- não incrementar acessos quando o código não existe;
- não retornar stack trace ao usuário;
- usar logger do Fastify sem imprimir secrets;
- não criar autenticação ou funcionalidades de conta sem requisito.

**Critérios de aceite:** cada rota possui testes de sucesso e erro; duplicidade é impedida mesmo sob requisições concorrentes; incremento simultâneo não perde contagens; formatação de erro é consistente.

### Fase 4 — Exportação CSV e Cloudflare R2

1. Configurar cliente compatível com S3 usando as cinco variáveis Cloudflare fornecidas.
2. Definir serviço isolado de exportação para facilitar testes com storage mockado.
3. Gerar nome único usando UUID criptograficamente apropriado; gravar em prefixo `exports/`.
4. Exportar a totalidade dos registros em lotes/keyset pagination, sem aplicar a paginação da tela e sem carregar todos os registros na RAM.
5. Gerar CSV com cabeçalho, campos obrigatórios, escaping de vírgulas/aspas/quebras de linha e data em formato consistente.
6. Evitar CSV injection e considerar BOM UTF-8 caso seja necessário para compatibilidade com planilhas; documentar a decisão.
7. Fazer upload; construir a URL usando `CLOUDFLARE_PUBLIC_URL`; retornar nome e URL pública.
8. Tratar falha de credenciais, upload, URL pública ausente e exportação sem registros com resultados previsíveis.
9. Não excluir automaticamente exportações anteriores sem política de retenção definida.

**Critérios de aceite:** teste verifica cabeçalho e conteúdo; nome de duas exportações é diferente; o fluxo não carrega a tabela inteira em memória; link público é formado corretamente; falha no storage não retorna um falso sucesso.

### Fase 5 — Design system do frontend

1. Começar pelo Style Guide do Figma antes de construir páginas.
2. Documentar tokens como CSS custom properties: cores, fontes, escala tipográfica, espaçamento, raios e sombras.
3. Construir componentes reutilizáveis correspondentes ao design real: botão, campo, ícones/botões de ação, feedback/loading, empty state e modal de confirmação, somente quando presentes ou necessários.
4. Configurar roteamento SPA e providers do estado remoto.
5. Implementar validação compartilhada e mensagens úteis.
6. Aplicar abordagem mobile first e testar larguras pequenas desde o começo.

**Critérios de aceite:** tokens não ficam espalhados por componentes; estados do mesmo componente têm aparência consistente; controles têm labels acessíveis, foco visível e alvos acionáveis em touch.

### Fase 6 — Página principal `/`

1. Implementar formulário de criação de acordo com o Figma: URL original e o campo de URL/código curto conforme revelado pela referência.
2. Validar URL original e código curto no frontend para UX, mantendo o backend como fonte final de validação.
3. Desabilitar submit enquanto a requisição está pendente; apresentar feedback de sucesso/erro conforme os padrões do design.
4. Listar links pela API mostrando ao menos URL original, URL curta, acessos e data de criação, conforme o Figma.
5. Criar estados de carregamento, erro de listagem e lista vazia.
6. Ações de copiar, abrir link e excluir devem ser acessíveis e apresentar feedback apropriado.
7. Após criar/excluir, atualizar o cache/consulta da lista sem deixar registros desatualizados.
8. Confirmar exclusão quando o Figma ou boas práticas de UX indicarem; não bloquear a interface inteira desnecessariamente.
9. Implementar paginação/limite da lista de modo compatível com o layout aprovado.
10. Adicionar botão de exportação: loading, prevenção de cliques repetidos, tratamento de erro e abertura/baixar da `downloadUrl` retornada pela API.

**Critérios de aceite:** todos os fluxos principais funcionam com API real; não há duplicação de requisições por múltiplos cliques; feedback visual cobre sucesso, vazio, loading e erros; layout atende desktop e celular.

### Fase 7 — Resolver `/:shortCode` e página não encontrada

1. Configurar rota dinâmica para código curto com um loader ou mecanismo equivalente que consulta a API.
2. Para código válido: obter destino e `id`, registrar exatamente um acesso por navegação e, após sucesso, navegar para `originalUrl` com substituição do histórico quando apropriado.
3. Para código inexistente: mostrar a página de não encontrado definida no Figma ou uma versão consistente com o design system.
4. Para falha temporária de rede/backend: não confundir automaticamente erro 5xx/timeout com link inexistente; mostrar opção de tentar novamente ou mensagem apropriada.
5. Criar rota catch-all `*` para URLs com padrões desconhecidos.
6. Garantir funcionamento ao colar/atualizar diretamente uma URL curta, não apenas navegando a partir de `/`.
7. Configurar fallback de SPA no servidor estático/hosting para devolver `index.html` nas rotas client-side, sem capturar arquivos estáticos nem substituir a API.

**Critérios de aceite:** link válido incrementa exatamente uma vez por visita e redireciona; código inválido dá 404 visual; rota desconhecida exibe NotFound; atualização direta da URL não retorna 404 do servidor de arquivos.

### Fase 8 — Docker e execução local

1. Criar `server/Dockerfile` multi-stage, com dependências de produção separadas, compilação reproduzível e usuário não-root quando compatível.
2. Criar `server/.dockerignore`; ignorar `.env`, `.git`, `node_modules`, cobertura e artefatos locais.
3. Usar `PORT` e bind em `0.0.0.0` no container.
4. Criar `compose.yaml` para desenvolvimento com PostgreSQL e backend; adicionar frontend opcional se for prático, lembrando que URLs `VITE_*` são consumidas pelo browser e precisam apontar para endereços acessíveis a partir do host do usuário.
5. Documentar ordem de inicialização, migrations e healthcheck. Preferir executar migrations como etapa explícita de deploy/local, não implicitamente em toda inicialização da API. Se a imagem final excluir dependências de desenvolvimento, garantir que `db:migrate` continue executável com um estágio/target de migração ou serviço `migrate` que inclua `drizzle-kit` e os arquivos de configuração/migration.
6. Se incluir `web/Dockerfile`, servir arquivos estáticos com fallback SPA e documentar que variáveis `VITE_*` em geral são definidas no build, não por alteração tardia do `.env` em runtime.

**Critérios de aceite:** imagem do backend compila; container conecta ao Postgres; o processo roda como usuário não-root quando possível; secrets não entram na imagem; migrations são executáveis a partir do fluxo documentado.

### Fase 9 — Testes integrados, CI e DevOps

1. Backend: testes para URL inválida, slug inválido, duplicidade, listagem/paginação, resolução, link inexistente, exclusão, incremento concorrente e exportação CSV.
2. Frontend: testes para renderização da Home, estados vazio/loading/erro, validação, criação, exclusão, download e fluxos de redirecionamento/NotFound. Mockar API somente nos testes; validar integração real separadamente.
3. Integração: executar frontend + API + PostgreSQL e validar os fluxos de ponta a ponta manual ou automaticamente.
4. Criar GitHub Actions para instalar dependências via lockfile, executar lint/typecheck/tests/build e disponibilizar PostgreSQL de serviço para os testes que precisam de DB.
5. Não adicionar deploy contínuo para um provedor ainda não definido. Deixar o pipeline preparado para validação contínua.
6. Fazer uma verificação de secrets no diff e assegurar que `.env` real, tokens ou credenciais não são commitados.

**Critérios de aceite:** checks executam localmente e no CI; todos os fluxos essenciais têm cobertura de teste; pipeline falha quando teste, lint, typecheck ou build falhar.

### Fase 10 — Auditoria visual e checklist final

1. Comparar cada tela com o frame correspondente do Figma em desktop e mobile.
2. Conferir cor, fonte, largura de container, alinhamento, espaçamento, estados, ícones e comportamento dos controles.
3. Corrigir diferenças relevantes sem criar detalhes que contrariem as referências.
4. Executar build e suíte completa limpa a partir de instalação nova.
5. Verificar documentação, arquivos `.env.example`, `db:migrate`, Dockerfile, CORS, rotas, acessibilidade básica e estrutura do repositório.
6. Atualizar README com pré-requisitos, setup local, variáveis, migrations, testes, Docker/Compose, contrato da API, configuração do R2 e limitações conhecidas.
7. Fornecer relatório final dos arquivos e funcionalidades implementados, comandos executados e falhas ainda abertas.
8. Não criar/alterar remote Git, publicar repositório ou fazer push sem autorização explícita e acesso válido do usuário.

## 9. Checklist final de aceitação

### Backend

- [ ] TypeScript + Fastify + Drizzle + PostgreSQL.
- [ ] Criar link e validar URL original/código curto.
- [ ] Impedir slug duplicado pela aplicação e pelo banco.
- [ ] Excluir link por `id`.
- [ ] Resolver link por código curto.
- [ ] Incrementar acessos por `id`, com atualização atômica.
- [ ] Listagem paginada, ordenada e indexada.
- [ ] CSV contém URL original, URL encurtada, acessos e data de criação.
- [ ] CSV inclui todos os registros, tem nome único e está acessível via domínio/CDN público configurado.
- [ ] `.env.example` contém as chaves do enunciado.
- [ ] Script literal `db:migrate` existe e funciona.
- [ ] `server/Dockerfile`, `.dockerignore` e CORS estão implementados.
- [ ] Erros previsíveis e testes para fluxos principais.

### Frontend

- [ ] React + TypeScript + Vite SPA.
- [ ] `.env.example` contém `VITE_FRONTEND_URL` e `VITE_BACKEND_URL`.
- [ ] `/` apresenta formulário e lista.
- [ ] Validação do formato e duplicidade apresenta mensagens compreensíveis.
- [ ] Excluir, resolver, contabilizar acessos e exportar CSV funciona com API real.
- [ ] `/:shortCode` resolve código e redireciona.
- [ ] Códigos inexistentes e rotas não reconhecidas mostram NotFound.
- [ ] Empty state, loading, erro, sucesso e bloqueio de ações foram tratados.
- [ ] Layout responsivo e comparado ao Figma.
- [ ] Acesso direto/reload em rotas de SPA funciona no hosting configurado.

### Repositório e DevOps

- [ ] Pastas `web/` e `server/` na raiz.
- [ ] README com setup, variáveis, migrations, testes e execução.
- [ ] Docker e execução local documentados.
- [ ] CI valida build, testes e tipos.
- [ ] Nenhum segredo real commitado.
- [ ] Deploy público só é configurado quando o provedor e credenciais forem definidos.

## 10. Prompts sequenciais para Codex/Claude Code

Copie o prompt-base uma vez. Em seguida, envie um prompt de fase por vez. Não envie todos os prompts juntos, para preservar checkpoints e facilitar revisão.

### Prompt-base — regras permanentes

```text
Você é responsável por implementar o projeto Encurtador de Links. Siga o documento PLANO_EXECUCAO.md como fonte de trabalho e preserve os requisitos obrigatórios.

Regras:
1. Antes de editar, inspecione o repositório e git status. Não sobrescreva alterações preexistentes.
2. Mantenha web/ (React + TypeScript + Vite SPA) e server/ (TypeScript + Fastify + Drizzle + PostgreSQL) na raiz.
3. Execute uma fase por vez. Antes de avançar, rode os testes/builds pertinentes, corrija falhas e produza um relatório curto com arquivos alterados, comandos executados, resultados e riscos restantes.
4. Não marque uma tarefa como concluída sem executar uma validação real ou explicar claramente por que não foi possível.
5. Não invente tokens do Figma como se fossem fatos. Tente acessar Style Guide e frames; se falhar, registre a limitação e deixe as decisões visuais centralizadas em tokens ajustáveis.
6. Valide os dados no frontend e também na API; mantenha constraints no banco. Não exponha credenciais nem comite arquivos .env reais.
7. Use `id` tanto para excluir quanto para incrementar acessos. Na resolução, garanta exatamente uma contabilização por navegação.
8. O CSV deve conter todos os links, ter nome único, ser armazenado em R2 via API S3 compatível e retornar uma URL pública/CDN configurada. Não simule sucesso quando o storage falhar.
9. Mantenha escopo: não adicione autenticação, contas de usuário, analytics extra ou deploy em um provedor não solicitado.
10. Ao encontrar requisito contraditório ou informação visual indisponível, documente a hipótese adotada e continue sem destruir funcionalidades existentes.
```

### Prompt 1 — Fase 0: auditoria e contrato

```text
Execute somente a Fase 0 de PLANO_EXECUCAO.md. Inspecione o repositório, revise o git status e liste estrutura, tecnologia e scripts existentes. Tente examinar o Style Guide e os sete frames do Figma fornecidos no plano. Crie/atualize docs/decisions.md com requisitos, premissas, contrato de API proposto e limitações de acesso ao Figma. Ainda não implemente as funcionalidades. No final, reporte o inventário, o contrato acordado e os riscos.
```

### Prompt 2 — Fases 1 e 2: scaffold e banco

```text
Implemente as Fases 1 e 2 de PLANO_EXECUCAO.md: configuração mínima de web/ e server/, ferramentas, variáveis de exemplo, conexão PostgreSQL, schema Drizzle e migrations versionadas. Garanta que server/package.json tenha a chave exata `db:migrate`. Preserve arquivos existentes. Execute instalação, migrations em banco de teste/local disponível, typecheck e builds. Não implemente ainda as rotas funcionais, exceto healthcheck mínimo se necessário para validar infraestrutura. Reporte os comandos e resultados.
```

### Prompt 3 — Fase 3: API principal

```text
Implemente a Fase 3 de PLANO_EXECUCAO.md e o contrato de API de docs/decisions.md: criar, listar paginado, resolver, incrementar acesso por id, excluir e healthcheck. Ative CORS configurável, validação de request e handler de erros padronizado. Adicione testes automatizados para sucesso, validação, duplicidade, não encontrado e incremento concorrente. Execute todos os testes, typecheck e build; corrija as falhas antes de concluir.
```

### Prompt 4 — Fase 4: CSV/R2

```text
Implemente a Fase 4 de PLANO_EXECUCAO.md. Crie exportação CSV completa com os campos obrigatórios, nome aleatório/único, upload via cliente compatível com S3 para Cloudflare R2 e resposta com URL pública gerada de CLOUDFLARE_PUBLIC_URL. Use lotes/streaming ou solução equivalente eficiente; não carregue toda a tabela em memória. Cubra escaping, dados vazios, erro de storage, configuração ausente e nomes únicos por testes. Nunca exponha credenciais nem retorne sucesso falso. Rode a suíte e reporte resultados.
```

### Prompt 5 — Fase 5: Figma e design system

```text
Implemente a Fase 5 de PLANO_EXECUCAO.md. Comece pelo Style Guide e registre tokens concretos quando forem observáveis. Crie o tema e os componentes reutilizáveis necessários, configure React Router e estado remoto, e prepare validação do formulário. Não construa a página completa ainda. Se o Figma estiver inacessível, informe exatamente o que não conseguiu inspecionar, mantenha tokens fáceis de ajustar e siga sem afirmar fidelidade visual não verificada. Rode lint/typecheck/test/build.
```

### Prompt 6 — Fase 6: Home

```text
Implemente a Fase 6 de PLANO_EXECUCAO.md na rota /. Use as referências Figma acessíveis, a API real e o contrato acordado. Entregue cadastro, listagem, empty/loading/error states, exclusão, cópia/abertura de link e exportação CSV. Garanta bloqueio de ações duplicadas e invalidação correta da lista após mutações. Implemente layouts mobile-first e testes de comportamento. Rode lint/typecheck/test/build e corrija falhas.
```

### Prompt 7 — Fase 7: resolução e NotFound

```text
Implemente a Fase 7 de PLANO_EXECUCAO.md. A rota /:shortCode deve consultar a API, obter o id/destino, incrementar exatamente uma vez por navegação e redirecionar após sucesso. Diferencie link inexistente de falha temporária da API. Implemente catch-all NotFound e fallback SPA no servidor estático. Inclua testes de link válido, inexistente, rota malformada e falha de API. Rode lint/typecheck/test/build.
```

### Prompt 8 — Fases 8 e 9: Docker, CI e integração

```text
Implemente as Fases 8 e 9 de PLANO_EXECUCAO.md: server/Dockerfile multi-stage, .dockerignore, compose.yaml para desenvolvimento e GitHub Actions com PostgreSQL de teste, instalação via lockfile, migrations, lint/typecheck/tests/build. Inclua Docker do frontend somente se ajudar a execução local e mantenha a configuração correta de VITE_BACKEND_URL acessível pelo browser. Não configure deploy automático sem provedor definido. Valide os comandos do README do zero e reporte qualquer limitação de ambiente.
```

### Prompt 9 — Fase 10: auditoria final

```text
Execute a Fase 10 e o checklist final de PLANO_EXECUCAO.md. Faça uma auditoria dos requisitos obrigatórios, teste todos os fluxos com API e PostgreSQL, compare as telas com o Figma nos breakpoints desktop/mobile se os frames estiverem acessíveis, confira migrations, Docker, CORS, env examples e CSV. Execute lint, typecheck, todos os testes e builds em sequência. Corrija o que for possível sem ampliar escopo e produza um relatório final: funcionalidades concluídas, comandos/resultados, instruções para executar, diferenças visuais conhecidas e itens ainda pendentes. Não faça push/publicação sem autorização.
```

## 11. Referências de implementação

- Figma — Style Guide: https://www.figma.com/design/uO3QRYJpv1isWDZXENX0IU/Encurtador-de-Links--Community-?node-id=1085-710&m=dev
- Figma — frames: `3157-654`, `3157-707`, `3118-697`, `1055-362`, `3118-783`, `3118-853` e `3130-441` no mesmo arquivo.
- Fastify + TypeScript: https://fastify.dev/docs/latest/Reference/TypeScript/
- Drizzle migrations: https://orm.drizzle.team/docs/migrations
- Drizzle + PostgreSQL: https://orm.drizzle.team/docs/get-started/postgresql-new
- Cloudflare R2 API S3 compatível: https://developers.cloudflare.com/r2/get-started/s3/
- Cloudflare R2 URLs assinadas (usar somente se a escolha de acesso for privada/temporária): https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Vite: https://vite.dev/guide/env-and-mode

## 12. Observação sobre DevOps

O material fornecido identifica o desafio de DevOps e menciona especificamente o `Dockerfile`, mas não define provedor de hospedagem, requisitos de deploy, observabilidade externa ou pipeline obrigatório. Este plano cobre Docker, ambiente local, CI, healthcheck e documentação como base. A publicação real da aplicação e a configuração de domínio/CDN devem ser ajustadas quando o alvo de infraestrutura for conhecido.
