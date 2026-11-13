import React from 'react';
import type { SidebarTabId } from '../../types/showcase';
import { 
  LayoutGrid, 
  Home, 
  Film, 
  Tv, 
  Radio, 
  Star, 
  Layers, 
  Settings,
  LogOut 
} from 'lucide-react';

interface SidebarDockProps {
  activeTab: SidebarTabId;
  focusedTab: SidebarTabId;
  isSidebarFocused: boolean;
  onSelectTab: (tab: SidebarTabId) => void;
  onLogout?: () => void;
}

export const SIDEBAR_ITEMS: { id: SidebarTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'movies', label: 'Películas', icon: Film },
  { id: 'series', label: 'Series', icon: Tv },
  { id: 'live', label: 'TV en Vivo', icon: Radio },
  { id: 'favorites', label: 'Favoritos', icon: Star },
  { id: 'library', label: 'Biblioteca', icon: Layers },
  { id: 'settings', label: 'Ajustes', icon: Settings },
  { id: 'logout', label: 'Cerrar Sesión', icon: LogOut },
];

export const SidebarDock: React.FC<SidebarDockProps> = ({
  activeTab,
  focusedTab,
  isSidebarFocused,
  onSelectTab,
  onLogout,
}) => {
  return (
    <aside className="relative z-30 h-full w-24 flex flex-col items-center justify-between py-6 select-none border-r border-white/5 bg-gradient-to-b from-[#1F1238]/60 via-[#100D22]/60 to-[#0A0E1A]/80 backdrop-blur-2xl">
      {/* Botón superior de aplicaciones / cuadrícula */}
      <button
        onClick={() => onSelectTab('library')}
        className="w-11 h-11 rounded-2xl flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition mb-2"
        title="Explorar Todo"
      >
        <LayoutGrid className="w-5 h-5" />
      </button>

      {/* Menú de Íconos Circulares Flotantes */}
      <nav className="flex flex-col items-center space-y-2.5 my-auto">
        {SIDEBAR_ITEMS.map((item) => {
          const isItemActive = activeTab === item.id;
          const isItemFocused = isSidebarFocused && focusedTab === item.id;
          const isLogout = item.id === 'logout';
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isLogout && onLogout) {
                  onLogout();
                } else {
                  onSelectTab(item.id);
                }
              }}
              className={`
                relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200
                ${isItemFocused
                  ? isLogout
                    ? 'bg-rose-600 text-white scale-110 shadow-lg shadow-rose-500/50 ring-2 ring-white z-10'
                    : 'bg-gradient-to-tr from-cyan-400 to-blue-600 text-white scale-110 shadow-lg shadow-cyan-500/50 ring-2 ring-white z-10'
                  : isItemActive
                    ? 'bg-white/20 text-white shadow-md shadow-white/10 ring-1 ring-white/40'
                    : isLogout
                      ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30'
                      : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}
              `}
              title={item.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </nav>

      <div className="w-4 h-4 opacity-0 pointer-events-none" />
    </aside>
  );
};
