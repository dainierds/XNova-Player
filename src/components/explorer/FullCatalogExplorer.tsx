import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, 
  Folder, 
  Play, 
  RefreshCw, 
  Video, 
  X,
  Film,
  Search,
  RotateCw,
  Heart,
  Star,
  Check,
  Clock,
  Tv
} from 'lucide-react';
import type { PlaylistAccount } from '../../types';
import { XtreamService, type XtreamCategory, type XtreamStream, type XtreamSeries } from '../../services/xtream';
import { TmdbService } from '../../services/tmdb';
import { CatalogCacheService, type CompactCatalogItem } from '../../services/catalogCacheService';
import { ImagePreloadService } from '../../services/imagePreloadService';
import { PosterResolutionService } from '../../services/posterResolutionService';
import { usePlaylistStore } from '../../store/usePlaylistStore';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAdminFeaturedStore, type FeaturedBadge } from '../../store/useAdminFeaturedStore';
import { useContinueWatchingStore } from '../../store/useContinueWatchingStore';
import { QuickFavoriteModal, type QuickFavoriteItem } from '../common/QuickFavoriteModal';
import { HoldProgressIndicator } from '../common/HoldProgressIndicator';
import type { SeriesContextData, SeriesEpisodeData, LiveCategoryContextData, LiveChannelData } from '../../types/showcase';

/**
 * Normaliza URLs de imágenes de servidores IPTV / Xtream Codes y TMDb
 * Resuelve automáticamente puertos SSL 443, rutas relativas y caracteres especiales
 */
const normalizeMediaUrl = (url?: string, serverBase?: string): string => {
  if (!url) return '';
  let trimmed = String(url).trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '';
  
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // Si serverBase está disponible, obtener su hostname
  let sBaseHost = '';
  try {
    if (serverBase) sBaseHost = new URL(serverBase).hostname;
  } catch {}

  // Corregir URLs HTTP hacia puertos SSL (443) o del mismo servidor IPTV HTTPS
  if (trimmed.startsWith('http://')) {
    if (trimmed.includes(':443') || (sBaseHost && trimmed.includes(sBaseHost) && serverBase?.startsWith('https://'))) {
      trimmed = trimmed.replace(/^http:\/\//i, 'https://');
    }
  }

  // Si es un hash o archivo directo de TMDb (/abc123xyz.jpg o abc123xyz.jpg)
  if (/^\/?[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(trimmed) && !trimmed.toLowerCase().includes('default') && !trimmed.toLowerCase().includes('logo')) {
    const cleanFile = trimmed.replace(/^\/+/, '');
    return `https://image.tmdb.org/t/p/w500/${cleanFile}`;
  }

  // Rutas relativas sin protocolo (/images/... o images/...)
  if (!/^https?:\/\//i.test(trimmed)) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    if (serverBase) {
      return `${serverBase.replace(/\/+$/, '')}${cleanPath}`;
    }
    return `https://image.tmdb.org/t/p/w500${cleanPath}`;
  }
  
  return trimmed.replace(/ /g, '%20');
};

/**
 * Componente robusto de Logo para canales de TV en vivo
 * Prueba stream_icon, icon, logo, tvg_logo, con auto-recuperación y badges inteligentes de ligas y canales
 */
const ChannelLogo = React.memo<{
  stream: XtreamStream;
  server: string;
  title: string;
}>(({ stream, server, title }) => {
  const rawUrl = (stream as any).stream_icon || (stream as any).icon || (stream as any).logo || (stream as any).tvg_logo || (stream as any).cover;
  const initialUrl = normalizeMediaUrl(rawUrl, server);

  const [currentSrc, setCurrentSrc] = useState<string>(initialUrl);
  const [hasFailed, setHasFailed] = useState<boolean>(!initialUrl);

  useEffect(() => {
    const nextUrl = normalizeMediaUrl(rawUrl, server);
    setCurrentSrc(nextUrl);
    setHasFailed(!nextUrl);
  }, [rawUrl, server]);

  const handleError = () => {
    if (currentSrc.startsWith('https://') && !currentSrc.includes(':443')) {
      setCurrentSrc(currentSrc.replace(/^https:\/\//i, 'http://'));
    } else if (currentSrc.startsWith('http://') && currentSrc.includes(':443')) {
      setCurrentSrc(currentSrc.replace(/^http:\/\//i, 'https://'));
    } else {
      setHasFailed(true);
    }
  };

  if (hasFailed || !currentSrc) {
    const lower = title.toLowerCase();

    // ⚾ MLB / Béisbol
    if (lower.includes('mlb') || lower.includes('baseball') || lower.includes('beisbol') || lower.includes('⚾')) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-950 to-red-950 rounded-lg p-0.5 border border-blue-500/40 shadow-inner">
          <span className="text-[12px] leading-none">⚾</span>
          <span className="text-[9px] font-black tracking-tighter text-blue-200 mt-0.5">MLB</span>
        </div>
      );
    }

    // 🏀 NBA / WNBA / Baloncesto
    if (lower.includes('nba') || lower.includes('wnba') || lower.includes('basket') || lower.includes('baloncesto') || lower.includes('🏀')) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-800 via-orange-950 to-black rounded-lg p-0.5 border border-orange-500/40 shadow-inner">
          <span className="text-[12px] leading-none">🏀</span>
          <span className="text-[9px] font-black tracking-tighter text-orange-200 mt-0.5">NBA</span>
        </div>
      );
    }

    // 🏈 NFL / American Football
    if (lower.includes('nfl') || lower.includes('football') || lower.includes('touchdown') || lower.includes('super bowl') || lower.includes('🏈')) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-950 to-blue-950 rounded-lg p-0.5 border border-emerald-500/40 shadow-inner">
          <span className="text-[12px] leading-none">🏈</span>
          <span className="text-[9px] font-black tracking-tighter text-emerald-200 mt-0.5">NFL</span>
        </div>
      );
    }

    // ⚽ Fútbol / Soccer / Champions / LaLiga / Premier
    if (lower.includes('futbol') || lower.includes('fútbol') || lower.includes('soccer') || lower.includes('laliga') || lower.includes('premier') || lower.includes('champions') || lower.includes('uefa') || lower.includes('fifa') || lower.includes('⚽')) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-green-900 via-emerald-950 to-black rounded-lg p-0.5 border border-emerald-500/40 shadow-inner">
          <span className="text-[12px] leading-none">⚽</span>
          <span className="text-[8px] font-black tracking-tighter text-green-200 mt-0.5 uppercase">LIGA</span>
        </div>
      );
    }

    // 🥊 UFC / MMA / Boxeo / WWE
    if (lower.includes('ufc') || lower.includes('mma') || lower.includes('box') || lower.includes('wwe') || lower.includes('fight') || lower.includes('pelea') || lower.includes('🥊')) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-900 via-rose-950 to-black rounded-lg p-0.5 border border-rose-500/40 shadow-inner">
          <span className="text-[12px] leading-none">🥊</span>
          <span className="text-[9px] font-black tracking-tighter text-rose-200 mt-0.5">UFC</span>
        </div>
      );
    }

    // 🏎️ F1 / Motorsport
    if (lower.includes('f1') || lower.includes('formula') || lower.includes('nascar') || lower.includes('motogp') || lower.includes('racing') || lower.includes('🏁')) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-950 via-zinc-900 to-black rounded-lg p-0.5 border border-red-500/40 shadow-inner">
          <span className="text-[12px] leading-none">🏎️</span>
          <span className="text-[9px] font-black tracking-tighter text-red-200 mt-0.5">F1</span>
        </div>
      );
    }

    // 📺 Canales famosos de noticias / deportes
    if (lower.includes('espn')) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-red-700 rounded-lg p-1 border border-red-500 shadow-md">
          <span className="text-[11px] font-black italic tracking-tighter text-white">ESPN</span>
        </div>
      );
    }
    if (lower.includes('fox')) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-blue-700 rounded-lg p-1 border border-blue-500 shadow-md">
          <span className="text-[11px] font-black tracking-tighter text-white">FOX</span>
        </div>
      );
    }
    if (lower.includes('tudn')) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-amber-600 rounded-lg p-1 border border-amber-400 shadow-md">
          <span className="text-[10px] font-black tracking-tighter text-white">TUDN</span>
        </div>
      );
    }
    if (lower.includes('hbo')) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900 rounded-lg p-1 border border-zinc-600 shadow-md">
          <span className="text-[11px] font-black tracking-wider text-white">HBO</span>
        </div>
      );
    }

    // ✅ Canal informativo o actualización
    if (lower.includes('actual') || lower.includes('aviso') || lower.includes('info') || lower.includes('guia') || lower.includes('✅')) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-teal-900 via-cyan-950 to-black rounded-lg p-0.5 border border-cyan-400/50 shadow-inner">
          <span className="text-[12px] leading-none">✅</span>
          <span className="text-[8px] font-black tracking-tighter text-cyan-200 mt-0.5">INFO</span>
        </div>
      );
    }

    // Siglas limpias automáticas (ej: "11/18" -> "11/18", o primeras 3-4 letras del canal)
    const cleanName = title
      .replace(/^(fhd|hd|sd|4k|uhd|hevc|vip)\s*[-:|]\s*/i, '')
      .replace(/[★✅⭐|]/g, '')
      .trim();

    const initials = cleanName.slice(0, 4).toUpperCase();

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-cyan-950 rounded-lg p-1 border border-cyan-500/30 text-cyan-300">
        <Tv className="w-3.5 h-3.5 text-cyan-400 mb-0.5 opacity-80" />
        <span className="text-[9px] font-black tracking-tighter truncate max-w-full text-center">
          {initials || 'TV'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={title}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={handleError}
      className="w-full h-full object-contain p-0.5"
    />
  );
});

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

const CatalogPosterCard = React.memo<CatalogPosterCardProps>(
  ({
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
      : ((item as any).cover || (item as any).movie_image || (item as any).cover_big || (item as any).icon || (item as any).stream_icon || (item as any).poster);
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

          {/* Barra de progreso de reproducción para Continuar Viendo */}
          {typeof (item as any).progressPercent === 'number' && (item as any).progressPercent > 0 && (
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/75 overflow-hidden">
              <div
                className="h-full bg-cyan-400 shadow-sm"
                style={{ width: `${Math.min(100, Math.max(5, (item as any).progressPercent))}%` }}
              />
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
  },
  (prev, next) => {
    return (
      prev.isFocused === next.isFocused &&
      prev.item === next.item &&
      prev.contentType === next.contentType &&
      prev.server === next.server
    );
  }
);

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
    seriesContext?: SeriesContextData;
    liveContext?: LiveCategoryContextData;
  }) => void;
  initialSelectedItem?: any | null;
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
  initialSelectedItem = null,
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
  // 🚀 Fila actual de scroll para la ventana de renderizado virtualizada (Opción 1)
  const [scrollRow, setScrollRow] = useState<number>(0);

  // ⏱️ Historial / Continuar Viendo persistente
  const {
    items: continueWatchingList,
    loadItems: loadContinueWatching,
    removeItem: removeFromContinueWatching,
  } = useContinueWatchingStore();

  useEffect(() => {
    loadContinueWatching();
  }, [loadContinueWatching]);

  const sectionContinueWatching = useMemo(() => {
    return continueWatchingList.filter((item) => {
      if (contentType === 'movies') return item.type === 'movie' || !item.type;
      if (contentType === 'series') return item.type === 'series';
      if (contentType === 'live') return item.type === 'live';
      return true;
    });
  }, [continueWatchingList, contentType]);

  // Carpeta "Continuar Viendo" siempre ubicada antes de la primera categoría
  const continueWatchingCategory: XtreamCategory = useMemo(
    () => ({
      category_id: 'continue_watching',
      category_name: 'Continuar Viendo',
      parent_id: 0,
    }),
    []
  );

  const allCategories = useMemo(() => {
    return [continueWatchingCategory, ...categories];
  }, [continueWatchingCategory, categories]);

  // 👑 Modo Administrador: fijar contenido en Portada y control por ratón
  const { isAdmin } = useAuthStore();
  const { addFeaturedItem } = useAdminFeaturedStore();
  const [adminPinModalItem, setAdminPinModalItem] = useState<any | null>(null);
  const [adminPinBadge, setAdminPinBadge] = useState<FeaturedBadge>('ESTRENO');
  const [adminPinSuccessToast, setAdminPinSuccessToast] = useState<string | null>(null);

  // 🔍 Búsqueda general dentro de la sección activa (Películas, Series o Canales)
  const [searchQuery, setSearchQuery] = useState('');
  const [allSectionStreams, setAllSectionStreams] = useState<(XtreamStream | XtreamSeries)[] | null>(null);
  const [loadingSearchAll, setLoadingSearchAll] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // 🎮 Estados de navegación D-Pad para TV
  const [focusZone, setFocusZone] = useState<FocusZone>('categories');
  const [focusedCatIndex, setFocusedCatIndex] = useState(0);
  const [focusedGridIndex, setFocusedGridIndex] = useState(0);

  // ⚡ Cambio de categoría instantáneo (0ms) sin retardos ni sombras rezagadas
  const categoryDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCategoryChange = useCallback((catId: string, immediate = true) => {
    if (categoryDebounceTimerRef.current) {
      clearTimeout(categoryDebounceTimerRef.current);
      categoryDebounceTimerRef.current = null;
    }

    if (immediate) {
      PosterResolutionService.clearQueue();
      setSelectedCategoryId(catId);
    } else {
      categoryDebounceTimerRef.current = setTimeout(() => {
        PosterResolutionService.clearQueue();
        setSelectedCategoryId(catId);
      }, 40);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (categoryDebounceTimerRef.current) {
        clearTimeout(categoryDebounceTimerRef.current);
      }
    };
  }, []);

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

  // ⚡ Carga dinámica inmediata de sinopsis real, actores, director y fondo al abrir Detalles de Película
  useEffect(() => {
    if (!selectedMovieDetail) return;
    let isCancelled = false;

    const loadFullDetails = async () => {
      const streamId = selectedMovieDetail.item.stream_id || (selectedMovieDetail.item as any).id;
      const title = selectedMovieDetail.meta.title;

      try {
        // 1. Consultar Xtream VOD info si el ID es numérico
        let fullInfo: any = null;
        if (/^\d+$/.test(String(streamId))) {
          try {
            const res = await XtreamService.getVodInfo(server, user, pass, streamId);
            if (res?.info) fullInfo = res.info;
          } catch {}
        }

        // 2. Consultar TMDb para tener sinopsis cinemática, carátula HD, fondo panorámico, reparto y director
        let tmdbInfo: any = null;
        try {
          tmdbInfo = await TmdbService.enrichMovie(title);
        } catch {
          tmdbInfo = null;
        }

        if (isCancelled) return;

        const rawBackdrop = (fullInfo?.backdrop_path && fullInfo.backdrop_path.length > 0)
          ? fullInfo.backdrop_path[0]
          : (tmdbInfo?.backdropUrl || fullInfo?.movie_image || fullInfo?.cover_big || selectedMovieDetail.meta.backdropUrl);

        const rawPoster = fullInfo?.cover_big || fullInfo?.movie_image || tmdbInfo?.posterUrl || selectedMovieDetail.meta.posterUrl;

        const cast = fullInfo?.actors || fullInfo?.cast || tmdbInfo?.cast || '';
        const director = fullInfo?.director || tmdbInfo?.director || '';
        const plot = fullInfo?.plot || fullInfo?.description || tmdbInfo?.synopsis || 'Disfruta de esta película en máxima calidad.';

        setSelectedMovieDetail((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            meta: {
              ...prev.meta,
              title: fullInfo?.name || tmdbInfo?.title || prev.meta.title,
              rating: fullInfo?.rating || tmdbInfo?.rating || prev.meta.rating,
              year: fullInfo?.releasedate ? fullInfo.releasedate.substring(0, 4) : (tmdbInfo?.year || prev.meta.year),
              duration: fullInfo?.duration || (fullInfo?.episode_run_time ? `${fullInfo.episode_run_time} min` : (tmdbInfo?.duration || prev.meta.duration)),
              genres: fullInfo?.genre || (tmdbInfo?.genres ? tmdbInfo.genres.join(', ') : prev.meta.genres),
              cast,
              director,
              plot,
              backdropUrl: normalizeMediaUrl(rawBackdrop, server) || prev.meta.backdropUrl,
              posterUrl: normalizeMediaUrl(rawPoster, server) || prev.meta.posterUrl,
              youtubeTrailer: fullInfo?.youtube_trailer || tmdbInfo?.trailerYoutubeKey || tmdbInfo?.youtubeKey || prev.meta.youtubeTrailer,
            },
          };
        });
      } catch (err) {
        console.warn('Error cargando detalles completos de película:', err);
      }
    };

    loadFullDetails();
    return () => { isCancelled = true; };
  }, [selectedMovieDetail?.item?.stream_id, selectedMovieDetail?.meta?.title, server, user, pass]);

  // ⭐ Favoritos y pulsación de 3 segundos
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const [quickFavItem, setQuickFavItem] = useState<QuickFavoriteItem | null>(null);
  const [isQuickFavOpen, setIsQuickFavOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const isHoldingOkRef = useRef(false);
  const hasTriggeredLongPressRef = useRef(false);

  // Limpiar temporizadores de pulsación solo al desmontar el componente
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

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
  const gridScrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Número fijo de columnas para cálculo matemático 1:1 en control remoto
  const numCols = contentType === 'live' ? 4 : 5;

  // 🎬 Abrir directamente la pantalla de información de película o selección de capítulos si viene de la pantalla principal
  useEffect(() => {
    if (!initialSelectedItem) return;

    let isMounted = true;
    const item = initialSelectedItem;
    const isSeries = item.type === 'series' || initialType === 'series' || String(item.id).startsWith('series_');

    if (isSeries) {
      const rawId = String(item.id).replace('series_', '');
      const loadInitialSeries = async () => {
        setLoadingSeriesModal(true);
        try {
          let seriesId: string | number = rawId;
          // Si el ID no es numérico (ej: viene de TMDb o datos mock), buscar el ID real en Xtream
          if (!/^\d+$/.test(String(rawId))) {
            const match = await CatalogCacheService.findBestMatch(playlist.id, item.title, item.tmdbId, 'series');
            if (match && match.id) {
              seriesId = match.id;
            }
          }

          const details = await XtreamService.getSeriesInfo(server, user, pass, seriesId);
          if (!isMounted) return;

          const seasons = details.seasons || [];
          const episodes = details.episodes || {};
          const seasonKeys = Object.keys(episodes);

          if (seasonKeys.length > 0) {
            const firstSeasonNum = Number(seasonKeys[0]) || 1;
            const seriesObj: XtreamSeries = {
              num: 1,
              name: details.info?.name || item.title || 'Serie',
              series_id: Number(seriesId) || 0,
              cover: details.info?.cover || item.thumbnailUrl || item.posterUrl || '',
              plot: details.info?.plot || item.synopsis || '',
              cast: (details.info as any)?.cast || item.actors || '',
              director: (details.info as any)?.director || item.director || '',
              genre: details.info?.genre || item.genresText || '',
              releaseDate: details.info?.releaseDate || item.year || '',
              rating: details.info?.rating || item.rating || '8.8',
              category_id: (details.info as any)?.category_id || '0',
            };

            setSelectedSeriesDetails({
              series: seriesObj,
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
            // Si la serie no devolvió episodios con ese ID, intentar resolver por nombre en catálogo
            const match = await CatalogCacheService.findBestMatch(playlist.id, item.title, item.tmdbId, 'series');
            if (match && match.id && String(match.id) !== String(seriesId)) {
              const retryDetails = await XtreamService.getSeriesInfo(server, user, pass, match.id);
              if (retryDetails.episodes && Object.keys(retryDetails.episodes).length > 0 && isMounted) {
                const sKeys = Object.keys(retryDetails.episodes);
                setSelectedSeriesDetails({
                  series: {
                    num: 1,
                    name: retryDetails.info?.name || item.title || 'Serie',
                    series_id: match.id,
                    cover: retryDetails.info?.cover || item.thumbnailUrl || item.posterUrl || '',
                    plot: retryDetails.info?.plot || item.synopsis,
                    rating: retryDetails.info?.rating || '8.8',
                  } as any,
                  seasons: retryDetails.seasons || sKeys.map((k) => ({ season_number: Number(k), name: `Temporada ${k}` })),
                  episodes: retryDetails.episodes,
                });
                setSelectedSeasonNumber(Number(sKeys[0]) || 1);
                setFocusedEpisodeIndex(0);
                setFocusedSeasonIndex(0);
                setSeriesFocusZone('episodes');
                setFocusZone('series_modal');
              }
            }
          }
        } catch (err) {
          console.error('[Series Modal] Error al cargar info de serie:', err);
        } finally {
          if (isMounted) setLoadingSeriesModal(false);
        }
      };

      loadInitialSeries();
    } else {
      // Es una película: Abrir la pantalla completa de información de película (con botón Reproducir)
      const rawId = String(item.id).replace('vod_', '').replace('movie_', '');
      const loadInitialMovie = async () => {
        try {
          let streamId: string | number = rawId;
          let matchedItem: any = null;

          if (!/^\d+$/.test(String(rawId))) {
            const match = await CatalogCacheService.findBestMatch(playlist.id, item.title, item.tmdbId, 'movies');
            if (match && match.id) {
              streamId = match.id;
              matchedItem = match;
            }
          }

          const rawExt = item.container_extension || matchedItem?.ext || 'mp4';
          const streamUrl = (item.streamUrl && !item.streamUrl.includes('test-streams.mux.dev'))
            ? item.streamUrl
            : XtreamService.buildVodStreamUrl(server, user, pass, streamId, rawExt);

          let meta: MediaMetadata = {
            title: item.title || 'Película',
            posterUrl: item.posterUrl || item.thumbnailUrl || (matchedItem ? normalizeMediaUrl(matchedItem.icon, server) : ''),
            backdropUrl: item.backdropUrl || item.posterUrl || item.thumbnailUrl || '',
            rating: item.rating || '8.0',
            year: item.year || '2026',
            duration: item.duration || 'Película',
            genres: item.genresText || (item.genres ? item.genres.join(', ') : 'Película'),
            cast: item.actors || item.cast || 'Reparto cargando...',
            director: item.director || 'Director cargando...',
            plot: item.synopsis || 'Presiona reproducir para iniciar la película.',
            containerExtension: rawExt,
            youtubeTrailer: item.trailerYoutubeKey,
          };

          if (/^\d+$/.test(String(streamId))) {
            try {
              const vodDetails = await XtreamService.getVodInfo(server, user, pass, streamId);
              const info = vodDetails?.info || {};
              const movieData = vodDetails?.movie_data || {};

              let rawBackdrop = (info.backdrop_path && info.backdrop_path.length > 0)
                ? info.backdrop_path[0]
                : (info.movie_image || info.cover_big || meta.backdropUrl);
              let backdrop = normalizeMediaUrl(rawBackdrop, server) || meta.backdropUrl;

              meta = {
                title: info.name || meta.title,
                rating: info.rating || meta.rating,
                year: info.releasedate ? info.releasedate.substring(0, 4) : meta.year,
                duration: info.duration || (info.episode_run_time ? `${info.episode_run_time} min` : meta.duration),
                genres: info.genre || meta.genres,
                cast: info.actors || info.cast || meta.cast,
                director: info.director || meta.director,
                plot: info.plot || info.description || meta.plot,
                backdropUrl: backdrop,
                posterUrl: normalizeMediaUrl(info.cover_big || info.movie_image, server) || meta.posterUrl,
                containerExtension: movieData.container_extension || info.container_extension || rawExt,
                youtubeTrailer: info.youtube_trailer || meta.youtubeTrailer,
              };
            } catch {
              // Mantener metadatos base
            }
          }

          if (!isMounted) return;

          const vodObj: XtreamStream = {
            num: 1,
            name: meta.title,
            stream_type: 'movie',
            stream_id: Number(streamId) || 0,
            stream_icon: meta.posterUrl || '',
            rating: meta.rating,
            container_extension: meta.containerExtension,
            category_id: '0',
          };

          setSelectedMovieDetail({
            item: vodObj,
            meta,
            streamUrl,
          });
          setDetailBtnIndex(0);
          setFocusZone('movie_detail');
        } catch (err) {
          console.error('[Movie Detail] Error al cargar detalle de película:', err);
        }
      };

      loadInitialMovie();
    }

    return () => { isMounted = false; };
  }, [initialSelectedItem, server, user, pass, playlist.id, initialType]);

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
        // 🚀 A. Intentar leer categorías desde IndexedDB en 0ms
        const localCats = await CatalogCacheService.getCategories(playlist.id, contentType);
        if (localCats && localCats.length > 0) {
          globalCategoriesCache.set(cacheKey, localCats);
          if (isMounted) {
            setCategories(localCats);
            if (!selectedCategoryId) {
              setSelectedCategoryId(String(localCats[0].category_id));
            }
            setLoading(false);
          }
          return;
        }
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

    if (selectedCategoryId === 'continue_watching') {
      return;
    }

    const streamsKey = `${server}_${user}_${contentType}_${selectedCategoryId}`;

    // 🚀 Si ya tenemos los streams de esta carpeta en RAM, mostrarlos inmediatamente en 0ms
    if (globalCategoryStreamsCache.has(streamsKey)) {
      const cached = globalCategoryStreamsCache.get(streamsKey)!;
      setStreams(cached);
      setLoadingStreams(false);
      // Precarga suave en segundo plano de las primeras 15 carátulas (filas inmediatamente visibles)
      const urls = cached.slice(0, 15).map((item) => {
        const rawCover = contentType === 'series'
          ? ((item as any).cover || (item as any).icon || (item as any).stream_icon || (item as any).poster)
          : ((item as any).cover || (item as any).movie_image || (item as any).cover_big || (item as any).icon || (item as any).stream_icon || (item as any).poster);
        return normalizeMediaUrl(rawCover, server);
      });
      ImagePreloadService.preloadBatch(urls);
      return;
    }

    const loadStreams = async () => {
      // 🚀 A. Intentar filtrar en 0ms desde la caché local en memoria IndexedDB (Sin esperas ni red)
      try {
        const fullCached = await CatalogCacheService.get(playlist.id, contentType, true);
        if (fullCached && fullCached.length > 0) {
          setAllSectionStreams(fullCached as any);
          const filtered = selectedCategoryId === 'all'
            ? fullCached
            : fullCached.filter((it: any) => String(it.cat) === String(selectedCategoryId));

          globalCategoryStreamsCache.set(streamsKey, filtered as any);

          if (isMounted) {
            setStreams(filtered as any);
            setLoadingStreams(false);
            setFocusedGridIndex(0);

            const urls = filtered.slice(0, 15).map((item: any) => {
              return normalizeMediaUrl(item.icon, server);
            });
            ImagePreloadService.preloadBatch(urls);
          }
          return;
        }
      } catch (cacheErr) {
        console.warn('Error leyendo caché local en Explorer:', cacheErr);
      }

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
          const urls = validItems.slice(0, 15).map((item) => {
            const rawCover = contentType === 'series'
              ? ((item as any).cover || (item as any).icon || (item as any).stream_icon || (item as any).poster)
              : ((item as any).cover || (item as any).movie_image || (item as any).cover_big || (item as any).icon || (item as any).stream_icon || (item as any).poster);
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

  // 2b. Cargar / actualizar contenidos reactivos de "Continuar Viendo"
  useEffect(() => {
    if (selectedCategoryId === 'continue_watching') {
      const mappedStreams = sectionContinueWatching.map((item) => ({
        stream_id: item.id,
        series_id: item.id,
        id: item.id,
        name: item.title,
        title: item.title,
        stream_icon: item.posterUrl,
        cover: item.posterUrl,
        icon: item.posterUrl,
        poster: item.posterUrl,
        rating: item.rating || '7.0',
        year: item.year,
        progressPercent: item.progressPercent,
        currentTime: item.currentTime,
        duration: item.duration,
        streamUrl: item.streamUrl,
        type: item.type,
        isContinueWatchingItem: true,
      } as any));

      setStreams(mappedStreams);
      setLoadingStreams(false);
      setFocusedGridIndex(0);
    }
  }, [selectedCategoryId, sectionContinueWatching]);

  // 🚀 Precarga suave de pósters en memoria RAM (estilo Glide en Kai TV)
  useEffect(() => {
    if (streams && streams.length > 0) {
      const urls = streams.slice(0, 20).map((item) => {
        const rawCover = (item as any).cover || (item as any).movie_image || (item as any).cover_big || (item as any).icon || (item as any).stream_icon;
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

  // Referencias síncronas para el control remoto y listeners de teclado
  const displayedStreamsRef = useRef(displayedStreams);
  displayedStreamsRef.current = displayedStreams;
  const focusedGridIndexRef = useRef(focusedGridIndex);
  focusedGridIndexRef.current = focusedGridIndex;
  const focusZoneRef = useRef(focusZone);
  focusZoneRef.current = focusZone;
  const selectedCategoryIdRef = useRef(selectedCategoryId);
  selectedCategoryIdRef.current = selectedCategoryId;

  // Función universal para abrir menú de opciones (0s con botón MENU, clic o al soltar)
  const openQuickMenu = useCallback((item?: any) => {
    const target = item || displayedStreamsRef.current[focusedGridIndexRef.current];
    if (!target) return;

    const isLive = contentType === 'live' || target.type === 'live';
    const isSeries = contentType === 'series' || target.type === 'series';
    const rawId = target.stream_id ?? target.series_id ?? target.id;
    const id = String(rawId).startsWith('live_') || String(rawId).startsWith('series_') || String(rawId).startsWith('vod_')
      ? String(rawId)
      : (isLive ? `live_${rawId}` : isSeries ? `series_${rawId}` : `vod_${rawId}`);

    setQuickFavItem({
      id,
      title: target.name || target.title || 'Sin Título',
      posterUrl: target.stream_icon || target.cover || target.poster,
      backdropUrl: target.cover || target.stream_icon || target.backdropUrl,
      type: isLive ? 'live' : isSeries ? 'series' : 'movie',
      streamUrl: target.streamUrl,
    });
    setIsQuickFavOpen(true);
  }, [contentType]);

  // Capturar evento nativo 'contextmenu' (disparado automáticamente por Android TV al mantener pulsado)
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (!isActive) return;
      if (selectedCategoryIdRef.current === 'continue_watching' || focusZoneRef.current === 'grid') {
        e.preventDefault();
        e.stopPropagation();
        const currentItem = displayedStreamsRef.current[focusedGridIndexRef.current];
        if (currentItem) {
          openQuickMenu(currentItem);
        }
      }
    };
    window.addEventListener('contextmenu', handleContextMenu, true);
    return () => window.removeEventListener('contextmenu', handleContextMenu, true);
  }, [isActive, openQuickMenu]);

  // Al cambiar la búsqueda o categoría, restablecer el foco y scroll al inicio
  useEffect(() => {
    ImagePreloadService.cancelAllPending();

    setScrollRow(0);
    setFocusedGridIndex(0);
    if (gridScrollContainerRef.current) {
      gridScrollContainerRef.current.scrollTop = 0;
    }
  }, [searchQuery, selectedCategoryId]);

  // Al desmontar el explorador, limpiar colas de red activas
  useEffect(() => {
    return () => {
      ImagePreloadService.cancelAllPending();
      PosterResolutionService.clearQueue();
    };
  }, []);

  // Auto-scroll del elemento enfocado en categorías (modo 'auto' instantáneo para máxima fluidez en TVs)
  useEffect(() => {
    if (focusZone === 'categories') {
      catItemRefs.current[focusedCatIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'auto',
      });
    }
  }, [focusedCatIndex, focusZone]);

  // Auto-scroll del elemento enfocado en la cuadrícula
  useEffect(() => {
    if (focusZone === 'grid') {
      const cols = contentType === 'live' ? 4 : 5;
      if (focusedGridIndex < cols) {
        // En la primera fila, garantizar que el contenedor esté en la cima absoluta (top: 0)
        // para que las portadas se vean 100% completas con sus esquinas redondeadas y anillo de foco intactos
        if (gridScrollContainerRef.current) {
          gridScrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
      } else {
        gridItemRefs.current[focusedGridIndex]?.scrollIntoView({
          block: 'nearest',
          behavior: 'auto',
        });
      }
    }
  }, [focusedGridIndex, focusZone, contentType]);

  // Auto-scroll del episodio enfocado en modal de series
  useEffect(() => {
    if (focusZone === 'series_modal' && seriesFocusZone === 'episodes') {
      episodeItemRefs.current[focusedEpisodeIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'auto',
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

    // Si es canal de TV en vivo: configurar metadatos de emisión en directo
    if (contentType === 'live') {
      const activeCat = categories.find((c) => String(c.category_id) === String(selectedCategoryId));
      const catName = activeCat?.category_name || (item as any).category_name || 'En Directo';
      const liveMeta: MediaMetadata = {
        title: itemTitle,
        rating: 'EN VIVO',
        year: '',
        duration: undefined,
        genres: catName,
        cast: '',
        director: '',
        plot: (item as any).epg_now || (item as any).plot || `Señal de televisión en directo (${catName}). Presiona OK para sintonizar en pantalla completa.`,
        backdropUrl: initialCover,
        posterUrl: initialCover,
        containerExtension: 'ts',
      };
      metadataCacheRef.current.set(id, liveMeta);
      setFocusedMetadata(liveMeta);
      return;
    }

    // Si es serie: enriquecer con TMDb
    if (contentType === 'series') {
      try {
        const tmdb = await TmdbService.enrichSeries(itemTitle, initialCover);
        const seriesMeta: MediaMetadata = {
          title: tmdb.title || itemTitle,
          rating: tmdb.rating || item.rating || '8.5',
          year: tmdb.year || '2026',
          duration: 'Serie TV',
          genres: tmdb.genres ? tmdb.genres.join(', ') : ((item as any).genre || 'Serie'),
          cast: tmdb.cast || '',
          director: tmdb.director || '',
          plot: tmdb.synopsis || 'Temporadas y capítulos disponibles en tu lista.',
          backdropUrl: tmdb.backdropUrl || initialCover,
          posterUrl: tmdb.posterUrl || initialCover,
          containerExtension: 'mkv',
          youtubeTrailer: tmdb.trailerYoutubeKey,
        };
        metadataCacheRef.current.set(id, seriesMeta);
        setFocusedMetadata(seriesMeta);
      } catch {
        const fallbackMeta: MediaMetadata = {
          title: itemTitle,
          rating: item.rating || '8.0',
          year: '2026',
          genres: (item as any).genre || 'Serie',
          cast: '',
          director: '',
          plot: (item as any).plot || 'Consulta los episodios disponibles presionando OK.',
          backdropUrl: initialCover,
          posterUrl: initialCover,
          containerExtension: 'mkv',
        };
        setFocusedMetadata(fallbackMeta);
      }
      return;
    }

    const initialMeta: MediaMetadata = {
      title: itemTitle,
      rating: item.rating || '7.5',
      year: (item as any).releaseDate ? (item as any).releaseDate.substring(0, 4) : '2025',
      duration: undefined,
      genres: (item as any).genre || '',
      cast: '',
      director: '',
      plot: (item as any).plot || '',
      backdropUrl: initialCover,
      posterUrl: initialCover,
      containerExtension: (item as any).container_extension || 'mp4',
    };
    setFocusedMetadata(initialMeta);

    // Si es película VOD, consultar get_vod_info y TMDb para sinopsis real, actores y director
    if (contentType === 'movies') {
      try {
        let info: any = {};
        let movieData: any = {};

        if (/^\d+$/.test(String(id))) {
          try {
            const vodDetails = await XtreamService.getVodInfo(server, user, pass, id);
            info = vodDetails?.info || {};
            movieData = vodDetails?.movie_data || {};
          } catch {}
        }

        let rawBackdrop = (info.backdrop_path && info.backdrop_path.length > 0)
          ? info.backdrop_path[0]
          : (info.movie_image || info.cover_big || (item as any).cover || (item as XtreamStream).stream_icon);
        let backdrop = normalizeMediaUrl(rawBackdrop, server);

        let plot = info.plot || info.description;
        let cast = info.actors || info.cast;
        let director = info.director;
        let trailerKey = info.youtube_trailer;

        // Consultar TMDb para completar datos faltantes
        try {
          const tmdb = await TmdbService.enrichMovie(itemTitle, (item as XtreamStream).stream_icon);
          if (tmdb) {
            plot = plot || tmdb.synopsis;
            backdrop = backdrop || normalizeMediaUrl(tmdb.backdropUrl, server);
            cast = cast || tmdb.cast;
            director = director || tmdb.director;
            trailerKey = trailerKey || tmdb.trailerYoutubeKey;
          }
        } catch {
          // Continuar con los datos disponibles de Xtream
        }

        const rawPoster = info.cover_big || info.movie_image || (item as any).cover || (item as XtreamStream).stream_icon;
        const poster = normalizeMediaUrl(rawPoster, server);

        const completeMeta: MediaMetadata = {
          title: info.name || itemTitle,
          rating: info.rating || item.rating || '7.5',
          year: info.releasedate ? info.releasedate.substring(0, 4) : initialMeta.year,
          duration: info.duration || (info.episode_run_time ? `${info.episode_run_time} min` : '1h 45m'),
          genres: info.genre || initialMeta.genres,
          cast: cast || '',
          director: director || '',
          plot: plot || 'Disfruta de este título en máxima calidad.',
          backdropUrl: backdrop,
          posterUrl: poster,
          containerExtension: (item as any).container_extension || movieData.container_extension || info.container_extension || 'mkv',
          youtubeTrailer: trailerKey,
        };

        metadataCacheRef.current.set(id, completeMeta);
        setFocusedMetadata(completeMeta);
      } catch (err) {
        console.warn('No se pudo obtener información extendida de VOD:', err);
      }
    }
  }, [contentType, server, user, pass, categories, selectedCategoryId]);

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
    // 0. Si es un elemento de "Continuar Viendo", continuar la reproducción directamente de inmediato
    if ((item as any).isContinueWatchingItem || selectedCategoryId === 'continue_watching') {
      const rawStreamUrl = (item as any).streamUrl;
      if (rawStreamUrl) {
        const streamId = (item as any).stream_id || (item as any).id || (item as any).series_id || `item_${(item as any).id}`;
        onPlayStream({
          id: String(streamId),
          title: item.name || (item as any).title || 'Continuar Viendo',
          streamUrl: rawStreamUrl,
          posterUrl: (item as any).stream_icon || (item as any).cover || (item as any).poster,
          isLive: contentType === 'live',
        });
        return;
      }
    }

    if (contentType === 'movies') {
      const vod = item as XtreamStream;
      const streamId = vod.stream_id || (vod as any).id;
      const meta = metadataCacheRef.current.get(streamId) || focusedMetadata || {
        title: vod.name || (vod as any).title || 'Película',
        posterUrl: vod.stream_icon || (vod as any).cover || (vod as any).poster,
        backdropUrl: (vod as any).backdropUrl || vod.stream_icon || (vod as any).cover,
        rating: vod.rating || '7.0',
        genres: (vod as any).genresText || '',
        plot: 'Presiona reproducir para iniciar la película.',
        containerExtension: vod.container_extension || 'mkv',
      };

      const ext = vod.container_extension || meta.containerExtension || 'mkv';
      const streamUrl = (item as any).streamUrl || XtreamService.buildVodStreamUrl(server, user, pass, streamId, ext);

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
      const streamUrl = (live as any).streamUrl || ((live as any).direct_source && String((live as any).direct_source).startsWith('http')
        ? (live as any).direct_source
        : XtreamService.buildLiveStreamUrl(server, user, pass, streamId, cleanExt));

      // Obtener nombre de la carpeta / categoría actual
      const currentCat = categories.find((c) => c.category_id === selectedCategoryId);
      const catName = currentCat ? currentCat.category_name : 'Canales en Vivo';

      // Construir lista de canales de la carpeta actual para navegación fluida dentro del reproductor
      const channelList: LiveChannelData[] = (streams as XtreamStream[]).map((ch, idx) => {
        const cId = (ch as any).stream_id ?? (ch as any).id ?? `ch_${idx}`;
        const cRawExt = (ch as any).container_extension || (ch as any).extension || (ch as any).ext || 'ts';
        const cCleanExt = String(cRawExt).replace(/^\.+/, '').trim() || 'ts';
        const cUrl = (ch as any).streamUrl || ((ch as any).direct_source && String((ch as any).direct_source).startsWith('http')
          ? (ch as any).direct_source
          : XtreamService.buildLiveStreamUrl(server, user, pass, cId, cCleanExt));
        return {
          id: String(cId),
          name: ch.name || (ch as any).title || `Canal ${idx + 1}`,
          streamUrl: cUrl,
          logoUrl: (ch as any).stream_icon || (ch as any).icon || (ch as any).logo,
          channelNumber: (ch as any).num || idx + 1,
        };
      });

      onPlayStream({
        id: `live_${streamId}`,
        title: live.name || (live as any).title || 'Canal de TV',
        streamUrl,
        posterUrl: live.stream_icon || (live as any).icon,
        isLive: true,
        liveContext: {
          categoryId: selectedCategoryId,
          categoryName: catName,
          currentChannelId: String(streamId),
          channels: channelList,
        },
      });
    } else {
      // Para Series, abrir modal de episodios
      const series = item as XtreamSeries;
      const rawSeriesId = series.series_id || (series as any).id;
      setLoadingSeriesModal(true);
      try {
        let seriesId: string | number = rawSeriesId;
        // Si no es numérico puro, buscar en el catálogo por nombre
        if (!/^\d+$/.test(String(rawSeriesId))) {
          const cleanTitle = (series.name || (series as any).title || '').replace(/ - T\d+:?E\d+.*$/, '');
          const match = await CatalogCacheService.findBestMatch(playlist.id, cleanTitle, undefined, 'series');
          if (match && match.id) {
            seriesId = match.id;
          }
        }

        let details = await XtreamService.getSeriesInfo(server, user, pass, seriesId);
        let seasons = details.seasons || [];
        let episodes = details.episodes || {};
        let seasonKeys = Object.keys(episodes);

        // Si la consulta devolvió 0 episodios, reintentar con búsqueda por título
        if (seasonKeys.length === 0) {
          const cleanTitle = (series.name || (series as any).title || '').replace(/ - T\d+:?E\d+.*$/, '');
          const match = await CatalogCacheService.findBestMatch(playlist.id, cleanTitle, undefined, 'series');
          if (match && match.id && String(match.id) !== String(seriesId)) {
            const retryDetails = await XtreamService.getSeriesInfo(server, user, pass, match.id);
            if (retryDetails.episodes && Object.keys(retryDetails.episodes).length > 0) {
              details = retryDetails;
              seasons = details.seasons || [];
              episodes = details.episodes || {};
              seasonKeys = Object.keys(episodes);
              seriesId = match.id;
            }
          }
        }

        if (seasonKeys.length > 0) {
          const firstSeasonNum = Number(seasonKeys[0]) || 1;
          const cleanTitle = (details.info?.name || series.name || (series as any).title || '').replace(/ - T\d+:?E\d+.*$/, '');
          
          // Enriquecimiento cinemático con metadatos reales de TMDb (sinopsis en español, backdrop y póster HD)
          let tmdbMeta: any = null;
          try {
            tmdbMeta = await TmdbService.enrichSeries(cleanTitle, details.info?.cover || series.cover || (series as any).stream_icon || '');
          } catch {
            // Continuar con metadatos de Xtream si falla la red
          }

          const enrichedSeries: XtreamSeries = {
            ...series,
            num: 1,
            name: details.info?.name || tmdbMeta?.title || series.name,
            series_id: Number(seriesId) || series.series_id || 0,
            cover: tmdbMeta?.posterUrl || details.info?.cover || series.cover || (series as any).stream_icon || '',
            plot: (details.info?.plot && details.info.plot.trim().length > 10)
              ? details.info.plot
              : (tmdbMeta?.synopsis && !tmdbMeta.synopsis.toLowerCase().includes('disfruta de esta serie')
                ? tmdbMeta.synopsis
                : (details.info?.plot || series.plot || 'Disfruta de todos los capítulos y temporadas disponibles en tu catálogo.')),
            cast: tmdbMeta?.cast || (details.info as any)?.cast || series.cast || '',
            director: tmdbMeta?.director || (details.info as any)?.director || '',
            genre: (details.info?.genre && details.info.genre.trim().length > 0)
              ? details.info.genre
              : (tmdbMeta?.genres?.join(', ') || series.genre || 'Serie TV'),
            releaseDate: details.info?.releaseDate || tmdbMeta?.year || series.releaseDate || '2026',
            rating: details.info?.rating || tmdbMeta?.rating || series.rating || '8.8',
            backdrop_path: tmdbMeta?.backdropUrl ? [tmdbMeta.backdropUrl] : (details.info?.backdrop_path || []),
            category_id: (details.info as any)?.category_id || series.category_id || '0',
          } as any;

          setSelectedSeriesDetails({
            series: enrichedSeries,
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
          // Si no tiene episodios pero tiene streamUrl o id, reproducir
          const streamUrl = (item as any).streamUrl || XtreamService.buildSeriesStreamUrl(server, user, pass, seriesId, 'mp4');
          onPlayStream({
            id: `series_${seriesId}`,
            title: series.name || (series as any).title || 'Serie',
            streamUrl,
            posterUrl: series.cover || (series as any).stream_icon,
            isLive: false,
          });
        }
      } catch (err) {
        console.error('Error al cargar episodios:', err);
        if ((item as any).streamUrl) {
          onPlayStream({
            id: `series_${rawSeriesId}`,
            title: series.name || (series as any).title || 'Serie',
            streamUrl: (item as any).streamUrl,
            posterUrl: series.cover || (series as any).stream_icon,
            isLive: false,
          });
        }
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

    // Construir lista estructurada de episodios para navegación dentro del reproductor de video
    const seasonEps = (selectedSeriesDetails.episodes[String(selectedSeasonNumber)] || selectedSeriesDetails.episodes[selectedSeasonNumber] || []) as EpisodeItem[];
    const epList: SeriesEpisodeData[] = seasonEps.map((ep, idx) => {
      const eId = (ep as any).id ?? (ep as any).episode_id ?? (ep as any).stream_id ?? `ep_${idx}`;
      const rExt = (ep as any).container_extension || 
                   (ep as any).extension || 
                   (ep as any).ext || 
                   ep.info?.container_extension || 
                   (ep.info as any)?.extension || 
                   'mp4';
      const cExt = String(rExt).replace(/^\.+/, '').trim() || 'mp4';
      const url = (ep as any).direct_source && String((ep as any).direct_source).startsWith('http')
        ? (ep as any).direct_source
        : XtreamService.buildSeriesStreamUrl(server, user, pass, eId, cExt);
      const num = ep.episode_num ?? (ep as any).num ?? (idx + 1);
      return {
        id: String(eId),
        episodeNum: Number(num),
        seasonNum: Number(selectedSeasonNumber),
        title: ep.title || `Capítulo ${num}`,
        streamUrl: url,
        posterUrl: ep.info?.movie_image || series.cover,
        duration: (ep.info as any)?.duration || (ep.info?.duration_secs ? `${Math.round(ep.info.duration_secs / 60)} min` : undefined)
      };
    });

    onPlayStream({
      id: `series_${epId}`,
      title: `${series.name} - T${selectedSeasonNumber}E${epNum}: ${epTitle}`,
      streamUrl,
      posterUrl: episode.info?.movie_image || series.cover,
      isLive: false,
      seriesContext: {
        seriesName: series.name,
        seriesCover: series.cover,
        seasonNumber: Number(selectedSeasonNumber),
        currentEpisodeId: String(epId),
        episodes: epList,
      }
    });
  };

  const currentSeasonEpisodes: EpisodeItem[] = 
    selectedSeriesDetails?.episodes[String(selectedSeasonNumber)] ||
    selectedSeriesDetails?.episodes[selectedSeasonNumber] ||
    [];

  // 🎮 Motor de Navegación D-Pad para Control Remoto TV
  useEffect(() => {
    // Si la app está en modo Administrador, desactivar control por mando (solo cursor de PC)
    if (!isActive || isAdmin) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 🛑 Si el modal de favoritos / continuar viendo está abierto, ceder el control total al modal
      if (isQuickFavOpen) return;

      // 🌟 BOTÓN MENU DEL CONTROL REMOTO (KEYCODE 82, 'ContextMenu', 'Menu', 'm', 'c')
      // Abre instantáneamente (0 segundos) las opciones del elemento seleccionado
      const isMenuKey =
        e.key === 'ContextMenu' ||
        e.key === 'Menu' ||
        e.keyCode === 82 || // KEYCODE_MENU oficial en Android TV / Fire TV
        e.key === 'm' ||
        e.key === 'M' ||
        e.key === 'c' ||
        e.key === 'C';

      if (isMenuKey) {
        e.preventDefault();
        e.stopPropagation();
        if (focusZone === 'grid') {
          const currentItem = displayedStreams[focusedGridIndex];
          if (currentItem) {
            openQuickMenu(currentItem);
          }
        }
        return;
      }

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
          if (initialSelectedItem) {
            onClose();
          } else {
            setSelectedMovieDetail(null);
            setFocusZone('grid');
          }
          return;
        }

        const maxBtnIndex = 2;
        switch (e.key) {
          case 'ArrowLeft':
            setDetailBtnIndex((prev) => Math.max(0, prev - 1));
            break;

          case 'ArrowRight':
            setDetailBtnIndex((prev) => Math.min(maxBtnIndex, prev + 1));
            break;
        }
        return;
      }

      // ── CASO 2: MODAL DE EPISODIOS DE SERIES ──
      if (focusZone === 'series_modal' && selectedSeriesDetails) {
        e.preventDefault();
        e.stopPropagation();
        const seasonsList = selectedSeriesDetails.seasons || [];
        const numEpisodeCols = 4;

        if (isOk) {
          if (seriesFocusZone === 'episodes' && currentSeasonEpisodes[focusedEpisodeIndex]) {
            playEpisode(currentSeasonEpisodes[focusedEpisodeIndex]);
          } else if (seriesFocusZone === 'seasons') {
            setSeriesFocusZone('episodes');
            setFocusedEpisodeIndex(0);
          } else if (seriesFocusZone === 'close') {
            if (initialSelectedItem) {
              onClose();
            } else {
              setSelectedSeriesDetails(null);
              setFocusZone('grid');
            }
          }
          return;
        }

        if (isBack) {
          if (initialSelectedItem) {
            onClose();
          } else {
            setSelectedSeriesDetails(null);
            setFocusZone('grid');
          }
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
                if (prev % numEpisodeCols > 0) {
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
                if (prev % numEpisodeCols < numEpisodeCols - 1 && prev + 1 < currentSeasonEpisodes.length) {
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
          if (allCategories[focusedCatIndex]) {
            scheduleCategoryChange(allCategories[focusedCatIndex].category_id, true);
            if (displayedStreams.length > 0) {
              setFocusZone('grid');
              setFocusedGridIndex(0);
            }
          }
        } else if (focusZone === 'grid') {
          // Iniciar temporizador ágil de 1.1s para Menú Rápido / Continuar Viendo / Favoritos
          if (e.repeat) return; // Evitar reinicios por eventos de repetición del mando
          if (!isHoldingOkRef.current) {
            isHoldingOkRef.current = true;
            hasTriggeredLongPressRef.current = false;
            const currentItem = displayedStreams[focusedGridIndex];

            const HOLD_DURATION = 1100; // 1.1 segundos
            const startTime = Date.now();
            if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
            holdIntervalRef.current = window.setInterval(() => {
              const elapsed = Date.now() - startTime;
              if (elapsed >= HOLD_DURATION) {
                if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
                if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                holdIntervalRef.current = null;
                holdTimerRef.current = null;
                hasTriggeredLongPressRef.current = true;
                setHoldProgress(0);
                if (currentItem) {
                  openQuickMenu(currentItem);
                }
              } else {
                setHoldProgress(Math.min(100, Math.round((elapsed / HOLD_DURATION) * 100)));
              }
            }, 30);

            if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
            holdTimerRef.current = window.setTimeout(() => {
              if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
              holdIntervalRef.current = null;
              holdTimerRef.current = null;
              hasTriggeredLongPressRef.current = true;
              setHoldProgress(0);

              if (currentItem) {
                openQuickMenu(currentItem);
              }
            }, HOLD_DURATION);
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
            if (focusZone === 'categories' && allCategories[focusedCatIndex]) {
              scheduleCategoryChange(allCategories[focusedCatIndex].category_id, true);
            }
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
              if (allCategories[nextIdx]) {
                scheduleCategoryChange(allCategories[nextIdx].category_id, true);
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
            if (focusedCatIndex < allCategories.length - 1) {
              const nextIdx = focusedCatIndex + 1;
              setFocusedCatIndex(nextIdx);
              if (allCategories[nextIdx]) {
                scheduleCategoryChange(allCategories[nextIdx].category_id, true);
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
      // 🛑 Si el modal de favoritos / continuar viendo está abierto, ceder el control total al modal
      if (isQuickFavOpen) {
        isHoldingOkRef.current = false;
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        if (holdIntervalRef.current) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = null;
        }
        setHoldProgress(0);
        return;
      }

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
    };
  }, [
    isActive,
    focusZone,
    focusedCatIndex,
    focusedGridIndex,
    categories,
    allCategories,
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
    isQuickFavOpen,
  ]);

  const activeCategory = allCategories.find((c) => c.category_id === selectedCategoryId);

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
          Categorías ({allCategories.length})
        </div>

        {/* Lista de Carpetas/Categorías */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {allCategories.map((cat, idx) => {
            const isFocused = focusZone === 'categories' && focusedCatIndex === idx;
            // ⚡ Al navegar por las carpetas, el estado activo sigue estrictamente al foco sin retardos ni sombras que se queden rezagadas
            const isSelected = focusZone === 'categories' ? isFocused : selectedCategoryId === cat.category_id;
            const isContinue = cat.category_id === 'continue_watching';

            return (
              <button
                key={cat.category_id}
                ref={(el) => { catItemRefs.current[idx] = el; }}
                onClick={() => {
                  scheduleCategoryChange(cat.category_id, true);
                  setFocusedCatIndex(idx);
                  setFocusZone('categories');
                }}
                className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-none flex items-center space-x-3 ${
                  isFocused
                    ? isContinue
                      ? 'bg-amber-400 text-black font-black'
                      : 'bg-white text-black font-black'
                    : isSelected
                      ? isContinue
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : isContinue
                        ? 'text-amber-300/90 hover:text-amber-200 bg-amber-500/5'
                        : 'text-zinc-400 hover:text-white'
                }`}
              >
                {isContinue ? (
                  <Clock className={`w-4 h-4 shrink-0 ${isFocused ? 'text-black fill-black' : isSelected ? 'text-amber-400' : 'text-amber-400'}`} />
                ) : (
                  <Folder className={`w-4 h-4 shrink-0 ${isFocused ? 'text-black fill-black' : isSelected ? 'text-cyan-400' : 'text-zinc-500'}`} />
                )}
                <span className="truncate flex-1">{cat.category_name}</span>
                {isContinue && sectionContinueWatching.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                    isFocused
                      ? 'bg-black text-amber-300'
                      : isSelected
                        ? 'bg-amber-500 text-black'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {sectionContinueWatching.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── PANEL PRINCIPAL DERECHO: HERO INFO (ARRIBA) + CARROUSEL DE PELÍCULAS (ABAJO) ── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#070A12] relative">
        {/* 🎬 1. SECCIÓN SUPERIOR: HERO INFO CINEMÁTICO (IMAGEN 1) */}
        <div className="relative h-64 md:h-70 w-full border-b border-white/10 shrink-0 overflow-hidden bg-gradient-to-r from-[#070A12] via-[#070A12]/90 to-transparent flex items-center">
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
          <div className="relative z-10 max-w-2xl px-10 py-5 flex flex-col justify-center">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide line-clamp-1 drop-shadow-md">
              {focusedMetadata?.title || 'Selecciona un contenido'}
            </h1>

            {/* Fila de Insignias y Datos Rápidos: [7.0] 2025 • 1h 57m • Géneros */}
            <div className="flex items-center space-x-3 mt-2 text-xs text-zinc-300 font-bold">
              {contentType === 'live' ? (
                <div className="flex items-center space-x-2">
                  <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-600/30 text-rose-300 border border-rose-500/50 text-[11px] font-black uppercase tracking-wider animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping" />
                    <span>EN VIVO</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-400/40 text-cyan-300 text-[11px] font-bold">
                    HD
                  </span>
                  {focusedMetadata?.genres && (
                    <span className="text-zinc-400 text-xs font-semibold">• {focusedMetadata.genres}</span>
                  )}
                </div>
              ) : (
                <>
                  {focusedMetadata?.rating && (
                    <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-black">
                      ★ {focusedMetadata.rating}
                    </span>
                  )}
                  {focusedMetadata?.year && <span>{focusedMetadata.year}</span>}
                  {focusedMetadata?.duration && <span>• {focusedMetadata.duration}</span>}
                  {focusedMetadata?.genres && !focusedMetadata.genres.includes('VOD') && !focusedMetadata.genres.includes('Película') && (
                    <span className="text-zinc-400">• {focusedMetadata.genres}</span>
                  )}
                </>
              )}
            </div>

            {/* Reparto (Cast) - Oculto en Canales en Vivo */}
            {contentType !== 'live' && focusedMetadata?.cast && (
              <p className="text-xs text-zinc-300 mt-2 line-clamp-1">
                <span className="text-zinc-500 font-bold mr-1.5">Cast:</span>
                {focusedMetadata.cast}
              </p>
            )}

            {/* Director - Oculto en Canales en Vivo */}
            {contentType !== 'live' && focusedMetadata?.director && (
              <p className="text-xs text-zinc-300 mt-0.5 line-clamp-1">
                <span className="text-zinc-500 font-bold mr-1.5">Director:</span>
                {focusedMetadata.director}
              </p>
            )}

            {/* Sinopsis Oficial / EPG */}
            <p className="text-xs text-zinc-400 mt-2 line-clamp-2 md:line-clamp-3 leading-relaxed max-w-xl">
              {focusedMetadata?.plot || (contentType === 'live' ? 'Selecciona este canal para sintonizar en pantalla completa.' : 'Explora los títulos con las flechas del control remoto para ver su sinopsis completa.')}
            </p>
          </div>
        </div>

        {/* 🎞️ BARRA FIJA SUPERIOR DE CARPETA Y CONTADOR (NUNCA SE CORTA NI SE DESPLAZA) */}
        <div className="px-10 py-2.5 shrink-0 flex items-center justify-between border-b border-white/5 bg-[#070A12]/95 backdrop-blur-md z-10">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-black uppercase text-white flex items-center space-x-2">
              <span className="text-cyan-400">
                {searchQuery.trim() ? `Resultados: "${searchQuery}"` : (activeCategory?.category_name || 'Contenido')}
              </span>
            </h2>

            {displayedStreams.length > 0 && (
              <div className="flex items-center space-x-2.5">
                <span className="px-2.5 py-0.5 rounded-lg bg-cyan-950/70 border border-cyan-400/40 text-xs font-mono font-bold text-cyan-300 shadow-sm">
                  {focusZone === 'grid' ? focusedGridIndex + 1 : 1} / {displayedStreams.length}
                </span>
                <span className="text-xs text-zinc-500 font-medium">
                  ({displayedStreams.length} {contentType === 'live' ? 'canales' : contentType === 'series' ? 'series' : 'películas'})
                </span>
              </div>
            )}
          </div>

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

        {/* 🎞️ 2. SECCIÓN INFERIOR: CARRUSEL DE TARJETAS (IMAGEN 1) */}
        <div 
          ref={gridScrollContainerRef}
          onScroll={(e) => {
            const rowHeight = contentType === 'live' ? 80 : 380;
            const newRow = Math.floor(e.currentTarget.scrollTop / rowHeight);
            if (newRow !== scrollRow) {
              setScrollRow(newRow);
            }
          }}
          className="flex-1 overflow-y-auto px-10 pt-4 pb-12 flex flex-col"
        >
          {/* Estado Vacío de Búsqueda o Continuar Viendo */}
          {displayedStreams.length === 0 && !loadingStreams && !loadingSearchAll && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-zinc-500">
              {selectedCategoryId === 'continue_watching' ? (
                <>
                  <Clock className="w-16 h-16 mb-4 text-amber-400/60" />
                  <p className="text-base font-black text-white">
                    Sin contenidos en Continuar Viendo
                  </p>
                  <p className="text-xs mt-1.5 text-zinc-400 max-w-sm text-center">
                    Las películas, series o canales que reproduzcas o dejes a medias aparecerán aquí automáticamente para que los retomes cuando quieras.
                  </p>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          )}

          {/* Skeleton Shimmer durante la carga inicial de la categoría */}
          {loadingStreams && displayedStreams.length === 0 && (
            <div className={contentType !== 'live' ? "grid grid-cols-5 gap-5 pt-2 pb-8" : "grid grid-cols-4 gap-3 pt-2 pb-8"}>
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

          {/* 🚀 Opción 1: Ventana de renderizado virtualizada por filas */}
          {(() => {
            const focusedRow = Math.floor(focusedGridIndex / numCols);
            const minVisibleRow = Math.max(0, Math.min(focusedRow, scrollRow) - 2);
            const maxVisibleRow = Math.max(focusedRow, scrollRow) + 4;

            return contentType !== 'live' ? (
              /* Cuadrícula / Fila de Posters (5 Columnas fijas para D-Pad 1:1) */
              <div className="grid grid-cols-5 gap-5 pt-2 pb-8">
                {displayedStreams.map((item, idx) => {
                  const row = Math.floor(idx / numCols);
                  const isVisible = row >= minVisibleRow && row <= maxVisibleRow;
                  const isFocused = focusZone === 'grid' && focusedGridIndex === idx;

                  if (isVisible) {
                    return (
                      <CatalogPosterCard
                        key={(item as any).stream_id || (item as any).series_id || idx}
                        item={item}
                        isFocused={isFocused}
                        contentType={contentType}
                        server={server}
                        onSelect={() => {
                          setFocusedGridIndex(idx);
                          handleItemSelect(item);
                        }}
                        innerRef={(el) => { gridItemRefs.current[idx] = el; }}
                      />
                    );
                  }

                  // Placeholder ultraligero que conserva tamaño y refs D-pad 1:1
                  return (
                    <div
                      key={(item as any).stream_id || (item as any).series_id || idx}
                      ref={(el) => { gridItemRefs.current[idx] = el; }}
                      onClick={() => {
                        setFocusedGridIndex(idx);
                        handleItemSelect(item);
                      }}
                      className="group relative flex flex-col cursor-pointer"
                    >
                      <div className="aspect-[2/3] w-full rounded-2xl bg-zinc-900/40 border border-white/5 flex items-center justify-center p-3 relative overflow-hidden">
                        <Film className="w-8 h-8 text-zinc-800" />
                      </div>
                      <h3 className="text-xs font-bold mt-2 truncate text-zinc-600">
                        {item.name || (item as any).title || '...'}
                      </h3>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Lista de Canales de TV en Vivo */
              <div className="grid grid-cols-4 gap-3 pt-2 pb-8">
                {displayedStreams.map((live, idx) => {
                  const stream = live as XtreamStream;
                  const title = stream.name || `Canal #${stream.stream_id}`;
                  const row = Math.floor(idx / numCols);
                  const isVisible = row >= minVisibleRow && row <= maxVisibleRow;
                  const isFocused = focusZone === 'grid' && focusedGridIndex === idx;

                  if (isVisible) {
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
                          <ChannelLogo stream={stream} server={server} title={title} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-xs font-bold line-clamp-2 leading-snug ${isFocused ? 'text-cyan-300 font-extrabold' : 'text-white'}`}>
                            {title}
                          </h4>
                          {(live as any).isContinueWatchingItem && (
                            <span className="text-[10px] text-amber-400 font-semibold flex items-center space-x-1 mt-0.5">
                              <Clock className="w-3 h-3 mr-1 inline" /> Visto recientemente
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Placeholder ultraligero para canales fuera de pantalla
                  return (
                    <div
                      key={stream.stream_id || idx}
                      ref={(el) => { gridItemRefs.current[idx] = el; }}
                      onClick={() => {
                        setFocusedGridIndex(idx);
                        handleItemSelect(stream);
                      }}
                      className="p-3.5 rounded-2xl flex items-center space-x-3 bg-[#0E1424]/40 border border-white/5 cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center shrink-0">
                        <Tv className="w-5 h-5 text-zinc-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-zinc-600 truncate">
                          {title}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </main>

      {/* ── 3. PANTALLA COMPLETA DE DETALLES DE PELÍCULA (IMAGEN 2) ── */}
      {selectedMovieDetail && (
        <div className="fixed inset-0 z-60 bg-[#070A12] flex flex-col justify-between p-12 overflow-hidden animate-fadeIn">
          {/* Botón Cerrar / Volver en esquina superior derecha */}
          <button
            onClick={() => {
              if (initialSelectedItem) {
                onClose();
              } else {
                setSelectedMovieDetail(null);
                setFocusZone('grid');
              }
            }}
            className="absolute top-8 right-8 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/10 shadow-lg"
            title="Volver"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Gran Imagen de Fondo Cinemática con Auto-recuperación */}
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={normalizeMediaUrl(selectedMovieDetail.meta.backdropUrl || selectedMovieDetail.meta.posterUrl, server)}
              alt={selectedMovieDetail.meta.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                PosterResolutionService.resolvePoster(selectedMovieDetail.meta.title).then((resolved) => {
                  if (resolved && target.src !== resolved) {
                    target.src = resolved;
                  }
                }).catch(() => {});
              }}
              className="w-full h-full object-cover opacity-35 scale-105 transition-opacity duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070A12] via-[#070A12]/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-[#070A12]/60 to-transparent" />
          </div>

          {/* Información Superior con Póster Oficial y Metadatos Dinámicos */}
          <div className="relative z-10 flex items-start space-x-8 max-w-5xl">
            {/* Póster oficial visible de la película con auto-resolución */}
            <div className="w-40 aspect-[2/3] rounded-2xl overflow-hidden border border-white/20 shadow-2xl shrink-0 bg-black/60 hidden md:block">
              <img
                src={normalizeMediaUrl(selectedMovieDetail.meta.posterUrl, server)}
                alt={selectedMovieDetail.meta.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  PosterResolutionService.resolvePoster(selectedMovieDetail.meta.title).then((resolved) => {
                    if (resolved && target.src !== resolved) {
                      target.src = resolved;
                    }
                  }).catch(() => {});
                }}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 space-y-3">
              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-wide drop-shadow-xl">
                {selectedMovieDetail.meta.title}
              </h1>

              {/* Badges: [★ 7.5] 2025 • 1h 57m • Bélica / Acción / Drama */}
              <div className="flex items-center space-x-3 text-sm font-bold text-zinc-300">
                {selectedMovieDetail.meta.rating && (
                  <span className="px-2.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black">
                    ★ {selectedMovieDetail.meta.rating}
                  </span>
                )}
                {selectedMovieDetail.meta.year && <span>{selectedMovieDetail.meta.year}</span>}
                {selectedMovieDetail.meta.duration && <span>• {selectedMovieDetail.meta.duration}</span>}
                {selectedMovieDetail.meta.genres && <span className="text-zinc-300">• {selectedMovieDetail.meta.genres}</span>}
              </div>

              {/* Cast */}
              {selectedMovieDetail.meta.cast && !selectedMovieDetail.meta.cast.toLowerCase().includes('cargando') && (
                <p className="text-xs text-zinc-300">
                  <span className="text-zinc-500 font-bold mr-2">Reparto:</span>
                  {selectedMovieDetail.meta.cast}
                </p>
              )}

              {/* Director */}
              {selectedMovieDetail.meta.director && !selectedMovieDetail.meta.director.toLowerCase().includes('cargando') && (
                <p className="text-xs text-zinc-300">
                  <span className="text-zinc-500 font-bold mr-2">Director:</span>
                  {selectedMovieDetail.meta.director}
                </p>
              )}

              {/* Sinopsis Completa */}
              <p className="text-xs lg:text-sm text-zinc-300 leading-relaxed max-w-2xl pt-1 line-clamp-4">
                {selectedMovieDetail.meta.plot && !selectedMovieDetail.meta.plot.toLowerCase().includes('cargando')
                  ? selectedMovieDetail.meta.plot
                  : 'Película disponible en tu catálogo. Presiona reproducir para iniciar en alta definición.'}
              </p>
            </div>
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

            {/* 4. Botón Poner en Portada (Solo Administrador) */}
            {isAdmin && (
              <button
                onClick={() => setAdminPinModalItem({
                  id: `movie_${selectedMovieDetail.item.stream_id}`,
                  streamId: selectedMovieDetail.item.stream_id,
                  title: selectedMovieDetail.meta.title,
                  type: 'movie',
                  posterUrl: selectedMovieDetail.meta.posterUrl || '',
                  backdropUrl: selectedMovieDetail.meta.backdropUrl || selectedMovieDetail.meta.posterUrl || '',
                  streamUrl: selectedMovieDetail.streamUrl,
                  year: selectedMovieDetail.meta.year || '2026',
                  rating: selectedMovieDetail.meta.rating || '8.0',
                  genresText: selectedMovieDetail.meta.genres || 'Película',
                  synopsis: selectedMovieDetail.meta.plot || '',
                })}
                className="px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center space-x-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 cursor-pointer shadow-lg"
                title="Fijar esta película en la pantalla principal de la app"
              >
                <Star className="w-4 h-4 fill-current text-amber-400" />
                <span>Poner en Portada (Admin)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── SPINNER DE CARGA AL ABRIR SERIE DIRECTAMENTE ── */}
      {loadingSeriesModal && !selectedSeriesDetails && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center space-y-4 animate-fadeIn">
          <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin" />
          <p className="text-base font-black text-white tracking-wide">
            Cargando capítulos y temporadas...
          </p>
          <p className="text-xs text-zinc-400">
            Consultando episodios disponibles en tu lista IPTV
          </p>
        </div>
      )}

      {/* ── 4. MODAL DE EPISODIOS DE SERIES ── */}
      {selectedSeriesDetails && (() => {
        const series = selectedSeriesDetails.series;
        const title = series.name || (series as any).title || 'Serie';
        const cover = series.cover || (series as any).stream_icon || (series as any).poster;
        const sId = series.series_id || (series as any).id;
        const cachedMeta = metadataCacheRef.current.get(sId);
        const finalBackdrop = (series as any).backdrop_path?.[0] || (series as any).backdropUrl || cachedMeta?.backdropUrl || cover;
        const finalRating = series.rating || (series as any).rating || cachedMeta?.rating || '8.5';
        const finalYear = series.releaseDate ? series.releaseDate.substring(0, 4) : (cachedMeta?.year || (series as any).year || '');
        const finalGenres = series.genre || (series as any).genresText || cachedMeta?.genres || 'Serie TV';
        const finalCast = (series as any).cast || (series as any).actors || cachedMeta?.cast || '';
        const finalPlot = series.plot || (series as any).synopsis || (series as any).description || cachedMeta?.plot || 'Disfruta de todos los capítulos y temporadas disponibles en tu catálogo.';
        const totalSeasons = selectedSeriesDetails.seasons.length;

        return (
          <div className="fixed inset-0 z-50 bg-[#070A12] flex flex-col p-6 md:p-8 animate-fadeIn select-none overflow-hidden">
            {/* 🌌 Gran Fondo Cinemático */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {finalBackdrop && (
                <img
                  src={normalizeMediaUrl(finalBackdrop, server)}
                  alt={title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-40 scale-105 transition-all duration-700"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-[#070A12] via-[#070A12]/85 to-[#070A12]/60" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-[#070A12]/75 to-transparent" />
            </div>

            {/* 🎬 PARTE SUPERIOR: PÓSTER, TÍTULO, BADGES, REPARTO Y SINOPSIS COMPLETA */}
            <div className="relative z-10 flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-start space-x-6 max-w-5xl">
                {/* Póster oficial de la serie (visible siempre) */}
                {cover && (
                  <div className="w-28 md:w-36 aspect-[2/3] rounded-2xl overflow-hidden border border-white/20 shadow-2xl shrink-0 bg-black/60 flex">
                    <img
                      src={normalizeMediaUrl(cover, server)}
                      alt={title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Textos y Metadatos de la serie */}
                <div className="space-y-2 flex-1 min-w-0">
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-wide line-clamp-1 drop-shadow-md">
                    {title}
                  </h2>

                  {/* Badges: Rating, Año, Temporadas, Géneros */}
                  <div className="flex items-center flex-wrap gap-2 text-xs font-bold text-zinc-300">
                    {finalRating && (
                      <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-black">
                        ★ {finalRating}
                      </span>
                    )}
                    {finalYear && <span>{finalYear}</span>}
                    <span>• {totalSeasons} {totalSeasons === 1 ? 'Temporada' : 'Temporadas'}</span>
                    {finalGenres && <span className="text-zinc-400">• {finalGenres}</span>}
                  </div>

                  {/* Reparto (Cast) */}
                  {finalCast && !finalCast.toLowerCase().includes('cargando') && (
                    <p className="text-xs text-zinc-300 line-clamp-1">
                      <span className="text-zinc-500 font-bold mr-1.5">Reparto:</span>
                      {finalCast}
                    </p>
                  )}

                  {/* Sinopsis oficial de la serie (visible, amplia y cinematográfica) */}
                  <p className="text-xs md:text-sm text-zinc-300 leading-relaxed max-w-4xl line-clamp-3 md:line-clamp-4">
                    {finalPlot}
                  </p>
                </div>
              </div>

              {/* Botones de acción superiores (Admin y Cerrar) */}
              <div className="flex items-center space-x-3 shrink-0 ml-4">
                {isAdmin && (
                  <button
                    onClick={() => setAdminPinModalItem({
                      id: `series_${series.series_id}`,
                      streamId: series.series_id,
                      title: series.name,
                      type: 'series',
                      posterUrl: normalizeMediaUrl(series.cover, server) || '',
                      backdropUrl: normalizeMediaUrl(finalBackdrop, server) || '',
                      year: finalYear || '2026',
                      rating: finalRating || '8.8',
                      genresText: finalGenres || 'Serie TV',
                      synopsis: finalPlot || '',
                    })}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                    title="Fijar esta serie en la Pantalla Principal"
                  >
                    <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                    <span>Poner en Portada</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (initialSelectedItem) {
                      onClose();
                    } else {
                      setSelectedSeriesDetails(null);
                      setFocusZone('grid');
                    }
                  }}
                  className={`p-2.5 rounded-full transition ${
                    focusZone === 'series_modal' && seriesFocusZone === 'close'
                      ? 'bg-cyan-400 text-black ring-4 ring-cyan-300 scale-110 shadow-lg'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 🎞️ SELECTOR DE TEMPORADAS (PILLS COMPACTOS) */}
            <div className="relative z-10 flex items-center space-x-2 py-2 shrink-0 border-b border-white/5 overflow-x-auto no-scrollbar">
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
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                      isSelected
                        ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/40'
                        : 'bg-[#131826] text-zinc-400 hover:text-white border border-white/10'
                    } ${isFocused ? 'ring-4 ring-cyan-300 scale-105 z-10' : ''}`}
                  >
                    {season.name || `Temporada ${sNum}`}
                  </button>
                );
              })}
            </div>

            {/* 📺 GRILLA DE CAPÍTULOS COMPACTOS (4 COLUMNAS, MÁS PEQUEÑOS Y DISCRETOS) */}
            <div className="relative z-10 flex-1 overflow-y-auto pt-3 pb-4">
              <div className="grid grid-cols-4 gap-2">
                {currentSeasonEpisodes.map((ep, eIdx) => {
                  const isEpFocused = focusZone === 'series_modal' && seriesFocusZone === 'episodes' && focusedEpisodeIndex === eIdx;

                  return (
                    <div
                      key={ep.id || eIdx}
                      ref={(el) => { episodeItemRefs.current[eIdx] = el; }}
                      onClick={() => playEpisode(ep)}
                      className={`px-2.5 py-2 rounded-xl flex items-center space-x-2.5 cursor-pointer transition-all duration-150 border ${
                        isEpFocused
                          ? 'bg-gradient-to-r from-cyan-900/90 to-blue-900/90 border-cyan-400 ring-4 ring-cyan-400/50 scale-102 z-10 shadow-lg'
                          : 'bg-[#0E1424]/90 hover:bg-cyan-950/40 border-white/5'
                      }`}
                    >
                      {/* Número de episodio mini */}
                      <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 font-black text-[11px] flex items-center justify-center shrink-0 border border-cyan-500/30">
                        {ep.episode_num || eIdx + 1}
                      </div>

                      {/* Título de episodio compacto */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs font-bold truncate ${isEpFocused ? 'text-cyan-300 font-extrabold' : 'text-white'}`}>
                          {ep.title || `Capítulo ${ep.episode_num || eIdx + 1}`}
                        </h4>
                        {ep.info?.duration_secs ? (
                          <span className="text-[10px] text-zinc-400 block -mt-0.5">
                            {Math.round(ep.info.duration_secs / 60)} min
                          </span>
                        ) : null}
                      </div>

                      {/* Botón play mini */}
                      <div className={`p-1 rounded-full transition shrink-0 ${isEpFocused ? 'bg-cyan-400 text-black' : 'bg-white/10 text-white'}`}>
                        <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ⭐ Menú Rápido de Favoritos / Continuar Viendo por pulsación en Catálogo */}
      <QuickFavoriteModal
        isOpen={isQuickFavOpen}
        item={quickFavItem}
        isFavorite={quickFavItem ? isFavorite(quickFavItem.id) : false}
        isContinueWatching={
          selectedCategoryId === 'continue_watching' || 
          Boolean(quickFavItem && continueWatchingList.some(cw => 
            String(cw.id) === String(quickFavItem.id) || 
            cw.streamUrl === quickFavItem.streamUrl || 
            cw.title === quickFavItem.title
          ))
        }
        onRemoveFromContinueWatching={() => {
          if (quickFavItem) {
            removeFromContinueWatching(quickFavItem.id, quickFavItem.streamUrl, quickFavItem.title);
          }
        }}
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

      {/* ── MODAL EXCLUSIVO ADMIN: FIJAR EN PANTALLA PRINCIPAL CON ETIQUETA ── */}
      {adminPinModalItem && (
        <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0E1526] border border-white/20 rounded-3xl p-6 text-white shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Fijar en Pantalla Principal</span>
              </h3>
              <button
                onClick={() => setAdminPinModalItem(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 mb-3">
              ¿Cómo deseas clasificar <strong>&quot;{adminPinModalItem.title}&quot;</strong> en la portada de inicio?
            </p>

            <div className="grid grid-cols-3 gap-2 mb-5">
              <button
                type="button"
                onClick={() => setAdminPinBadge('ESTRENO')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                  adminPinBadge === 'ESTRENO'
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/30'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <span>★ ESTRENO</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminPinBadge('RECIÉN AÑADIDA')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                  adminPinBadge === 'RECIÉN AÑADIDA'
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-sm shadow-emerald-500/30'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <span>✨ RECIÉN AÑADIDA</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminPinBadge('PRÓXIMAMENTE')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                  adminPinBadge === 'PRÓXIMAMENTE'
                    ? 'bg-purple-500/25 border-purple-400 text-purple-300 shadow-sm shadow-purple-500/30'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <span>⏳ PRÓXIMAMENTE</span>
              </button>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setAdminPinModalItem(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-400"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await addFeaturedItem({
                    ...adminPinModalItem,
                    badge: adminPinBadge,
                  });
                  setAdminPinSuccessToast(`"${adminPinModalItem.title}" fijada como [${adminPinBadge}] en Portada`);
                  setTimeout(() => setAdminPinSuccessToast(null), 3000);
                  setAdminPinModalItem(null);
                }}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs shadow-lg shadow-cyan-500/30 transition cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Guardar en Portada</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de confirmación admin */}
      {adminPinSuccessToast && (
        <div className="fixed bottom-8 right-8 z-80 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold">{adminPinSuccessToast}</span>
        </div>
      )}
    </div>
  );
};
