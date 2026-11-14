import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePlaylistStore } from '../../store/usePlaylistStore';
import { useAuthStore } from '../../store/useAuthStore';
import { StorageService } from '../../services/storage';
import { BRANDING } from '../../config/branding';
import { PLAN_CONFIGS } from '../../types/auth';
import { CatalogCacheService } from '../../services/catalogCacheService';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  RefreshCw, 
  Server, 
  X,
  AlertCircle,
  LogOut,
  ShieldCheck,
  Database
} from 'lucide-react';
import type { PlaylistAccount } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme?: 'cinematic' | 'serivia';
  onThemeChange?: (theme: 'cinematic' | 'serivia') => void;
  onOpenAdminPanel?: () => void;
}

interface FocusItem {
  id: string;
  onSelect: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose,
  currentTheme = 'serivia',
  onThemeChange,
  onOpenAdminPanel,
}) => {
  const { currentUser, isAdmin, logout } = useAuthStore();
  const {
    playlists,
    activePlaylist,
    isLoading,
    syncProgress,
    errorMessage,
    clearError,
    addPlaylist,
    updatePlaylist,
    deletePlaylist,
    setActivePlaylist,
    syncCurrentPlaylist,
  } = usePlaylistStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<PlaylistAccount>>({
    name: '',
    type: 'xtream',
    serverUrl: '',
    username: '',
    password: '',
    m3uUrl: '',
  });

  const [showSplash, setShowSplash] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<'cinematic' | 'serivia'>(currentTheme);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  const [cacheStats, setCacheStats] = useState<{ movies: number; series: number; live: number; lastUpdated: number | null }>({
    movies: 0,
    series: 0,
    live: 0,
    lastUpdated: null,
  });
  const [isClearingCache, setIsClearingCache] = useState(false);

  useEffect(() => {
    if (isOpen && activePlaylist?.id) {
      CatalogCacheService.getStats(activePlaylist.id).then((st) => setCacheStats(st));
    }
  }, [isOpen, activePlaylist?.id]);

  const handleClearCache = async () => {
    if (!activePlaylist?.id) return;
    setIsClearingCache(true);
    await CatalogCacheService.clear(activePlaylist.id);
    setCacheStats({ movies: 0, series: 0, live: 0, lastUpdated: null });
    setIsClearingCache(false);
  };

  useEffect(() => {
    StorageService.getShowSplashAnimation().then((val) => setShowSplash(val));
    StorageService.getActiveTheme().then((t) => setSelectedTheme(t));
  }, []);

  const handleSelectTheme = useCallback(async (theme: 'cinematic' | 'serivia') => {
    setSelectedTheme(theme);
    await StorageService.setActiveTheme(theme);
    if (onThemeChange) {
      onThemeChange(theme);
    }
  }, [onThemeChange]);

  const handleToggleSplash = useCallback(async () => {
    setShowSplash((prev) => {
      const nextVal = !prev;
      StorageService.setShowSplashAnimation(nextVal);
      return nextVal;
    });
  }, []);

  const handleOpenAdd = useCallback(() => {
    clearError();
    setEditingAccount({
      name: `Lista ${playlists.length + 1}`,
      type: 'xtream',
      serverUrl: '',
      username: '',
      password: '',
      m3uUrl: '',
    });
    setIsEditing(true);
  }, [clearError, playlists.length]);

  const handleOpenEdit = useCallback((account: PlaylistAccount) => {
    clearError();
    setEditingAccount({ ...account });
    setIsEditing(true);
  }, [clearError]);

  // Lista dinámica de elementos enfocables con el control remoto
  const focusItems = useMemo<FocusItem[]>(() => {
    if (isEditing) return [];
    const items: FocusItem[] = [];

    // 1. Botón cerrar
    items.push({ id: 'close', onSelect: onClose });

    // 2. Si es Admin: Botón panel admin (Estrictamente restringido a Administrador)
    if (isAdmin && onOpenAdminPanel) {
      items.push({
        id: 'admin_panel',
        onSelect: () => {
          onClose();
          onOpenAdminPanel();
        },
      });
    }

    // 3. Si es Cliente: Botón cerrar sesión
    if (currentUser && !isAdmin) {
      items.push({
        id: 'logout',
        onSelect: () => {
          logout();
          onClose();
        },
      });
    }

    // 4. Si es Admin: Botón Añadir Lista
    if (isAdmin && playlists.length < 3) {
      items.push({ id: 'add_playlist', onSelect: handleOpenAdd });
    }

    // 5. Botones de Playlists
    if (currentUser && !isAdmin) {
      playlists.forEach((pl) => {
        if (activePlaylist?.id !== pl.id) {
          items.push({ id: `activate_${pl.id}`, onSelect: () => setActivePlaylist(pl.id) });
        }
      });
    } else if (isAdmin) {
      playlists.forEach((pl) => {
        if (activePlaylist?.id !== pl.id) {
          items.push({ id: `activate_${pl.id}`, onSelect: () => setActivePlaylist(pl.id) });
        }
        items.push({ id: `edit_${pl.id}`, onSelect: () => handleOpenEdit(pl) });
        items.push({ id: `delete_${pl.id}`, onSelect: () => deletePlaylist(pl.id) });
      });
    }

    // 6. Botón Sincronizar catálogo
    if (activePlaylist) {
      items.push({ id: 'sync', onSelect: () => syncCurrentPlaylist() });
    }

    // 7. Temas
    items.push({ id: 'theme_serivia', onSelect: () => handleSelectTheme('serivia') });
    items.push({ id: 'theme_cinematic', onSelect: () => handleSelectTheme('cinematic') });

    // 8. Switch Splash
    items.push({ id: 'toggle_splash', onSelect: handleToggleSplash });

    return items;
  }, [
    isEditing,
    isAdmin,
    onOpenAdminPanel,
    currentUser,
    playlists,
    activePlaylist,
    onClose,
    logout,
    handleOpenAdd,
    setActivePlaylist,
    handleOpenEdit,
    deletePlaylist,
    syncCurrentPlaylist,
    handleSelectTheme,
    handleToggleSplash,
  ]);

  // Auto-scroll del elemento enfocado
  useEffect(() => {
    if (!isOpen || isEditing) return;
    const cur = focusItems[focusedIndex];
    if (cur && itemRefs.current[cur.id]) {
      itemRefs.current[cur.id]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusedIndex, isOpen, isEditing, focusItems]);

  // 🎮 Motor Oficial de Navegación D-Pad para Ajustes en Android TV
  useEffect(() => {
    // Si la app está en modo Administrador, desactivar control por mando (solo cursor de PC)
    if (!isOpen || isAdmin) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) {
        if (['Escape', 'GoBack'].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          setIsEditing(false);
        }
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }

      switch (e.key) {
        case 'ArrowDown':
          setFocusedIndex((prev) => Math.min(focusItems.length - 1, prev + 1));
          break;

        case 'ArrowUp':
          setFocusedIndex((prev) => Math.max(0, prev - 1));
          break;

        case 'ArrowLeft':
          if (focusItems[focusedIndex]?.id === 'theme_cinematic') {
            const seriviaIdx = focusItems.findIndex((it) => it.id === 'theme_serivia');
            if (seriviaIdx !== -1) setFocusedIndex(seriviaIdx);
          } else {
            setFocusedIndex((prev) => Math.max(0, prev - 1));
          }
          break;

        case 'ArrowRight':
          if (focusItems[focusedIndex]?.id === 'theme_serivia') {
            const cinematicIdx = focusItems.findIndex((it) => it.id === 'theme_cinematic');
            if (cinematicIdx !== -1) setFocusedIndex(cinematicIdx);
          } else {
            setFocusedIndex((prev) => Math.min(focusItems.length - 1, prev + 1));
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          e.stopPropagation();
          if (focusItems[focusedIndex]) {
            focusItems[focusedIndex].onSelect();
          }
          break;

        case 'Escape':
        case 'Backspace':
        case 'GoBack':
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isEditing, focusItems, focusedIndex, onClose]);

  const isItemFocused = (id: string) => focusItems[focusedIndex]?.id === id;
  const getFocusClass = (id: string) =>
    isItemFocused(id)
      ? 'ring-4 ring-cyan-400 bg-cyan-950/90 scale-[1.03] shadow-xl shadow-cyan-500/50 z-20'
      : '';

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAccount.id) {
      const ok = await updatePlaylist(editingAccount as PlaylistAccount);
      if (ok) setIsEditing(false);
    } else {
      const ok = await addPlaylist(
        editingAccount as Omit<PlaylistAccount, 'id' | 'isActive'>
      );
      if (ok) setIsEditing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-8 animate-fadeIn">
      <div className="bg-[#0f1319] border border-zinc-700/80 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Cabecera de Ajustes */}
        <div className="px-8 py-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Server className="w-7 h-7 text-cyan-400" />
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Ajustes & Gestión de Listas IPTV
              </h2>
              <p className="text-xs text-zinc-400">
                Configura hasta 3 proveedores de contenido (Xtream Codes o listas M3U)
              </p>
            </div>
          </div>

          <button
            ref={(el) => { itemRefs.current['close'] = el; }}
            onClick={onClose}
            className={`p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition ${getFocusClass('close')}`}
            title="Cerrar (o pulsa Atrás)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensaje de error si ocurre */}
        {errorMessage && (
          <div className="mx-8 mt-4 p-3 bg-red-950/60 border border-red-500/50 rounded-lg flex items-center space-x-3 text-red-200 text-xs">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button onClick={clearError} className="underline text-zinc-400 hover:text-white">
              Cerrar
            </button>
          </div>
        )}

        {/* Contenido principal: Lista de cuentas o Formulario de edición */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* 1. Acceso a Panel de Administración (ESTRICTAMENTE SOLO SI ES ADMINISTRADOR, NUNCA PARA CLIENTES) */}
          {isAdmin && onOpenAdminPanel && (
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-6 h-6 text-purple-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Modo Administrador Activo
                  </h4>
                  <p className="text-[11px] text-zinc-300">
                    Crea nuevos clientes, edita contraseñas, asigna paquetes y personaliza la pantalla principal
                  </p>
                </div>
              </div>
              <button
                ref={(el) => { itemRefs.current['admin_panel'] = el; }}
                onClick={() => {
                  onClose();
                  onOpenAdminPanel();
                }}
                className={`px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-md transition shrink-0 ${getFocusClass('admin_panel')}`}
              >
                Abrir Panel de Control
              </button>
            </div>
          )}

          {/* 2. Tarjeta de Suscripción del Cliente (Si está logueado como cliente) */}
          {currentUser && !isAdmin && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/20 to-purple-950/30 border border-cyan-500/30 mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base"
                  style={{ backgroundColor: `${PLAN_CONFIGS[currentUser.plan].color}25`, color: PLAN_CONFIGS[currentUser.plan].color }}
                >
                  {currentUser.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-white text-base">{currentUser.displayName}</h3>
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
                      style={{ 
                        borderColor: `${PLAN_CONFIGS[currentUser.plan].color}50`, 
                        color: PLAN_CONFIGS[currentUser.plan].color, 
                        backgroundColor: `${PLAN_CONFIGS[currentUser.plan].color}15` 
                      }}
                    >
                      PLAN {PLAN_CONFIGS[currentUser.plan].badge}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Vence: <strong className="text-white">{currentUser.expDate}</strong> • {PLAN_CONFIGS[currentUser.plan].description}
                  </p>
                </div>
              </div>

              <button
                ref={(el) => { itemRefs.current['logout'] = el; }}
                onClick={() => {
                  logout();
                  onClose();
                }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition ${getFocusClass('logout')}`}
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}

          {!isEditing ? (
            <div className="space-y-6">
              {/* Para Clientes: Modo protegido donde NO pueden ver URLs ni editar listas */}
              {currentUser && !isAdmin ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Tus Listas Activas ({playlists.length} / {PLAN_CONFIGS[currentUser.plan].maxPlaylists})
                    </h3>
                    <span className="text-[11px] text-zinc-400 italic">
                      Configuradas de forma segura por tu proveedor
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {playlists.map((pl) => {
                      const isActive = activePlaylist?.id === pl.id;

                      return (
                        <div
                          key={pl.id}
                          className={`p-4 rounded-xl border flex items-center justify-between ${
                            isActive
                              ? 'bg-cyan-950/30 border-cyan-500/70 shadow-md shadow-cyan-950/40'
                              : 'bg-zinc-800/40 border-zinc-700/60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center space-x-2.5">
                              <span className="text-sm font-bold text-white">{pl.name}</span>
                              {isActive && (
                                <span className="flex items-center space-x-1 text-[10px] text-cyan-400 font-bold bg-cyan-900/40 px-2 py-0.5 rounded-full border border-cyan-400/40">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>En Reproducción</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              Canales en vivo, películas y series sincronizadas
                            </p>
                          </div>

                          {/* Si el plan permite más de 1 lista (Gold o Premium), puede alternar entre ellas */}
                          {!isActive && (
                            <button
                              ref={(el) => { itemRefs.current[`activate_${pl.id}`] = el; }}
                              onClick={() => setActivePlaylist(pl.id)}
                              className={`px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg text-xs transition ${getFocusClass(`activate_${pl.id}`)}`}
                            >
                              Activar Esta Lista
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Para Admin: Gestión completa de listas */
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                      Listas Almacenadas ({playlists.length}/3)
                    </h3>

                    {playlists.length < 3 && (
                      <button
                        ref={(el) => { itemRefs.current['add_playlist'] = el; }}
                        onClick={handleOpenAdd}
                        className={`flex items-center space-x-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-bold text-xs transition ${getFocusClass('add_playlist')}`}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Añadir Nueva Lista</span>
                      </button>
                    )}
                  </div>

                  {playlists.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-zinc-800 rounded-xl">
                      <p className="text-zinc-400 text-sm mb-4">
                        No tienes ninguna lista configurada. Añade tus credenciales Xtream Codes o enlace M3U.
                      </p>
                      <button
                        ref={(el) => { itemRefs.current['add_playlist'] = el; }}
                        onClick={handleOpenAdd}
                        className={`px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg transition ${getFocusClass('add_playlist')}`}
                      >
                        Configurar Primera Lista
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {playlists.map((pl) => {
                        const isActive = activePlaylist?.id === pl.id;

                        return (
                          <div
                            key={pl.id}
                            className={`p-5 rounded-xl border transition-all flex items-center justify-between ${
                              isActive
                                ? 'bg-cyan-950/30 border-cyan-500/80 shadow-lg shadow-cyan-950/50'
                                : 'bg-zinc-800/40 border-zinc-700/60 hover:border-zinc-500'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center space-x-3">
                                <span className="text-base font-bold text-white">{pl.name}</span>
                                <span className="text-xs uppercase px-2 py-0.5 rounded bg-zinc-700 text-zinc-300 font-mono">
                                  {pl.type}
                                </span>
                                {isActive && (
                                  <span className="flex items-center space-x-1 text-xs text-cyan-400 font-bold bg-cyan-900/40 px-2 py-0.5 rounded-full border border-cyan-400/40">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Activa</span>
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-zinc-400">
                                {pl.type === 'xtream' ? (
                                  <span>
                                    Servidor: {pl.serverUrl} | Usuario: {pl.username} | Vence: {pl.expDate || 'N/A'}
                                  </span>
                                ) : (
                                  <span>URL M3U: {pl.m3uUrl}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              {!isActive && (
                                <button
                                  ref={(el) => { itemRefs.current[`activate_${pl.id}`] = el; }}
                                  onClick={() => setActivePlaylist(pl.id)}
                                  className={`px-3 py-1.5 bg-zinc-700 hover:bg-cyan-600 text-white rounded text-xs font-semibold transition ${getFocusClass(`activate_${pl.id}`)}`}
                                >
                                  Seleccionar
                                </button>
                              )}
                              <button
                                ref={(el) => { itemRefs.current[`edit_${pl.id}`] = el; }}
                                onClick={() => handleOpenEdit(pl)}
                                className={`p-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition ${getFocusClass(`edit_${pl.id}`)}`}
                                title="Editar"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                ref={(el) => { itemRefs.current[`delete_${pl.id}`] = el; }}
                                onClick={() => deletePlaylist(pl.id)}
                                className={`p-2 bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white rounded transition ${getFocusClass(`delete_${pl.id}`)}`}
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Botón de Sincronización Manual */}
              {activePlaylist && (
                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <div className="text-xs text-zinc-400">
                    {isLoading ? syncProgress : 'Catálogo guardado localmente en caché.'}
                  </div>
                  <button
                    ref={(el) => { itemRefs.current['sync'] = el; }}
                    onClick={() => syncCurrentPlaylist()}
                    disabled={isLoading}
                    className={`flex items-center space-x-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-bold transition disabled:opacity-50 ${getFocusClass('sync')}`}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Actualizar Catálogo</span>
                  </button>
                </div>
              )}

              {/* Opciones de Inicio y Tema de la Aplicación */}
              <div className="pt-6 border-t border-zinc-800/80 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Estilo de Interfaz / Tema
                </h3>

                {/* Selector de Tema Visual */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Tema 1: Serivia Modern */}
                  <div
                    ref={(el) => { itemRefs.current['theme_serivia'] = el; }}
                    onClick={() => handleSelectTheme('serivia')}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      selectedTheme === 'serivia'
                        ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-950/40'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-600'
                    } ${getFocusClass('theme_serivia')}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">Serivia Modern Deck</span>
                      {selectedTheme === 'serivia' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500 text-white">
                          Activo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      Diseño en tarjetas con hero deck 3D, carrusel con asomo y filtros de categorías por género.
                    </p>
                  </div>

                  {/* Tema 2: Cinematic Showcase (John Wick) */}
                  <div
                    ref={(el) => { itemRefs.current['theme_cinematic'] = el; }}
                    onClick={() => handleSelectTheme('cinematic')}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      selectedTheme === 'cinematic'
                        ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-950/40'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-600'
                    } ${getFocusClass('theme_cinematic')}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">Cinematic Showcase</span>
                      {selectedTheme === 'cinematic' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500 text-white">
                          Activo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      Diseño con hero de pantalla completa, miniaturas ampliadas y carrusel continuo (Estilo John Wick).
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-white">Mostrar animación de inicio</span>
                    <p className="text-xs text-zinc-400">
                      Reproduce el video y sonido de presentación oficial al abrir la aplicación
                    </p>
                  </div>
                  <button
                    ref={(el) => { itemRefs.current['toggle_splash'] = el; }}
                    onClick={handleToggleSplash}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showSplash ? 'bg-cyan-500' : 'bg-zinc-700'
                    } ${getFocusClass('toggle_splash')}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showSplash ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Sección de Rendimiento y Caché Ultra-Rápida */}
              <div className="pt-6 border-t border-zinc-800/80">
                <div className="p-5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-sm font-bold text-white">Caché Ultra-Rápida de Búsqueda</h4>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Retiene películas, series y canales de forma compacta (menos de 2 MB) para búsquedas instantáneas (0-10ms) en la TV.
                    </p>
                    <div className="flex items-center space-x-3 pt-1 text-[11px] font-mono text-zinc-400">
                      <span className="text-cyan-400">{cacheStats.movies.toLocaleString()} películas</span>
                      <span>•</span>
                      <span className="text-blue-400">{cacheStats.series.toLocaleString()} series</span>
                      <span>•</span>
                      <span className="text-emerald-400">{cacheStats.live.toLocaleString()} canales</span>
                    </div>
                  </div>

                  <button
                    onClick={handleClearCache}
                    disabled={isClearingCache || (cacheStats.movies === 0 && cacheStats.series === 0 && cacheStats.live === 0)}
                    className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-bold text-zinc-300 hover:text-white border border-zinc-700 transition flex items-center space-x-2 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>{isClearingCache ? 'Limpiando...' : 'Vaciar Caché'}</span>
                  </button>
                </div>
              </div>

              {/* Sección Acerca de XNova Player */}
              <div className="pt-6 border-t border-zinc-800/80">
                <div className="p-5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img
                      src={BRANDING.assets.logo}
                      alt={BRANDING.name}
                      className="h-12 w-auto object-contain"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white">{BRANDING.name}</h4>
                      <p className="text-xs text-zinc-400">{BRANDING.tagline}</p>
                      <span className="inline-block mt-1 text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/10">
                        Android TV & Fire TV
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Formulario para Añadir o Editar Lista */
            <form onSubmit={handleSave} className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-base font-bold text-white mb-4">
                {editingAccount.id ? 'Editar Lista' : 'Añadir Nueva Lista'}
              </h3>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nombre descriptivo
                </label>
                <input
                  type="text"
                  required
                  value={editingAccount.name || ''}
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                  placeholder="Ej. Mi Servidor Principal"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Tipo de conexión
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setEditingAccount({ ...editingAccount, type: 'xtream' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs border ${
                      editingAccount.type === 'xtream'
                        ? 'bg-cyan-600 border-cyan-400 text-white'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    Xtream Codes API
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAccount({ ...editingAccount, type: 'm3u' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs border ${
                      editingAccount.type === 'm3u'
                        ? 'bg-cyan-600 border-cyan-400 text-white'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    Enlace URL M3U
                  </button>
                </div>
              </div>

              {editingAccount.type === 'xtream' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      URL del Servidor (con puerto)
                    </label>
                    <input
                      type="text"
                      required
                      value={editingAccount.serverUrl || ''}
                      onChange={(e) =>
                        setEditingAccount({ ...editingAccount, serverUrl: e.target.value })
                      }
                      placeholder="http://servidor-iptv.com:8080"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Nombre de Usuario
                    </label>
                    <input
                      type="text"
                      required
                      value={editingAccount.username || ''}
                      onChange={(e) =>
                        setEditingAccount({ ...editingAccount, username: e.target.value })
                      }
                      placeholder="usuario123"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      value={editingAccount.password || ''}
                      onChange={(e) =>
                        setEditingAccount({ ...editingAccount, password: e.target.value })
                      }
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:border-cyan-400"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    URL de la lista M3U / M3U8
                  </label>
                  <input
                    type="url"
                    required
                    value={editingAccount.m3uUrl || ''}
                    onChange={(e) =>
                      setEditingAccount({ ...editingAccount, m3uUrl: e.target.value })
                    }
                    placeholder="https://ejemplo.com/lista.m3u"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:border-cyan-400"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  {isLoading ? 'Conectando...' : 'Guardar y Validar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
