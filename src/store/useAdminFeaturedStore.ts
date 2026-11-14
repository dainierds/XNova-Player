import { create } from 'zustand';
import { StorageService } from '../services/storage';

export type FeaturedBadge = 'ESTRENO' | 'RECIÉN AÑADIDA' | 'PRÓXIMAMENTE';

export interface AdminFeaturedItem {
  id: string;
  streamId?: string | number;
  title: string;
  type: 'movie' | 'series';
  badge: FeaturedBadge;
  posterUrl: string;
  backdropUrl?: string;
  streamUrl?: string;
  year?: string;
  rating?: string;
  duration?: string;
  genresText?: string;
  synopsis?: string;
  trailerYoutubeKey?: string;
  createdAt: number;
}

interface AdminFeaturedState {
  featuredItems: AdminFeaturedItem[];
  isLoaded: boolean;
  loadFeaturedItems: () => Promise<void>;
  addFeaturedItem: (item: Omit<AdminFeaturedItem, 'createdAt'>) => Promise<boolean>;
  removeFeaturedItem: (id: string) => Promise<void>;
  updateBadge: (id: string, badge: FeaturedBadge) => Promise<void>;
  reorderItems: (items: AdminFeaturedItem[]) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useAdminFeaturedStore = create<AdminFeaturedState>((set, get) => ({
  featuredItems: [],
  isLoaded: false,

  loadFeaturedItems: async () => {
    try {
      const items = await StorageService.getAdminFeaturedItems();
      set({ featuredItems: items || [], isLoaded: true });
    } catch (e) {
      console.error('Error al cargar contenido destacado de admin:', e);
      set({ isLoaded: true });
    }
  },

  addFeaturedItem: async (item) => {
    const { featuredItems } = get();
    const existingIndex = featuredItems.findIndex(
      (f) => f.id === item.id || f.title.toLowerCase().trim() === item.title.toLowerCase().trim()
    );

    let updated: AdminFeaturedItem[];
    if (existingIndex >= 0) {
      updated = [...featuredItems];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...item,
        badge: item.badge,
      };
    } else {
      const newItem: AdminFeaturedItem = {
        ...item,
        createdAt: Date.now(),
      };
      updated = [newItem, ...featuredItems];
    }

    set({ featuredItems: updated });
    await StorageService.saveAdminFeaturedItems(updated);
    return true;
  },

  removeFeaturedItem: async (id) => {
    const { featuredItems } = get();
    const updated = featuredItems.filter((f) => f.id !== id);
    set({ featuredItems: updated });
    await StorageService.saveAdminFeaturedItems(updated);
  },

  updateBadge: async (id, badge) => {
    const { featuredItems } = get();
    const updated = featuredItems.map((f) => (f.id === id ? { ...f, badge } : f));
    set({ featuredItems: updated });
    await StorageService.saveAdminFeaturedItems(updated);
  },

  reorderItems: async (items) => {
    set({ featuredItems: items });
    await StorageService.saveAdminFeaturedItems(items);
  },

  clearAll: async () => {
    set({ featuredItems: [] });
    await StorageService.saveAdminFeaturedItems([]);
  },
}));
