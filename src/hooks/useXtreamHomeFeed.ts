/**
 * useXtreamHomeFeed.ts
 * Hook que carga contenido REAL desde la lista Xtream activa del usuario,
 * enriquece con TMDb (poster HD, sinopsis, géneros, duración)
 * y clasifica automáticamente en:
 *   - ESTRENO   → añadido a la lista en los últimos 30 días
 *   - PRÓXIMAMENTE → fecha de estreno en TMDb es futura (proveedor subió el contenido antes)
 *   - NUEVO     → añadido recientemente (< 90 días) pero no tan reciente
 */

import { useState, useEffect, useRef } from 'react';
import type { PlaylistAccount, MovieItem } from '../types';
import { XtreamService } from '../services/xtream';
import { TmdbService } from '../services/tmdb';

export type ContentTag = 'ESTRENO' | 'PRÓXIMAMENTE' | 'NUEVO' | 'TENDENCIA';

export interface HomeFeedItem extends MovieItem {
  tag: ContentTag;
  addedTimestamp: number; // unix timestamp de cuando fue añadido a la lista
  section: 'featured' | 'recientes' | 'tendencias' | 'proximamente';
}

interface HomeFeedState {
  featured: HomeFeedItem[];     // Para el hero principal (mezcla de los mejores)
  recientes: HomeFeedItem[];    // Películas recién añadidas ESTRENO
  tendencias: HomeFeedItem[];   // Las con mejor rating/populares
  proximamente: HomeFeedItem[]; // Fecha de estreno futura en TMDb
  isLoading: boolean;
  loadingText: string;
  error: string | null;
}

const DAYS_ESTRENO = 30;   // Añadido hace menos de 30 días → ESTRENO
const DAYS_NUEVO   = 90;   // Añadido hace menos de 90 días → NUEVO
const NOW_UNIX = Math.floor(Date.now() / 1000);

/** Calcula el tag según cuándo fue añadido a la lista y la fecha de estreno en TMDb */
function calcTag(addedUnix: number, tmdbReleaseDate?: string): ContentTag {
  const daysSinceAdded = (NOW_UNIX - addedUnix) / 86400;

  // Si la fecha de estreno en TMDb aún no ha llegado → PRÓXIMAMENTE
  if (tmdbReleaseDate) {
    const releaseMs = new Date(tmdbReleaseDate).getTime();
    if (releaseMs > Date.now()) {
      return 'PRÓXIMAMENTE';
    }
  }

  if (daysSinceAdded <= DAYS_ESTRENO) return 'ESTRENO';
  if (daysSinceAdded <= DAYS_NUEVO)   return 'NUEVO';
  return 'TENDENCIA';
}

/** Limpia el título de Xtream para buscar mejor en TMDb */
function cleanTitle(raw: string): string {
  return raw
    .replace(/\[.*?\]|\(.*?\)/g, '')
    .replace(/\b(4K|2160p|1080p|720p|480p|HD|FHD|SDR|HDR|HEVC|x265|x264|LATINO|CASTELLANO|DUAL|SUB|ESP|ENG|CAM|HDTS|HDCAM|SCREENER|BDRIP|BLURAY|WEBDL|WEB-DL|WEBRip)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function useXtreamHomeFeed(activePlaylist: PlaylistAccount | null): HomeFeedState {
  const [state, setState] = useState<HomeFeedState>({
    featured: [],
    recientes: [],
    tendencias: [],
    proximamente: [],
    isLoading: false,
    loadingText: '',
    error: null,
  });

  const abortRef = useRef(false);
  const lastPlaylistId = useRef<string | null>(null);

  useEffect(() => {
    // No hacer nada si no hay lista o si es la misma que ya cargamos
    if (!activePlaylist) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }
    if (activePlaylist.id === lastPlaylistId.current) return;

    abortRef.current = false;
    lastPlaylistId.current = activePlaylist.id;

    if (activePlaylist.type !== 'xtream') {
      // Para M3U no hacemos este proceso (no tiene metadatos de fecha)
      return;
    }

    const server = activePlaylist.serverUrl || '';
    const user   = activePlaylist.username  || '';
    const pass   = activePlaylist.password  || '';

    if (!server || !user || !pass) return;

    const load = async () => {
      setState(s => ({ ...s, isLoading: true, loadingText: 'Cargando catálogo de películas...', error: null }));

      try {
        // 1. Obtener TODOS los VOD streams
        const allStreams = await XtreamService.getVodStreams(server, user, pass);
        if (abortRef.current) return;

        if (!allStreams || allStreams.length === 0) {
          setState(s => ({ ...s, isLoading: false, loadingText: '' }));
          return;
        }

        // 2. Ordenar por fecha de añadido descendente (más recientes primero)
        const sorted = [...allStreams].sort((a, b) => {
          const ta = parseInt(a.added || '0', 10);
          const tb = parseInt(b.added || '0', 10);
          return tb - ta;
        });

        // 3. Seleccionar los mejores para enriquecer:
        //    - Top 20 más recientes (para ESTRENO/NUEVO)
        //    - Top 10 con mejor rating (para TENDENCIA)
        const recentPool = sorted.slice(0, 20);

        const ratedPool = [...allStreams]
          .filter(s => s.rating && parseFloat(s.rating) > 6.5)
          .sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'))
          .slice(0, 10);

        // Pool total sin duplicados
        const seenIds = new Set<number>();
        const toEnrich: typeof allStreams = [];
        for (const st of [...recentPool, ...ratedPool]) {
          if (!seenIds.has(st.stream_id)) {
            seenIds.add(st.stream_id);
            toEnrich.push(st);
          }
        }

        setState(s => ({ ...s, loadingText: `Enriqueciendo ${toEnrich.length} películas con metadatos...` }));

        // 4. Enriquecer con TMDb en lotes de 5 para no saturar
        const enriched: HomeFeedItem[] = [];
        const BATCH = 5;

        for (let i = 0; i < toEnrich.length; i += BATCH) {
          if (abortRef.current) return;
          const batch = toEnrich.slice(i, i + BATCH);

          const results = await Promise.allSettled(
            batch.map(async (st) => {
              const streamUrl = XtreamService.buildVodStreamUrl(
                server, user, pass,
                st.stream_id,
                st.container_extension || 'mp4'
              );

              const addedUnix = parseInt(st.added || '0', 10);
              const title = cleanTitle(st.name);

              const movieData = await TmdbService.enrichMovie(title, st.stream_icon, streamUrl);

              // Detectar si la fecha de estreno en TMDb es futura
              const tmdbReleaseDate = (movieData as MovieItem & { _tmdbReleaseDate?: string })._tmdbReleaseDate;
              const tag = calcTag(addedUnix, tmdbReleaseDate);

              const item: HomeFeedItem = {
                ...movieData,
                // Mantener streamUrl de Xtream (no de TMDb)
                streamUrl,
                tag,
                addedTimestamp: addedUnix,
                section: tag === 'PRÓXIMAMENTE'
                  ? 'proximamente'
                  : tag === 'ESTRENO' || tag === 'NUEVO'
                    ? 'recientes'
                    : 'tendencias',
              };
              return item;
            })
          );

          for (const r of results) {
            if (r.status === 'fulfilled') enriched.push(r.value);
          }

          setState(s => ({
            ...s,
            loadingText: `Cargando... ${Math.min(i + BATCH, toEnrich.length)} / ${toEnrich.length}`,
          }));
        }

        if (abortRef.current) return;

        // 5. Separar en secciones
        const recientes    = enriched.filter(m => m.section === 'recientes');
        const tendencias   = enriched.filter(m => m.section === 'tendencias');
        const proximamente = enriched.filter(m => m.section === 'proximamente');

        // 6. Featured = mezcla: primeros 3 ESTRENO + 2 TENDENCIA + PRÓXIMAMENTE si hay
        const featured: HomeFeedItem[] = [
          ...recientes.filter(m => m.tag === 'ESTRENO').slice(0, 4),
          ...proximamente.slice(0, 2),
          ...tendencias.slice(0, 3),
          ...recientes.filter(m => m.tag === 'NUEVO').slice(0, 2),
        ]
        // Eliminar duplicados por id
        .filter((m, idx, arr) => arr.findIndex(x => x.id === m.id) === idx)
        .slice(0, 12);

        setState({
          featured,
          recientes,
          tendencias,
          proximamente,
          isLoading: false,
          loadingText: '',
          error: null,
        });

      } catch (err) {
        if (abortRef.current) return;
        console.warn('[HomeFeed] Error cargando catálogo:', err);
        setState(s => ({
          ...s,
          isLoading: false,
          loadingText: '',
          error: 'No se pudo cargar el catálogo. Verifica tu conexión.',
        }));
      }
    };

    load();

    return () => {
      abortRef.current = true;
    };
  }, [activePlaylist]);

  return state;
}
