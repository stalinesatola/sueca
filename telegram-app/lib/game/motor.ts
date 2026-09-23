// Motor de jogo puro e sem estado externo: recebe um EstadoJogo e devolve o
// próximo, sem tocar em rede nem base de dados. Corre inteiramente dentro de
// um pedido serverless — por isso, depois de aplicar a jogada do humano,
// avança automaticamente todas as jogadas dos robôs até precisar de outra
// decisão humana (ou a mão terminar), tudo antes de devolver a resposta.
import { ASSENTOS, baralhar, equipaDe, montarBaralho, proximoAssento, type Assento, type Carta, type Naipe } from './baralho';
import { avaliarVaza, jogadasLegais, type Jogada } from './regras';
import { escolherCartaBot, type Dificuldade } from './ia';

export interface EstagioConfig {
  id: number;
  nome: string;
  dificuldade: Dificuldade;
  recompensaMoedas: number;
  flavor: string;
}

export interface EstadoJogo {
  estagioId: number;
  dificuldade: Dificuldade;
  dealer: Assento;
  trunfo: Naipe;
  lider: Assento;
  maos: Record<Assento, Carta[]>;
  trickPlays: Jogada<Assento>[];
  naipeSaida: Naipe | null;
  pontos: { A: number; B: number };
  vazasJogadas: number;
  historico: { assento: Assento; carta: Carta }[][]; // uma entrada por vaza terminada
  terminado: boolean;
  vencedor: 'A' | 'B' | 'empate' | null;
}

const ASSENTO_HUMANO: Assento = 'sul';

export function novoJogo(estagioId: number, dificuldade: Dificuldade, dealer: Assento = 'sul'): EstadoJogo {
  const baralho = baralhar(montarBaralho());
  const ordem = ordemDistribuicao(proximoAssento(dealer));
  const maos: Record<Assento, Carta[]> = { sul: [], oeste: [], norte: [], este: [] };
  for (let i = 0; i < baralho.length; i++) {
    maos[ordem[i % 4]!]!.push(baralho[i]!);
  }
  const cartaTrunfo = baralho[baralho.length - 1]!;

  const estado: EstadoJogo = {
    estagioId,
    dificuldade,
    dealer,
    trunfo: cartaTrunfo.naipe,
    lider: proximoAssento(dealer),
    maos,
    trickPlays: [],
    naipeSaida: null,
    pontos: { A: 0, B: 0 },
    vazasJogadas: 0,
    historico: [],
    terminado: false,
    vencedor: null,
  };

  return avancarAteHumano(estado);
}

function ordemDistribuicao(primeiroAReceber: Assento): Assento[] {
  const i = ASSENTOS.indexOf(primeiroAReceber);
  return [0, 1, 2, 3].map((k) => ASSENTOS[(i + k) % 4]!);
}

export function jogadaLegalPara(estado: EstadoJogo, assento: Assento): Carta[] {
  return jogadasLegais(estado.maos[assento], estado.naipeSaida);
}

/** Aplica a jogada do jogador humano (validando legalidade) e depois avança
 * automaticamente os robôs até à próxima decisão humana. */
export function jogarCartaHumana(estado: EstadoJogo, cartaId: string): EstadoJogo {
  if (estado.terminado) throw new Error('jogo já terminado');
  if (proximoJogadorDaVaza(estado) !== ASSENTO_HUMANO) throw new Error('não é a vez do jogador humano');
  const mao = estado.maos[ASSENTO_HUMANO];
  const carta = mao.find((c) => c.id === cartaId);
  if (!carta) throw new Error('carta não está na mão');
  const legais = jogadaLegalPara(estado, ASSENTO_HUMANO);
  if (!legais.some((c) => c.id === cartaId)) throw new Error('jogada ilegal — tem de seguir o naipe');

  const proximo = aplicarJogada(estado, ASSENTO_HUMANO, carta);
  return avancarAteHumano(proximo);
}

function proximoJogadorDaVaza(estado: EstadoJogo): Assento {
  const ordem = ordemAPartirDoLider(estado.lider);
  return ordem[estado.trickPlays.length]!;
}

function ordemAPartirDoLider(lider: Assento): Assento[] {
  const i = ASSENTOS.indexOf(lider);
  return [0, 1, 2, 3].map((k) => ASSENTOS[(i + k) % 4]!);
}

function aplicarJogada(estado: EstadoJogo, assento: Assento, carta: Carta): EstadoJogo {
  const novasMaos = { ...estado.maos, [assento]: estado.maos[assento].filter((c) => c.id !== carta.id) };
  const naipeSaida = estado.naipeSaida ?? carta.naipe;
  const trickPlays = [...estado.trickPlays, { assento, carta }];

  let estadoParcial: EstadoJogo = { ...estado, maos: novasMaos, naipeSaida, trickPlays };

  if (trickPlays.length < 4) return estadoParcial;

  // vaza completa: resolve, atualiza pontos e histórico, prepara a próxima
  const melhor = avaliarVaza(trickPlays, estado.trunfo);
  const vencedorEquipa = equipaDe(melhor.assento);
  const pontosVaza = trickPlays.reduce((s, p) => s + p.carta.valor, 0);
  const vazasJogadas = estado.vazasJogadas + 1;

  estadoParcial = {
    ...estadoParcial,
    pontos: { ...estadoParcial.pontos, [vencedorEquipa]: estadoParcial.pontos[vencedorEquipa] + pontosVaza },
    historico: [...estadoParcial.historico, trickPlays],
    trickPlays: [],
    naipeSaida: null,
    vazasJogadas,
    lider: melhor.assento,
  };

  if (vazasJogadas >= 10) {
    const { A, B } = estadoParcial.pontos;
    estadoParcial = { ...estadoParcial, terminado: true, vencedor: A > B ? 'A' : B > A ? 'B' : 'empate' };
  }

  return estadoParcial;
}

/** Joga automaticamente todos os robôs em sequência até ser a vez do humano
 * ou a mão terminar. Cada robô decide com a IA parametrizada pela
 * dificuldade do estágio. */
function avancarAteHumano(estado: EstadoJogo): EstadoJogo {
  let atual = estado;
  // limite de segurança: no máximo 40 jogadas (10 vazas × 4) por chamada,
  // para nunca entrar em ciclo infinito por um bug de estado.
  for (let i = 0; i < 40 && !atual.terminado; i++) {
    const proximoAssentoDaVaza = atual.trickPlays.length === 0 ? atual.lider : proximoJogadorDaVaza(atual);
    if (proximoAssentoDaVaza === ASSENTO_HUMANO) break;

    const mao = atual.maos[proximoAssentoDaVaza];
    const carta = escolherCartaBot(
      mao,
      proximoAssentoDaVaza,
      {
        naipeSaida: atual.naipeSaida,
        trunfo: atual.trunfo,
        trickPlays: atual.trickPlays,
        vazasJogadas: atual.vazasJogadas,
        equipaDe,
      },
      atual.dificuldade,
    );
    atual = aplicarJogada(atual, proximoAssentoDaVaza, carta);
  }
  return atual;
}

export interface VistaPublica {
  estagioId: number;
  trunfo: Naipe;
  lider: Assento;
  naipeSaida: Naipe | null;
  pontos: { A: number; B: number };
  vazasJogadas: number;
  terminado: boolean;
  vencedor: 'A' | 'B' | 'empate' | null;
  trickPlays: Jogada<Assento>[];
  maoJogador: Carta[];
  jogadasLegais: string[];
  cartasPorAssento: Record<Assento, number>;
  ultimaVaza: { assento: Assento; carta: Carta }[] | null;
}

/** Vista do estado segura para enviar ao cliente: esconde as mãos dos
 * robôs (só o número de cartas), mostra sempre a mão do humano. */
export function vistaPublica(estado: EstadoJogo): VistaPublica {
  return {
    estagioId: estado.estagioId,
    trunfo: estado.trunfo,
    lider: estado.lider,
    naipeSaida: estado.naipeSaida,
    pontos: estado.pontos,
    vazasJogadas: estado.vazasJogadas,
    terminado: estado.terminado,
    vencedor: estado.vencedor,
    trickPlays: estado.trickPlays,
    maoJogador: estado.maos[ASSENTO_HUMANO],
    jogadasLegais: estado.terminado ? [] : jogadaLegalPara(estado, ASSENTO_HUMANO).map((c) => c.id),
    cartasPorAssento: Object.fromEntries(ASSENTOS.map((a) => [a, estado.maos[a].length])) as Record<Assento, number>,
    ultimaVaza: estado.historico.at(-1) ?? null,
  };
}
