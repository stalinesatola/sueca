import { NextResponse } from 'next/server';
import { autenticarPedido, ErroAutenticacao } from '@/lib/api-auth';
import { criarSessaoEstagio } from '@/lib/db';
import { obterEstagio } from '@/lib/game/estagios';
import { novoJogo, vistaPublica } from '@/lib/game/motor';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const jogador = await autenticarPedido(req);
    const estagioId = Number((await params).id);
    const estagio = obterEstagio(estagioId);
    if (!estagio) return NextResponse.json({ erro: 'estágio inexistente' }, { status: 404 });
    if (estagioId > jogador.current_stage) {
      return NextResponse.json({ erro: 'estágio ainda bloqueado' }, { status: 403 });
    }

    const estado = novoJogo(estagioId, estagio.dificuldade);
    const sessao = await criarSessaoEstagio(Number(jogador.id), estagioId, estado);

    return NextResponse.json({ sessaoId: sessao.id, estagio, vista: vistaPublica(estado) });
  } catch (err) {
    if (err instanceof ErroAutenticacao) return NextResponse.json({ erro: err.message }, { status: 401 });
    console.error(err);
    return NextResponse.json({ erro: 'erro interno' }, { status: 500 });
  }
}
