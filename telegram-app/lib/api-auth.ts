import { validarInitData } from './telegram-auth';
import { obterOuCriarJogador, type Jogador } from './db';

/** Lê o cabeçalho `Authorization: tma <initData>` (convenção das Telegram
 * Mini Apps), valida a assinatura e devolve/regista o jogador. Lança
 * Response 401 (via NextResponse, lançada como erro tipado) se inválido —
 * cada rota trata isso com o helper `comAutenticacao`. */
export class ErroAutenticacao extends Error {}

export async function autenticarPedido(req: Request): Promise<Jogador> {
  const cabecalho = req.headers.get('authorization') ?? '';
  const initData = cabecalho.startsWith('tma ') ? cabecalho.slice(4) : '';
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new ErroAutenticacao('TELEGRAM_BOT_TOKEN não configurado no servidor');

  const resultado = validarInitData(initData, botToken);
  if (!resultado.ok || !resultado.utilizador) {
    throw new ErroAutenticacao(resultado.motivo ?? 'autenticação inválida');
  }

  return obterOuCriarJogador({
    id: resultado.utilizador.id,
    username: resultado.utilizador.username,
    first_name: resultado.utilizador.first_name,
    photo_url: resultado.utilizador.photo_url,
  });
}
