import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface HLSPlayerProps {
  url: string;
  playing: boolean;
  onError?: (error: any) => void;
  onReady?: () => void;
}

export default function HLSPlayer({ url, playing, onError, onReady }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initPlayer = () => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setLoading(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Check if it's an HLS stream source by extension / url contains
    const isHLS = url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('m3u8');

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        }
      });

      hls.loadSource(url);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        onReady?.();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("HLS Network Error:", data);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("HLS Media Error:", data);
              hls.recoverMediaError();
              break;
            default:
              console.error("HLS Fatal Error:", data);
              setError("Erro fatal ao carregar o vídeo");
              onError?.(data);
              hls.destroy();
              break;
          }
        }
      });
    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = url;
    } else {
      // Direct file play (MP4, MP4 fallback, or standard direct layouts)
      video.src = url;
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    
    const handleLoadedMetadata = () => {
      setLoading(false);
      onReady?.();
    };

    const handleCanPlay = () => {
      setLoading(false);
    };

    const handleNativeError = (e: any) => {
      console.error("Native Video Error Event:", e);
      setError("Não foi possível reproduzir este vídeo. Certifique-se de que o URL do vídeo é direto (ex: MP4, M3U8, etc) e está ativo.");
      onError?.(e);
    };

    if (video) {
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleNativeError);
    }

    initPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleNativeError);
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Play interrupted or failed:", error);
        });
      }
    } else {
      video.pause();
    }
  }, [playing]);

  return (
    <div className="relative w-full h-full bg-black group">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        playsInline
      />
      
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black transition-opacity duration-300">
          <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
          <p className="text-white font-bold animate-pulse text-sm uppercase tracking-widest">Carregando Conteúdo...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-900 z-20 p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Ops! Algo deu errado</h3>
          <p className="text-gray-400 mb-6 max-w-xs">{error}</p>
          <button 
            onClick={initPlayer}
            className="flex items-center gap-2 px-6 py-2 bg-brand text-white font-bold rounded-lg hover:brightness-110 transition-all"
          >
            <RefreshCw size={18} /> TENTAR NOVAMENTE
          </button>
        </div>
      )}
    </div>
  );
}
