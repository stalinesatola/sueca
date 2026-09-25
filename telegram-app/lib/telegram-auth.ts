import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TelegramUtilizador {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface ResultadoValidacao {
  ok: boolean;
  utilizador?: TelegramUtilizador;
  motivo?: string;
}

const IDADE_MAXIMA_SEGUNDOS = 60 * 60 * 24; // 24h — o suficiente para uma sessão longa, curto para não aceitar initData antigo roubado

/**
 * Valida o `initData` que a Telegram Mini App envia, confirmando que foi
 * mesmo assinado pelo bot (usando o token) e que não é antigo demais.
 * Ver: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validarInitData(initData: string, botToken: string): ResultadoValidacao {
  if (!initData) return { ok: false, motivo: 'initData vazio' };

  const params = new URLSearchParams(initData);
  const hashRecebido = params.get('hash');
  if (!hashRecebido) return { ok: false, motivo: 'sem campo hash' };
  params.delete('hash');

  const authDate = Number(params.get('auth_date') ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > IDADE_MAXIMA_SEGUNDOS) {
    return { ok: false, motivo: 'auth_date em falta ou expirado' };
  }

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, valor]) => `${chave}=${valor}`)
    .join('\n');

  const chaveSecreta = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hashCalculado = createHmac('sha256', chaveSecreta).update(dataCheckString).digest('hex');

  const bufA = Buffer.from(hashCalculado, 'hex');
  const bufB = Buffer.from(hashRecebido, 'hex');
  if (bufA.length !== bufB.length || !timingSafeEqual(bufA, bufB)) {
    return { ok: false, motivo: 'assinatura inválida' };
  }

  const utilizadorBruto = params.get('user');
  if (!utilizadorBruto) return { ok: false, motivo: 'sem campo user' };

  try {
    const utilizador = JSON.parse(utilizadorBruto) as TelegramUtilizador;
    return { ok: true, utilizador };
  } catch {
    return { ok: false, motivo: 'campo user malformado' };
  }
}
