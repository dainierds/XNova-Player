import React, { useState, useEffect, useMemo } from 'react';
import { 
  Film, 
  Tv,
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Play, 
  X, 
  Check,
  Server
} from 'lucide-react';
import { 
  useAdminFeaturedStore, 
  type FeaturedBadge 
} from '../../store/useAdminFeaturedStore';
import { usePlaylistStore } from '../../store/usePlaylistStore';
import { CatalogCacheService } from '../../services/catalogCacheService';
import { XtreamService } from '../../services/xtream';
import { TmdbService } from '../../services/tmdb';
import { AuthService } from '../../services/authService';
import { StorageService } from '../../services/storage';
import type { PlaylistAccount } from '../../types';

interface AdminShowcaseManagerProps {
  onPlayStream?: (stream: {
    id: string;
    title: string;
    streamUrl: string;
    posterUrl?: string;
    isLive?: boolean;
  }) => void;
}

export const AdminShowcaseManager: React.FC<AdminShowcaseManagerProps> = ({ onPlayStream }) => {
  const { 
    featuredItems, 
    loadFeaturedItems, 
    addFeaturedItem, 
    removeFeaturedItem, 
    updateBadge, 
    reorderItems
  } = useAdminFeaturedStore();

  const { activePlaylist, playlists } = usePlaylistStore();

  // 📡 Listas recopiladas de todo el sistema (clientes y almacenamiento)
  const [availablePlaylists, setAvailablePlaylists] = useState<PlaylistAccount[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');

  // 🎬 / 📺 Pestaña activa: Películas de Portada (hasta 6) o Series de Portada (hasta 6)
  const [activeSectionTab, setActiveSectionTab] = useState<'movies' | 'series'>('movies');

  const movieItems = useMemo(() => featuredItems.filter((i) => i.type === 'movie'), [featuredItems]);
  const seriesItems = useMemo(() => featuredItems.filter((i) => i.type === 'series'), [featuredItems]);
  const currentItems = activeSectionTab === 'movies' ? movieItems : seriesItems;
  const currentCount = currentItems.length;
  const isLimitReached = currentCount >= 6;

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'movies' | 'series'>('all');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Ítem seleccionado en el modal para configurar
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<FeaturedBadge>('ESTRENO');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    loadFeaturedItems();

    const loadAllSystemPlaylists = async () => {
      const listMap = new Map<string, PlaylistAccount>();

      // 1. Del store activo
      if (activePlaylist && activePlaylist.serverUrl) {
        listMap.set(activePlaylist.id, activePlaylist);
      }
      playlists.forEach((p) => {
        if (p.serverUrl) listMap.set(p.id, p);
      });

      // 2. De los usuarios administrados (Dainier, etc.)
      try {
        const allUsers = AuthService.getAllUsers();
        allUsers.forEach((u) => {
          (u.playlists || []).forEach((p) => {
            if (p.serverUrl && p.username) {
              const displayName = `${p.name} (${u.displayName})`;
              listMap.set(p.id, { ...p, name: displayName });
            }
          });
        });
      } catch (e) {
        console.error('Error cargando listas de usuarios:', e);
      }

      // 3. De almacenamiento local persistente
      try {
        const stored = await StorageService.getPlaylists();
        stored.forEach((p) => {
          if (p.serverUrl && !listMap.has(p.id)) {
            listMap.set(p.id, p);
          }
        });
      } catch (e) {
        console.error('Error cargando storage playlists:', e);
      }

      const combined = Array.from(listMap.values());
      setAvailablePlaylists(combined);
      if (combined.length > 0) {
        setSelectedPlaylistId(combined[0].id);
      }
    };

    loadAllSystemPlaylists();
  }, [loadFeaturedItems, activePlaylist, playlists]);

  const effectivePlaylist = useMemo(() => {
    return (
      availablePlaylists.find((p) => p.id === selectedPlaylistId) ||
      activePlaylist ||
      availablePlaylists[0] ||
      playlists[0] ||
      null
    );
  }, [availablePlaylists, selectedPlaylistId, activePlaylist, playlists]);

  // Mostrar mensaje de éxito temporal
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Búsqueda profunda en catálogo IPTV (con fallback en vivo a API) y TMDb
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearching(true);
    setSearchResults([]);

    try {
      const results: any[] = [];
      const lowerQ = q.toLowerCase();

      // 1. Buscar en la lista IPTV seleccionada
      if (effectivePlaylist) {
        const pId = effectivePlaylist.id;
        const server = effectivePlaylist.serverUrl || '';
        const user = effectivePlaylist.username || '';
        const pass = effectivePlaylist.password || '';

        // Buscar Películas IPTV
        if (searchFilter === 'all' || searchFilter === 'movies') {
          let moviesFound: any[] = [];
          const cachedMovies = await CatalogCacheService.get(pId, 'movies', true);
          if (cachedMovies && cachedMovies.length > 0) {
            moviesFound = CatalogCacheService.search(cachedMovies, q).slice(0, 20);
          } else if (server && user && pass) {
            try {
              const remoteVod = await XtreamService.getVodStreams(server, user, pass);
              if (remoteVod && remoteVod.length > 0) {
                const matched = remoteVod.filter((m: any) =>
                  m.name && m.name.toLowerCase().includes(lowerQ)
                ).slice(0, 20);
                moviesFound = matched.map((m: any) => ({
                  id: m.stream_id,
                  name: m.name,
                  icon: m.stream_icon,
                  year: m.year,
                  rating: m.rating,
                  cat: 'Película',
                  ext: m.container_extension || 'mp4',
                }));
              }
            } catch (err) {
              console.warn('Error consultando VOD Xtream directamente:', err);
            }
          }

          moviesFound.forEach((m) => {
            const streamUrl = XtreamService.buildVodStreamUrl(server, user, pass, m.id, m.ext || 'mp4');
            results.push({
              id: `movie_${m.id}`,
              streamId: m.id,
              title: m.name,
              type: 'movie' as const,
              posterUrl: m.icon || '',
              backdropUrl: m.icon || '',
              streamUrl,
              year: m.year || '2026',
              rating: m.rating || '8.0',
              genresText: m.cat || 'Película',
              source: `IPTV (${effectivePlaylist.name.split(' (')[0]})`,
            });
          });
        }

        // Buscar Series IPTV
        if (searchFilter === 'all' || searchFilter === 'series') {
          let seriesFound: any[] = [];
          const cachedSeries = await CatalogCacheService.get(pId, 'series', true);
          if (cachedSeries && cachedSeries.length > 0) {
            seriesFound = CatalogCacheService.search(cachedSeries, q).slice(0, 20);
          } else if (server && user && pass) {
            try {
              const remoteSeries = await XtreamService.getSeries(server, user, pass);
              if (remoteSeries && remoteSeries.length > 0) {
                const matched = remoteSeries.filter((s: any) =>
                  s.name && s.name.toLowerCase().includes(lowerQ)
                ).slice(0, 20);
                seriesFound = matched.map((s: any) => ({
                  id: s.series_id,
                  name: s.name,
                  icon: s.cover,
                  year: s.year,
                  rating: s.rating,
                  cat: 'Serie',
                }));
              }
            } catch (err) {
              console.warn('Error consultando Series Xtream directamente:', err);
            }
          }

          seriesFound.forEach((s) => {
            results.push({
              id: `series_${s.id}`,
              streamId: s.id,
              title: s.name,
              type: 'series' as const,
              posterUrl: s.icon || '',
              backdropUrl: s.icon || '',
              year: s.year || '2026',
              rating: s.rating || '8.5',
              genresText: s.cat || 'Serie TV',
              source: `IPTV (${effectivePlaylist.name.split(' (')[0]})`,
            });
          });
        }
      }

      // 2. Búsqueda en Cartelera Mundial / TMDb (Para títulos cinematográficos, próximos estrenos y tráilers)
      try {
        const tmdbApiKey = '844dba0bfd8f3a4f3799f6130ef9e335';
        if (searchFilter === 'all' || searchFilter === 'movies') {
          const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(q)}&language=es-ES&page=1&include_adult=false`;
          const tmdbRes = await fetch(tmdbUrl);
          if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
            const tmdbList = (tmdbData.results || []).slice(0, 10);
            tmdbList.forEach((t: any) => {
              if (!results.some((r) => r.title.toLowerCase() === (t.title || '').toLowerCase())) {
                const year = t.release_date ? t.release_date.split('-')[0] : '2026';
                const poster = t.poster_path ? `https://image.tmdb.org/t/p/w500${t.poster_path}` : '';
                const backdrop = t.backdrop_path ? `https://image.tmdb.org/t/p/original${t.backdrop_path}` : poster;
                results.push({
                  id: `tmdb_m_${t.id}`,
                  streamId: t.id,
                  title: t.title,
                  type: 'movie' as const,
                  posterUrl: poster,
                  backdropUrl: backdrop,
                  year,
                  rating: t.vote_average ? `${t.vote_average.toFixed(1)} ★` : '8.0 ★',
                  synopsis: t.overview || '',
                  source: 'Cartelera / TMDb',
                });
              }
            });
          }
        }

        if (searchFilter === 'all' || searchFilter === 'series') {
          const tmdbTvUrl = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbApiKey}&query=${encodeURIComponent(q)}&language=es-ES&page=1&include_adult=false`;
          const tmdbTvRes = await fetch(tmdbTvUrl);
          if (tmdbTvRes.ok) {
            const tmdbTvData = await tmdbTvRes.json();
            const tmdbTvList = (tmdbTvData.results || []).slice(0, 10);
            tmdbTvList.forEach((t: any) => {
              if (!results.some((r) => r.title.toLowerCase() === (t.name || '').toLowerCase())) {
                const year = t.first_air_date ? t.first_air_date.split('-')[0] : '2026';
                const poster = t.poster_path ? `https://image.tmdb.org/t/p/w500${t.poster_path}` : '';
                const backdrop = t.backdrop_path ? `https://image.tmdb.org/t/p/original${t.backdrop_path}` : poster;
                results.push({
                  id: `tmdb_s_${t.id}`,
                  streamId: t.id,
                  title: t.name,
                  type: 'series' as const,
                  posterUrl: poster,
                  backdropUrl: backdrop,
                  year,
                  rating: t.vote_average ? `${t.vote_average.toFixed(1)} ★` : '8.0 ★',
                  synopsis: t.overview || '',
                  source: 'Cartelera / TMDb',
                });
              }
            });
          }
        }
      } catch (tmdbErr) {
        console.warn('Error buscando en TMDb:', tmdbErr);
      }

      setSearchResults(results);
    } catch (err) {
      console.error('Error al buscar contenido para portada:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmAdd = async () => {
    if (!selectedItem) return;

    // Determinar tipo según el ítem o la sección activa
    const targetType: 'movie' | 'series' = selectedItem.type || (activeSectionTab === 'movies' ? 'movie' : 'series');
    const existingTargetCount = targetType === 'series' ? seriesItems.length : movieItems.length;

    const isAlreadyAdded = featuredItems.some((f) => f.id === selectedItem.id);
    if (!isAlreadyAdded && existingTargetCount >= 6) {
      showToast(`Ya tienes 6 ${targetType === 'series' ? 'series' : 'películas'} fijadas. Elimina una antes de añadir otra.`);
      return;
    }

    // Si es de TMDb y se marca como PRÓXIMAMENTE, intentar resolver trailer oficial
    let trailerKey = selectedItem.trailerYoutubeKey;
    if (selectedBadge === 'PRÓXIMAMENTE' && !trailerKey && selectedItem.streamId) {
      try {
        const trailer = await TmdbService.getMovieTrailer(Number(selectedItem.streamId));
        if (trailer) trailerKey = trailer;
      } catch {
        // Ignorar
      }
    }

    await addFeaturedItem({
      id: selectedItem.id,
      streamId: selectedItem.streamId,
      title: selectedItem.title,
      type: targetType,
      badge: selectedBadge,
      posterUrl: selectedItem.posterUrl || '',
      backdropUrl: selectedItem.backdropUrl || selectedItem.posterUrl || '',
      streamUrl: selectedItem.streamUrl,
      year: selectedItem.year,
      rating: selectedItem.rating,
      genresText: selectedItem.genresText,
      synopsis: selectedItem.synopsis,
      trailerYoutubeKey: trailerKey,
    });

    showToast(`"${selectedItem.title}" fijada como [${selectedBadge}] en ${targetType === 'series' ? 'Series de Portada' : 'Películas de Portada'}`);
    setShowAddModal(false);
    setSelectedItem(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    if (activeSectionTab === 'movies') {
      const next = [...movieItems];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      reorderItems([...next, ...seriesItems]);
    } else {
      const next = [...seriesItems];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      reorderItems([...movieItems, ...next]);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index === currentItems.length - 1) return;
    if (activeSectionTab === 'movies') {
      const next = [...movieItems];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      reorderItems([...next, ...seriesItems]);
    } else {
      const next = [...seriesItems];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      reorderItems([...movieItems, ...next]);
    }
  };

  const handleOpenAddModal = () => {
    if (isLimitReached) {
      showToast(`Ya has alcanzado el límite de 6 ${activeSectionTab === 'movies' ? 'películas' : 'series'} de portada.`);
      return;
    }
    setSearchFilter(activeSectionTab === 'movies' ? 'movies' : 'series');
    setSelectedItem(null);
    setShowAddModal(true);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 text-white">
      {/* Notificación de éxito */}
      {successToast && (
        <div className="mb-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 animate-fadeIn shrink-0 shadow-lg">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold">{successToast}</span>
        </div>
      )}

      {/* Pestañas de Navegación: Películas vs Series (Hasta 6 cada una) */}
      <div className="flex items-center space-x-3 mb-4 shrink-0 bg-[#0A0E1A]/80 p-1.5 rounded-2xl border border-white/10 w-fit">
        <button
          onClick={() => setActiveSectionTab('movies')}
          className={`flex items-center space-x-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSectionTab === 'movies'
              ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 font-black'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Películas de Portada</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeSectionTab === 'movies' ? 'bg-black/25 text-black' : 'bg-cyan-500/20 text-cyan-300'
          }`}>
            {movieItems.length} / 6
          </span>
        </button>

        <button
          onClick={() => setActiveSectionTab('series')}
          className={`flex items-center space-x-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSectionTab === 'series'
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25 font-black'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>Series de Portada</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeSectionTab === 'series' ? 'bg-black/30 text-white' : 'bg-purple-500/20 text-purple-300'
          }`}>
            {seriesItems.length} / 6
          </span>
        </button>
      </div>

      {/* Barra informativa de estado del límite */}
      {isLimitReached ? (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 shrink-0">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            ✓ Has completado el cupo de 6 {activeSectionTab === 'movies' ? 'películas' : 'series'} de portada. Se mostrarán en primer lugar en la pantalla principal.
          </span>
        </div>
      ) : (
        <div className="mb-4 bg-white/5 border border-white/10 text-zinc-300 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              Tienes <strong className="text-white">{currentCount} de 6</strong> {activeSectionTab === 'movies' ? 'películas' : 'series'} fijadas. Puedes añadir {6 - currentCount} más.
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">Total global fijado: {featuredItems.length}/12</span>
        </div>
      )}

      {/* Barra de Controles y Resumen */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>
              {activeSectionTab === 'movies' ? 'Películas Destacadas en Portada' : 'Series Destacadas en Portada'}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
              activeSectionTab === 'movies'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
            }`}>
              {currentCount} / 6 títulos
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {activeSectionTab === 'movies'
              ? 'Las películas fijadas aquí aparecerán primero en la portada y carrusel de Películas.'
              : 'Las series fijadas aquí aparecerán primero en la portada y carrusel de Series.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {currentItems.length > 0 && (
            <button
              onClick={() => {
                const targetName = activeSectionTab === 'movies' ? 'las películas' : 'las series';
                if (confirm(`¿Restablecer ${targetName} de portada a automático? Se eliminarán de la lista fija.`)) {
                  if (activeSectionTab === 'movies') {
                    reorderItems(seriesItems);
                  } else {
                    reorderItems(movieItems);
                  }
                  showToast(`Portada de ${targetName} restablecida al modo automático.`);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-semibold border border-white/10 transition cursor-pointer"
            >
              Restablecer a Automático
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            disabled={isLimitReached}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-black text-xs shadow-lg transition transform active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              activeSectionTab === 'movies'
                ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/30'
                : 'bg-purple-500 hover:bg-purple-400 text-white shadow-purple-500/30'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>
              AÑADIR {activeSectionTab === 'movies' ? 'PELÍCULA' : 'SERIE'} ({currentCount}/6)
            </span>
          </button>
        </div>
      </div>

      {/* Lista de Contenidos Fijados */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
        {currentItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-white/10 rounded-2xl p-8 bg-black/20">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
              activeSectionTab === 'movies'
                ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                : 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
            }`}>
              {activeSectionTab === 'movies' ? <Film className="w-8 h-8" /> : <Tv className="w-8 h-8" />}
            </div>
            <h3 className="text-base font-bold text-white">
              No has fijado ninguna {activeSectionTab === 'movies' ? 'película' : 'serie'} manualmente
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mt-1 mb-5">
              Actualmente la sección de {activeSectionTab === 'movies' ? 'Películas' : 'Series'} muestra automáticamente las últimas del catálogo Xtream.
            </p>
            <button
              onClick={handleOpenAddModal}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-black text-xs shadow-lg transition cursor-pointer ${
                activeSectionTab === 'movies'
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/25'
                  : 'bg-purple-500 hover:bg-purple-400 text-white shadow-purple-500/25'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Primera {activeSectionTab === 'movies' ? 'Película' : 'Serie'}</span>
            </button>
          </div>
        ) : (
          currentItems.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0E1526] border border-white/10 hover:border-white/20 transition shadow-md"
            >
              {/* Información e Imagen */}
              <div className="flex items-center space-x-4 min-w-0">
                <span className="text-sm font-black text-zinc-500 w-6 text-center">
                  #{idx + 1}
                </span>

                <div className="w-12 h-16 rounded-lg overflow-hidden bg-black/60 border border-white/10 shrink-0 relative">
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <Film className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-white truncate max-w-md">
                      {item.title}
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 text-zinc-300">
                      {item.type === 'series' ? 'Serie' : 'Película'}
                    </span>
                    {item.year && (
                      <span className="text-xs text-zinc-400">({item.year})</span>
                    )}
                  </div>

                  {/* Selector rápido de Marca / Badge */}
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-[11px] text-zinc-400 font-semibold mr-1">Etiqueta:</span>
                    <button
                      onClick={() => updateBadge(item.id, 'ESTRENO')}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase transition cursor-pointer border ${
                        item.badge === 'ESTRENO'
                          ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400/50 shadow-sm shadow-cyan-500/30'
                          : 'bg-white/5 text-zinc-400 border-white/5 hover:text-white'
                      }`}
                    >
                      ★ ESTRENO
                    </button>
                    <button
                      onClick={() => updateBadge(item.id, 'RECIÉN AÑADIDA')}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase transition cursor-pointer border ${
                        item.badge === 'RECIÉN AÑADIDA'
                          ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50 shadow-sm shadow-emerald-500/30'
                          : 'bg-white/5 text-zinc-400 border-white/5 hover:text-white'
                      }`}
                    >
                      ✨ RECIÉN AÑADIDA
                    </button>
                    <button
                      onClick={() => updateBadge(item.id, 'PRÓXIMAMENTE')}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase transition cursor-pointer border ${
                        item.badge === 'PRÓXIMAMENTE'
                          ? 'bg-purple-500/25 text-purple-300 border-purple-400/50 shadow-sm shadow-purple-500/30'
                          : 'bg-white/5 text-zinc-400 border-white/5 hover:text-white'
                      }`}
                    >
                      ⏳ PRÓXIMAMENTE
                    </button>
                  </div>
                </div>
              </div>

              {/* Botones de Acción y Orden */}
              <div className="flex items-center space-x-2 shrink-0">
                {/* Probar reproducción si tiene enlace */}
                {item.streamUrl && onPlayStream && (
                  <button
                    onClick={() => onPlayStream({
                      id: item.id,
                      title: item.title,
                      streamUrl: item.streamUrl!,
                      posterUrl: item.posterUrl,
                      isLive: false,
                    })}
                    className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition cursor-pointer"
                    title="Probar reproducción directa"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                )}

                {/* Subir en orden */}
                <button
                  disabled={idx === 0}
                  onClick={() => handleMoveUp(idx)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-zinc-300 hover:text-white transition cursor-pointer"
                  title="Mover arriba"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>

                {/* Bajar en orden */}
                <button
                  disabled={idx === currentItems.length - 1}
                  onClick={() => handleMoveDown(idx)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-zinc-300 hover:text-white transition cursor-pointer"
                  title="Mover abajo"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>

                {/* Eliminar de portada */}
                <button
                  onClick={() => {
                    if (confirm(`¿Quitar "${item.title}" de la pantalla principal?`)) {
                      removeFeaturedItem(item.id);
                      showToast(`"${item.title}" quitada de la portada.`);
                    }
                  }}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                  title="Quitar de pantalla principal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── MODAL: AÑADIR PELÍCULA O SERIE A PORTADA ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0E1526] border border-white/15 rounded-3xl p-6 text-white shadow-2xl flex flex-col max-h-[90vh]">
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Film className="w-5 h-5 text-cyan-400" />
                  <span>Seleccionar Película o Serie para Portada</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Busca cualquier título de tu lista IPTV o de cartelera para fijarlo en la pantalla principal.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Lista IPTV y Fuente */}
            <div className="mt-4 flex items-center space-x-2.5 bg-white/5 border border-white/10 px-3.5 py-2.5 rounded-2xl text-xs shrink-0">
              <Server className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-zinc-400 font-semibold shrink-0">Lista IPTV de búsqueda:</span>
              <select
                value={effectivePlaylist?.id || ''}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer flex-1 text-xs truncate"
              >
                {availablePlaylists.map((pl) => (
                  <option key={pl.id} value={pl.id} className="bg-[#0E1526] text-white">
                    📡 {pl.name} {pl.serverUrl ? `• ${pl.serverUrl}` : ''}
                  </option>
                ))}
                {availablePlaylists.length === 0 && (
                  <option value="" className="bg-[#0E1526] text-zinc-400">
                    Búsqueda Global en Cartelera / TMDb (Sin listas IPTV registradas)
                  </option>
                )}
              </select>
            </div>

            {/* Buscador */}
            <div className="my-3 space-y-3 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Ej. Avatar, Dragón, Gladiator, Breaking Bad..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-400 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
                  <button
                    onClick={() => setSearchFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      searchFilter === 'all' ? 'bg-cyan-500 text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Todo
                  </button>
                  <button
                    onClick={() => setSearchFilter('movies')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      searchFilter === 'movies' ? 'bg-cyan-500 text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Películas
                  </button>
                  <button
                    onClick={() => setSearchFilter('series')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      searchFilter === 'series' ? 'bg-cyan-500 text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Series
                  </button>
                </div>

                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold text-xs transition cursor-pointer shrink-0"
                >
                  {isSearching ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>

            {/* Resultados de búsqueda */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[180px]">
              {isSearching ? (
                <div className="py-12 text-center text-xs text-cyan-400 font-semibold flex items-center justify-center space-x-2">
                  <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>Buscando en catálogo Xtream y TMDb...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((res) => {
                  const isSelected = selectedItem?.id === res.id;
                  return (
                    <div
                      key={res.id}
                      onClick={() => setSelectedItem(res)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-400 ring-2 ring-cyan-400/40'
                          : 'bg-white/5 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-14 rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10">
                          {res.posterUrl ? (
                            <img src={res.posterUrl} alt={res.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Film className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate max-w-sm">
                            {res.title}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 text-zinc-300">
                              {res.type === 'series' ? 'Serie' : 'Película'}
                            </span>
                            {res.year && <span className="text-[11px] text-zinc-400">{res.year}</span>}
                            <span className="text-[10px] text-cyan-400 font-bold">({res.source})</span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-cyan-400 text-black flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center text-xs text-zinc-500">
                  {searchQuery.trim()
                    ? 'No se encontraron resultados para esa búsqueda. Intenta con otro título.'
                    : 'Ingresa un título arriba y presiona "Buscar" para seleccionar.'}
                </div>
              )}
            </div>

            {/* Configuración de Etiqueta (Badge) para el ítem seleccionado */}
            {selectedItem && (
              <div className="mt-4 pt-4 border-t border-white/10 shrink-0 space-y-3 bg-[#0A0E1A]/60 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Marcar &quot;{selectedItem.title}&quot; como:
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Al tocarlo en pantalla principal, va directo a la raíz
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedBadge('ESTRENO')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                      selectedBadge === 'ESTRENO'
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>★ ESTRENO</span>
                    <span className="text-[9px] font-normal opacity-80">Cartelera / Top</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedBadge('RECIÉN AÑADIDA')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                      selectedBadge === 'RECIÉN AÑADIDA'
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/20'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>✨ RECIÉN AÑADIDA</span>
                    <span className="text-[9px] font-normal opacity-80">Nuevo en servidor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedBadge('PRÓXIMAMENTE')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                      selectedBadge === 'PRÓXIMAMENTE'
                        ? 'bg-purple-500/25 border-purple-400 text-purple-300 shadow-md shadow-purple-500/20'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>⏳ PRÓXIMAMENTE</span>
                    <span className="text-[9px] font-normal opacity-80">Con Tráiler Oficial</span>
                  </button>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmAdd}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs shadow-lg shadow-cyan-500/30 transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Fijar en Pantalla Principal</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
