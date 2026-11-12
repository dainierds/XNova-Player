import { create } from 'zustand';
import type { MenuSection } from '../types';

export type FocusZone = 'carousel' | 'bottom_nav';

interface TvState {
  currentSection: MenuSection;
  focusZone: FocusZone;
  carouselIndex: number;
  bottomNavIndex: number;
  totalMovies: number;
  isExitModalOpen: boolean;
  
  // Acciones
  setFocusZone: (zone: FocusZone) => void;
  setCarouselIndex: (index: number) => void;
  setBottomNavIndex: (index: number) => void;
  setCurrentSection: (section: MenuSection) => void;
  setTotalMovies: (total: number) => void;
  setIsExitModalOpen: (open: boolean) => void;
  navigateDpad: (direction: 'up' | 'down' | 'left' | 'right' | 'enter' | 'back') => void;
}

export const BOTTOM_MENU_ITEMS: { id: MenuSection; label: string; icon: string }[] = [
  { id: 'movies', label: 'Películas', icon: 'Film' },
  { id: 'series', label: 'Series', icon: 'Tv' },
  { id: 'live', label: 'Canales TV', icon: 'MonitorPlay' },
  { id: 'radio', label: 'Radio', icon: 'Radio' },
  { id: 'documentaries', label: 'Documentales', icon: 'Clapperboard' },
  { id: 'concerts', label: 'Conciertos', icon: 'Music' },
  { id: 'settings', label: 'Ajustes', icon: 'Sliders' },
  { id: 'exit', label: 'Salir', icon: 'Power' },
];

export const useTvStore = create<TvState>((set, get) => ({
  currentSection: 'movies',
  focusZone: 'carousel',
  carouselIndex: 0,
  bottomNavIndex: 0,
  totalMovies: 6,
  isExitModalOpen: false,

  setFocusZone: (zone) => set({ focusZone: zone }),
  setCarouselIndex: (index) => set({ carouselIndex: index }),
  setBottomNavIndex: (index) => set({ bottomNavIndex: index }),
  setCurrentSection: (section) => set({ currentSection: section }),
  setTotalMovies: (total) => set({ totalMovies: total }),
  setIsExitModalOpen: (open) => set({ isExitModalOpen: open }),

  navigateDpad: (direction) => {
    const { focusZone, carouselIndex, bottomNavIndex, totalMovies, isExitModalOpen } = get();

    // Si el diálogo de salida está abierto, manejar respuesta
    if (isExitModalOpen) {
      if (direction === 'back' || direction === 'enter') {
        set({ isExitModalOpen: false });
      }
      return;
    }

    if (direction === 'back') {
      if (focusZone === 'carousel') {
        // En la pantalla principal, atrás pide confirmación de salida
        set({ isExitModalOpen: true });
      } else {
        // Volver al carrusel superior
        set({ focusZone: 'carousel' });
      }
      return;
    }

    if (focusZone === 'carousel') {
      switch (direction) {
        case 'left':
          if (carouselIndex > 0) {
            set({ carouselIndex: carouselIndex - 1 });
          }
          break;
        case 'right':
          if (carouselIndex < totalMovies - 1) {
            set({ carouselIndex: carouselIndex + 1 });
          }
          break;
        case 'down':
          // Cambiar a la barra de menú inferior
          set({ focusZone: 'bottom_nav' });
          break;
        case 'up':
          // Límite superior alcanzado
          break;
        case 'enter':
          // Acción al seleccionar película (ej. abrir reproductor)
          console.log('Película seleccionada:', carouselIndex);
          break;
      }
    } else if (focusZone === 'bottom_nav') {
      switch (direction) {
        case 'left':
          if (bottomNavIndex > 0) {
            set({ bottomNavIndex: bottomNavIndex - 1 });
          }
          break;
        case 'right':
          if (bottomNavIndex < BOTTOM_MENU_ITEMS.length - 1) {
            set({ bottomNavIndex: bottomNavIndex + 1 });
          }
          break;
        case 'up':
          // Subir al carrusel de películas
          set({ focusZone: 'carousel' });
          break;
        case 'down':
          // Límite inferior alcanzado
          break;
        case 'enter':
          const selectedItem = BOTTOM_MENU_ITEMS[bottomNavIndex];
          if (selectedItem.id === 'exit') {
            set({ isExitModalOpen: true });
          } else {
            set({ currentSection: selectedItem.id });
          }
          break;
      }
    }
  },
}));
