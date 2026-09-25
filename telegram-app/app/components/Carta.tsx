'use client';

import type { Carta as CartaModelo } from '@/lib/game/baralho';

interface Props {
  carta: CartaModelo;
  jogavel?: boolean;
  onJogar?: () => void;
}

const FIGURAS = new Set(['K', 'Q', 'J']);

export function Carta({ carta, jogavel, onJogar }: Props) {
  const cor = carta.naipe === 'copas' || carta.naipe === 'ouros' ? 'vermelha' : 'preta';

  return (
    <div
      className={`carta ${cor} ${jogavel ? 'jogavel' : 'bloqueada'}`}
      role={jogavel ? 'button' : undefined}
      tabIndex={jogavel ? 0 : -1}
      aria-label={`${carta.rotulo} de ${carta.naipe}`}
      onClick={jogavel ? onJogar : undefined}
      onKeyDown={jogavel ? (e) => (e.key === 'Enter' || e.key === ' ') && onJogar?.() : undefined}
    >
      <span className="moldura" />
      <span className="marca tl">
        {carta.rotulo}
        <span className="naipe">{carta.simbolo}</span>
      </span>
      {carta.rank === 'A' && <span className="pip-grande">{carta.simbolo}</span>}
      {FIGURAS.has(carta.rank) && (
        <span className="crista">
          <span className="crista-escudo">{carta.simbolo}</span>
          <span className="crista-letra">{carta.rotulo}</span>
        </span>
      )}
      <span className="marca br">
        {carta.rotulo}
        <span className="naipe">{carta.simbolo}</span>
      </span>
    </div>
  );
}

export function CartaDorso({ largura = 44, altura = 62 }: { largura?: number; altura?: number }) {
  return <div className="carta-dorso" style={{ ['--w' as string]: `${largura}px`, ['--h' as string]: `${altura}px` }} />;
}
