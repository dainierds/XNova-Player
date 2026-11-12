import React, { useState, useMemo } from 'react';
import { Search, X, Play, Film, Tv } from 'lucide-react';
import type { MovieItem } from '../../types';
import type { XtreamStream } from '../../services/xtream';

interface SearchModalProps {
  isOpen: boolean;
  movies: MovieItem[];
  channels: XtreamStream[];
  onClose: () => void;
  onSelectMovie: (movie: MovieItem) => void;
  onSelectChannel: (channel: XtreamStream) => void;
}

const KEYBOARD_KEYS = [
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['G', 'H', 'I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P', 'Q', 'R'],
  ['S', 'T', 'U', 'V', 'W', 'X'],
  ['Y', 'Z', '1', '2', '3', '4'],
  ['5', '6', '7', '8', '9', '0'],
];

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  movies,
  channels,
  onClose,
  onSelectMovie,
  onSelectChannel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [keyRow, setKeyRow] = useState(0);
  const [keyCol, setKeyCol] = useState(0);

  const filteredMovies = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return movies.filter((m) => m.title.toLowerCase().includes(term));
  }, [searchTerm, movies]);

  const filteredChannels = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return channels.filter((c) => c.name.toLowerCase().includes(term));
  }, [searchTerm, channels]);

  if (!isOpen) return null;

  const handleKeyPress = (char: string) => {
    setSearchTerm((prev) => prev + char);
  };

  const handleBackspace = () => {
    setSearchTerm((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setSearchTerm('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-8 animate-fadeIn">
      <div className="bg-[#0f1319] border border-zinc-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Cabecera de Búsqueda */}
        <div className="px-8 py-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 max-w-md">
            <Search className="w-6 h-6 text-cyan-400" />
            <div className="flex-1 bg-zinc-900 border border-zinc-700 px-4 py-2 rounded-lg text-white font-mono text-base flex items-center justify-between">
              <span>{searchTerm || <span className="text-zinc-500 font-sans">Escribe para buscar...</span>}</span>
              {searchTerm && (
                <button onClick={handleClear} className="text-xs text-zinc-400 hover:text-white">
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo: Teclado Virtual a la izquierda + Resultados a la derecha */}
        <div className="flex-1 flex overflow-hidden">
          {/* Teclado Virtual para Control Remoto TV */}
          <div className="w-96 p-6 border-r border-zinc-800 flex flex-col justify-center space-y-2 bg-zinc-950/40">
            {KEYBOARD_KEYS.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-between space-x-2">
                {row.map((char, cIdx) => {
                  const isKeySelected = rIdx === keyRow && cIdx === keyCol;
                  return (
                    <button
                      key={char}
                      onClick={() => {
                        setKeyRow(rIdx);
                        setKeyCol(cIdx);
                        handleKeyPress(char);
                      }}
                      className={`flex-1 h-11 rounded font-bold text-sm transition-all duration-150 ${
                        isKeySelected
                          ? 'bg-cyan-500 text-white scale-105 shadow-md shadow-cyan-500/50'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                      }`}
                    >
                      {char}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Barra de Acciones del Teclado */}
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => handleKeyPress(' ')}
                className="flex-1 h-11 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-bold text-xs uppercase"
              >
                Espacio
              </button>
              <button
                onClick={handleBackspace}
                className="px-6 h-11 bg-zinc-800 hover:bg-red-700 text-zinc-200 hover:text-white rounded font-bold text-xs uppercase"
              >
                Borrar
              </button>
            </div>
          </div>

          {/* Panel de Resultados */}
          <div className="flex-1 p-6 overflow-y-auto">
            {searchTerm.trim() === '' ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                <Search className="w-12 h-12 stroke-[1.5]" />
                <p className="text-sm">Usa el teclado en pantalla para buscar películas y canales.</p>
              </div>
            ) : filteredMovies.length === 0 && filteredChannels.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                <p className="text-base font-semibold">No se encontraron resultados para &ldquo;{searchTerm}&rdquo;</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Resultados de Películas */}
                {filteredMovies.length > 0 && (
                  <div>
                    <h3 className="text-xs uppercase font-bold text-cyan-400 tracking-wider mb-3 flex items-center space-x-2">
                      <Film className="w-4 h-4" />
                      <span>Películas ({filteredMovies.length})</span>
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                      {filteredMovies.map((movie) => (
                        <div
                          key={movie.id}
                          onClick={() => {
                            onSelectMovie(movie);
                            onClose();
                          }}
                          className="bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-700 rounded-lg p-2 cursor-pointer transition transform hover:scale-105"
                        >
                          <img
                            src={movie.posterUrl}
                            alt={movie.title}
                            className="w-full h-40 object-cover rounded mb-2"
                          />
                          <p className="text-xs font-bold text-white truncate">{movie.title}</p>
                          <p className="text-[10px] text-zinc-400">{movie.year} • {movie.duration}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resultados de Canales de TV */}
                {filteredChannels.length > 0 && (
                  <div>
                    <h3 className="text-xs uppercase font-bold text-red-400 tracking-wider mb-3 flex items-center space-x-2">
                      <Tv className="w-4 h-4" />
                      <span>Canales TV ({filteredChannels.length})</span>
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {filteredChannels.map((channel) => (
                        <div
                          key={channel.stream_id}
                          onClick={() => {
                            onSelectChannel(channel);
                            onClose();
                          }}
                          className="bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-700 rounded-lg p-3 cursor-pointer flex items-center space-x-3 transition hover:border-cyan-400"
                        >
                          <div className="w-10 h-10 rounded bg-zinc-900 flex items-center justify-center text-cyan-400 shrink-0">
                            <Play className="w-5 h-5 fill-cyan-400" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-white truncate">{channel.name}</p>
                            <p className="text-[10px] text-zinc-400">Canal #{channel.stream_id}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
