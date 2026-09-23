import type { Carta, Naipe } from './baralho';

export function podeBater(candidata: Carta, atual: Carta, trunfo: Naipe): boolean {
  if (candidata.naipe === trunfo && atual.naipe !== trunfo) return true;
  if (atual.naipe === trunfo && candidata.naipe !== trunfo) return false;
  if (candidata.naipe === atual.naipe) return candidata.forca > atual.forca;
  return false;
}

export function jogadasLegais(mao: Carta[], naipeSaida: Naipe | null): Carta[] {
  if (!naipeSaida) return mao.slice();
  const seg = mao.filter((c) => c.naipe === naipeSaida);
  return seg.length ? seg : mao.slice();
}

export function menorCarta(lista: Carta[]): Carta {
  let m = lista[0]!;
  for (const c of lista) if (c.valor * 10 + c.forca < m.valor * 10 + m.forca) m = c;
  return m;
}

export function maiorValor(lista: Carta[]): Carta {
  let m = lista[0]!;
  for (const c of lista) if (c.valor > m.valor) m = c;
  return m;
}

export interface Jogada<A extends string = string> {
  assento: A;
  carta: Carta;
}

export function avaliarVaza<A extends string>(plays: Jogada<A>[], trunfo: Naipe): Jogada<A> {
  let melhor = plays[0]!;
  for (let i = 1; i < plays.length; i++) {
    if (podeBater(plays[i]!.carta, melhor.carta, trunfo)) melhor = plays[i]!;
  }
  return melhor;
}
