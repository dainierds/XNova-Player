import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Home, 
  Tv,
  Film,
  Video,
  Heart, 
  Settings, 
  Search, 
  ChevronDown, 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Layers
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useAdminFeaturedStore } from '../../store/useAdminFeaturedStore';
import { QuickFavoriteModal, type QuickFavoriteItem } from '../common/QuickFavoriteModal';
import { HoldProgressIndicator } from '../common/HoldProgressIndicator';
import type { PlaylistAccount } from '../../types';
import { 
  SERIVIA_HERO_MOVIES, 
  SERIVIA_HERO_SERIES, 
  SERIVIA_MOVIES_CATALOG, 
  SERIVIA_GENRES
} from '../../mock/seriviaData';

export type SeriviaFocusZone = 
  | 'sidebar' 
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
  action: 'home' | 'search' | 'live' | 'movies' | 'series' | 'favorites' | 'settings';
}

const SIDEBAR_ITEMS: SidebarItemDef[] = [
  { id: 'home', label: 'Inicio', icon: Home, action: 'home' },
  { id: 'search', label: 'Buscar', icon: Search, action: 'search' },
  { id: 'live', label: 'TV en Vivo', icon: Tv, action: 'live' },
  { id: 'movies', label: 'Películas', icon: Film, action: 'movies' },
  { id: 'series', label: 'Series', icon: Video, action: 'series' },
  { id: 'favorites', label: 'Favoritos', icon: Heart, action: 'favorites' },
  { id: 'settings', label: 'Ajustes', icon: Settings, action: 'settings' },
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
  const { isAdmin } = useAuthStore();
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
  const [focusedHeroBtn, setFocusedHeroBtn] = useState(0); // 0: Play, 1: Favorito, 2: Siguiente carta
  const [focusedGenreIdx, setFocusedGenreIdx] = useState(0);
  const [focusedCatalogIdx, setFocusedCatalogIdx] = useState(0);

  const autoPlayTimerRef = useRef<number | null>(null);
  const genreRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const catalogRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 🌟 Fuente de datos garantizando exactamente 6 elementos en el carrusel superior
  const heroList = useMemo(() => {
    const adminMovies = adminFeaturedItems.filter((i) => i.type === 'movie');
    const adminSeries = adminFeaturedItems.filter((i) => i.type === 'series');

    const pool: any[] = [];

    if (sectionType === 'movies') {
      // 1. Añadir ítems configurados por el Administrador
      if (adminMovies.length > 0) {
        pool.push(...adminMovies.slice(0, 6).map((m) => ({
          id: m.id,
          title: m.title,
          streamUrl: m.streamUrl,
          backdropUrl: m.backdropUrl || m.posterUrl,
          posterUrl: m.posterUrl,
          thumbnailUrl: m.backdropUrl || m.posterUrl,
          year: m.year || '2026',
          rating: m.rating || '8.5',
          ageRating: m.badge,
          badge: m.badge,
          synopsis: m.synopsis,
          genre: m.genresText,
          duration: m.duration || 'Película',
          trailerYoutubeKey: m.trailerYoutubeKey,
        })));
      }

      // 2. Si faltan para llegar a 6, completar con la lista Xtream del usuario
      if (pool.length < 6 && homeFeed?.featuredMovies && homeFeed.featuredMovies.length > 0) {
        for (const item of homeFeed.featuredMovies) {
          if (pool.length >= 6) break;
          if (!pool.some((p) => String(p.id) === String(item.id) || p.title === item.title)) {
            pool.push(item);
          }
        }
      }

      if (pool.length < 6 && homeFeed?.recientes && homeFeed.recientes.length > 0) {
        for (const item of homeFeed.recientes) {
          if (pool.length >= 6) break;
          if (!pool.some((p) => String(p.id) === String(item.id) || p.title === item.title)) {
            pool.push(item);
          }
        }
      }

      // 3. Si aún faltan, completar con las películas destacadas predeterminadas
      if (pool.length < 6) {
        for (const item of SERIVIA_HERO_MOVIES) {
          if (pool.length >= 6) break;
          if (!pool.some((p) => String(p.id) === String(item.id) || p.title === item.title)) {
            pool.push(item);
          }
        }
      }
    } else {
      // Series
      if (adminSeries.length > 0) {
        pool.push(...adminSeries.slice(0, 6).map((s) => ({
          id: s.id,
          title: s.title,
          streamUrl: s.streamUrl,
          backdropUrl: s.backdropUrl || s.posterUrl,
          posterUrl: s.posterUrl,
          thumbnailUrl: s.backdropUrl || s.posterUrl,
          year: s.year || '2026',
          rating: s.rating || '8.5',
          ageRating: s.badge,
          badge: s.badge,
          synopsis: s.synopsis,
          genre: s.genresText,
          duration: s.duration || 'Serie',
          trailerYoutubeKey: s.trailerYoutubeKey,
        })));
      }

      if (pool.length < 6 && homeFeed?.featuredSeries && homeFeed.featuredSeries.length > 0) {
        for (const item of homeFeed.featuredSeries) {
          if (pool.length >= 6) break;
          if (!pool.some((p) => String(p.id) === String(item.id) || p.title === item.title)) {
            pool.push(item);
          }
        }
      }

      if (pool.length < 6) {
        for (const item of SERIVIA_HERO_SERIES) {
          if (pool.length >= 6) break;
          if (!pool.some((p) => String(p.id) === String(item.id) || p.title === item.title)) {
            pool.push(item);
          }
        }
      }
    }

    return pool.slice(0, 6);
  }, [sectionType, homeFeed, adminFeaturedItems]);

  const rawCatalogList = useMemo(() => {
    if (activeNav === 'favorites') {
      if (favorites && favorites.length > 0) {
        return favorites;
      }
      return SERIVIA_MOVIES_CATALOG;
    }

    // 🌟 1. Priorizar títulos seleccionados por el Administrador en la portada
    const adminMatches = adminFeaturedItems
      .filter((i) => (sectionType === 'movies' ? i.type === 'movie' : i.type === 'series'))
      .map((item) => ({
        id: item.id,
        title: item.title,
        posterUrl: item.posterUrl || item.backdropUrl,
        thumbnailUrl: item.posterUrl || item.backdropUrl,
        backdropUrl: item.backdropUrl || item.posterUrl,
        score: item.rating ? item.rating.replace(/[^0-9.]/g, '') || '8.5' : '8.5',
        rating: item.rating || '8.5',
        year: item.year || '2026',
        genre: item.genresText || (sectionType === 'movies' ? 'Película' : 'Serie TV'),
        streamUrl: item.streamUrl,
        type: item.type,
      }));

    if (sectionType === 'movies') {
      const baseMovies =
        homeFeed?.recientes && homeFeed.recientes.length > 0
          ? homeFeed.recientes
          : homeFeed?.featuredMovies && homeFeed.featuredMovies.length > 0
          ? homeFeed.featuredMovies
          : SERIVIA_MOVIES_CATALOG;

      if (adminMatches.length > 0) {
        const remaining = baseMovies.filter(
          (m: any) => !adminMatches.some((a) => a.title.toLowerCase() === (m.title || '').toLowerCase())
        );
        return [...adminMatches, ...remaining];
      }
      return baseMovies;
    } else {
      const baseSeries =
        homeFeed?.featuredSeries && homeFeed.featuredSeries.length > 0
          ? homeFeed.featuredSeries
          : SERIVIA_HERO_SERIES;

      if (adminMatches.length > 0) {
        const remaining = baseSeries.filter(
          (s: any) => !adminMatches.some((a) => a.title.toLowerCase() === (s.title || '').toLowerCase())
        );
        return [...adminMatches, ...remaining];
      }
      return baseSeries;
    }
  }, [sectionType, homeFeed, activeNav, favorites, adminFeaturedItems]);

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
        } else if (focusZone === 'hero') {
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
          } else if (item.action === 'search') {
            onOpenSearch();
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
          }
        }
        return;
      }

      // ─── ZONA 2: HERO CARD (CARTAS SUPERIORES) ───
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
          // Permanecer en la zona hero activa
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

      // ─── ZONA 3: PÍLDORAS DE GÉNEROS / CATEGORÍAS ───
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
        // 🛑 Si la tecla no se presionó en esta pantalla (ej. venía del reproductor), ignorar keyup
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
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white flex select-none font-sans">
      {/* 1. BARRA LATERAL IZQUIERDA COMPLETA (Inicio, Buscar, TV en Vivo, Películas, Series, Favoritos, Ajustes) */}
      <aside className="w-60 md:w-64 h-full bg-[#08080a] border-r border-white/10 flex flex-col justify-between py-7 px-4 md:px-5 z-20 shrink-0">
        <div>
          {/* Menú Principal de Navegación */}
          <nav className="space-y-3 pt-2">
            {SIDEBAR_ITEMS.slice(0, 6).map((item, idx) => {
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
                    } else if (item.action === 'search') {
                      onOpenSearch();
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
                  className={`w-full flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                    isFocused
                      ? 'bg-gradient-to-r from-cyan-500/25 via-cyan-500/15 to-white/5 text-white ring-2 ring-cyan-400 shadow-xl shadow-cyan-500/20 scale-[1.03] font-bold'
                      : isSelected
                      ? 'bg-white/10 text-white shadow-sm border border-white/15 font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isFocused ? 'text-cyan-400' : isSelected ? 'text-white' : 'text-zinc-400'}`} />
                  <span className="tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Menú Inferior: Ajustes */}
        <div className="pt-4 border-t border-white/10">
          {(() => {
            const item = SIDEBAR_ITEMS[6];
            if (!item) return null;
            const Icon = item.icon;
            const isFocused = focusZone === 'sidebar' && focusedSidebarIdx === 6;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setFocusZone('sidebar');
                  setFocusedSidebarIdx(6);
                  onOpenSettings();
                }}
                className={`w-full flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                  isFocused
                    ? 'bg-gradient-to-r from-cyan-500/25 via-cyan-500/15 to-white/5 text-white ring-2 ring-cyan-400 shadow-xl shadow-cyan-500/20 scale-[1.03] font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isFocused ? 'text-cyan-400' : 'text-zinc-400'}`} />
                <span className="tracking-wide">{item.label}</span>
              </button>
            );
          })()}
        </div>
      </aside>

      {/* 2. ÁREA DE CONTENIDO PRINCIPAL (LIMPIO Y ESPACIOSO) */}
      <main className="flex-1 h-full flex flex-col justify-start overflow-hidden px-8 pt-4 pb-4 space-y-4">
        {/* 1. VISTA DE CARRUSEL SUPERIOR CINEMÁTICO COMPACTO (5 TÍTULOS) */}
        <div className="relative w-full h-36 md:h-40 lg:h-44 shrink-0 flex items-center space-x-4">
          {/* Carta 1: Principal Activa (Panorámica con degradado suave) */}
          <div className="relative flex-1 h-full rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl bg-zinc-950 border border-white/15 flex flex-col justify-between p-4 md:p-5 z-10 transition-all duration-500">
            <img
              key={currentHero.backdropUrl || currentHero.thumbnailUrl}
              src={currentHero.backdropUrl || currentHero.thumbnailUrl || ''}
              alt={currentHero.title || 'XNova Premiere'}
              className="absolute inset-0 w-full h-full object-cover object-center animate-fadeIn"
            />
            {/* Gradientes cinematográficos horizontales y verticales */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

            {/* Fila Superior: Badges e Indicadores del Carrusel */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {currentHero.badge && (
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/25 border border-cyan-400 text-[10px] font-black tracking-wider text-cyan-300 uppercase shadow-sm">
                    ⭐ {currentHero.badge}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-bold text-amber-300 flex items-center space-x-1">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span>{currentHero.rating || '8.5'}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold text-zinc-300 border border-white/10">
                  {currentHero.year || '2026'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold text-zinc-300 border border-white/10">
                  {currentHero.duration || (sectionType === 'movies' ? 'Película' : 'Serie')}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold text-zinc-300 border border-white/10">
                  {currentHero.genre || currentHero.genresText || (sectionType === 'movies' ? 'Acción' : 'Drama')}
                </span>
              </div>

              {/* Puntos Indicadores del Carrusel (hasta 6) */}
              <div className="flex items-center space-x-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                {heroList.slice(0, 6).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHeroIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === heroIndex ? 'w-5 bg-cyan-400 shadow-sm shadow-cyan-400' : 'w-1.5 bg-white/30 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Fila Inferior: Título, Sinopsis breve y Botones de Acción */}
            <div className="relative z-10 flex items-end justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-2xl font-black text-white drop-shadow-md truncate">
                  {currentHero.title || 'Estreno XNova'}
                </h2>
                <p className="text-xs text-zinc-300/90 drop-shadow line-clamp-1 mt-0.5 max-w-xl">
                  {currentHero.synopsis || (currentHero.trailerYoutubeKey ? 'Pulsa Reproducir para ver ahora o abrir el tráiler oficial.' : 'Disponible en máxima resolución con audio envolvente.')}
                </p>
              </div>

              {/* Botones de Acción (Play + Favorito) */}
              <div className="flex items-center space-x-2.5 shrink-0">
                {/* 0: Botón Reproducir */}
                <button
                  onClick={handlePlayHero}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 shadow-xl ${
                    focusZone === 'hero' && focusedHeroBtn === 0
                      ? 'bg-cyan-400 text-black scale-108 ring-4 ring-cyan-300 ring-offset-2 ring-offset-black shadow-cyan-400/50'
                      : 'bg-white text-black hover:scale-105'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span className="text-xs font-black">Ver Ahora</span>
                </button>

                {/* 1: Botón Favorito circular */}
                <button
                  onClick={() => setIsFavoriteHero((prev) => !prev)}
                  className={`w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
                    focusZone === 'hero' && focusedHeroBtn === 1
                      ? 'ring-3 ring-cyan-400 scale-110 shadow-lg shadow-cyan-500/30 bg-white/20'
                      : isFavoriteHero
                      ? 'bg-red-600/40 border-red-500 text-red-400'
                      : 'bg-black/50 border-white/20 text-white hover:bg-white/20'
                  }`}
                  title={isFavoriteHero ? 'En Favoritos' : 'Añadir a Favoritos'}
                >
                  <Heart className={`w-4 h-4 ${isFavoriteHero ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Carta 2: Siguiente en el carrusel (Tarjeta de Avance compacta y elegante) */}
          <div
            onClick={handleNextHero}
            className={`relative w-44 md:w-56 h-full rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 shrink-0 border shadow-xl flex flex-col justify-between p-3 ${
              focusZone === 'hero' && focusedHeroBtn === 2
                ? 'opacity-100 ring-3 ring-cyan-400 scale-[1.03] shadow-2xl shadow-cyan-500/40 border-cyan-400'
                : 'opacity-85 hover:opacity-100 border-white/10 hover:scale-[1.02] bg-zinc-900'
            }`}
          >
            <img
              src={nextHero1.backdropUrl || nextHero1.thumbnailUrl || ''}
              alt={nextHero1.title || ''}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30" />

            {/* Cabecera del Preview Siguiente */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                Siguiente
              </span>
              <span className="text-[10px] font-mono font-bold text-zinc-300 bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
                {((heroIndex + 1) % heroList.length) + 1} / {heroList.length}
              </span>
            </div>

            {/* Pie del Preview Siguiente con Título y Flecha */}
            <div className="relative z-10">
              <p className="text-xs font-black text-white truncate drop-shadow">{nextHero1.title}</p>
              <div className="flex items-center space-x-1 text-[10px] text-cyan-300 font-semibold mt-0.5">
                <span>Rotar</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>

        {/* 2. FILA DE SELECTOR PELÍCULAS/SERIES + PÍLDORAS DE GÉNERO */}
        <div className="flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2.5 overflow-x-auto no-scrollbar py-1">
            {/* Selector Películas / Series integrado */}
            <button
              onClick={handleToggleSection}
              className="px-3.5 py-1.5 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30 flex items-center space-x-1.5 transition shrink-0"
              title="Alternar entre Películas y Series"
            >
              <span>{sectionType === 'movies' ? '🎬 Películas' : '📺 Series'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
            </button>
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
                        ? 'bg-zinc-900 text-cyan-300 border border-cyan-500/40 hover:bg-zinc-800'
                        : 'bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-white/10'
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
              className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextHero}
              className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5. FILA INFERIOR DE CARÁTULAS DE PELÍCULAS/SERIES CON PUNTUACIONES */}
        <div className="flex-1 min-h-0 overflow-x-auto no-scrollbar flex items-start space-x-3.5 py-4 px-2">
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
                className={`group flex-shrink-0 cursor-pointer transition-all duration-200 w-28 sm:w-30 md:w-32 ${
                  isFocused
                    ? 'scale-105 z-20'
                    : 'hover:scale-102'
                }`}
              >
                <div 
                  className={`w-full aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border shadow-lg relative mb-2 transition-all ${
                    isFocused
                      ? 'border-cyan-400 ring-4 ring-cyan-400/70 shadow-2xl shadow-cyan-500/40'
                      : 'border-white/10 group-hover:border-white/30'
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
