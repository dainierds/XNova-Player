import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, 
  Folder, 
  Play, 
  RefreshCw, 
  Video, 
  X, 
  Radio,
  Film,
  Search,
  RotateCw,
  Heart
} from 'lucide-react';
import type { PlaylistAccount } from '../../types';
import { XtreamService, type XtreamCategory, type XtreamStream, type XtreamSeries } from '../../services/xtream';
import { TmdbService } from '../../services/tmdb';
import { CatalogCacheService, type CompactCatalogItem } from '../../services/catalogCacheService';
import { ImagePreloadService } from '../../services/imagePreloadService';
import { PosterResolutionService } from '../../services/posterResolutionService';
import { usePlaylistStore } from '../../store/usePlaylistStore';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { QuickFavoriteModal, type QuickFavoriteItem } from '../common/QuickFavoriteModal';
import { HoldProgressIndicator } from '../common/HoldProgressIndicator';

/**
 * Normaliza URLs de imágenes de servidores IPTV / Xtream Codes y TMDb
 */
const normalizeMediaUrl = (url?: string, serverBase?: string): string => {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '';
  
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  
  if (trimmed.startsWith('/')) {
    if (serverBase) {
      return `${serverBase.replace(/\/+$/, '')}${trimmed}`;
    }
    return `https://image.tmdb.org/t/p/w500${trimmed}`;
  }
  
  return trimmed;
};

/**
 * Tarjeta individual de poster con soporte anti-bloqueo y fallback elegante
 */
interface CatalogPosterCardProps {
  item: XtreamStream | XtreamSeries;
  isFocused: boolean;
  contentType: 'movies' | 'series' | 'live';
  server: string;
  onSelect: () => void;
  innerRef: (el: HTMLDivElement | null) => void;
}

const CatalogPosterCard: React.FC<CatalogPosterCardProps> = ({
  item,
  isFocused,
  contentType,
  server,
  onSelect,
  innerRef,
}) => {
  const isSeries = contentType === 'series';
  const rawCover = isSeries
    ? ((item as any).cover || (item as any).icon || (item as any).stream_icon || (item as any).poster)
    : ((item as any).icon || (item as any).stream_icon || (item as any).cover || (item as any).movie_image || (item as any).cover_big || (item as any).poster);
  const initialCover = normalizeMediaUrl(rawCover, server);
  const title = item.name || (item as any).title || 'Sin Título';
  const rating = item.rating || '7.0';

  // Si no hay portada en el proveedor, buscar inmediatamente si ya está resuelta en RAM (0ms)
  const cachedPoster = !initialCover ? PosterResolutionService.getCachedPoster(title) : null;
  const initialSrc = initialCover || cachedPoster || '';

  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [imageLoaded, setImageLoaded] = useState<boolean>(() => {
    return initialSrc ? ImagePreloadService.isCached(initialSrc) : false;
  });
  const [hasFailed, setHasFailed] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const coverUrl = normalizeMediaUrl(rawCover, server);

    if (coverUrl) {
      setImgSrc(coverUrl);
      setHasFailed(false);
      if (ImagePreloadService.isCached(coverUrl)) {
        setImageLoaded(true);
      }
    } else if (cachedPoster) {
      setImgSrc(cachedPoster);
      setHasFailed(false);
      setImageLoaded(true);
    } else if (contentType === 'movies' || contentType === 'series') {
      PosterResolutionService.resolvePoster(title).then((resolvedPoster) => {
        if (isMounted) {
          if (resolvedPoster && resolvedPoster.startsWith('http')) {
            setImgSrc(resolvedPoster);
            setHasFailed(false);
          } else {
            setHasFailed(true);
          }
        }
      }).catch(() => {
        if (isMounted) setHasFailed(true);
      });
    } else {
      setHasFailed(true);
    }

    return () => { isMounted = false; };
  }, [rawCover, server, title, contentType, cachedPoster]);

  const handleImageError = () => {
    if (contentType === 'movies' || contentType === 'series') {
      PosterResolutionService.resolvePoster(title).then((resolved) => {
        if (resolved && resolved !== imgSrc && resolved.startsWith('http')) {
          setImgSrc(resolved);
          setHasFailed(false);
        } else {
          setHasFailed(true);
        }
      }).catch(() => {
        setHasFailed(true);
      });
    } else {
      setHasFailed(true);
    }
  };

  return (
    <div
      ref={innerRef}
      onClick={onSelect}
      className={`group relative flex flex-col cursor-pointer transition-all duration-200 ${
        isFocused
          ? 'scale-105 ring-4 ring-cyan-400 shadow-2xl shadow-cyan-500/60 z-20 -translate-y-1'
          : 'hover:scale-105'
      }`}
    >
      <div className={`aspect-[2/3] w-full rounded-2xl overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-950 border border-white/10 group-hover:border-cyan-400 relative shadow-lg flex items-center justify-center ${
        !imageLoaded && !hasFailed && !imgSrc ? 'shimmer-effect' : ''
      }`}>
        {!hasFailed && imgSrc ? (
          <img
            ref={(el) => {
              if (el && (el.complete || el.naturalWidth > 0) && !imageLoaded) {
                setImageLoaded(true);
              }
            }}
            src={imgSrc}
            alt={title}
            referrerPolicy="no-referrer"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-90'
            }`}
          />
        ) : (
          <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D]">
            <Film className="w-10 h-10 text-cyan-400/60 mb-3" />
            <span className="text-xs font-bold text-zinc-300 line-clamp-3 leading-tight">{title}</span>
          </div>
        )}

        {/* Calificación en la esquina inferior izquierda (estilo TiviMate) */}
        {rating && rating !== '0' && rating !== '0.0' && (
          <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-cyan-600/90 backdrop-blur-md text-[11px] font-black text-white shadow-md border border-cyan-400/40">
            {rating}
          </div>
        )}
      </div>

      <h3 className={`text-xs font-bold mt-2 truncate transition ${
        isFocused ? 'text-cyan-300 font-extrabold' : 'text-zinc-200'
      }`}>
        {title}
      </h3>
    </div>
  );
};

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

type FocusZone = 'sidebar_back' | 'sidebar_search' | 'categories' | 'grid' | 'movie_detail' | 'series_modal';

interface MediaMetadata {
  title: string;
  rating?: string;
  year?: string;
  duration?: string;
  genres?: string;
  cast?: string;
  director?: string;
  plot?: string;
  backdropUrl?: string;
  posterUrl?: string;
  containerExtension?: string;
  youtubeTrailer?: string;
}

interface EpisodeItem {
  id?: string | number;
  episode_id?: string | number;
  stream_id?: string | number;
  episode_num?: number;
  title?: string;
  container_extension?: string;
  extension?: string;
  ext?: string;
  direct_source?: string;
  info?: { plot?: string; duration_secs?: number; movie_image?: string; container_extension?: string; extension?: string };
}

interface SeriesDetails {
  series: XtreamSeries;
  seasons: Array<{ season_number: number; name?: string; episode_count?: number }>;
  episodes: Record<string, EpisodeItem[]>;
}

// 🚀 Caché global en memoria RAM para 0ms de respuesta al reingresar a carpetas (Bíblicas, Acción, etc.)
const globalCategoriesCache = new Map<string, XtreamCategory[]>();
const globalCategoryStreamsCache = new Map<string, (XtreamStream | XtreamSeries)[]>();

export const FullCatalogExplorer: React.FC<FullCatalogExplorerProps> = ({
  playlist,
  initialType = 'movies',
  isActive = true,
  onClose,
  onPlayStream,
}) => {
  const [contentType] = useState<'movies' | 'series' | 'live'>(initialType);

  const server = playlist.serverUrl || '';
  const user = playlist.username || '';
  const pass = playlist.password || '';

  // Clave de caché para categorías
  const catCacheKey = `${server}_${user}_${contentType}`;
  const initialCachedCats = globalCategoriesCache.get(catCacheKey) || [];
  const initialSelectedCatId = initialCachedCats.length > 0 ? String(initialCachedCats[0].category_id) : '';

  // Clave de caché para streams de la categoría inicial
  const streamsCacheKey = initialSelectedCatId ? `${server}_${user}_${contentType}_${initialSelectedCatId}` : '';
  const initialCachedStreams = streamsCacheKey ? (globalCategoryStreamsCache.get(streamsCacheKey) || []) : [];

  const [categories, setCategories] = useState<XtreamCategory[]>(initialCachedCats);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialSelectedCatId);
  const [streams, setStreams] = useState<(XtreamStream | XtreamSeries)[]>(initialCachedStreams);
  const [loading, setLoading] = useState(initialCachedCats.length === 0);
  const [loadingStreams, setLoadingStreams] = useState(initialCachedStreams.length === 0);

  // 🔍 Búsqueda general dentro de la sección activa (Películas, Series o Canales)
  const [searchQuery, setSearchQuery] = useState('');
  const [allSectionStreams, setAllSectionStreams] = useState<(XtreamStream | XtreamSeries)[] | null>(null);
  const [loadingSearchAll, setLoadingSearchAll] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // 🎮 Estados de navegación D-Pad para TV
  const [focusZone, setFocusZone] = useState<FocusZone>('categories');
  const [focusedCatIndex, setFocusedCatIndex] = useState(0);
  const [focusedGridIndex, setFocusedGridIndex] = useState(0);

  // 🎬 Metadatos e Información Cinemática (Hero Preview - Imagen 1)
  const [focusedMetadata, setFocusedMetadata] = useState<MediaMetadata | null>(null);
  const metadataCacheRef = useRef<Map<string | number, MediaMetadata>>(new Map());

  // 📺 Pantalla Completa de Detalles de Película (Imagen 2)
  const [selectedMovieDetail, setSelectedMovieDetail] = useState<{
    item: XtreamStream;
    meta: MediaMetadata;
    streamUrl: string;
  } | null>(null);
  const [detailBtnIndex, setDetailBtnIndex] = useState<number>(0); // 0: Play, 1: Favorite, 2: Trailer

  // ⭐ Favoritos y pulsación de 3 segundos
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const [quickFavItem, setQuickFavItem] = useState<QuickFavoriteItem | null>(null);
  const [isQuickFavOpen, setIsQuickFavOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const isHoldingOkRef = useRef(false);
  const hasTriggeredLongPressRef = useRef(false);

  // 🎬 Modal de Episodios para Series
  const [selectedSeriesDetails, setSelectedSeriesDetails] = useState<SeriesDetails | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [focusedEpisodeIndex, setFocusedEpisodeIndex] = useState(0);
  const [focusedSeasonIndex, setFocusedSeasonIndex] = useState(0);
  const [seriesFocusZone, setSeriesFocusZone] = useState<'close' | 'seasons' | 'episodes'>('episodes');
  const [loadingSeriesModal, setLoadingSeriesModal] = useState(false);

  const catItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const gridItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const episodeItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Número fijo de columnas para cálculo matemático 1:1 en control remoto
  const numCols = contentType === 'live' ? 4 : 5;

  // 1. Cargar las categorías correspondientes (con caché en memoria 0ms)
  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      const cacheKey = `${server}_${user}_${contentType}`;
      if (globalCategoriesCache.has(cacheKey)) {
        const cached = globalCategoriesCache.get(cacheKey)!;
        setCategories(cached);
        if (!selectedCategoryId && cached.length > 0) {
          setSelectedCategoryId(String(cached[0].category_id));
        }
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        let validCats: XtreamCategory[] = [];
        if (contentType === 'movies') {
          const res = await XtreamService.getVodCategories(server, user, pass);
          if (Array.isArray(res)) validCats = res;
        } else if (contentType === 'series') {
          const res = await XtreamService.getSeriesCategories(server, user, pass);
          if (Array.isArray(res)) validCats = res;
        } else {
          const res = await XtreamService.getLiveCategories(server, user, pass);
          if (Array.isArray(res)) validCats = res;
        }

        // Si el servidor no devolvió categorías, recurrir a las cacheadas en el store
        if (validCats.length === 0) {
          const store = usePlaylistStore.getState();
          const fallbackCats = contentType === 'live' ? store.liveCategories : store.vodCategories;
          if (Array.isArray(fallbackCats) && fallbackCats.length > 0) {
            validCats = fallbackCats;
          }
        }

        if (validCats.length > 0) {
          globalCategoriesCache.set(cacheKey, validCats);
        }

        if (isMounted) {
          setCategories(validCats);
          if (validCats.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(String(validCats[0].category_id));
          } else if (validCats.length === 0 && !selectedCategoryId) {
            setSelectedCategoryId('all');
          }
          setFocusedCatIndex(0);
          setFocusedGridIndex(0);
        }
      } catch (err) {
        console.error('Error al cargar categorías Xtream:', err);
        if (isMounted && categories.length === 0) {
          const store = usePlaylistStore.getState();
          const fallbackCats = contentType === 'live' ? store.liveCategories : store.vodCategories;
          if (Array.isArray(fallbackCats) && fallbackCats.length > 0) {
            setCategories(fallbackCats);
            setSelectedCategoryId(String(fallbackCats[0].category_id));
          } else {
            setSelectedCategoryId('all');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCategories();
    return () => { isMounted = false; };
  }, [contentType, server, user, pass]);

  // 2. Cargar los contenidos de la categoría seleccionada (con caché en memoria 0ms)
  useEffect(() => {
    let isMounted = true;
    if (!selectedCategoryId || selectedCategoryId.trim() === '') return;

    const streamsKey = `${server}_${user}_${contentType}_${selectedCategoryId}`;

    // 🚀 Si ya tenemos los streams de esta carpeta en RAM, mostrarlos inmediatamente en 0ms
    if (globalCategoryStreamsCache.has(streamsKey)) {
      const cached = globalCategoryStreamsCache.get(streamsKey)!;
      setStreams(cached);
      setLoadingStreams(false);
      // Precarga suave en segundo plano de las primeras 60 carátulas
      const urls = cached.slice(0, 60).map((item) => {
        const rawCover = contentType === 'series'
          ? ((item as any).cover || (item as any).icon || (item as any).stream_icon || (item as any).poster)
          : ((item as any).icon || (item as any).stream_icon || (item as any).cover || (item as any).movie_image || (item as any).cover_big || (item as any).poster);
        return normalizeMediaUrl(rawCover, server);
      });
      ImagePreloadService.preloadBatch(urls);
      return;
    }

    const loadStreams = async () => {
      setLoadingStreams(true);
      try {
        let validItems: (XtreamStream | XtreamSeries)[] = [];
        if (contentType === 'movies') {
          const res = await XtreamService.getVodStreams(server, user, pass, selectedCategoryId === 'all' ? undefined : selectedCategoryId);
          if (Array.isArray(res)) validItems = res;
        } else if (contentType === 'series') {
          const res = await XtreamService.getSeries(server, user, pass, selectedCategoryId === 'all' ? undefined : selectedCategoryId);
          if (Array.isArray(res)) validItems = res;
        } else {
          const res = await XtreamService.getLiveStreams(server, user, pass, selectedCategoryId === 'all' ? undefined : selectedCategoryId);
          if (Array.isArray(res)) validItems = res;
        }

        // Almacenar en caché de memoria RAM
        globalCategoryStreamsCache.set(streamsKey, validItems);

        if (isMounted) {
          setStreams(validItems);
          setFocusedGridIndex(0);
          const urls = validItems.slice(0, 60).map((item) => {
            const rawCover = contentType === 'series'
              ? ((item as any).cover || (item as any).icon || (item as any).stream_icon || (item as any).poster)
              : ((item as any).icon || (item as any).stream_icon || (item as any).cover || (item as any).movie_image || (item as any).cover_big || (item as any).poster);
            return normalizeMediaUrl(rawCover, server);
          });
          ImagePreloadService.preloadBatch(urls);
        }
      } catch (err) {
        console.error('Error al cargar contenido de la categoría:', err);
        if (isMounted) setStreams([]);
      } finally {
        if (isMounted) setLoadingStreams(false);
      }
    };

    loadStreams();
    return () => { isMounted = false; };
  }, [selectedCategoryId, contentType, server, user, pass]);

  // 🚀 Precarga suave de pósters en memoria RAM (estilo Glide en Kai TV)
  useEffect(() => {
    if (streams && streams.length > 0) {
      const urls = streams.slice(0, 20).map((item) => {
        const rawCover = (item as any).icon || (item as any).stream_icon || (item as any).cover;
        return normalizeMediaUrl(rawCover, server);
      }).filter((u): u is string => Boolean(u));

      const timer = setTimeout(() => {
        ImagePreloadService.preloadBatch(urls);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [streams, server]);

  // 🔍 Cargar/Refrescar catálogo completo de la sección en segundo plano para búsqueda
  const loadOrRefreshSectionCache = useCallback(async (force = false) => {
    if (!force) {
      // 1. Intentar leer de IndexedDB primero
      const cached = await CatalogCacheService.get(playlist.id, contentType);
      if (cached && cached.length > 0) {
        setAllSectionStreams(cached as any);
        return;
      }
    }

    // 2. Si no hay caché o se forzó, descargar del servidor Xtream
    setLoadingSearchAll(true);
    try {
      let all: (XtreamStream | XtreamSeries)[] = [];
      if (contentType === 'movies') {
        all = await XtreamService.getVodStreams(server, user, pass);
      } else if (contentType === 'series') {
        all = await XtreamService.getSeries(server, user, pass);
      } else {
        all = await XtreamService.getLiveStreams(server, user, pass);
      }

      // 3. Comprimir y almacenar en IndexedDB
      if (all && all.length > 0) {
        const compact = await CatalogCacheService.set(playlist.id, contentType, all);
        setAllSectionStreams(compact as any);
      } else {
        setAllSectionStreams([]);
      }
    } catch (err) {
      console.error('[FullCatalog] Error al cargar/refrescar catálogo de sección:', err);
    } finally {
      setLoadingSearchAll(false);
    }
  }, [contentType, playlist.id, server, user, pass]);

  // Si el usuario empieza a escribir y no está cargado el catálogo, disparar carga en segundo plano
  useEffect(() => {
    if (searchQuery.trim() && allSectionStreams === null && !loadingSearchAll) {
      loadOrRefreshSectionCache(false);
    }
  }, [searchQuery, allSectionStreams, loadingSearchAll, loadOrRefreshSectionCache]);

  // Contenidos mostrados: si hay búsqueda filtra en memoria a ultra-alta velocidad (0-10ms)
  const displayedStreams = useMemo(() => {
    if (!searchQuery.trim()) return streams;
    const pool = (allSectionStreams || streams) as any[];
    if (pool.length > 0 && pool[0].norm) {
      return CatalogCacheService.search(pool as CompactCatalogItem[], searchQuery);
    }
    const q = searchQuery.toLowerCase().trim();
    return pool.filter((item) => {
      const name = item.name || item.title || '';
      return name.toLowerCase().includes(q);
    });
  }, [searchQuery, allSectionStreams, streams]);

  // Al cambiar la búsqueda, restablecer el foco a la primera tarjeta
  useEffect(() => {
    setFocusedGridIndex(0);
  }, [searchQuery]);

  // Auto-scroll del elemento enfocado en categorías
  useEffect(() => {
    if (focusZone === 'categories') {
      catItemRefs.current[focusedCatIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusedCatIndex, focusZone]);

  // Auto-scroll del elemento enfocado en la cuadrícula
  useEffect(() => {
    if (focusZone === 'grid') {
      gridItemRefs.current[focusedGridIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusedGridIndex, focusZone]);

  // Auto-scroll del episodio enfocado en modal de series
  useEffect(() => {
    if (focusZone === 'series_modal' && seriesFocusZone === 'episodes') {
      episodeItemRefs.current[focusedEpisodeIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusedEpisodeIndex, focusZone, seriesFocusZone]);

  // 3. Cargar información cinematográfica de la película enfocada (Hero Preview - Imagen 1)
  const fetchMetadataForFocusedItem = useCallback(async (item: XtreamStream | XtreamSeries) => {
    const isSeries = contentType === 'series';
    const id = isSeries ? (item as XtreamSeries).series_id : (item as XtreamStream).stream_id;
    const itemTitle = item.name || (item as any).title || 'Sin Título';

    if (metadataCacheRef.current.has(id)) {
      setFocusedMetadata(metadataCacheRef.current.get(id)!);
      return;
    }

    // Inicial con datos básicos
    const rawInitialCover = (item as any).cover || (item as any).stream_icon || (item as any).movie_image;
    const initialCover = normalizeMediaUrl(rawInitialCover, server);

    const initialMeta: MediaMetadata = {
      title: itemTitle,
      rating: item.rating || '7.0',
      year: (item as any).releaseDate ? (item as any).releaseDate.substring(0, 4) : '2025',
      duration: undefined,
      genres: (item as any).genre || '',
      cast: 'Cargando información...',
      director: 'Cargando información...',
      plot: (item as any).plot || 'Cargando sinopsis oficial...',
      backdropUrl: initialCover,
      posterUrl: initialCover,
      containerExtension: (item as any).container_extension || 'mp4',
    };
    setFocusedMetadata(initialMeta);

    // Si es película VOD, consultar get_vod_info para sinopsis real, actores y director
    if (contentType === 'movies') {
      try {
        const vodDetails = await XtreamService.getVodInfo(server, user, pass, id);
        const info = vodDetails?.info || {};
        const movieData = vodDetails?.movie_data || {};

        let rawBackdrop = (info.backdrop_path && info.backdrop_path.length > 0)
          ? info.backdrop_path[0]
          : (info.movie_image || info.cover_big || (item as any).cover || (item as XtreamStream).stream_icon);
        let backdrop = normalizeMediaUrl(rawBackdrop, server);

        let plot = info.plot || info.description;
        let cast = info.actors || info.cast;
        let director = info.director;

        // Si el servidor Xtream no provee sinopsis o backdrop, recurrir a TMDB
        if (!plot || !backdrop) {
          try {
            const tmdb = await TmdbService.enrichMovie(itemTitle, (item as XtreamStream).stream_icon);
            if (tmdb) {
              plot = plot || tmdb.synopsis;
              backdrop = backdrop || normalizeMediaUrl(tmdb.backdropUrl, server);
            }
          } catch {
            // Continuar con los datos disponibles de Xtream
          }
        }

        const rawPoster = info.cover_big || info.movie_image || (item as any).cover || (item as XtreamStream).stream_icon;
        const poster = normalizeMediaUrl(rawPoster, server);

        const completeMeta: MediaMetadata = {
          title: info.name || itemTitle,
          rating: info.rating || item.rating || '7.0',
          year: info.releasedate ? info.releasedate.substring(0, 4) : initialMeta.year,
          duration: info.duration || (info.episode_run_time ? `${info.episode_run_time} min` : '1h 45m'),
          genres: info.genre || initialMeta.genres,
          cast: cast || 'Reparto no disponible',
          director: director || 'Director no disponible',
          plot: plot || 'Sin sinopsis disponible para este título.',
          backdropUrl: backdrop,
          posterUrl: poster,
          containerExtension: info.container_extension || movieData.container_extension || (item as any).container_extension || 'mp4',
          youtubeTrailer: info.youtube_trailer,
        };

        metadataCacheRef.current.set(id, completeMeta);
        setFocusedMetadata(completeMeta);
      } catch (err) {
        console.warn('No se pudo obtener información extendida de VOD:', err);
      }
    }
  }, [contentType, server, user, pass]);

  // Ejecutar carga de metadatos cuando cambia el ítem enfocado
  useEffect(() => {
    if (displayedStreams.length > 0 && displayedStreams[focusedGridIndex]) {
      const timer = setTimeout(() => {
        fetchMetadataForFocusedItem(displayedStreams[focusedGridIndex]);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [focusedGridIndex, displayedStreams, fetchMetadataForFocusedItem]);

  // Manejar cuando el usuario pulsa OK/Enter en una tarjeta
  const handleItemSelect = async (item: XtreamStream | XtreamSeries) => {
    if (contentType === 'movies') {
      const vod = item as XtreamStream;
      const streamId = vod.stream_id || (vod as any).id;
      const meta = metadataCacheRef.current.get(streamId) || focusedMetadata || {
        title: vod.name || 'Película',
        posterUrl: vod.stream_icon,
        backdropUrl: vod.stream_icon,
        rating: vod.rating || '7.0',
        genres: '',
        plot: 'Presiona reproducir para iniciar la película.',
        containerExtension: vod.container_extension || 'mp4',
      };

      const ext = meta.containerExtension || vod.container_extension || 'mp4';
      const streamUrl = XtreamService.buildVodStreamUrl(server, user, pass, streamId, ext);

      // Abrir pantalla completa de detalles (Imagen 2)
      setSelectedMovieDetail({
        item: vod,
        meta,
        streamUrl,
      });
      setDetailBtnIndex(0);
      setFocusZone('movie_detail');
    } else if (contentType === 'live') {
      // Para canales de TV, reproducir directo con soporte de extensión (.ts nativo o .m3u8)
      const live = item as XtreamStream;
      const streamId = (live as any).stream_id ?? (live as any).id;
      const rawExt = (live as any).container_extension || (live as any).extension || (live as any).ext || 'ts';
      const cleanExt = String(rawExt).replace(/^\.+/, '').trim() || 'ts';
      const streamUrl = (live as any).direct_source && String((live as any).direct_source).startsWith('http')
        ? (live as any).direct_source
        : XtreamService.buildLiveStreamUrl(server, user, pass, streamId, cleanExt);

      onPlayStream({
        id: `live_${streamId}`,
        title: live.name || 'Canal de TV',
        streamUrl,
        posterUrl: live.stream_icon,
        isLive: true,
      });
    } else {
      // Para Series, abrir modal de episodios
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
          setSeriesFocusZone('episodes');
          setFocusZone('series_modal');
        } else {
          const streamUrl = XtreamService.buildSeriesStreamUrl(server, user, pass, seriesId, 'mp4');
          onPlayStream({
            id: `series_${seriesId}`,
            title: series.name || 'Serie',
            streamUrl,
            posterUrl: series.cover,
            isLive: false,
          });
        }
      } catch (err) {
        console.error('Error al cargar episodios:', err);
      } finally {
        setLoadingSeriesModal(false);
      }
    }
  };

  // Reproducir un episodio de serie
  const playEpisode = (episode: EpisodeItem) => {
    if (!selectedSeriesDetails) return;
    const series = selectedSeriesDetails.series;

    // 1. Obtener ID del episodio de forma exhaustiva (id, episode_id, stream_id)
    const epId = (episode as any).id ?? (episode as any).episode_id ?? (episode as any).stream_id;
    if (!epId) {
      console.error('[Series] No se encontró ID válido para el episodio:', episode);
      return;
    }

    // 2. Extraer y limpiar extensión sin punto (ej. "mp4", "mkv", "avi")
    const rawExt = (episode as any).container_extension || 
                   (episode as any).extension || 
                   (episode as any).ext || 
                   episode.info?.container_extension || 
                   (episode.info as any)?.extension || 
                   'mp4';
    const cleanExt = String(rawExt).replace(/^\.+/, '').trim() || 'mp4';

    // 3. Generar enlace de reproducción con XtreamService o direct_source si viene lista
    const streamUrl = (episode as any).direct_source && String((episode as any).direct_source).startsWith('http')
      ? (episode as any).direct_source
      : XtreamService.buildSeriesStreamUrl(server, user, pass, epId, cleanExt);

    const epNum = episode.episode_num ?? (episode as any).num ?? 1;
    const epTitle = episode.title || `Episodio ${epNum}`;

    console.log(`[Series Play] Serie: ${series.name}, Temporada: ${selectedSeasonNumber}, Ep: ${epNum}, ID: ${epId}, Ext: ${cleanExt}, URL: ${streamUrl}`);

    onPlayStream({
      id: `series_${epId}`,
      title: `${series.name} - T${selectedSeasonNumber}E${epNum}: ${epTitle}`,
      streamUrl,
      posterUrl: episode.info?.movie_image || series.cover,
      isLive: false,
    });
  };

  const currentSeasonEpisodes: EpisodeItem[] = 
    selectedSeriesDetails?.episodes[String(selectedSeasonNumber)] ||
    selectedSeriesDetails?.episodes[selectedSeasonNumber] ||
    [];

  // 🎮 Motor de Navegación D-Pad para Control Remoto TV
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloquear scroll nativo
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

      // ── CASO 1: PANTALLA COMPLETA DE DETALLES DE PELÍCULA ──
      if (focusZone === 'movie_detail' && selectedMovieDetail) {
        if (isOk) {
          e.preventDefault();
          if (detailBtnIndex === 0) {
            // Botón 0: Reproducir en el reproductor interno
            onPlayStream({
              id: `vod_${selectedMovieDetail.item.stream_id}`,
              title: selectedMovieDetail.meta.title,
              streamUrl: selectedMovieDetail.streamUrl,
              posterUrl: selectedMovieDetail.meta.posterUrl,
              isLive: false,
            });
          } else if (detailBtnIndex === 1) {
            // Botón 1: Añadir / Quitar de Favoritos
            const { toggleFavorite } = useFavoritesStore.getState();
            toggleFavorite({
              id: `vod_${selectedMovieDetail.item.stream_id}`,
              title: selectedMovieDetail.meta.title,
              type: 'movie',
              posterUrl: selectedMovieDetail.meta.posterUrl,
              backdropUrl: selectedMovieDetail.meta.backdropUrl,
              streamUrl: selectedMovieDetail.streamUrl,
              year: selectedMovieDetail.meta.year,
              rating: selectedMovieDetail.meta.rating,
              genresText: selectedMovieDetail.meta.genres,
            });
          } else if (detailBtnIndex === 2) {
            // Botón 2: Ver Tráiler
            if (selectedMovieDetail.meta.youtubeTrailer) {
              window.open(`https://www.youtube.com/watch?v=${selectedMovieDetail.meta.youtubeTrailer}`, '_blank');
            } else {
              window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedMovieDetail.meta.title + ' trailer')}`, '_blank');
            }
          }
          return;
        }

        if (isBack) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedMovieDetail(null);
          setFocusZone('grid');
          return;
        }

        switch (e.key) {
          case 'ArrowLeft':
            setDetailBtnIndex((prev) => Math.max(0, prev - 1));
            break;

          case 'ArrowRight':
            setDetailBtnIndex((prev) => Math.min(2, prev + 1));
            break;
        }
        return;
      }

      // ── CASO 2: MODAL DE EPISODIOS DE SERIES ──
      if (focusZone === 'series_modal' && selectedSeriesDetails) {
        e.preventDefault();
        e.stopPropagation();
        const seasonsList = selectedSeriesDetails.seasons || [];
        const numEpisodeCols = 2;

        if (isOk) {
          if (seriesFocusZone === 'episodes' && currentSeasonEpisodes[focusedEpisodeIndex]) {
            playEpisode(currentSeasonEpisodes[focusedEpisodeIndex]);
          } else if (seriesFocusZone === 'seasons') {
            setSeriesFocusZone('episodes');
            setFocusedEpisodeIndex(0);
          } else if (seriesFocusZone === 'close') {
            setSelectedSeriesDetails(null);
            setFocusZone('grid');
          }
          return;
        }

        if (isBack) {
          setSelectedSeriesDetails(null);
          setFocusZone('grid');
          return;
        }

        switch (e.key) {
          case 'ArrowLeft':
            if (seriesFocusZone === 'seasons') {
              if (focusedSeasonIndex > 0) {
                const prev = focusedSeasonIndex - 1;
                setFocusedSeasonIndex(prev);
                setSelectedSeasonNumber(seasonsList[prev]?.season_number || prev + 1);
                setFocusedEpisodeIndex(0);
              }
            } else if (seriesFocusZone === 'episodes') {
              setFocusedEpisodeIndex((prev) => {
                if (prev % numEpisodeCols === 1) {
                  return prev - 1;
                }
                return prev;
              });
            }
            break;

          case 'ArrowRight':
            if (seriesFocusZone === 'seasons') {
              if (focusedSeasonIndex < seasonsList.length - 1) {
                const next = focusedSeasonIndex + 1;
                setFocusedSeasonIndex(next);
                setSelectedSeasonNumber(seasonsList[next]?.season_number || next + 1);
                setFocusedEpisodeIndex(0);
              }
            } else if (seriesFocusZone === 'episodes') {
              setFocusedEpisodeIndex((prev) => {
                if (prev % numEpisodeCols === 0 && prev + 1 < currentSeasonEpisodes.length) {
                  return prev + 1;
                }
                return prev;
              });
            }
            break;

          case 'ArrowUp':
            if (seriesFocusZone === 'episodes') {
              setFocusedEpisodeIndex((prev) => {
                if (prev >= numEpisodeCols) {
                  return prev - numEpisodeCols;
                }
                setSeriesFocusZone('seasons');
                return prev;
              });
            } else if (seriesFocusZone === 'seasons') {
              setSeriesFocusZone('close');
            }
            break;

          case 'ArrowDown':
            if (seriesFocusZone === 'close') {
              setSeriesFocusZone('seasons');
            } else if (seriesFocusZone === 'seasons') {
              if (currentSeasonEpisodes.length > 0) {
                setSeriesFocusZone('episodes');
                setFocusedEpisodeIndex(0);
              }
            } else if (seriesFocusZone === 'episodes') {
              setFocusedEpisodeIndex((prev) => {
                const nextDown = prev + numEpisodeCols;
                if (nextDown < currentSeasonEpisodes.length) {
                  return nextDown;
                }
                if (prev % numEpisodeCols === 1 && prev + 1 < currentSeasonEpisodes.length) {
                  return prev + 1;
                }
                return prev;
              });
            }
            break;
        }
        return;
      }

      // ── CASO 3: CATÁLOGO PRINCIPAL (TIVIMATE STYLE - IMAGEN 1) ──
      if (isOk) {
        e.preventDefault();
        if (focusZone === 'sidebar_back') {
          onClose();
        } else if (focusZone === 'sidebar_search') {
          searchInputRef.current?.focus();
        } else if (focusZone === 'categories') {
          if (categories[focusedCatIndex]) {
            setSelectedCategoryId(categories[focusedCatIndex].category_id);
            if (displayedStreams.length > 0) {
              setFocusZone('grid');
              setFocusedGridIndex(0);
            }
          }
        } else if (focusZone === 'grid') {
          // Iniciar temporizador de 2.5s para Favoritos en el catálogo
          if (!isHoldingOkRef.current) {
            isHoldingOkRef.current = true;
            hasTriggeredLongPressRef.current = false;
            const currentItem = displayedStreams[focusedGridIndex];

            const startTime = Date.now();
            holdIntervalRef.current = window.setInterval(() => {
              const elapsed = Date.now() - startTime;
              setHoldProgress(Math.min(100, Math.round((elapsed / 2500) * 100)));
            }, 50);

            holdTimerRef.current = window.setTimeout(() => {
              hasTriggeredLongPressRef.current = true;
              if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
              setHoldProgress(0);

              if (currentItem) {
                const isLive = contentType === 'live';
                const isSeries = contentType === 'series';
                const id = isLive
                  ? `live_${(currentItem as any).stream_id ?? (currentItem as any).id}`
                  : isSeries
                  ? `series_${(currentItem as any).series_id ?? (currentItem as any).id}`
                  : `vod_${(currentItem as any).stream_id ?? (currentItem as any).id}`;

                setQuickFavItem({
                  id,
                  title: currentItem.name || (currentItem as any).title || 'Sin Título',
                  posterUrl: (currentItem as any).stream_icon || (currentItem as any).cover,
                  backdropUrl: (currentItem as any).cover || (currentItem as any).stream_icon,
                  type: isLive ? 'live' : isSeries ? 'series' : 'movie',
                });
                setIsQuickFavOpen(true);
              }
            }, 2500);
          }
          return;
        }
        return;
      }

      if (isBack) {
        e.preventDefault();
        e.stopPropagation();
        if (focusZone === 'grid') {
          if (searchQuery.trim().length > 0) {
            setFocusZone('sidebar_search');
            searchInputRef.current?.focus();
          } else {
            setFocusZone('categories');
          }
        } else if (focusZone === 'sidebar_search') {
          setFocusZone('categories');
          searchInputRef.current?.blur();
        } else if (focusZone === 'categories' || focusZone === 'sidebar_back') {
          if (searchQuery.trim().length > 0) {
            setSearchQuery('');
          } else {
            onClose();
          }
        } else {
          onClose();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          if (focusZone === 'grid') {
            if (focusedGridIndex % numCols === 0) {
              // Si está en la primera columna, pasa al panel de categorías o barra de búsqueda
              if (searchQuery.trim().length > 0) {
                setFocusZone('sidebar_search');
                searchInputRef.current?.focus();
              } else {
                setFocusZone('categories');
              }
            } else {
              setFocusedGridIndex((prev) => Math.max(0, prev - 1));
            }
          }
          break;

        case 'ArrowRight':
          if (focusZone === 'categories' || focusZone === 'sidebar_search') {
            if (displayedStreams.length > 0) {
              setFocusZone('grid');
              setFocusedGridIndex(0);
              searchInputRef.current?.blur();
            }
          } else if (focusZone === 'grid') {
            if (focusedGridIndex < displayedStreams.length - 1) {
              setFocusedGridIndex((prev) => prev + 1);
            }
          }
          break;

        case 'ArrowUp':
          if (focusZone === 'sidebar_back') {
            // Ya está en el botón superior
          } else if (focusZone === 'sidebar_search') {
            setFocusZone('sidebar_back');
            searchInputRef.current?.blur();
          } else if (focusZone === 'categories') {
            if (focusedCatIndex > 0) {
              const nextIdx = focusedCatIndex - 1;
              setFocusedCatIndex(nextIdx);
              if (categories[nextIdx]) {
                setSelectedCategoryId(categories[nextIdx].category_id);
              }
            } else {
              // Subir a la barra de búsqueda de la sección
              setFocusZone('sidebar_search');
              searchInputRef.current?.focus();
            }
          } else if (focusZone === 'grid') {
            if (focusedGridIndex >= numCols) {
              setFocusedGridIndex((prev) => prev - numCols);
            }
          }
          break;

        case 'ArrowDown':
          if (focusZone === 'sidebar_back') {
            setFocusZone('sidebar_search');
            searchInputRef.current?.focus();
          } else if (focusZone === 'sidebar_search') {
            setFocusZone('categories');
            setFocusedCatIndex(0);
            searchInputRef.current?.blur();
          } else if (focusZone === 'categories') {
            if (focusedCatIndex < categories.length - 1) {
              const nextIdx = focusedCatIndex + 1;
              setFocusedCatIndex(nextIdx);
              if (categories[nextIdx]) {
                setSelectedCategoryId(categories[nextIdx].category_id);
              }
            }
          } else if (focusZone === 'grid') {
            if (focusedGridIndex + numCols < displayedStreams.length) {
              setFocusedGridIndex((prev) => prev + numCols);
            } else if (focusedGridIndex < displayedStreams.length - 1) {
              setFocusedGridIndex(displayedStreams.length - 1);
            }
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const isOk =
        e.key === 'Enter' ||
        e.key === ' ' ||
        e.key === 'Select' ||
        e.key === 'Ok' ||
        e.keyCode === 13 ||
        e.keyCode === 23 ||
        e.keyCode === 66;

      if (isOk) {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        if (holdIntervalRef.current) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = null;
        }
        setHoldProgress(0);

        const wasLongPress = hasTriggeredLongPressRef.current;
        isHoldingOkRef.current = false;
        hasTriggeredLongPressRef.current = false;

        if (wasLongPress) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        if (focusZone === 'grid' && displayedStreams[focusedGridIndex]) {
          handleItemSelect(displayedStreams[focusedGridIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, [
    isActive,
    focusZone,
    focusedCatIndex,
    focusedGridIndex,
    categories,
    streams,
    displayedStreams,
    searchQuery,
    numCols,
    onClose,
    selectedMovieDetail,
    detailBtnIndex,
    selectedSeriesDetails,
    seriesFocusZone,
    focusedSeasonIndex,
    focusedEpisodeIndex,
    currentSeasonEpisodes,
  ]);

  const activeCategory = categories.find((c) => c.category_id === selectedCategoryId);

  return (
    <div className="fixed inset-0 z-50 bg-[#070A12] text-white flex overflow-hidden select-none font-sans">
      {/* ── BARRA LATERAL IZQUIERDA: CATEGORÍAS (IMAGEN 1) ── */}
      <aside className="w-80 border-r border-white/10 bg-[#0B0F1C] flex flex-col shrink-0 z-20 shadow-2xl">
        {/* Botón Volver arriba de la barra lateral */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <button
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center space-x-2 ${
              focusZone === 'sidebar_back'
                ? 'bg-cyan-400 text-black ring-4 ring-cyan-300 scale-105 shadow-xl shadow-cyan-400/50'
                : 'bg-white/5 hover:bg-white/10 text-zinc-300'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Inicio</span>
          </button>

          {loading && <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
        </div>

        {/* 🔍 Barra de Búsqueda de la Sección (Películas, Series o Canales) */}
        <div className="px-4 py-2.5 border-b border-white/5">
          <div
            onClick={() => {
              setFocusZone('sidebar_search');
              searchInputRef.current?.focus();
            }}
            className={`relative rounded-xl border transition-all flex items-center px-3 py-2 cursor-pointer ${
              focusZone === 'sidebar_search'
                ? 'bg-zinc-800 border-cyan-400 ring-2 ring-cyan-400/60 shadow-lg'
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <Search className={`w-4 h-4 mr-2.5 shrink-0 ${focusZone === 'sidebar_search' ? 'text-cyan-400' : 'text-zinc-400'}`} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setFocusZone('sidebar_search')}
              placeholder={
                contentType === 'movies'
                  ? 'Buscar en películas...'
                  : contentType === 'series'
                    ? 'Buscar en series...'
                    : 'Buscar en canales...'
              }
              className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none w-full"
            />
            {loadingSearchAll ? (
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin mr-1 shrink-0" />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  loadOrRefreshSectionCache(true);
                }}
                className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-cyan-400 transition mr-0.5"
                title="Actualizar catálogo desde el servidor"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            )}
            {searchQuery && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Encabezado de la lista */}
        <div className="px-5 pt-3 pb-2 text-[11px] font-black uppercase tracking-wider text-zinc-400">
          Categorías ({categories.length})
        </div>

        {/* Lista de Carpetas/Categorías */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scroll-smooth">
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
                className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center space-x-3 ${
                  isFocused
                    ? 'bg-white text-black font-black ring-4 ring-cyan-400 scale-102 shadow-2xl shadow-cyan-500/50 z-10'
                    : isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Folder className={`w-4 h-4 shrink-0 ${isFocused ? 'text-black fill-black' : isSelected ? 'text-cyan-400' : 'text-zinc-500'}`} />
                <span className="truncate flex-1">{cat.category_name}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── PANEL PRINCIPAL DERECHO: HERO INFO (ARRIBA) + CARROUSEL DE PELÍCULAS (ABAJO) ── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#070A12] relative">
        {/* 🎬 1. SECCIÓN SUPERIOR: HERO INFO CINEMÁTICO (IMAGEN 1) */}
        <div className="relative h-72 w-full border-b border-white/10 shrink-0 overflow-hidden bg-gradient-to-r from-[#070A12] via-[#070A12]/90 to-transparent flex items-center">
          {/* Imagen de fondo desenfocada/fundida a la derecha */}
          {focusedMetadata?.backdropUrl && (
            <div className="absolute right-0 top-0 bottom-0 w-3/5 overflow-hidden pointer-events-none">
              <img
                src={focusedMetadata.backdropUrl}
                alt={focusedMetadata.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover object-center opacity-40 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070A12] via-[#070A12]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-transparent to-transparent" />
            </div>
          )}

          {/* Información textual de la película enfocada */}
          <div className="relative z-10 max-w-2xl px-10 py-6 flex flex-col justify-center">
            <h1 className="text-3xl font-black text-white tracking-wide line-clamp-1 drop-shadow-md">
              {focusedMetadata?.title || 'Selecciona un contenido'}
            </h1>

            {/* Fila de Insignias y Datos Rápidos: [7.0] 2025 • 1h 57m • Géneros */}
            <div className="flex items-center space-x-3 mt-2 text-xs text-zinc-300 font-bold">
              {focusedMetadata?.rating && (
                <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-black">
                  {focusedMetadata.rating}
                </span>
              )}
              {focusedMetadata?.year && <span>{focusedMetadata.year}</span>}
              {focusedMetadata?.duration && <span>• {focusedMetadata.duration}</span>}
              {focusedMetadata?.genres && !focusedMetadata.genres.includes('VOD') && !focusedMetadata.genres.includes('Película') && (
                <span className="text-zinc-400">• {focusedMetadata.genres}</span>
              )}
            </div>

            {/* Reparto (Cast) */}
            {focusedMetadata?.cast && (
              <p className="text-xs text-zinc-300 mt-2.5 line-clamp-1">
                <span className="text-zinc-500 font-bold mr-1.5">Cast:</span>
                {focusedMetadata.cast}
              </p>
            )}

            {/* Director */}
            {focusedMetadata?.director && (
              <p className="text-xs text-zinc-300 mt-0.5 line-clamp-1">
                <span className="text-zinc-500 font-bold mr-1.5">Director:</span>
                {focusedMetadata.director}
              </p>
            )}

            {/* Sinopsis Oficial */}
            <p className="text-xs text-zinc-400 mt-2.5 line-clamp-3 leading-relaxed max-w-xl">
              {focusedMetadata?.plot || 'Explora los títulos con las flechas del control remoto para ver su sinopsis completa.'}
            </p>
          </div>
        </div>

        {/* 🎞️ 2. SECCIÓN INFERIOR: CARRUSEL DE TARJETAS (IMAGEN 1) */}
        <div className="flex-1 overflow-y-auto px-10 py-4 flex flex-col scroll-smooth">
          {/* Título de la Categoría Activa o Búsqueda */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase text-white flex items-center space-x-2">
              {searchQuery.trim() ? (
                <>
                  <span className="text-cyan-400">Resultados para &quot;{searchQuery}&quot;</span>
                  <span className="text-xs text-zinc-500 font-normal">
                    ({displayedStreams.length} {contentType === 'live' ? 'canales' : contentType === 'series' ? 'series' : 'películas'})
                  </span>
                </>
              ) : (
                <>
                  <span className="text-cyan-400">{activeCategory?.category_name || 'Contenido'}</span>
                  <span className="text-xs text-zinc-500 font-normal">
                    ({displayedStreams.length} {contentType === 'live' ? 'canales' : 'títulos'})
                  </span>
                </>
              )}
            </h2>

            {(loadingStreams || loadingSeriesModal || loadingSearchAll) && (
              <div className="flex items-center space-x-2 text-xs text-cyan-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>
                  {loadingSeriesModal 
                    ? 'Cargando episodios de la serie...' 
                    : loadingSearchAll 
                      ? 'Buscando en todo el catálogo...' 
                      : 'Cargando lista...'}
                </span>
              </div>
            )}
          </div>

          {/* Estado Vacío de Búsqueda */}
          {displayedStreams.length === 0 && !loadingStreams && !loadingSearchAll && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-zinc-500">
              <Search className="w-12 h-12 mb-3 text-zinc-600 opacity-60" />
              <p className="text-sm font-bold text-zinc-300">
                {searchQuery.trim() 
                  ? `No se encontraron resultados para "${searchQuery}"` 
                  : 'No hay contenidos disponibles en esta categoría'}
              </p>
              <p className="text-xs mt-1 text-zinc-500">
                {searchQuery.trim() 
                  ? 'Intenta buscar con otra palabra clave en esta sección.' 
                  : 'Selecciona otra categoría en el menú lateral.'}
              </p>
            </div>
          )}

          {/* Skeleton Shimmer durante la carga inicial de la categoría */}
          {loadingStreams && displayedStreams.length === 0 && (
            <div className={contentType !== 'live' ? "grid grid-cols-5 gap-5 pb-8" : "grid grid-cols-4 gap-3 pb-8"}>
              {Array.from({ length: contentType !== 'live' ? 10 : 8 }).map((_, i) => (
                contentType !== 'live' ? (
                  <div key={i} className="flex flex-col space-y-2">
                    <div className="aspect-[2/3] w-full rounded-2xl shimmer-effect border border-white/5" />
                    <div className="h-3 w-3/4 rounded-md shimmer-effect opacity-60" />
                  </div>
                ) : (
                  <div key={i} className="p-3.5 rounded-2xl bg-[#0E1424] border border-white/5 flex items-center space-x-3 shimmer-effect">
                    <div className="w-12 h-12 rounded-xl bg-black/40 shrink-0" />
                    <div className="h-3 flex-1 rounded-md bg-white/10" />
                  </div>
                )
              ))}
            </div>
          )}

          {/* Cuadrícula / Fila de Posters (5 Columnas fijas para D-Pad 1:1) */}
          {contentType !== 'live' ? (
            <div className="grid grid-cols-5 gap-5 pb-8">
              {displayedStreams.map((item, idx) => (
                <CatalogPosterCard
                  key={(item as any).stream_id || (item as any).series_id || idx}
                  item={item}
                  isFocused={focusZone === 'grid' && focusedGridIndex === idx}
                  contentType={contentType}
                  server={server}
                  onSelect={() => {
                    setFocusedGridIndex(idx);
                    handleItemSelect(item);
                  }}
                  innerRef={(el) => { gridItemRefs.current[idx] = el; }}
                />
              ))}
            </div>
          ) : (
            /* Lista de Canales de TV en Vivo */
            <div className="grid grid-cols-4 gap-3 pb-8">
              {displayedStreams.map((live, idx) => {
                const stream = live as XtreamStream;
                const title = stream.name || `Canal #${stream.stream_id}`;
                const isFocused = focusZone === 'grid' && focusedGridIndex === idx;

                return (
                  <div
                    key={stream.stream_id || idx}
                    ref={(el) => { gridItemRefs.current[idx] = el; }}
                    onClick={() => {
                      setFocusedGridIndex(idx);
                      handleItemSelect(stream);
                    }}
                    className={`p-3.5 rounded-2xl flex items-center space-x-3 cursor-pointer transition shadow-md ${
                      isFocused
                        ? 'bg-gradient-to-r from-cyan-900/70 to-blue-900/70 border-2 border-cyan-400 ring-4 ring-cyan-400/50 scale-105 z-10'
                        : 'bg-[#0E1424] hover:bg-cyan-950/40 border border-white/5'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 p-1">
                      {stream.stream_icon ? (
                        <img
                          src={normalizeMediaUrl(stream.stream_icon, server)}
                          alt={title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Radio className="w-5 h-5 text-cyan-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-bold truncate ${isFocused ? 'text-cyan-300 font-extrabold' : 'text-white'}`}>
                        {title}
                      </h4>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── 3. PANTALLA COMPLETA DE DETALLES DE PELÍCULA (IMAGEN 2) ── */}
      {selectedMovieDetail && (
        <div className="fixed inset-0 z-60 bg-[#070A12] flex flex-col justify-between p-12 overflow-hidden animate-fadeIn">
          {/* Gran Imagen de Fondo Cinemática */}
          {selectedMovieDetail.meta.backdropUrl && (
            <div className="absolute inset-0 pointer-events-none">
              <img
                src={selectedMovieDetail.meta.backdropUrl}
                alt={selectedMovieDetail.meta.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-35 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070A12] via-[#070A12]/85 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-[#070A12]/60 to-transparent" />
            </div>
          )}

          {/* Información Superior: Título, Metadatos, Cast, Director y Sinopsis */}
          <div className="relative z-10 max-w-3xl space-y-4">
            <h1 className="text-4xl font-black text-white tracking-wide drop-shadow-xl">
              {selectedMovieDetail.meta.title}
            </h1>

            {/* Badges: [7.0] 2025 • 1h 57m • Bélica / Acción / Drama */}
            <div className="flex items-center space-x-3 text-sm font-bold text-zinc-300">
              {selectedMovieDetail.meta.rating && (
                <span className="px-2.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black">
                  {selectedMovieDetail.meta.rating}
                </span>
              )}
              {selectedMovieDetail.meta.year && <span>{selectedMovieDetail.meta.year}</span>}
              {selectedMovieDetail.meta.duration && <span>• {selectedMovieDetail.meta.duration}</span>}
              {selectedMovieDetail.meta.genres && <span className="text-zinc-300">• {selectedMovieDetail.meta.genres}</span>}
            </div>

            {/* Cast */}
            {selectedMovieDetail.meta.cast && (
              <p className="text-sm text-zinc-300">
                <span className="text-zinc-500 font-bold mr-2">Cast:</span>
                {selectedMovieDetail.meta.cast}
              </p>
            )}

            {/* Director */}
            {selectedMovieDetail.meta.director && (
              <p className="text-sm text-zinc-300">
                <span className="text-zinc-500 font-bold mr-2">Director:</span>
                {selectedMovieDetail.meta.director}
              </p>
            )}

            {/* Sinopsis Completa */}
            <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl pt-2">
              {selectedMovieDetail.meta.plot}
            </p>
          </div>

          {/* Botones de Acción Inferiores (Imagen 2) */}
          <div className="relative z-10 flex items-center space-x-4 pt-6">
            {/* 1. Botón Reproducir */}
            <button
              onClick={() => {
                onPlayStream({
                  id: `vod_${selectedMovieDetail.item.stream_id}`,
                  title: selectedMovieDetail.meta.title,
                  streamUrl: selectedMovieDetail.streamUrl,
                  posterUrl: selectedMovieDetail.meta.posterUrl,
                  isLive: false,
                });
              }}
              className={`px-8 py-3.5 rounded-xl font-black text-sm transition-all duration-200 flex items-center space-x-2.5 ${
                detailBtnIndex === 0
                  ? 'bg-white text-black ring-4 ring-cyan-400 scale-105 shadow-2xl shadow-cyan-400/50'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Reproducir</span>
            </button>

            {/* 2. Botón Añadir a Favoritos */}
            <button
              onClick={() => {
                const { toggleFavorite } = useFavoritesStore.getState();
                toggleFavorite({
                  id: `vod_${selectedMovieDetail.item.stream_id}`,
                  title: selectedMovieDetail.meta.title,
                  type: 'movie',
                  posterUrl: selectedMovieDetail.meta.posterUrl,
                  backdropUrl: selectedMovieDetail.meta.backdropUrl,
                  streamUrl: selectedMovieDetail.streamUrl,
                  year: selectedMovieDetail.meta.year,
                  rating: selectedMovieDetail.meta.rating,
                  genresText: selectedMovieDetail.meta.genres,
                });
              }}
              className={`px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center space-x-2 ${
                detailBtnIndex === 1
                  ? 'bg-cyan-400 text-black ring-4 ring-cyan-300 scale-105 shadow-2xl shadow-cyan-400/50'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${useFavoritesStore.getState().isFavorite(`vod_${selectedMovieDetail.item.stream_id}`) ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{useFavoritesStore.getState().isFavorite(`vod_${selectedMovieDetail.item.stream_id}`) ? 'En Favoritos' : 'Añadir a Favoritos'}</span>
            </button>

            {/* 3. Botón Ver Tráiler */}
            <button
              onClick={() => {
                if (selectedMovieDetail.meta.youtubeTrailer) {
                  window.open(`https://www.youtube.com/watch?v=${selectedMovieDetail.meta.youtubeTrailer}`, '_blank');
                } else {
                  window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedMovieDetail.meta.title + ' trailer')}`, '_blank');
                }
              }}
              className={`px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center space-x-2 ${
                detailBtnIndex === 2
                  ? 'bg-cyan-400 text-black ring-4 ring-cyan-300 scale-105 shadow-2xl shadow-cyan-400/50'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Ver Tráiler</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 4. MODAL DE EPISODIOS DE SERIES ── */}
      {selectedSeriesDetails && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-xl flex flex-col p-10 animate-fadeIn">
          <div className="flex items-start justify-between border-b border-white/10 pb-6 shrink-0">
            <div className="flex items-center space-x-6">
              {selectedSeriesDetails.series.cover && (
                <img
                  src={normalizeMediaUrl(selectedSeriesDetails.series.cover, server)}
                  alt={selectedSeriesDetails.series.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-28 object-cover rounded-xl border border-white/20 shadow-xl"
                />
              )}
              <div>
                <h2 className="text-2xl font-black text-white">{selectedSeriesDetails.series.name}</h2>
                <div className="flex items-center space-x-4 mt-1.5 text-xs text-zinc-300">
                  <span className="text-zinc-300 font-semibold">{selectedSeriesDetails.series.genre || 'Serie'}</span>
                  <span>{selectedSeriesDetails.seasons.length} Temporadas</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedSeriesDetails(null);
                setFocusZone('grid');
              }}
              className={`p-3 rounded-full transition ${
                focusZone === 'series_modal' && seriesFocusZone === 'close'
                  ? 'bg-cyan-400 text-black ring-4 ring-cyan-300 scale-110 shadow-lg'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Temporadas */}
          <div className="flex items-center space-x-3 py-4 shrink-0 border-b border-white/5">
            {selectedSeriesDetails.seasons.map((season, sIdx) => {
              const sNum = season.season_number || sIdx + 1;
              const isSelected = selectedSeasonNumber === sNum;
              const isFocused = focusZone === 'series_modal' && seriesFocusZone === 'seasons' && focusedSeasonIndex === sIdx;

              return (
                <button
                  key={sNum}
                  onClick={() => {
                    setSelectedSeasonNumber(sNum);
                    setFocusedSeasonIndex(sIdx);
                    setFocusedEpisodeIndex(0);
                    setSeriesFocusZone('episodes');
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                    isSelected
                      ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40'
                      : 'bg-[#131826] text-zinc-400 hover:text-white border border-white/10'
                  } ${isFocused ? 'ring-4 ring-cyan-300 scale-105 z-10' : ''}`}
                >
                  {season.name || `Temporada ${sNum}`}
                </button>
              );
            })}
          </div>

          {/* Episodios */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {currentSeasonEpisodes.map((ep, eIdx) => {
                const isEpFocused = focusZone === 'series_modal' && seriesFocusZone === 'episodes' && focusedEpisodeIndex === eIdx;

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
          </div>
        </div>
      )}

      {/* ⭐ Menú Rápido de Favoritos por pulsación de 3 segundos en Catálogo */}
      <QuickFavoriteModal
        isOpen={isQuickFavOpen}
        item={quickFavItem}
        isFavorite={quickFavItem ? isFavorite(quickFavItem.id) : false}
        onToggleFavorite={() => {
          if (quickFavItem) {
            toggleFavorite(quickFavItem);
          }
        }}
        onPlay={() => {
          if (quickFavItem) {
            const currentItem = displayedStreams[focusedGridIndex];
            if (currentItem) {
              handleItemSelect(currentItem);
            }
          }
        }}
        onClose={() => {
          setIsQuickFavOpen(false);
          setQuickFavItem(null);
        }}
      />

      {/* ⏱️ Indicador visual de progreso de 3 segundos al presionar Enter */}
      <HoldProgressIndicator
        progress={holdProgress}
        title={displayedStreams[focusedGridIndex]?.name || (displayedStreams[focusedGridIndex] as any)?.title}
      />
    </div>
  );
};
