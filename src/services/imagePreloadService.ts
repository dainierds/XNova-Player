/**
 * imagePreloadService.ts
 * Motor de precarga agresiva de imágenes en memoria (similar a Glide en Android nativo).
 * 
 * Previene el parpadeo de pósters, evita tarjetas vacías durante el scroll
 * y mantiene un caché en caliente en la memoria RAM del WebView.
 */

class ImagePreloadEngine {
  private preloadedUrls = new Set<string>();
  private activeImages = new Map<string, HTMLImageElement>();
  private pendingImages = new Set<HTMLImageElement>();
  private maxCacheSize = 120; // Máximo 120 imágenes activas en RAM para no saturar dispositivos TV

  /**
   * Precarga una imagen individual en segundo plano
   */
  public preload(url: string | undefined | null): Promise<boolean> {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return Promise.resolve(false);
    }

    if (this.preloadedUrls.has(url)) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async'; // Decodificación asíncrona para no congelar el hilo principal de renderizado
      this.pendingImages.add(img);

      img.onload = () => {
        this.pendingImages.delete(img);
        this.preloadedUrls.add(url);
        this.activeImages.set(url, img);

        // Control de memoria LRU simple
        if (this.activeImages.size > this.maxCacheSize) {
          const firstKey = this.activeImages.keys().next().value;
          if (firstKey) {
            this.activeImages.delete(firstKey);
          }
        }
        resolve(true);
      };

      img.onerror = () => {
        this.pendingImages.delete(img);
        // No bloquear la app si una imagen falla
        resolve(false);
      };

      img.src = url;
    });
  }

  /**
   * Cancela inmediatamente todas las descargas de imágenes en curso.
   * Libera instantáneamente los sockets HTTP del WebView al cambiar de carpeta o categoría.
   */
  public cancelAllPending(): void {
    for (const img of this.pendingImages) {
      try {
        img.onload = null;
        img.onerror = null;
        img.src = '';
      } catch {
        // Ignorar posibles excepciones al abortar
      }
    }
    this.pendingImages.clear();
  }

  /**
   * Precarga un lote de imágenes (por ejemplo, las siguientes 10 miniaturas del carrusel)
   */
  public preloadBatch(urls: (string | undefined | null)[]): void {
    const validUrls = urls.filter((u): u is string => typeof u === 'string' && u.startsWith('http'));
    for (const url of validUrls) {
      this.preload(url);
    }
  }

  /**
   * Comprueba si una imagen ya está lista en la memoria RAM
   */
  public isCached(url: string): boolean {
    return this.preloadedUrls.has(url);
  }
}

export const ImagePreloadService = new ImagePreloadEngine();
