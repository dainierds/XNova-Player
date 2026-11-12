import React from 'react';
import type { ShowcaseItem } from '../../types/showcase';
import { Play, Heart, Bookmark, Plus } from 'lucide-react';

interface MainHeroStageProps {
  item: ShowcaseItem;
  items: ShowcaseItem[];
  selectedIndex: number;
  focusedZone: 'hero_buttons' | 'thumbnails' | 'bottom_actions';
  heroButtonIndex: number; // 0: Watch now, 1: Trailer
  bottomActionIndex: number; // 0: Heart, 1: Bookmark, 2: Plus
  isFavorite: boolean;
  onSelectThumbnail: (index: number) => void;
  onPlay: () => void;
  onOpenTrailer: () => void;
  onToggleFavorite: () => void;
}

export const MainHeroStage: React.FC<MainHeroStageProps> = ({
  item,
  items,
  selectedIndex,
  focusedZone,
  heroButtonIndex,
  bottomActionIndex,
  isFavorite,
  onSelectThumbnail,
  onPlay,
  onOpenTrailer,
  onToggleFavorite,
}) => {
  return (
    <div className="relative flex-1 w-full h-full flex flex-col justify-between px-14 pb-10 pt-2 select-none overflow-hidden">
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
      <div className="relative z-10 max-w-xl flex flex-col justify-end space-y-4 pt-12">
        {/* Fila Superior: Fecha / Badge + Géneros */}
        <div className="flex items-center space-x-6 text-sm md:text-base font-medium text-zinc-300">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white tracking-wide">{item.releaseDateText}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              {item.statusBadge}
            </span>
          </div>

          <span className="text-zinc-400 text-sm">
            {item.genresText}
          </span>
        </div>

        {/* Título Monumental en Mayúsculas (Ej. JOHN WICK) */}
        <h1 className="text-6xl md:text-7xl font-black text-white tracking-wider leading-none drop-shadow-2xl">
          {item.title}
        </h1>

        {/* Subtítulo descriptivo y año (Ej. Chapter3-Parabellum(2019)) */}
        <p className="text-base md:text-lg text-zinc-300 font-normal tracking-wide drop-shadow">
          {item.subtitle}
        </p>

        {/* Fila de Botones: Watch Now + Trailer */}
        <div className="flex items-center space-x-4 pt-2">
          {/* Botón: Watch now (Fondo blanco sólido, texto negro) */}
          <button
            onClick={onPlay}
            className={`
              px-7 py-3 rounded-full font-bold text-xs md:text-sm flex items-center space-x-2.5 transition-all duration-200
              ${focusedZone === 'hero_buttons' && heroButtonIndex === 0
                ? 'bg-white text-black scale-105 shadow-xl shadow-white/40 ring-4 ring-cyan-400'
                : 'bg-white text-black hover:bg-zinc-200'}
            `}
          >
            <Play className="w-4 h-4 fill-black text-black ml-0.5" />
            <span>Ver ahora</span>
          </button>

          {/* Botón: Trailer (Cristal esmerilado con borde fino) */}
          <button
            onClick={onOpenTrailer}
            className={`
              px-7 py-3 rounded-full font-semibold text-xs md:text-sm text-white glass-panel border border-white/20 transition-all duration-200
              ${focusedZone === 'hero_buttons' && heroButtonIndex === 1
                ? 'bg-white/25 border-cyan-400 scale-105 ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/30'
                : 'hover:bg-white/10'}
            `}
          >
            <span>Tráiler</span>
          </button>
        </div>
      </div>

      {/* Zona Inferior: Carrusel de Miniaturas a la izquierda + Botones de Acción a la derecha */}
      <div className="relative z-10 w-full flex items-end justify-between pt-6">
        {/* Carrusel de Miniaturas con Mayor Tamaño e Indicador de Barra Inferior */}
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-3.5">
            {items.map((thumbItem, index) => {
              const isSelected = index === selectedIndex;
              const isFocused = focusedZone === 'thumbnails' && isSelected;

              return (
                <div
                  key={thumbItem.id}
                  onClick={() => onSelectThumbnail(index)}
                  className={`
                    relative w-28 h-36 md:w-32 md:h-44 rounded-xl overflow-hidden cursor-pointer transition-all duration-300
                    ${isFocused
                      ? 'scale-108 ring-3 ring-cyan-400 shadow-2xl shadow-cyan-500/50 z-20 -translate-y-2'
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

          {/* Barra de progreso de posición bajo las miniaturas ampliada */}
          <div className="w-64 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300 rounded-full shadow-sm shadow-cyan-400"
              style={{
                width: `${100 / items.length}%`,
                transform: `translateX(${selectedIndex * 100}%)`,
              }}
            />
          </div>
        </div>

        {/* Botones Redondos de Acción Rápida a la Derecha: Heart, Bookmark, Plus */}
        <div className="flex items-center space-x-3">
          {/* 1. Heart (Favorito) */}
          <button
            onClick={onToggleFavorite}
            className={`
              w-12 h-12 rounded-full glass-panel flex items-center justify-center transition-all duration-200
              ${focusedZone === 'bottom_actions' && bottomActionIndex === 0
                ? 'bg-red-600/30 border-red-400 text-red-400 scale-110 ring-2 ring-red-400 shadow-lg shadow-red-500/40'
                : isFavorite
                  ? 'text-red-400 border-red-500/50 bg-red-950/20'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'}
            `}
            title="Favorito"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </button>

          {/* 2. Bookmark (Guardar) */}
          <button
            className={`
              w-12 h-12 rounded-full glass-panel flex items-center justify-center transition-all duration-200
              ${focusedZone === 'bottom_actions' && bottomActionIndex === 1
                ? 'bg-white/25 border-cyan-400 text-cyan-300 scale-110 ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/30'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'}
            `}
            title="Guardar"
          >
            <Bookmark className="w-5 h-5" />
          </button>

          {/* 3. Plus (Añadir a lista) */}
          <button
            className={`
              w-12 h-12 rounded-full glass-panel flex items-center justify-center transition-all duration-200
              ${focusedZone === 'bottom_actions' && bottomActionIndex === 2
                ? 'bg-white/25 border-cyan-400 text-cyan-300 scale-110 ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/30'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'}
            `}
            title="Añadir a mi lista"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
