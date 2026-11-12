import React from 'react';
import type { MovieItem } from '../../types';
import { Clock, Calendar, ShieldAlert } from 'lucide-react';

interface InfoPanelProps {
  movie: MovieItem;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ movie }) => {
  return (
    <div className="relative z-10 max-w-xl flex flex-col justify-end pb-8">
      {/* Etiqueta ESTRENO */}
      {movie.isPremiere && (
        <span className="text-xs font-bold tracking-widest text-zinc-300 uppercase mb-1 drop-shadow">
          ESTRENO
        </span>
      )}

      {/* Título de la película */}
      <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg line-clamp-2 leading-tight">
        {movie.title}
      </h1>

      {/* Chips de género inclinados estilo Prime Black */}
      <div className="flex flex-wrap items-center gap-3 my-3">
        {movie.genres.map((genre) => (
          <div
            key={genre}
            className="slant-chip px-4 py-1 bg-white/10 backdrop-blur-md border border-white/40 rounded-sm shadow-sm"
          >
            <span className="slant-chip-content block text-xs font-semibold text-zinc-100 tracking-wide">
              {genre}
            </span>
          </div>
        ))}
      </div>

      {/* Sinopsis de 3 líneas */}
      <p className="text-sm md:text-base text-zinc-300 font-normal leading-relaxed line-clamp-3 my-1 drop-shadow pr-4 max-w-lg">
        {movie.synopsis}
      </p>

      {/* Fila de metadatos (Duración, Año, Clasificación) */}
      <div className="flex items-center space-x-6 mt-3 text-xs md:text-sm font-semibold text-zinc-300">
        <div className="flex items-center space-x-1.5 drop-shadow">
          <Clock className="w-4 h-4 text-zinc-400" />
          <span>{movie.duration}</span>
        </div>

        <div className="flex items-center space-x-1.5 drop-shadow">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <span>{movie.year}</span>
        </div>

        <div className="flex items-center space-x-1.5 drop-shadow bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-600">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-zinc-100">{movie.rating}</span>
        </div>
      </div>
    </div>
  );
};
