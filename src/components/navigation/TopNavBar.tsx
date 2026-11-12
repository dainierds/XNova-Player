import React from 'react';
import type { NavTabId } from '../../types';
import { 
  Sparkles, 
  Home, 
  Film, 
  Tv, 
  Radio, 
  Bookmark, 
  Search, 
  Settings 
} from 'lucide-react';
import { useClock } from '../../hooks/useClock';

interface TopNavBarProps {
  activeTab: NavTabId;
  focusedTab: NavTabId;
  isNavFocused: boolean;
  onSelectTab: (tab: NavTabId) => void;
  expDate?: string;
  profileName?: string;
  onOpenProfile: () => void;
}

export const NAV_TABS: { id: NavTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'movies', label: 'Películas', icon: Film },
  { id: 'series', label: 'Series', icon: Tv },
  { id: 'live', label: 'TV en Vivo', icon: Radio },
  { id: 'favorites', label: 'Mi Lista', icon: Bookmark },
  { id: 'search', label: 'Buscar', icon: Search },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeTab,
  focusedTab,
  isNavFocused,
  onSelectTab,
  expDate = '29 NOV 2026',
  profileName = 'ADULTO',
  onOpenProfile,
}) => {
  const clockText = useClock();

  return (
    <header className="relative z-30 w-full px-12 pt-7 pb-4 flex items-center justify-between select-none">
      {/* 1. Logotipo Exclusivo XNOVA */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-cyan-500 to-sky-400 p-[1.5px] shadow-lg shadow-cyan-500/20">
          <div className="w-full h-full bg-[#06080D] rounded-[10px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-widest bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            XNOVA
          </span>
          <span className="text-[9px] uppercase tracking-[0.25em] text-cyan-400 font-extrabold -mt-1">
            PLAYER
          </span>
        </div>
      </div>

      {/* 2. Pestañas de Navegación Flotantes con Glassmorphism */}
      <nav className="glass-panel px-3 py-1.5 rounded-full flex items-center space-x-1 shadow-2xl">
        {NAV_TABS.map((tab) => {
          const isCurrentActive = activeTab === tab.id;
          const isItemFocused = isNavFocused && focusedTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`
                px-4 py-2 rounded-full flex items-center space-x-2 text-xs font-bold transition-all duration-200
                ${isItemFocused
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white scale-105 shadow-lg shadow-cyan-500/40 ring-2 ring-white/80'
                  : isCurrentActive
                    ? 'bg-white/10 text-cyan-300 font-extrabold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'}
              `}
            >
              <Icon className={`w-3.5 h-3.5 ${isItemFocused || isCurrentActive ? 'text-cyan-300' : 'text-zinc-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. Información del Sistema: Vencimiento, Reloj y Perfil */}
      <div className="flex items-center space-x-4">
        {/* Badge de Suscripción */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
          <span>VENCE: <strong className="text-white">{expDate}</strong></span>
        </div>

        {/* Reloj en Español */}
        <div className="text-right text-[11px] font-bold text-zinc-300 tracking-wide">
          {clockText}
        </div>

        {/* Perfil de Usuario */}
        <button
          onClick={onOpenProfile}
          className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-950/70 to-indigo-950/70 border border-violet-500/40 text-violet-200 text-xs font-bold hover:border-violet-400 transition"
        >
          <span className="w-2 h-2 rounded-full bg-violet-400" />
          <span>{profileName}</span>
        </button>
      </div>
    </header>
  );
};
