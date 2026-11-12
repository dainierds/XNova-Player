import type { UserAccount, UserPlan } from '../types/auth';
import type { PlaylistAccount } from '../types';
import { PLAN_CONFIGS } from '../types/auth';

const STORAGE_USERS_KEY = 'xnova_managed_users_v1';
const STORAGE_SESSION_KEY = 'xnova_active_session_v1';

// Cuentas de demostración iniciales para pruebas inmediatas
const SEED_USERS: UserAccount[] = [
  {
    id: 'user_basic_01',
    username: 'cliente_basic',
    password: '123',
    displayName: 'Carlos Gómez',
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
    displayName: 'Mariana Silva',
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
      {
        id: 'pl_gold_2',
        name: 'VOD Películas y Series',
        type: 'm3u',
        m3uUrl: 'https://cdn.xnova.live/vod/movies.m3u8',
        isActive: false,
      },
    ],
  },
  {
    id: 'user_premium_03',
    username: 'cliente_premium',
    password: '123',
    displayName: 'Alejandro Morales',
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
      {
        id: 'pl_prem_2',
        name: 'Cinema 4K HDR',
        type: 'xtream',
        serverUrl: 'http://vip.xnovatv.com:8080',
        username: 'prem_cinema_2',
        password: 'secure_password_4',
        isActive: false,
      },
      {
        id: 'pl_prem_3',
        name: 'Canales Internacionales',
        type: 'm3u',
        m3uUrl: 'https://cdn.xnova.live/world/live.m3u8',
        isActive: false,
      },
    ],
  },
];

export const AuthService = {
  // Inicializar almacenamiento con datos semilla si está vacío
  init(): void {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(SEED_USERS));
    }
  },

  // Obtener todos los usuarios registrados (Para el panel de administración)
  getAllUsers(): UserAccount[] {
    this.init();
    try {
      const raw = localStorage.getItem(STORAGE_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return SEED_USERS;
    }
  },

  // Guardar la lista completa de usuarios
  saveAllUsers(users: UserAccount[]): void {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  },

  // Crear un nuevo usuario desde el panel de administración
  createUser(data: {
    username: string;
    password: string;
    displayName: string;
    plan: UserPlan;
    expDate: string;
    playlists: PlaylistAccount[];
    notes?: string;
  }): { success: boolean; user?: UserAccount; error?: string } {
    const users = this.getAllUsers();
    
    // Verificar si el username ya existe
    const exists = users.some(
      (u) => u.username.toLowerCase() === data.username.toLowerCase().trim()
    );
    if (exists) {
      return { success: false, error: 'El nombre de usuario ya está registrado.' };
    }

    // Validar límite de listas según el paquete
    const maxAllowed = PLAN_CONFIGS[data.plan].maxPlaylists;
    if (data.playlists.length > maxAllowed) {
      return {
        success: false,
        error: `El plan ${PLAN_CONFIGS[data.plan].name} solo permite hasta ${maxAllowed} lista(s) activa(s).`,
      };
    }

    // Asegurar que al menos una lista esté activa si existen
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
  updateUser(
    id: string,
    updates: Partial<Omit<UserAccount, 'id' | 'createdAt'>>
  ): { success: boolean; user?: UserAccount; error?: string } {
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

    // Si el usuario actualizado es la sesión activa actual, actualizar la sesión
    const active = this.getActiveSession();
    if (active && active.id === id) {
      this.saveActiveSession(updatedUser);
    }

    return { success: true, user: updatedUser };
  },

  // Eliminar usuario
  deleteUser(id: string): boolean {
    const users = this.getAllUsers().filter((u) => u.id !== id);
    this.saveAllUsers(users);

    const active = this.getActiveSession();
    if (active && active.id === id) {
      this.clearActiveSession();
    }
    return true;
  },

  // Autenticar credenciales en la app
  login(
    username: string,
    password: string
  ): {
    success: boolean;
    user?: UserAccount;
    isAdmin?: boolean;
    error?: string;
  } {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Verificación de credencial de Administrador Maestro
    if (
      (cleanUser === 'admin' && cleanPass === 'xnova2026') ||
      (cleanUser === 'admin' && cleanPass === '8888')
    ) {
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

    // Actualizar último login
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

  saveActiveSession(user: UserAccount): void {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
  },

  clearActiveSession(): void {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  },
};
