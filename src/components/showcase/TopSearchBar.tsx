import React from 'react';
import { Search, SlidersHorizontal, LogOut } from 'lucide-react';
import { BRANDING } from '../../config/branding';

interface TopSearchBarProps {
  isFocused: boolean;
  onOpenSearch: () => void;
  expDate?: string;
  planBadge?: string;
  userName?: string;
  onLogout?: () => void;
}

export const TopSearchBar: React.FC<TopSearchBarProps> = ({
  isFocused,
  onOpenSearch,
  expDate = '29 NOV 2026',
  planBadge,
  userName,
  onLogout,
}) => {
  return (
    <header className="relative z-20 w-full px-12 pt-7 pb-2 flex items-center justify-between select-none">
      {/* Logotipo discreto XNova Player a la izquierda */}
      <div className="flex items-center space-x-3">
        <img
          src={BRANDING.assets.logo}
          alt={BRANDING.name}
          className="h-10 w-auto object-contain drop-shadow-md"
        />
        <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-zinc-300 font-semibold tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
          <span>VENCE: <strong className="text-white">{expDate}</strong></span>
        </div>
        {planBadge && (
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-[10px] font-black text-cyan-400 uppercase tracking-wider">
            PLAN {planBadge}
          </span>
        )}
      </div>

      {/* Zona Derecha: Buscador + Botón Cambiar Cuenta / Cerrar Sesión */}
      <div className="flex items-center space-x-3">
        {/* Barra de Búsqueda Flotante estilo Pill */}
        <div
          onClick={onOpenSearch}
          className={`
            glass-panel rounded-full px-5 py-2.5 flex items-center justify-between w-72 lg:w-80 cursor-pointer
            transition-all duration-200
            ${isFocused 
              ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/40 bg-white/15 scale-105' 
              : 'hover:bg-white/10'}
          `}
        >
          <div className="flex items-center space-x-3">
            <Search className="w-4 h-4 text-zinc-300" />
            <span className="text-xs text-zinc-300 font-medium tracking-wide">
              Buscar película o serie...
            </span>
          </div>

          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-300">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Botón directo de Cerrar Sesión / Cambiar Cuenta */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold transition shadow-md"
            title="Cerrar Sesión para cambiar de cuenta"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{userName ? 'Salir' : 'Cerrar Sesión'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
