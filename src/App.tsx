import { useState, useEffect } from 'react';
import { useTvStore, type SpatialZone } from './store/useTvStore';
import { usePlaylistStore } from './store/usePlaylistStore';
import { useTvNavigation } from './hooks/useTvNavigation';
import { TopNavBar } from './components/navigation/TopNavBar';
import { HeroShowcase } from './components/home/HeroShowcase';
import { ContentShelf } from './components/home/ContentShelf';
import { SettingsModal } from './components/settings/SettingsModal';
import { VideoPlayer } from './components/player/VideoPlayer';
import { SearchModal } from './components/search/SearchModal';
import { ProfileSelectorModal } from './components/profiles/ProfileSelectorModal';
import { ExitModal } from './components/common/ExitModal';
import { 
  HERO_FEATURED, 
  CONTINUE_WATCHING, 
  TRENDING_MOVIES, 
  LIVE_CHANNELS 
} from './mock/mockData';
import type { ContentItem, NavTabId } from './types';
import { StorageService } from './services/storage';

export function App() {
  const {
    activeTab,
    focusedTab,
    currentZone,
    heroButtonIndex,
    shelfIndices,
    isExitModalOpen,
    setActiveTab,
    setCurrentZone,
    setShelfIndex,
    setIsExitModalOpen,
  } = useTvStore();

  const {
    activePlaylist,
    vodMovies,
    liveStreams,
    loadStoredPlaylists,
  } = usePlaylistStore();

  // Estados de Modales y Reproductor
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<'adult' | 'kids'>('adult');
  const [playingItem, setPlayingItem] = useState<ContentItem | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Inicialización de listas y favoritos
  useEffect(() => {
    loadStoredPlaylists();
    StorageService.getActiveProfile().then((p) => setCurrentProfile(p));
    StorageService.getFavorites().then((favs) => setFavorites(favs));
  }, [loadStoredPlaylists]);

  // Contenido dinámico o de muestra
  const currentHero = HERO_FEATURED;
  const continueItems = CONTINUE_WATCHING;
  
  // Si hay películas sincronizadas de una lista real, usarlas en Estrenos
  const trendingItems: ContentItem[] = vodMovies.length > 0 
    ? vodMovies.map((m) => ({
        id: m.id,
        title: m.title,
        backdropUrl: m.backdropUrl,
        posterUrl: m.posterUrl,
        genres: m.genres,
        synopsis: m.synopsis,
        duration: m.duration,
        year: m.year,
        rating: m.rating,
        score: '8.5',
        badge: 'ESTRENO',
        type: 'movie' as const,
        streamUrl: m.streamUrl,
      }))
    : TRENDING_MOVIES;

  // Canales en vivo
  const liveItems: ContentItem[] = liveStreams.length > 0
    ? liveStreams.slice(0, 10).map((st) => ({
        id: `live_${st.stream_id}`,
        title: st.name,
        backdropUrl: st.stream_icon || 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1920&auto=format&fit=crop',
        posterUrl: st.stream_icon || '',
        genres: ['En Vivo', 'TV'],
        synopsis: 'Emisión televisiva en directo en alta definición.',
        duration: 'EN DIRECTO',
        year: '2026',
        rating: 'TP',
        score: '1080p FHD',
        badge: 'EN VIVO',
        channelNumber: st.stream_id,
        type: 'live' as const,
        streamUrl: activePlaylist?.serverUrl
          ? `${activePlaylist.serverUrl}/live/${activePlaylist.username}/${activePlaylist.password}/${st.stream_id}.m3u8`
          : 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      }))
    : LIVE_CHANNELS;

  const isCurrentHeroFav = favorites.includes(currentHero.id);

  const handleToggleFavorite = async (id: string) => {
    const isNowFav = await StorageService.toggleFavorite(id);
    const updated = await StorageService.getFavorites();
    setFavorites(updated);
    console.log(`Favorito ${isNowFav ? 'agregado' : 'removido'}:`, id);
  };

  const handlePlay = (item: ContentItem) => {
    setPlayingItem(item);
  };

  // Reaccionar a cambios en las pestañas del menú superior
  const handleTabSelect = (tab: NavTabId) => {
    setActiveTab(tab);
    if (tab === 'settings') {
      setIsSettingsOpen(true);
    } else if (tab === 'search') {
      setIsSearchOpen(true);
    }
  };

  // Manejador central de acciones con botón Enter/OK
  const handleEnterAction = (zone: SpatialZone, index: number) => {
    if (zone === 'nav') {
      const tabs: NavTabId[] = ['home', 'movies', 'series', 'live', 'favorites', 'search', 'settings'];
      handleTabSelect(tabs[index]);
    } else if (zone === 'hero_actions') {
      if (index === 0) {
        handlePlay(currentHero);
      } else if (index === 1) {
        handleToggleFavorite(currentHero.id);
      } else if (index === 2) {
        console.log('Detalles de:', currentHero.title);
      }
    } else if (zone === 'shelf_0') {
      handlePlay(continueItems[index]);
    } else if (zone === 'shelf_1') {
      handlePlay(trendingItems[index]);
    } else if (zone === 'shelf_2') {
      handlePlay(liveItems[index]);
    }
  };

  // Conectar navegación espacial D-pad
  useTvNavigation(
    {
      shelf0Count: continueItems.length,
      shelf1Count: trendingItems.length,
      shelf2Count: liveItems.length,
    },
    handleEnterAction,
    () => {
      // Pulsación prolongada (favorito instantáneo)
      if (currentZone === 'hero_actions') {
        handleToggleFavorite(currentHero.id);
      } else if (currentZone === 'shelf_0') {
        handleToggleFavorite(continueItems[shelfIndices.shelf_0]?.id);
      } else if (currentZone === 'shelf_1') {
        handleToggleFavorite(trendingItems[shelfIndices.shelf_1]?.id);
      }
    }
  );

  const isModalActive = isSettingsOpen || isSearchOpen || isProfileOpen || isExitModalOpen || !!playingItem;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#06080D] text-white flex flex-col justify-between select-none">
      {/* 1. BARRA DE NAVEGACIÓN SUPERIOR FLOTANTE (Glassmorphism & Monograma XNova) */}
      <TopNavBar
        activeTab={activeTab}
        focusedTab={focusedTab}
        isNavFocused={currentZone === 'nav' && !isModalActive}
        onSelectTab={handleTabSelect}
        expDate={activePlaylist?.expDate || '29 NOV 2026'}
        profileName={currentProfile === 'adult' ? 'ADULTO' : 'NIÑOS'}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* ÁREA DE CONTENIDO PRINCIPAL: Scrollable para televisores 1080p / 4K */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {/* 2. HERO SHOWCASE: Gran portada cinematográfica con iluminación ambiental */}
        <HeroShowcase
          content={currentHero}
          focusedButtonIndex={heroButtonIndex}
          isHeroActionsFocused={currentZone === 'hero_actions' && !isModalActive}
          isFavorite={isCurrentHeroFav}
          onPlay={() => handlePlay(currentHero)}
          onToggleFavorite={() => handleToggleFavorite(currentHero.id)}
          onOpenDetails={() => console.log('Detalles:', currentHero.title)}
        />

        {/* 3. MULTI-FILAS DE CONTENIDO (Content Shelves) */}
        <div className="space-y-4 -mt-4 relative z-10">
          {/* Fila 1: Continuar Viendo (con barra de progreso) */}
          <ContentShelf
            title="Continuar Viendo"
            items={continueItems}
            selectedIndex={shelfIndices.shelf_0 || 0}
            isShelfFocused={currentZone === 'shelf_0' && !isModalActive}
            onSelectItem={(item, idx) => {
              setShelfIndex('shelf_0', idx);
              setCurrentZone('shelf_0');
              handlePlay(item);
            }}
          />

          {/* Fila 2: Películas de Estreno */}
          <ContentShelf
            title="Películas de Estreno"
            items={trendingItems}
            selectedIndex={shelfIndices.shelf_1 || 0}
            isShelfFocused={currentZone === 'shelf_1' && !isModalActive}
            onSelectItem={(item, idx) => {
              setShelfIndex('shelf_1', idx);
              setCurrentZone('shelf_1');
              handlePlay(item);
            }}
          />

          {/* Fila 3: Canales de TV en Directo (Formato Panorámico 16:9 con indicador EN VIVO) */}
          <ContentShelf
            title="Canales de TV en Directo"
            items={liveItems}
            selectedIndex={shelfIndices.shelf_2 || 0}
            isShelfFocused={currentZone === 'shelf_2' && !isModalActive}
            aspectRatio="landscape"
            onSelectItem={(item, idx) => {
              setShelfIndex('shelf_2', idx);
              setCurrentZone('shelf_2');
              handlePlay(item);
            }}
          />
        </div>
      </div>

      {/* Modal de Ajustes & Gestión de Listas */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setActiveTab('home');
          setCurrentZone('hero_actions');
        }}
      />

      {/* Modal de Búsqueda TV con Teclado en Pantalla */}
      <SearchModal
        isOpen={isSearchOpen}
        movies={trendingItems.map((t) => ({
          id: t.id,
          title: t.title,
          backdropUrl: t.backdropUrl,
          posterUrl: t.posterUrl,
          genres: t.genres,
          synopsis: t.synopsis,
          duration: t.duration,
          year: t.year,
          rating: t.rating,
          streamUrl: t.streamUrl,
        }))}
        channels={liveStreams}
        onClose={() => {
          setIsSearchOpen(false);
          setActiveTab('home');
          setCurrentZone('hero_actions');
        }}
        onSelectMovie={(m) => {
          handlePlay({
            ...m,
            score: '8.0',
            type: 'movie',
          });
        }}
        onSelectChannel={(c) => {
          handlePlay({
            id: `live_${c.stream_id}`,
            title: c.name,
            backdropUrl: c.stream_icon || '',
            posterUrl: c.stream_icon || '',
            genres: ['En Vivo'],
            synopsis: 'Emisión en directo.',
            duration: 'EN DIRECTO',
            year: '2026',
            rating: 'TP',
            score: '1080p FHD',
            type: 'live',
            channelNumber: c.stream_id,
            streamUrl: activePlaylist?.serverUrl
              ? `${activePlaylist.serverUrl}/live/${activePlaylist.username}/${activePlaylist.password}/${c.stream_id}.m3u8`
              : 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          });
        }}
      />

      {/* Modal de Selección de Perfil */}
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
          posterUrl={playingItem.posterUrl}
          contentId={playingItem.id}
          isLive={playingItem.type === 'live'}
          channelNumber={playingItem.channelNumber}
          onClose={() => setPlayingItem(null)}
        />
      )}

      {/* Diálogo de Confirmación de Salida */}
      <ExitModal
        isOpen={isExitModalOpen}
        onCancel={() => setIsExitModalOpen(false)}
        onConfirm={() => {
          setIsExitModalOpen(false);
          if ((window as unknown as { navigator?: { app?: { exitApp?: () => void } } }).navigator?.app?.exitApp) {
            (window as unknown as { navigator: { app: { exitApp: () => void } } }).navigator.app.exitApp();
          } else {
            console.log('Cerrar aplicación XNova Player');
          }
        }}
      />
    </main>
  );
}

export default App;
