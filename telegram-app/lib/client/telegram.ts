'use client';

// Wrapper fino ao SDK Web da Telegram (carregado via <Script> no layout).
// Fora do Telegram (ex.: a testar no browser normal) fica tudo em no-op /
// valores vazios, para a app não rebentar — só não faz autenticação real.

interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  HapticFeedback?: { impactOccurred: (estilo: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function obterTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

export function iniciarTelegramWebApp(): void {
  const app = obterTelegramWebApp();
  app?.ready();
  app?.expand();
}

export function obterInitData(): string {
  return obterTelegramWebApp()?.initData ?? '';
}

export function vibrar(estilo: 'light' | 'medium' | 'heavy' = 'light'): void {
  obterTelegramWebApp()?.HapticFeedback?.impactOccurred(estilo);
}
