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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const showControlsRef = useRef(true);
  showControlsRef.current = showControls;

  const [audioTracks, setAudioTracks] = useState<{ id: number; name: string }[]>([]);
  const [currentAudio, setCurrentAudio] = useState(0);
  const hideTimerRef = useRef<number | null>(null);

  // Reiniciar temporizador de ocultación de controles (3.5 segundos)
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
    }, 3500);
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
          name: t.name || `Pista ${idx + 1}`,
        }));
        setAudioTracks(tracks);
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

  // Manejo de eventos del teclado (Control Remoto TV / D-pad)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;

      // Si los controles están ocultos y el usuario presiona Enter/OK o Arriba/Abajo:
      // Simplemente despertamos los controles OSD sin pausar la emisión
      if (!showControlsRef.current) {
        if (['Enter', ' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          resetHideTimer();
          return;
        }
      }

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
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
          break;

        case 'ArrowLeft':
          e.preventDefault();
          resetHideTimer();
          if (video && !isLive) {
            video.currentTime = Math.max(0, video.currentTime - 10);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          resetHideTimer();
          if (video && !isLive) {
            video.currentTime = Math.min(duration, video.currentTime + 10);
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          resetHideTimer();
          if (isLive && onPrevChannel) {
            onPrevChannel();
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (isLive && onNextChannel) {
            onNextChannel();
            resetHideTimer();
          } else {
            // Ocultar controles OSD inmediatamente para despejar la pantalla
            setShowControls(false);
            if (hideTimerRef.current) {
              window.clearTimeout(hideTimerRef.current);
              hideTimerRef.current = null;
            }
          }
          break;

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
  }, [duration, isLive, onClose, onNextChannel, onPrevChannel, resetHideTimer, saveProgress]);

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
      {/* Elemento de Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onPlay={() => {
          setIsPlaying(true);
          resetHideTimer();
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

      {/* Capa de Controles OSD superpuesta */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-10 transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Cabecera Superior del Reproductor */}
        <div className="flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4 rounded-xl">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                saveProgress();
                onClose();
              }}
              className="pointer-events-auto p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                {isLive && channelNumber && (
                  <span className="px-2.5 py-0.5 rounded bg-red-600 text-white font-black text-xs">
                    CH {channelNumber}
                  </span>
                )}
                <h1 className="text-xl font-bold text-white drop-shadow">{title}</h1>
              </div>
              <p className="text-xs text-zinc-300">
                {isLive ? 'Transmisión en Vivo (HLS Directo)' : 'Película VOD'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded bg-zinc-800/80 border border-zinc-600 text-xs font-bold text-cyan-400">
              1080p FHD
            </span>
          </div>
        </div>

        {/* Zona Inferior: Barra de Progreso y Controles */}
        <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 rounded-xl flex flex-col space-y-4">
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

          {/* Botones de Control */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {!isLive && (
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                    }
                  }}
                  className="pointer-events-auto p-2 text-zinc-300 hover:text-white"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
              )}

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
                className="pointer-events-auto p-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-full shadow-lg shadow-cyan-500/50"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
              </button>

              {!isLive && (
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
                    }
                  }}
                  className="pointer-events-auto p-2 text-zinc-300 hover:text-white"
                >
                  <RotateCw className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Pistas de Audio y Subtítulos */}
            <div className="flex items-center space-x-4">
              {audioTracks.length > 1 && (
                <button
                  onClick={() => {
                    if (hlsRef.current) {
                      const nextTrack = (currentAudio + 1) % audioTracks.length;
                      hlsRef.current.audioTrack = nextTrack;
                      setCurrentAudio(nextTrack);
                    }
                  }}
                  className="pointer-events-auto flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold"
                >
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span>{audioTracks[currentAudio]?.name || 'Audio'}</span>
                </button>
              )}

              <div className="flex items-center space-x-2 text-xs text-zinc-400">
                <Subtitles className="w-4 h-4" />
                <span>Español</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
