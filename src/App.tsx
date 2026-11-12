import { useState, useEffect } from 'react';
import { useTvStore } from './store/useTvStore';
import { usePlaylistStore } from './store/usePlaylistStore';
import { useTvNavigation } from './hooks/useTvNavigation';
import { HeaderBar } from './components/home/HeaderBar';
import { HeroBackdrop } from './components/home/HeroBackdrop';
import { InfoPanel } from './components/home/InfoPanel';
import { PosterCarousel } from './components/home/PosterCarousel';
import { BottomNavbar } from './components/home/BottomNavbar';
import { ExitModal } from './components/common/ExitModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { VideoPlayer } from './components/player/VideoPlayer';
import { SearchModal } from './components/search/SearchModal';
import { ProfileSelectorModal } from './components/profiles/ProfileSelectorModal';
import { CategoryExplorer } from './components/home/CategoryExplorer';
import type { MovieItem } from './types';
import { StorageService } from './services/storage';

export function App() {
  const {
    currentSection,
    focusZone,
    carouselIndex,
    bottomNavIndex,
    isExitModalOpen,
    setCarouselIndex,
    setBottomNavIndex,
    setFocusZone,
    setCurrentSection,
    setIsExitModalOpen,
  } = useTvStore();

  const {
    activePlaylist,
    vodMovies,
    vodCategories,
    liveStreams,
    loadStoredPlaylists,
  } = usePlaylistStore();

  // Estados de Modales y Reproductor
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<'adult' | 'kids'>('adult');
  
  // Estado del Reproductor de Video
  const [playingItem, setPlayingItem] = useState<MovieItem | null>(null);

  // Inicializar listas almacenadas y perfil
  useEffect(() => {
    loadStoredPlaylists();
    StorageService.getActiveProfile().then((p) => setCurrentProfile(p));
  }, [loadStoredPlaylists]);

  const movies = vodMovies.length > 0 ? vodMovies : [];
  const currentMovie = movies[carouselIndex] || movies[0] || {
    id: 'empty',
    title: 'XNova Player',
    backdropUrl: '',
    posterUrl: '',
    genres: ['IPTV'],
    synopsis: 'Configura una lista en Ajustes para cargar tu contenido.',
    duration: '--',
    year: '2026',
    rating: 'PG',
  };

  // Manejador de teclado D-pad general
  useTvNavigation(() => {
    if (currentMovie && currentMovie.id !== 'empty') {
      StorageService.toggleFavorite(currentMovie.id).then((isFav) => {
        console.log(`Favorito ${isFav ? 'añadido' : 'eliminado'}:`, currentMovie.title);
      });
    }
  });

  // Reaccionar a la selección de opciones del menú inferior
  useEffect(() => {
    if (currentSection === 'settings') {
      setIsSettingsOpen(true);
    }
  }, [currentSection]);

  const handleOpenPlayer = (movie: MovieItem) => {
    setPlayingItem(movie);
  };

  const isModalActive = isSettingsOpen || isSearchOpen || isProfileOpen || isExitModalOpen || !!playingItem;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#080A0E] text-white flex flex-col justify-between font-sans select-none">
      {/* 1. HERO BANNER: Imagen panorámica con gradientes oscuros */}
      <HeroBackdrop
        backdropUrl={currentMovie.backdropUrl}
        title={currentMovie.title}
      />

      {/* Barra superior: Logo, Fecha de Vencimiento de Suscripción, Reloj y Perfil */}
      <div className="relative z-20">
        <HeaderBar
          expDate={activePlaylist?.expDate || '29 NOVIEMBRE 2026'}
          profileName={currentProfile === 'adult' ? 'ADULTO' : 'NIÑOS'}
        />

        {/* Botones de acceso rápido en cabecera */}
        <div className="absolute top-8 right-56 z-30 flex items-center space-x-3 pointer-events-auto">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="px-3.5 py-1.5 rounded-full bg-zinc-800/80 hover:bg-cyan-600 border border-zinc-700 text-xs font-bold text-zinc-200 transition"
          >
            🔍 Buscar
          </button>
          <button
            onClick={() => setIsProfileOpen(true)}
            className="text-xs text-zinc-400 hover:text-white"
          >
            Cambiar Perfil
          </button>
        </div>
      </div>

      {/* 2 & 3. Zona Central: Panel de Información (Izquierda) + Carrusel de Pósters (Derecha) */}
      <div className="relative z-10 flex-1 flex items-end px-14 pb-2 pt-28">
        <div className="w-full flex items-end justify-between gap-8">
          <InfoPanel movie={currentMovie} />

          <PosterCarousel
            movies={movies}
            selectedIndex={carouselIndex}
            isFocused={focusZone === 'carousel' && !isModalActive}
            onSelectMovie={(idx) => {
              setCarouselIndex(idx);
              setFocusZone('carousel');
              handleOpenPlayer(movies[idx]);
            }}
          />
        </div>
      </div>

      {/* 4. BARRA DE MENÚ INFERIOR (Películas, Series, TV, Radio, Documentales, Conciertos, Ajustes, Salir) */}
      <BottomNavbar
        currentSection={currentSection}
        focusedIndex={bottomNavIndex}
        isFocused={focusZone === 'bottom_nav' && !isModalActive}
        onSelect={(idx) => {
          setBottomNavIndex(idx);
          setFocusZone('bottom_nav');
        }}
      />

      {/* 5. Subpantalla de Explorador de Categorías para Series, TV, Documentales, etc. */}
      {currentSection !== 'movies' && currentSection !== 'settings' && currentSection !== 'exit' && (
        <CategoryExplorer
          section={currentSection}
          categories={vodCategories}
          items={movies}
          onBack={() => setCurrentSection('movies')}
          onSelectItem={(item) => handleOpenPlayer(item)}
        />
      )}

      {/* Modal de Ajustes & Gestión de Listas */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setCurrentSection('movies');
        }}
      />

      {/* Modal de Búsqueda TV con Teclado en Pantalla */}
      <SearchModal
        isOpen={isSearchOpen}
        movies={movies}
        channels={liveStreams}
        onClose={() => setIsSearchOpen(false)}
        onSelectMovie={(m) => handleOpenPlayer(m)}
        onSelectChannel={(c) => {
          handleOpenPlayer({
            id: `ch_${c.stream_id}`,
            title: c.name,
            backdropUrl: c.stream_icon || '',
            posterUrl: c.stream_icon || '',
            genres: ['En Vivo'],
            synopsis: 'Transmisión de TV en directo.',
            duration: 'DIRECTO',
            year: '2026',
            rating: 'TV',
            streamUrl: activePlaylist?.serverUrl
              ? `${activePlaylist.serverUrl}/live/${activePlaylist.username}/${activePlaylist.password}/${c.stream_id}.m3u8`
              : '',
          });
        }}
      />

      {/* Modal de Selección de Perfil y Control Parental */}
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
            'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' // Stream HLS de prueba de alta calidad
          }
          title={playingItem.title}
          posterUrl={playingItem.posterUrl}
          contentId={playingItem.id}
          isLive={playingItem.duration === 'DIRECTO'}
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
            console.log('Saliendo de la aplicación');
          }
        }}
      />
    </main>
  );
}

export default App;
