import { useState, useEffect, useRef } from 'react';
import { SidebarDock, SIDEBAR_ITEMS } from './components/showcase/SidebarDock';
import { TopSearchBar } from './components/showcase/TopSearchBar';
import { MainHeroStage } from './components/showcase/MainHeroStage';
import { SettingsModal } from './components/settings/SettingsModal';
import { VideoPlayer } from './components/player/VideoPlayer';
import { SearchModal } from './components/search/SearchModal';
import { ProfileSelectorModal } from './components/profiles/ProfileSelectorModal';
import { ExitModal } from './components/common/ExitModal';
import { SplashScreen } from './components/splash/SplashScreen';
import { SeriviaLayout } from './components/serivia/SeriviaLayout';
import { TvLoginScreen } from './components/auth/TvLoginScreen';
import { AdminPanelModal } from './components/admin/AdminPanelModal';
import { UpdateModal } from './components/common/UpdateModal';
import { FullCatalogExplorer } from './components/explorer/FullCatalogExplorer';
import { playWithNativePlayer } from './utils/nativePlayer';
import { SHOWCASE_MOVIES, SHOWCASE_SERIES } from './mock/showcaseData';
import type { SidebarTabId, ShowcaseItem } from './types/showcase';
import type { MovieItem } from './types';
import { usePlaylistStore } from './store/usePlaylistStore';
import { useAuthStore } from './store/useAuthStore';
import { PLAN_CONFIGS } from './types/auth';
import { StorageService } from './services/storage';
import { useXtreamHomeFeed } from './hooks/useXtreamHomeFeed';
import type { ContentTag } from './hooks/useXtreamHomeFeed';
import { CatalogMatcherService } from './services/catalogMatcherService';
import { ImagePreloadService } from './services/imagePreloadService';
import { TrailerModal } from './components/player/TrailerModal';
import { TmdbService } from './services/tmdb';
import { XtreamService } from './services/xtream';
import { useFavoritesStore } from './store/useFavoritesStore';
import { useAdminFeaturedStore } from './store/useAdminFeaturedStore';
import { QuickFavoriteModal, type QuickFavoriteItem } from './components/common/QuickFavoriteModal';
import { HoldProgressIndicator } from './components/common/HoldProgressIndicator';
import { InitialSyncOverlay } from './components/common/InitialSyncOverlay';
import { CatalogCacheService } from './services/catalogCacheService';

type FocusSection = 'sidebar' | 'hero_buttons' | 'thumbnails';

export function App() {
  const { currentUser, isAuthenticated, isAdmin, initializeAuth, login } = useAuthStore();
  const { 
    activePlaylist, 
    liveStreams, 
    vodMovies,
    loadStoredPlaylists, 
    loadUserPlaylists,
    syncCurrentPlaylist
  } = usePlaylistStore();

  const { featuredItems: adminFeaturedItems, loadFeaturedItems } = useAdminFeaturedStore();

  // ─── Hook de Feed Real desde Xtream ───────────────────────────────────────
  // Carga las películas REALES de la lista activa, enriquecidas con TMDb
  // y clasificadas con tags ESTRENO / PRÓXIMAMENTE / NUEVO / TENDENCIA
  const homeFeed = useXtreamHomeFeed(activePlaylist);

  // Helper: convierte tag a texto de fecha/badge para el hero
  const tagToReleaseDateText = (tag: ContentTag): string => {
    if (tag === 'ESTRENO')       return 'Recién Añadido';
    if (tag === 'PRÓXIMAMENTE')  return 'Próximamente';
    if (tag === 'NUEVO')         return 'Nuevo';
    return 'Tendencia';
  };

  // Estados de navegación y foco
  const [activeTab, setActiveTab] = useState<SidebarTabId>('movies');
  const [focusedTab, setFocusedTab] = useState<SidebarTabId>('movies');
  const [focusedZone, setFocusedZone] = useState<FocusSection>('sidebar');
  const [heroBtnIndex, setHeroBtnIndex] = useState(0); // 0: Watch now, 1: Favorite, 2: Trailer
  
  // Hook de favoritos persistidos en IndexedDB
  const { favorites, isFavorite, toggleFavorite, loadFavorites } = useFavoritesStore();

  useEffect(() => {
    loadFavorites();
    loadFeaturedItems();
  }, [loadFavorites, loadFeaturedItems]);

  useEffect(() => {
    if (isAdmin) {
      document.body.classList.add('admin-mode');
    } else {
      document.body.classList.remove('admin-mode');
    }
  }, [isAdmin]);

  // Modal y feedback de pulsación larga (3 segundos) para Favoritos
  const [quickFavItem, setQuickFavItem] = useState<QuickFavoriteItem | null>(null);
  const [isQuickFavOpen, setIsQuickFavOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const isHoldingOkRef = useRef(false);
  const hasTriggeredLongPressRef = useRef(false);

  // Catálogo activo según pestaña (Favoritos, Películas o Series)
  // Prioridad: 100% contenidos reales del servidor Xtream activo o favoritos guardados
  const currentCatalog: ShowcaseItem[] = (activeTab === 'favorites')
    ? (favorites && favorites.length > 0)
      ? favorites.map((fav) => ({
          id: fav.id,
          title: fav.title.toUpperCase(),
          subtitle: fav.title,
          backdropUrl: fav.backdropUrl || fav.posterUrl || '',
          thumbnailUrl: fav.posterUrl || fav.backdropUrl || '',
          releaseDateText: '⭐ Favorito',
          statusBadge: 'TENDENCIA' as const,
          genresText: fav.genresText || 'Mis Favoritos',
          year: fav.year || '2026',
          rating: fav.rating || '★ 9.0',
          duration: fav.type === 'live' ? 'DIRECTO' : 'HD',
          synopsis: 'Título guardado en tus favoritos.',
          type: fav.type === 'series' ? 'series' as const : 'movie' as const,
          streamUrl: fav.streamUrl,
        }))
      : [{
          id: 'empty_favorites',
          title: 'AÚN NO TIENES FAVORITOS',
          subtitle: 'Mantén presionado ENTER durante 3 segundos en cualquier película, serie o canal',
          backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920',
          thumbnailUrl: 'https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?q=80&w=400',
          releaseDateText: 'Acceso Rápido',
          statusBadge: 'NUEVO' as const,
          genresText: 'Favoritos',
          year: '2026',
          rating: '★ VIP',
          duration: '3 segundos',
          synopsis: 'Para agregar cualquier película, serie o canal de TV a Favoritos, simplemente mantén presionado el botón ENTER / OK de tu control remoto durante 3 segundos sobre la carátula o canal.',
          type: 'movie' as const,
        }]
    : (activeTab === 'series') 
    ? (adminFeaturedItems.filter((i) => i.type === 'series').length > 0)
      ? adminFeaturedItems.filter((i) => i.type === 'series').map((s) => ({
          id: s.id,
          title: s.title.toUpperCase(),
          subtitle: s.synopsis && s.synopsis.length > 15 && !s.synopsis.startsWith('Disfruta')
            ? s.synopsis
            : (s.genresText ? `${s.genresText} • ${s.year || '2026'}` : (s.title.includes(String(s.year || '')) ? s.title : `${s.title} (${s.year || '2026'})`)),
          backdropUrl: s.backdropUrl || s.posterUrl,
          thumbnailUrl: s.posterUrl,
          releaseDateText: s.badge === 'ESTRENO' ? 'Estreno' : s.badge === 'PRÓXIMAMENTE' ? 'Próximamente' : 'Recién Añadida',
          statusBadge: s.badge,
          genresText: s.genresText || 'Serie TV',
          year: s.year || '2026',
          rating: s.rating || '8.8 ★',
          duration: s.duration || 'Temporadas',
          synopsis: s.synopsis || 'Disfruta de esta serie en tu catálogo.',
          type: 'series' as const,
          streamUrl: s.streamUrl,
          trailerYoutubeKey: s.trailerYoutubeKey,
        }))
      : (homeFeed.featuredSeries && homeFeed.featuredSeries.length > 0)
      ? homeFeed.featuredSeries.map((s) => ({
          id: s.id,
          title: s.title.toUpperCase(),
          subtitle: s.title,
          backdropUrl: s.backdropUrl,
          thumbnailUrl: s.posterUrl,
          releaseDateText: 'Serie en Catálogo',
          statusBadge: (s.tag || 'ESTRENO') as any,
          genresText: s.genres?.join(', ') || 'Serie TV',
          year: s.year || '2026',
          rating: s.rating || '8.8 ★',
          duration: 'Temporadas',
          synopsis: s.synopsis || 'Disfruta de esta serie en tu catálogo.',
          type: 'series' as const,
          streamUrl: s.streamUrl,
        }))
      : SHOWCASE_SERIES 
    : (activeTab === 'movies')
    ? (adminFeaturedItems.filter((i) => i.type === 'movie').length > 0)
      ? adminFeaturedItems.filter((i) => i.type === 'movie').map((m) => ({
          id: m.id,
          title: m.title.toUpperCase(),
          subtitle: m.synopsis && m.synopsis.length > 15 && !m.synopsis.startsWith('Disfruta')
            ? m.synopsis
            : (m.genresText ? `${m.genresText} • ${m.year || '2026'}` : (m.title.includes(String(m.year || '')) ? m.title : `${m.title} (${m.year || '2026'})`)),
          backdropUrl: m.backdropUrl || m.posterUrl,
          thumbnailUrl: m.posterUrl,
          releaseDateText: m.badge === 'ESTRENO' ? 'Estreno' : m.badge === 'PRÓXIMAMENTE' ? 'Próximamente' : 'Recién Añadida',
          statusBadge: m.badge,
          genresText: m.genresText || 'Película',
          year: m.year || '2026',
          rating: m.rating || '8.5 ★',
          duration: m.duration || 'Película',
          synopsis: m.synopsis || 'Disfruta de esta película en tu catálogo.',
          type: 'movie' as const,
          streamUrl: m.streamUrl,
          trailerYoutubeKey: m.trailerYoutubeKey,
        }))
      : (homeFeed.featuredMovies && homeFeed.featuredMovies.length > 0)
      ? homeFeed.featuredMovies.map((m) => ({
          id: m.id,
          title: m.title.toUpperCase(),
          subtitle: m.synopsis && m.synopsis.length > 15 && !m.synopsis.startsWith('Disfruta')
            ? m.synopsis
            : (m.genres?.length ? `${m.genres.join(', ')} • ${m.year || '2026'}` : (m.title.includes(String(m.year || '')) ? m.title : `${m.title} (${m.year || '2026'})`)),
          backdropUrl: m.backdropUrl,
          thumbnailUrl: m.posterUrl,
          releaseDateText: tagToReleaseDateText(m.tag),
          statusBadge: m.tag as any,
          genresText: m.genres.join(', '),
          year: m.year,
          rating: m.rating,
          duration: m.duration,
          synopsis: m.synopsis,
          type: 'movie' as const,
          streamUrl: m.streamUrl,
          trailerYoutubeKey: m.trailerYoutubeKey,
          tmdbId: m.tmdbId,
        }))
      : (vodMovies && vodMovies.length > 0)
        ? vodMovies.map((m: any) => ({
            id: `vod_${m.id}`,
            title: (m.title || 'PELÍCULA').toUpperCase(),
            subtitle: m.synopsis && m.synopsis.length > 15 && !m.synopsis.startsWith('Disfruta')
            ? m.synopsis
            : (m.genresText ? `${m.genresText} • ${m.year || '2026'}` : (m.title.includes(String(m.year || '')) ? m.title : `${m.title} (${m.year || '2026'})`)),
            backdropUrl: m.backdropUrl,
            thumbnailUrl: m.posterUrl,
            releaseDateText: 'Recién Añadido',
            statusBadge: 'ESTRENO' as const,
            genresText: Array.isArray(m.genres) ? m.genres.join(', ') : (m.genresText || 'Película'),
            year: m.year,
            rating: m.rating,
            duration: m.duration,
            synopsis: m.synopsis,
            type: 'movie' as const,
            streamUrl: m.streamUrl,
          }))
        : SHOWCASE_MOVIES
    : (adminFeaturedItems.length > 0)
      ? adminFeaturedItems.map((item) => ({
          id: item.id,
          title: item.title.toUpperCase(),
          subtitle: `${item.title} (${item.year || '2026'})`,
          backdropUrl: item.backdropUrl || item.posterUrl,
          thumbnailUrl: item.posterUrl,
          releaseDateText: item.badge === 'ESTRENO' ? 'Estreno' : item.badge === 'PRÓXIMAMENTE' ? 'Próximamente' : 'Recién Añadida',
          statusBadge: item.badge,
          genresText: item.genresText || (item.type === 'series' ? 'Serie TV' : 'Película'),
          year: item.year || '2026',
          rating: item.rating || '8.5 ★',
          duration: item.duration || (item.type === 'series' ? 'Temporadas' : 'Película'),
          synopsis: item.synopsis || (item.type === 'series' ? 'Disfruta de esta serie en tu catálogo.' : 'Disfruta de esta película en tu catálogo.'),
          type: item.type,
          streamUrl: item.streamUrl,
          trailerYoutubeKey: item.trailerYoutubeKey,
        }))
      : (homeFeed.featured.length > 0)
        ? homeFeed.featured.map((m) => ({
            id: m.id,
            title: m.title.toUpperCase(),
            subtitle: `${m.title} (${m.year})`,
            backdropUrl: m.backdropUrl,
            thumbnailUrl: m.posterUrl,
            releaseDateText: tagToReleaseDateText(m.tag),
            statusBadge: m.tag as any,
            genresText: m.genres.join(', '),
            year: m.year,
            rating: m.rating,
            duration: m.duration,
            synopsis: m.synopsis,
            type: 'movie' as const,
            streamUrl: m.streamUrl,
            trailerYoutubeKey: m.trailerYoutubeKey,
            tmdbId: m.tmdbId,
          }))
        : (homeFeed.featuredMovies && homeFeed.featuredMovies.length > 0)
          ? homeFeed.featuredMovies.map((m) => ({
              id: m.id,
              title: m.title.toUpperCase(),
              subtitle: m.synopsis && m.synopsis.length > 15 && !m.synopsis.startsWith('Disfruta')
            ? m.synopsis
            : (m.genres?.length ? `${m.genres.join(', ')} • ${m.year || '2026'}` : (m.title.includes(String(m.year || '')) ? m.title : `${m.title} (${m.year || '2026'})`)),
              backdropUrl: m.backdropUrl,
              thumbnailUrl: m.posterUrl,
              releaseDateText: tagToReleaseDateText(m.tag),
              statusBadge: m.tag as any,
              genresText: m.genres.join(', '),
              year: m.year,
              rating: m.rating,
              duration: m.duration,
              synopsis: m.synopsis,
              type: 'movie' as const,
              streamUrl: m.streamUrl,
              trailerYoutubeKey: m.trailerYoutubeKey,
              tmdbId: m.tmdbId,
            }))
          : SHOWCASE_MOVIES; // Fallback con películas de demo si no hay lista
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  // Estados de modales y reproductor
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<'adult' | 'kids'>('adult');
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [explorerType, setExplorerType] = useState<'movies' | 'series' | 'live'>('movies');
  const [playingItem, setPlayingItem] = useState<ShowcaseItem | null>(null);
  const [activeTheme, setActiveTheme] = useState<'cinematic' | 'serivia'>('cinematic');
  const [needsInitialSync, setNeedsInitialSync] = useState(false);

  // ⚡ Verificación inteligente de Caché Local en Disco (IndexedDB)
  // Si no está completo, descarga todo con barra de progreso; si ya existe, entra en 0ms
  useEffect(() => {
    if (!isAuthenticated || !activePlaylist || !activePlaylist.serverUrl) {
      return;
    }

    const checkCache = async () => {
      try {
        const hasCache = await CatalogCacheService.hasCompleteCache(activePlaylist.id);
        if (!hasCache) {
          setNeedsInitialSync(true);
        }
      } catch {
        setNeedsInitialSync(false);
      }
    };

    checkCache();
  }, [isAuthenticated, activePlaylist?.id]);

  // 🎬 Modal de Tráiler Oficial de YouTube / Próximamente
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [trailerMovie, setTrailerMovie] = useState<{
    title: string;
    youtubeKey?: string | null;
    releaseDateText?: string;
    synopsis?: string;
    backdropUrl?: string;
    posterUrl?: string;
  } | null>(null);

  // ⚡ Precarga agresiva de imágenes en memoria RAM para el carrusel (estilo Glide en Kai TV)
  useEffect(() => {
    if (!currentCatalog || currentCatalog.length === 0) return;
    const nextIndices = [
      (carouselIndex + 1) % currentCatalog.length,
      (carouselIndex + 2) % currentCatalog.length,
      (carouselIndex + 3) % currentCatalog.length,
    ];
    const urls = nextIndices.flatMap((idx) => [
      currentCatalog[idx]?.backdropUrl,
      currentCatalog[idx]?.thumbnailUrl,
    ]);
    ImagePreloadService.preloadBatch(urls);
  }, [carouselIndex, currentCatalog]);

  // 🎯 Reproducción inteligente con Deep Link / Smart Matching y Fallback a Trailer
  const handlePlayShowcaseItem = async (item: ShowcaseItem) => {
    // 0. Si es una serie de la lista Xtream, resolver el episodio 1 y reproducirlo de inmediato
    if (item.type === 'series' || item.id.startsWith('series_')) {
      const seriesId = item.id.replace('series_', '');
      const server = activePlaylist?.serverUrl || '';
      const user = activePlaylist?.username || '';
      const pass = activePlaylist?.password || '';

      if (server && user && pass) {
        try {
          const details = await XtreamService.getSeriesInfo(server, user, pass, seriesId);
          const episodesMap = details?.episodes || {};
          const seasons = Object.keys(episodesMap).sort((a, b) => Number(a) - Number(b));
          const firstSeason = seasons[0];
          const firstEp = firstSeason && episodesMap[firstSeason] ? episodesMap[firstSeason][0] : null;

          if (firstEp) {
            const epUrl = XtreamService.buildSeriesStreamUrl(
              server,
              user,
              pass,
              firstEp.id,
              firstEp.container_extension || 'mp4'
            );
            const epTitle = `${item.title} - T${firstSeason}:E${firstEp.episode_num || 1} ${firstEp.title || ''}`;

            if (
              playWithNativePlayer({
                streamUrl: epUrl,
                title: epTitle,
                posterUrl: item.thumbnailUrl || item.backdropUrl,
                isLive: false,
              })
            ) {
              return;
            }

            setPlayingItem({
              ...item,
              title: epTitle,
              streamUrl: epUrl,
            });
            return;
          }
        } catch (err) {
          console.warn('Error al obtener info de serie para reproducir:', err);
        }
      }

      // Si no pudo resolver el episodio, abrir el catálogo de series directamente
      setExplorerType('series');
      setIsExplorerOpen(true);
      return;
    }

    // 1. Si ya tiene URL de Xtream con usuario activo, reproducir de inmediato con Google Media3 ExoPlayer
    if (
      item.streamUrl &&
      !item.streamUrl.includes('test-streams.mux.dev')
    ) {
      if (
        playWithNativePlayer({
          streamUrl: item.streamUrl,
          title: item.title,
          posterUrl: item.backdropUrl,
          isLive: false,
        })
      ) {
        return;
      }
      setPlayingItem(item);
      return;
    }

    // 2. Si no tiene URL directa o viene de TMDb, intentar resolverla en la lista Xtream local en 0-5ms
    if (activePlaylist) {
      const match = await CatalogMatcherService.resolveMovieStream(activePlaylist, {
        title: item.title,
        tmdbId: item.tmdbId,
        streamUrl: item.streamUrl,
      });

      if (match.isMatch && match.resolvedUrl) {
        if (
          playWithNativePlayer({
            streamUrl: match.resolvedUrl,
            title: match.matchedItem?.name || item.title,
            posterUrl: match.matchedItem?.icon || item.backdropUrl,
            isLive: false,
          })
        ) {
          return;
        }
        setPlayingItem({
          ...item,
          streamUrl: match.resolvedUrl,
        });
        return;
      }
    }

    // 3. Si no existe en la lista del usuario (ej: es un PRÓXIMAMENTE o un estreno no subido aún)
    if (item.statusBadge === 'PRÓXIMAMENTE' || item.trailerYoutubeKey || !item.streamUrl) {
      let ytKey = item.trailerYoutubeKey;
      if (!ytKey && item.tmdbId) {
        ytKey = (await TmdbService.getMovieTrailer(Number(item.tmdbId))) || undefined;
      }
      setTrailerMovie({
        title: item.title,
        youtubeKey: ytKey || null,
        releaseDateText: item.releaseDateText,
        synopsis: item.synopsis,
        backdropUrl: item.backdropUrl,
        posterUrl: item.thumbnailUrl,
      });
      setIsTrailerOpen(true);
      return;
    }

    // 4. Fallback al explorador de catálogo
    setExplorerType('movies');
    setIsExplorerOpen(true);
  };

  const handleOpenTrailer = async (item: ShowcaseItem) => {
    let ytKey = item.trailerYoutubeKey;
    if (!ytKey && item.tmdbId) {
      ytKey = (await TmdbService.getMovieTrailer(Number(item.tmdbId))) || undefined;
    }
    setTrailerMovie({
      title: item.title,
      youtubeKey: ytKey || null,
      releaseDateText: item.releaseDateText,
      synopsis: item.synopsis,
      backdropUrl: item.backdropUrl,
      posterUrl: item.thumbnailUrl,
    });
    setIsTrailerOpen(true);
  };

  // Temporizador de rotación automática estilo carrusel (6 segundos)
  const autoPlayTimerRef = useRef<number | null>(null);
  const isUserInteractingRef = useRef(false);

  useEffect(() => {
    initializeAuth();
    loadStoredPlaylists();
    StorageService.getActiveProfile().then((p) => setCurrentProfile(p));
    StorageService.getActiveTheme().then((t) => setActiveTheme(t || 'cinematic'));
    StorageService.getShowSplashAnimation().then((shouldShow) => {
      if (!shouldShow) setIsSplashVisible(false);
    });
  }, [initializeAuth, loadStoredPlaylists]);

  // Al cambiar el usuario autenticado, cargar sus listas exclusivas
  useEffect(() => {
    if (currentUser && currentUser.playlists && currentUser.playlists.length > 0) {
      loadUserPlaylists(currentUser.playlists);
    }
  }, [currentUser, loadUserPlaylists]);

  // Reiniciar índice al cambiar entre Películas y Series
  useEffect(() => {
    setCarouselIndex(0);
  }, [activeTab]);

  // Rotación automática del carrusel cuando no hay interacción activa y el usuario está explorando los thumbnails
  useEffect(() => {
    if (isSplashVisible || isSettingsOpen || isSearchOpen || playingItem || focusedZone === 'sidebar') return;

    const startTimer = () => {
      autoPlayTimerRef.current = window.setTimeout(() => {
        if (!isUserInteractingRef.current) {
          setCarouselIndex((prev) => (prev + 1) % currentCatalog.length);
        }
        startTimer();
      }, 7000);
    };

    startTimer();
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [currentCatalog.length, isSplashVisible, isSettingsOpen, isSearchOpen, playingItem, focusedZone]);

  const activeItem = currentCatalog[carouselIndex] || currentCatalog[0];

  const handleSelectTab = (tab: SidebarTabId) => {
    setActiveTab(tab);
    setFocusedTab(tab);
    if (tab === 'settings') {
      setIsSettingsOpen(true);
    } else if (tab === 'movies') {
      setExplorerType('movies');
      setIsExplorerOpen(true);
    } else if (tab === 'series') {
      setExplorerType('series');
      setIsExplorerOpen(true);
    } else if (tab === 'live') {
      setExplorerType('live');
      setIsExplorerOpen(true);
    } else if (tab === 'favorites') {
      setActiveTab('favorites');
      setFocusedTab('favorites');
      setFocusedZone('thumbnails');
      setCarouselIndex(0);
    }
  };

  // Motor de navegación D-pad para este concepto de interfaz
  useEffect(() => {
    // 🚀 Si está en modo Administrador, desactivar COMPLETAMENTE el control por mando (solo cursor de PC)
    if (
      isAdmin ||
      activeTheme === 'serivia' ||
      isSplashVisible ||
      !isAuthenticated ||
      isSettingsOpen ||
      isAdminPanelOpen ||
      isSearchOpen ||
      isProfileOpen ||
      isExitModalOpen ||
      isExplorerOpen ||
      isUpdateOpen ||
      playingItem ||
      isTrailerOpen
    ) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      isUserInteractingRef.current = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
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

      if (isOk) {
        e.preventDefault();
        if (focusedZone === 'sidebar') {
          if (focusedTab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            handleSelectTab(focusedTab);
          }
          return;
        }

        // Si está en thumbnails o hero_buttons, iniciar temporizador de 2.5s para Favoritos
        if (!isHoldingOkRef.current) {
          isHoldingOkRef.current = true;
          hasTriggeredLongPressRef.current = false;
          const currentTarget = activeItem;

          const startTime = Date.now();
          holdIntervalRef.current = window.setInterval(() => {
            const elapsed = Date.now() - startTime;
            setHoldProgress(Math.min(100, Math.round((elapsed / 2500) * 100)));
          }, 50);

          holdTimerRef.current = window.setTimeout(() => {
            hasTriggeredLongPressRef.current = true;
            if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
            setHoldProgress(0);

            if (currentTarget && currentTarget.id !== 'empty_favorites') {
              setQuickFavItem({
                id: currentTarget.id,
                title: currentTarget.title,
                posterUrl: currentTarget.thumbnailUrl,
                backdropUrl: currentTarget.backdropUrl,
                type: currentTarget.type || 'movie',
                year: currentTarget.year,
                streamUrl: currentTarget.streamUrl,
              });
              setIsQuickFavOpen(true);
            }
          }, 2500);
        }
        return;
      }

      if (isBack) {
        e.preventDefault();
        if (focusedZone !== 'sidebar') {
          setFocusedZone('sidebar');
        } else {
          setIsExitModalOpen(true);
        }
        return;
      }

      switch (e.key) {
        // --- FLECHA IZQUIERDA ---
        case 'ArrowLeft':
          if (focusedZone === 'thumbnails') {
            if (carouselIndex > 0) {
              setCarouselIndex(carouselIndex - 1);
            } else {
              setFocusedZone('sidebar');
            }
          } else if (focusedZone === 'hero_buttons') {
            if (heroBtnIndex > 0) {
              setHeroBtnIndex(heroBtnIndex - 1);
            } else {
              setFocusedZone('sidebar');
            }
          }
          break;

        // --- FLECHA DERECHA ---
        case 'ArrowRight':
          if (focusedZone === 'sidebar') {
            setFocusedZone('thumbnails');
          } else if (focusedZone === 'thumbnails') {
            if (carouselIndex < currentCatalog.length - 1) {
              setCarouselIndex(carouselIndex + 1);
            }
          } else if (focusedZone === 'hero_buttons') {
            if (heroBtnIndex < 2) {
              setHeroBtnIndex(heroBtnIndex + 1);
            }
          }
          break;

        // --- FLECHA ARRIBA ---
        case 'ArrowUp':
          if (focusedZone === 'sidebar') {
            const tabsOrder: SidebarTabId[] = SIDEBAR_ITEMS.map((i) => i.id);
            const curIdx = tabsOrder.indexOf(focusedTab);
            if (curIdx > 0) {
              const nextTab = tabsOrder[curIdx - 1];
              setFocusedTab(nextTab);
              setActiveTab(nextTab);
            }
          } else if (focusedZone === 'thumbnails') {
            setFocusedZone('hero_buttons');
          }
          break;

        // --- FLECHA ABAJO ---
        case 'ArrowDown':
          if (focusedZone === 'sidebar') {
            const tabsOrder: SidebarTabId[] = SIDEBAR_ITEMS.map((i) => i.id);
            const curIdx = tabsOrder.indexOf(focusedTab);
            if (curIdx < tabsOrder.length - 1) {
              const nextTab = tabsOrder[curIdx + 1];
              setFocusedTab(nextTab);
              setActiveTab(nextTab);
            }
          } else if (focusedZone === 'hero_buttons') {
            setFocusedZone('thumbnails');
          }
          break;

        // --- ENTER / OK ---
        case 'Enter':
        case ' ':
          if (focusedZone === 'hero_buttons') {
            if (heroBtnIndex === 0) {
              handlePlayShowcaseItem(activeItem);
            } else {
              handleOpenTrailer(activeItem);
            }
          } else if (focusedZone === 'thumbnails') {
            handlePlayShowcaseItem(activeItem);
          } else if (focusedZone === 'sidebar') {
            if (focusedTab === 'settings') {
              setIsSettingsOpen(true);
            } else {
              handleSelectTab(focusedTab);
            }
          }
          break;

        // --- ATRÁS / ESCAPE ---
        case 'Escape':
        case 'Backspace':
        case 'GoBack':
          if (focusedZone !== 'sidebar') {
            setFocusedZone('sidebar');
          } else {
            setIsExitModalOpen(true);
          }
          break;
      }

      // Restablecer flag de interacción tras 5 segundos de inactividad
      window.setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 5000);
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
        // 🛑 Si la tecla no se presionó inicialmente en esta pantalla (ej. venía del reproductor), IGNORAR
        if (!isHoldingOkRef.current) {
          return;
        }

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
          return;
        }

        // Si fue pulsación corta:
        if (focusedZone === 'hero_buttons') {
          if (heroBtnIndex === 0) {
            handlePlayShowcaseItem(activeItem);
          } else if (heroBtnIndex === 1) {
            toggleFavorite({
              id: activeItem.id,
              title: activeItem.title,
              type: activeItem.type || 'movie',
              posterUrl: activeItem.thumbnailUrl,
              backdropUrl: activeItem.backdropUrl,
              streamUrl: activeItem.streamUrl,
              year: activeItem.year,
              rating: activeItem.rating,
              genresText: activeItem.genresText,
            });
          } else if (heroBtnIndex === 2) {
            handleOpenTrailer(activeItem);
          }
        } else if (focusedZone === 'thumbnails') {
          handlePlayShowcaseItem(activeItem);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, [
    activeTheme,
    focusedZone,
    carouselIndex,
    heroBtnIndex,
    focusedTab,
    currentCatalog.length,
    activeItem,
    isSplashVisible,
    isAuthenticated,
    isSettingsOpen,
    isSearchOpen,
    isProfileOpen,
    isExitModalOpen,
    isExplorerOpen,
    isUpdateOpen,
    playingItem,
    isTrailerOpen,
  ]);

  return (
    <main className={`relative w-screen h-screen overflow-hidden bg-[#0A0E1A] text-white flex font-sans ${
      isAdmin ? 'admin-mode cursor-default select-text' : 'select-none'
    }`}>
      {/* 1. Splash Screen oficial con animación */}
      {isSplashVisible && (
        <SplashScreen onFinish={() => setIsSplashVisible(false)} />
      )}

      {/* 🚀 Sincronización Inicial con Barra de Progreso (Solo en la primera apertura) */}
      {needsInitialSync && activePlaylist && !isSplashVisible && (
        <InitialSyncOverlay
          playlist={activePlaylist}
          onFinished={() => {
            setNeedsInitialSync(false);
            syncCurrentPlaylist();
          }}
        />
      )}

      {/* 2. Pantalla de Bienvenida y Login para TV (Si no hay sesión activa y terminó el splash) */}
      {!isSplashVisible && !isAuthenticated && (
        <TvLoginScreen 
          onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
          disabled={isUpdateOpen || isAdminPanelOpen}
        />
      )}

      {/* RENDERIZADO DEL TEMA ACTIVO: Serivia Modern Deck o Cinematic Showcase (Solo si está autenticado) */}
      {!isSplashVisible && isAuthenticated && (
        activeTheme === 'serivia' ? (
          <SeriviaLayout
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenExplorer={(type) => {
              setExplorerType(type);
              setIsExplorerOpen(true);
            }}
            onOpenTrailer={(movie) => {
              setTrailerMovie({
                title: movie.title,
                youtubeKey: movie.trailerYoutubeKey || movie.youtubeKey || null,
                releaseDateText: movie.releaseDateText || 'Estreno',
                synopsis: movie.synopsis || '',
                backdropUrl: movie.backdropUrl || '',
                posterUrl: movie.posterUrl || movie.thumbnailUrl || '',
              });
              setIsTrailerOpen(true);
            }}
            onOpenExitModal={() => setIsExitModalOpen(true)}
            activePlaylist={activePlaylist}
            homeFeed={homeFeed}
            isActive={
              !isSplashVisible &&
              isAuthenticated &&
              !isSettingsOpen &&
              !isAdminPanelOpen &&
              !isSearchOpen &&
              !isProfileOpen &&
              !isExitModalOpen &&
              !isExplorerOpen &&
              !isUpdateOpen &&
              !playingItem &&
              !isTrailerOpen
            }
            onPlayMedia={async (media) => {
              // 🚀 1. Si ya tiene streamUrl directo Xtream, reproducir de inmediato con ExoPlayer nativo
              if (media.streamUrl && playWithNativePlayer({
                streamUrl: media.streamUrl,
                title: media.title,
                posterUrl: media.posterUrl,
                isLive: media.isLive,
              })) {
                return;
              }

              if (activePlaylist) {
                const match = await CatalogMatcherService.resolveMovieStream(activePlaylist, {
                  title: media.title,
                  streamUrl: media.streamUrl,
                });
                const urlToPlay = (match.isMatch && match.resolvedUrl) ? match.resolvedUrl : media.streamUrl;
                if (urlToPlay && playWithNativePlayer({
                  streamUrl: urlToPlay,
                  title: match.matchedItem?.name || media.title,
                  posterUrl: match.matchedItem?.icon || media.posterUrl,
                  isLive: media.isLive,
                })) {
                  return;
                }
              }

              setPlayingItem({
                id: media.id,
                title: media.title,
                subtitle: media.title,
                backdropUrl: media.posterUrl || '',
                thumbnailUrl: media.posterUrl || '',
                releaseDateText: media.isLive ? 'En Directo' : 'En reproducción',
                statusBadge: 'ESTRENO',
                genresText: 'Streaming',
                year: '2026',
                rating: '13+',
                duration: 'HD',
                synopsis: 'Disfruta de tu contenido.',
                type: media.isLive ? 'movie' : 'movie',
                streamUrl: media.streamUrl,
              });
            }}
          />
        ) : (
          <>
            {/* 2. Barra Lateral Flotante a la Izquierda: TV, Películas, Series y Configuración */}
            <SidebarDock
              activeTab={activeTab}
              focusedTab={focusedTab}
              isSidebarFocused={focusedZone === 'sidebar'}
              onSelectTab={handleSelectTab}
            />

            {/* 3. Escenario Principal: Barra Superior Limpia + Hero Stage Central */}
            <div className="flex-1 h-full flex flex-col justify-between overflow-hidden">
              {/* Barra Superior con Logo e Indicador de Suscripción */}
              <TopSearchBar
                expDate={currentUser?.expDate || activePlaylist?.expDate || '2026-12-31'}
                planBadge={currentUser ? PLAN_CONFIGS[currentUser.plan].badge : undefined}
              />

              {/* Zona Central: Gran Imagen + Título Monumental + Botones + Miniaturas Carrusel */}
              <MainHeroStage
                item={activeItem}
                items={currentCatalog}
                selectedIndex={carouselIndex}
                focusedZone={
                  focusedZone === 'hero_buttons'
                    ? 'hero_buttons'
                    : 'thumbnails'
                }
                heroButtonIndex={heroBtnIndex}
                isFavorite={isFavorite(activeItem.id)}
                onToggleFavorite={() => {
                  toggleFavorite({
                    id: activeItem.id,
                    title: activeItem.title,
                    type: activeItem.type || 'movie',
                    posterUrl: activeItem.thumbnailUrl,
                    backdropUrl: activeItem.backdropUrl,
                    streamUrl: activeItem.streamUrl,
                    year: activeItem.year,
                    rating: activeItem.rating,
                    genresText: activeItem.genresText,
                  });
                }}
                onSelectThumbnail={(idx) => {
                  setCarouselIndex(idx);
                  setFocusedZone('thumbnails');
                }}
                onPlay={() => handlePlayShowcaseItem(activeItem)}
                onOpenTrailer={() => handleOpenTrailer(activeItem)}
              />
            </div>
          </>
        )
      )}

      {/* Modales del Sistema */}
      <SettingsModal
        isOpen={isSettingsOpen}
        currentTheme={activeTheme}
        onThemeChange={(newTheme) => setActiveTheme(newTheme)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onForceSync={() => setNeedsInitialSync(true)}
        onClose={() => {
          setIsSettingsOpen(false);
          setFocusedZone('sidebar');
        }}
      />

      {/* Panel de Control de Administrador (Gestión de Usuarios, Contraseñas y Listas) */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        onSelectUserToLogin={(username, pass) => {
          setIsAdminPanelOpen(false);
          login(username, pass);
        }}
        onPlayStream={(stream) => {
          setIsAdminPanelOpen(false);
          handlePlayShowcaseItem(stream as any);
        }}
      />

      <SearchModal
        isOpen={isSearchOpen}
        movies={SHOWCASE_MOVIES.map((m) => ({
          id: m.id,
          title: m.title,
          backdropUrl: m.backdropUrl,
          posterUrl: m.thumbnailUrl,
          genres: m.genresText.split(','),
          synopsis: m.synopsis,
          duration: m.duration,
          year: m.year,
          rating: m.rating,
          streamUrl: m.streamUrl,
        }))}
        channels={liveStreams}
        onClose={() => {
          setIsSearchOpen(false);
          setFocusedZone('sidebar');
        }}
        onSelectMovie={(m: MovieItem) => {
          setPlayingItem({
            id: m.id,
            title: m.title,
            subtitle: `${m.title} (${m.year})`,
            backdropUrl: m.backdropUrl,
            thumbnailUrl: m.posterUrl,
            releaseDateText: 'Estreno',
            statusBadge: 'ESTRENO',
            genresText: m.genres.join(', '),
            year: m.year,
            rating: m.rating,
            duration: m.duration,
            synopsis: m.synopsis,
            type: 'movie',
            streamUrl: m.streamUrl,
          });
        }}
        onSelectChannel={(c) => {
          setPlayingItem({
            id: `live_${c.stream_id}`,
            title: c.name,
            subtitle: `Canal #${c.stream_id}`,
            backdropUrl: c.stream_icon || '',
            thumbnailUrl: c.stream_icon || '',
            releaseDateText: 'En Directo',
            statusBadge: 'NUEVO',
            genresText: 'Televisión en Vivo',
            year: '2026',
            rating: 'TP',
            duration: 'DIRECTO',
            synopsis: 'Emisión televisiva en directo.',
            type: 'movie',
            streamUrl: activePlaylist?.serverUrl
              ? `${activePlaylist.serverUrl}/live/${activePlaylist.username}/${activePlaylist.password}/${c.stream_id}.m3u8`
              : 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          });
        }}
      />

      <ProfileSelectorModal
        isOpen={isProfileOpen}
        currentProfile={currentProfile}
        onClose={() => setIsProfileOpen(false)}
        onProfileChanged={(p) => setCurrentProfile(p)}
      />

      {/* Reproductor de Video en Pantalla Completa */}
      {playingItem && (
        <VideoPlayer
          streamUrl={
            playingItem.streamUrl ||
            'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
          }
          title={playingItem.title}
          posterUrl={playingItem.thumbnailUrl}
          contentId={playingItem.id}
          isLive={playingItem.duration === 'DIRECTO'}
          onClose={() => {
            // Al salir del reproductor, cerrar video y regresar con el foco seguro en la barra lateral
            setPlayingItem(null);
            setFocusedZone('sidebar');
          }}
        />
      )}

      {/* Diálogo de Confirmación de Salida */}
      <ExitModal
        isOpen={isExitModalOpen}
        onCancel={() => setIsExitModalOpen(false)}
        onConfirm={() => {
          setIsExitModalOpen(false);
          // 1. Invocar puente nativo oficial (cierre garantizado en Android TV)
          const bridge = (window as unknown as { AppExitBridge?: { exitApp: () => void } }).AppExitBridge;
          if (bridge && typeof bridge.exitApp === 'function') {
            bridge.exitApp();
            return;
          }
          // 2. Invocar plugin oficial de Capacitor
          const cap = (window as unknown as { Capacitor?: { Plugins?: { App?: { exitApp: () => void } } } }).Capacitor;
          if (cap?.Plugins?.App?.exitApp) {
            cap.Plugins.App.exitApp();
            return;
          }
          // 3. Fallback de navegador/Cordova
          if ((window as unknown as { navigator?: { app?: { exitApp?: () => void } } }).navigator?.app?.exitApp) {
            (window as unknown as { navigator: { app: { exitApp: () => void } } }).navigator.app.exitApp();
            return;
          }
          window.close();
        }}
      />

      {/* Explorador de Todo el Catálogo Xtream (Categorías y Carpetas Reales) */}
      {isExplorerOpen && (
        <div className={playingItem ? 'hidden' : 'block'}>
          <FullCatalogExplorer
            key={`${explorerType}_${activePlaylist?.id || 'active'}`}
            playlist={
              activePlaylist ||
              (currentUser?.playlists && currentUser.playlists.length > 0
                ? currentUser.playlists[0]
                : {
                    id: 'default_pl',
                    name: 'Catálogo Principal',
                    type: 'xtream',
                    serverUrl: 'http://line.xnovatv.com:8080',
                    username: 'user1',
                    password: 'user1',
                    isActive: true,
                  })
            }
            initialType={explorerType}
            isActive={!playingItem}
            onClose={() => {
              setIsExplorerOpen(false);
              setFocusedZone('sidebar');
            }}
            onPlayStream={(stream) => {
              // 🚀 1. Intentar reproducir con Google Media3 ExoPlayer nativo (el mismo motor de TiviMate)
              if (playWithNativePlayer({
                streamUrl: stream.streamUrl,
                title: stream.title,
                posterUrl: stream.posterUrl,
                isLive: stream.isLive,
              })) {
                return;
              }

              // 2. Si se ejecuta en navegador web de escritorio, usar reproductor web de respaldo
              setPlayingItem({
                id: stream.id,
                title: stream.title,
                subtitle: stream.title,
                backdropUrl: stream.posterUrl || '',
                thumbnailUrl: stream.posterUrl || '',
                releaseDateText: stream.isLive ? 'En Directo' : 'Película',
                statusBadge: 'NUEVO',
                genresText: stream.isLive ? 'TV en Vivo' : 'Streaming',
                year: '2026',
                rating: 'TP',
                duration: stream.isLive ? 'DIRECTO' : 'HD',
                synopsis: 'Disfruta de tu contenido.',
                type: stream.id.startsWith('series_') ? 'series' : 'movie',
                streamUrl: stream.streamUrl,
              });
            }}
          />
        </div>
      )}

      {/* Verificador y Modal de Actualización Automática OTA */}
      <UpdateModal onOpenStateChange={(isOpen) => setIsUpdateOpen(isOpen)} />

      {/* 🎬 Modal de Tráiler Oficial de YouTube / Próximamente (Estilo Kai TV) */}
      <TrailerModal
        isOpen={isTrailerOpen}
        title={trailerMovie?.title || ''}
        youtubeKey={trailerMovie?.youtubeKey}
        releaseDateText={trailerMovie?.releaseDateText}
        synopsis={trailerMovie?.synopsis}
        backdropUrl={trailerMovie?.backdropUrl}
        posterUrl={trailerMovie?.posterUrl}
        onClose={() => {
          setIsTrailerOpen(false);
          setTrailerMovie(null);
        }}
      />

      {/* ⭐ Menú Rápido de Favoritos por pulsación de 3 segundos (Enter) */}
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
            if (activeItem && activeItem.id === quickFavItem.id) {
              handlePlayShowcaseItem(activeItem);
            } else {
              setPlayingItem({
                id: quickFavItem.id,
                title: quickFavItem.title,
                subtitle: quickFavItem.title,
                backdropUrl: quickFavItem.backdropUrl || '',
                thumbnailUrl: quickFavItem.posterUrl || '',
                releaseDateText: 'Favorito',
                statusBadge: 'NUEVO',
                genresText: 'Favoritos',
                year: quickFavItem.year || '2026',
                rating: 'TP',
                duration: 'HD',
                synopsis: 'Disfruta de tu contenido favorito.',
                type: quickFavItem.type === 'series' ? 'series' : 'movie',
                streamUrl: quickFavItem.streamUrl,
              });
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
        title={activeItem?.title}
      />
    </main>
  );
}

export default App;
