import type { MovieItem } from '../types';

export interface TmdbMovieResult {
  id: number;
  title: string;
  backdrop_path: string | null;
  poster_path: string | null;
  overview: string;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
}

const TMDB_GENRES: Record<number, string> = {
  28: 'Acción',
  12: 'Aventura',
  16: 'Animación',
  35: 'Comedia',
  80: 'Crimen',
  99: 'Documental',
  18: 'Drama',
  10751: 'Familia',
  14: 'Fantasía',
  36: 'Historia',
  27: 'Terror',
  10402: 'Música',
  9648: 'Misterio',
  10749: 'Romance',
  878: 'Ciencia Ficción',
  10770: 'Película de TV',
  53: 'Suspense',
  10752: 'Bélica',
  37: 'Western',
};

const cache = new Map<string, MovieItem>();

export class TmdbService {
  private static getApiKey(): string {
    return import.meta.env.VITE_TMDB_API_KEY || '844dba0bfd8f3a4f3799f6130ef9e335';
  }

  public static cleanTitle(rawTitle: string): string {
    return rawTitle
      .replace(/\[.*?\]|\(.*?\)|«.*?»|<.*?>/g, '')
      .replace(/\b(4K|2160p|1080p|720p|480p|HD|FHD|LATINO|CASTELLANO|SUB|ESP|P2P|PLEX|PROMO)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  public static async enrichMovie(
    rawTitle: string,
    fallbackPoster: string = '',
    fallbackStreamUrl: string = ''
  ): Promise<MovieItem> {
    const cleanTitle = this.cleanTitle(rawTitle);

    const cacheKey = cleanTitle.toLowerCase();
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }

    const apiKey = this.getApiKey();

    // Si no hay API key configurada, retornar datos básicos limpios con fallback
    if (!apiKey) {
      const basicItem: MovieItem = {
        id: `local_${cleanTitle}`,
        title: cleanTitle,
        backdropUrl: fallbackPoster || '',
        posterUrl: fallbackPoster || '',
        genres: ['Acción', 'Estreno'],
        synopsis: 'Disfruta de este contenido en alta definición desde tu servidor IPTV.',
        duration: '1h 50Min',
        year: new Date().getFullYear().toString(),
        rating: 'PG-13',
        isPremiere: true,
        streamUrl: fallbackStreamUrl,
      };
      cache.set(cacheKey, basicItem);
      return basicItem;
    }

    try {
      const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
        cleanTitle
      )}&language=es-ES&page=1&include_adult=false`;

      const res = await fetch(searchUrl);
      if (!res.ok) throw new Error('Error al conectar con TMDb');

      const data = await res.json();
      let firstResult: TmdbMovieResult | undefined = data.results?.[0];

      if (!firstResult) {
        // Segundo intento en inglés/título original si la búsqueda en español no tuvo coincidencia
        try {
          const fallbackSearch = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}&page=1&include_adult=false`;
          const res2 = await fetch(fallbackSearch);
          if (res2.ok) {
            const data2 = await res2.json();
            firstResult = data2.results?.[0];
          }
        } catch {
          // Continuar
        }
      }

      if (!firstResult) {
        throw new Error('Sin coincidencia en TMDb');
      }

      // Detalle para obtener duración
      let runtimeMin = 115;
      try {
        const detailRes = await fetch(
          `https://api.themoviedb.org/3/movie/${firstResult.id}?api_key=${apiKey}&language=es-ES`
        );
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData.runtime) runtimeMin = detailData.runtime;
        }
      } catch {
        // Ignorar error secundario de detalle
      }

      const hours = Math.floor(runtimeMin / 60);
      const minutes = runtimeMin % 60;
      const durationStr = `${hours}h ${minutes.toString().padStart(2, '0')}Min`;

      const genres = (firstResult.genre_ids || [])
        .map((id) => TMDB_GENRES[id])
        .filter(Boolean)
        .slice(0, 3);

      const year = firstResult.release_date
        ? firstResult.release_date.split('-')[0]
        : new Date().getFullYear().toString();

      const enriched: MovieItem & { _tmdbReleaseDate?: string } = {
        id: `tmdb_${firstResult.id}`,
        title: firstResult.title || cleanTitle,
        backdropUrl: firstResult.backdrop_path
          ? `https://image.tmdb.org/t/p/original${firstResult.backdrop_path}`
          : fallbackPoster || '',
        posterUrl: firstResult.poster_path
          ? `https://image.tmdb.org/t/p/w500${firstResult.poster_path}`
          : fallbackPoster || '',
        genres: genres.length > 0 ? genres : ['Aventura', 'Acción'],
        synopsis: firstResult.overview || 'Sin descripción disponible.',
        duration: durationStr,
        year,
        rating: firstResult.vote_average ? `${firstResult.vote_average.toFixed(1)} ★` : 'PG-13',
        isPremiere: true,
        streamUrl: fallbackStreamUrl,
        // Fecha de estreno real de TMDb (para detectar "Próximamente")
        _tmdbReleaseDate: firstResult.release_date || undefined,
      };

      cache.set(cacheKey, enriched);
      return enriched;
    } catch {
      // Fallback robusto en caso de error de red o no match
      const fallbackItem: MovieItem = {
        id: `fallback_${cleanTitle}`,
        title: cleanTitle,
        backdropUrl: fallbackPoster || 'https://images.unsplash.com/photo-1635863138275-d9b33299680b?q=80&w=1920&auto=format&fit=crop',
        posterUrl: fallbackPoster || 'https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?q=80&w=600&auto=format&fit=crop',
        genres: ['Acción', 'Drama'],
        synopsis: 'Contenido disponible en tu lista de reproducción IPTV.',
        duration: '2h 00Min',
        year: '2026',
        rating: 'PG-13',
        isPremiere: false,
        streamUrl: fallbackStreamUrl,
      };
      cache.set(cacheKey, fallbackItem);
      return fallbackItem;
    }
  }

  /**
   * 📅 Obtiene los próximos estrenos mundiales (PRÓXIMAMENTE) desde TMDb
   */
  public static async getUpcomingMovies(page: number = 1): Promise<TmdbMovieResult[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) return [];
    try {
      const url = `https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=es-ES&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []) as TmdbMovieResult[];
    } catch (err) {
      console.warn('[TMDb] Error al obtener próximos estrenos:', err);
      return [];
    }
  }

  /**
   * 🍿 Obtiene los estrenos actuales en cartelera / streaming (ESTRENO) desde TMDb
   */
  public static async getNowPlayingMovies(page: number = 1): Promise<TmdbMovieResult[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) return [];
    try {
      const url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&language=es-ES&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []) as TmdbMovieResult[];
    } catch (err) {
      console.warn('[TMDb] Error al obtener estrenos en cartelera:', err);
      return [];
    }
  }

  /**
   * 🔥 Obtiene películas en tendencia de la semana
   */
  public static async getTrendingMovies(): Promise<TmdbMovieResult[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) return [];
    try {
      const url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}&language=es-ES`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []) as TmdbMovieResult[];
    } catch (err) {
      console.warn('[TMDb] Error al obtener películas en tendencia:', err);
      return [];
    }
  }

  /**
   * 🎬 Obtiene el ID del trailer oficial de YouTube para una película
   */
  public static async getMovieTrailer(movieId: number): Promise<string | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;
    try {
      // 1. Intentar trailer en español
      let url = `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${apiKey}&language=es-ES`;
      let res = await fetch(url);
      let data = await res.json();
      let videos = (data.results || []) as any[];

      // 2. Si no hay en español, intentar en inglés
      if (videos.length === 0) {
        url = `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${apiKey}&language=en-US`;
        res = await fetch(url);
        data = await res.json();
        videos = (data.results || []) as any[];
      }

      // Buscar un Trailer oficial en YouTube
      const trailer = videos.find(
        (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
      ) || videos.find((v) => v.site === 'YouTube');

      return trailer?.key || null;
    } catch (err) {
      console.warn(`[TMDb] Error al obtener trailer para película ${movieId}:`, err);
      return null;
    }
  }
}
