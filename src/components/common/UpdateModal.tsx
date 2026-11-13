import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X, CheckCircle2, EyeOff } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import type { AppUpdateInfo } from '../../services/updateService';
import { UpdateService } from '../../services/updateService';
import { BRANDING } from '../../config/branding';

interface UpdateModalProps {
  onDismiss?: () => void;
  onOpenStateChange?: (isOpen: boolean) => void;
}

const HIDE_UPDATE_SESSION_KEY = 'xnova_hide_update_session_v1';

export const UpdateModal: React.FC<UpdateModalProps> = ({ onDismiss, onOpenStateChange }) => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [dontShowAgainSession, setDontShowAgainSession] = useState(false);
  
  // 0: Actualizar Ahora, 1: Más tarde, 2: Cerrar (X), 3: Ocultar sesión
  const [focusedBtn, setFocusedBtn] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    // Si el usuario ya marcó ocultar durante esta sesión, no comprobar ni abrir
    if (sessionStorage.getItem(HIDE_UPDATE_SESSION_KEY) === 'true') {
      return;
    }

    // Comprobar actualizaciones tras 2.5 segundos
    const timer = setTimeout(async () => {
      try {
        // En navegadores web (Vercel / PC), no mostrar popup de APK si ya se ocultó
        if (sessionStorage.getItem(HIDE_UPDATE_SESSION_KEY) === 'true') return;

        const info = await UpdateService.checkForUpdates();
        if (info && info.hasUpdate && info.downloadUrl) {
          setUpdateInfo(info);
          setIsOpen(true);
          // Desenfoque inmediato para ocultar cualquier teclado virtual en TV
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          if (onOpenStateChange) onOpenStateChange(true);
        }
      } catch (err) {
        console.log('Update check error:', err);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [onOpenStateChange]);

  // Al abrir el modal, desenfocar todo elemento activo para evitar teclado en Android TV
  useEffect(() => {
    if (isOpen) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [isOpen]);

  const handleStartUpdate = () => {
    if (!updateInfo?.downloadUrl) return;

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setDownloading(true);
    setDownloadStatus('Iniciando descarga del nuevo APK...');
    setDownloadPercent(20);

    setTimeout(() => {
      setDownloadPercent(55);
      setDownloadStatus('Descargando paquete de actualización...');
    }, 800);

    setTimeout(() => {
      setDownloadPercent(90);
      setDownloadStatus('Abriendo instalador de Android...');
      try {
        window.open(updateInfo.downloadUrl!, '_system');
      } catch {
        window.location.href = updateInfo.downloadUrl!;
      }
    }, 1800);

    setTimeout(() => {
      setDownloading(false);
      setDownloadPercent(100);
      setDownloadStatus('Listo. Sigue las instrucciones en tu TV para completar.');
    }, 3000);
  };

  const handleClose = () => {
    if (dontShowAgainSession) {
      sessionStorage.setItem(HIDE_UPDATE_SESSION_KEY, 'true');
    }
    // En plataforma Web (Vercel), si el usuario cierra el modal, recordarlo por la sesión
    if (!Capacitor.isNativePlatform()) {
      sessionStorage.setItem(HIDE_UPDATE_SESSION_KEY, 'true');
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsOpen(false);
    if (onOpenStateChange) onOpenStateChange(false);
    if (onDismiss) onDismiss();
  };

  const handleDismissForSession = () => {
    sessionStorage.setItem(HIDE_UPDATE_SESSION_KEY, 'true');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsOpen(false);
    if (onOpenStateChange) onOpenStateChange(false);
    if (onDismiss) onDismiss();
  };

  // 🎮 Control D-Pad exclusivo para la ventana de actualización con máxima prioridad
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloquear propagación absoluta para que NINGÚN otro componente (ni el login) reciba la tecla
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      if (downloading) return;

      switch (e.key) {
        case 'ArrowLeft':
          if (focusedBtn === 1) setFocusedBtn(0);
          else if (focusedBtn === 3) setFocusedBtn(0);
          break;
        case 'ArrowRight':
          if (focusedBtn === 0) setFocusedBtn(1);
          break;
        case 'ArrowUp':
          if (focusedBtn === 0 || focusedBtn === 1) setFocusedBtn(2);
          else if (focusedBtn === 3) setFocusedBtn(0);
          break;
        case 'ArrowDown':
          if (focusedBtn === 2) setFocusedBtn(0);
          else if (focusedBtn === 0 || focusedBtn === 1) setFocusedBtn(3);
          break;
        case 'Enter':
        case ' ':
          if (focusedBtn === 0) {
            handleStartUpdate();
          } else if (focusedBtn === 1) {
            handleClose();
          } else if (focusedBtn === 2) {
            handleClose();
          } else if (focusedBtn === 3) {
            setDontShowAgainSession((prev) => !prev);
          }
          break;
        case 'Escape':
        case 'Backspace':
        case 'GoBack':
          handleClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, focusedBtn, downloading, updateInfo, dontShowAgainSession]);

  if (!isOpen || !updateInfo) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-6 select-none animate-fadeIn font-sans">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0F1422] border-2 border-cyan-500/40 p-8 shadow-2xl shadow-cyan-950/60 flex flex-col space-y-5">
        {/* Cabecera con Icono Oficial XNova Player */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-400/30 flex items-center justify-center overflow-hidden shadow-lg p-2">
              <img
                src={BRANDING.assets.icon512}
                alt={BRANDING.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  NUEVA VERSIÓN
                </span>
                <span className="text-xs font-semibold text-zinc-400">
                  v{updateInfo.currentVersion} → <strong className="text-white">v{updateInfo.latestVersion}</strong>
                </span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-wide mt-1">
                ¡Actualización Disponible!
              </h2>
            </div>
          </div>

          {!downloading && (
            <button
              type="button"
              onClick={handleClose}
              className={`p-2 rounded-xl transition ${
                focusedBtn === 2
                  ? 'bg-white text-black scale-110 ring-2 ring-cyan-400'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
              }`}
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Detalles de la actualización */}
        <div className="p-4 rounded-2xl bg-[#090D18] border border-white/5 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-zinc-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Novedades incluidas en esta versión:</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed pl-6">
            Mejoras de rendimiento, exploración completa de categorías y corrección de compatibilidad con televisores.
          </p>
          {!Capacitor.isNativePlatform() && (
            <div className="mt-2 text-[11px] text-cyan-400/80 bg-cyan-950/30 px-3 py-1.5 rounded-lg border border-cyan-800/30">
              💡 Estás en la versión web (Vercel). La descarga de APK es para instalar en televisores Android TV / Fire TV.
            </div>
          )}
        </div>

        {/* Barra de progreso si está descargando */}
        {downloading && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-300 font-semibold flex items-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{downloadStatus}</span>
              </span>
              <span className="text-white font-bold">{downloadPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${downloadPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Botones de Acción con Foco D-Pad para Control Remoto */}
        <div className="flex items-center space-x-3 pt-1">
          <button
            type="button"
            onClick={handleStartUpdate}
            disabled={downloading}
            className={`
              flex-1 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center space-x-2.5 transition-all duration-200 shadow-xl
              ${focusedBtn === 0
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black scale-105 ring-4 ring-cyan-300 shadow-cyan-500/50 font-extrabold'
                : 'bg-zinc-800 text-zinc-300 border border-white/10'}
            `}
          >
            <Download className="w-5 h-5" />
            <span>{downloading ? 'Descargando...' : 'Actualizar Ahora'}</span>
          </button>

          {!downloading && (
            <button
              type="button"
              onClick={handleClose}
              className={`
                px-5 py-3.5 rounded-2xl font-bold text-xs transition-all duration-200 border
                ${focusedBtn === 1
                  ? 'bg-white/20 text-white border-cyan-400 ring-2 ring-cyan-400 scale-105'
                  : 'bg-transparent text-zinc-400 border-white/10 hover:text-white'}
              `}
            >
              Más tarde
            </button>
          )}
        </div>

        {/* ── Casilla y Opción para Ocultar por esta Sesión ── */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs text-zinc-400">
          <label 
            onClick={() => {
              const next = !dontShowAgainSession;
              setDontShowAgainSession(next);
              if (next) {
                sessionStorage.setItem(HIDE_UPDATE_SESSION_KEY, 'true');
              } else {
                sessionStorage.removeItem(HIDE_UPDATE_SESSION_KEY);
              }
            }}
            className={`flex items-center space-x-2.5 cursor-pointer select-none p-1.5 rounded-xl transition ${
              focusedBtn === 3 ? 'ring-2 ring-cyan-400 bg-white/5 text-white' : 'hover:text-zinc-200'
            }`}
          >
            <input
              type="checkbox"
              checked={dontShowAgainSession}
              onChange={(e) => {
                const checked = e.target.checked;
                setDontShowAgainSession(checked);
                if (checked) {
                  sessionStorage.setItem(HIDE_UPDATE_SESSION_KEY, 'true');
                } else {
                  sessionStorage.removeItem(HIDE_UPDATE_SESSION_KEY);
                }
              }}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-xs">No volver a mostrar en esta sesión</span>
          </label>

          <button
            type="button"
            onClick={handleDismissForSession}
            className="text-[11px] text-zinc-500 hover:text-cyan-400 flex items-center space-x-1 transition underline"
            title="Ocultar de inmediato durante toda esta sesión de navegación"
          >
            <EyeOff className="w-3 h-3" />
            <span>Ocultar por ahora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
