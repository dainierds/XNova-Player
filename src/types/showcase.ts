export interface SeriesEpisodeData {
  id: string;
  episodeNum: number;
  seasonNum: number;
  title: string;
  streamUrl: string;
  posterUrl?: string;
  duration?: string;
}

export interface SeriesContextData {
  seriesName: string;
  seriesCover?: string;
  seasonNumber: number;
  currentEpisodeId: string;
  episodes: SeriesEpisodeData[];
}

export interface LiveChannelData {
  id: string;
  name: string;
  streamUrl: string;
  logoUrl?: string;
  channelNumber?: number;
}

export interface LiveCategoryContextData {
  categoryId: string;
  categoryName: string;
  currentChannelId: string;
  channels: LiveChannelData[];
}

export interface ShowcaseItem {
  id: string;
  title: string;
  subtitle: string;
  backdropUrl: string;
  thumbnailUrl: string;
  releaseDateText: string; // ej. "Recién Añadido", "Próximamente", "Tendencia"
  statusBadge: 'ESTRENO' | 'PRÓXIMAMENTE' | 'NUEVO' | 'TENDENCIA' | 'RECIÉN AÑADIDA';
  genresText: string;      // ej. "Acción, Thriller"
  year: string;
  rating: string;
  synopsis: string;
  duration: string;
  streamUrl?: string;
  type: 'movie' | 'series' | 'live';
  trailerYoutubeKey?: string;
  tmdbId?: number | string;
  seriesContext?: SeriesContextData;
  liveContext?: LiveCategoryContextData;
}

export type SidebarTabId = 
  | 'live'
  | 'movies'
  | 'series'
  | 'favorites'
  | 'settings';
