import React, { useState, useEffect } from 'react';
import { 
  Film, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Play, 
  X, 
  Check
} from 'lucide-react';
import { 
  useAdminFeaturedStore, 
  type FeaturedBadge 
} from '../../store/useAdminFeaturedStore';
import { usePlaylistStore } from '../../store/usePlaylistStore';
import { CatalogCacheService } from '../../services/catalogCacheService';
import { XtreamService } from '../../services/xtream';
import { TmdbService } from '../../services/tmdb';

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
    reorderItems,
    clearAll 
  } = useAdminFeaturedStore();

  const { activePlaylist, playlists } = usePlaylistStore();
  const effectivePlaylist = activePlaylist || playlists[0] || null;

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
  }, [loadFeaturedItems]);

  // Mostrar mensaje de éxito temporal
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Búsqueda en catálogo de la lista o TMDb
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearching(true);
    setSearchResults([]);

    try {
      const results: any[] = [];

      if (effectivePlaylist) {
        const pId = effectivePlaylist.id;
        const server = effectivePlaylist.serverUrl || '';
        const user = effectivePlaylist.username || '';
        const pass = effectivePlaylist.password || '';

        // 1. Buscar en películas cacheadas o servidor
        if (searchFilter === 'all' || searchFilter === 'movies') {
          const cachedMovies = await CatalogCacheService.get(pId, 'movies', true);
          if (cachedMovies && cachedMovies.length > 0) {
            const matched = CatalogCacheService.search(cachedMovies, q).slice(0, 15);
            matched.forEach((m) => {
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
                source: 'IPTV',
              });
            });
          }
        }

        // 2. Buscar en series cacheadas o servidor
        if (searchFilter === 'all' || searchFilter === 'series') {
          const cachedSeries = await CatalogCacheService.get(pId, 'series', true);
          if (cachedSeries && cachedSeries.length > 0) {
            const matched = CatalogCacheService.search(cachedSeries, q).slice(0, 15);
            matched.forEach((s) => {
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
                source: 'IPTV',
              });
            });
          }
        }
      }

      // 3. Si se encontraron pocos resultados o se busca estrenos mundiales, complementar con TMDb
      if (results.length < 5) {
        try {
          const enriched = await TmdbService.enrichMovie(q);
          if (enriched && enriched.title) {
            if (!results.some((r) => r.title.toLowerCase() === enriched.title.toLowerCase())) {
              results.push({
                id: `tmdb_${enriched.id || Date.now()}`,
                streamId: enriched.id,
                title: enriched.title,
                type: 'movie' as const,
                posterUrl: enriched.posterUrl || '',
                backdropUrl: enriched.backdropUrl || '',
                year: enriched.year || '2026',
                rating: enriched.rating || '8.0 ★',
                synopsis: enriched.synopsis || '',
                source: 'TMDb Oficial',
              });
            }
          }
        } catch {
          // Fallback silencioso si no hay red a TMDb
        }
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
      type: selectedItem.type,
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

    showToast(`"${selectedItem.title}" fijada como [${selectedBadge}] en la Pantalla Principal`);
    setShowAddModal(false);
    setSelectedItem(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...featuredItems];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    reorderItems(next);
  };

  const handleMoveDown = (index: number) => {
    if (index === featuredItems.length - 1) return;
    const next = [...featuredItems];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    reorderItems(next);
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

      {/* Barra de Controles y Resumen */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Contenido Destacado en Pantalla Principal</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {featuredItems.length} títulos
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Las películas y series que fijes aquí aparecerán en primer lugar en el carrusel de inicio. Al tocarlas, van directo a la raíz del contenido.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {featuredItems.length > 0 && (
            <button
              onClick={() => {
                if (confirm('¿Restablecer y vaciar la portada fija? La app volverá a mostrar las últimas del servidor automáticamente.')) {
                  clearAll();
                  showToast('Portada restablecida al modo automático del servidor.');
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-semibold border border-white/10 transition cursor-pointer"
            >
              Restablecer a Automático
            </button>
          )}

          <button
            onClick={() => {
              setShowAddModal(true);
              setSelectedItem(null);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs shadow-lg shadow-cyan-500/30 transition transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>AÑADIR A PORTADA</span>
          </button>
        </div>
      </div>

      {/* Lista de Contenidos Fijados */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
        {featuredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-white/10 rounded-2xl p-8 bg-black/20">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <Film className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">No has fijado ningún título manualmente</h3>
            <p className="text-xs text-zinc-400 max-w-md mt-1 mb-5">
              Actualmente la pantalla principal muestra automáticamente las últimas películas y series añadidas a tu lista Xtream.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs shadow-lg shadow-cyan-500/25 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir la Primera Película o Serie</span>
            </button>
          </div>
        ) : (
          featuredItems.map((item, idx) => (
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
                  disabled={idx === featuredItems.length - 1}
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

            {/* Buscador */}
            <div className="my-4 space-y-3 shrink-0">
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
