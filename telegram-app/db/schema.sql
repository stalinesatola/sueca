-- Esquema da Sueca no Telegram.
-- Corre com: node --loader ts-node/esm db/migrate.ts   (lê DATABASE_URL do ambiente)

-- gen_random_uuid() é nativo desde o Postgres 16, mas esta extensão garante
-- que funciona também em versões mais antigas (sem custo se já for nativo).
create extension if not exists pgcrypto;

create table if not exists players (
  id            bigint primary key,        -- Telegram user id
  username      text,
  first_name    text not null default '',
  photo_url     text,
  coins         integer not null default 150,
  current_stage integer not null default 1,   -- próximo estágio por desbloquear
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists stage_progress (
  player_id    bigint not null references players(id) on delete cascade,
  stage_id     integer not null,
  stars        smallint not null default 0,     -- 0–3, à Candy Crush
  best_margin  integer,                          -- melhor diferença de pontos alcançada
  attempts     integer not null default 0,
  completed_at timestamptz,
  primary key (player_id, stage_id)
);

-- Salas multiplayer (esquema pronto; interface ainda não construída).
-- Sincronização por "long-poll": o cliente pede /api/room/{id}?since=<version>
-- e o servidor só responde quando `version` mudar ou ao fim de N segundos —
-- suficiente para um jogo por vazas, sem precisar de WebSockets dedicados.
create table if not exists rooms (
  id         text primary key,              -- código curto partilhável (6 carateres)
  status     text not null default 'waiting', -- waiting | dealing | playing | finished
  seats      jsonb not null default '{"sul":null,"oeste":null,"norte":null,"este":null}',
  state      jsonb,                          -- estado do jogo; as mãos de cada assento
                                              -- só são incluídas na resposta a esse assento
  version    integer not null default 0,     -- incrementa a cada alteração
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Uma sessão = uma tentativa de um estágio em curso. O motor de jogo corre
-- inteiramente no servidor (lib/game/motor.ts); esta linha é o único estado
-- entre pedidos, para caber no modelo serverless sem processos persistentes.
create table if not exists stage_sessions (
  id         uuid primary key default gen_random_uuid(),
  player_id  bigint not null references players(id) on delete cascade,
  stage_id   integer not null,
  status     text not null default 'playing', -- playing | finished
  state      jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stage_progress_player_idx on stage_progress (player_id);
create index if not exists stage_sessions_player_idx on stage_sessions (player_id) where status = 'playing';
create index if not exists rooms_status_idx on rooms (status) where status != 'finished';
