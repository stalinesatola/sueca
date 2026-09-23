'use client';

import { useEffect, useState } from 'react';
import { MapaEstagios, type EstagioComProgresso } from './components/MapaEstagios';
import { Jogo } from './components/Jogo';
import { pedidoAutenticado } from '@/lib/client/api';
import { iniciarTelegramWebApp } from '@/lib/client/telegram';
import type { Jogador } from '@/lib/db';
import type { EstagioConfig, VistaPublica } from '@/lib/game/motor';

type Ecra =
  | { tipo: 'a-carregar' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'mapa' }
  | { tipo: 'jogo'; estagio: EstagioConfig; sessaoId: string; vista: VistaPublica };

export default function Pagina() {
  const [ecra, setEcra] = useState<Ecra>({ tipo: 'a-carregar' });
  const [jogador, setJogador] = useState<Jogador | null>(null);
  const [estagios, setEstagios] = useState<EstagioComProgresso[]>([]);

  useEffect(() => {
    iniciarTelegramWebApp();
    carregarEstagios();
  }, []);

  async function carregarEstagios() {
    try {
      const dados = await pedidoAutenticado<{ jogador: Jogador; estagios: EstagioComProgresso[] }>('/api/stages');
      setJogador(dados.jogador);
      setEstagios(dados.estagios);
      setEcra({ tipo: 'mapa' });
    } catch (e) {
      setEcra({ tipo: 'erro', mensagem: e instanceof Error ? e.message : 'falha ao carregar' });
    }
  }

  async function escolherEstagio(estagioId: number) {
    try {
      const dados = await pedidoAutenticado<{ sessaoId: string; estagio: EstagioConfig; vista: VistaPublica }>(
        `/api/stage/${estagioId}/start`,
        { method: 'POST' },
      );
      setEcra({ tipo: 'jogo', estagio: dados.estagio, sessaoId: dados.sessaoId, vista: dados.vista });
    } catch (e) {
      setEcra({ tipo: 'erro', mensagem: e instanceof Error ? e.message : 'falha ao começar o estágio' });
    }
  }

  function sairDoJogo(moedasAtualizadas?: number) {
    if (moedasAtualizadas != null && jogador) setJogador({ ...jogador, coins: moedasAtualizadas });
    carregarEstagios();
  }

  if (ecra.tipo === 'a-carregar') {
    return <CentroTexto>A entrar…</CentroTexto>;
  }
  if (ecra.tipo === 'erro') {
    return (
      <CentroTexto>
        <p style={{ color: 'var(--mau)' }}>{ecra.mensagem}</p>
        <button className="botao-principal" onClick={carregarEstagios}>Tentar outra vez</button>
      </CentroTexto>
    );
  }
  if (ecra.tipo === 'jogo') {
    return <Jogo estagio={ecra.estagio} sessaoId={ecra.sessaoId} vistaInicial={ecra.vista} onSair={sairDoJogo} />;
  }
  return <MapaEstagios estagios={estagios} moedas={jogador?.coins ?? 0} onEscolher={escolherEstagio} />;
}

function CentroTexto({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
      {children}
    </div>
  );
}
