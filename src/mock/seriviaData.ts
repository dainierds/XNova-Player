export interface SeriviaHeroItem {
  id: string;
  title: string;
  duration: string;
  genre: string;
  typeText: string;
  year: string;
  ageRating: string;
  trailerText: string;
  backdropUrl: string;
  streamUrl?: string;
}

export interface SeriviaCardItem {
  id: string;
  title: string;
  year: string;
  score: string;
  posterUrl: string;
  genre: string;
  streamUrl?: string;
  type: 'movie' | 'series';
}

export const SERIVIA_HERO_MOVIES: SeriviaHeroItem[] = [
  {
    id: 'dragon-2025',
    title: 'Cómo Entrenar a Tu Dragón',
    duration: '1h 56min',
    genre: 'Acción',
    typeText: 'Película',
    year: '2025',
    ageRating: '6+',
    trailerText: 'Ver tráiler 2:30',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'dune-part-two',
    title: 'Dune: Parte Dos',
    duration: '2h 46min',
    genre: 'Sci-Fi',
    typeText: 'Película',
    year: '2024',
    ageRating: '16+',
    trailerText: 'Ver tráiler 3:15',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'mission-impossible-8',
    title: 'Misión Imposible: Sentencia Final',
    duration: '2h 35min',
    genre: 'Acción',
    typeText: 'Película',
    year: '2025',
    ageRating: '13+',
    trailerText: 'Ver tráiler 2:45',
    backdropUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1920&auto=format&fit=crop',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'gladiator-2',
    title: 'Gladiator II',
    duration: '2h 28min',
    genre: 'Acción / Historia',
    typeText: 'Película',
    year: '2024',
    ageRating: '16+',
    trailerText: 'Ver tráiler 3:00',
    backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1920&auto=format&fit=crop',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'avatar-fire-ash',
    title: 'Avatar: Fuego y Cenizas',
    duration: '3h 10min',
    genre: 'Aventura / Sci-Fi',
    typeText: 'Película',
    year: '2025',
    ageRating: '12+',
    trailerText: 'Ver tráiler 2:55',
    backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
];

export const SERIVIA_HERO_SERIES: SeriviaHeroItem[] = [
  {
    id: 'arcane-s2',
    title: 'Arcane: League of Legends',
    duration: 'Temporada 2',
    genre: 'Animación',
    typeText: 'Serie',
    year: '2025',
    ageRating: '16+',
    trailerText: 'Ver tráiler 2:10',
    backdropUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'shogun-s2',
    title: 'Shōgun: Dinastía',
    duration: 'Temporada 2',
    genre: 'Drama',
    typeText: 'Serie',
    year: '2026',
    ageRating: '18+',
    trailerText: 'Ver tráiler 2:50',
    backdropUrl: 'https://images.unsplash.com/photo-1528164344705-475647b2a1e5?q=80&w=1920&auto=format&fit=crop',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'the-last-of-us-s2',
    title: 'The Last of Us: Temporada 2',
    duration: 'Temporada 2',
    genre: 'Drama / Terror',
    typeText: 'Serie',
    year: '2025',
    ageRating: '18+',
    trailerText: 'Ver tráiler 2:20',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'house-of-dragon-s2',
    title: 'La Casa del Dragón',
    duration: 'Temporada 2',
    genre: 'Fantasía',
    typeText: 'Serie',
    year: '2024',
    ageRating: '18+',
    trailerText: 'Ver tráiler 2:40',
    backdropUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1920&auto=format&fit=crop',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'stranger-things-s5',
    title: 'Stranger Things: Temporada 5',
    duration: 'Temporada 5',
    genre: 'Sci-Fi / Misterio',
    typeText: 'Serie',
    year: '2025',
    ageRating: '16+',
    trailerText: 'Ver tráiler 3:10',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
];

export const SERIVIA_MOVIES_CATALOG: SeriviaCardItem[] = [
  {
    id: 'lilo-stitch',
    title: 'Lilo & Stitch',
    year: '2025',
    score: '7.2',
    posterUrl: 'https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?q=80&w=500&auto=format&fit=crop',
    genre: 'Aventura',
    type: 'movie',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'flow-straume',
    title: 'Flow (Straume)',
    year: '2024',
    score: '7.9',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=500&auto=format&fit=crop',
    genre: 'Animación',
    type: 'movie',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'mi-final',
    title: 'Misión: Imposible - Sentencia Final',
    year: '2025',
    score: '8.2',
    posterUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=500&auto=format&fit=crop',
    genre: 'Acción',
    type: 'movie',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'mufasa-lion-king',
    title: 'Mufasa: El Rey León',
    year: '2024',
    score: '6.6',
    posterUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=500&auto=format&fit=crop',
    genre: 'Fantasía',
    type: 'movie',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'dune-two-card',
    title: 'Dune: Parte Dos',
    year: '2024',
    score: '8.5',
    posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=500&auto=format&fit=crop',
    genre: 'Sci-Fi',
    type: 'movie',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'spiderman-card',
    title: 'Spider-Man: Brand New Day',
    year: '2026',
    score: '8.4',
    posterUrl: 'https://images.unsplash.com/photo-1635863138275-d9b33299680b?q=80&w=500&auto=format&fit=crop',
    genre: 'Acción',
    type: 'movie',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
];

export const SERIVIA_GENRES = [
  'Tendencias',
  'Aventura',
  'Acción',
  'Comedia',
  'Crimen',
  'Drama',
  'Fantasía',
  'Terror',
  'Animación',
  'Ciencia Ficción',
];
