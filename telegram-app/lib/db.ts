import { neon } from '@neondatabase/serverless';
import type { EstadoJogo } from './game/motor';
import { INSTRUCOES_ESQUEMA } from './esquema';

// Uma ligação HTTP por invocação — é o modelo recomendado pela Neon para
// funções serverless (sem pool persistente a gerir entre invocações frias).
function obterSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL não está definida neste ambiente.');
  return neon(databaseUrl);
}

/** Cria as tabelas que faltarem. Idempotente; devolve quantas instruções correu. */
export async function aplicarEsquema(): Promise<number> {
  const sql = obterSql();
  for (const instrucao of INSTRUCOES_ESQUEMA) {
    await sql(instrucao);
  }
  return INSTRUCOES_ESQUEMA.length;
}

export interface Jogador {
  id: string; // bigint do Postgres chega como string ao driver
  username: string | null;
  first_name: string;
  photo_url: string | null;
  coins: number;
  current_stage: number;
  created_at: string;
  updated_at: string;
}

export async function obterOuCriarJogador(dados: {
  id: number;
  username?: string;
  first_name: string;
  photo_url?: string;
}): Promise<Jogador> {
  const sql = obterSql();
  const linhas = await sql`
    insert into players (id, username, first_name, photo_url)
    values (${dados.id}, ${dados.username ?? null}, ${dados.first_name}, ${dados.photo_url ?? null})
    on conflict (id) do update set
      username = excluded.username,
      first_name = excluded.first_name,
      photo_url = excluded.photo_url,
      updated_at = now()
    returning *
  `;
  return linhas[0] as Jogador;
}

export interface ProgressoEstagio {
  stage_id: number;
  stars: number;
  best_margin: number | null;
  attempts: number;
  completed_at: string | null;
}

export async function obterProgresso(jogadorId: number): Promise<ProgressoEstagio[]> {
  const sql = obterSql();
  const linhas = await sql`
    select stage_id, stars, best_margin, attempts, completed_at
    from stage_progress
    where player_id = ${jogadorId}
    order by stage_id asc
  `;
  return linhas as ProgressoEstagio[];
}

export async function registarTentativaEstagio(params: {
  jogadorId: number;
  stageId: number;
  venceu: boolean;
  margem: number; // pontos da equipa do jogador menos pontos do adversário
  estrelas: number; // 0–3
  recompensaMoedas: number;
}): Promise<{ progresso: ProgressoEstagio; jogador: Jogador }> {
  const sql = obterSql();

  const progressoLinhas = await sql`
    insert into stage_progress (player_id, stage_id, stars, best_margin, attempts, completed_at)
    values (${params.jogadorId}, ${params.stageId}, ${params.venceu ? params.estrelas : 0}, ${params.margem}, 1,
      ${params.venceu ? sql`now()` : null})
    on conflict (player_id, stage_id) do update set
      stars = greatest(stage_progress.stars, excluded.stars),
      best_margin = greatest(coalesce(stage_progress.best_margin, -999), excluded.best_margin),
      attempts = stage_progress.attempts + 1,
      completed_at = coalesce(stage_progress.completed_at, excluded.completed_at)
    returning stage_id, stars, best_margin, attempts, completed_at
  `;

  const moedasGanhas = params.venceu ? params.recompensaMoedas : 0;
  const avancaEstagio = params.venceu;

  const jogadorLinhas = await sql`
    update players set
      coins = coins + ${moedasGanhas},
      current_stage = case when ${avancaEstagio} then greatest(current_stage, ${params.stageId} + 1) else current_stage end,
      updated_at = now()
    where id = ${params.jogadorId}
    returning *
  `;

  return { progresso: progressoLinhas[0] as ProgressoEstagio, jogador: jogadorLinhas[0] as Jogador };
}

export interface SessaoEstagio {
  id: string;
  player_id: string;
  stage_id: number;
  status: 'playing' | 'finished';
  state: EstadoJogo;
}

export async function criarSessaoEstagio(jogadorId: number, stageId: number, estado: EstadoJogo): Promise<SessaoEstagio> {
  const sql = obterSql();
  const linhas = await sql`
    insert into stage_sessions (player_id, stage_id, state)
    values (${jogadorId}, ${stageId}, ${JSON.stringify(estado)})
    returning id, player_id, stage_id, status, state
  `;
  return linhas[0] as SessaoEstagio;
}

export async function obterSessaoEstagio(sessaoId: string, jogadorId: number): Promise<SessaoEstagio | null> {
  const sql = obterSql();
  const linhas = await sql`
    select id, player_id, stage_id, status, state
    from stage_sessions
    where id = ${sessaoId} and player_id = ${jogadorId}
  `;
  return (linhas[0] as SessaoEstagio | undefined) ?? null;
}

export async function atualizarSessaoEstagio(sessaoId: string, estado: EstadoJogo): Promise<void> {
  const sql = obterSql();
  await sql`
    update stage_sessions set
      state = ${JSON.stringify(estado)},
      status = ${estado.terminado ? 'finished' : 'playing'},
      updated_at = now()
    where id = ${sessaoId}
  `;
}
