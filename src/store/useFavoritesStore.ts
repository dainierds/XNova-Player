import { create } from 'zustand';
import { StorageService, type SavedFavoriteItem } from '../services/storage';

interface FavoritesStoreState {
  favorites: SavedFavoriteItem[];
  favoriteIds: Set<string>;
  isLoading: boolean;
  loadFavorites: () => Promise<void>;
  toggleFavorite: (item: {
    id: string;
    title: string;
    type?: 'movie' | 'series' | 'live';
    posterUrl?: string;
    backdropUrl?: string;
    streamUrl?: string;
    year?: string;
    rating?: string;
    genresText?: string;
  }) => Promise<boolean>;
  isFavorite: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStoreState>((set, get) => ({
  favorites: [],
  favoriteIds: new Set<string>(),
  isLoading: false,

  loadFavorites: async () => {
    try {
      set({ isLoading: true });
      const items = await StorageService.getFavoriteItems();
      const ids = new Set(items.map((i) => i.id));
      set({ favorites: items, favoriteIds: ids, isLoading: false });
    } catch (err) {
      console.error('[FavoritesStore] Error loading favorites:', err);
      set({ isLoading: false });
    }
  },

  toggleFavorite: async (item) => {
    try {
      const added = await StorageService.toggleFavoriteItem({
        id: item.id,
        title: item.title,
        type: item.type || 'movie',
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        streamUrl: item.streamUrl,
        year: item.year,
        rating: item.rating,
        genresText: item.genresText,
      });

      const current = get().favorites;
      let nextFavorites: SavedFavoriteItem[];
      if (added) {
        const newItem: SavedFavoriteItem = {
          id: item.id,
          title: item.title,
          type: item.type || 'movie',
          posterUrl: item.posterUrl,
          backdropUrl: item.backdropUrl,
          streamUrl: item.streamUrl,
          year: item.year,
          rating: item.rating,
          genresText: item.genresText,
          addedAt: Date.now(),
        };
        nextFavorites = [newItem, ...current.filter((i) => i.id !== item.id)];
      } else {
        nextFavorites = current.filter((i) => i.id !== item.id);
      }

      set({
        favorites: nextFavorites,
        favoriteIds: new Set(nextFavorites.map((i) => i.id)),
      });

      return added;
    } catch (err) {
      console.error('[FavoritesStore] Error toggling favorite:', err);
      return false;
    }
  },

  isFavorite: (id: string) => {
    return get().favoriteIds.has(id);
  },
}));
