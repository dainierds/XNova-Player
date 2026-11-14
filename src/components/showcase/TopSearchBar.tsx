import React from 'react';
import { BRANDING } from '../../config/branding';

interface TopSearchBarProps {
  expDate?: string;
  planBadge?: string;
}

export const TopSearchBar: React.FC<TopSearchBarProps> = ({
  expDate = '2026-12-31',
  planBadge,
}) => {
  return (
    <header className="relative z-20 w-full px-12 pt-6 pb-2 flex items-center justify-between select-none">
      {/* Logotipo Oficial XNova Player a la izquierda */}
      <div className="flex items-center space-x-3">
        <img
          src={BRANDING.assets.logo}
          alt={BRANDING.name}
          className="h-10 w-auto object-contain drop-shadow-lg"
        />
      </div>

      {/* Indicadores Elegantes a la derecha: Estado de Suscripción y Vencimiento */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs text-zinc-300 font-semibold tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
          <span>VENCE: <strong className="text-white">{expDate}</strong></span>
        </div>

        {planBadge && (
          <span className="px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-xs font-black text-cyan-300 uppercase tracking-wider backdrop-blur-md shadow-md shadow-cyan-950/40">
            PLAN {planBadge}
          </span>
        )}
      </div>
    </header>
  );
};
