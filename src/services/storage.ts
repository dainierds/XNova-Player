import { get, set, del } from 'idb-keyval';
import type { PlaylistAccount } from '../types';
import type { UserAccount } from '../types/auth';

const KEYS = {
  PLAYLISTS: 'xnova_playlists',
  ACTIVE_PLAYLIST_ID: 'xnova_active_playlist_id',
  CACHE_PREFIX: 'xnova_cache_',
  FAVORITES: 'xnova_favorites',
  WATCH_PROGRESS: 'xnova_watch_progress',
  PARENTAL_PIN: 'xnova_parental_pin',
  ACTIVE_PROFILE: 'xnova_active_profile',
  SHOW_SPLASH: 'xnova_show_splash',
  ACTIVE_THEME: 'xnova_active_theme',
  MANAGED_USERS: 'xnova_managed_users_v2',
  ACTIVE_SESSION: 'xnova_active_session_v2',
  USERS_INITIALIZED: 'xnova_users_initialized_v2',
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

  // --- Preferencia de Animación de Inicio ---
  async getShowSplashAnimation(): Promise<boolean> {
    const val = await get<boolean>(KEYS.SHOW_SPLASH);
    return val !== undefined ? val : true; // Activado por defecto
  },

  async setShowSplashAnimation(show: boolean): Promise<void> {
    await set(KEYS.SHOW_SPLASH, show);
  },

  // --- Estilo / Tema de la Interfaz ---
  async getActiveTheme(): Promise<'cinematic' | 'serivia'> {
    const theme = await get<'cinematic' | 'serivia'>(KEYS.ACTIVE_THEME);
    return theme || 'cinematic'; // Por defecto: 'cinematic' (John Wick)
  },

  async setActiveTheme(theme: 'cinematic' | 'serivia'): Promise<void> {
    await set(KEYS.ACTIVE_THEME, theme);
  },

  // --- Gestión de Usuarios y Sesiones Persistentes (Almacenamiento permanente en Disco / IndexedDB) ---
  async getManagedUsers(): Promise<UserAccount[] | null> {
    const users = await get<UserAccount[]>(KEYS.MANAGED_USERS);
    return users || null;
  },

  async saveManagedUsers(users: UserAccount[]): Promise<void> {
    await set(KEYS.MANAGED_USERS, users);
    await set(KEYS.USERS_INITIALIZED, true);
  },

  async getHasInitializedUsers(): Promise<boolean> {
    const initialized = await get<boolean>(KEYS.USERS_INITIALIZED);
    return !!initialized;
  },

  async setHasInitializedUsers(val: boolean): Promise<void> {
    await set(KEYS.USERS_INITIALIZED, val);
  },

  async getPersistentSession(): Promise<UserAccount | null> {
    const session = await get<UserAccount>(KEYS.ACTIVE_SESSION);
    return session || null;
  },

  async savePersistentSession(user: UserAccount): Promise<void> {
    await set(KEYS.ACTIVE_SESSION, user);
  },

  async clearPersistentSession(): Promise<void> {
    await del(KEYS.ACTIVE_SESSION);
  },
};
