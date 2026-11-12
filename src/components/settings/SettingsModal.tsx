import React, { useState } from 'react';
import { usePlaylistStore } from '../../store/usePlaylistStore';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  RefreshCw, 
  Server, 
  X,
  AlertCircle
} from 'lucide-react';
import type { PlaylistAccount } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
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

  if (!isOpen) return null;

  const handleOpenAdd = () => {
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
  };

  const handleOpenEdit = (account: PlaylistAccount) => {
    clearError();
    setEditingAccount({ ...account });
    setIsEditing(true);
  };

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
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
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
          {!isEditing ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Listas Almacenadas ({playlists.length}/3)
                </h3>

                {playlists.length < 3 && (
                  <button
                    onClick={handleOpenAdd}
                    className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-bold text-xs transition"
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
                    onClick={handleOpenAdd}
                    className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg transition"
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
                              onClick={() => setActivePlaylist(pl.id)}
                              className="px-3 py-1.5 bg-zinc-700 hover:bg-cyan-600 text-white rounded text-xs font-semibold transition"
                            >
                              Seleccionar
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(pl)}
                            className="p-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletePlaylist(pl.id)}
                            className="p-2 bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white rounded transition"
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

              {/* Botón de Sincronización Manual */}
              {activePlaylist && (
                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <div className="text-xs text-zinc-400">
                    {isLoading ? syncProgress : 'Catálogo guardado localmente en caché.'}
                  </div>
                  <button
                    onClick={() => syncCurrentPlaylist()}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-bold transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Actualizar Catálogo</span>
                  </button>
                </div>
              )}
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
