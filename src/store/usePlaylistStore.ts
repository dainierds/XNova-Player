import { create } from 'zustand';
import type { PlaylistAccount, MovieItem } from '../types';
import { StorageService } from '../services/storage';
import { XtreamService, type XtreamCategory, type XtreamStream } from '../services/xtream';
import { M3uParserService } from '../services/m3uParser';
import { TmdbService } from '../services/tmdb';
import { MOCK_MOVIES } from '../mock/mockMovies';

interface PlaylistState {
  playlists: PlaylistAccount[];
  activePlaylist: PlaylistAccount | null;
  isLoading: boolean;
  syncProgress: string;
  errorMessage: string | null;

  // Catálogo en memoria
  vodCategories: XtreamCategory[];
  vodMovies: MovieItem[];
  liveCategories: XtreamCategory[];
  liveStreams: XtreamStream[];
  
  // Acciones
  loadStoredPlaylists: () => Promise<void>;
  addPlaylist: (account: Omit<PlaylistAccount, 'id' | 'isActive'>) => Promise<boolean>;
  updatePlaylist: (account: PlaylistAccount) => Promise<boolean>;
  deletePlaylist: (id: string) => Promise<void>;
  setActivePlaylist: (id: string) => Promise<void>;
  syncCurrentPlaylist: () => Promise<void>;
  loadUserPlaylists: (userPlaylists: PlaylistAccount[]) => void;
  clearError: () => void;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  activePlaylist: null,
  isLoading: false,
  syncProgress: '',
  errorMessage: null,
  vodCategories: [],
  vodMovies: MOCK_MOVIES, // Datos iniciales hasta que se sincronice una lista
  liveCategories: [],
  liveStreams: [],

  clearError: () => set({ errorMessage: null }),

  loadUserPlaylists: (userPlaylists: PlaylistAccount[]) => {
    const active = userPlaylists.find((p) => p.isActive) || userPlaylists[0] || null;
    set({ playlists: userPlaylists, activePlaylist: active });
  },

  loadStoredPlaylists: async () => {
    try {
      const stored = await StorageService.getPlaylists();
      const activeId = await StorageService.getActivePlaylistId();
      
      let active = stored.find((p) => p.id === activeId) || null;
      if (!active && stored.length > 0) {
        active = stored[0];
      }

      set({ playlists: stored, activePlaylist: active });

      if (active) {
        // Intentar cargar desde caché
        const cached = await StorageService.getCatalogCache<{
          vodCategories: XtreamCategory[];
          vodMovies: MovieItem[];
          liveCategories: XtreamCategory[];
          liveStreams: XtreamStream[];
        }>(active.id);

        if (cached && cached.vodMovies && cached.vodMovies.length > 0) {
          set({
            vodCategories: cached.vodCategories || [],
            vodMovies: cached.vodMovies,
            liveCategories: cached.liveCategories || [],
            liveStreams: cached.liveStreams || [],
          });
        } else {
          // Sincronizar en segundo plano
          get().syncCurrentPlaylist();
        }
      }
    } catch (err) {
      console.error('Error al cargar listas almacenadas:', err);
    }
  },

  addPlaylist: async (accountData) => {
    const { playlists } = get();
    if (playlists.length >= 3) {
      set({ errorMessage: 'Límite alcanzado: Máximo 3 listas permitidas.' });
      return false;
    }

    set({ isLoading: true, syncProgress: 'Validando conexión...' });

    try {
      let expDateFormatted = 'DESCONOCIDO';

      if (accountData.type === 'xtream') {
        const { userInfo } = await XtreamService.authenticate(
          accountData.serverUrl || '',
          accountData.username || '',
          accountData.password || ''
        );
        expDateFormatted = userInfo.expDateFormatted;
      }

      const newAccount: PlaylistAccount = {
        ...accountData,
        id: `pl_${Date.now()}`,
        isActive: playlists.length === 0, // Si es la primera, queda activa
        expDate: expDateFormatted,
      };

      const updated = [...playlists, newAccount];
      await StorageService.savePlaylists(updated);
      set({ playlists: updated, isLoading: false, syncProgress: '' });

      if (newAccount.isActive) {
        await get().setActivePlaylist(newAccount.id);
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servidor';
      set({ isLoading: false, errorMessage: msg, syncProgress: '' });
      return false;
    }
  },

  updatePlaylist: async (account) => {
    set({ isLoading: true, syncProgress: 'Validando cambios...' });

    try {
      let expDateFormatted = account.expDate;

      if (account.type === 'xtream') {
        const { userInfo } = await XtreamService.authenticate(
          account.serverUrl || '',
          account.username || '',
          account.password || ''
        );
        expDateFormatted = userInfo.expDateFormatted;
      }

      const updatedList = get().playlists.map((p) =>
        p.id === account.id ? { ...account, expDate: expDateFormatted } : p
      );

      await StorageService.savePlaylists(updatedList);
      set({ playlists: updatedList, isLoading: false, syncProgress: '' });

      if (get().activePlaylist?.id === account.id) {
        set({ activePlaylist: { ...account, expDate: expDateFormatted } });
        await get().syncCurrentPlaylist();
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar lista';
      set({ isLoading: false, errorMessage: msg, syncProgress: '' });
      return false;
    }
  },

  deletePlaylist: async (id) => {
    const { playlists, activePlaylist } = get();
    const updated = playlists.filter((p) => p.id !== id);
    await StorageService.savePlaylists(updated);
    await StorageService.clearCatalogCache(id);

    let nextActive: PlaylistAccount | null = null;
    if (activePlaylist?.id === id) {
      nextActive = updated[0] || null;
      if (nextActive) {
        await StorageService.setActivePlaylistId(nextActive.id);
      }
    } else {
      nextActive = activePlaylist;
    }

    set({ playlists: updated, activePlaylist: nextActive });
    if (nextActive) {
      await get().syncCurrentPlaylist();
    } else {
      // Revertir a datos de demostración
      set({ vodMovies: MOCK_MOVIES });
    }
  },

  setActivePlaylist: async (id) => {
    const { playlists } = get();
    const target = playlists.find((p) => p.id === id);
    if (!target) return;

    await StorageService.setActivePlaylistId(id);
    set({ activePlaylist: target });
    await get().syncCurrentPlaylist();
  },

  syncCurrentPlaylist: async () => {
    const { activePlaylist } = get();
    if (!activePlaylist) return;

    set({ isLoading: true, syncProgress: 'Sincronizando categorías y canales...' });

    try {
      if (activePlaylist.type === 'xtream') {
        const server = activePlaylist.serverUrl || '';
        const user = activePlaylist.username || '';
        const pass = activePlaylist.password || '';

        // 1. Categorías VOD
        const vodCats = await XtreamService.getVodCategories(server, user, pass);
        // 2. Streams VOD (Películas recientes)
        set({ syncProgress: 'Cargando películas y enriqueciendo carátulas...' });
        const vodStreams = await XtreamService.getVodStreams(server, user, pass);

        // Enriquecer las primeras 15 películas con TMDb para el carrusel hero
        const topStreams = (vodStreams || []).slice(0, 15);
        const enrichedMovies: MovieItem[] = [];

        for (const st of topStreams) {
          const streamUrl = XtreamService.buildVodStreamUrl(
            server,
            user,
            pass,
            st.stream_id,
            st.container_extension || 'mp4'
          );
          const enriched = await TmdbService.enrichMovie(st.name, st.stream_icon, streamUrl);
          enrichedMovies.push(enriched);
        }

        // 3. Canales en Vivo
        set({ syncProgress: 'Cargando canales de TV en vivo...' });
        const liveCats = await XtreamService.getLiveCategories(server, user, pass);
        const liveStreams = await XtreamService.getLiveStreams(server, user, pass);

        const newMovies = enrichedMovies.length > 0 ? enrichedMovies : MOCK_MOVIES;

        set({
          vodCategories: vodCats || [],
          vodMovies: newMovies,
          liveCategories: liveCats || [],
          liveStreams: liveStreams || [],
          isLoading: false,
          syncProgress: '',
        });

        // Guardar en caché IndexedDB
        await StorageService.saveCatalogCache(activePlaylist.id, {
          vodCategories: vodCats,
          vodMovies: newMovies,
          liveCategories: liveCats,
          liveStreams,
        });
      } else if (activePlaylist.type === 'm3u' && activePlaylist.m3uUrl) {
        set({ syncProgress: 'Descargando y analizando lista M3U...' });
        const entries = await M3uParserService.parseFromUrl(activePlaylist.m3uUrl);

        const movieEntries = entries.filter((e) => e.type === 'movie').slice(0, 15);
        const enrichedMovies: MovieItem[] = [];

        for (const m of movieEntries) {
          const enriched = await TmdbService.enrichMovie(m.name, m.logo, m.url);
          enrichedMovies.push(enriched);
        }

        const newMovies = enrichedMovies.length > 0 ? enrichedMovies : MOCK_MOVIES;

        set({
          vodMovies: newMovies,
          isLoading: false,
          syncProgress: '',
        });

        await StorageService.saveCatalogCache(activePlaylist.id, {
          vodMovies: newMovies,
        });
      }
    } catch (err: unknown) {
      console.warn('Error durante la sincronización:', err);
      set({
        isLoading: false,
        syncProgress: '',
        errorMessage: 'Aviso: No se pudo conectar al servidor. Mostrando contenido en caché.',
      });
    }
  },
}));
