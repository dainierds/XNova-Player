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
