import React, { useState, useEffect, useRef } from 'react';
import type { ShowcaseItem, SidebarTabId } from '../../types/showcase';
import { Play, Heart, Film } from 'lucide-react';
import { PosterResolutionService } from '../../services/posterResolutionService';

const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?q=80&w=400';
const FALLBACK_BACKDROP = 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920';

interface MainHeroStageProps {
  item: ShowcaseItem;
  items: ShowcaseItem[];
  selectedIndex: number;
  focusedZone: 'hero_buttons' | 'thumbnails';
  heroButtonIndex: number; // 0: Watch now, 1: Favorite, 2: Trailer
  isFavorite?: boolean;
  activeTab?: SidebarTabId;
  onSelectThumbnail: (index: number) => void;
  onPlay: () => void;
  onToggleFavorite?: () => void;
  onOpenTrailer: () => void;
}

export const MainHeroStage: React.FC<MainHeroStageProps> = ({
  item,
  items,
  selectedIndex,
  focusedZone,
  heroButtonIndex,
  isFavorite = false,
  activeTab = 'movies',
  onSelectThumbnail,
  onPlay,
  onToggleFavorite,
  onOpenTrailer,
}) => {
  const [backdropSrc, setBackdropSrc] = useState(item.backdropUrl || item.thumbnailUrl || FALLBACK_BACKDROP);

  // Sincronizar backdrop al instante (0ms) al cambiar de ítem enfocado
  useEffect(() => {
    setBackdropSrc(item.backdropUrl || item.thumbnailUrl || FALLBACK_BACKDROP);
  }, [item.backdropUrl, item.thumbnailUrl]);

  // División estricta en 2 filas: Fila 1 (Top 10) y Fila 2 (Agregadas Recientemente)
  const row1Items = items.slice(0, 10);
  const row2Items = items.slice(10, 20);

  // Referencias para auto-scroll horizontal fluido con el control remoto
  const row1Refs = useRef<(HTMLDivElement | null)[]>([]);
  const row2Refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (selectedIndex < 10) {
      row1Refs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    } else {
      row2Refs.current[selectedIndex - 10]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [selectedIndex]);

  // 📏 Ajuste dinámico del tamaño del título para que nunca desborde
  const titleLength = item.title?.length || 0;
  const titleSizeClass = 
    titleLength > 45
      ? 'text-lg sm:text-xl md:text-2xl lg:text-3xl'
      : titleLength > 24
        ? 'text-xl sm:text-2xl md:text-3xl lg:text-4xl'
        : 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl';

  return (
    <div className="relative flex-1 w-full h-full flex flex-col justify-between px-6 md:px-10 pb-2 pt-0 select-none overflow-hidden font-sans">
      {/* 🌌 FONDO PANORÁMICO DINÁMICO */}
      <div className="absolute inset-0 z-0 bg-[#0A0E1A]">
        <img
          key={backdropSrc}
          src={backdropSrc}
          alt={item.title}
          onError={() => {
            PosterResolutionService.resolvePoster(item.title).then((url) => {
              if (url && url !== FALLBACK_POSTER) setBackdropSrc(url);
              else setBackdropSrc(FALLBACK_BACKDROP);
            }).catch(() => setBackdropSrc(FALLBACK_BACKDROP));
          }}
          className="w-full h-full object-cover object-right-top transition-opacity duration-500 ease-out opacity-90 animate-fadeIn"
        />

        {/* Gradiente izquierdo oscuro para máxima legibilidad del texto */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E1A] via-[#0A0E1A]/85 to-transparent w-[65%]" />

        {/* Gradiente inferior para fusionar con las filas de miniaturas */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E1A] via-[#0A0E1A]/60 to-transparent" />

        {/* Resplandor ambiental de marca */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 🎬 1. ZONA SUPERIOR: DETALLES DINÁMICOS DE LA PELÍCULA O SERIE SELECCIONADA */}
      <div className="relative z-10 max-w-2xl lg:max-w-4xl flex-1 flex flex-col justify-end space-y-2 min-h-0 pt-1 pb-2">
        {/* Metadatos: Badge + Rating + Año + Duración + Géneros */}
        <div className="flex items-center space-x-3 text-xs md:text-sm font-medium text-zinc-300">
          <span className="font-bold text-white tracking-wide">{item.releaseDateText || 'En Catálogo'}</span>

          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${
            item.statusBadge === 'ESTRENO'
              ? 'bg-rose-500/20 text-rose-300 border-rose-400/40 shadow-sm shadow-rose-500/20'
              : item.statusBadge === 'PRÓXIMAMENTE'
                ? 'bg-purple-500/20 text-purple-300 border-purple-400/40 animate-pulse shadow-sm shadow-purple-500/20'
                : item.statusBadge === 'RECIÉN AÑADIDA' || item.statusBadge === 'NUEVO'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-sm shadow-emerald-500/20'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
          }`}>
            {item.statusBadge === 'PRÓXIMAMENTE' 
              ? '⏳ PRÓXIMAMENTE' 
              : item.statusBadge === 'RECIÉN AÑADIDA' 
              ? '✨ RECIÉN AÑADIDA' 
              : item.statusBadge === 'ESTRENO'
              ? '★ ESTRENO'
              : item.statusBadge || 'TOP'}
          </span>

          <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black">
            ★ {item.rating || '8.5'}
          </span>

          <span className="text-zinc-400 text-xs truncate">
            {item.year || '2026'} • {item.duration || 'HD'} • {item.genresText || (activeTab === 'series' ? 'Serie TV' : 'Película')}
          </span>
        </div>

        {/* Título Monumental */}
        <h1 
          className={`${titleSizeClass} font-black text-white tracking-wider leading-tight drop-shadow-2xl line-clamp-2`}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            wordBreak: 'break-word',
          }}
        >
          {item.title}
        </h1>

        {/* Sinopsis descriptiva (2 líneas compactas) */}
        <p className="text-xs md:text-sm text-zinc-300 font-normal tracking-wide drop-shadow line-clamp-2 max-w-2xl">
          {item.synopsis || item.subtitle || 'Disfruta de este título en calidad ultra alta.'}
        </p>

        {/* Fila de Botones: Ver ahora + Favorito + Trailer */}
        <div className="flex items-center space-x-3 pt-0.5">
          {/* Botón 0: Ver ahora */}
          <button
            onClick={onPlay}
            className={`
              px-6 py-2 rounded-full font-bold text-xs md:text-sm flex items-center space-x-2 transition-all duration-150 cursor-pointer
              ${focusedZone === 'hero_buttons' && heroButtonIndex === 0
                ? 'bg-white text-black scale-105 shadow-xl shadow-white/40 ring-4 ring-cyan-400'
                : 'bg-white text-black hover:bg-zinc-200'}
            `}
          >
            <Play className="w-4 h-4 fill-black text-black ml-0.5" />
            <span>Ver ahora</span>
          </button>

          {/* Botón 1: Añadir a Favoritos / En Favoritos */}
          <button
            onClick={onToggleFavorite}
            className={`
              px-5 py-2 rounded-full font-bold text-xs md:text-sm flex items-center space-x-2 transition-all duration-150 cursor-pointer
              ${focusedZone === 'hero_buttons' && heroButtonIndex === 1
                ? isFavorite
                  ? 'bg-rose-500 text-white scale-105 ring-4 ring-rose-400 shadow-xl shadow-rose-500/40'
                  : 'bg-cyan-400 text-black scale-105 ring-4 ring-cyan-300 shadow-xl shadow-cyan-400/50'
                : isFavorite
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'glass-panel text-white border border-white/20 hover:bg-white/10'}
            `}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            <span>{isFavorite ? 'En Favoritos' : 'Añadir a Favoritos'}</span>
          </button>

          {/* Botón 2: Trailer */}
          <button
            onClick={onOpenTrailer}
            className={`
              px-5 py-2 rounded-full font-semibold text-xs md:text-sm text-white glass-panel border border-white/20 transition-all duration-150 cursor-pointer
              ${focusedZone === 'hero_buttons' && heroButtonIndex === 2
                ? 'bg-white/25 border-cyan-400 scale-105 ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/30'
                : 'hover:bg-white/10'}
            `}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Tráiler</span>
          </button>
        </div>
      </div>

      {/* 📺 2. ZONA INFERIOR: DOS FILAS COMPACTAS (TOP 10 + AGREGADAS RECIENTEMENTE) */}
      <div className="relative z-10 w-full flex flex-col space-y-2 pt-1 pb-1 shrink-0">
        
        {/* ── FILA 1: TOP 10 ── */}
        <div className="w-full">
          <div className="flex items-center space-x-2 mb-1 px-0.5">
            <span className="w-1.5 h-3.5 bg-rose-600 rounded-full" />
            <h3 className="text-xs md:text-sm font-black text-white tracking-wide uppercase">
              {activeTab === 'series' ? 'Top 10 Series Más Vistas Hoy' : 'Top 10 Películas Más Vistas Hoy'}
            </h3>
          </div>

          <div className="flex items-center space-x-2.5 overflow-x-auto no-scrollbar py-1">
            {row1Items.map((thumbItem, idx) => {
              const index = idx;
              const isSelected = index === selectedIndex;
              const isFocused = focusedZone === 'thumbnails' && isSelected;

              return (
                <div
                  key={thumbItem.id}
                  ref={(el) => { row1Refs.current[idx] = el; }}
                  onClick={() => {
                    onSelectThumbnail(index);
                    if (isSelected) onPlay();
                  }}
                  className={`
                    relative w-20 md:w-24 lg:w-28 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 shrink-0 bg-zinc-900 border border-white/10 shadow-lg
                    ${isFocused
                      ? 'scale-105 ring-4 ring-cyan-400 shadow-2xl shadow-cyan-500/60 z-20 -translate-y-1'
                      : isSelected
                        ? 'ring-2 ring-white/80 opacity-100'
                        : 'opacity-75 hover:opacity-100 scale-95'}
                  `}
                >
                  <img
                    src={thumbItem.thumbnailUrl || PosterResolutionService.getCachedPoster(thumbItem.title) || FALLBACK_POSTER}
                    alt={thumbItem.title}
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.resolved) {
                        target.dataset.resolved = 'true';
                        PosterResolutionService.resolvePoster(thumbItem.title).then((resolvedUrl) => {
                          if (resolvedUrl && resolvedUrl !== FALLBACK_POSTER) {
                            target.src = resolvedUrl;
                          } else {
                            target.src = FALLBACK_POSTER;
                          }
                        }).catch(() => {
                          target.src = FALLBACK_POSTER;
                        });
                      } else if (target.src !== FALLBACK_POSTER) {
                        target.src = FALLBACK_POSTER;
                      }
                    }}
                    className="w-full h-full object-cover object-top"
                  />

                  {/* Rating Badge Superior */}
                  <div className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-white/10 text-[9px] font-black text-amber-300 flex items-center space-x-0.5 shadow">
                    <span>★</span>
                    <span>{thumbItem.rating || '8.5'}</span>
                  </div>

                  {/* Gran Número de Ranking estilo Top 10 */}
                  <span className="absolute bottom-0.5 left-1.5 text-3xl md:text-4xl lg:text-5xl font-black italic font-sans text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,1)] select-none leading-none z-10 pointer-events-none">
                    {idx + 1}
                  </span>

                  {/* Título en degradado inferior */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-1.5 pt-6 flex flex-col justify-end">
                    <span className={`text-[10px] md:text-[11px] font-bold text-white truncate drop-shadow leading-tight ${idx < 9 ? 'pl-6' : 'pl-8'}`}>
                      {thumbItem.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FILA 2: AGREGADAS RECIENTEMENTE (OTRAS 10) ── */}
        {row2Items.length > 0 && (
          <div className="w-full">
            <div className="flex items-center space-x-2 mb-1 px-0.5">
              <span className="w-1.5 h-3.5 bg-cyan-400 rounded-full" />
              <h3 className="text-xs md:text-sm font-black text-white tracking-wide uppercase">
                {activeTab === 'series' ? 'Series Populares Agregadas Recientemente' : 'Películas Populares Agregadas Recientemente'}
              </h3>
            </div>

            <div className="flex items-center space-x-2.5 overflow-x-auto no-scrollbar py-1">
              {row2Items.map((thumbItem, idx) => {
                const index = 10 + idx;
                const isSelected = index === selectedIndex;
                const isFocused = focusedZone === 'thumbnails' && isSelected;

                return (
                  <div
                    key={thumbItem.id}
                    ref={(el) => { row2Refs.current[idx] = el; }}
                    onClick={() => {
                      onSelectThumbnail(index);
                      if (isSelected) onPlay();
                    }}
                    className={`
                      relative w-20 md:w-24 lg:w-28 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 shrink-0 bg-zinc-900 border border-white/10 shadow-lg
                      ${isFocused
                        ? 'scale-105 ring-4 ring-cyan-400 shadow-2xl shadow-cyan-500/60 z-20 -translate-y-1'
                        : isSelected
                          ? 'ring-2 ring-white/80 opacity-100'
                          : 'opacity-75 hover:opacity-100 scale-95'}
                    `}
                  >
                    <img
                      src={thumbItem.thumbnailUrl || PosterResolutionService.getCachedPoster(thumbItem.title) || FALLBACK_POSTER}
                      alt={thumbItem.title}
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.resolved) {
                          target.dataset.resolved = 'true';
                          PosterResolutionService.resolvePoster(thumbItem.title).then((resolvedUrl) => {
                            if (resolvedUrl && resolvedUrl !== FALLBACK_POSTER) {
                              target.src = resolvedUrl;
                            } else {
                              target.src = FALLBACK_POSTER;
                            }
                          }).catch(() => {
                            target.src = FALLBACK_POSTER;
                          });
                        } else if (target.src !== FALLBACK_POSTER) {
                          target.src = FALLBACK_POSTER;
                        }
                      }}
                      className="w-full h-full object-cover object-top"
                    />

                    {/* Badge Superior Izquierdo: Estado */}
                    <span className={`absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shadow-sm ${
                      thumbItem.statusBadge === 'PRÓXIMAMENTE'
                        ? 'bg-purple-600/90 text-white border-purple-400/40'
                        : thumbItem.statusBadge === 'RECIÉN AÑADIDA' || thumbItem.statusBadge === 'NUEVO'
                          ? 'bg-emerald-600/90 text-white border-emerald-400/40'
                          : 'bg-rose-600/90 text-white border-rose-400/40'
                    }`}>
                      {thumbItem.statusBadge === 'PRÓXIMAMENTE' ? 'PRÓXIMO' : thumbItem.statusBadge === 'RECIÉN AÑADIDA' ? 'NUEVO' : thumbItem.statusBadge || 'ESTRENO'}
                    </span>

                    {/* Badge Superior Derecho: Calificación */}
                    <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-white/10 text-[9px] font-black text-amber-300">
                      ★ {thumbItem.rating || '8.2'}
                    </span>

                    {/* Título y Año en degradado inferior */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-1.5 pt-6 flex flex-col justify-end">
                      <span className="text-[10px] md:text-[11px] font-bold text-white truncate drop-shadow leading-tight">
                        {thumbItem.title}
                      </span>
                      <span className="text-[8px] md:text-[9px] text-zinc-400 font-semibold truncate mt-0.5">
                        {thumbItem.releaseDateText || thumbItem.year || '2026'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
