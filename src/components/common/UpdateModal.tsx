import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import type { AppUpdateInfo } from '../../services/updateService';
import { UpdateService } from '../../services/updateService';
import { BRANDING } from '../../config/branding';

interface UpdateModalProps {
  onDismiss?: () => void;
  onOpenStateChange?: (isOpen: boolean) => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ onDismiss, onOpenStateChange }) => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  
  // 0: Actualizar Ahora, 1: Más tarde, 2: Cerrar (X)
  const [focusedBtn, setFocusedBtn] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    // Comprobar actualizaciones tras 2.5 segundos
    const timer = setTimeout(async () => {
      try {
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

    // Asegurar que ningún input tenga foco para evitar que aparezca el teclado en Android TV
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
        // En Android/Capacitor, abrir con el sistema para no romper el WebView
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
    // Asegurar desenfoque
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

      // Asegurar que no haya inputs con foco
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      if (downloading) return;

      switch (e.key) {
        case 'ArrowLeft':
          if (focusedBtn === 1) setFocusedBtn(0);
          break;
        case 'ArrowRight':
          if (focusedBtn === 0) setFocusedBtn(1);
          break;
        case 'ArrowUp':
          if (focusedBtn === 0 || focusedBtn === 1) setFocusedBtn(2);
          break;
        case 'ArrowDown':
          if (focusedBtn === 2) setFocusedBtn(0);
          break;
        case 'Enter':
        case ' ':
          if (focusedBtn === 0) {
            handleStartUpdate();
          } else {
            handleClose();
          }
          break;
        case 'Escape':
        case 'Backspace':
        case 'GoBack':
          handleClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // useCapture = true para interceptar antes que nadie
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, focusedBtn, downloading, updateInfo]);

  if (!isOpen || !updateInfo) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-6 select-none animate-fadeIn font-sans">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0F1422] border-2 border-cyan-500/40 p-8 shadow-2xl shadow-cyan-950/60 flex flex-col space-y-6">
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
        <div className="flex items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={handleStartUpdate}
            disabled={downloading}
            className={`
              flex-1 py-4 rounded-2xl font-black text-sm flex items-center justify-center space-x-2.5 transition-all duration-200 shadow-xl
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
                px-6 py-4 rounded-2xl font-bold text-xs transition-all duration-200 border
                ${focusedBtn === 1
                  ? 'bg-white/20 text-white border-cyan-400 ring-2 ring-cyan-400 scale-105'
                  : 'bg-transparent text-zinc-400 border-white/10 hover:text-white'}
              `}
            >
              Más tarde
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
