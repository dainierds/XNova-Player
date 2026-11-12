import React, { useState } from 'react';
import type { MenuSection, MovieItem } from '../../types';
import type { XtreamCategory } from '../../services/xtream';
import { ArrowLeft, Folder, Play } from 'lucide-react';

interface CategoryExplorerProps {
  section: MenuSection;
  categories: XtreamCategory[];
  items: MovieItem[];
  onBack: () => void;
  onSelectItem: (item: MovieItem) => void;
}

const DEFAULT_CATEGORIES: XtreamCategory[] = [
  { category_id: '1', category_name: 'Estrenos 2026', parent_id: 0 },
  { category_id: '2', category_name: 'Acción y Aventura', parent_id: 0 },
  { category_id: '3', category_name: 'Series Argentinas', parent_id: 0 },
  { category_id: '4', category_name: 'Series Colombianas', parent_id: 0 },
  { category_id: '5', category_name: 'Anime & Animación', parent_id: 0 },
  { category_id: '6', category_name: 'Documentales', parent_id: 0 },
  { category_id: '7', category_name: 'Conciertos en Vivo', parent_id: 0 },
];

export const CategoryExplorer: React.FC<CategoryExplorerProps> = ({
  section,
  categories,
  items,
  onBack,
  onSelectItem,
}) => {
  const activeCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const [selectedCatId, setSelectedCatId] = useState(activeCategories[0]?.category_id || '1');
  const [focusedZone, setFocusedZone] = useState<'sidebar' | 'grid'>('sidebar');
  const [sidebarIndex, setSidebarIndex] = useState(0);

  const getSectionTitle = () => {
    switch (section) {
      case 'series': return 'Catálogo de Series';
      case 'live': return 'Canales de TV en Vivo';
      case 'radio': return 'Estaciones de Radio';
      case 'documentaries': return 'Documentales';
      case 'concerts': return 'Conciertos y Música';
      default: return 'Explorador';
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#080A0E] flex flex-col overflow-hidden select-none animate-fadeIn">
      {/* Barra superior */}
      <header className="px-12 py-6 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/60">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-full bg-zinc-800 hover:bg-cyan-600 text-white transition ring-1 ring-zinc-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">{getSectionTitle()}</h1>
            <p className="text-xs text-zinc-400">Navega por categorías del servidor con el control remoto</p>
          </div>
        </div>
      </header>

      {/* Contenido: Menú lateral de categorías + Cuadrícula de Contenido */}
      <div className="flex-1 flex overflow-hidden">
        {/* Menú Lateral de Categorías */}
        <aside className="w-80 border-r border-zinc-800/80 bg-zinc-950/40 p-6 overflow-y-auto no-scrollbar space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-3 mb-3">
            Categorías del Servidor
          </h2>
          {activeCategories.map((cat, idx) => {
            const isSelected = cat.category_id === selectedCatId;
            const isFocused = focusedZone === 'sidebar' && idx === sidebarIndex;

            return (
              <div
                key={cat.category_id}
                onClick={() => {
                  setSelectedCatId(cat.category_id);
                  setSidebarIndex(idx);
                  setFocusedZone('sidebar');
                }}
                className={`
                  px-4 py-3 rounded-xl flex items-center space-x-3 cursor-pointer transition-all duration-200
                  ${isFocused
                    ? 'bg-cyan-500 text-white scale-102 shadow-lg shadow-cyan-500/40 ring-2 ring-white font-bold'
                    : isSelected
                      ? 'bg-zinc-800/80 text-cyan-300 font-semibold border-l-4 border-cyan-400'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'}
                `}
              >
                <Folder className="w-4 h-4 shrink-0" />
                <span className="text-sm truncate">{cat.category_name}</span>
              </div>
            );
          })}
        </aside>

        {/* Zona Principal de Posters / Canales */}
        <main className="flex-1 p-8 overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="group relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-cyan-400 cursor-pointer transition-all duration-200 transform hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/20"
              >
                <div className="aspect-[2/3] w-full relative">
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/60">
                      <Play className="w-6 h-6 fill-white ml-0.5 text-white" />
                    </div>
                  </div>
                </div>

                <div className="p-3">
                  <h3 className="text-xs font-bold text-white truncate">{item.title}</h3>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                    <span>{item.year}</span>
                    <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono">
                      {item.rating}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};
