import type { UserAccount, UserPlan } from '../types/auth';
import type { PlaylistAccount } from '../types';
import { PLAN_CONFIGS } from '../types/auth';
import { StorageService } from './storage';
import { CloudService } from './cloudService';

const STORAGE_USERS_KEY = 'xnova_managed_users_v2';
const STORAGE_SESSION_KEY = 'xnova_active_session_v2';
const STORAGE_INIT_KEY = 'xnova_users_initialized_v2';

// Cuentas de demostración iniciales solo para primera visualización opcional
export const SEED_USERS: UserAccount[] = [
  {
    id: 'user_basic_01',
    username: 'cliente_basic',
    password: '123',
    displayName: 'Carlos Gómez (Demo)',
    plan: 'basic',
    status: 'active',
    expDate: '2026-12-31',
    createdAt: new Date().toISOString(),
    playlists: [
      {
        id: 'pl_basic_1',
        name: 'Lista Principal HD',
        type: 'xtream',
        serverUrl: 'http://line.xnovatv.com:8080',
        username: 'basic_user_1',
        password: 'secure_password_1',
        isActive: true,
      },
    ],
  },
  {
    id: 'user_gold_02',
    username: 'cliente_gold',
    password: '123',
    displayName: 'Mariana Silva (Demo)',
    plan: 'gold',
    status: 'active',
    expDate: '2027-06-30',
    createdAt: new Date().toISOString(),
    playlists: [
      {
        id: 'pl_gold_1',
        name: 'Canales Latinos FHD',
        type: 'xtream',
        serverUrl: 'http://line.xnovatv.com:8080',
        username: 'gold_latin_1',
        password: 'secure_password_2',
        isActive: true,
      },
    ],
  },
  {
    id: 'user_premium_03',
    username: 'cliente_premium',
    password: '123',
    displayName: 'Alejandro Morales (Demo)',
    plan: 'premium',
    status: 'active',
    expDate: '2027-12-31',
    createdAt: new Date().toISOString(),
    playlists: [
      {
        id: 'pl_prem_1',
        name: 'VIP Deportes 4K',
        type: 'xtream',
        serverUrl: 'http://vip.xnovatv.com:8080',
        username: 'prem_sports_1',
        password: 'secure_password_3',
        isActive: true,
      },
    ],
  },
];

export const isSeedUser = (user: UserAccount): boolean => {
  return ['user_basic_01', 'user_gold_02', 'user_premium_03'].includes(user.id);
};

export const AuthService = {
  // Inicialización básica síncrona
  init(): void {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    const hasInit = localStorage.getItem(STORAGE_INIT_KEY);

    if (!raw && !hasInit) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(SEED_USERS));
    }
  },

  // Sincronización robusta con la Nube de Vercel e IndexedDB local
  async syncWithPersistentStorage(): Promise<UserAccount[]> {
    try {
      // 1. Intentar sincronizar primero con el Servidor en la Nube (Vercel)
      const cloudRes = await CloudService.getAllUsers();
      if (cloudRes.success && Array.isArray(cloudRes.users) && cloudRes.users.length > 0) {
        this.saveAllUsers(cloudRes.users);
        return cloudRes.users;
      }

      // 2. Si no hay conexión con la nube, consultar IndexedDB local en disco
      const persistentUsers = await StorageService.getManagedUsers();
      if (persistentUsers && Array.isArray(persistentUsers)) {
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(persistentUsers));
        localStorage.setItem(STORAGE_INIT_KEY, 'true');
        return persistentUsers;
      }

      // 3. Fallback a localStorage
      const localUsers = this.getAllUsers();
      if (localUsers.length > 0) {
        await StorageService.saveManagedUsers(localUsers);
        return localUsers;
      }

      return [];
    } catch (e) {
      console.error('Error sincronizando usuarios:', e);
      return this.getAllUsers();
    }
  },

  // Obtener todos los usuarios registrados (Para el panel de administración)
  getAllUsers(): UserAccount[] {
    try {
      const raw = localStorage.getItem(STORAGE_USERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
      
      const hasInit = localStorage.getItem(STORAGE_INIT_KEY);
      if (hasInit) {
        return [];
      }
      return SEED_USERS;
    } catch {
      return [];
    }
  },

  // Guardar la lista completa de usuarios (en localStorage e IndexedDB)
  saveAllUsers(users: UserAccount[]): void {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
      localStorage.setItem(STORAGE_INIT_KEY, 'true');
      
      // Guardado permanente en IndexedDB local
      StorageService.saveManagedUsers(users).catch((err) => {
        console.error('Error guardando usuarios en IndexedDB:', err);
      });
    } catch (e) {
      console.error('Error guardando usuarios en localStorage:', e);
    }
  },

  // Eliminar cuentas de prueba/ejemplo con 1 solo clic
  async clearSeedUsers(): Promise<UserAccount[]> {
    const users = this.getAllUsers();
    const cleanUsers = users.filter((u) => !isSeedUser(u));
    this.saveAllUsers(cleanUsers);

    // Intentar borrar en la nube también
    for (const seed of SEED_USERS) {
      await CloudService.deleteUser(seed.id).catch(() => {});
    }

    return cleanUsers;
  },

  // Crear un nuevo usuario (En la Nube de Vercel y sincronizado localmente)
  async createUser(data: {
    username: string;
    password: string;
    displayName: string;
    plan: UserPlan;
    expDate: string;
    playlists: PlaylistAccount[];
    notes?: string;
  }): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    // 1. Intentar crear en la Nube de Vercel
    const cloudRes = await CloudService.createUser(data);
    if (cloudRes.success && cloudRes.user) {
      let users = this.getAllUsers();
      const onlyHasSeeds = users.length > 0 && users.every((u) => isSeedUser(u));
      if (onlyHasSeeds) users = [];
      users.push(cloudRes.user);
      this.saveAllUsers(users);
      return cloudRes;
    }

    // 2. Si la nube aún no tiene KV conectado o está offline, crear localmente
    return this.createUserLocal(data);
  },

  createUserLocal(data: {
    username: string;
    password: string;
    displayName: string;
    plan: UserPlan;
    expDate: string;
    playlists: PlaylistAccount[];
    notes?: string;
  }): { success: boolean; user?: UserAccount; error?: string } {
    let users = this.getAllUsers();
    
    // Verificar si el username ya existe
    const exists = users.some(
      (u) => u.username.toLowerCase() === data.username.toLowerCase().trim()
    );
    if (exists) {
      return { success: false, error: 'El nombre de usuario ya está registrado.' };
    }

    const maxAllowed = PLAN_CONFIGS[data.plan].maxPlaylists;
    if (data.playlists.length > maxAllowed) {
      return {
        success: false,
        error: `El plan ${PLAN_CONFIGS[data.plan].name} solo permite hasta ${maxAllowed} lista(s) activa(s).`,
      };
    }

    const onlyHasSeeds = users.length > 0 && users.every((u) => isSeedUser(u));
    if (onlyHasSeeds) {
      users = [];
    }

    const playlists = data.playlists.map((pl, idx) => ({
      ...pl,
      isActive: idx === 0,
    }));

    const newUser: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      username: data.username.trim(),
      password: data.password.trim(),
      displayName: data.displayName.trim() || data.username.trim(),
      plan: data.plan,
      status: 'active',
      expDate: data.expDate || '2027-12-31',
      playlists,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveAllUsers(users);
    return { success: true, user: newUser };
  },

  // Actualizar un usuario existente
  async updateUser(
    id: string,
    updates: Partial<Omit<UserAccount, 'id' | 'createdAt'>>
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    // 1. Actualizar en la nube
    await CloudService.updateUser(id, updates).catch(() => {});

    // 2. Actualizar local
    const users = this.getAllUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    const current = users[index];
    const targetPlan = updates.plan || current.plan;
    const maxAllowed = PLAN_CONFIGS[targetPlan].maxPlaylists;

    if (updates.playlists && updates.playlists.length > maxAllowed) {
      return {
        success: false,
        error: `El plan ${PLAN_CONFIGS[targetPlan].name} solo permite hasta ${maxAllowed} lista(s).`,
      };
    }

    const updatedUser: UserAccount = {
      ...current,
      ...updates,
    };

    users[index] = updatedUser;
    this.saveAllUsers(users);

    const active = this.getActiveSession();
    if (active && active.id === id) {
      this.saveActiveSession(updatedUser);
    }

    return { success: true, user: updatedUser };
  },

  // Eliminar usuario
  async deleteUser(id: string): Promise<boolean> {
    await CloudService.deleteUser(id).catch(() => {});

    const users = this.getAllUsers().filter((u) => u.id !== id);
    this.saveAllUsers(users);

    const active = this.getActiveSession();
    if (active && active.id === id) {
      this.clearActiveSession();
    }
    return true;
  },

  // Autenticar credenciales en la app (Intentando Nube primero, luego Fallback Local)
  async login(
    username: string,
    password: string
  ): Promise<{
    success: boolean;
    user?: UserAccount;
    isAdmin?: boolean;
    error?: string;
  }> {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Intento de inicio de sesión en la Nube de Vercel
    try {
      const cloudRes = await CloudService.login(cleanUser, cleanPass);
      if (cloudRes.success && cloudRes.user) {
        if (!cloudRes.isAdmin) {
          this.saveActiveSession(cloudRes.user);
          // Asegurar que el usuario esté sincronizado en disco local para cuando esté offline
          const current = this.getAllUsers();
          if (!current.some((u) => u.id === cloudRes.user!.id)) {
            current.push(cloudRes.user);
            this.saveAllUsers(current);
          }
        }
        return cloudRes;
      } else if (cloudRes.error && !cloudRes.needsDbSetup) {
        return cloudRes;
      }
    } catch {
      // Si el servidor en la nube no responde, continuar con verificación local
    }

    // 2. Fallback de autenticación local
    // Verificación de credencial de Administrador Maestro
    const isMasterUser = cleanUser === 'admin' || cleanUser === 'master' || cleanUser === 'administrador';
    const isMasterPass = cleanPass === '8888' || cleanPass === 'xnova2026' || cleanPass === 'admin';

    if (isMasterUser && isMasterPass) {
      return {
        success: true,
        isAdmin: true,
        user: {
          id: 'admin_root',
          username: 'admin',
          password: '',
          displayName: 'Administrador Maestro',
          plan: 'premium',
          status: 'active',
          expDate: 'ILIMITADO',
          playlists: [],
          createdAt: new Date().toISOString(),
        },
      };
    }

    const users = this.getAllUsers();
    const found = users.find(
      (u) =>
        u.username.toLowerCase() === cleanUser && u.password === cleanPass
    );

    if (!found) {
      return { success: false, error: 'Usuario o contraseña incorrectos.' };
    }

    if (found.status === 'suspended') {
      return {
        success: false,
        error: 'Tu cuenta ha sido suspendida. Contacta a tu proveedor.',
      };
    }

    if (found.status === 'expired') {
      return {
        success: false,
        error: 'Tu suscripción ha vencido. Contacta para renovar tu plan.',
      };
    }

    found.lastLogin = new Date().toISOString();
    this.saveAllUsers(users);
    this.saveActiveSession(found);

    return { success: true, user: found, isAdmin: false };
  },

  // Sesión activa en el dispositivo
  getActiveSession(): UserAccount | null {
    try {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async syncSessionFromPersistentStorage(): Promise<UserAccount | null> {
    const local = this.getActiveSession();
    if (local) return local;

    const persistent = await StorageService.getPersistentSession();
    if (persistent) {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(persistent));
      return persistent;
    }
    return null;
  },

  saveActiveSession(user: UserAccount): void {
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
      StorageService.savePersistentSession(user).catch((err) => {
        console.error('Error guardando sesión en IndexedDB:', err);
      });
    } catch (e) {
      console.error('Error guardando sesión activa:', e);
    }
  },

  clearActiveSession(): void {
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      StorageService.clearPersistentSession().catch((err) => {
        console.error('Error eliminando sesión en IndexedDB:', err);
      });
    } catch (e) {
      console.error('Error limpiando sesión:', e);
    }
  },
};
