/**
 * Utilidad para invocar reproductores externos en Android TV (VLC, MX Player, Just Player, etc.)
 */
export const openExternalPlayer = (streamUrl: string, title: string = 'Video') => {
  try {
    const launcher = (window as unknown as { NativePlayerLauncher?: { openExternalPlayer: (url: string, title: string) => void } }).NativePlayerLauncher;
    if (launcher && typeof launcher.openExternalPlayer === 'function') {
      launcher.openExternalPlayer(streamUrl, title);
      return;
    }

    // Fallback en navegador o entorno sin interfaz nativa
    window.open(streamUrl, '_blank');
  } catch (err) {
    console.error('Error al intentar abrir reproductor externo:', err);
    window.open(streamUrl, '_blank');
  }
};
