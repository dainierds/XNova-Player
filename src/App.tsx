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

type FocusSection = 'sidebar' | 'hero_buttons' | 'thumbnails';

export function App() {
  const { currentUser, isAuthenticated, initializeAuth, login } = useAuthStore();
  const { 
    activePlaylist, 
    liveStreams, 
    loadStoredPlaylists, 
    loadUserPlaylists 
  } = usePlaylistStore();

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
  const [focusedZone, setFocusedZone] = useState<FocusSection>('thumbnails');
  const [heroBtnIndex, setHeroBtnIndex] = useState(0); // 0: Watch now, 1: Trailer
  
  // Catálogo activo según pestaña (Películas o Series)
  // Prioridad: feed real de Xtream → vodMovies del store → datos de demostración
  const currentCatalog: ShowcaseItem[] = (activeTab === 'series') 
    ? SHOWCASE_SERIES 
    : homeFeed.featured.length > 0
      // ✅ Películas REALES de la lista Xtream con tags automáticos
      ? homeFeed.featured.map((m) => ({
          id: m.id,
          title: m.title.toUpperCase(),
          subtitle: `${m.title} (${m.year})`,
          backdropUrl: m.backdropUrl,
          thumbnailUrl: m.posterUrl,
          releaseDateText: tagToReleaseDateText(m.tag),
          statusBadge: m.tag as 'ESTRENO' | 'PRÓXIMAMENTE' | 'NUEVO' | 'TENDENCIA',
          genresText: m.genres.join(', '),
          year: m.year,
          rating: m.rating,
          duration: m.duration,
          synopsis: m.synopsis,
          type: 'movie' as const,
          streamUrl: m.streamUrl,
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

  // Temporizador de rotación automática estilo carrusel (6 segundos)
  const autoPlayTimerRef = useRef<number | null>(null);
  const isUserInteractingRef = useRef(false);

  useEffect(() => {
    initializeAuth();
    loadStoredPlaylists();
    StorageService.getActiveProfile().then((p) => setCurrentProfile(p));
    StorageService.getActiveTheme().then((t) => setActiveTheme(t));
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

  // Rotación automática del carrusel cuando no hay interacción activa
  useEffect(() => {
    if (isSplashVisible || isSettingsOpen || isSearchOpen || playingItem) return;

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
  }, [currentCatalog.length, isSplashVisible, isSettingsOpen, isSearchOpen, playingItem]);

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
    }
  };

  // Motor de navegación D-pad para este concepto de interfaz
  useEffect(() => {
    if (isSplashVisible || !isAuthenticated || isSettingsOpen || isSearchOpen || isProfileOpen || isExitModalOpen || isExplorerOpen || isUpdateOpen || playingItem) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      isUserInteractingRef.current = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
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
            if (heroBtnIndex < 1) {
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
              setPlayingItem(activeItem);
            } else {
              console.log('Ver trailer de:', activeItem.title);
            }
          } else if (focusedZone === 'thumbnails') {
            setPlayingItem(activeItem);
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
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
  ]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0A0E1A] text-white flex select-none font-sans">
      {/* 1. Splash Screen oficial con animación */}
      {isSplashVisible && (
        <SplashScreen onFinish={() => setIsSplashVisible(false)} />
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
            onPlayMedia={(media) => {
              if (media.streamUrl && playWithNativePlayer({
                streamUrl: media.streamUrl,
                title: media.title,
                posterUrl: media.posterUrl,
              })) {
                return;
              }
              setPlayingItem({
                id: media.id,
                title: media.title,
                subtitle: media.title,
                backdropUrl: media.posterUrl || '',
                thumbnailUrl: media.posterUrl || '',
                releaseDateText: 'En reproducción',
                statusBadge: 'ESTRENO',
                genresText: 'Streaming',
                year: '2025',
                rating: '13+',
                duration: 'HD',
                synopsis: 'Disfruta de tu contenido.',
                type: 'movie',
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
                onSelectThumbnail={(idx) => {
                  setCarouselIndex(idx);
                  setFocusedZone('thumbnails');
                }}
                onPlay={() => {
                  if (activeItem.streamUrl && playWithNativePlayer({
                    streamUrl: activeItem.streamUrl,
                    title: activeItem.title,
                    posterUrl: activeItem.backdropUrl,
                  })) {
                    return;
                  }
                  setPlayingItem(activeItem);
                }}
                onOpenTrailer={() => console.log('Abrir trailer de:', activeItem.title)}
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
        onClose={() => {
          setIsSettingsOpen(false);
          setActiveTab('movies');
          setFocusedZone('thumbnails');
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
          setFocusedZone('thumbnails');
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
            // Al salir del reproductor, cerrar video y regresar inmediatamente
            // a la misma sección y carpeta donde estaba el usuario
            setPlayingItem(null);
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
      {isExplorerOpen && activePlaylist && (
        <div className={playingItem ? 'hidden' : 'block'}>
          <FullCatalogExplorer
            playlist={activePlaylist}
            initialType={explorerType}
            isActive={!playingItem}
            onClose={() => {
              setIsExplorerOpen(false);
              setActiveTab('movies');
              setFocusedZone('thumbnails');
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
    </main>
  );
}

export default App;
