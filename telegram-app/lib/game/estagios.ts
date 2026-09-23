import type { EstagioConfig } from './motor';

// 20 estágios, dificuldade a subir em patamares de 4 (como uma "escada"),
// com um "chefe" a fechar cada patamar (recompensa maior, mesma dificuldade
// do próprio patamar mas descrito como o desafio do grupo).
function gerarEstagios(): EstagioConfig[] {
  const nomesPatamar = ['Tasca do Bairro', 'Torneio da Aldeia', 'Liga Regional', 'Nacional', 'Mundial da Sueca'];
  const estagios: EstagioConfig[] = [];
  let id = 1;
  for (let patamar = 0; patamar < 5; patamar++) {
    const dificuldade = (patamar + 1) as EstagioConfig['dificuldade'];
    for (let dentro = 0; dentro < 4; dentro++) {
      const ehChefe = dentro === 3;
      estagios.push({
        id,
        nome: ehChefe ? `${nomesPatamar[patamar]} — Final` : `${nomesPatamar[patamar]} ${dentro + 1}`,
        dificuldade,
        recompensaMoedas: 20 * dificuldade + (ehChefe ? 40 : 0),
        flavor: ehChefe
          ? 'O parceiro e os adversários deste patamar jogam no limite — vence para desbloquear o próximo.'
          : 'Uma mão normal, contra adversários deste nível.',
      });
      id++;
    }
  }
  return estagios;
}

export const ESTAGIOS: EstagioConfig[] = gerarEstagios();

export function obterEstagio(id: number): EstagioConfig | undefined {
  return ESTAGIOS.find((e) => e.id === id);
}

/** 1–3 estrelas consoante a margem de pontos da vitória (60→120 possíveis). */
export function calcularEstrelas(margem: number): 0 | 1 | 2 | 3 {
  if (margem <= 0) return 0;
  if (margem >= 60) return 3;
  if (margem >= 30) return 2;
  return 1;
}
