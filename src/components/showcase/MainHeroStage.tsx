import React, { useState } from 'react';
import type { ShowcaseItem } from '../../types/showcase';
import { Play, Heart } from 'lucide-react';

const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?q=80&w=400';
const FALLBACK_BACKDROP = 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920';

interface MainHeroStageProps {
  item: ShowcaseItem;
  items: ShowcaseItem[];
  selectedIndex: number;
  focusedZone: 'hero_buttons' | 'thumbnails';
  heroButtonIndex: number; // 0: Watch now, 1: Favorite, 2: Trailer
  isFavorite?: boolean;
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
  onSelectThumbnail,
  onPlay,
  onToggleFavorite,
  onOpenTrailer,
}) => {
  const [backdropSrc, setBackdropSrc] = useState(item.backdropUrl || FALLBACK_BACKDROP);

  // Sincronizar backdrop al cambiar el item activo
  React.useEffect(() => {
    setBackdropSrc(item.backdropUrl || FALLBACK_BACKDROP);
  }, [item.backdropUrl]);

  // 📏 Ajuste inteligente del tamaño del título según longitud para que NUNCA desconfigure la pantalla
  const titleLength = item.title?.length || 0;
  const titleSizeClass = 
    titleLength > 45
      ? 'text-2xl md:text-3xl lg:text-4xl'
      : titleLength > 24
        ? 'text-3xl md:text-4xl lg:text-5xl'
        : 'text-4xl md:text-5xl lg:text-6xl';

  return (
    <div className="relative flex-1 w-full h-full flex flex-col justify-between px-8 md:px-12 pb-4 pt-0 select-none overflow-hidden font-sans">
      {/* Fondo panorámico con personaje dominante a la derecha y desvanecimiento a la izquierda */}
      <div className="absolute inset-0 z-0 bg-[#0A0E1A]">
        <img
          key={backdropSrc}
          src={backdropSrc}
          alt={item.title}
          onError={() => setBackdropSrc(FALLBACK_BACKDROP)}
          className="w-full h-full object-cover object-right-top transition-opacity duration-700 ease-out opacity-90 animate-fadeIn"
        />

        {/* Gradiente izquierdo para que el texto resalte exactamente como en la imagen */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E1A] via-[#0A0E1A]/85 to-transparent w-[65%]" />

        {/* Gradiente inferior suave */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E1A] via-[#0A0E1A]/40 to-transparent" />

        {/* Resplandor ambiental violeta en la esquina superior izquierda */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Zona Central de Información del Título (Flexible, centrada y protegida contra desbordamientos) */}
      <div className="relative z-10 max-w-2xl lg:max-w-4xl flex-1 flex flex-col justify-center space-y-2 md:space-y-2.5 min-h-0 pt-2 pb-1">
        {/* Fila Superior: Fecha / Badge + Géneros */}
        <div className="flex items-center space-x-4 text-xs md:text-sm font-medium text-zinc-300">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white tracking-wide">{item.releaseDateText}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${
              item.statusBadge === 'ESTRENO'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-sm shadow-cyan-500/20'
                : item.statusBadge === 'PRÓXIMAMENTE'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-400/40 animate-pulse shadow-sm shadow-purple-500/20'
                  : item.statusBadge === 'RECIÉN AÑADIDA' || item.statusBadge === 'NUEVO'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-sm shadow-emerald-500/20'
                    : 'bg-orange-500/20 text-orange-300 border-orange-400/40'
            }`}>
              {item.statusBadge === 'PRÓXIMAMENTE' 
                ? '⏳ PRÓXIMAMENTE' 
                : item.statusBadge === 'RECIÉN AÑADIDA' 
                ? '✨ RECIÉN AÑADIDA' 
                : item.statusBadge === 'ESTRENO'
                ? '★ ESTRENO'
                : item.statusBadge}
            </span>
          </div>

          <span className="text-zinc-400 text-xs">
            {item.genresText}
          </span>
        </div>

        {/* Título Monumental en Mayúsculas con límite estricto de 2 líneas */}
        <h1 className={`${titleSizeClass} font-black text-white tracking-wider leading-tight drop-shadow-2xl line-clamp-2`}>
          {item.title}
        </h1>

        {/* Subtítulo descriptivo / Géneros en una sola línea */}
        <p className="text-xs md:text-sm text-zinc-300 font-normal tracking-wide drop-shadow line-clamp-1 max-w-2xl">
          {item.subtitle}
        </p>

        {/* Fila de Botones: Ver ahora + Favorito + Trailer */}
        <div className="flex items-center space-x-3 pt-1">
          {/* Botón 0: Ver ahora */}
          <button
            onClick={onPlay}
            className={`
              px-6 py-2.5 rounded-full font-bold text-xs md:text-sm flex items-center space-x-2 transition-all duration-200
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
              px-5 py-2.5 rounded-full font-bold text-xs md:text-sm flex items-center space-x-2 transition-all duration-200
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
              px-6 py-2.5 rounded-full font-semibold text-xs md:text-sm text-white glass-panel border border-white/20 transition-all duration-200
              ${focusedZone === 'hero_buttons' && heroButtonIndex === 2
                ? 'bg-white/25 border-cyan-400 scale-105 ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/30'
                : 'hover:bg-white/10'}
            `}
          >
            <span>Tráiler</span>
          </button>
        </div>
      </div>

      {/* Zona Inferior: Carrusel de Miniaturas con Proporción de Cartelera 2:3 (Fijo y protegido con shrink-0) */}
      <div className="relative z-10 w-full flex flex-col space-y-2 pb-1 shrink-0">
        <div className="flex items-center space-x-3.5">
          {items.map((thumbItem, index) => {
            const isSelected = index === selectedIndex;
            const isFocused = focusedZone === 'thumbnails' && isSelected;

            return (
              <div
                key={thumbItem.id}
                onClick={() => {
                  onSelectThumbnail(index);
                  if (isSelected) {
                    onPlay();
                  }
                }}
                className={`
                  relative w-24 md:w-28 aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 shrink-0 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 shadow-lg
                  ${isFocused
                    ? 'scale-105 ring-4 ring-cyan-400 shadow-2xl shadow-cyan-500/60 z-20 -translate-y-1'
                    : isSelected
                      ? 'ring-2 ring-white opacity-100'
                      : 'opacity-70 hover:opacity-95 scale-95'}
                `}
              >
                <img
                  src={thumbItem.thumbnailUrl || FALLBACK_POSTER}
                  alt={thumbItem.title}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== FALLBACK_POSTER) {
                      target.src = FALLBACK_POSTER;
                    }
                  }}
                  className="w-full h-full object-cover object-top transition-transform duration-300"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent flex flex-col justify-end p-2 pt-6">
                  <span className="text-[11px] font-bold text-white truncate drop-shadow leading-tight">
                    {thumbItem.title}
                  </span>
                  <span className="text-[9px] text-zinc-300 font-semibold leading-tight mt-0.5">
                    {thumbItem.releaseDateText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Barra de progreso de posición bajo las miniaturas */}
        <div className="w-56 h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-300 rounded-full shadow-sm shadow-cyan-400"
            style={{
              width: `${100 / items.length}%`,
              transform: `translateX(${selectedIndex * 100}%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
