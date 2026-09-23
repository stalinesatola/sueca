import type { Carta, Naipe } from './baralho';
import { avaliarVaza, jogadasLegais, maiorValor, menorCarta, podeBater, type Jogada } from './regras';
import { equipaDe, type Assento, type Equipa } from './baralho';

export interface EstadoParaIA<A extends string = string> {
  naipeSaida: Naipe | null;
  trunfo: Naipe;
  trickPlays: Jogada<A>[];
  vazasJogadas: number; // 0–9, quantas vazas desta mão já terminaram
  equipaDe: (a: A) => Equipa;
}

/** 1 = Iniciante (jogadas quase aleatórias) … 5 = Mestre (heurística completa, quase sem ruído). */
export type Dificuldade = 1 | 2 | 3 | 4 | 5;

const PROBABILIDADE_ERRO: Record<Dificuldade, number> = { 1: 0.55, 2: 0.35, 3: 0.18, 4: 0.07, 5: 0 };

function cartaAleatoria(lista: Carta[]): Carta {
  return lista[Math.floor(Math.random() * lista.length)]!;
}

/** Escolhe a carta do bot para o assento `assento`, dado o estado da vaza atual.
 * A dificuldade controla a probabilidade de ignorar a heurística "correta"
 * e jogar uma carta legal ao acaso — assim um "Iniciante" comete erros
 * plausíveis (desperdiça um Ás, não corta) em vez de jogar de forma burra
 * de propósito (o que se nota e não é divertido). */
export function escolherCartaBot<A extends string>(mao: Carta[], assento: A, estado: EstadoParaIA<A>, dificuldade: Dificuldade): Carta {
  const legais = jogadasLegais(mao, estado.naipeSaida);
  if (Math.random() < PROBABILIDADE_ERRO[dificuldade]) return cartaAleatoria(legais);

  const { trunfo, vazasJogadas } = estado;
  const restantes = 10 - vazasJogadas;

  if (!estado.naipeSaida) {
    const semTrunfo = mao.filter((c) => c.naipe !== trunfo);
    const base = semTrunfo.length ? semTrunfo : mao;
    const ases = base.filter((c) => c.rank === 'A');
    if (ases.length && Math.random() < 0.55) return cartaAleatoria(ases);
    if (restantes <= 2 && Math.random() < 0.4) {
      const trunfos = mao.filter((c) => c.naipe === trunfo);
      if (trunfos.length) {
        let alto = trunfos[0]!;
        for (const c of trunfos) if (c.forca > alto.forca) alto = c;
        return alto;
      }
    }
    return menorCarta(base);
  }

  const melhorAtual = avaliarVaza(estado.trickPlays, trunfo);
  const valorMesa = estado.trickPlays.reduce((s, p) => s + p.carta.valor, 0);

  if (estado.equipaDe(melhorAtual.assento) === estado.equipaDe(assento)) {
    if (valorMesa >= 10 || restantes <= 3) {
      const semTrunfo = legais.filter((c) => c.naipe !== trunfo);
      const base = semTrunfo.length ? semTrunfo : legais;
      return maiorValor(base);
    }
    return menorCarta(legais);
  }

  const vencedoras = legais.filter((c) => podeBater(c, melhorAtual.carta, trunfo));
  if (vencedoras.length) {
    const precisaCortar = !vencedoras.some((c) => c.naipe === estado.naipeSaida);
    if (precisaCortar && valorMesa < 4 && restantes > 3 && Math.random() < 0.5) {
      const alternativas = legais.filter((c) => !vencedoras.includes(c));
      return menorCarta(alternativas.length ? alternativas : legais);
    }
    return menorCarta(vencedoras);
  }

  const naoTrunfo = legais.filter((c) => c.naipe !== trunfo);
  return menorCarta(naoTrunfo.length ? naoTrunfo : legais);
}

export { equipaDe };
export type { Assento };
