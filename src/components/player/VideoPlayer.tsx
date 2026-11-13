import React, { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  Subtitles, 
  ArrowLeft
} from 'lucide-react';
import { StorageService } from '../../services/storage';

interface VideoPlayerProps {
  streamUrl: string;
  title: string;
  posterUrl?: string;
  contentId: string;
  isLive?: boolean;
  channelNumber?: number;
  onClose: () => void;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streamUrl,
  title,
  posterUrl = '',
  contentId,
  isLive = false,
  channelNumber,
  onClose,
  onNextChannel,
  onPrevChannel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const showControlsRef = useRef(true);
  showControlsRef.current = showControls;

  type PlayerControl = 'back' | 'rewind' | 'play_pause' | 'forward' | 'audio' | 'subtitles';
  const [focusedControl, setFocusedControl] = useState<PlayerControl>('play_pause');

  const [audioTracks, setAudioTracks] = useState<{ id: number; name: string }[]>([]);
  const [currentAudio, setCurrentAudio] = useState(0);
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; name: string }[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<number>(-1); // -1 = desactivados
  const hideTimerRef = useRef<number | null>(null);

  // Lista dinámica de controles disponibles en la barra inferior
  const getBottomControls = useCallback((): PlayerControl[] => {
    const list: PlayerControl[] = [];
    if (!isLive) list.push('rewind');
    list.push('play_pause');
    if (!isLive) list.push('forward');
    list.push('audio');
    list.push('subtitles');
    return list;
  }, [isLive]);

  // Reiniciar temporizador de ocultación de controles (4 segundos)
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    // Solo iniciar auto-ocultación si el video está reproduciéndose
    hideTimerRef.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 4000);
  }, []);

  // Formatear segundos a HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Inicializar reproducción con HLS.js o video nativo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = streamUrl.includes('.m3u8') || isLive;

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => setIsPlaying(false));
        const tracks = hls.audioTracks.map((t, idx) => ({
          id: idx,
          name: t.name || `Audio ${idx + 1}`,
        }));
        setAudioTracks(tracks);

        const subs = (hls.subtitleTracks || []).map((t, idx) => ({
          id: idx,
          name: t.name || `Subtítulo ${idx + 1}`,
        }));
        setSubtitleTracks(subs);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !isHls) {
      // Reproducción nativa (Safari o MP4 directo)
      video.src = streamUrl;
      video.play().catch(() => setIsPlaying(false));
    }

    // Cargar progreso previo si no es en vivo
    if (!isLive) {
      StorageService.getWatchProgress().then((list) => {
        const item = list.find((p) => p.id === contentId);
        if (item && item.currentTime > 10 && item.currentTime < item.duration - 30) {
          video.currentTime = item.currentTime;
        }
      });
    }

    resetHideTimer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [streamUrl, isLive, contentId, resetHideTimer]);

  // Guardar progreso al salir o pausar
  const saveProgress = useCallback(() => {
    if (isLive || !videoRef.current || duration <= 0) return;
    StorageService.saveWatchProgress({
      id: contentId,
      title,
      posterUrl,
      currentTime: videoRef.current.currentTime,
      duration,
      streamUrl,
      type: 'movie',
      updatedAt: Date.now(),
    });
  }, [contentId, title, posterUrl, duration, streamUrl, isLive]);

  // Manejo de eventos del teclado (Control Remoto TV / D-pad completo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;

      // Si los controles están ocultos y el usuario presiona Enter/OK o flechas:
      if (!showControlsRef.current) {
        if (['Enter', ' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          setShowControls(true);
          setFocusedControl('play_pause');
          resetHideTimer();
          return;
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          if (video && !isLive) {
            video.currentTime = Math.max(0, video.currentTime - 10);
          }
          setShowControls(true);
          setFocusedControl(isLive ? 'play_pause' : 'rewind');
          resetHideTimer();
          return;
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          if (video && !isLive) {
            video.currentTime = Math.min(duration, video.currentTime + 10);
          }
          setShowControls(true);
          setFocusedControl(isLive ? 'play_pause' : 'forward');
          resetHideTimer();
          return;
        } else if (['Escape', 'Backspace', 'GoBack'].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          saveProgress();
          onClose();
          return;
        }
      }

      // Si los controles están visibles, mantenemos despierto el temporizador con cada pulsación
      resetHideTimer();

      switch (e.key) {
        // --- FLECHA ARRIBA ---
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          if (focusedControl === 'back') {
            if (isLive && onPrevChannel) onPrevChannel();
          } else {
            // Subir al botón Volver (Atrás) en la cabecera
            setFocusedControl('back');
          }
          break;

        // --- FLECHA ABAJO ---
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          if (focusedControl === 'back') {
            // Bajar a la fila de controles inferiores
            setFocusedControl('play_pause');
          } else {
            // Ocultar controles OSD inmediatamente para disfrutar a pantalla completa
            setShowControls(false);
            if (hideTimerRef.current) {
              window.clearTimeout(hideTimerRef.current);
              hideTimerRef.current = null;
            }
          }
          break;

        // --- FLECHA IZQUIERDA ---
        case 'ArrowLeft':
          e.preventDefault();
          e.stopPropagation();
          if (focusedControl === 'back') {
            // Mantenerse en el botón volver
          } else {
            const bottom = getBottomControls();
            const curIdx = bottom.indexOf(focusedControl);
            if (curIdx > 0) {
              setFocusedControl(bottom[curIdx - 1]);
            } else if (!isLive && video) {
              // Si ya está en el primer elemento (rewind), rebobinar 10 segundos
              video.currentTime = Math.max(0, video.currentTime - 10);
            }
          }
          break;

        // --- FLECHA DERECHA ---
        case 'ArrowRight':
          e.preventDefault();
          e.stopPropagation();
          if (focusedControl === 'back') {
            // Mantenerse en el botón volver
          } else {
            const bottom = getBottomControls();
            const curIdx = bottom.indexOf(focusedControl);
            if (curIdx < bottom.length - 1) {
              setFocusedControl(bottom[curIdx + 1]);
            } else if (!isLive && video) {
              // Si ya está en el último elemento, adelantar 10 segundos
              video.currentTime = Math.min(duration, video.currentTime + 10);
            }
          }
          break;

        // --- ENTER / OK / ESPACIO ---
        case 'Enter':
        case ' ':
          e.preventDefault();
          e.stopPropagation();
          if (focusedControl === 'back') {
            saveProgress();
            onClose();
          } else if (focusedControl === 'rewind') {
            if (video && !isLive) {
              video.currentTime = Math.max(0, video.currentTime - 10);
            }
          } else if (focusedControl === 'play_pause') {
            if (video) {
              if (video.paused) {
                video.play();
                setIsPlaying(true);
                resetHideTimer();
              } else {
                video.pause();
                setIsPlaying(false);
                setShowControls(true);
                if (hideTimerRef.current) {
                  window.clearTimeout(hideTimerRef.current);
                  hideTimerRef.current = null;
                }
                saveProgress();
              }
            }
          } else if (focusedControl === 'forward') {
            if (video && !isLive) {
              video.currentTime = Math.min(duration, video.currentTime + 10);
            }
          } else if (focusedControl === 'audio') {
            if (hlsRef.current && audioTracks.length > 1) {
              const nextAudio = (currentAudio + 1) % audioTracks.length;
              hlsRef.current.audioTrack = nextAudio;
              setCurrentAudio(nextAudio);
            }
          } else if (focusedControl === 'subtitles') {
            if (hlsRef.current && subtitleTracks.length > 0) {
              const nextSub = currentSubtitle + 1 >= subtitleTracks.length ? -1 : currentSubtitle + 1;
              hlsRef.current.subtitleTrack = nextSub;
              setCurrentSubtitle(nextSub);
            } else {
              setCurrentSubtitle((prev) => (prev === -1 ? 0 : -1));
            }
          }
          break;

        // --- BOTÓN ATRÁS (Escape / Backspace / GoBack) ---
        case 'Escape':
        case 'Backspace':
        case 'GoBack':
          e.preventDefault();
          e.stopPropagation();
          saveProgress();
          onClose();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    duration,
    isLive,
    onClose,
    onNextChannel,
    onPrevChannel,
    resetHideTimer,
    saveProgress,
    focusedControl,
    audioTracks,
    currentAudio,
    subtitleTracks,
    currentSubtitle,
    getBottomControls,
  ]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden select-none"
      onMouseMove={resetHideTimer}
      onClick={() => {
        if (!showControls) {
          resetHideTimer();
        }
      }}
    >
      {/* Pantalla de Carga Cinemática: Fondo oscuro con póster desenfocado y spinner mientras conecta */}
      {!isVideoReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 pointer-events-none">
          {posterUrl && (
            <img
              src={posterUrl}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20 scale-110"
            />
          )}
          <div className="relative z-10 flex flex-col items-center space-y-4">
            <div className="w-14 h-14 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin shadow-lg shadow-cyan-500/30" />
            <p className="text-sm font-bold text-zinc-200 tracking-wider">
              Cargando {isLive ? 'emisión en directo' : 'reproducción'}...
            </p>
          </div>
        </div>
      )}

      {/* Elemento de Video: Con poster negro SVG para erradicar el icono blanco nativo */}
      <video
        ref={videoRef}
        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%23000000'/%3E%3C/svg%3E"
        className={`w-full h-full object-contain transition-opacity duration-500 ${
          isVideoReady ? 'opacity-100' : 'opacity-0'
        }`}
        onPlay={() => {
          setIsPlaying(true);
          setIsVideoReady(true);
          resetHideTimer();
        }}
        onPlaying={() => {
          setIsVideoReady(true);
        }}
        onLoadedData={() => {
          setIsVideoReady(true);
        }}
        onPause={() => {
          setIsPlaying(false);
          setShowControls(true);
          if (hideTimerRef.current) {
            window.clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
          }
        }}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        }}
        onEnded={() => {
          saveProgress();
          onClose();
        }}
      />

      {/* Capa de Controles OSD superpuesta: A pantalla completa sin márgenes ni cajas flotantes */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-0 transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Cabecera Superior del Reproductor (A todo lo ancho, fundida hacia el video) */}
        <div className="w-full bg-gradient-to-b from-black/95 via-black/75 to-transparent px-10 pt-8 pb-16 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-5">
            <button
              onClick={() => {
                saveProgress();
                onClose();
              }}
              className={`p-3 rounded-full transition-all duration-200 shadow-lg ${
                focusedControl === 'back'
                  ? 'bg-cyan-400 text-black ring-4 ring-cyan-300 scale-110 shadow-cyan-400/60 z-20'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Volver (o botón Atrás del mando)"
            >
              <ArrowLeft className={`w-6 h-6 ${focusedControl === 'back' ? 'text-black font-black' : 'text-white'}`} />
            </button>

            <div>
              <div className="flex items-center space-x-3">
                {isLive && channelNumber && (
                  <span className="px-3 py-1 rounded bg-red-600 text-white font-black text-xs shadow-md">
                    CH {channelNumber}
                  </span>
                )}
                <h1 className="text-2xl font-black text-white drop-shadow-lg tracking-wide">{title}</h1>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                {isLive ? 'Transmisión en Vivo (HLS Directo)' : 'Película VOD'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 rounded-lg bg-zinc-900/90 border border-zinc-700 text-xs font-black text-cyan-400 shadow-md">
              1080p FHD
            </span>
          </div>
        </div>

        {/* Zona Inferior: Barra de Progreso y Controles (A todo lo ancho, fundida hacia arriba) */}
        <div className="w-full bg-gradient-to-t from-black/95 via-black/75 to-transparent px-10 pb-8 pt-16 flex flex-col space-y-4 pointer-events-auto">
          {/* Barra de Progreso (Solo en VOD) */}
          {!isLive && (
            <div className="w-full flex items-center space-x-4">
              <span className="text-xs font-mono text-zinc-300">{formatTime(currentTime)}</span>
              <div className="flex-1 h-2 bg-zinc-700/60 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-150"
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-zinc-400">{formatTime(duration)}</span>
            </div>
          )}

          {/* Botones de Control con Navegación D-Pad en Control Remoto */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Botón: Retroceder 10s */}
              {!isLive && (
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                    }
                  }}
                  className={`p-3 rounded-full transition-all duration-200 ${
                    focusedControl === 'rewind'
                      ? 'bg-cyan-400 text-black ring-4 ring-cyan-300 scale-110 shadow-cyan-400/60 z-20'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title="Retroceder 10s"
                >
                  <RotateCcw className={`w-6 h-6 ${focusedControl === 'rewind' ? 'text-black' : 'text-white'}`} />
                </button>
              )}

              {/* Botón: Play / Pausa */}
              <button
                onClick={() => {
                  const video = videoRef.current;
                  if (video) {
                    if (video.paused) {
                      video.play();
                      setIsPlaying(true);
                    } else {
                      video.pause();
                      setIsPlaying(false);
                    }
                  }
                }}
                className={`p-4 rounded-full shadow-2xl transition-all duration-200 ${
                  focusedControl === 'play_pause'
                    ? 'bg-white text-black ring-4 ring-cyan-400 scale-115 shadow-cyan-400/70 z-20'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-cyan-500/50'
                }`}
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? (
                  <Pause className={`w-7 h-7 ${focusedControl === 'play_pause' ? 'fill-black text-black' : 'fill-white text-white'}`} />
                ) : (
                  <Play className={`w-7 h-7 ml-0.5 ${focusedControl === 'play_pause' ? 'fill-black text-black' : 'fill-white text-white'}`} />
                )}
              </button>

              {/* Botón: Adelantar 10s */}
              {!isLive && (
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
                    }
                  }}
                  className={`p-3 rounded-full transition-all duration-200 ${
                    focusedControl === 'forward'
                      ? 'bg-cyan-400 text-black ring-4 ring-cyan-300 scale-110 shadow-cyan-400/60 z-20'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title="Adelantar 10s"
                >
                  <RotateCw className={`w-6 h-6 ${focusedControl === 'forward' ? 'text-black' : 'text-white'}`} />
                </button>
              )}
            </div>

            {/* Pistas de Audio y Subtítulos con Navegación D-Pad */}
            <div className="flex items-center space-x-4">
              {/* Botón: Pistas de Audio */}
              <button
                onClick={() => {
                  if (hlsRef.current && audioTracks.length > 1) {
                    const nextTrack = (currentAudio + 1) % audioTracks.length;
                    hlsRef.current.audioTrack = nextTrack;
                    setCurrentAudio(nextTrack);
                  }
                }}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-200 shadow-md ${
                  focusedControl === 'audio'
                    ? 'bg-cyan-400 text-black ring-4 ring-cyan-300 scale-105 shadow-cyan-400/60 z-20'
                    : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                }`}
                title="Pista de Audio (Pulsa OK para alternar)"
              >
                <Volume2 className={`w-4 h-4 ${focusedControl === 'audio' ? 'text-black' : 'text-cyan-400'}`} />
                <span>{audioTracks[currentAudio]?.name || 'Audio'}</span>
              </button>

              {/* Botón: Subtítulos */}
              <button
                onClick={() => {
                  if (hlsRef.current && subtitleTracks.length > 0) {
                    const nextSub = currentSubtitle + 1 >= subtitleTracks.length ? -1 : currentSubtitle + 1;
                    hlsRef.current.subtitleTrack = nextSub;
                    setCurrentSubtitle(nextSub);
                  } else {
                    setCurrentSubtitle((prev) => (prev === -1 ? 0 : -1));
                  }
                }}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-200 shadow-md ${
                  focusedControl === 'subtitles'
                    ? 'bg-cyan-400 text-black ring-4 ring-cyan-300 scale-105 shadow-cyan-400/60 z-20'
                    : currentSubtitle !== -1
                      ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-400/60'
                      : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                }`}
                title="Subtítulos (Pulsa OK para alternar)"
              >
                <Subtitles className={`w-4 h-4 ${focusedControl === 'subtitles' ? 'text-black' : 'text-cyan-400'}`} />
                <span>
                  {currentSubtitle === -1 
                    ? 'Subtítulos: No' 
                    : subtitleTracks[currentSubtitle]?.name || 'Español'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
