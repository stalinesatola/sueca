# Sueca — Mini App do Telegram

App Next.js + TypeScript com a escada de estágios da Sueca contra IA, a correr
como [Telegram Mini App](https://core.telegram.org/bots/webapps). O jogo
clássico (`/index.html` na raiz do repositório) continua a existir à parte —
esta pasta é um projeto Vercel independente.

## Arquitetura

- **Frontend** — Next.js (App Router), React puro, sem framework de UI. O
  visual reaproveita a mesma linguagem do jogo clássico (feltro verde, cartas
  "clássicas").
- **Motor de jogo** — `lib/game/*` corre inteiramente no servidor. Cada
  pedido HTTP aplica a jogada do jogador e avança os robôs até à próxima
  decisão humana ou ao fim da mão, tudo dentro da mesma função serverless —
  não há WebSockets nem processo persistente.
- **Base de dados** — Postgres (Neon, ligado automaticamente à Vercel).
  `players`, `stage_progress`, `stage_sessions` (a sessão de jogo em curso) e
  `rooms` (esquema pronto para multiplayer, interface ainda por construir).
- **Autenticação** — `initData` da Telegram Mini App, validado no servidor
  (`lib/telegram-auth.ts`) contra o token do bot — sem sistema de password.
- **Bot** — [grammY](https://grammy.dev), webhook em `app/api/telegram/webhook`.

## Configurar

1. **Variáveis de ambiente** — em produção vivem no projeto Vercel (já
   configurado: `TELEGRAM_BOT_TOKEN` e as variáveis do Postgres). Localmente,
   copia `.env.example` para `.env.local` e preenche.

2. **Aplicar o schema à base de dados**:
   ```bash
   npm install
   npm run db:migrate
   ```
   Idempotente — podes correr outra vez sempre que `db/schema.sql` mudar.

3. **Registar o webhook do bot.** Este ambiente não tem acesso à rede do
   Telegram, por isso este passo é para correr a partir de uma máquina com
   acesso (ou a própria Vercel, via `curl` num terminal teu):
   ```bash
   curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -H 'content-type: application/json' \
     -d "{\"url\": \"$PUBLIC_APP_URL/api/telegram/webhook\", \"secret_token\": \"$TELEGRAM_WEBHOOK_SECRET\"}"
   ```

4. **Configurar o botão do menu no @BotFather** (opcional mas recomendado):
   `/mybots` → escolhe o bot → **Bot Settings** → **Menu Button** → define o
   URL para o mesmo `PUBLIC_APP_URL`.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Fora do Telegram, `window.Telegram.WebApp` não existe — a app não rebenta,
mas `initData` fica vazio e a autenticação falha (por desenho: só o Telegram
consegue assinar `initData` válido). Para testar o fluxo completo, abre a
Mini App a partir do botão do bot no telemóvel, ou usa o
[modo de pré-visualização do Telegram Desktop](https://core.telegram.org/bots/webapps#testing-mini-apps).

## Estrutura

```
app/
  page.tsx              mapa de estágios + arranque do jogo
  components/            Carta, MapaEstagios, Jogo
  api/
    auth/                 login (valida initData, cria/atualiza o jogador)
    stages/                lista de estágios + progresso
    stage/[id]/start/       começa uma sessão de jogo
    session/[sessionId]/play/  joga uma carta, resolve vazas/robôs, fecha a mão
    telegram/webhook/       bot (grammY)
lib/
  game/                  motor puro (baralho, regras, IA, escada de estágios)
  db.ts                  acesso à base de dados (Neon serverless driver)
  telegram-auth.ts        validação do initData
  api-auth.ts             middleware de autenticação das rotas
  client/                 helpers do lado do browser (fetch autenticado, SDK do Telegram)
db/
  schema.sql              esquema completo
  migrate.ts               aplica o schema.sql a DATABASE_URL
```

## O que falta (a seguir)

- Interface das salas multiplayer (o esquema `rooms` já existe; falta o
  ecrã de criar/entrar numa sala e a sincronização por *long-poll*).
- Loja de cosméticos de cartas gastando as moedas ganhas nos estágios.
- Mais variedade nos "chefes" de cada patamar (condições especiais, não só
  dificuldade mais alta).
