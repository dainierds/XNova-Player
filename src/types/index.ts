export interface MovieItem {
  id: string;
  title: string;
  backdropUrl: string;
  posterUrl: string;
  genres: string[];
  synopsis: string;
  duration: string;
  year: string;
  rating: string;
  isPremiere?: boolean;
  streamUrl?: string;
}

export type MenuSection = 
  | 'movies' 
  | 'series' 
  | 'live' 
  | 'radio' 
  | 'documentaries' 
  | 'concerts' 
  | 'settings' 
  | 'exit';

export interface MenuItem {
  id: MenuSection;
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
