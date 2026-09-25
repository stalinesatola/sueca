'use client';

import { obterInitData } from './telegram';

/** fetch com o cabeçalho de autenticação da Mini App já incluído. */
export async function pedidoAutenticado<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await fetch(caminho, {
    ...opcoes,
    headers: {
      ...(opcoes.body ? { 'content-type': 'application/json' } : {}),
      authorization: `tma ${obterInitData()}`,
      ...opcoes.headers,
    },
  });
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro ?? `pedido falhou (${resposta.status})`);
  return dados as T;
}
