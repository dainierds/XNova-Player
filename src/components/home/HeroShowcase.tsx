import React from 'react';
import type { ContentItem } from '../../types';
import { Play, Plus, Check, Info, Star } from 'lucide-react';

interface HeroShowcaseProps {
  content: ContentItem;
  focusedButtonIndex: number; // 0: Play, 1: My List, 2: Info
  isHeroActionsFocused: boolean;
  isFavorite: boolean;
  onPlay: () => void;
  onToggleFavorite: () => void;
  onOpenDetails: () => void;
}

export const HeroShowcase: React.FC<HeroShowcaseProps> = ({
  content,
  focusedButtonIndex,
  isHeroActionsFocused,
  isFavorite,
  onPlay,
  onToggleFavorite,
  onOpenDetails,
}) => {
  return (
    <div className="relative w-full h-[48vh] min-h-[360px] flex items-end px-12 pb-6 select-none overflow-hidden">
      {/* Fondo panorámico con transición suave */}
      <div className="absolute inset-0 z-0">
        <img
          key={content.backdropUrl}
          src={content.backdropUrl}
          alt={content.title}
          className="w-full h-full object-cover object-top opacity-80 animate-fadeIn"
        />

        {/* Gradiente izquierdo para lectura impecable */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#06080D] via-[#06080D]/85 to-transparent w-[70%]" />

        {/* Gradiente inferior que fusiona con los carruseles inferiores */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06080D] via-[#06080D]/50 to-transparent" />

        {/* Resplandor ambiental cian/violeta detrás del título */}
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Panel de Contenido e Información */}
      <div className="relative z-10 max-w-2xl flex flex-col justify-end space-y-3">
        {/* Badges de Calidad y Calificación */}
        <div className="flex items-center space-x-2.5">
          {content.badge && (
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-[10px] tracking-wider uppercase shadow-md shadow-cyan-500/30">
              {content.badge}
            </span>
          )}

          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{content.score}</span>
          </div>

          <span className="px-2 py-0.5 rounded-md bg-white/10 text-zinc-300 font-bold text-xs border border-white/10">
            {content.rating}
          </span>

          <span className="text-xs font-semibold text-zinc-400">
            {content.year} • {content.duration}
          </span>
        </div>

        {/* Título Monumental */}
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md leading-tight">
          {content.title}
        </h1>

        {/* Cápsulas de Género Estilo Glassmorphism */}
        <div className="flex items-center space-x-2">
          {content.genres.map((genre) => (
            <span
              key={genre}
              className="glass-pill px-3 py-1 rounded-full text-xs font-medium text-zinc-200 tracking-wide"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Sinopsis */}
        <p className="text-sm text-zinc-300 line-clamp-2 max-w-xl font-normal leading-relaxed drop-shadow">
          {content.synopsis}
        </p>

        {/* Botonera de Acciones para Control Remoto */}
        <div className="flex items-center space-x-3 pt-2">
          {/* Botón 0: Reproducir */}
          <button
            onClick={onPlay}
            className={`
              px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center space-x-2 transition-all duration-200
              ${isHeroActionsFocused && focusedButtonIndex === 0
                ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white scale-105 shadow-xl shadow-cyan-500/50 ring-2 ring-white'
                : 'bg-white text-zinc-950 hover:bg-zinc-200'}
            `}
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>Reproducir Ahora</span>
          </button>

          {/* Botón 1: Mi Lista / Favorito */}
          <button
            onClick={onToggleFavorite}
            className={`
              glass-panel px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all duration-200
              ${isHeroActionsFocused && focusedButtonIndex === 1
                ? 'bg-white/25 border-cyan-400 text-white scale-105 ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/30'
                : 'text-zinc-200 hover:text-white hover:bg-white/10'}
            `}
          >
            {isFavorite ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
            <span>{isFavorite ? 'En Mi Lista' : 'Mi Lista'}</span>
          </button>

          {/* Botón 2: Detalles */}
          <button
            onClick={onOpenDetails}
            className={`
              glass-panel px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all duration-200
              ${isHeroActionsFocused && focusedButtonIndex === 2
                ? 'bg-white/25 border-cyan-400 text-white scale-105 ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/30'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'}
            `}
          >
            <Info className="w-4 h-4 text-zinc-400" />
            <span>Detalles</span>
          </button>
        </div>
      </div>
    </div>
  );
};
