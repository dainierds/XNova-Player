import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Folder, 
  Play, 
  Film, 
  Tv, 
  Radio, 
  Search, 
  Star, 
  RefreshCw 
} from 'lucide-react';
import type { PlaylistAccount } from '../../types';
import { XtreamService, type XtreamCategory, type XtreamStream, type XtreamSeries } from '../../services/xtream';

interface FullCatalogExplorerProps {
  playlist: PlaylistAccount;
  initialType?: 'movies' | 'series' | 'live';
  onClose: () => void;
  onPlayStream: (stream: {
    id: string;
    title: string;
    streamUrl: string;
    posterUrl?: string;
    isLive?: boolean;
  }) => void;
}

type FocusZone = 'tabs' | 'categories' | 'grid';

export const FullCatalogExplorer: React.FC<FullCatalogExplorerProps> = ({
  playlist,
  initialType = 'movies',
  onClose,
  onPlayStream,
}) => {
  const [contentType, setContentType] = useState<'movies' | 'series' | 'live'>(initialType);
  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [streams, setStreams] = useState<(XtreamStream | XtreamSeries)[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStreams, setLoadingStreams] = useState(false);

  // 🎮 Estados de navegación D-Pad para control remoto de TV
  const [focusZone, setFocusZone] = useState<FocusZone>('categories');
  const [focusedTab, setFocusedTab] = useState<0 | 1 | 2>(
    initialType === 'movies' ? 0 : initialType === 'series' ? 1 : 2
  );
  const [focusedCatIndex, setFocusedCatIndex] = useState(0);
  const [focusedGridIndex, setFocusedGridIndex] = useState(0);

  const catItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const gridItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const server = playlist.serverUrl || '';
  const user = playlist.username || '';
  const pass = playlist.password || '';

  // Número de columnas en la cuadrícula según el tipo de contenido
  const numCols = contentType === 'live' ? 4 : 5;

  // 1. Cargar las categorías según el tipo seleccionado (Películas, Series o TV en Vivo)
  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      setLoading(true);
      try {
        let cats: XtreamCategory[] = [];
        if (contentType === 'movies') {
          cats = await XtreamService.getVodCategories(server, user, pass);
        } else if (contentType === 'series') {
          cats = await XtreamService.getSeriesCategories(server, user, pass);
        } else {
          cats = await XtreamService.getLiveCategories(server, user, pass);
        }

        if (isMounted) {
          setCategories(cats || []);
          setSelectedCategoryId(cats && cats.length > 0 ? cats[0].category_id : 'all');
          setFocusedCatIndex(0);
          setFocusedGridIndex(0);
        }
      } catch (err) {
        console.error('Error al cargar categorías de Xtream:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCategories();
    return () => { isMounted = false; };
  }, [contentType, server, user, pass]);

  // 2. Cargar los streams/canales de la categoría seleccionada
  useEffect(() => {
    let isMounted = true;
    const loadStreams = async () => {
      if (!selectedCategoryId) return;
      setLoadingStreams(true);
      try {
        let items: (XtreamStream | XtreamSeries)[] = [];
        if (contentType === 'movies') {
          items = await XtreamService.getVodStreams(server, user, pass, selectedCategoryId);
        } else if (contentType === 'series') {
          items = await XtreamService.getSeries(server, user, pass, selectedCategoryId);
        } else {
          items = await XtreamService.getLiveStreams(server, user, pass, selectedCategoryId);
        }

        if (isMounted) {
          setStreams(items || []);
          setFocusedGridIndex(0);
        }
      } catch (err) {
        console.error('Error al cargar contenido de la categoría:', err);
      } finally {
        if (isMounted) setLoadingStreams(false);
      }
    };

    loadStreams();
    return () => { isMounted = false; };
  }, [selectedCategoryId, contentType, server, user, pass]);

  // Filtrado por buscador en tiempo real
  const filteredStreams = streams.filter((item) =>
    item.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Auto-scroll del elemento enfocado en categorías
  useEffect(() => {
    if (focusZone === 'categories') {
      catItemRefs.current[focusedCatIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusedCatIndex, focusZone]);

  // Auto-scroll del elemento enfocado en la cuadrícula de contenido
  useEffect(() => {
    if (focusZone === 'grid') {
      gridItemRefs.current[focusedGridIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusedGridIndex, focusZone]);

  const handleItemClick = (item: XtreamStream | XtreamSeries) => {
    if (contentType === 'movies') {
      const vod = item as XtreamStream;
      const streamUrl = XtreamService.buildVodStreamUrl(
        server, user, pass,
        vod.stream_id,
        vod.container_extension || 'mp4'
      );
      onPlayStream({
        id: `vod_${vod.stream_id}`,
        title: vod.name,
        streamUrl,
        posterUrl: vod.stream_icon,
        isLive: false,
      });
    } else if (contentType === 'live') {
      const live = item as XtreamStream;
      const streamUrl = XtreamService.buildLiveStreamUrl(
        server, user, pass,
        live.stream_id
      );
      onPlayStream({
        id: `live_${live.stream_id}`,
        title: live.name,
        streamUrl,
        posterUrl: live.stream_icon,
        isLive: true,
      });
    } else {
      const series = item as XtreamSeries;
      console.log('Serie seleccionada:', series.name);
    }
  };

  // 🎮 Motor Oficial de Navegación D-Pad para TV / Control Remoto
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevenir scroll nativo del navegador para que responda solo al D-pad
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }

      switch (e.key) {
        // --- FLECHA IZQUIERDA ---
        case 'ArrowLeft':
          if (focusZone === 'grid') {
            if (focusedGridIndex % numCols === 0) {
              // Si está en la primera columna, regresar a la lista de categorías
              setFocusZone('categories');
            } else {
              setFocusedGridIndex((prev) => Math.max(0, prev - 1));
            }
          } else if (focusZone === 'tabs') {
            if (focusedTab > 0) {
              const nextTab = (focusedTab - 1) as 0 | 1 | 2;
              setFocusedTab(nextTab);
              setContentType(nextTab === 0 ? 'movies' : nextTab === 1 ? 'series' : 'live');
            }
          }
          break;

        // --- FLECHA DERECHA ---
        case 'ArrowRight':
          if (focusZone === 'categories') {
            if (filteredStreams.length > 0) {
              setFocusZone('grid');
              setFocusedGridIndex(0);
            }
          } else if (focusZone === 'tabs') {
            if (focusedTab < 2) {
              const nextTab = (focusedTab + 1) as 0 | 1 | 2;
              setFocusedTab(nextTab);
              setContentType(nextTab === 0 ? 'movies' : nextTab === 1 ? 'series' : 'live');
            }
          } else if (focusZone === 'grid') {
            if (focusedGridIndex < filteredStreams.length - 1) {
              setFocusedGridIndex((prev) => prev + 1);
            }
          }
          break;

        // --- FLECHA ARRIBA ---
        case 'ArrowUp':
          if (focusZone === 'categories') {
            if (focusedCatIndex > 0) {
              const nextIdx = focusedCatIndex - 1;
              setFocusedCatIndex(nextIdx);
              if (categories[nextIdx]) {
                setSelectedCategoryId(categories[nextIdx].category_id);
              }
            } else {
              // Subir a la barra superior de pestañas
              setFocusZone('tabs');
            }
          } else if (focusZone === 'grid') {
            if (focusedGridIndex >= numCols) {
              setFocusedGridIndex((prev) => prev - numCols);
            } else {
              // Subir a la barra de pestañas
              setFocusZone('tabs');
            }
          }
          break;

        // --- FLECHA ABAJO ---
        case 'ArrowDown':
          if (focusZone === 'tabs') {
            setFocusZone('categories');
          } else if (focusZone === 'categories') {
            if (focusedCatIndex < categories.length - 1) {
              const nextIdx = focusedCatIndex + 1;
              setFocusedCatIndex(nextIdx);
              if (categories[nextIdx]) {
                setSelectedCategoryId(categories[nextIdx].category_id);
              }
            }
          } else if (focusZone === 'grid') {
            if (focusedGridIndex + numCols < filteredStreams.length) {
              setFocusedGridIndex((prev) => prev + numCols);
            }
          }
          break;

        // --- ENTER / OK ---
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusZone === 'tabs') {
            setContentType(focusedTab === 0 ? 'movies' : focusedTab === 1 ? 'series' : 'live');
            setFocusZone('categories');
          } else if (focusZone === 'categories') {
            if (categories[focusedCatIndex]) {
              setSelectedCategoryId(categories[focusedCatIndex].category_id);
              if (filteredStreams.length > 0) {
                setFocusZone('grid');
                setFocusedGridIndex(0);
              }
            }
          } else if (focusZone === 'grid') {
            if (filteredStreams[focusedGridIndex]) {
              handleItemClick(filteredStreams[focusedGridIndex]);
            }
          }
          break;

        // --- BOTÓN ATRÁS (Escape / Backspace / GoBack) ---
        case 'Escape':
        case 'Backspace':
        case 'GoBack':
          e.preventDefault();
          e.stopPropagation();
          if (focusZone === 'grid') {
            // Si está dentro de la cuadrícula, volver primero a las categorías
            setFocusZone('categories');
          } else {
            // Si está en categorías o pestañas, cerrar el explorador y volver a inicio
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    focusZone,
    focusedTab,
    focusedCatIndex,
    focusedGridIndex,
    categories,
    filteredStreams,
    numCols,
    onClose,
  ]);

  return (
    <div className="fixed inset-0 z-50 bg-[#070A12] text-white flex flex-col overflow-hidden select-none animate-fadeIn font-sans">
      {/* ── Barra Superior de Navegación ── */}
      <header className="px-8 py-4 border-b border-white/10 bg-[#0C101D] flex items-center justify-between shrink-0">
        <button
          onClick={onClose}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition flex items-center space-x-2 border border-white/5 shrink-0"
          title="Volver a Inicio (O pulsa Atrás en el mando)"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-bold hidden sm:inline">Volver</span>
        </button>

        {/* Selector de Pestañas: Películas / Series / TV en Vivo (Amplio, Espacioso y Centrado) */}
        <div className="flex-1 max-w-2xl mx-8 flex items-center bg-[#131826] p-1.5 rounded-2xl border border-white/10 space-x-3">
          <button
            onClick={() => {
              setContentType('movies');
              setFocusedTab(0);
            }}
            className={`flex-1 flex items-center justify-center space-x-2.5 py-3 px-6 rounded-xl text-sm font-black transition-all ${
              contentType === 'movies'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            } ${focusZone === 'tabs' && focusedTab === 0 ? 'ring-4 ring-white scale-105' : ''}`}
          >
            <Film className="w-5 h-5" />
            <span>Películas</span>
          </button>

          <button
            onClick={() => {
              setContentType('series');
              setFocusedTab(1);
            }}
            className={`flex-1 flex items-center justify-center space-x-2.5 py-3 px-6 rounded-xl text-sm font-black transition-all ${
              contentType === 'series'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/40'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            } ${focusZone === 'tabs' && focusedTab === 1 ? 'ring-4 ring-white scale-105' : ''}`}
          >
            <Tv className="w-5 h-5" />
            <span>Series</span>
          </button>

          <button
            onClick={() => {
              setContentType('live');
              setFocusedTab(2);
            }}
            className={`flex-1 flex items-center justify-center space-x-2.5 py-3 px-6 rounded-xl text-sm font-black transition-all ${
              contentType === 'live'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            } ${focusZone === 'tabs' && focusedTab === 2 ? 'ring-4 ring-white scale-105' : ''}`}
          >
            <Radio className="w-5 h-5" />
            <span>TV en Vivo</span>
          </button>
        </div>

        {/* Buscador Rápido de Canales/Películas dentro de la categoría */}
        <div className="relative w-64 hidden md:block shrink-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filtrar..."
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition"
          />
        </div>
      </header>

      {/* ── Cuerpo Principal: Sidebar de Categorías + Grid de Contenido ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Columna Izquierda: Carpetas / Categorías del Servidor */}
        <aside className="w-72 md:w-80 border-r border-white/10 bg-[#0A0E1A] p-4 flex flex-col shrink-0">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
              Categorías ({categories.length})
            </span>
            {loading && <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {categories.map((cat, idx) => {
              const isSelected = cat.category_id === selectedCategoryId;
              const isFocused = focusZone === 'categories' && focusedCatIndex === idx;

              return (
                <button
                  key={cat.category_id}
                  ref={(el) => { catItemRefs.current[idx] = el; }}
                  onClick={() => {
                    setSelectedCategoryId(cat.category_id);
                    setFocusedCatIndex(idx);
                    setFocusZone('categories');
                  }}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all ${
                    isFocused
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-extrabold scale-105 shadow-xl shadow-cyan-500/50 ring-4 ring-cyan-300 z-10'
                      : isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-md ring-1 ring-cyan-400/40'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Folder className={`w-4 h-4 shrink-0 ${isFocused ? 'text-black' : isSelected ? 'text-cyan-400' : 'text-zinc-500'}`} />
                  <span className="truncate flex-1">{cat.category_name}</span>
                </button>
              );
            })}

            {categories.length === 0 && !loading && (
              <div className="text-center py-10 text-xs text-zinc-500">
                No se encontraron categorías en esta sección.
              </div>
            )}
          </div>
        </aside>

        {/* Columna Derecha: Cuadrícula con Todo el Contenido Real */}
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-[#090D17] to-[#06080F]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
              <span>Contenido</span>
              <span className="text-xs text-cyan-400 font-normal">
                ({filteredStreams.length} {contentType === 'live' ? 'canales' : 'títulos'})
              </span>
            </h2>

            {loadingStreams && (
              <div className="flex items-center space-x-2 text-xs text-cyan-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Cargando streams del servidor...</span>
              </div>
            )}
          </div>

          {/* Grid de Películas o Series (Posters Verticales) */}
          {contentType !== 'live' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredStreams.map((item, idx) => {
                const isSeries = contentType === 'series';
                const id = isSeries ? (item as XtreamSeries).series_id : (item as XtreamStream).stream_id;
                const cover = isSeries ? (item as XtreamSeries).cover : (item as XtreamStream).stream_icon;
                const rating = item.rating;
                const isFocused = focusZone === 'grid' && focusedGridIndex === idx;

                return (
                  <div
                    key={id}
                    ref={(el) => { gridItemRefs.current[idx] = el; }}
                    onClick={() => {
                      setFocusedGridIndex(idx);
                      handleItemClick(item);
                    }}
                    className={`group relative flex flex-col cursor-pointer transition-all duration-200 ${
                      isFocused
                        ? 'scale-105 ring-4 ring-cyan-400 shadow-2xl shadow-cyan-500/60 z-20 -translate-y-1'
                        : 'hover:scale-105'
                    }`}
                  >
                    <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 group-hover:border-cyan-400 relative">
                      <img
                        src={cover || 'https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?q=80&w=400'}
                        alt={item.name}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.includes('unsplash')) {
                            target.src = 'https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?q=80&w=400';
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className={`absolute inset-0 bg-black/40 transition flex items-center justify-center ${
                        isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        <div className="w-12 h-12 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-xl">
                          <Play className="w-5 h-5 fill-black ml-0.5" />
                        </div>
                      </div>
                      {rating && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-black text-amber-400 flex items-center space-x-1 border border-white/10">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{rating}</span>
                        </div>
                      )}
                    </div>

                    <h3 className={`text-xs font-bold mt-2 truncate transition ${
                      isFocused ? 'text-cyan-300 font-extrabold' : 'text-white'
                    }`}>
                      {item.name}
                    </h3>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Grid de Canales de TV en Vivo (Tarjetas Horizontales con Logo) */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredStreams.map((live, idx) => {
                const stream = live as XtreamStream;
                const isFocused = focusZone === 'grid' && focusedGridIndex === idx;

                return (
                  <div
                    key={stream.stream_id}
                    ref={(el) => { gridItemRefs.current[idx] = el; }}
                    onClick={() => {
                      setFocusedGridIndex(idx);
                      handleItemClick(stream);
                    }}
                    className={`group p-3 rounded-2xl flex items-center space-x-3 cursor-pointer transition shadow-md ${
                      isFocused
                        ? 'bg-gradient-to-r from-cyan-900/60 to-blue-900/60 border-2 border-cyan-400 ring-4 ring-cyan-400/50 scale-105 z-10'
                        : 'bg-[#0E1424] hover:bg-cyan-950/40 border border-white/5 hover:border-cyan-400'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 p-1">
                      {stream.stream_icon ? (
                        <img
                          src={stream.stream_icon}
                          alt={stream.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Radio className="w-5 h-5 text-cyan-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-bold truncate ${
                        isFocused ? 'text-cyan-300 font-extrabold' : 'text-white'
                      }`}>
                        {stream.name}
                      </h4>
                      <span className="text-[10px] text-zinc-500 font-semibold flex items-center space-x-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Canal #{stream.stream_id}</span>
                      </span>
                    </div>
                    <Play className={`w-4 h-4 shrink-0 ${isFocused ? 'text-cyan-400 scale-125' : 'text-zinc-500'}`} />
                  </div>
                );
              })}
            </div>
          )}

          {filteredStreams.length === 0 && !loadingStreams && (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-xs space-y-2">
              <Folder className="w-8 h-8 opacity-40" />
              <span>No hay elementos en esta categoría.</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
