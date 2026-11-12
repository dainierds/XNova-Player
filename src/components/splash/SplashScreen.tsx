import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BRANDING } from '../../config/branding';

interface SplashScreenProps {
  onFinish: () => void;
}

type SplashState = 'video' | 'fallback_gif' | 'fallback_logo';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<SplashState>('video');
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasFinishedRef = useRef(false);

  // Finalizar splash de forma segura una sola vez
  const completeSplash = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }

    onFinish();
  }, [onFinish]);

  // Manejar fallback a GIF y sonido independiente
  const handleFallbackToGif = useCallback(() => {
    setStage('fallback_gif');

    // Intentar reproducir sonido de respaldo
    try {
      const audio = new Audio(BRANDING.assets.splashSound);
      audio.volume = 1.0;
      audio.play().catch((err) => {
        console.warn('No se pudo reproducir audio de respaldo:', err);
      });
      audioRef.current = audio;
    } catch (e) {
      console.warn('Error al instanciar audio de respaldo:', e);
    }

    // Salir después de 4.6 segundos (duración de la animación)
    window.setTimeout(() => {
      completeSplash();
    }, 4600);
  }, [completeSplash]);

  // Manejar fallback a Logo estático por 2 segundos
  const handleFallbackToLogo = useCallback(() => {
    setStage('fallback_logo');
    window.setTimeout(() => {
      completeSplash();
    }, 2000);
  }, [completeSplash]);

  // Intentar reproducir video con audio automáticamente al montar
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1.0;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Autoplay de video con audio bloqueado o no soportado:', err);
        // Si falla por autoplay policy o formato, activar respaldo GIF + Audio
        handleFallbackToGif();
      });
    }

    // Tiempo máximo de seguridad: 6 segundos
    const maxTimer = window.setTimeout(() => {
      completeSplash();
    }, 6000);

    return () => {
      window.clearTimeout(maxTimer);
    };
  }, [completeSplash, handleFallbackToGif]);

  // Permitir saltar la animación con OK/Enter o Atrás (D-pad)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Enter', ' ', 'Escape', 'Backspace', 'GoBack', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault();
        completeSplash();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [completeSplash]);

  return (
    <div
      onClick={completeSplash}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0E1A] overflow-hidden select-none cursor-pointer"
    >
      {stage === 'video' && (
        <video
          ref={videoRef}
          src={BRANDING.assets.splashVideo}
          playsInline
          autoPlay
          preload="auto"
          onEnded={completeSplash}
          onError={() => handleFallbackToGif()}
          className="w-full h-full object-contain pointer-events-none"
        />
      )}

      {stage === 'fallback_gif' && (
        <img
          src={BRANDING.assets.splashGif}
          alt="XNova Player"
          onError={() => handleFallbackToLogo()}
          className="w-full h-full object-contain pointer-events-none animate-fadeIn"
        />
      )}

      {stage === 'fallback_logo' && (
        <div className="flex flex-col items-center justify-center space-y-4 animate-fadeIn">
          <img
            src={BRANDING.assets.logo}
            alt="XNova Player"
            className="w-auto h-24 object-contain"
          />
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Indicador discreto para saltar animación */}
      <div className="absolute bottom-6 right-8 text-[11px] font-semibold text-zinc-500 tracking-wider">
        Presiona OK o Atrás para omitir
      </div>
    </div>
  );
};
