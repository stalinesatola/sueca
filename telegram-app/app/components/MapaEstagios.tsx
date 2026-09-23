'use client';

import type { EstagioConfig } from '@/lib/game/motor';
import type { ProgressoEstagio } from '@/lib/db';

export interface EstagioComProgresso extends EstagioConfig {
  desbloqueado: boolean;
  progresso: ProgressoEstagio | null;
}

interface Props {
  estagios: EstagioComProgresso[];
  moedas: number;
  onEscolher: (estagioId: number) => void;
}

const NOMES_PATAMAR = ['Tasca do Bairro', 'Torneio da Aldeia', 'Liga Regional', 'Nacional', 'Mundial da Sueca'];

export function MapaEstagios({ estagios, moedas, onEscolher }: Props) {
  const patamares = Array.from({ length: 5 }, (_, i) => estagios.slice(i * 4, i * 4 + 4));

  return (
    <div style={{ padding: '16px 16px 32px', maxWidth: 480, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Cinzel, serif', color: 'var(--dourado)', fontSize: '1.3rem', margin: 0 }}>Sueca</h1>
        <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>🪙 {moedas}</span>
      </header>

      {patamares.map((estagiosDoPatamar, i) => (
        <section key={i} style={{ marginBottom: 22 }}>
          <h2
            style={{
              fontSize: '.7rem',
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: 'var(--texto-esbatido)',
              margin: '0 0 10px',
            }}
          >
            {NOMES_PATAMAR[i]}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {estagiosDoPatamar.map((estagio) => (
              <button
                key={estagio.id}
                disabled={!estagio.desbloqueado}
                onClick={() => onEscolher(estagio.id)}
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 14,
                  border: estagio.desbloqueado ? '1px solid var(--dourado-fraco)' : '1px solid #2c5c47',
                  background: estagio.desbloqueado
                    ? 'linear-gradient(180deg, #164a38, #0d3327)'
                    : 'rgba(255,255,255,.03)',
                  color: estagio.desbloqueado ? 'var(--texto-claro)' : 'var(--texto-esbatido)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  opacity: estagio.desbloqueado ? 1 : 0.55,
                }}
              >
                {estagio.desbloqueado ? (
                  <>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{estagio.id}</span>
                    <span style={{ fontSize: '.85rem', letterSpacing: '2px' }}>
                      {'★'.repeat(estagio.progresso?.stars ?? 0)}
                      <span style={{ opacity: 0.25 }}>{'★'.repeat(3 - (estagio.progresso?.stars ?? 0))}</span>
                    </span>
                  </>
                ) : (
                  <span aria-hidden style={{ fontSize: '1.2rem' }}>🔒</span>
                )}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
