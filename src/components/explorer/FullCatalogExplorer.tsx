import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Folder, 
  Play, 
  RefreshCw, 
  ExternalLink, 
  Bookmark, 
  Video, 
  X, 
  Radio,
  Film
} from 'lucide-react';
import type { PlaylistAccount } from '../../types';
import { XtreamService, type XtreamCategory, type XtreamStream, type XtreamSeries } from '../../services/xtream';
import { TmdbService } from '../../services/tmdb';
import { openExternalPlayer } from '../../utils/externalPlayer';

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
    ? ((item as any).cover || (item as any).stream_icon || (item as any).poster)
    : ((item as any).stream_icon || (item as any).cover || (item as any).movie_image || (item as any).cover_big || (item as any).poster);
  const initialCover = normalizeMediaUrl(rawCover, server);

  const [imgSrc, setImgSrc] = useState<string>(initialCover);
  const [hasFailed, setHasFailed] = useState<boolean>(false);
  const title = item.name || (item as any).title || 'Sin Título';
  const rating = item.rating || '7.0';

  useEffect(() => {
    let isMounted = true;
    const coverUrl = normalizeMediaUrl(rawCover, server);

    if (coverUrl) {
      setImgSrc(coverUrl);
      setHasFailed(false);
    } else {
      // Si la lista Xtream no provee carátula, consultar automáticamente TMDb (igual que TiviMate)
      const cleaned = TmdbService.cleanTitle(title);
      if (cleaned && cleaned.length > 1) {
        TmdbService.enrichMovie(cleaned)
          .then((meta) => {
            if (isMounted && meta?.posterUrl) {
              setImgSrc(meta.posterUrl);
              setHasFailed(false);
            } else if (isMounted) {
              setHasFailed(true);
            }
          })
          .catch(() => {
            if (isMounted) setHasFailed(true);
          });
      } else {
        setHasFailed(true);
      }
    }

    return () => { isMounted = false; };
  }, [rawCover, server, title]);

  const handleImageError = () => {
    // Si la imagen del servidor IPTV falló, intentar fallback automático a TMDb (igual que TiviMate)
    const cleaned = TmdbService.cleanTitle(title);
    if (cleaned && cleaned.length > 1 && !imgSrc.includes('tmdb.org')) {
      TmdbService.enrichMovie(cleaned)
        .then((meta) => {
          if (meta?.posterUrl && meta.posterUrl !== imgSrc) {
            setImgSrc(meta.posterUrl);
            setHasFailed(false);
          } else {
            setHasFailed(true);
          }
        })
        .catch(() => {
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
      <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-950 border border-white/10 group-hover:border-cyan-400 relative shadow-lg flex items-center justify-center">
        {!hasFailed && imgSrc ? (
          <img
            src={imgSrc}
            alt={title}
            referrerPolicy="no-referrer"
            onError={handleImageError}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D]">
            <Film className="w-10 h-10 text-cyan-400/60 mb-3" />
            <span className="text-xs font-bold text-zinc-300 line-clamp-3 leading-tight">{title}</span>
            <span className="text-[10px] text-cyan-400 font-semibold mt-2 uppercase tracking-wider">{contentType === 'series' ? 'Serie' : 'Película'}</span>
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

type FocusZone = 'sidebar_back' | 'categories' | 'grid' | 'movie_detail' | 'series_modal';

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
  const [contentType] = useState<'movies' | 'series' | 'live'>(initialType);
  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [streams, setStreams] = useState<(XtreamStream | XtreamSeries)[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStreams, setLoadingStreams] = useState(false);

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
  const [detailBtnIndex, setDetailBtnIndex] = useState<number>(0); // 0: Play, 1: External, 2: Trailer, 3: My List
  const [isSavedInList, setIsSavedInList] = useState(false);

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

  const server = playlist.serverUrl || '';
  const user = playlist.username || '';
  const pass = playlist.password || '';

  // Número fijo de columnas para cálculo matemático 1:1 en control remoto
  const numCols = contentType === 'live' ? 4 : 5;

  // 1. Cargar las categorías correspondientes
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
          if (cats && cats.length > 0) {
            setSelectedCategoryId(cats[0].category_id);
          }
          setFocusedCatIndex(0);
          setFocusedGridIndex(0);
        }
      } catch (err) {
        console.error('Error al cargar categorías Xtream:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCategories();
    return () => { isMounted = false; };
  }, [contentType, server, user, pass]);

  // 2. Cargar los contenidos de la categoría seleccionada
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
      genres: (item as any).genre || (contentType === 'movies' ? 'Película VOD' : contentType === 'series' ? 'Serie' : 'TV en Vivo'),
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
    if (streams.length > 0 && streams[focusedGridIndex]) {
      const timer = setTimeout(() => {
        fetchMetadataForFocusedItem(streams[focusedGridIndex]);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [focusedGridIndex, streams, fetchMetadataForFocusedItem]);

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
        genres: 'Película',
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
      // Para canales de TV, reproducir directo
      const live = item as XtreamStream;
      const streamId = live.stream_id || (live as any).id;
      const streamUrl = XtreamService.buildLiveStreamUrl(server, user, pass, streamId);
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
    const streamUrl = XtreamService.buildSeriesStreamUrl(server, user, pass, episode.id, episode.container_extension || 'mp4');
    onPlayStream({
      id: `series_${episode.id}`,
      title: `${series.name} - T${selectedSeasonNumber}E${episode.episode_num}: ${episode.title}`,
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

      // ── CASO 1: PANTALLA COMPLETA DE DETALLES DE PELÍCULA (IMAGEN 2) ──
      if (focusZone === 'movie_detail' && selectedMovieDetail) {
        switch (e.key) {
          case 'ArrowLeft':
            setDetailBtnIndex((prev) => Math.max(0, prev - 1));
            break;

          case 'ArrowRight':
            setDetailBtnIndex((prev) => Math.min(3, prev + 1));
            break;

          case 'Enter':
          case ' ':
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
              // Botón 1: Abrir en Reproductor Externo (VLC / MX Player)
              openExternalPlayer(selectedMovieDetail.streamUrl, selectedMovieDetail.meta.title);
            } else if (detailBtnIndex === 2) {
              // Botón 2: Tráiler
              if (selectedMovieDetail.meta.youtubeTrailer) {
                window.open(`https://www.youtube.com/watch?v=${selectedMovieDetail.meta.youtubeTrailer}`, '_blank');
              } else {
                window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedMovieDetail.meta.title + ' trailer')}`, '_blank');
              }
            } else if (detailBtnIndex === 3) {
              // Botón 3: Añadir a Mi Lista
              setIsSavedInList((prev) => !prev);
            }
            break;

          case 'Escape':
          case 'Backspace':
          case 'GoBack':
            e.preventDefault();
            e.stopPropagation();
            setSelectedMovieDetail(null);
            setFocusZone('grid');
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

          case 'Enter':
          case ' ':
          case 'Select':
            if (seriesFocusZone === 'episodes' && currentSeasonEpisodes[focusedEpisodeIndex]) {
              playEpisode(currentSeasonEpisodes[focusedEpisodeIndex]);
            } else if (seriesFocusZone === 'seasons') {
              setSeriesFocusZone('episodes');
              setFocusedEpisodeIndex(0);
            } else if (seriesFocusZone === 'close') {
              setSelectedSeriesDetails(null);
              setFocusZone('grid');
            }
            break;

          case 'Escape':
          case 'Backspace':
          case 'GoBack':
            setSelectedSeriesDetails(null);
            setFocusZone('grid');
            break;
        }
        return;
      }

      // ── CASO 3: CATÁLOGO PRINCIPAL (TIVIMATE STYLE - IMAGEN 1) ──
      switch (e.key) {
        case 'ArrowLeft':
          if (focusZone === 'grid') {
            if (focusedGridIndex % numCols === 0) {
              // Si está en la primera columna, pasa al panel de categorías
              setFocusZone('categories');
            } else {
              setFocusedGridIndex((prev) => Math.max(0, prev - 1));
            }
          }
          break;

        case 'ArrowRight':
          if (focusZone === 'categories') {
            if (streams.length > 0) {
              setFocusZone('grid');
              setFocusedGridIndex(0);
            }
          } else if (focusZone === 'grid') {
            if (focusedGridIndex < streams.length - 1) {
              setFocusedGridIndex((prev) => prev + 1);
            }
          }
          break;

        case 'ArrowUp':
          if (focusZone === 'sidebar_back') {
            // Ya está en el botón superior
          } else if (focusZone === 'categories') {
            if (focusedCatIndex > 0) {
              const nextIdx = focusedCatIndex - 1;
              setFocusedCatIndex(nextIdx);
              if (categories[nextIdx]) {
                setSelectedCategoryId(categories[nextIdx].category_id);
              }
            } else {
              // Subir al botón "Volver" en la cabecera del sidebar
              setFocusZone('sidebar_back');
            }
          } else if (focusZone === 'grid') {
            if (focusedGridIndex >= numCols) {
              setFocusedGridIndex((prev) => prev - numCols);
            }
          }
          break;

        case 'ArrowDown':
          if (focusZone === 'sidebar_back') {
            setFocusZone('categories');
            setFocusedCatIndex(0);
          } else if (focusZone === 'categories') {
            if (focusedCatIndex < categories.length - 1) {
              const nextIdx = focusedCatIndex + 1;
              setFocusedCatIndex(nextIdx);
              if (categories[nextIdx]) {
                setSelectedCategoryId(categories[nextIdx].category_id);
              }
            }
          } else if (focusZone === 'grid') {
            if (focusedGridIndex + numCols < streams.length) {
              setFocusedGridIndex((prev) => prev + numCols);
            } else if (focusedGridIndex < streams.length - 1) {
              setFocusedGridIndex(streams.length - 1);
            }
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusZone === 'sidebar_back') {
            onClose();
          } else if (focusZone === 'categories') {
            if (categories[focusedCatIndex]) {
              setSelectedCategoryId(categories[focusedCatIndex].category_id);
              if (streams.length > 0) {
                setFocusZone('grid');
                setFocusedGridIndex(0);
              }
            }
          } else if (focusZone === 'grid') {
            if (streams[focusedGridIndex]) {
              handleItemSelect(streams[focusedGridIndex]);
            }
          }
          break;

        case 'Escape':
        case 'Backspace':
        case 'GoBack':
          e.preventDefault();
          e.stopPropagation();
          if (focusZone === 'grid') {
            setFocusZone('categories');
          } else {
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
    focusedCatIndex,
    focusedGridIndex,
    categories,
    streams,
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
              {focusedMetadata?.genres && <span className="text-cyan-400">• {focusedMetadata.genres}</span>}
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
          {/* Título de la Categoría Activa */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase text-white flex items-center space-x-2">
              <span className="text-cyan-400">{activeCategory?.category_name || 'Contenido'}</span>
              <span className="text-xs text-zinc-500 font-normal">
                ({streams.length} {contentType === 'live' ? 'canales' : 'títulos'})
              </span>
            </h2>

            {(loadingStreams || loadingSeriesModal) && (
              <div className="flex items-center space-x-2 text-xs text-cyan-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{loadingSeriesModal ? 'Cargando episodios de la serie...' : 'Cargando lista...'}</span>
              </div>
            )}
          </div>

          {/* Cuadrícula / Fila de Posters (5 Columnas fijas para D-Pad 1:1) */}
          {contentType !== 'live' ? (
            <div className="grid grid-cols-5 gap-5 pb-8">
              {streams.map((item, idx) => (
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
              {streams.map((live, idx) => {
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
                      <span className="text-[10px] text-zinc-500 font-semibold flex items-center space-x-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Canal #{stream.stream_id}</span>
                      </span>
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
              {selectedMovieDetail.meta.genres && <span className="text-cyan-400">• {selectedMovieDetail.meta.genres}</span>}
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
              <span>Play</span>
            </button>

            {/* 2. Botón Reproductor Externo (VLC / MX Player) */}
            <button
              onClick={() => openExternalPlayer(selectedMovieDetail.streamUrl, selectedMovieDetail.meta.title)}
              className={`px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center space-x-2 ${
                detailBtnIndex === 1
                  ? 'bg-cyan-400 text-black ring-4 ring-cyan-300 scale-105 shadow-2xl shadow-cyan-400/50'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in external player</span>
            </button>

            {/* 3. Botón Tráiler */}
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
              <span>Trailer</span>
            </button>

            {/* 4. Botón Añadir a Mi Lista */}
            <button
              onClick={() => setIsSavedInList((prev) => !prev)}
              className={`px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center space-x-2 ${
                detailBtnIndex === 3
                  ? 'bg-cyan-400 text-black ring-4 ring-cyan-300 scale-105 shadow-2xl shadow-cyan-400/50'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSavedInList ? 'fill-cyan-400 text-cyan-400' : ''}`} />
              <span>{isSavedInList ? 'In My list' : 'Add to My list'}</span>
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
                  <span className="text-cyan-400">{selectedSeriesDetails.series.genre || 'Serie'}</span>
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
    </div>
  );
};
