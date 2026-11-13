import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Key, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  X, 
  Crown, 
  Sparkles,
  Server,
  LogIn
} from 'lucide-react';
import type { UserAccount, UserPlan } from '../../types/auth';
import { PLAN_CONFIGS } from '../../types/auth';
import type { PlaylistAccount } from '../../types';
import { AuthService, isSeedUser } from '../../services/authService';
import { useAuthStore } from '../../store/useAuthStore';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUserToLogin?: (username: string, pass: string) => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  onSelectUserToLogin,
}) => {
  const { isAdmin, setAdminStatus } = useAuthStore();
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserAccount[]>(() => AuthService.getAllUsers());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Estados del formulario de creación / edición
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPlan, setFormPlan] = useState<UserPlan>('basic');
  const [formExpDate, setFormExpDate] = useState('2027-12-31');
  const [formPlaylists, setFormPlaylists] = useState<PlaylistAccount[]>([
    {
      id: 'pl_1',
      name: 'Lista Principal',
      type: 'xtream',
      serverUrl: 'http://line.xnovatv.com:8080',
      username: '',
      password: '',
      isActive: true,
    },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Sincronizar usuarios desde IndexedDB permanente cada vez que se abre el panel
  useEffect(() => {
    if (isOpen) {
      AuthService.syncWithPersistentStorage().then((loaded) => {
        setUsers(loaded);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const refreshUserList = () => {
    setUsers(AuthService.getAllUsers());
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '8888' || adminPin === 'xnova2026') {
      setAdminStatus(true);
      setPinError(null);
    } else {
      setPinError('PIN de Administrador incorrecto (Prueba 8888)');
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormDisplayName('');
    setFormUsername('');
    setFormPassword('');
    setFormPlan('basic');
    setFormExpDate('2027-12-31');
    setFormPlaylists([
      {
        id: `pl_${Date.now()}`,
        name: 'Lista Principal',
        type: 'xtream',
        serverUrl: 'http://line.xnovatv.com:8080',
        username: '',
        password: '',
        isActive: true,
      },
    ]);
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setFormDisplayName(user.displayName);
    setFormUsername(user.username);
    setFormPassword(user.password);
    setFormPlan(user.plan);
    setFormExpDate(user.expDate);
    setFormPlaylists(JSON.parse(JSON.stringify(user.playlists)));
    setFormError(null);
    setShowCreateModal(true);
  };

  const handlePlanChange = (newPlan: UserPlan) => {
    setFormPlan(newPlan);
    const maxAllowed = PLAN_CONFIGS[newPlan].maxPlaylists;
    // Si tiene más listas que el nuevo límite, recortar
    if (formPlaylists.length > maxAllowed) {
      setFormPlaylists(formPlaylists.slice(0, maxAllowed));
    }
  };

  const handleAddPlaylistSlot = () => {
    const maxAllowed = PLAN_CONFIGS[formPlan].maxPlaylists;
    if (formPlaylists.length >= maxAllowed) {
      setFormError(`El plan ${PLAN_CONFIGS[formPlan].name} solo permite hasta ${maxAllowed} lista(s).`);
      return;
    }
    setFormError(null);
    setFormPlaylists((prev) => [
      ...prev,
      {
        id: `pl_${Date.now()}_${prev.length + 1}`,
        name: `Lista ${prev.length + 1}`,
        type: 'xtream',
        serverUrl: 'http://line.xnovatv.com:8080',
        username: '',
        password: '',
        isActive: false,
      },
    ]);
  };

  const handleRemovePlaylistSlot = (index: number) => {
    setFormPlaylists((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdatePlaylistField = (index: number, field: string, val: string) => {
    setFormPlaylists((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formUsername.trim() || !formPassword.trim()) {
      setFormError('Usuario y contraseña son requeridos.');
      return;
    }

    if (formPlaylists.length === 0) {
      setFormError('Debes asignar al menos 1 lista para este cliente.');
      return;
    }

    if (editingUser) {
      const res = await AuthService.updateUser(editingUser.id, {
        displayName: formDisplayName.trim() || formUsername.trim(),
        username: formUsername.trim(),
        password: formPassword.trim(),
        plan: formPlan,
        expDate: formExpDate,
        playlists: formPlaylists,
      });

      if (!res.success) {
        setFormError(res.error || 'Error al actualizar usuario.');
        return;
      }
    } else {
      const res = await AuthService.createUser({
        username: formUsername,
        password: formPassword,
        displayName: formDisplayName,
        plan: formPlan,
        expDate: formExpDate,
        playlists: formPlaylists,
      });

      if (!res.success) {
        setFormError(res.error || 'Error al crear usuario.');
        return;
      }
    }

    refreshUserList();
    setShowCreateModal(false);
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar el usuario "${name}"?`)) {
      await AuthService.deleteUser(id);
      refreshUserList();
    }
  };

  const handleToggleStatus = async (user: UserAccount) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    await AuthService.updateUser(user.id, { status: nextStatus });
    refreshUserList();
  };

  // 1. PANTALLA DE ACCESO DE SEGURIDAD (PIN ADMIN)
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0E1526] border border-white/10 rounded-2xl p-6 text-white shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center mb-3 border border-cyan-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold">Acceso de Administrador</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Ingresa el PIN maestro para gestionar usuarios, contraseñas y listas
            </p>
          </div>

          {pinError && (
            <div className="mb-4 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs px-3 py-2 rounded-xl text-center">
              {pinError}
            </div>
          )}

          <form onSubmit={handleAdminAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                PIN o Clave de Administrador
              </label>
              <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-2.5 rounded-xl">
                <Key className="w-4 h-4 text-cyan-400 shrink-0" />
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="PIN predeterminado: 8888"
                  className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-zinc-500"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-cyan-500/20"
            >
              Desbloquear Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. PANEL PRINCIPAL DE ADMINISTRACIÓN
  return (
    <div className="fixed inset-0 z-50 bg-[#0A0E1A]/95 backdrop-blur-xl flex flex-col p-6 text-white overflow-hidden">
      {/* Barra Superior */}
      <header className="flex items-center justify-between pb-5 border-b border-white/10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Panel de Control de Clientes y Listas</h1>
            <p className="text-xs text-zinc-400">
              Crea usuarios independientes, asigna paquetes (Basic, Gold, Premium) y listas IPTV
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {users.some(isSeedUser) && (
            <button
              onClick={async () => {
                if (confirm('¿Eliminar las cuentas de ejemplo/demo y conservar solo tus usuarios reales?')) {
                  const cleaned = await AuthService.clearSeedUsers();
                  setUsers(cleaned);
                }
              }}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-xs border border-rose-500/30 transition shadow-sm"
              title="Eliminar las cuentas de ejemplo Carlos Gómez, Mariana Silva, etc."
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>LIMPIAR CUENTAS DEMO</span>
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition transform active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>CREAR NUEVO USUARIO</span>
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Resumen de Métricas */}
      <div className="grid grid-cols-4 gap-4 my-5 shrink-0">
        <div className="p-4 rounded-xl bg-[#0E1526] border border-white/5">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total Clientes</span>
          <p className="text-2xl font-black text-white mt-1">{users.length}</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1526] border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">Plan Basic (1 Lista)</span>
            <span className="w-2 h-2 rounded-full bg-sky-400" />
          </div>
          <p className="text-2xl font-black text-sky-400 mt-1">
            {users.filter((u) => u.plan === 'basic').length}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1526] border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Plan Gold (2 Listas)</span>
            <Crown className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1">
            {users.filter((u) => u.plan === 'gold').length}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1526] border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">Plan Premium (3 Listas)</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400 mt-1">
            {users.filter((u) => u.plan === 'premium').length}
          </p>
        </div>
      </div>

      {/* Lista de Usuarios */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {users.map((user) => {
          const planConfig = PLAN_CONFIGS[user.plan];
          return (
            <div
              key={user.id}
              className="p-4 rounded-2xl bg-[#0E1526] border border-white/5 hover:border-white/15 transition flex items-center justify-between"
            >
              {/* Información de Usuario */}
              <div className="flex items-center space-x-4">
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: `${planConfig.color}20`, color: planConfig.color }}
                >
                  {user.displayName.charAt(0).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-white">{user.displayName}</h3>
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
                      style={{ 
                        borderColor: `${planConfig.color}40`, 
                        color: planConfig.color, 
                        backgroundColor: `${planConfig.color}15` 
                      }}
                    >
                      {planConfig.badge}
                    </span>
                    <span 
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.status === 'active' 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {user.status === 'active' ? 'ACTIVO' : 'SUSPENDIDO'}
                    </span>

                    {isSeedUser(user) ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        EJEMPLO DEMO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                        ✓ GUARDADO EN DISCO
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 mt-1 text-xs text-zinc-400">
                    <span>Usuario: <strong className="text-zinc-200">{user.username}</strong></span>
                    <span>Clave: <strong className="text-zinc-200">{user.password}</strong></span>
                    <span>Vence: <strong className="text-zinc-200">{user.expDate}</strong></span>
                    <span>
                      Listas asignadas: <strong className="text-cyan-400">{user.playlists.length} / {planConfig.maxPlaylists}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center space-x-2">
                {/* Probar inicio de sesión */}
                {onSelectUserToLogin && (
                  <button
                    onClick={() => {
                      onSelectUserToLogin(user.username, user.password);
                      onClose();
                    }}
                    title="Iniciar sesión en la app como este usuario"
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/30 transition"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Probar App</span>
                  </button>
                )}

                {/* Alternar estado */}
                <button
                  onClick={() => handleToggleStatus(user)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    user.status === 'active'
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {user.status === 'active' ? 'Suspender' : 'Reactivar'}
                </button>

                {/* Editar */}
                <button
                  onClick={() => handleOpenEdit(user)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition"
                  title="Editar credenciales y listas"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {/* Eliminar */}
                <button
                  onClick={() => handleDeleteUser(user.id, user.displayName)}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                  title="Eliminar usuario"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. MODAL DE CREACIÓN / EDICIÓN DE USUARIO */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0E1526] border border-white/10 rounded-2xl p-6 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h2 className="text-base font-bold flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <span>{editingUser ? 'Editar Usuario y Listas' : 'Crear Nuevo Cliente'}</span>
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs px-3 py-2 rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              {/* Nombre y Usuario */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nombre del Cliente
                  </label>
                  <input
                    type="text"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="Ej. Roberto Sánchez"
                    className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Usuario para la App *
                  </label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Ej. roberto2026"
                    required
                    className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Contraseña y Fecha de Vencimiento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Contraseña del cliente"
                    required
                    className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={formExpDate}
                    onChange={(e) => setFormExpDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Selector de Plan / Paquete */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Paquete Asignado
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['basic', 'gold', 'premium'] as UserPlan[]).map((pKey) => {
                    const cfg = PLAN_CONFIGS[pKey];
                    const isSelected = formPlan === pKey;
                    return (
                      <button
                        key={pKey}
                        type="button"
                        onClick={() => handlePlanChange(pKey)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-400/30'
                            : 'border-white/5 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span 
                            className="text-xs font-bold"
                            style={{ color: cfg.color }}
                          >
                            {cfg.name}
                          </span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <span className="text-[10px] text-zinc-300 font-medium">
                          {cfg.maxPlaylists} Lista(s) permitida(s)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sección de Asignación de Listas */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Server className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Listas IPTV Asignadas ({formPlaylists.length} / {PLAN_CONFIGS[formPlan].maxPlaylists})</span>
                  </span>

                  {formPlaylists.length < PLAN_CONFIGS[formPlan].maxPlaylists && (
                    <button
                      type="button"
                      onClick={handleAddPlaylistSlot}
                      className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20"
                    >
                      + Agregar otra lista
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {formPlaylists.map((pl, idx) => (
                    <div 
                      key={pl.id} 
                      className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-300">
                          Lista #{idx + 1}
                        </span>
                        {formPlaylists.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePlaylistSlot(idx)}
                            className="text-rose-400 hover:text-rose-300 text-[10px]"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={pl.name}
                          onChange={(e) => handleUpdatePlaylistField(idx, 'name', e.target.value)}
                          placeholder="Nombre (ej. Canales en Vivo)"
                          className="bg-black/30 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs text-white"
                        />
                        <select
                          value={pl.type}
                          onChange={(e) => handleUpdatePlaylistField(idx, 'type', e.target.value)}
                          className="bg-[#0E1526] border border-white/10 px-2.5 py-1.5 rounded-lg text-xs text-white"
                        >
                          <option value="xtream">Xtream Codes API</option>
                          <option value="m3u">Enlace M3U / M3U8</option>
                        </select>
                      </div>

                      {pl.type === 'xtream' ? (
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={pl.serverUrl || ''}
                            onChange={(e) => handleUpdatePlaylistField(idx, 'serverUrl', e.target.value)}
                            placeholder="Servidor (http://servidor:puerto)"
                            className="bg-black/30 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs text-white"
                          />
                          <input
                            type="text"
                            value={pl.username || ''}
                            onChange={(e) => handleUpdatePlaylistField(idx, 'username', e.target.value)}
                            placeholder="Usuario Xtream"
                            className="bg-black/30 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs text-white"
                          />
                          <input
                            type="text"
                            value={pl.password || ''}
                            onChange={(e) => handleUpdatePlaylistField(idx, 'password', e.target.value)}
                            placeholder="Contraseña Xtream"
                            className="bg-black/30 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs text-white"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={pl.m3uUrl || ''}
                          onChange={(e) => handleUpdatePlaylistField(idx, 'm3uUrl', e.target.value)}
                          placeholder="URL de la lista M3U (https://...)"
                          className="w-full bg-black/30 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs text-white"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Botón Guardar */}
              <div className="pt-3 border-t border-white/10 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20"
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
