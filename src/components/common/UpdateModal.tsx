import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X, Sparkles, CheckCircle2 } from 'lucide-react';
import type { AppUpdateInfo } from '../../services/updateService';
import { UpdateService } from '../../services/updateService';

interface UpdateModalProps {
  onDismiss?: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ onDismiss }) => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<string>('');

  useEffect(() => {
    // Comprobar actualizaciones tras 2 segundos del inicio para no bloquear el splash
    const timer = setTimeout(async () => {
      try {
        const info = await UpdateService.checkForUpdates();
        if (info && info.hasUpdate && info.downloadUrl) {
          setUpdateInfo(info);
          setIsOpen(true);
        }
      } catch (err) {
        console.log('Update check error:', err);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (!isOpen || !updateInfo) return null;

  const handleStartUpdate = () => {
    if (!updateInfo.downloadUrl) return;

    setDownloading(true);
    setDownloadStatus('Iniciando descarga del nuevo APK...');
    setDownloadPercent(15);

    // Si estamos en un navegador o TV, abrimos el APK directamente
    // En Android / Fire TV, al navegar a la URL del APK, el sistema o el gestor de descargas
    // lo descarga e inmediatamente lanza la pantalla de instalación del paquete.
    setTimeout(() => {
      setDownloadPercent(50);
      setDownloadStatus('Descargando paquete de actualización...');
    }, 800);

    setTimeout(() => {
      setDownloadPercent(90);
      setDownloadStatus('Abriendo instalador de Android...');
      window.location.href = updateInfo.downloadUrl!;
    }, 1800);

    setTimeout(() => {
      setDownloading(false);
      setDownloadPercent(100);
      setDownloadStatus('Listo. Sigue las instrucciones en tu TV para completar.');
    }, 3000);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onDismiss) onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 select-none animate-fadeIn font-sans">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0F1422] border-2 border-cyan-500/40 p-8 shadow-2xl shadow-cyan-950/60 flex flex-col space-y-6">
        {/* Cabecera con Icono Destacado */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Sparkles className="w-7 h-7 text-white" />
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
              onClick={handleClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
              title="Recordar más tarde"
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
            {updateInfo.releaseNotes || 'Mejoras de rendimiento, corrección de errores y nuevas funciones exclusivas para streaming en pantalla gigante.'}
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

        {/* Botones de Acción optimizados para TV */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={handleStartUpdate}
            disabled={downloading}
            className={`
              flex-1 py-4 rounded-2xl font-black text-sm flex items-center justify-center space-x-2.5 transition-all duration-200 shadow-xl
              ${downloading
                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-black font-extrabold shadow-cyan-500/30 scale-102 ring-2 ring-white/50'}
            `}
          >
            <Download className="w-5 h-5" />
            <span>{downloading ? 'Descargando...' : 'Actualizar Ahora'}</span>
          </button>

          {!downloading && (
            <button
              onClick={handleClose}
              className="px-6 py-4 rounded-2xl font-bold text-xs text-zinc-400 hover:text-white hover:bg-white/5 border border-white/10 transition"
            >
              Más tarde
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
