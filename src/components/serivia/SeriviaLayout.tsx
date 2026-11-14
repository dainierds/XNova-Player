import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Home, 
  Tv,
  Film,
  Video,
  Heart, 
  Settings, 
  Search, 
  SlidersHorizontal, 
  ChevronDown, 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  LogOut,
  Layers
} from 'lucide-react';
import { BRANDING } from '../../config/branding';
import { useAuthStore } from '../../store/useAuthStore';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useAdminFeaturedStore } from '../../store/useAdminFeaturedStore';
import { QuickFavoriteModal, type QuickFavoriteItem } from '../common/QuickFavoriteModal';
import { HoldProgressIndicator } from '../common/HoldProgressIndicator';
import { PLAN_CONFIGS } from '../../types/auth';
import type { PlaylistAccount } from '../../types';
import { 
  SERIVIA_HERO_MOVIES, 
  SERIVIA_HERO_SERIES, 
  SERIVIA_MOVIES_CATALOG, 
  SERIVIA_GENRES
} from '../../mock/seriviaData';

export type SeriviaFocusZone = 
  | 'sidebar' 
  | 'top_bar' 
  | 'hero' 
  | 'genres' 
  | 'catalog';

export interface SeriviaLayoutProps {
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  onOpenExplorer: (type: 'live' | 'movies' | 'series', categoryId?: string) => void;
  onOpenTrailer?: (movie: any) => void;
  onOpenExitModal?: () => void;
  onPlayMedia: (item: { id: string; title: string; streamUrl?: string; posterUrl?: string; isLive?: boolean }) => void;
  activePlaylist?: PlaylistAccount | null;
  homeFeed?: {
    featured: any[];
    featuredMovies: any[];
    featuredSeries: any[];
    recientes: any[];
    tendencias: any[];
    proximamente: any[];
    isLoading: boolean;
  };
  isActive?: boolean;
}

interface SidebarItemDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: 'home' | 'live' | 'movies' | 'series' | 'favorites' | 'settings' | 'logout';
}

const SIDEBAR_ITEMS: SidebarItemDef[] = [
  { id: 'home', label: 'Inicio', icon: Home, action: 'home' },
  { id: 'live', label: 'TV en Vivo', icon: Tv, action: 'live' },
  { id: 'movies', label: 'Películas', icon: Film, action: 'movies' },
  { id: 'series', label: 'Series', icon: Video, action: 'series' },
  { id: 'favorites', label: 'Favoritos', icon: Heart, action: 'favorites' },
  { id: 'settings', label: 'Ajustes', icon: Settings, action: 'settings' },
  { id: 'logout', label: 'Cerrar Sesión', icon: LogOut, action: 'logout' },
];

export const SeriviaLayout: React.FC<SeriviaLayoutProps> = ({
  onOpenSettings,
  onOpenSearch,
  onOpenExplorer,
  onOpenTrailer,
  onOpenExitModal,
  onPlayMedia,
  activePlaylist: _activePlaylist,
  homeFeed,
  isActive = true,
}) => {
  const { currentUser, isAdmin } = useAuthStore();
  const { featuredItems: adminFeaturedItems } = useAdminFeaturedStore();
  const [sectionType, setSectionType] = useState<'movies' | 'series'>('movies');
  const [activeNav, setActiveNav] = useState('home');
  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [isFavoriteHero, setIsFavoriteHero] = useState(false);

  // ⭐ Favoritos sincronizados con IndexedDB
  const { favorites, isFavorite, toggleFavorite } = useFavoritesStore();
  const [quickFavItem, setQuickFavItem] = useState<QuickFavoriteItem | null>(null);
  const [isQuickFavOpen, setIsQuickFavOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const isHoldingOkRef = useRef(false);
  const hasTriggeredLongPressRef = useRef(false);

  // 🎮 Control Remoto D-Pad: Zonas de foco espacial
  const [focusZone, setFocusZone] = useState<SeriviaFocusZone>('sidebar');
  const [focusedSidebarIdx, setFocusedSidebarIdx] = useState(0);
  const [focusedTopIdx, setFocusedTopIdx] = useState(0); // 0: Selector sección, 1: Buscador, 2: Ajustes/Perfil
  const [focusedHeroBtn, setFocusedHeroBtn] = useState(0); // 0: Play, 1: Favorito, 2: Siguiente carta
  const [focusedGenreIdx, setFocusedGenreIdx] = useState(0);
  const [focusedCatalogIdx, setFocusedCatalogIdx] = useState(0);

  const autoPlayTimerRef = useRef<number | null>(null);
  const genreRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const catalogRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 🌟 Fuente de datos real con fallback (priorizando los seleccionados por el Administrador)
  const heroList = useMemo(() => {
    const adminMovies = adminFeaturedItems.filter((i) => i.type === 'movie');
    const adminSeries = adminFeaturedItems.filter((i) => i.type === 'series');

    if (sectionType === 'movies') {
      if (adminMovies.length > 0) {
        return adminMovies.map((m) => ({
          id: m.id,
          title: m.title,
          streamUrl: m.streamUrl,
          backdropUrl: m.backdropUrl || m.posterUrl,
          posterUrl: m.posterUrl,
          year: m.year,
          rating: m.rating,
          ageRating: m.badge,
          synopsis: m.synopsis,
        }));
      }
      if (homeFeed?.featuredMovies && homeFeed.featuredMovies.length > 0) {
        return homeFeed.featuredMovies;
      }
      if (homeFeed?.recientes && homeFeed.recientes.length > 0) {
        return homeFeed.recientes;
      }
      return SERIVIA_HERO_MOVIES;
    } else {
      if (adminSeries.length > 0) {
        return adminSeries.map((s) => ({
          id: s.id,
          title: s.title,
          streamUrl: s.streamUrl,
          backdropUrl: s.backdropUrl || s.posterUrl,
          posterUrl: s.posterUrl,
          year: s.year,
          rating: s.rating,
          ageRating: s.badge,
          synopsis: s.synopsis,
        }));
      }
      if (homeFeed?.featuredSeries && homeFeed.featuredSeries.length > 0) {
        return homeFeed.featuredSeries;
      }
      return SERIVIA_HERO_SERIES;
    }
  }, [sectionType, homeFeed, adminFeaturedItems]);

  const rawCatalogList = useMemo(() => {
    if (activeNav === 'favorites') {
      if (favorites && favorites.length > 0) {
        return favorites;
      }
      return SERIVIA_MOVIES_CATALOG;
    }
    if (sectionType === 'movies') {
      if (homeFeed?.recientes && homeFeed.recientes.length > 0) {
        return homeFeed.recientes;
      }
      if (homeFeed?.featuredMovies && homeFeed.featuredMovies.length > 0) {
        return homeFeed.featuredMovies;
      }
      return SERIVIA_MOVIES_CATALOG;
    } else {
      if (homeFeed?.featuredSeries && homeFeed.featuredSeries.length > 0) {
        return homeFeed.featuredSeries;
      }
      return SERIVIA_HERO_SERIES;
    }
  }, [sectionType, homeFeed, activeNav, favorites]);

  // Lista de géneros disponibles incluyendo botón de acceso al catálogo secundario completo
  const genresList = useMemo(() => {
    const base = ['Todos', ...SERIVIA_GENRES.filter((g) => g !== 'Todos')];
    return base.includes('Ver Catálogo Completo') ? base : [...base, 'Ver Catálogo Completo'];
  }, []);

  // Filtrado de catálogo por género si aplica
  const catalogList = useMemo(() => {
    if (selectedGenre === 'Todos' || selectedGenre === 'Ver Catálogo Completo') {
      return rawCatalogList;
    }
    const filtered = rawCatalogList.filter((item: any) => {
      const g = item.genre || item.genresText || (item.genres ? item.genres.join(' ') : '');
      return g.toLowerCase().includes(selectedGenre.toLowerCase());
    });
    return filtered.length > 0 ? filtered : rawCatalogList;
  }, [rawCatalogList, selectedGenre]);

  const currentHero = heroList[heroIndex] || heroList[0] || {};
  const nextHero1 = heroList[(heroIndex + 1) % heroList.length] || currentHero;
  const nextHero2 = heroList[(heroIndex + 2) % heroList.length] || currentHero;

  // Rotación automática del carrusel superior
  useEffect(() => {
    if (focusZone === 'hero') return; // Pausar rotación si el usuario está interactuando con el Hero

    autoPlayTimerRef.current = window.setTimeout(() => {
      setHeroIndex((prev) => (prev + 1) % heroList.length);
    }, 7000);

    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [heroIndex, heroList.length, focusZone]);

  // Auto-scroll para géneros al navegar con control remoto
  useEffect(() => {
    if (focusZone === 'genres' && genreRefs.current[focusedGenreIdx]) {
      genreRefs.current[focusedGenreIdx]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [focusedGenreIdx, focusZone]);

  // Auto-scroll para catálogo al navegar con control remoto
  useEffect(() => {
    if (focusZone === 'catalog' && catalogRefs.current[focusedCatalogIdx]) {
      catalogRefs.current[focusedCatalogIdx]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [focusedCatalogIdx, focusZone]);

  const handleToggleSection = () => {
    setSectionType((prev) => (prev === 'movies' ? 'series' : 'movies'));
    setHeroIndex(0);
    setFocusedCatalogIdx(0);
  };

  const handleNextHero = () => {
    setHeroIndex((prev) => (prev + 1) % heroList.length);
  };

  const handlePrevHero = () => {
    setHeroIndex((prev) => (prev - 1 + heroList.length) % heroList.length);
  };

  const handlePlayHero = () => {
    if (!currentHero) return;
    onPlayMedia({
      id: currentHero.id,
      title: currentHero.title,
      streamUrl: currentHero.streamUrl,
      posterUrl: currentHero.backdropUrl || currentHero.thumbnailUrl,
      isLive: false,
    });
  };

  const handlePlayCard = (card: any) => {
    if (!card) return;
    onPlayMedia({
      id: card.id,
      title: card.title,
      streamUrl: card.streamUrl,
      posterUrl: card.posterUrl || card.thumbnailUrl || card.backdropUrl,
      isLive: false,
    });
  };

  // 🎮 MOTOR D-PAD PARA CONTROL REMOTO DE ANDROID TV / FIRE TV
  useEffect(() => {
    // Si la app está en modo Administrador, desactivar control por mando (solo cursor de PC)
    if (!isActive || isAdmin) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevenir el scroll por defecto del navegador en la TV
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
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

      // ─── BOTÓN ATRÁS (BACK) ───
      if (isBack) {
        e.preventDefault();
        if (focusZone === 'catalog') {
          setFocusZone('genres');
        } else if (focusZone === 'genres') {
          setFocusZone('hero');
          setFocusedHeroBtn(0);
        } else if (focusZone === 'hero' || focusZone === 'top_bar') {
          setFocusZone('sidebar');
        } else if (focusZone === 'sidebar') {
          if (onOpenExitModal) {
            onOpenExitModal();
          }
        }
        return;
      }

      // ─── ZONA 1: SIDEBAR LATERAL ───
      if (focusZone === 'sidebar') {
        if (e.key === 'ArrowUp') {
          setFocusedSidebarIdx((prev) => Math.max(0, prev - 1));
        } else if (e.key === 'ArrowDown') {
          setFocusedSidebarIdx((prev) => Math.min(SIDEBAR_ITEMS.length - 1, prev + 1));
        } else if (e.key === 'ArrowRight') {
          // Desplazarse a la zona de contenido principal
          setFocusZone('hero');
          setFocusedHeroBtn(0);
        } else if (isOk) {
          const item = SIDEBAR_ITEMS[focusedSidebarIdx];
          if (!item) return;

          if (item.action === 'home') {
            setActiveNav('home');
            setFocusZone('hero');
          } else if (item.action === 'live') {
            onOpenExplorer('live');
          } else if (item.action === 'movies') {
            onOpenExplorer('movies');
          } else if (item.action === 'series') {
            onOpenExplorer('series');
          } else if (item.action === 'favorites') {
            setActiveNav('favorites');
          } else if (item.action === 'settings') {
            onOpenSettings();
          } else if (item.action === 'logout') {
            const { logout } = useAuthStore.getState();
            logout();
          }
        }
        return;
      }

      // ─── ZONA 2: BARRA SUPERIOR (TOP BAR) ───
      if (focusZone === 'top_bar') {
        if (e.key === 'ArrowLeft') {
          if (focusedTopIdx > 0) {
            setFocusedTopIdx((prev) => prev - 1);
          } else {
            setFocusZone('sidebar');
          }
        } else if (e.key === 'ArrowRight') {
          if (focusedTopIdx < 2) {
            setFocusedTopIdx((prev) => prev + 1);
          }
        } else if (e.key === 'ArrowDown') {
          setFocusZone('hero');
          setFocusedHeroBtn(0);
        } else if (isOk) {
          if (focusedTopIdx === 0) {
            handleToggleSection();
          } else if (focusedTopIdx === 1) {
            onOpenSearch();
          } else if (focusedTopIdx === 2) {
            onOpenSettings();
          }
        }
        return;
      }

      // ─── ZONA 3: HERO CARD (CARTAS SUPERIORES) ───
      if (focusZone === 'hero') {
        if (e.key === 'ArrowLeft') {
          if (focusedHeroBtn > 0) {
            setFocusedHeroBtn((prev) => prev - 1);
          } else {
            setFocusZone('sidebar');
          }
        } else if (e.key === 'ArrowRight') {
          if (focusedHeroBtn < 2) {
            setFocusedHeroBtn((prev) => prev + 1);
          }
        } else if (e.key === 'ArrowUp') {
          setFocusZone('top_bar');
          setFocusedTopIdx(0);
        } else if (e.key === 'ArrowDown') {
          setFocusZone('genres');
          setFocusedGenreIdx(0);
        } else if (isOk) {
          if (focusedHeroBtn === 0) {
            handlePlayHero();
          } else if (focusedHeroBtn === 1) {
            if (currentHero.trailerYoutubeKey && onOpenTrailer) {
              onOpenTrailer(currentHero);
            } else {
              setIsFavoriteHero((prev) => !prev);
            }
          } else if (focusedHeroBtn === 2) {
            handleNextHero();
          }
        }
        return;
      }

      // ─── ZONA 4: PÍLDORAS DE GÉNEROS / CATEGORÍAS ───
      if (focusZone === 'genres') {
        if (e.key === 'ArrowLeft') {
          if (focusedGenreIdx > 0) {
            setFocusedGenreIdx((prev) => prev - 1);
          } else {
            setFocusZone('sidebar');
          }
        } else if (e.key === 'ArrowRight') {
          if (focusedGenreIdx < genresList.length - 1) {
            setFocusedGenreIdx((prev) => prev + 1);
          }
        } else if (e.key === 'ArrowUp') {
          setFocusZone('hero');
          setFocusedHeroBtn(0);
        } else if (e.key === 'ArrowDown') {
          setFocusZone('catalog');
          setFocusedCatalogIdx(0);
        } else if (isOk) {
          const selected = genresList[focusedGenreIdx];
          if (selected === 'Ver Catálogo Completo') {
            onOpenExplorer(sectionType);
          } else {
            setSelectedGenre(selected);
          }
        }
        return;
      }

      // ─── ZONA 5: CATÁLOGO DE CARÁTULAS INFERIOR ───
      if (focusZone === 'catalog') {
        if (e.key === 'ArrowLeft') {
          if (focusedCatalogIdx > 0) {
            setFocusedCatalogIdx((prev) => prev - 1);
          } else {
            setFocusZone('sidebar');
          }
        } else if (e.key === 'ArrowRight') {
          if (focusedCatalogIdx < catalogList.length - 1) {
            setFocusedCatalogIdx((prev) => prev + 1);
          }
        } else if (e.key === 'ArrowUp') {
          setFocusZone('genres');
        } else if (isOk) {
          // Iniciar temporizador de 2.5s para Favoritos en el catálogo
          if (!isHoldingOkRef.current) {
            isHoldingOkRef.current = true;
            hasTriggeredLongPressRef.current = false;
            const card = catalogList[focusedCatalogIdx];

            const startTime = Date.now();
            holdIntervalRef.current = window.setInterval(() => {
              const elapsed = Date.now() - startTime;
              setHoldProgress(Math.min(100, Math.round((elapsed / 2500) * 100)));
            }, 50);

            holdTimerRef.current = window.setTimeout(() => {
              hasTriggeredLongPressRef.current = true;
              if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
              setHoldProgress(0);

              if (card) {
                setQuickFavItem({
                  id: card.id,
                  title: card.title,
                  posterUrl: card.posterUrl || card.thumbnailUrl || card.backdropUrl,
                  backdropUrl: card.backdropUrl || card.posterUrl,
                  type: card.type || (sectionType === 'series' ? 'series' : 'movie'),
                  year: card.year,
                  streamUrl: card.streamUrl,
                });
                setIsQuickFavOpen(true);
              }
            }, 2500);
          }
          return;
        }
        return;
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

        if (focusZone === 'catalog') {
          const card = catalogList[focusedCatalogIdx];
          if (card) {
            handlePlayCard(card);
          }
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
    focusedSidebarIdx,
    focusedTopIdx,
    focusedHeroBtn,
    focusedGenreIdx,
    focusedCatalogIdx,
    genresList,
    catalogList,
    currentHero,
    sectionType,
    onOpenExplorer,
    onOpenSearch,
    onOpenSettings,
    onOpenExitModal,
  ]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0A0E1A] text-white flex select-none font-sans">
      {/* 1. BARRA LATERAL IZQUIERDA COMPLETA (Inicio, TV en Vivo, Películas, Series, Favoritos, Ajustes, Cerrar Sesión) */}
      <aside className="w-56 h-full bg-[#0A0E1A] border-r border-white/5 flex flex-col justify-between py-6 px-4 z-20 shrink-0">
        <div>
          {/* Logotipo Oficial XNova Player */}
          <div className="flex items-center px-2 mb-6">
            <img
              src={BRANDING.assets.logo}
              alt={BRANDING.name}
              className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(34,211,238,0.3)]"
            />
          </div>

          {/* Menú Principal de Navegación */}
          <nav className="space-y-1.5">
            {SIDEBAR_ITEMS.slice(0, 5).map((item, idx) => {
              const Icon = item.icon;
              const isSelected = activeNav === item.id;
              const isFocused = focusZone === 'sidebar' && focusedSidebarIdx === idx;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setFocusZone('sidebar');
                    setFocusedSidebarIdx(idx);
                    if (item.action === 'home') {
                      setActiveNav('home');
                    } else if (item.action === 'live') {
                      onOpenExplorer('live');
                    } else if (item.action === 'movies') {
                      onOpenExplorer('movies');
                    } else if (item.action === 'series') {
                      onOpenExplorer('series');
                    } else if (item.action === 'favorites') {
                      setActiveNav('favorites');
                    }
                  }}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isFocused
                      ? 'bg-gradient-to-r from-cyan-500/35 to-blue-600/25 text-white ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/25 scale-[1.04]'
                      : isSelected
                      ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isFocused ? 'text-cyan-400' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Menú Secundario Inferior: Ajustes y Cerrar Sesión */}
        <div className="pt-4 border-t border-white/5 space-y-1.5">
          {SIDEBAR_ITEMS.slice(5).map((item, relIdx) => {
            const idx = relIdx + 5;
            const Icon = item.icon;
            const isFocused = focusZone === 'sidebar' && focusedSidebarIdx === idx;
            const isLogout = item.action === 'logout';

            return (
              <button
                key={item.id}
                onClick={() => {
                  setFocusZone('sidebar');
                  setFocusedSidebarIdx(idx);
                  if (item.action === 'settings') {
                    onOpenSettings();
                  } else if (item.action === 'logout') {
                    const { logout } = useAuthStore.getState();
                    logout();
                  }
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isFocused
                    ? isLogout
                      ? 'bg-rose-500/30 text-rose-200 ring-2 ring-rose-400 shadow-lg shadow-rose-500/30 scale-[1.04]'
                      : 'bg-gradient-to-r from-cyan-500/35 to-blue-600/25 text-white ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/25 scale-[1.04]'
                    : isLogout
                    ? 'text-rose-400 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isFocused ? (isLogout ? 'text-rose-300' : 'text-cyan-400') : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* 2. ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 h-full flex flex-col justify-between overflow-hidden px-8 py-5">
        {/* Cabecera Superior: Selector de Sección + Buscador + Perfil de Usuario */}
        <header className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center space-x-3">
            {/* 0: Selector Películas / Series */}
            <button
              onClick={handleToggleSection}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                focusZone === 'top_bar' && focusedTopIdx === 0
                  ? 'bg-cyan-500 text-black ring-3 ring-cyan-400 shadow-lg shadow-cyan-500/30 scale-105'
                  : 'bg-[#131824] border border-white/10 text-white hover:bg-white/10'
              }`}
            >
              <span>{sectionType === 'movies' ? 'Películas' : 'Series'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* 1: Buscador estilo Pill */}
            <div
              onClick={onOpenSearch}
              className={`w-80 lg:w-96 flex items-center justify-between px-4 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                focusZone === 'top_bar' && focusedTopIdx === 1
                  ? 'bg-[#1a2233] border-2 border-cyan-400 text-white ring-3 ring-cyan-400/40 shadow-lg shadow-cyan-500/20 scale-[1.02]'
                  : 'bg-[#131824] border border-white/10 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Search className={`w-4 h-4 ${focusZone === 'top_bar' && focusedTopIdx === 1 ? 'text-cyan-400' : 'text-zinc-400'}`} />
                <span>Buscar películas, series, shows...</span>
              </div>
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
            </div>
          </div>

          {/* Notificaciones, Puntos del Carrusel y Perfil Usuario */}
          <div className="flex items-center space-x-4">
            {/* Puntos del Carrusel */}
            <div className="flex items-center space-x-1.5 mr-2">
              {heroList.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setHeroIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === heroIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>

            {/* 2: Perfil / Ajustes */}
            <div 
              onClick={onOpenSettings}
              className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
                focusZone === 'top_bar' && focusedTopIdx === 2
                  ? 'bg-[#1a2233] border-2 border-cyan-400 ring-3 ring-cyan-400/40 shadow-lg shadow-cyan-500/20 scale-105'
                  : 'bg-[#131824] border border-white/10 hover:bg-white/10'
              }`}
              title="Ajustes y Perfil de Usuario"
            >
              <div 
                className="w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-black"
                style={{
                  backgroundColor: currentUser ? `${PLAN_CONFIGS[currentUser.plan].color}25` : '#22D3EE25',
                  borderColor: currentUser ? PLAN_CONFIGS[currentUser.plan].color : '#22D3EE',
                  color: currentUser ? PLAN_CONFIGS[currentUser.plan].color : '#22D3EE',
                }}
              >
                {currentUser?.displayName.charAt(0).toUpperCase() || 'XN'}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">
                  {currentUser?.displayName || 'Cliente XNova'}
                </p>
                <p 
                  className="text-[10px] font-bold leading-tight uppercase"
                  style={{ color: currentUser ? PLAN_CONFIGS[currentUser.plan].color : '#F59E0B' }}
                >
                  Plan {currentUser ? PLAN_CONFIGS[currentUser.plan].badge : 'VIP'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </div>
          </div>
        </header>

        {/* 3. VISTA DE CARRUSEL DE CARTAS SUPERIOR */}
        <div className="relative w-full h-[40vh] min-h-[260px] max-h-[350px] flex items-center overflow-visible mb-3">
          {/* Carta 1: Principal Activa */}
          <div className="relative flex-1 h-full rounded-3xl overflow-hidden shadow-2xl bg-zinc-900 border border-white/15 flex flex-col justify-between p-6 z-10 transition-all duration-500">
            <img
              key={currentHero.backdropUrl || currentHero.thumbnailUrl}
              src={currentHero.backdropUrl || currentHero.thumbnailUrl || ''}
              alt={currentHero.title || 'XNova Premiere'}
              className="absolute inset-0 w-full h-full object-cover object-center animate-fadeIn"
            />
            {/* Gradientes cinematográficos */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/30" />

            {/* Fila Superior de Badges */}
            <div className="relative z-10 flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-semibold text-zinc-200 border border-white/10">
                {currentHero.duration || (sectionType === 'movies' ? '2h 10m' : 'Temporada 1')}
              </span>
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-semibold text-zinc-200 border border-white/10">
                {currentHero.genre || currentHero.genresText || (sectionType === 'movies' ? 'Acción' : 'Drama')}
              </span>
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-semibold text-zinc-200 border border-white/10">
                {sectionType === 'movies' ? 'Película' : 'Serie'}
              </span>
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-semibold text-zinc-200 border border-white/10">
                {currentHero.year || '2026'}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 backdrop-blur-md text-xs font-bold text-cyan-300 border border-cyan-500/30">
                {currentHero.ageRating || currentHero.rating || '13+'}
              </span>
            </div>

            {/* Fila Inferior: Título + Botón Play + Tráiler + Corazón */}
            <div className="relative z-10 flex items-end justify-between">
              <div className="flex items-center space-x-4">
                {/* 0: Botón Reproducir */}
                <button
                  onClick={handlePlayHero}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                    focusZone === 'hero' && focusedHeroBtn === 0
                      ? 'bg-cyan-400 text-black scale-120 ring-4 ring-cyan-300 ring-offset-2 ring-offset-black shadow-cyan-400/50'
                      : 'bg-white text-black hover:scale-105'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </button>

                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white drop-shadow-md">
                    {currentHero.title || 'Estreno XNova'}
                  </h2>
                  <p className="text-xs text-zinc-300 drop-shadow">
                    {currentHero.trailerText || (currentHero.trailerYoutubeKey ? 'Ver Tráiler Oficial' : 'Disponible en Máxima Calidad')}
                  </p>
                </div>
              </div>

              {/* 1: Botón Favorito circular */}
              <button
                onClick={() => setIsFavoriteHero((prev) => !prev)}
                className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
                  focusZone === 'hero' && focusedHeroBtn === 1
                    ? 'ring-3 ring-cyan-400 scale-115 shadow-lg shadow-cyan-500/30 bg-white/20'
                    : isFavoriteHero
                    ? 'bg-red-600/40 border-red-500 text-red-400'
                    : 'bg-black/50 border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavoriteHero ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Carta 2: Asomándose a la Derecha (2: Siguiente hero card) */}
          <div
            onClick={handleNextHero}
            className={`relative w-40 lg:w-48 h-[92%] rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 -ml-4 z-5 shadow-xl border shrink-0 ${
              focusZone === 'hero' && focusedHeroBtn === 2
                ? 'opacity-100 ring-3 ring-cyan-400 scale-105 shadow-2xl shadow-cyan-500/40 border-cyan-400'
                : 'opacity-85 hover:opacity-100 border-white/10 hover:scale-102'
            }`}
          >
            <img
              src={nextHero1.backdropUrl || nextHero1.thumbnailUrl || ''}
              alt={nextHero1.title || ''}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex items-end p-3">
              <p className="text-xs font-bold text-white truncate">{nextHero1.title}</p>
            </div>
          </div>

          {/* Carta 3: Asomándose al Fondo */}
          <div
            onClick={() => setHeroIndex((prev) => (prev + 2) % heroList.length)}
            className="relative w-28 lg:w-36 h-[84%] rounded-3xl overflow-hidden cursor-pointer opacity-50 hover:opacity-80 transition-all duration-300 -ml-6 z-0 shadow-lg border border-white/5 shrink-0"
          >
            <img
              src={nextHero2.backdropUrl || nextHero2.thumbnailUrl || ''}
              alt={nextHero2.title || ''}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60" />
          </div>
        </div>

        {/* 4. FILA DE PÍLDORAS DE GÉNERO / CATEGORÍAS */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
            {genresList.map((genre, idx) => {
              const isSelected = selectedGenre === genre;
              const isFocused = focusZone === 'genres' && focusedGenreIdx === idx;
              const isAllCat = genre === 'Ver Catálogo Completo';

              return (
                <button
                  key={genre}
                  ref={(el) => { genreRefs.current[idx] = el; }}
                  onClick={() => {
                    setFocusZone('genres');
                    setFocusedGenreIdx(idx);
                    if (isAllCat) {
                      onOpenExplorer(sectionType);
                    } else {
                      setSelectedGenre(genre);
                    }
                  }}
                  className={`
                    px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center space-x-1.5
                    ${
                      isFocused
                        ? 'bg-cyan-500 text-black ring-3 ring-cyan-400 shadow-lg shadow-cyan-500/30 scale-110 font-black'
                        : isSelected
                        ? 'bg-white text-black shadow-md scale-105'
                        : isAllCat
                        ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-900/60'
                        : 'bg-[#131824] text-zinc-400 hover:text-white border border-white/5'
                    }
                  `}
                >
                  {isAllCat && <Layers className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{genre}</span>
                </button>
              );
            })}
          </div>

          {/* Flechas de navegación para categorías */}
          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={handlePrevHero}
              className="w-7 h-7 rounded-lg bg-[#131824] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextHero}
              className="w-7 h-7 rounded-lg bg-[#131824] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5. FILA INFERIOR DE CARÁTULAS DE PELÍCULAS/SERIES CON PUNTUACIONES */}
        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center space-x-4 py-1">
          {catalogList.map((card: any, idx: number) => {
            const isFocused = focusZone === 'catalog' && focusedCatalogIdx === idx;
            const poster = card.posterUrl || card.thumbnailUrl || card.backdropUrl;
            const score = card.score || card.rating || '8.2';
            const year = card.year || '2026';

            return (
              <div
                key={card.id || idx}
                ref={(el) => { catalogRefs.current[idx] = el; }}
                onClick={() => {
                  setFocusZone('catalog');
                  setFocusedCatalogIdx(idx);
                  handlePlayCard(card);
                }}
                className={`group flex-shrink-0 cursor-pointer transition-all duration-200 w-36 md:w-44 ${
                  isFocused
                    ? 'scale-108 z-20'
                    : 'hover:scale-102'
                }`}
              >
                <div 
                  className={`w-full aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border shadow-lg relative mb-2 transition-all ${
                    isFocused
                      ? 'border-cyan-400 ring-3 ring-cyan-400/60 shadow-2xl shadow-cyan-500/30'
                      : 'border-white/10'
                  }`}
                >
                  <img
                    src={poster}
                    alt={card.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className={`absolute inset-0 bg-black/30 transition flex items-center justify-center ${
                    isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <div className="w-10 h-10 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                    </div>
                  </div>
                </div>

                <h3 className={`text-xs font-bold truncate leading-snug ${
                  isFocused ? 'text-cyan-300' : 'text-white'
                }`}>
                  {card.title}
                </h3>
                <div className="flex items-center space-x-1.5 text-[11px] text-zinc-400 font-medium mt-0.5">
                  <span>{year}</span>
                  <span>•</span>
                  <span className="flex items-center text-amber-400 font-bold">
                    <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                    {score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ⭐ Menú Rápido de Favoritos por pulsación de 3 segundos */}
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
            handlePlayCard(quickFavItem);
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
        title={catalogList[focusedCatalogIdx]?.title}
      />
    </div>
  );
};
