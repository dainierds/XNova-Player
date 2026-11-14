import React, { useState, useEffect, useRef } from 'react';
import { BRANDING } from '../../config/branding';
import { CatalogCacheService } from '../../services/catalogCacheService';
import type { PlaylistAccount } from '../../types';

interface InitialSyncOverlayProps {
  playlist: PlaylistAccount;
  onFinished: () => void;
}

export const InitialSyncOverlay: React.FC<InitialSyncOverlayProps> = ({ playlist, onFinished }) => {
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Iniciando optimización del catálogo local...');
  const [isDone, setIsDone] = useState(false);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const runSync = async () => {
      try {
        await CatalogCacheService.syncFullCatalog(playlist, (step, percent) => {
          setStatusMessage(step);
          setProgress(percent);
        });

        setIsDone(true);
        setTimeout(() => {
          onFinished();
        }, 600);
      } catch (err) {
        console.error('Error durante la sincronización inicial:', err);
        setStatusMessage('Cargando contenido disponible...');
        setTimeout(() => {
          onFinished();
        }, 1200);
      }
    };

    runSync();
  }, [playlist, onFinished]);

  return (
    <div 
      className={`fixed inset-0 z-50 bg-[#070A12]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white transition-opacity duration-500 select-none ${
        isDone ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Resplandor ambiental de fondo */}
      <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -top-20" />
      <div className="absolute w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -bottom-20" />

      <div className="relative z-10 w-full max-w-lg bg-[#0E1526]/80 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Logotipo Oficial */}
        <div className="mb-6 relative">
          <img
            src={BRANDING.assets.logo}
            alt={BRANDING.name}
            className="h-14 w-auto object-contain drop-shadow-[0_0_20px_rgba(34,211,238,0.4)] animate-pulse"
          />
        </div>

        {/* Título y Explicación */}
        <h2 className="text-xl md:text-2xl font-black text-white tracking-wide">
          Sincronizando Catálogo en Caché
        </h2>
        <p className="text-xs text-zinc-400 mt-2 max-w-md leading-relaxed">
          Descargando todos los títulos en tu memoria local para que puedas navegar libremente y a <strong className="text-cyan-400">ultra-alta velocidad (0ms)</strong> sin tiempos de espera.
        </p>

        {/* Barra de Progreso */}
        <div className="w-full mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-cyan-400 tracking-wider truncate max-w-[80%] text-left">
              {statusMessage}
            </span>
            <span className="text-white font-mono">{progress}%</span>
          </div>

          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(34,211,238,0.6)]"
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
        </div>

        {/* Nota Informativa */}
        <div className="mt-6 flex items-center space-x-2 text-[11px] text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span>Este proceso solo se realiza una vez; en tus próximos accesos entrarás de inmediato.</span>
        </div>
      </div>
    </div>
  );
};
