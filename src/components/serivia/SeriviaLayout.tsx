import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  Heart, 
  Calendar, 
  TrendingUp, 
  Settings, 
  HelpCircle, 
  Search, 
  SlidersHorizontal, 
  Bell, 
  ChevronDown, 
  Play, 
  ChevronLeft, 
  ChevronRight,
  Star
} from 'lucide-react';
import { BRANDING } from '../../config/branding';
import { useAuthStore } from '../../store/useAuthStore';
import { PLAN_CONFIGS } from '../../types/auth';
import { 
  SERIVIA_HERO_MOVIES, 
  SERIVIA_HERO_SERIES, 
  SERIVIA_MOVIES_CATALOG, 
  SERIVIA_GENRES
} from '../../mock/seriviaData';

interface SeriviaLayoutProps {
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  onPlayMedia: (item: { id: string; title: string; streamUrl?: string; posterUrl?: string }) => void;
}

export const SeriviaLayout: React.FC<SeriviaLayoutProps> = ({
  onOpenSettings,
  onOpenSearch,
  onPlayMedia,
}) => {
  const { currentUser } = useAuthStore();
  const [sectionType, setSectionType] = useState<'movies' | 'series'>('movies');
  const [activeNav, setActiveNav] = useState('home');
  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState('Acción');
  const [isFavoriteHero, setIsFavoriteHero] = useState(false);
  const autoPlayTimerRef = useRef<number | null>(null);

  const heroList = (sectionType === 'movies') ? SERIVIA_HERO_MOVIES : SERIVIA_HERO_SERIES;
  const currentHero = heroList[heroIndex] || heroList[0];
  const nextHero1 = heroList[(heroIndex + 1) % heroList.length];
  const nextHero2 = heroList[(heroIndex + 2) % heroList.length];

  // Rotación automática suave del carrusel de cartas superior
  useEffect(() => {
    autoPlayTimerRef.current = window.setTimeout(() => {
      setHeroIndex((prev) => (prev + 1) % heroList.length);
    }, 6500);

    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [heroIndex, heroList.length]);

  const handleToggleSection = () => {
    setSectionType((prev) => (prev === 'movies' ? 'series' : 'movies'));
    setHeroIndex(0);
  };

  const handleNextHero = () => {
    setHeroIndex((prev) => (prev + 1) % heroList.length);
  };

  const handlePrevHero = () => {
    setHeroIndex((prev) => (prev - 1 + heroList.length) % heroList.length);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0A0E1A] text-white flex select-none font-sans">
      {/* 1. BARRA LATERAL IZQUIERDA (Sin sección de continuar viendo, solo logo XNova y navegación) */}
      <aside className="w-56 h-full bg-[#0A0E1A] border-r border-white/5 flex flex-col justify-between py-6 px-4 z-20 shrink-0">
        <div>
          {/* Logotipo Oficial XNova Player (Fondo perfectamente emparejado con la barra lateral) */}
          <div className="flex items-center px-2 mb-8">
            <img
              src={BRANDING.assets.logo}
              alt={BRANDING.name}
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* Menú Principal */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveNav('home')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeNav === 'home'
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Inicio</span>
            </button>

            <button
              onClick={() => setActiveNav('favorites')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeNav === 'favorites'
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Favoritos</span>
            </button>

            <button
              onClick={() => setActiveNav('coming_soon')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeNav === 'coming_soon'
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Próximamente</span>
            </button>

            <button
              onClick={() => setActiveNav('trending')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeNav === 'trending'
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Tendencias</span>
            </button>
          </nav>
        </div>

        {/* Menú Secundario Inferior */}
        <div className="pt-6 border-t border-white/5 space-y-1">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <Settings className="w-4 h-4" />
            <span>Ajustes</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Soporte</span>
          </button>
        </div>
      </aside>

      {/* 2. ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 h-full flex flex-col justify-between overflow-hidden px-8 py-5">
        {/* Cabecera Superior: Selector de Sección + Buscador + Indicadores + Perfil */}
        <header className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center space-x-3">
            {/* Selector Películas / Series */}
            <button
              onClick={handleToggleSection}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#131824] border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition shadow-sm"
            >
              <span>{sectionType === 'movies' ? 'Películas' : 'Series'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {/* Buscador estilo Pill */}
            <div
              onClick={onOpenSearch}
              className="w-80 lg:w-96 flex items-center justify-between px-4 py-2 rounded-xl bg-[#131824] border border-white/10 text-zinc-400 cursor-pointer hover:border-zinc-500 transition"
            >
              <div className="flex items-center space-x-2.5 text-xs">
                <Search className="w-4 h-4 text-zinc-400" />
                <span>Buscar películas, series, shows...</span>
              </div>
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
            </div>
          </div>

          {/* Notificaciones, Puntos del Carrusel y Perfil Usuario */}
          <div className="flex items-center space-x-4">
            {/* Indicador de Puntos del Carrusel (Idéntico a la foto arriba a la derecha) */}
            <div className="flex items-center space-x-1.5 mr-2">
              {heroList.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setHeroIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === heroIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>

            <button className="w-9 h-9 rounded-xl bg-[#131824] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition">
              <Bell className="w-4 h-4" />
            </button>

            <div 
              onClick={onOpenSettings}
              className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-[#131824] border border-white/10 cursor-pointer hover:bg-white/10 transition"
              title="Ajustes y Perfil de Usuario"
            >
              <div 
                className="w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-black"
                style={{
                  backgroundColor: currentUser ? `${PLAN_CONFIGS[currentUser.plan].color}25` : '#22D3EE25',
                  borderColor: currentUser ? PLAN_CONFIGS[currentUser.plan].color : '#22D3EE',
                  color: currentUser ? PLAN_CONFIGS[currentUser.plan].color : '#22D3EE',
                }}
              >
                {currentUser?.displayName.charAt(0).toUpperCase() || 'XN'}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">
                  {currentUser?.displayName || 'Cliente XNova'}
                </p>
                <p 
                  className="text-[10px] font-bold leading-tight uppercase"
                  style={{ color: currentUser ? PLAN_CONFIGS[currentUser.plan].color : '#F59E0B' }}
                >
                  Plan {currentUser ? PLAN_CONFIGS[currentUser.plan].badge : 'VIP'}
                </p>
              </div>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </div>
          </div>
        </header>

        {/* 3. VISTA DE CARRUSEL DE CARTAS SUPERIOR (Exactamente como en la foto de referencia) */}
        <div className="relative w-full h-[40vh] min-h-[260px] max-h-[350px] flex items-center overflow-visible mb-3">
          {/* Carta 1: Principal Activa */}
          <div className="relative flex-1 h-full rounded-3xl overflow-hidden shadow-2xl bg-zinc-900 border border-white/15 flex flex-col justify-between p-6 z-10 transition-all duration-500">
            <img
              key={currentHero.backdropUrl}
              src={currentHero.backdropUrl}
              alt={currentHero.title}
              className="absolute inset-0 w-full h-full object-cover object-center animate-fadeIn"
            />
            {/* Gradientes cinematográficos */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/35" />

            {/* Fila Superior de Badges */}
            <div className="relative z-10 flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-md text-xs font-semibold text-zinc-200 border border-white/10">
                {currentHero.duration}
              </span>
              <span className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-md text-xs font-semibold text-zinc-200 border border-white/10">
                {currentHero.genre}
              </span>
              <span className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-md text-xs font-semibold text-zinc-200 border border-white/10">
                {currentHero.typeText}
              </span>
              <span className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-md text-xs font-semibold text-zinc-200 border border-white/10">
                {currentHero.year}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md text-xs font-bold text-zinc-200 border border-white/10">
                {currentHero.ageRating}
              </span>
            </div>

            {/* Fila Inferior: Título + Botón Play + Tráiler + Corazón */}
            <div className="relative z-10 flex items-end justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => onPlayMedia({
                    id: currentHero.id,
                    title: currentHero.title,
                    streamUrl: currentHero.streamUrl,
                    posterUrl: currentHero.backdropUrl,
                  })}
                  className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition shadow-2xl"
                >
                  <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                </button>

                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white drop-shadow-md">
                    {currentHero.title}
                  </h2>
                  <p className="text-xs text-zinc-300 drop-shadow">
                    {currentHero.trailerText}
                  </p>
                </div>
              </div>

              {/* Botón Favorito circular */}
              <button
                onClick={() => setIsFavoriteHero((prev) => !prev)}
                className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition ${
                  isFavoriteHero
                    ? 'bg-red-600/40 border-red-500 text-red-400'
                    : 'bg-black/50 border-white/20 text-white hover:bg-white/20'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavoriteHero ? 'fill-red-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Carta 2: Asomándose a la Derecha en Perspectiva */}
          <div
            onClick={handleNextHero}
            className="relative w-40 lg:w-48 h-[92%] rounded-3xl overflow-hidden cursor-pointer opacity-85 hover:opacity-100 transition-all duration-300 -ml-4 z-5 shadow-xl border border-white/10 shrink-0 transform hover:scale-102"
          >
            <img
              src={nextHero1.backdropUrl}
              alt={nextHero1.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex items-end p-3">
              <p className="text-xs font-bold text-white truncate">{nextHero1.title}</p>
            </div>
          </div>

          {/* Carta 3: Asomándose al Fondo (Tercera carta del carrusel) */}
          <div
            onClick={() => setHeroIndex((prev) => (prev + 2) % heroList.length)}
            className="relative w-28 lg:w-36 h-[84%] rounded-3xl overflow-hidden cursor-pointer opacity-50 hover:opacity-80 transition-all duration-300 -ml-6 z-0 shadow-lg border border-white/5 shrink-0"
          >
            <img
              src={nextHero2.backdropUrl}
              alt={nextHero2.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60" />
          </div>
        </div>

        {/* 4. FILA DE PÍLDORAS DE GÉNERO / CATEGORÍAS */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
            {SERIVIA_GENRES.map((genre) => {
              const isSelected = selectedGenre === genre;

              return (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`
                    px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0
                    ${isSelected
                      ? 'bg-white text-black shadow-md scale-105'
                      : 'bg-[#131824] text-zinc-400 hover:text-white border border-white/5'}
                  `}
                >
                  {genre}
                </button>
              );
            })}
          </div>

          {/* Flechas de navegación para categorías */}
          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={handlePrevHero}
              className="w-7 h-7 rounded-lg bg-[#131824] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextHero}
              className="w-7 h-7 rounded-lg bg-[#131824] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5. FILA INFERIOR DE CARÁTULAS DE PELÍCULAS CON PUNTUACIONES */}
        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center space-x-4 py-1">
          {SERIVIA_MOVIES_CATALOG.map((card) => (
            <div
              key={card.id}
              onClick={() => onPlayMedia({
                id: card.id,
                title: card.title,
                streamUrl: card.streamUrl,
                posterUrl: card.posterUrl,
              })}
              className="group flex-shrink-0 cursor-pointer transition-all duration-200 w-36 md:w-44 hover:scale-102"
            >
              <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shadow-lg relative mb-2">
                <img
                  src={card.posterUrl}
                  alt={card.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                  </div>
                </div>
              </div>

              <h3 className="text-xs font-bold text-white truncate leading-snug">
                {card.title}
              </h3>
              <div className="flex items-center space-x-1.5 text-[11px] text-zinc-400 font-medium mt-0.5">
                <span>{card.year}</span>
                <span>•</span>
                <span className="flex items-center text-amber-400 font-bold">
                  <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                  {card.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
