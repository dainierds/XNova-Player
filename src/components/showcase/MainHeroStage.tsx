import React from 'react';
import type { ShowcaseItem } from '../../types/showcase';
import { Play } from 'lucide-react';

interface MainHeroStageProps {
  item: ShowcaseItem;
  items: ShowcaseItem[];
  selectedIndex: number;
  focusedZone: 'hero_buttons' | 'thumbnails';
  heroButtonIndex: number; // 0: Watch now, 1: Trailer
  onSelectThumbnail: (index: number) => void;
  onPlay: () => void;
  onOpenTrailer: () => void;
}

export const MainHeroStage: React.FC<MainHeroStageProps> = ({
  item,
  items,
  selectedIndex,
  focusedZone,
  heroButtonIndex,
  onSelectThumbnail,
  onPlay,
  onOpenTrailer,
}) => {
  return (
    <div className="relative flex-1 w-full h-full flex flex-col justify-between px-12 pb-6 pt-0 select-none overflow-hidden font-sans">
      {/* Fondo panorámico con personaje dominante a la derecha y desvanecimiento a la izquierda */}
      <div className="absolute inset-0 z-0">
        <img
          key={item.backdropUrl}
          src={item.backdropUrl}
          alt={item.title}
          className="w-full h-full object-cover object-right-top transition-opacity duration-700 ease-out opacity-90 animate-fadeIn"
        />

        {/* Gradiente izquierdo para que el texto resalte exactamente como en la imagen */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E1A] via-[#0A0E1A]/85 to-transparent w-[65%]" />

        {/* Gradiente inferior suave */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E1A] via-[#0A0E1A]/40 to-transparent" />

        {/* Resplandor ambiental violeta en la esquina superior izquierda */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Zona Central de Información del Título */}
      <div className="relative z-10 max-w-xl flex flex-col justify-end space-y-3 pt-4">
        {/* Fila Superior: Fecha / Badge + Géneros */}
        <div className="flex items-center space-x-4 text-xs md:text-sm font-medium text-zinc-300">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white tracking-wide">{item.releaseDateText}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${
              item.statusBadge === 'ESTRENO'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
                : item.statusBadge === 'PRÓXIMAMENTE'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-400/30 animate-pulse'
                  : item.statusBadge === 'TENDENCIA'
                    ? 'bg-orange-500/20 text-orange-300 border-orange-400/30'
                    : 'bg-green-500/20 text-green-300 border-green-400/30'
            }`}>
              {item.statusBadge === 'PRÓXIMAMENTE' ? '⏳ PRÓXIMAMENTE' : item.statusBadge}
            </span>
          </div>

          <span className="text-zinc-400 text-xs">
            {item.genresText}
          </span>
        </div>

        {/* Título Monumental en Mayúsculas (Ej. DUNE: MESSIAH) */}
        <h1 className="text-5xl md:text-6xl font-black text-white tracking-wider leading-none drop-shadow-2xl">
          {item.title}
        </h1>

        {/* Subtítulo descriptivo y año */}
        <p className="text-sm md:text-base text-zinc-300 font-normal tracking-wide drop-shadow line-clamp-2">
          {item.subtitle}
        </p>

        {/* Fila de Botones: Ver ahora + Trailer */}
        <div className="flex items-center space-x-3 pt-1">
          {/* Botón: Ver ahora */}
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

          {/* Botón: Trailer */}
          <button
            onClick={onOpenTrailer}
            className={`
              px-6 py-2.5 rounded-full font-semibold text-xs md:text-sm text-white glass-panel border border-white/20 transition-all duration-200
              ${focusedZone === 'hero_buttons' && heroButtonIndex === 1
                ? 'bg-white/25 border-cyan-400 scale-105 ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/30'
                : 'hover:bg-white/10'}
            `}
          >
            <span>Tráiler</span>
          </button>
        </div>
      </div>

      {/* Zona Inferior: Carrusel de Miniaturas con Altura Proporcional para que NUNCA se corte abajo */}
      <div className="relative z-10 w-full flex flex-col space-y-2 pb-2">
        <div className="flex items-center space-x-3">
          {items.map((thumbItem, index) => {
            const isSelected = index === selectedIndex;
            const isFocused = focusedZone === 'thumbnails' && isSelected;

            return (
              <div
                key={thumbItem.id}
                onClick={() => onSelectThumbnail(index)}
                className={`
                  relative w-28 h-32 md:w-32 md:h-36 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 shrink-0
                  ${isFocused
                    ? 'scale-105 ring-4 ring-cyan-400 shadow-2xl shadow-cyan-500/60 z-20 -translate-y-1'
                    : isSelected
                      ? 'ring-2 ring-white opacity-100'
                      : 'opacity-60 hover:opacity-95 scale-95'}
                `}
              >
                <img
                  src={thumbItem.thumbnailUrl}
                  alt={thumbItem.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-2">
                  <span className="text-[11px] font-bold text-white truncate drop-shadow">
                    {thumbItem.title}
                  </span>
                  <span className="text-[9px] text-zinc-300 font-semibold">
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
