/**
 * Configuración oficial de Branding e Identidad Visual de XNova Player
 */
export const BRANDING = {
  name: 'XNova Player',
  version: '1.0.0',
  tagline: 'Tu centro de streaming premium para Android TV y Fire TV',
  
  // Rutas a recursos multimedia en /public/branding/
  assets: {
    logo: '/branding/logo.png',
    icon1024: '/branding/icon-1024.png',
    icon512: '/branding/icon-512.png',
    banner1280: '/branding/banner-1280x720.png',
    bannerTv320: '/branding/banner-tv-320x180.png',
    splashVideo: '/branding/splash.mp4',
    splashGif: '/branding/splash.gif',
    splashSound: '/branding/splash-sound.wav',
  },

  // Paleta de colores oficial de la marca
  colors: {
    bg: '#0A0E1A',      // Fondo obsidiana espacial
    cyan: '#22D3EE',    // Cian eléctrico brillante
    blue: '#2563EB',    // Azul zafiro
    violet: '#7C3AED',  // Violeta cósmico
    sky: '#38BDF8',     // Celeste neón
  },
} as const;
