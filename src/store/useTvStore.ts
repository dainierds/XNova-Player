import { create } from 'zustand';
import type { NavTabId } from '../types';

export type SpatialZone = 'nav' | 'hero_actions' | 'shelf_0' | 'shelf_1' | 'shelf_2';

interface TvNavigationState {
  activeTab: NavTabId;
  focusedTab: NavTabId;
  currentZone: SpatialZone;
  
  heroButtonIndex: number; // 0: Play, 1: My List, 2: Info
  shelfIndices: Record<string, number>; // index for shelf_0, shelf_1, shelf_2

  isExitModalOpen: boolean;

  // Acciones
  setActiveTab: (tab: NavTabId) => void;
  setFocusedTab: (tab: NavTabId) => void;
  setCurrentZone: (zone: SpatialZone) => void;
  setHeroButtonIndex: (idx: number) => void;
  setShelfIndex: (shelfKey: string, idx: number) => void;
  setIsExitModalOpen: (open: boolean) => void;

  navigateDpad: (
    direction: 'up' | 'down' | 'left' | 'right' | 'enter' | 'back',
    context?: {
      shelf0Count: number;
      shelf1Count: number;
      shelf2Count: number;
      onEnterAction?: (zone: SpatialZone, index: number) => void;
    }
  ) => void;
}

export const BOTTOM_MENU_ITEMS: { id: NavTabId; label: string; icon: string }[] = [
  { id: 'movies', label: 'Películas', icon: 'Film' },
  { id: 'series', label: 'Series', icon: 'Tv' },
  { id: 'live', label: 'Canales TV', icon: 'MonitorPlay' },
  { id: 'radio', label: 'Radio', icon: 'Radio' },
  { id: 'documentaries', label: 'Documentales', icon: 'Clapperboard' },
  { id: 'concerts', label: 'Conciertos', icon: 'Music' },
  { id: 'settings', label: 'Ajustes', icon: 'Sliders' },
  { id: 'exit', label: 'Salir', icon: 'Power' },
];

const TABS_ORDER: NavTabId[] = [
  'home',
  'movies',
  'series',
  'live',
  'favorites',
  'search',
  'settings',
];

export const useTvStore = create<TvNavigationState>((set, get) => ({
  activeTab: 'home',
  focusedTab: 'home',
  currentZone: 'hero_actions',
  heroButtonIndex: 0,
  shelfIndices: { shelf_0: 0, shelf_1: 0, shelf_2: 0 },
  isExitModalOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab, focusedTab: tab }),
  setFocusedTab: (tab) => set({ focusedTab: tab }),
  setCurrentZone: (zone) => set({ currentZone: zone }),
  setHeroButtonIndex: (idx) => set({ heroButtonIndex: idx }),
  setShelfIndex: (shelfKey, idx) =>
    set((state) => ({ shelfIndices: { ...state.shelfIndices, [shelfKey]: idx } })),
  setIsExitModalOpen: (open) => set({ isExitModalOpen: open }),

  navigateDpad: (direction, context) => {
    const {
      currentZone,
      focusedTab,
      heroButtonIndex,
      shelfIndices,
      isExitModalOpen,
    } = get();

    if (isExitModalOpen) {
      if (direction === 'back' || direction === 'enter') {
        set({ isExitModalOpen: false });
      }
      return;
    }

    // Botón Atrás
    if (direction === 'back') {
      if (currentZone === 'nav') {
        set({ isExitModalOpen: true });
      } else {
        set({ currentZone: 'nav' });
      }
      return;
    }

    // Navegación en Zona: Barra Superior (Nav)
    if (currentZone === 'nav') {
      const currentTabIdx = TABS_ORDER.indexOf(focusedTab);

      switch (direction) {
        case 'left':
          if (currentTabIdx > 0) {
            const nextTab = TABS_ORDER[currentTabIdx - 1];
            set({ focusedTab: nextTab, activeTab: nextTab });
          }
          break;
        case 'right':
          if (currentTabIdx < TABS_ORDER.length - 1) {
            const nextTab = TABS_ORDER[currentTabIdx + 1];
            set({ focusedTab: nextTab, activeTab: nextTab });
          }
          break;
        case 'down':
          set({ currentZone: 'hero_actions' });
          break;
        case 'enter':
          if (context?.onEnterAction) {
            context.onEnterAction('nav', currentTabIdx);
          }
          break;
      }
      return;
    }

    // Navegación en Zona: Acciones del Hero
    if (currentZone === 'hero_actions') {
      switch (direction) {
        case 'left':
          if (heroButtonIndex > 0) {
            set({ heroButtonIndex: heroButtonIndex - 1 });
          }
          break;
        case 'right':
          if (heroButtonIndex < 2) {
            set({ heroButtonIndex: heroButtonIndex + 1 });
          }
          break;
        case 'up':
          set({ currentZone: 'nav' });
          break;
        case 'down':
          set({ currentZone: 'shelf_0' });
          break;
        case 'enter':
          if (context?.onEnterAction) {
            context.onEnterAction('hero_actions', heroButtonIndex);
          }
          break;
      }
      return;
    }

    // Navegación en Zona: Shelves (shelf_0, shelf_1, shelf_2)
    const shelfCounts: Record<string, number> = {
      shelf_0: context?.shelf0Count || 3,
      shelf_1: context?.shelf1Count || 5,
      shelf_2: context?.shelf2Count || 4,
    };

    const currentShelfIdx = shelfIndices[currentZone] || 0;
    const maxItems = shelfCounts[currentZone] || 1;

    switch (direction) {
      case 'left':
        if (currentShelfIdx > 0) {
          get().setShelfIndex(currentZone, currentShelfIdx - 1);
        }
        break;
      case 'right':
        if (currentShelfIdx < maxItems - 1) {
          get().setShelfIndex(currentZone, currentShelfIdx + 1);
        }
        break;
      case 'up':
        if (currentZone === 'shelf_0') {
          set({ currentZone: 'hero_actions' });
        } else if (currentZone === 'shelf_1') {
          set({ currentZone: 'shelf_0' });
        } else if (currentZone === 'shelf_2') {
          set({ currentZone: 'shelf_1' });
        }
        break;
      case 'down':
        if (currentZone === 'shelf_0') {
          set({ currentZone: 'shelf_1' });
        } else if (currentZone === 'shelf_1') {
          set({ currentZone: 'shelf_2' });
        }
        break;
      case 'enter':
        if (context?.onEnterAction) {
          context.onEnterAction(currentZone, currentShelfIdx);
        }
        break;
    }
  },
}));
