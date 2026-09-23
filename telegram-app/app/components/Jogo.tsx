'use client';

import { useState } from 'react';
import { Carta, CartaDorso } from './Carta';
import { pedidoAutenticado } from '@/lib/client/api';
import { vibrar } from '@/lib/client/telegram';
import type { EstagioConfig, VistaPublica } from '@/lib/game/motor';
import type { Assento } from '@/lib/game/baralho';

const NOME_NAIPE: Record<string, string> = { espadas: 'Espadas', copas: 'Copas', ouros: 'Ouros', paus: 'Paus' };
const ROTULO_ASSENTO: Record<Assento, string> = { sul: 'Sul (você)', oeste: 'Oeste', norte: 'Norte (parceiro)', este: 'Este' };

interface Resultado {
  estrelas: number;
  margem: number;
  moedasGanhas: number;
  jogadorCoins: number;
  jogadorProximoEstagio: number;
}

interface Props {
  estagio: EstagioConfig;
  sessaoId: string;
  vistaInicial: VistaPublica;
  onSair: (moedasAtualizadas?: number) => void;
}

export function Jogo({ estagio, sessaoId, vistaInicial, onSair }: Props) {
  const [vista, setVista] = useState(vistaInicial);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function jogar(cartaId: string) {
    if (aEnviar || vista.terminado) return;
    setAEnviar(true);
    setErro(null);
    vibrar('light');
    try {
      const resposta = await pedidoAutenticado<{ vista: VistaPublica; resultado: Resultado | null }>(
        `/api/session/${sessaoId}/play`,
        { method: 'POST', body: JSON.stringify({ cartaId }) },
      );
      setVista(resposta.vista);
      if (resposta.resultado) {
        setResultado(resposta.resultado);
        vibrar(resposta.resultado.margem > 0 ? 'heavy' : 'medium');
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'algo correu mal');
    } finally {
      setAEnviar(false);
    }
  }

  const jogadasLegaisSet = new Set(vista.jogadasLegais);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderBottom: '1px solid #1d4a3a',
        }}
      >
        <button className="botao-secundario" onClick={() => onSair()} style={{ padding: '6px 14px' }}>
          ← Sair
        </button>
        <span style={{ fontSize: '.85rem', color: 'var(--texto-esbatido)' }}>
          Vaza {vista.vazasJogadas + (vista.terminado ? 0 : 1)}/10 · Trunfo {NOME_NAIPE[vista.trunfo]}
        </span>
      </header>

      <section style={{ display: 'flex', justifyContent: 'center', gap: 14, padding: '10px 0', fontSize: '.75rem', color: 'var(--texto-esbatido)' }}>
        {(['norte', 'oeste', 'este'] as Assento[]).map((a) => (
          <div key={a} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <CartaDorso largura={30} altura={42} />
            <span>{ROTULO_ASSENTO[a]} · {vista.cartasPorAssento[a]}</span>
          </div>
        ))}
      </section>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <div style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: '1.1rem' }}>
          Vocês {vista.pontos.A} — {vista.pontos.B} Eles
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {vista.trickPlays.length === 0 && <span style={{ color: 'var(--texto-esbatido)', fontSize: '.8rem' }}>a aguardar a jogada de abertura…</span>}
          {vista.trickPlays.map((j) => (
            <div key={j.assento} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Carta carta={j.carta} />
              <span style={{ fontSize: '.62rem', color: 'var(--texto-esbatido)' }}>{ROTULO_ASSENTO[j.assento]}</span>
            </div>
          ))}
        </div>
        {erro && <p style={{ color: 'var(--mau)', fontSize: '.8rem' }}>{erro}</p>}
      </section>

      <section style={{ display: 'flex', overflowX: 'auto', gap: 0, padding: '14px 16px 26px', justifyContent: 'center' }}>
        {vista.maoJogador.map((carta, i) => {
          const jogavel = !aEnviar && !vista.terminado && jogadasLegaisSet.has(carta.id);
          return (
            <div key={carta.id} style={{ marginLeft: i === 0 ? 0 : -22 }}>
              <Carta carta={carta} jogavel={jogavel} onJogar={() => jogar(carta.id)} />
            </div>
          );
        })}
      </section>

      {resultado && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(5,17,13,.92)', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24,
          }}
        >
          <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--dourado)', margin: 0 }}>
            {resultado.margem > 0 ? `${estagio.nome} — vencido!` : 'Não desta vez'}
          </h2>
          {resultado.margem > 0 && (
            <div style={{ fontSize: '1.6rem', letterSpacing: 4 }}>
              {'★'.repeat(resultado.estrelas)}
              <span style={{ opacity: 0.25 }}>{'★'.repeat(3 - resultado.estrelas)}</span>
            </div>
          )}
          <p style={{ color: 'var(--texto-claro)', textAlign: 'center', maxWidth: '30ch' }}>
            {resultado.margem > 0
              ? `+${resultado.moedasGanhas} moedas. Saldo: ${resultado.jogadorCoins}.`
              : 'A equipa deles fez mais pontos desta vez — tenta outra vez quando quiseres.'}
          </p>
          <button className="botao-principal" onClick={() => onSair(resultado.jogadorCoins)}>
            Voltar ao mapa
          </button>
        </div>
      )}
    </div>
  );
}
