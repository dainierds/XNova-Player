/**
 * posterResolutionService.ts
 * Motor de resolución y asignación automática de carátulas HD (igual que TiviMate y Kai TV).
 * 
 * Características:
 * 1. Cola de peticiones controlada (máximo 3 peticiones simultáneas) para no saturar TMDb ni causar bloqueos HTTP 429.
 * 2. Caché persistente en IndexedDB: cada película se busca solo una vez en la vida de la app.
 * 3. Limpieza profunda de títulos con marcas de proveedores (ej. «PLEX», «P2P», [4K], etc.).
 */

import { get, set } from 'idb-keyval';

interface QueueTask {
  title: string;
  fallbackUrl?: string;
  resolve: (url: string) => void;
}

class PosterResolutionEngine {
  private memoryCache = new Map<string, string>();
  private inFlight = new Map<string, Promise<string>>();
  private queue: QueueTask[] = [];
  private activeWorkers = 0;
  private maxConcurrency = 3; // Máximo 3 descargas simultáneas en segundo plano (igual que Glide/TiviMate)

  /**
   * Vacía la cola de peticiones de TMDb pendientes de la carpeta anterior.
   * Evita que búsquedas obsoletas consuman conexiones de red y cuotas de API.
   */
  public clearQueue(): void {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        task.resolve(task.fallbackUrl || '');
      }
    }
  }

  /**
   * Limpia marcas de agua, grupos P2P y tags técnicos de IPTV
   */
  public cleanTitle(raw: string): string {
    if (!raw) return '';
    return raw
      .replace(/«.*?»|\[.*?\]|\(.*?\)|<.*?>/g, '')
      .replace(/\b(4k|2160p|1080p|720p|480p|fhd|hd|latino|castellano|sub|esp|eng|dual|p2p|plex|vod|promo)\b/gi, ' ')
      .replace(/[-_.:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Obtiene el póster directamente de la memoria RAM si ya fue resuelto (0ms)
   */
  public getCachedPoster(rawTitle: string): string | null {
    const clean = this.cleanTitle(rawTitle);
    if (!clean) return null;
    const cacheKey = `poster_tmdb_${clean.toLowerCase()}`;
    return this.memoryCache.get(cacheKey) || null;
  }

  /**
   * Resuelve el póster real en alta definición
   */
  public async resolvePoster(rawTitle: string, fallbackUrl?: string): Promise<string> {
    const clean = this.cleanTitle(rawTitle);
    if (!clean || clean.length < 2) {
      return fallbackUrl || '';
    }

    const cacheKey = `poster_tmdb_${clean.toLowerCase()}`;

    // 1. Comprobar memoria RAM (0ms)
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }

    // 2. Si ya hay una resolución en curso para este título, devolver la misma promesa
    if (this.inFlight.has(cacheKey)) {
      return this.inFlight.get(cacheKey)!;
    }

    const promise = (async () => {
      // 3. Comprobar almacenamiento persistente IndexedDB (1-3ms)
      try {
        const persisted = await get<string>(cacheKey);
        if (persisted) {
          this.memoryCache.set(cacheKey, persisted);
          return persisted;
        }
      } catch {
        // Continuar a la cola si hay fallo de lectura
      }

      // 4. Encolar la petición para resolver con TMDb de forma ordenada
      return new Promise<string>((resolve) => {
        this.queue.push({
          title: clean,
          fallbackUrl,
          resolve: (url) => {
            this.memoryCache.set(cacheKey, url);
            set(cacheKey, url).catch(() => {});
            resolve(url);
          },
        });
        this.processQueue();
      });
    })();

    this.inFlight.set(cacheKey, promise);
    promise.finally(() => {
      this.inFlight.delete(cacheKey);
    });

    return promise;
  }

  private async processQueue(): Promise<void> {
    if (this.activeWorkers >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    this.activeWorkers++;
    const task = this.queue.shift();

    if (!task) {
      this.activeWorkers--;
      return;
    }

    try {
      const apiKey = '844dba0bfd8f3a4f3799f6130ef9e335';
      const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(
        task.title
      )}&language=es-ES&page=1&include_adult=false`;

      const res = await fetch(searchUrl);
      if (res.ok) {
        const data = await res.json();
        const first = data.results?.[0];
        if (first?.poster_path) {
          const finalPoster = `https://image.tmdb.org/t/p/w500${first.poster_path}`;
          task.resolve(finalPoster);
          this.activeWorkers--;
          // Pequeño descanso de 40ms entre peticiones para respetar la red del televisor
          setTimeout(() => this.processQueue(), 40);
          return;
        }
      }

      // Si no hubo coincidencia en español, intentar fallback a la URL del proveedor o placeholder
      task.resolve(task.fallbackUrl || '');
    } catch {
      task.resolve(task.fallbackUrl || '');
    } finally {
      this.activeWorkers--;
      setTimeout(() => this.processQueue(), 40);
    }
  }
}

export const PosterResolutionService = new PosterResolutionEngine();
