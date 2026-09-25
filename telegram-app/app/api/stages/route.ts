import { NextResponse } from 'next/server';
import { autenticarPedido, ErroAutenticacao } from '@/lib/api-auth';
import { obterProgresso } from '@/lib/db';
import { ESTAGIOS } from '@/lib/game/estagios';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const jogador = await autenticarPedido(req);
    const progresso = await obterProgresso(Number(jogador.id));
    const progressoPorEstagio = new Map(progresso.map((p) => [p.stage_id, p]));

    const estagios = ESTAGIOS.map((estagio) => ({
      ...estagio,
      desbloqueado: estagio.id <= jogador.current_stage,
      progresso: progressoPorEstagio.get(estagio.id) ?? null,
    }));

    return NextResponse.json({ jogador, estagios });
  } catch (err) {
    if (err instanceof ErroAutenticacao) return NextResponse.json({ erro: err.message }, { status: 401 });
    console.error(err);
    return NextResponse.json({ erro: 'erro interno' }, { status: 500 });
  }
}
