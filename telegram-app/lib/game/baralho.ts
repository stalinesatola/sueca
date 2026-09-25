// Modelo do baralho da Sueca — 40 cartas, 4 naipes. Porte direto da lógica
// já testada na versão web (telegram-app usa o mesmo vocabulário em
// português para manter as duas implementações fáceis de comparar).

export type Naipe = 'espadas' | 'copas' | 'ouros' | 'paus';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '7' | '6' | '5' | '4' | '3' | '2';
export type Assento = 'sul' | 'oeste' | 'norte' | 'este';
export type Equipa = 'A' | 'B';

export interface Carta {
  id: string;
  rank: Rank;
  naipe: Naipe;
  simbolo: string;
  valor: number;
  forca: number;
  rotulo: string;
}

export const NAIPES: { id: Naipe; simbolo: string; nome: string }[] = [
  { id: 'espadas', simbolo: '♠', nome: 'Espadas' },
  { id: 'copas', simbolo: '♥', nome: 'Copas' },
  { id: 'ouros', simbolo: '♦', nome: 'Ouros' },
  { id: 'paus', simbolo: '♣', nome: 'Paus' },
];

export const FORCA: Record<Rank, number> = { A: 10, '7': 9, K: 8, J: 7, Q: 6, '6': 5, '5': 4, '4': 3, '3': 2, '2': 1 };
export const VALOR: Record<Rank, number> = { A: 11, '7': 10, K: 4, J: 3, Q: 2, '6': 0, '5': 0, '4': 0, '3': 0, '2': 0 };
export const ROTULO_PT: Record<Rank, string> = { A: 'A', K: 'R', Q: 'D', J: 'V', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2' };

export const ASSENTOS: Assento[] = ['sul', 'oeste', 'norte', 'este'];

export function equipaDe(assento: Assento): Equipa {
  return assento === 'sul' || assento === 'norte' ? 'A' : 'B';
}

export function proximoAssento(a: Assento): Assento {
  return ASSENTOS[(ASSENTOS.indexOf(a) + 1) % 4]!;
}

export function ordemAPartirDe(a: Assento): Assento[] {
  const i = ASSENTOS.indexOf(a);
  return [0, 1, 2, 3].map((k) => ASSENTOS[(i + k) % 4]!);
}

export function montarBaralho(): Carta[] {
  const cartas: Carta[] = [];
  for (const n of NAIPES) {
    for (const rank of Object.keys(FORCA) as Rank[]) {
      cartas.push({
        id: `${rank}-${n.id}`,
        rank,
        naipe: n.id,
        simbolo: n.simbolo,
        valor: VALOR[rank],
        forca: FORCA[rank],
        rotulo: ROTULO_PT[rank],
      });
    }
  }
  return cartas;
}

/** Fisher–Yates. Usa Math.random — chega para baralhar um jogo casual;
 * não é para nada que precise de aleatoriedade criptográfica. */
export function baralhar<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
