import { create } from 'zustand';
import { StorageService } from '../services/storage';
import { CloudService } from '../services/cloudService';

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
      // 1. Cargar instantáneamente de almacenamiento local (0ms)
      const localItems = await StorageService.getAdminFeaturedItems();
      if (localItems && localItems.length > 0) {
        set({ featuredItems: localItems, isLoaded: true });
      }

      // 2. Sincronizar en tiempo real con la nube (Vercel Serverless / Redis)
      // Permite que lo configurado en la PC aparezca de inmediato en cualquier TV
      try {
        const cloudRes = await CloudService.getFeaturedItems();
        if (cloudRes.success && Array.isArray(cloudRes.items) && cloudRes.items.length > 0) {
          set({ featuredItems: cloudRes.items, isLoaded: true });
          await StorageService.saveAdminFeaturedItems(cloudRes.items);
        } else if (localItems && localItems.length > 0) {
          // Si la nube estaba vacía pero la PC tenía ítems guardados, subirlos a la nube
          CloudService.saveFeaturedItems(localItems).catch(() => {});
        } else {
          set({ isLoaded: true });
        }
      } catch (cloudErr) {
        console.warn('Error sincronizando portada con la nube:', cloudErr);
        set({ isLoaded: true });
      }
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
    CloudService.saveFeaturedItems(updated).catch(() => {});
    return true;
  },

  removeFeaturedItem: async (id) => {
    const { featuredItems } = get();
    const updated = featuredItems.filter((f) => f.id !== id);
    set({ featuredItems: updated });
    await StorageService.saveAdminFeaturedItems(updated);
    CloudService.saveFeaturedItems(updated).catch(() => {});
  },

  updateBadge: async (id, badge) => {
    const { featuredItems } = get();
    const updated = featuredItems.map((f) => (f.id === id ? { ...f, badge } : f));
    set({ featuredItems: updated });
    await StorageService.saveAdminFeaturedItems(updated);
    CloudService.saveFeaturedItems(updated).catch(() => {});
  },

  reorderItems: async (items) => {
    set({ featuredItems: items });
    await StorageService.saveAdminFeaturedItems(items);
    CloudService.saveFeaturedItems(items).catch(() => {});
  },

  clearAll: async () => {
    set({ featuredItems: [] });
    await StorageService.saveAdminFeaturedItems([]);
    CloudService.saveFeaturedItems([]).catch(() => {});
  },
}));
