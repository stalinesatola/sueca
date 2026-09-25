// Esquema da base de dados, como lista de instruções idempotentes.
// Fonte única: usado pela rota /api/telegram/setup (aplica em produção sem
// precisar de acesso local à base de dados) e por db/migrate.ts.
export const INSTRUCOES_ESQUEMA: string[] = [
  // gen_random_uuid() é nativo desde o Postgres 16; a extensão cobre versões antigas.
  `create extension if not exists pgcrypto`,

  `create table if not exists players (
    id            bigint primary key,
    username      text,
    first_name    text not null default '',
    photo_url     text,
    coins         integer not null default 150,
    current_stage integer not null default 1,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
  )`,

  `create table if not exists stage_progress (
    player_id    bigint not null references players(id) on delete cascade,
    stage_id     integer not null,
    stars        smallint not null default 0,
    best_margin  integer,
    attempts     integer not null default 0,
    completed_at timestamptz,
    primary key (player_id, stage_id)
  )`,

  // Sessão de jogo em curso: o único estado entre pedidos (o motor corre no servidor).
  `create table if not exists stage_sessions (
    id         uuid primary key default gen_random_uuid(),
    player_id  bigint not null references players(id) on delete cascade,
    stage_id   integer not null,
    status     text not null default 'playing',
    state      jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,

  // Salas multiplayer (esquema pronto; interface ainda por construir).
  `create table if not exists rooms (
    id         text primary key,
    status     text not null default 'waiting',
    seats      jsonb not null default '{"sul":null,"oeste":null,"norte":null,"este":null}',
    state      jsonb,
    version    integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,

  `create index if not exists stage_progress_player_idx on stage_progress (player_id)`,
  `create index if not exists stage_sessions_player_idx on stage_sessions (player_id) where status = 'playing'`,
  `create index if not exists rooms_status_idx on rooms (status) where status != 'finished'`,
];
