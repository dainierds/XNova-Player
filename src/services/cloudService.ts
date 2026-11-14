import { CLOUD_CONFIG } from '../config/cloud';
import type { UserAccount, UserPlan } from '../types/auth';
import type { PlaylistAccount } from '../types';

export const CloudService = {
  /**
   * Autenticación en la Nube (Vercel Serverless)
   */
  async login(
    username: string,
    password: string
  ): Promise<{
    success: boolean;
    user?: UserAccount;
    isAdmin?: boolean;
    error?: string;
    needsDbSetup?: boolean;
  }> {
    try {
      const response = await fetch(`${CLOUD_CONFIG.apiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.warn('Error conectando a la API en la nube:', err);
      return {
        success: false,
        error: 'No se pudo conectar con el servidor en la nube de Vercel.',
      };
    }
  },

  /**
   * Obtener todos los usuarios desde la Nube
   */
  async getAllUsers(): Promise<{
    success: boolean;
    users?: UserAccount[];
    error?: string;
    needsDbSetup?: boolean;
  }> {
    try {
      const response = await fetch(`${CLOUD_CONFIG.apiUrl}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.warn('Error al obtener usuarios de la nube:', err);
      return {
        success: false,
        error: 'No se pudo conectar con el servidor en la nube de Vercel.',
      };
    }
  },

  /**
   * Crear un nuevo usuario en la Nube
   */
  async createUser(data: {
    username: string;
    password: string;
    displayName: string;
    plan: UserPlan;
    expDate: string;
    playlists: PlaylistAccount[];
    notes?: string;
  }): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    try {
      const response = await fetch(`${CLOUD_CONFIG.apiUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const resData = await response.json();
      return resData;
    } catch (err: any) {
      console.warn('Error al crear usuario en la nube:', err);
      return {
        success: false,
        error: 'Error de conexión con la nube de Vercel.',
      };
    }
  },

  /**
   * Actualizar usuario en la Nube
   */
  async updateUser(
    id: string,
    updates: Partial<Omit<UserAccount, 'id' | 'createdAt'>>
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    try {
      const response = await fetch(`${CLOUD_CONFIG.apiUrl}/users`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, updates }),
      });

      const resData = await response.json();
      return resData;
    } catch (err: any) {
      console.warn('Error al actualizar usuario en la nube:', err);
      return {
        success: false,
        error: 'Error de conexión con la nube de Vercel.',
      };
    }
  },

  /**
   * Eliminar usuario en la Nube
   */
  async deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${CLOUD_CONFIG.apiUrl}/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const resData = await response.json();
      return resData;
    } catch (err: any) {
      console.warn('Error al eliminar usuario en la nube:', err);
      return {
        success: false,
        error: 'Error de conexión con la nube de Vercel.',
      };
    }
  },

  /**
   * 🌟 Obtener títulos destacados de portada desde la Nube (Sincronización PC <-> TV)
   */
  async getFeaturedItems(): Promise<{ success: boolean; items?: any[]; error?: string }> {
    try {
      const response = await fetch(`${CLOUD_CONFIG.apiUrl}/featured`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const resData = await response.json();
      return resData;
    } catch (err: any) {
      console.warn('Error al obtener featured items de la nube:', err);
      return {
        success: false,
        error: 'Error de conexión con la nube de Vercel.',
      };
    }
  },

  /**
   * 🌟 Guardar títulos destacados de portada en la Nube
   */
  async saveFeaturedItems(items: any[]): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${CLOUD_CONFIG.apiUrl}/featured`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      const resData = await response.json();
      return resData;
    } catch (err: any) {
      console.warn('Error al guardar featured items en la nube:', err);
      return {
        success: false,
        error: 'Error de conexión con la nube de Vercel.',
      };
    }
  },
};
