import React from 'react';

interface TopSearchBarProps {
  expDate?: string;
  planBadge?: string;
}

export const TopSearchBar: React.FC<TopSearchBarProps> = ({
  expDate = '2026-12-31',
  planBadge,
}) => {
  return (
    <header className="relative z-20 w-full px-8 py-2.5 flex items-center justify-end select-none bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none">
      {/* Indicadores Elegantes a la derecha: Estado de Suscripción y Vencimiento */}
      <div className="flex items-center space-x-2.5 pointer-events-auto">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md text-[11px] text-zinc-300 font-semibold tracking-wider shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
          <span>VENCE: <strong className="text-white font-bold">{expDate}</strong></span>
        </div>

        {planBadge && (
          <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-[11px] font-black text-cyan-300 uppercase tracking-wider backdrop-blur-md shadow-sm">
            PLAN {planBadge}
          </span>
        )}
      </div>
    </header>
  );
};
