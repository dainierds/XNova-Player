import React, { useRef, useEffect } from 'react';
import type { MovieItem } from '../../types';

interface PosterCarouselProps {
  movies: MovieItem[];
  selectedIndex: number;
  isFocused: boolean;
  onSelectMovie: (index: number) => void;
}

export const PosterCarousel: React.FC<PosterCarouselProps> = ({
  movies,
  selectedIndex,
  isFocused,
  onSelectMovie,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll horizontal suave para mantener el póster enfocado visible
  useEffect(() => {
    const focusedEl = itemsRef.current[selectedIndex];
    if (focusedEl && containerRef.current) {
      focusedEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-end space-x-4 overflow-x-auto no-scrollbar py-6 pl-4 pr-14"
      tabIndex={-1}
    >
      {movies.map((movie, index) => {
        const isCurrent = index === selectedIndex;
        const hasFocus = isCurrent && isFocused;

        return (
          <div
            key={movie.id}
            ref={(el) => { itemsRef.current[index] = el; }}
            onClick={() => onSelectMovie(index)}
            className={`
              relative flex-shrink-0 cursor-pointer rounded-lg overflow-hidden transition-all duration-300 ease-out select-none
              w-36 h-52 md:w-44 md:h-64
              ${hasFocus 
                ? 'scale-105 z-20 ring-4 ring-cyan-400 shadow-2xl shadow-cyan-500/40 translate-y-[-8px]' 
                : isCurrent 
                  ? 'ring-2 ring-white/60 opacity-90' 
                  : 'opacity-70 hover:opacity-100 scale-95'}
            `}
          >
            {/* Imagen del póster */}
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="w-full h-full object-cover rounded-lg"
              loading="lazy"
            />

            {/* Sombra interna inferior con título en caso de póster oscuro */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2">
              <p className="text-white text-xs font-bold truncate drop-shadow">
                {movie.title}
              </p>
            </div>

            {/* Brillo reflectivo de foco */}
            {hasFocus && (
              <div className="absolute inset-0 bg-cyan-400/10 pointer-events-none" />
            )}
          </div>
        );
      })}
    </div>
  );
};
