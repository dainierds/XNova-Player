/**
 * Puente para invocar el motor de reproducción nativo ExoPlayer (Google Media3)
 * exactamente igual a TiviMate en Android TV.
 */
export const playWithNativePlayer = (item: {
  streamUrl: string;
  title: string;
  posterUrl?: string;
  isLive?: boolean;
}): boolean => {
  try {
    const bridge = (window as unknown as {
      ExoPlayerBridge?: {
        playExoPlayer: (url: string, title: string, posterUrl: string, isLive: boolean) => void;
        isAvailable: () => boolean;
      };
    }).ExoPlayerBridge;

    if (bridge && typeof bridge.playExoPlayer === 'function') {
      bridge.playExoPlayer(
        item.streamUrl,
        item.title,
        item.posterUrl || '',
        !!item.isLive
      );
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

