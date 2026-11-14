import React, { useState, useEffect } from 'react';
import { Heart, Play, X, Star } from 'lucide-react';

export interface QuickFavoriteItem {
  id: string;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  type?: 'movie' | 'series' | 'live';
  year?: string;
  streamUrl?: string;
}

interface QuickFavoriteModalProps {
  isOpen: boolean;
  item: QuickFavoriteItem | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPlay: () => void;
  onClose: () => void;
}

export const QuickFavoriteModal: React.FC<QuickFavoriteModalProps> = ({
  isOpen,
  item,
  isFavorite,
  onToggleFavorite,
  onPlay,
  onClose,
}) => {
  const [focusedBtnIdx, setFocusedBtnIdx] = useState<number>(0); // 0: Favorite, 1: Play, 2: Close

  useEffect(() => {
    if (isOpen) {
      setFocusedBtnIdx(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }

      const isOk =
        e.key === 'Enter' ||
        e.key === ' ' ||
        e.key === 'Select' ||
        e.key === 'Ok' ||
        e.keyCode === 13 ||
        e.keyCode === 23 ||
        e.keyCode === 66;

      const isBack =
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        e.key === 'GoBack' ||
        e.key === 'Back' ||
        e.keyCode === 27 ||
        e.keyCode === 4;

      if (isBack) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'ArrowUp') {
        setFocusedBtnIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown') {
        setFocusedBtnIdx((prev) => Math.min(2, prev + 1));
      } else if (isOk) {
        e.preventDefault();
        e.stopPropagation();
        if (focusedBtnIdx === 0) {
          onToggleFavorite();
          onClose();
        } else if (focusedBtnIdx === 1) {
          onPlay();
          onClose();
        } else if (focusedBtnIdx === 2) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, focusedBtnIdx, onToggleFavorite, onPlay, onClose]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#101422] border-2 border-cyan-500/40 rounded-3xl p-6 shadow-2xl shadow-cyan-500/20 flex flex-col space-y-5">
        {/* Encabezado con imagen pequeña y título */}
        <div className="flex items-center space-x-4 border-b border-white/10 pb-4">
          <div className="w-16 h-22 rounded-xl overflow-hidden bg-zinc-800 shrink-0 border border-white/15 shadow-md">
            {item.posterUrl || item.backdropUrl ? (
              <img
                src={item.posterUrl || item.backdropUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-cyan-950/40 text-cyan-400">
                <Star className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mb-1">
              {item.type === 'live' ? 'Canal de TV' : item.type === 'series' ? 'Serie' : 'Película'}
            </span>
            <h3 className="text-base font-black text-white truncate leading-snug">
              {item.title}
            </h3>
            {item.year && (
              <p className="text-xs text-zinc-400 mt-0.5">{item.year}</p>
            )}
            <p className="text-[11px] text-zinc-400 mt-1 font-medium">
              Menú Rápido de Acciones
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Acciones para Control Remoto */}
        <div className="flex flex-col space-y-2.5">
          {/* Botón 0: Favorito */}
          <button
            onClick={() => {
              onToggleFavorite();
              onClose();
            }}
            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl font-black text-xs transition-all duration-200 ${
              focusedBtnIdx === 0
                ? isFavorite
                  ? 'bg-rose-500 text-white ring-4 ring-rose-400 scale-105 shadow-xl shadow-rose-500/40'
                  : 'bg-cyan-400 text-black ring-4 ring-cyan-300 scale-105 shadow-xl shadow-cyan-400/50'
                : isFavorite
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                : 'bg-white/10 border border-white/10 text-white hover:bg-white/15'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              <span className="text-sm">
                {isFavorite ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
              </span>
            </div>
            <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
              {isFavorite ? 'Guardado' : '⭐ Destacar'}
            </span>
          </button>

          {/* Botón 1: Reproducir */}
          <button
            onClick={() => {
              onPlay();
              onClose();
            }}
            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl font-black text-xs transition-all duration-200 ${
              focusedBtnIdx === 1
                ? 'bg-white text-black ring-4 ring-cyan-400 scale-105 shadow-xl shadow-white/40'
                : 'bg-white/10 border border-white/10 text-white hover:bg-white/15'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Play className="w-5 h-5 fill-current ml-0.5" />
              <span className="text-sm">Reproducir Ahora</span>
            </div>
            <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
              ▶ Iniciar
            </span>
          </button>

          {/* Botón 2: Cancelar */}
          <button
            onClick={onClose}
            className={`w-full flex items-center justify-center px-5 py-3 rounded-2xl font-bold text-xs transition-all duration-200 ${
              focusedBtnIdx === 2
                ? 'bg-zinc-700 text-white ring-2 ring-white scale-102'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Cancelar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
