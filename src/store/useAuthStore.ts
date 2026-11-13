import { create } from 'zustand';
import type { UserAccount } from '../types/auth';
import { AuthService } from '../services/authService';

interface AuthState {
  currentUser: UserAccount | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  
  initializeAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; isAdmin?: boolean }>;
  logout: () => void;
  refreshCurrentUser: () => void;
  setAdminStatus: (isAdmin: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  isAdmin: false,
  isAuthenticated: false,
  isInitialized: false,

  initializeAuth: async () => {
    AuthService.init();
    // Sincronizar usuarios y sesión desde la Nube (Vercel) e IndexedDB (persistente)
    await AuthService.syncWithPersistentStorage();
    const active = await AuthService.syncSessionFromPersistentStorage();
    if (active) {
      set({
        currentUser: active,
        isAdmin: false,
        isAuthenticated: true,
        isInitialized: true,
      });
    } else {
      set({
        currentUser: null,
        isAdmin: false,
        isAuthenticated: false,
        isInitialized: true,
      });
    }
  },

  login: async (username: string, password: string) => {
    const res = await AuthService.login(username, password);
    if (res.success && res.user) {
      set({
        currentUser: res.user,
        isAdmin: !!res.isAdmin,
        isAuthenticated: true,
      });
      return { success: true, isAdmin: res.isAdmin };
    }
    return { success: false, error: res.error || 'Credenciales inválidas' };
  },

  logout: () => {
    AuthService.clearActiveSession();
    set({
      currentUser: null,
      isAdmin: false,
      isAuthenticated: false,
    });
  },

  refreshCurrentUser: () => {
    const { currentUser } = get();
    if (!currentUser) return;
    const users = AuthService.getAllUsers();
    const fresh = users.find((u) => u.id === currentUser.id);
    if (fresh) {
      AuthService.saveActiveSession(fresh);
      set({ currentUser: fresh });
    }
  },

  setAdminStatus: (isAdmin: boolean) => {
    set({ isAdmin });
  },
}));
