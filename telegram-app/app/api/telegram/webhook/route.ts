import { NextResponse } from 'next/server';
import { Bot, webhookCallback } from 'grammy';

export const runtime = 'nodejs';

// O bot é construído por pedido (não a nível de módulo) para nunca falhar o
// build/arranque frio só por a variável de ambiente ainda não estar lá —
// o erro só acontece, com uma mensagem clara, se um pedido chegar sem ela.
function construirBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN não configurado');
  const appUrl = process.env.PUBLIC_APP_URL;
  if (!appUrl) throw new Error('PUBLIC_APP_URL não configurado');

  const bot = new Bot(token);

  bot.command('start', async (ctx) => {
    await ctx.reply('🃏 Sueca — sobe a escada, um estágio de cada vez.', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Jogar', web_app: { url: appUrl } }]],
      },
    });
  });

  return bot;
}

export async function POST(req: Request) {
  const segredoEsperado = process.env.TELEGRAM_WEBHOOK_SECRET;
  const segredoRecebido = req.headers.get('x-telegram-bot-api-secret-token');
  if (segredoEsperado && segredoRecebido !== segredoEsperado) {
    return NextResponse.json({ erro: 'segredo do webhook inválido' }, { status: 401 });
  }

  try {
    const bot = construirBot();
    const handler = webhookCallback(bot, 'std/http');
    return await handler(req);
  } catch (err) {
    console.error('erro no webhook do Telegram:', err);
    return NextResponse.json({ erro: 'erro interno' }, { status: 500 });
  }
}
