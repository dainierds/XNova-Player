/**
 * catalogMatcherService.ts
 * Motor de Vinculación Inteligente (Smart Matching / Deep Link)
 * 
 * Vincula cualquier película de la pantalla principal (obtenida de TMDb o secciones destacadas)
 * con el stream exacto de la lista Xtream del usuario en 0 a 5 milisegundos.
 */

import type { PlaylistAccount } from '../types';
import { CatalogCacheService, type CompactCatalogItem } from './catalogCacheService';
import { XtreamService } from './xtream';

export interface MatchResolution {
  isMatch: boolean;
  resolvedUrl: string | null;
  matchedItem: CompactCatalogItem | null;
}

export const CatalogMatcherService = {
  /**
   * Resuelve el enlace exacto de reproducción para una película
   */
  async resolveMovieStream(
    playlist: PlaylistAccount | null,
    item: {
      title: string;
      tmdbId?: number | string;
      streamUrl?: string;
    }
  ): Promise<MatchResolution> {
    if (!playlist) {
      return { isMatch: false, resolvedUrl: null, matchedItem: null };
    }

    const server = playlist.serverUrl || '';
    const user = playlist.username || '';
    const pass = playlist.password || '';

    // Si ya tiene una URL de Xtream válida con el servidor y usuario activos, usarla de inmediato
    if (
      item.streamUrl &&
      user &&
      item.streamUrl.includes(user) &&
      !item.streamUrl.includes('test-streams.mux.dev')
    ) {
      return {
        isMatch: true,
        resolvedUrl: item.streamUrl,
        matchedItem: null,
      };
    }

    if (!server || !user || !pass) {
      return { isMatch: false, resolvedUrl: null, matchedItem: null };
    }

    // 🎯 Buscar coincidencia exacta en la caché local del catálogo
    const match = await CatalogCacheService.findBestMatch(
      playlist.id,
      item.title,
      item.tmdbId
    );

    if (match) {
      const streamUrl = XtreamService.buildVodStreamUrl(
        server,
        user,
        pass,
        match.id,
        match.ext || 'mp4'
      );
      return {
        isMatch: true,
        resolvedUrl: streamUrl,
        matchedItem: match,
      };
    }

    return {
      isMatch: false,
      resolvedUrl: null,
      matchedItem: null,
    };
  },
};
