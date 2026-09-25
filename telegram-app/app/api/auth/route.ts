import { NextResponse } from 'next/server';
import { autenticarPedido, ErroAutenticacao } from '@/lib/api-auth';
import { obterProgresso } from '@/lib/db';

export const runtime = 'nodejs';

/** Chamada uma vez quando a Mini App abre: valida o initData do Telegram,
 * cria/atualiza o jogador e devolve o progresso para desenhar o mapa de
 * estágios logo no arranque. */
export async function POST(req: Request) {
  try {
    const jogador = await autenticarPedido(req);
    const progresso = await obterProgresso(Number(jogador.id));
    return NextResponse.json({ jogador, progresso });
  } catch (err) {
    if (err instanceof ErroAutenticacao) {
      return NextResponse.json({ erro: err.message }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ erro: 'erro interno' }, { status: 500 });
  }
}
