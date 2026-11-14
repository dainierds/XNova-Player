import React from 'react';
import type { SidebarTabId } from '../../types/showcase';
import { 
  Tv, 
  Film, 
  Video, 
  Heart,
  Settings 
} from 'lucide-react';
import { BRANDING } from '../../config/branding';

interface SidebarDockProps {
  activeTab: SidebarTabId;
  focusedTab: SidebarTabId;
  isSidebarFocused: boolean;
  onSelectTab: (tab: SidebarTabId) => void;
}

// Secciones del Dock: TV, Películas, Series, Favoritos y Configuración
export const SIDEBAR_ITEMS: { id: SidebarTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'live', label: 'TV en Vivo', icon: Tv },
  { id: 'movies', label: 'Películas', icon: Film },
  { id: 'series', label: 'Series', icon: Video },
  { id: 'favorites', label: 'Favoritos', icon: Heart },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

export const SidebarDock: React.FC<SidebarDockProps> = ({
  activeTab,
  focusedTab,
  isSidebarFocused,
  onSelectTab,
}) => {
  return (
    <aside className="relative z-30 h-full w-24 flex flex-col items-center justify-between py-4 select-none border-r border-white/5 bg-gradient-to-b from-[#1F1238]/70 via-[#100D22]/80 to-[#0A0E1A]/95 backdrop-blur-2xl">
      {/* Menú de Íconos: TV, Películas, Series, Favoritos y Configuración */}
      <nav className="flex-1 flex flex-col items-center justify-center space-y-3 w-full my-auto">
        {SIDEBAR_ITEMS.map((item) => {
          const isItemActive = activeTab === item.id;
          const isItemFocused = isSidebarFocused && focusedTab === item.id;
          const Icon = item.icon;

          return (
            <div key={item.id} className="flex flex-col items-center space-y-1">
              <button
                onClick={() => onSelectTab(item.id)}
                className={`
                  relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer
                  ${isItemFocused
                    ? 'bg-gradient-to-tr from-cyan-400 to-blue-600 text-white scale-110 shadow-2xl shadow-cyan-500/60 ring-4 ring-white z-10'
                    : isItemActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-lg shadow-cyan-950/40'
                      : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}
                `}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
              </button>
              <span className={`text-[10px] font-bold tracking-wider ${isItemFocused ? 'text-cyan-300' : isItemActive ? 'text-white' : 'text-zinc-500'}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Versión oficial de la app debajo de configuración con separación garantizada (sin posición absolute para evitar superposiciones) */}
      <div className="pt-2 text-center shrink-0">
        <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 shadow-sm">
          v{BRANDING.version}
        </span>
      </div>
    </aside>
  );
};
