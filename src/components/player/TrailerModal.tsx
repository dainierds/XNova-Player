import React, { useEffect, useRef } from 'react';
import { X, Calendar, Film } from 'lucide-react';

interface TrailerModalProps {
  isOpen: boolean;
  title: string;
  youtubeKey?: string | null;
  releaseDateText?: string;
  synopsis?: string;
  backdropUrl?: string;
  posterUrl?: string;
  onClose: () => void;
}

export const TrailerModal: React.FC<TrailerModalProps> = ({
  isOpen,
  title,
  youtubeKey,
  releaseDateText,
  synopsis,
  backdropUrl,
  posterUrl,
  onClose,
}) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Foco automático en el botón de cerrar
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn">
      {/* Botón flotante para cerrar en la esquina superior derecha */}
      <button
        ref={closeBtnRef}
        onClick={onClose}
        className="absolute top-6 right-8 z-30 flex items-center space-x-2 px-4 py-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-white text-xs font-bold border border-white/20 transition cursor-pointer shadow-lg focus:ring-4 focus:ring-cyan-400 focus:outline-none"
      >
        <X className="w-4 h-4 text-cyan-400" />
        <span>Cerrar (Atrás)</span>
      </button>

      {youtubeKey ? (
        // Reproductor de YouTube para el tráiler oficial
        <div className="w-[92vw] h-[86vh] max-w-6xl rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black flex flex-col">
          <div className="px-6 py-3 bg-zinc-950/80 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <Film className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-wide truncate max-w-md">
                Tráiler Oficial: {title}
              </h3>
            </div>
            {releaseDateText && (
              <span className="text-[11px] font-mono text-purple-300 bg-purple-950/60 border border-purple-500/30 px-3 py-0.5 rounded-full">
                {releaseDateText}
              </span>
            )}
          </div>

          <div className="relative flex-1 w-full h-full bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1&controls=1&enablejsapi=1&rel=0&modestbranding=1`}
              title={`Trailer de ${title}`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ) : (
        // Pantalla informativa de "Próximamente" si aún no hay tráiler disponible
        <div className="relative w-[90vw] max-w-3xl rounded-2xl overflow-hidden border border-white/20 bg-zinc-950 shadow-2xl p-8 flex flex-col items-center text-center">
          {backdropUrl && (
            <div className="absolute inset-0 z-0 opacity-20">
              <img src={backdropUrl} alt={title} className="w-full h-full object-cover blur-sm" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
            </div>
          )}

          <div className="relative z-10 flex flex-col items-center space-y-4 max-w-xl">
            {posterUrl && (
              <img
                src={posterUrl}
                alt={title}
                className="w-24 h-36 object-cover rounded-xl shadow-2xl border border-white/20 mb-1"
              />
            )}
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/20">
              <Calendar className="w-6 h-6" />
            </div>

            <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold tracking-wider text-purple-300 bg-purple-950/70 border border-purple-500/30 uppercase animate-pulse">
              ⏳ Próximamente en Cines y Streaming
            </span>

            <h2 className="text-3xl font-black text-white tracking-wide">{title}</h2>

            {releaseDateText && (
              <p className="text-sm font-semibold text-cyan-400">
                Fecha prevista: {releaseDateText}
              </p>
            )}

            <p className="text-xs text-zinc-300 leading-relaxed line-clamp-4">
              {synopsis || 'Esta película se encuentra en fase de lanzamiento oficial. Aún no está disponible en los servidores de tu proveedor IPTV.'}
            </p>

            <div className="pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/40 transition cursor-pointer focus:ring-4 focus:ring-white focus:outline-none"
              >
                Volver a la Pantalla Principal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
