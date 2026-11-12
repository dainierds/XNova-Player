import React from 'react';
import type { NavTabId } from '../../types';
import { 
  Home, 
  Film, 
  Tv, 
  Radio, 
  Bookmark, 
  Search, 
  Settings 
} from 'lucide-react';
import { useClock } from '../../hooks/useClock';
import { BRANDING } from '../../config/branding';

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
    <header className="relative z-30 w-full px-12 pt-6 pb-3 flex items-center justify-between select-none">
      {/* 1. Logotipo Oficial XNOVA Player (Altura exacta 48px, proporción original) */}
      <div className="flex flex-col items-start">
        <img
          src={BRANDING.assets.logo}
          alt={BRANDING.name}
          className="h-12 w-auto object-contain drop-shadow-lg"
          loading="eager"
        />
        <div className="mt-1 flex items-center space-x-1.5 text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
          <span>VENCE: <strong className="text-white">{expDate}</strong></span>
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

      {/* 3. Información del Sistema: Reloj y Perfil */}
      <div className="flex items-center space-x-4">
        {/* Reloj en Español */}
        <div className="text-right text-[11px] font-bold text-zinc-300 tracking-wide">
          {clockText}
        </div>

        {/* Perfil de Usuario */}
        <button
          onClick={onOpenProfile}
          className="flex items-center space-x-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-violet-950/70 to-indigo-950/70 border border-violet-500/40 text-violet-200 text-xs font-bold hover:border-violet-400 transition shadow-md"
        >
          <span className="w-2 h-2 rounded-full bg-violet-400 shadow-sm shadow-violet-400" />
          <span>{profileName}</span>
        </button>
      </div>
    </header>
  );
};
