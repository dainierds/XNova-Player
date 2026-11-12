import type { PlaylistAccount } from './index';

export type UserPlan = 'basic' | 'gold' | 'premium';
export type UserStatus = 'active' | 'suspended' | 'expired';

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  displayName: string;
  plan: UserPlan;
  status: UserStatus;
  expDate: string; // Ej: "2026-12-31" o "31 DIC 2026"
  playlists: PlaylistAccount[];
  notes?: string;
  createdAt: string;
  lastLogin?: string;
}

export const PLAN_CONFIGS: Record<UserPlan, {
  name: string;
  badge: string;
  maxPlaylists: number;
  description: string;
  color: string;
}> = {
  basic: {
    name: 'Básico',
    badge: 'BASIC',
    maxPlaylists: 1,
    description: '1 Lista de reproducción activa. Calidad Estándar HD.',
    color: '#38BDF8', // Celeste
  },
  gold: {
    name: 'Gold',
    badge: 'GOLD',
    maxPlaylists: 2,
    description: 'Hasta 2 Listas de reproducción activas simultáneas. Full HD.',
    color: '#F59E0B', // Dorado
  },
  premium: {
    name: 'Premium',
    badge: 'PREMIUM',
    maxPlaylists: 3,
    description: 'Hasta 3 Listas de reproducción activas simultáneas. 4K Ultra HD.',
    color: '#8B5CF6', // Violeta neón
  },
};
