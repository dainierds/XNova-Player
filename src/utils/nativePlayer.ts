/**
 * Puente para invocar el motor de reproducción nativo ExoPlayer (Google Media3)
 * exactamente igual a TiviMate en Android TV.
 */
export const playWithNativePlayer = (item: {
  streamUrl: string;
  title: string;
  posterUrl?: string;
  isLive?: boolean;
  seriesContext?: any;
  liveContext?: any;
}): boolean => {
  try {
    const bridge = (window as unknown as {
      ExoPlayerBridge?: {
        playExoPlayer: (url: string, title: string, posterUrl: string, isLive: boolean, seriesInfoJson?: string) => void;
        isAvailable: () => boolean;
      };
    }).ExoPlayerBridge;

    if (bridge && typeof bridge.playExoPlayer === 'function') {
      const quickList = item.seriesContext || item.liveContext;
      const quickListJson = quickList ? JSON.stringify(quickList) : '';
      try {
        bridge.playExoPlayer(
          item.streamUrl,
          item.title,
          item.posterUrl || '',
          !!item.isLive,
          quickListJson
        );
      } catch {
        // Fallback si la versión nativa anterior solo aceptaba 4 argumentos
        (bridge.playExoPlayer as any)(
          item.streamUrl,
          item.title,
          item.posterUrl || '',
          !!item.isLive
        );
      }
      return true;
    }
  } catch (err) {
    console.error('Error al invocar Google Media3 ExoPlayer nativo:', err);
  }
  return false;
};

/**
 * Verifica si el motor nativo de catálogo en Jetpack Compose & SQLite Room está disponible
 */
export const isNativeCatalogAvailable = (): boolean => {
  try {
    const bridge = (window as unknown as {
      NativeTvCatalogBridge?: {
        isAvailable: () => boolean;
      };
    }).NativeTvCatalogBridge;
    return !!(bridge && typeof bridge.isAvailable === 'function' && bridge.isAvailable());
  } catch {
    return false;
  }
};

/**
 * Invoca la experiencia de TV 100% nativa con consultas de 0ms en SQLite
 */
export const openNativeTvCatalog = (server: string, user: string, pass: string): boolean => {
  try {
    const bridge = (window as unknown as {
      NativeTvCatalogBridge?: {
        openNativeCatalog: (server: string, user: string, pass: string) => void;
      };
    }).NativeTvCatalogBridge;

    if (bridge && typeof bridge.openNativeCatalog === 'function') {
      bridge.openNativeCatalog(server, user, pass);
      return true;
    }
  } catch (err) {
    console.error('Error al invocar Catálogo Nativo Compose/Room:', err);
  }
  return false;
};

/**
 * Invoca el reproductor de TV en Vivo 100% nativo con Zapping instantáneo y Guía Overlay estilo TiviMate
 */
export const openNativeLiveTv = (server: string, user: string, pass: string): boolean => {
  try {
    const bridge = (window as unknown as {
      NativeTvCatalogBridge?: {
        openNativeLiveTv: (server: string, user: string, pass: string) => void;
      };
    }).NativeTvCatalogBridge;

    if (bridge && typeof bridge.openNativeLiveTv === 'function') {
      bridge.openNativeLiveTv(server, user, pass);
      return true;
    }
  } catch (err) {
    console.error('Error al invocar TV en Vivo Nativo:', err);
  }
  return false;
};

/**
 * Invoca el mosaico Multiscreen de 4 pantallas en vivo con audio conmutable
 */
export const openNativeMultiscreen = (server: string, user: string, pass: string): boolean => {
  try {
    const bridge = (window as unknown as {
      NativeTvCatalogBridge?: {
        openNativeMultiscreen: (server: string, user: string, pass: string) => void;
      };
    }).NativeTvCatalogBridge;

    if (bridge && typeof bridge.openNativeMultiscreen === 'function') {
      bridge.openNativeMultiscreen(server, user, pass);
      return true;
    }
  } catch (err) {
    console.error('Error al invocar Multiscreen:', err);
  }
  return false;
};

/**
 * Invoca la Guía EPG Horizontal Interactiva con Línea de Tiempo y Replay / Catchup (TiviMate style)
 */
export const openNativeEpgGuide = (server: string, user: string, pass: string): boolean => {
  try {
    const bridge = (window as unknown as {
      NativeTvCatalogBridge?: {
        openNativeEpgGuide: (server: string, user: string, pass: string) => void;
      };
    }).NativeTvCatalogBridge;

    if (bridge && typeof bridge.openNativeEpgGuide === 'function') {
      bridge.openNativeEpgGuide(server, user, pass);
      return true;
    }
  } catch (err) {
    console.error('Error al invocar Guía EPG:', err);
  }
  return false;
};

