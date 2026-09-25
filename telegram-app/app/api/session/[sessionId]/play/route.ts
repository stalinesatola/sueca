import { NextResponse } from 'next/server';
import { autenticarPedido, ErroAutenticacao } from '@/lib/api-auth';
import { atualizarSessaoEstagio, obterSessaoEstagio, registarTentativaEstagio } from '@/lib/db';
import { obterEstagio, calcularEstrelas } from '@/lib/game/estagios';
import { jogarCartaHumana, vistaPublica } from '@/lib/game/motor';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const jogador = await autenticarPedido(req);
    const { sessionId } = await params;
    const corpo = (await req.json()) as { cartaId?: string };
    if (!corpo.cartaId) return NextResponse.json({ erro: 'cartaId em falta' }, { status: 400 });

    const sessao = await obterSessaoEstagio(sessionId, Number(jogador.id));
    if (!sessao) return NextResponse.json({ erro: 'sessão não encontrada' }, { status: 404 });
    if (sessao.status === 'finished') return NextResponse.json({ erro: 'sessão já terminou' }, { status: 409 });

    let novoEstado;
    try {
      novoEstado = jogarCartaHumana(sessao.state, corpo.cartaId);
    } catch (e) {
      return NextResponse.json({ erro: e instanceof Error ? e.message : 'jogada inválida' }, { status: 422 });
    }

    await atualizarSessaoEstagio(sessionId, novoEstado);

    let resultado: { estrelas: number; margem: number; moedasGanhas: number; jogadorCoins: number; jogadorProximoEstagio: number } | null = null;

    if (novoEstado.terminado) {
      const estagio = obterEstagio(novoEstado.estagioId);
      const margem = novoEstado.pontos.A - novoEstado.pontos.B; // o humano está sempre na equipa A (Sul+Norte)
      const venceu = novoEstado.vencedor === 'A';
      const estrelas = venceu ? calcularEstrelas(margem) : 0;
      const { progresso, jogador: jogadorAtualizado } = await registarTentativaEstagio({
        jogadorId: Number(jogador.id),
        stageId: novoEstado.estagioId,
        venceu,
        margem,
        estrelas,
        recompensaMoedas: estagio?.recompensaMoedas ?? 0,
      });
      resultado = {
        estrelas: progresso.stars,
        margem,
        moedasGanhas: venceu ? estagio?.recompensaMoedas ?? 0 : 0,
        jogadorCoins: jogadorAtualizado.coins,
        jogadorProximoEstagio: jogadorAtualizado.current_stage,
      };
    }

    return NextResponse.json({ vista: vistaPublica(novoEstado), resultado });
  } catch (err) {
    if (err instanceof ErroAutenticacao) return NextResponse.json({ erro: err.message }, { status: 401 });
    console.error(err);
    return NextResponse.json({ erro: 'erro interno' }, { status: 500 });
  }
}
