import { NextResponse } from 'next/server';
import { aplicarEsquema } from '@/lib/db';

export const runtime = 'nodejs';
// Nunca pré-renderizar no build: tem efeitos (base de dados e Telegram).
export const dynamic = 'force-dynamic';

/**
 * Configuração única, idempotente — abre este URL no browser depois de cada
 * mudança de domínio ou de token:
 *   1. cria as tabelas que faltarem na base de dados;
 *   2. aponta o webhook do bot para esta app (com o segredo do ambiente);
 *   3. define o botão de menu "Jogar" e o comando /start.
 * Todos os valores vêm das variáveis de ambiente, por isso chamar isto não
 * permite a ninguém redirecionar o bot — e a resposta não inclui segredos.
 */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.PUBLIC_APP_URL?.replace(/\/$/, '');
  const segredo = process.env.TELEGRAM_WEBHOOK_SECRET;

  const resultado: Record<string, unknown> = {};

  try {
    resultado.baseDeDados = { ok: true, instrucoes: await aplicarEsquema() };
  } catch (err) {
    resultado.baseDeDados = { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }

  if (!token || !appUrl) {
    resultado.telegram = { ok: false, erro: 'TELEGRAM_BOT_TOKEN ou PUBLIC_APP_URL em falta' };
    return NextResponse.json(resultado, { status: 500 });
  }

  const api = (metodo: string, corpo?: unknown) =>
    fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corpo ?? {}),
    }).then((r) => r.json() as Promise<{ ok: boolean; description?: string; result?: unknown }>);

  try {
    const webhook = await api('setWebhook', {
      url: `${appUrl}/api/telegram/webhook`,
      ...(segredo ? { secret_token: segredo } : {}),
      allowed_updates: ['message'],
      drop_pending_updates: true,
    });
    const menu = await api('setChatMenuButton', {
      menu_button: { type: 'web_app', text: 'Jogar', web_app: { url: appUrl } },
    });
    const comandos = await api('setMyCommands', {
      commands: [{ command: 'start', description: 'Abrir a Sueca' }],
    });
    const info = await api('getWebhookInfo');
    const infoResult = (info.result ?? {}) as { url?: string; pending_update_count?: number; last_error_message?: string };

    resultado.telegram = {
      ok: webhook.ok && menu.ok && comandos.ok,
      webhook: webhook.ok ? 'registado' : webhook.description,
      botaoMenu: menu.ok ? 'definido' : menu.description,
      comandos: comandos.ok ? 'definidos' : comandos.description,
      webhookAtual: infoResult.url,
      ultimoErro: infoResult.last_error_message ?? null,
    };
  } catch (err) {
    resultado.telegram = { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }

  const tudoOk = (resultado.baseDeDados as { ok: boolean }).ok && (resultado.telegram as { ok: boolean }).ok;
  return NextResponse.json(resultado, { status: tudoOk ? 200 : 500 });
}
