import { create } from 'zustand';
import { StorageService, type WatchProgressItem } from '../services/storage';

interface ContinueWatchingStoreState {
  items: WatchProgressItem[];
  isLoading: boolean;
  loadItems: () => Promise<void>;
  addItem: (item: WatchProgressItem) => Promise<void>;
  removeItem: (id: string, streamUrl?: string, title?: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useContinueWatchingStore = create<ContinueWatchingStoreState>((set, get) => ({
  items: [],
  isLoading: false,

  loadItems: async () => {
    try {
      set({ isLoading: true });
      const items = await StorageService.getWatchProgress();
      set({ items, isLoading: false });
    } catch (err) {
      console.error('[ContinueWatchingStore] Error loading items:', err);
      set({ isLoading: false });
    }
  },

  addItem: async (item: WatchProgressItem) => {
    try {
      await StorageService.saveWatchProgress(item);
      const current = get().items;
      const filtered = current.filter((p) => String(p.id) !== String(item.id) && p.streamUrl !== item.streamUrl);
      set({ items: [item, ...filtered] });
    } catch (err) {
      console.error('[ContinueWatchingStore] Error adding item:', err);
    }
  },

  removeItem: async (id: string, streamUrl?: string, title?: string) => {
    try {
      await StorageService.removeWatchProgress(id, streamUrl, title);
      const cleanId = String(id).replace(/^(vod_|series_|live_)/, '');
      const cleanTitle = title ? title.toLowerCase().trim() : '';

      const current = get().items;
      const filtered = current.filter((p) => {
        const pId = String(p.id);
        const pCleanId = pId.replace(/^(vod_|series_|live_)/, '');

        const matchId = (pId === id || pCleanId === cleanId || pId === cleanId || pCleanId === id);
        const matchUrl = streamUrl ? (p.streamUrl === streamUrl || p.streamUrl === id) : (p.streamUrl === id);
        const matchTitle = cleanTitle ? (Boolean(p.title) && p.title.toLowerCase().trim() === cleanTitle) : false;

        return !(matchId || matchUrl || matchTitle);
      });
      set({ items: filtered });
    } catch (err) {
      console.error('[ContinueWatchingStore] Error removing item:', err);
    }
  },

  clearAll: async () => {
    try {
      const items = get().items;
      for (const item of items) {
        await StorageService.removeWatchProgress(item.id);
      }
      set({ items: [] });
    } catch (err) {
      console.error('[ContinueWatchingStore] Error clearing items:', err);
    }
  },
}));

export const recordWatchItem = (item: {
  id: string | number;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  streamUrl: string;
  type?: 'movie' | 'series' | 'live';
  currentTime?: number;
  duration?: number;
  year?: string;
  rating?: string;
  genresText?: string;
}) => {
  try {
    const dur = item.duration || 0;
    const cur = item.currentTime || 0;
    const percent = dur > 0 ? Math.min(100, Math.round((cur / dur) * 100)) : undefined;

    useContinueWatchingStore.getState().addItem({
      id: String(item.id),
      title: item.title,
      posterUrl: item.posterUrl || item.backdropUrl || '',
      backdropUrl: item.backdropUrl,
      currentTime: cur,
      duration: dur,
      streamUrl: item.streamUrl,
      type: item.type || 'movie',
      updatedAt: Date.now(),
      progressPercent: percent,
      year: item.year,
      rating: item.rating,
      genresText: item.genresText,
    });
  } catch (e) {
    console.warn('[recordWatchItem] Error:', e);
  }
};
