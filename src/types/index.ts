export interface ContentItem {
  id: string;
  title: string;
  backdropUrl: string;
  posterUrl: string;
  genres: string[];
  synopsis: string;
  duration: string;
  year: string;
  rating: string;
  score?: string;
  badge?: string; // e.g. "ESTRENO", "TENDENCIA", "4K HDR"
  streamUrl?: string;
  type?: 'movie' | 'series' | 'live';
  channelNumber?: number;
  progressPercent?: number; // Para la fila "Continuar Viendo"
  isPremiere?: boolean;
}

// Alias de compatibilidad
export type MovieItem = ContentItem;

export type NavTabId = 
  | 'home'
  | 'movies'
  | 'series'
  | 'live'
  | 'favorites'
  | 'search'
  | 'settings'
  | 'radio'
  | 'documentaries'
  | 'concerts'
  | 'exit';

export type MenuSection = NavTabId;

export interface NavTabItem {
  id: NavTabId;
  label: string;
  iconName: string;
}

export interface PlaylistAccount {
  id: string;
  name: string;
  type: 'xtream' | 'm3u';
  serverUrl?: string;
  username?: string;
  password?: string;
  m3uUrl?: string;
  expDate?: string;
  isActive: boolean;
}

export interface UserProfile {
  id: 'adult' | 'kids';
  name: string;
  pinRequired: boolean;
  pin?: string;
}
