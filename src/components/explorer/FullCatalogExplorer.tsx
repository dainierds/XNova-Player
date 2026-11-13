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
  RefreshCw,
  X,
  Layers
} from 'lucide-react';
import type { PlaylistAccount } from '../../types';
import { XtreamService, type XtreamCategory, type XtreamStream, type XtreamSeries } from '../../services/xtream';

interface FullCatalogExplorerProps {
  playlist: PlaylistAccount;
  initialType?: 'movies' | 'series' | 'live';
  isActive?: boolean;
  onClose: () => void;
  onPlayStream: (stream: {
    id: string;
    title: string;
    streamUrl: string;
    posterUrl?: string;
    isLive?: boolean;
  }) => void;
}

type FocusZone = 'tabs' | 'categories' | 'grid' | 'episodes';
type FocusedHeaderTab = -1 | 0 | 1 | 2; // -1: Botón Volver, 0: Películas, 1: Series, 2: TV en Vivo

interface EpisodeItem {
  id: string | number;
  episode_num: number;
  title: string;
  container_extension?: string;
  info?: { plot?: string; duration_secs?: number; movie_image?: string };
}

interface SeriesDetails {
  series: XtreamSeries;
  seasons: Array<{ season_number: number; name?: string; episode_count?: number }>;
  episodes: Record<string, EpisodeItem[]>;
}

export const FullCatalogExplorer: React.FC<FullCatalogExplorerProps> = ({
  playlist,
  initialType = 'movies',
  isActive = true,
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
  const [focusedTab, setFocusedTab] = useState<FocusedHeaderTab>(
    initialType === 'movies' ? 0 : initialType === 'series' ? 1 : 2
  );
  const [focusedCatIndex, setFocusedCatIndex] = useState(0);
  const [focusedGridIndex, setFocusedGridIndex] = useState(0);

  // 🎬 Estados para visualizador y selector de episodios de Series
  const [selectedSeriesDetails, setSelectedSeriesDetails] = useState<SeriesDetails | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [focusedEpisodeIndex, setFocusedEpisodeIndex] = useState(0);
  const [focusedSeasonIndex, setFocusedSeasonIndex] = useState(0);
  const [episodeFocusZone, setEpisodeFocusZone] = useState<'seasons' | 'episodes'>('episodes');
  const [loadingSeriesModal, setLoadingSeriesModal] = useState(false);

  const catItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const gridItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const episodeItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const server = playlist.serverUrl || '';
  const user = playlist.username || '';
  const pass = playlist.password || '';

  // Número estricto y fijo de columnas para cálculo perfecto de D-pad
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
  const filteredStreams = streams.filter((item) => {
    const title = (item.name || (item as any).title || '').toLowerCase();
    return title.includes(searchFilter.toLowerCase());
  });

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

  // Auto-scroll del episodio enfocado en el modal de series
  useEffect(() => {
    if (focusZone === 'episodes' && episodeFocusZone === 'episodes') {
      episodeItemRefs.current[focusedEpisodeIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusedEpisodeIndex, focusZone, episodeFocusZone]);

  // Manejar clic o selección con OK en cualquier ítem del catálogo
  const handleItemClick = async (item: XtreamStream | XtreamSeries) => {
    if (contentType === 'movies') {
      const vod = item as XtreamStream;
      const streamId = vod.stream_id || (vod as any).id;
      const title = vod.name || (vod as any).title || 'Película VOD';
      const ext = vod.container_extension || (vod as any).extension || 'mp4';
      const streamUrl = XtreamService.buildVodStreamUrl(
        server, user, pass,
        streamId,
        ext
      );
      onPlayStream({
        id: `vod_${streamId}`,
        title,
        streamUrl,
        posterUrl: vod.stream_icon || (vod as any).cover || (vod as any).movie_image,
        isLive: false,
      });
    } else if (contentType === 'live') {
      const live = item as XtreamStream;
      const streamId = live.stream_id || (live as any).id;
      const title = live.name || (live as any).title || 'Canal de TV';
      const streamUrl = XtreamService.buildLiveStreamUrl(
        server, user, pass,
        streamId
      );
      onPlayStream({
        id: `live_${streamId}`,
        title,
        streamUrl,
        posterUrl: live.stream_icon,
        isLive: true,
      });
    } else {
      // SERIES: Cargar información detallada y episodios
      const series = item as XtreamSeries;
      const seriesId = series.series_id || (series as any).id;
      setLoadingSeriesModal(true);
      try {
        const details = await XtreamService.getSeriesInfo(server, user, pass, seriesId);
        const seasons = details.seasons || [];
        const episodes = details.episodes || {};
        const seasonKeys = Object.keys(episodes);

        if (seasonKeys.length > 0) {
          const firstSeasonNum = Number(seasonKeys[0]) || 1;
          setSelectedSeriesDetails({
            series,
            seasons: seasons.length > 0 ? seasons : seasonKeys.map((k) => ({
              season_number: Number(k),
              name: `Temporada ${k}`,
            })),
            episodes,
          });
          setSelectedSeasonNumber(firstSeasonNum);
          setFocusedEpisodeIndex(0);
          setFocusedSeasonIndex(0);
          setEpisodeFocusZone('episodes');
          setFocusZone('episodes');
        } else {
          // Si no tiene estructura de episodios desglosada, intentar reproducir directo
          const streamUrl = XtreamService.buildSeriesStreamUrl(server, user, pass, seriesId, 'mp4');
          onPlayStream({
            id: `series_${seriesId}`,
            title: series.name || (series as any).title || 'Serie',
            streamUrl,
            posterUrl: series.cover,
            isLive: false,
          });
        }
      } catch (err) {
        console.error('Error al cargar episodios de la serie:', err);
      } finally {
        setLoadingSeriesModal(false);
      }
    }
  };

  // Reproducir un episodio específico de la serie seleccionada
  const playEpisode = (episode: EpisodeItem) => {
    if (!selectedSeriesDetails) return;
    const series = selectedSeriesDetails.series;
    const epId = episode.id;
    const ext = episode.container_extension || 'mp4';
    const streamUrl = XtreamService.buildSeriesStreamUrl(server, user, pass, epId, ext);
    const epTitle = episode.title 
      ? `T${selectedSeasonNumber}E${episode.episode_num}: ${episode.title}`
      : `T${selectedSeasonNumber} Episodio ${episode.episode_num}`;

    onPlayStream({
      id: `series_${epId}`,
      title: `${series.name || 'Serie'} - ${epTitle}`,
      streamUrl,
      posterUrl: episode.info?.movie_image || series.cover,
      isLive: false,
    });
  };

  // Obtener lista de episodios para la temporada actual seleccionada
  const currentSeasonEpisodes: EpisodeItem[] = 
    selectedSeriesDetails?.episodes[String(selectedSeasonNumber)] ||
    selectedSeriesDetails?.episodes[selectedSeasonNumber] ||
    [];

  // 🎮 Motor Oficial de Navegación D-Pad para TV / Control Remoto
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevenir scroll nativo del navegador para que responda solo al D-pad
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }

      // --- NAVEGACIÓN EN MODAL DE EPISODIOS DE SERIES ---
      if (focusZone === 'episodes' && selectedSeriesDetails) {
        const seasonsList = selectedSeriesDetails.seasons || [];

        switch (e.key) {
          case 'ArrowLeft':
            if (episodeFocusZone === 'seasons') {
              if (focusedSeasonIndex > 0) {
                const prevSeasonIdx = focusedSeasonIndex - 1;
                setFocusedSeasonIndex(prevSeasonIdx);
                setSelectedSeasonNumber(seasonsList[prevSeasonIdx]?.season_number || prevSeasonIdx + 1);
                setFocusedEpisodeIndex(0);
              }
            } else if (episodeFocusZone === 'episodes') {
              // Si está en la lista de episodios, permitir cambiar de temporada
              if (focusedSeasonIndex > 0) {
                const prevSeasonIdx = focusedSeasonIndex - 1;
                setFocusedSeasonIndex(prevSeasonIdx);
                setSelectedSeasonNumber(seasonsList[prevSeasonIdx]?.season_number || prevSeasonIdx + 1);
                setFocusedEpisodeIndex(0);
              }
            }
            break;

          case 'ArrowRight':
            if (episodeFocusZone === 'seasons') {
              if (focusedSeasonIndex < seasonsList.length - 1) {
                const nextSeasonIdx = focusedSeasonIndex + 1;
                setFocusedSeasonIndex(nextSeasonIdx);
                setSelectedSeasonNumber(seasonsList[nextSeasonIdx]?.season_number || nextSeasonIdx + 1);
                setFocusedEpisodeIndex(0);
              }
            } else if (episodeFocusZone === 'episodes') {
              if (focusedSeasonIndex < seasonsList.length - 1) {
                const nextSeasonIdx = focusedSeasonIndex + 1;
                setFocusedSeasonIndex(nextSeasonIdx);
                setSelectedSeasonNumber(seasonsList[nextSeasonIdx]?.season_number || nextSeasonIdx + 1);
                setFocusedEpisodeIndex(0);
              }
            }
            break;

          case 'ArrowUp':
            if (episodeFocusZone === 'episodes') {
              if (focusedEpisodeIndex > 0) {
                setFocusedEpisodeIndex((prev) => prev - 1);
              } else {
                setEpisodeFocusZone('seasons');
              }
            }
            break;

          case 'ArrowDown':
            if (episodeFocusZone === 'seasons') {
              if (currentSeasonEpisodes.length > 0) {
                setEpisodeFocusZone('episodes');
                setFocusedEpisodeIndex(0);
              }
            } else if (episodeFocusZone === 'episodes') {
              if (focusedEpisodeIndex < currentSeasonEpisodes.length - 1) {
                setFocusedEpisodeIndex((prev) => prev + 1);
              }
            }
            break;

          case 'Enter':
          case ' ':
            e.preventDefault();
            if (episodeFocusZone === 'episodes') {
              if (currentSeasonEpisodes[focusedEpisodeIndex]) {
                playEpisode(currentSeasonEpisodes[focusedEpisodeIndex]);
              }
            } else if (episodeFocusZone === 'seasons') {
              setEpisodeFocusZone('episodes');
              setFocusedEpisodeIndex(0);
            }
            break;

          case 'Escape':
          case 'Backspace':
          case 'GoBack':
            e.preventDefault();
            e.stopPropagation();
            setSelectedSeriesDetails(null);
            setFocusZone('grid');
            break;
        }
        return;
      }

      // --- NAVEGACIÓN EN CATÁLOGO PRINCIPAL (Pestañas, Categorías, Cuadrícula) ---
      switch (e.key) {
        // --- FLECHA IZQUIERDA ---
        case 'ArrowLeft':
          if (focusZone === 'grid') {
            if (focusedGridIndex % numCols === 0) {
              // Si está en la primera columna, regresar exactamente a la categoría seleccionada
              setFocusZone('categories');
            } else {
              setFocusedGridIndex((prev) => Math.max(0, prev - 1));
            }
          } else if (focusZone === 'tabs') {
            if (focusedTab === 0) {
              // De Películas pasa a "Volver"
              setFocusedTab(-1);
            } else if (focusedTab > 0) {
              const nextTab = (focusedTab - 1) as FocusedHeaderTab;
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
            if (focusedTab === -1) {
              // De "Volver" pasa a Películas
              setFocusedTab(0);
            } else if (focusedTab < 2) {
              const nextTab = (focusedTab + 1) as FocusedHeaderTab;
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
              // Subir a la barra superior de navegación
              setFocusZone('tabs');
              setFocusedTab(0);
            }
          } else if (focusZone === 'grid') {
            if (focusedGridIndex >= numCols) {
              // Sube exactamente a la tarjeta que está arriba
              setFocusedGridIndex((prev) => prev - numCols);
            } else {
              // Si está en la primera fila, subir a la barra superior
              setFocusZone('tabs');
              setFocusedTab(0);
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
              // Baja exactamente a la tarjeta que está directamente debajo
              setFocusedGridIndex((prev) => prev + numCols);
            } else if (focusedGridIndex < filteredStreams.length - 1) {
              // Si está en la penúltima fila y la última fila tiene menos tarjetas, ir al último ítem
              setFocusedGridIndex(filteredStreams.length - 1);
            }
          }
          break;

        // --- ENTER / OK ---
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusZone === 'tabs') {
            if (focusedTab === -1) {
              onClose();
            } else {
              setContentType(focusedTab === 0 ? 'movies' : focusedTab === 1 ? 'series' : 'live');
              setFocusZone('categories');
            }
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
            // Si está dentro de la cuadrícula, volver primero a las categorías manteniendo la categoría intacta
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
    isActive,
    focusZone,
    focusedTab,
    focusedCatIndex,
    focusedGridIndex,
    categories,
    filteredStreams,
    numCols,
    onClose,
    selectedSeriesDetails,
    episodeFocusZone,
    focusedSeasonIndex,
    focusedEpisodeIndex,
    currentSeasonEpisodes,
  ]);

  return (
    <div className="fixed inset-0 z-50 bg-[#070A12] text-white flex flex-col overflow-hidden select-none animate-fadeIn font-sans">
      {/* ── Barra Superior de Navegación ── */}
      <header className="px-8 py-4 border-b border-white/10 bg-[#0C101D] flex items-center justify-between shrink-0">
        <button
          onClick={onClose}
          className={`p-3 rounded-2xl transition-all duration-200 flex items-center space-x-2 shrink-0 ${
            focusZone === 'tabs' && focusedTab === -1
              ? 'bg-cyan-400 text-black ring-4 ring-cyan-300 scale-105 shadow-xl shadow-cyan-400/50'
              : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5'
          }`}
          title="Volver a Inicio (O pulsa Atrás en el mando)"
        >
          <ArrowLeft className={`w-5 h-5 ${focusZone === 'tabs' && focusedTab === -1 ? 'text-black font-black' : 'text-white'}`} />
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
            } ${
              focusZone === 'tabs' && focusedTab === 0
                ? 'ring-4 ring-cyan-400 scale-102 font-extrabold z-10'
                : ''
            }`}
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
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            } ${
              focusZone === 'tabs' && focusedTab === 1
                ? 'ring-4 ring-cyan-400 scale-102 font-extrabold z-10'
                : ''
            }`}
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
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            } ${
              focusZone === 'tabs' && focusedTab === 2
                ? 'ring-4 ring-cyan-400 scale-102 font-extrabold z-10'
                : ''
            }`}
          >
            <Radio className="w-5 h-5" />
            <span>TV en Vivo</span>
          </button>
        </div>

        {/* Buscador Rápido con Icono */}
        <div className="relative w-64 shrink-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrar por título..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[#131826] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </header>

      {/* ── Cuerpo Principal Dividido: Categorías (Izquierda) + Cuadrícula (Derecha) ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel Lateral: Lista de Categorías */}
        <aside className="w-80 border-r border-white/10 bg-[#0A0D17] flex flex-col shrink-0">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
              Categorías ({categories.length})
            </span>
            {loading && <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1 scroll-smooth">
            {categories.map((cat, idx) => {
              const isSelected = selectedCategoryId === cat.category_id;
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
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center space-x-3 ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                  } ${
                    isFocused
                      ? 'ring-4 ring-cyan-400 bg-cyan-500/30 text-white font-extrabold scale-102 z-10 shadow-lg shadow-cyan-500/30'
                      : ''
                  }`}
                >
                  <Folder className={`w-4 h-4 shrink-0 ${isSelected || isFocused ? 'text-cyan-400' : 'text-zinc-500'}`} />
                  <span className="truncate flex-1">{cat.category_name}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Panel Principal: Cuadrícula de Contenido */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
              <span>Contenido</span>
              <span className="text-xs text-cyan-400 font-normal">
                ({filteredStreams.length} {contentType === 'live' ? 'canales' : 'títulos'})
              </span>
            </h2>

            {(loadingStreams || loadingSeriesModal) && (
              <div className="flex items-center space-x-2 text-xs text-cyan-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{loadingSeriesModal ? 'Cargando episodios de la serie...' : 'Cargando streams del servidor...'}</span>
              </div>
            )}
          </div>

          {/* Grid de Películas o Series (Posters Verticales): Estrictamente 5 columnas fijas */}
          {contentType !== 'live' ? (
            <div className="grid grid-cols-5 gap-4">
              {filteredStreams.map((item, idx) => {
                const isSeries = contentType === 'series';
                const id = isSeries ? (item as XtreamSeries).series_id : (item as XtreamStream).stream_id;
                const cover = isSeries ? (item as XtreamSeries).cover : (item as XtreamStream).stream_icon;
                const rating = item.rating;
                const title = item.name || (item as any).title || 'Sin Título';
                const isFocused = focusZone === 'grid' && focusedGridIndex === idx;

                return (
                  <div
                    key={id || idx}
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
                        alt={title}
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
                          {isSeries ? <Layers className="w-5 h-5 ml-0.5" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
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
                      {title}
                    </h3>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Grid de Canales de TV en Vivo (Tarjetas Horizontales con Logo): Estrictamente 4 columnas fijas */
            <div className="grid grid-cols-4 gap-3">
              {filteredStreams.map((live, idx) => {
                const stream = live as XtreamStream;
                const title = stream.name || (stream as any).title || `Canal #${stream.stream_id}`;
                const isFocused = focusZone === 'grid' && focusedGridIndex === idx;

                return (
                  <div
                    key={stream.stream_id || idx}
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
                          alt={title}
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
                        {title}
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

      {/* ── Modal de Selección de Episodios para Series ── */}
      {selectedSeriesDetails && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xl flex flex-col p-8 animate-fadeIn">
          {/* Cabecera del modal con información de la serie */}
          <div className="flex items-start justify-between border-b border-white/10 pb-6 shrink-0">
            <div className="flex items-center space-x-6">
              {selectedSeriesDetails.series.cover && (
                <img
                  src={selectedSeriesDetails.series.cover}
                  alt={selectedSeriesDetails.series.name}
                  className="w-20 h-28 object-cover rounded-xl border border-white/20 shadow-xl"
                />
              )}
              <div>
                <h2 className="text-2xl font-black text-white">{selectedSeriesDetails.series.name}</h2>
                <div className="flex items-center space-x-4 mt-1.5 text-xs text-zinc-300">
                  {selectedSeriesDetails.series.rating && (
                    <span className="flex items-center text-amber-400 font-black">
                      <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                      {selectedSeriesDetails.series.rating}
                    </span>
                  )}
                  {selectedSeriesDetails.series.genre && (
                    <span className="text-cyan-400">{selectedSeriesDetails.series.genre}</span>
                  )}
                  <span>{selectedSeriesDetails.seasons.length} Temporadas</span>
                </div>
                {selectedSeriesDetails.series.plot && (
                  <p className="text-xs text-zinc-400 mt-2 max-w-3xl line-clamp-2">
                    {selectedSeriesDetails.series.plot}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedSeriesDetails(null);
                setFocusZone('grid');
              }}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              title="Cerrar (o pulsa Atrás)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Selector de Temporadas */}
          <div className="flex items-center space-x-3 py-4 overflow-x-auto shrink-0 border-b border-white/5">
            {selectedSeriesDetails.seasons.map((season, sIdx) => {
              const sNum = season.season_number || sIdx + 1;
              const isSeasonSelected = selectedSeasonNumber === sNum;
              const isSeasonFocused = focusZone === 'episodes' && episodeFocusZone === 'seasons' && focusedSeasonIndex === sIdx;

              return (
                <button
                  key={sNum}
                  onClick={() => {
                    setSelectedSeasonNumber(sNum);
                    setFocusedSeasonIndex(sIdx);
                    setFocusedEpisodeIndex(0);
                    setEpisodeFocusZone('episodes');
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                    isSeasonSelected
                      ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40'
                      : 'bg-[#131826] text-zinc-400 hover:text-white border border-white/10'
                  } ${
                    isSeasonFocused
                      ? 'ring-4 ring-cyan-300 scale-105 z-10'
                      : ''
                  }`}
                >
                  {season.name || `Temporada ${sNum}`}
                </button>
              );
            })}
          </div>

          {/* Lista de Episodios con Navegación Remota */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-2">
              Episodios de la Temporada {selectedSeasonNumber} ({currentSeasonEpisodes.length})
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {currentSeasonEpisodes.map((ep, eIdx) => {
                const isEpFocused = focusZone === 'episodes' && episodeFocusZone === 'episodes' && focusedEpisodeIndex === eIdx;

                return (
                  <div
                    key={ep.id || eIdx}
                    ref={(el) => { episodeItemRefs.current[eIdx] = el; }}
                    onClick={() => playEpisode(ep)}
                    className={`p-4 rounded-2xl flex items-center space-x-4 cursor-pointer transition-all duration-200 border ${
                      isEpFocused
                        ? 'bg-gradient-to-r from-cyan-900/70 to-blue-900/70 border-cyan-400 ring-4 ring-cyan-400/50 scale-102 z-10 shadow-xl'
                        : 'bg-[#0E1424] hover:bg-cyan-950/40 border-white/5'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 font-black text-sm flex items-center justify-center shrink-0 border border-cyan-500/30">
                      {ep.episode_num || eIdx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-bold truncate ${isEpFocused ? 'text-cyan-300 font-extrabold' : 'text-white'}`}>
                        {ep.title || `Episodio ${ep.episode_num || eIdx + 1}`}
                      </h4>
                      {ep.info?.plot && (
                        <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                          {ep.info.plot}
                        </p>
                      )}
                    </div>

                    <div className={`p-2.5 rounded-full transition ${isEpFocused ? 'bg-cyan-400 text-black' : 'bg-white/10 text-white'}`}>
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                );
              })}
            </div>

            {currentSeasonEpisodes.length === 0 && (
              <div className="h-40 flex items-center justify-center text-zinc-500 text-xs">
                No hay episodios registrados para esta temporada.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};