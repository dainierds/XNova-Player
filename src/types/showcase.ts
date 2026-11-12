export interface ShowcaseItem {
  id: string;
  title: string;
  subtitle: string;
  backdropUrl: string;
  thumbnailUrl: string;
  releaseDateText: string; // ej. "Recién Añadido", "Próximamente", "Tendencia"
  statusBadge: 'ESTRENO' | 'PRÓXIMAMENTE' | 'NUEVO' | 'TENDENCIA';
  genresText: string;      // ej. "Acción, Thriller"
  year: string;
  rating: string;
  synopsis: string;
  duration: string;
  streamUrl?: string;
  type: 'movie' | 'series';
}

export type SidebarTabId = 
  | 'home'
  | 'movies'
  | 'series'
  | 'live'
  | 'favorites'
  | 'library'
  | 'settings';
