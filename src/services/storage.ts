import { get, set, del } from 'idb-keyval';
import type { PlaylistAccount } from '../types';

const KEYS = {
  PLAYLISTS: 'xnova_playlists',
  ACTIVE_PLAYLIST_ID: 'xnova_active_playlist_id',
  CACHE_PREFIX: 'xnova_cache_',
  FAVORITES: 'xnova_favorites',
  WATCH_PROGRESS: 'xnova_watch_progress',
  PARENTAL_PIN: 'xnova_parental_pin',
  ACTIVE_PROFILE: 'xnova_active_profile',
};

export interface WatchProgressItem {
  id: string;
  title: string;
  posterUrl: string;
  currentTime: number;
  duration: number;
  streamUrl: string;
  type: 'movie' | 'series';
  updatedAt: number;
}

export const StorageService = {
  // --- Listas de reproducción ---
  async getPlaylists(): Promise<PlaylistAccount[]> {
    const list = await get<PlaylistAccount[]>(KEYS.PLAYLISTS);
    return list || [];
  },

  async savePlaylists(playlists: PlaylistAccount[]): Promise<void> {
    await set(KEYS.PLAYLISTS, playlists);
  },

  async getActivePlaylistId(): Promise<string | null> {
    const id = await get<string>(KEYS.ACTIVE_PLAYLIST_ID);
    return id || null;
  },

  async setActivePlaylistId(id: string): Promise<void> {
    await set(KEYS.ACTIVE_PLAYLIST_ID, id);
  },

  // --- Cache del Catálogo ---
  async saveCatalogCache(playlistId: string, data: unknown): Promise<void> {
    await set(`${KEYS.CACHE_PREFIX}${playlistId}`, {
      data,
      timestamp: Date.now(),
    });
  },

  async getCatalogCache<T>(playlistId: string): Promise<T | null> {
    const cached = await get<{ data: T; timestamp: number }>(`${KEYS.CACHE_PREFIX}${playlistId}`);
    return cached ? cached.data : null;
  },

  async clearCatalogCache(playlistId: string): Promise<void> {
    await del(`${KEYS.CACHE_PREFIX}${playlistId}`);
  },

  // --- Continuar Viendo / Progreso ---
  async getWatchProgress(): Promise<WatchProgressItem[]> {
    const progress = await get<WatchProgressItem[]>(KEYS.WATCH_PROGRESS);
    return progress || [];
  },

  async saveWatchProgress(item: WatchProgressItem): Promise<void> {
    const list = await this.getWatchProgress();
    const filtered = list.filter((p) => p.id !== item.id);
    filtered.unshift(item); // Al inicio los más recientes
    await set(KEYS.WATCH_PROGRESS, filtered.slice(0, 30)); // Guardar hasta 30
  },

  // --- Favoritos ---
  async getFavorites(): Promise<string[]> {
    const favs = await get<string[]>(KEYS.FAVORITES);
    return favs || [];
  },

  async toggleFavorite(id: string): Promise<boolean> {
    const favs = await this.getFavorites();
    const exists = favs.includes(id);
    const updated = exists ? favs.filter((f) => f !== id) : [...favs, id];
    await set(KEYS.FAVORITES, updated);
    return !exists;
  },

  // --- Perfil y Control Parental ---
  async getParentalPin(): Promise<string> {
    const pin = await get<string>(KEYS.PARENTAL_PIN);
    return pin || '0000';
  },

  async setParentalPin(pin: string): Promise<void> {
    await set(KEYS.PARENTAL_PIN, pin);
  },

  async getActiveProfile(): Promise<'adult' | 'kids'> {
    const profile = await get<'adult' | 'kids'>(KEYS.ACTIVE_PROFILE);
    return profile || 'adult';
  },

  async setActiveProfile(profile: 'adult' | 'kids'): Promise<void> {
    await set(KEYS.ACTIVE_PROFILE, profile);
  },
};
