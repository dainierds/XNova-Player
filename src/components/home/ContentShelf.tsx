import React, { useRef, useEffect } from 'react';
import type { ContentItem } from '../../types';
import { Play } from 'lucide-react';

interface ContentShelfProps {
  title: string;
  items: ContentItem[];
  selectedIndex: number;
  isShelfFocused: boolean;
  onSelectItem: (item: ContentItem, index: number) => void;
  aspectRatio?: 'poster' | 'landscape'; // 'poster' = 2:3, 'landscape' = 16:9 (para TV en vivo)
}

export const ContentShelf: React.FC<ContentShelfProps> = ({
  title,
  items,
  selectedIndex,
  isShelfFocused,
  onSelectItem,
  aspectRatio = 'poster',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (isShelfFocused && itemsRef.current[selectedIndex]) {
      itemsRef.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedIndex, isShelfFocused]);

  if (!items || items.length === 0) return null;

  return (
    <div className="w-full px-12 py-3 select-none">
      {/* Título de la fila / estante */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-extrabold text-white tracking-wide flex items-center space-x-2">
          <span>{title}</span>
          <span className="text-xs text-zinc-500 font-normal">({items.length})</span>
        </h2>
      </div>

      {/* Carrusel Horizontal */}
      <div
        ref={containerRef}
        className="flex items-center space-x-4 overflow-x-auto no-scrollbar py-2"
      >
        {items.map((item, index) => {
          const isItemActive = index === selectedIndex;
          const isItemFocused = isItemActive && isShelfFocused;

          const isLandscape = aspectRatio === 'landscape';

          return (
            <div
              key={item.id}
              ref={(el) => { itemsRef.current[index] = el; }}
              onClick={() => onSelectItem(item, index)}
              className={`
                group relative flex-shrink-0 cursor-pointer rounded-xl overflow-hidden tv-card-focus
                ${isLandscape ? 'w-64 h-36' : 'w-40 h-60 md:w-44 md:h-64'}
                ${isItemFocused ? 'active-focus' : 'opacity-85 hover:opacity-100 border border-white/5 bg-zinc-900'}
              `}
            >
              {/* Imagen principal */}
              <img
                src={isLandscape ? item.backdropUrl : item.posterUrl}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />

              {/* Degradado interno */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent flex flex-col justify-end p-3">
                {/* Badge flotante en tarjeta (si existe) */}
                {item.type === 'live' ? (
                  <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-red-600/90 text-white text-[10px] font-black uppercase shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-white live-pulse" />
                    <span>EN VIVO</span>
                  </div>
                ) : item.badge ? (
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-cyan-300 text-[10px] font-bold uppercase">
                    {item.badge}
                  </div>
                ) : null}

                {/* Número de canal si es TV */}
                {item.channelNumber && (
                  <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 text-[10px] font-mono font-bold">
                    CH {item.channelNumber}
                  </div>
                )}

                {/* Título y subtítulo */}
                <h3 className="text-xs font-bold text-white truncate drop-shadow">
                  {item.title}
                </h3>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                  {item.type === 'live' ? item.genres.join(' • ') : `${item.year} • ${item.duration}`}
                </p>

                {/* Barra de progreso en "Continuar Viendo" */}
                {item.progressPercent !== undefined && (
                  <div className="w-full h-1 bg-zinc-700/60 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Ícono de Play superpuesto en foco */}
              {isItemFocused && (
                <div className="absolute inset-0 bg-cyan-500/10 flex items-center justify-center pointer-events-none">
                  <div className="w-11 h-11 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/60">
                    <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
