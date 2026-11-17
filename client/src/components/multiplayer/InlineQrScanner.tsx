import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraOff, ZoomIn, ZoomOut } from 'lucide-react';
import jsQR from 'jsqr';
import { parseLobbyCode } from '../../utils/qrCodeHelper';
import { OpenButton } from '../OpenSubpageUI';

interface InlineQrScannerProps {
  onScanSuccess: (code: string) => void;
  onSwitchToCodeEntry: () => void;
}

interface ZoomCapabilities {
  min: number;
  max: number;
  step: number;
  supported: boolean;
}

export function InlineQrScanner({
  onScanSuccess,
  onSwitchToCodeEntry,
}: InlineQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);
  const onScanSuccessRef = useRef(onScanSuccess);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  const [hasScanned, setHasScanned] = useState(false);
  const [errorType, setErrorType] = useState<
    'none' | 'permission_denied' | 'no_camera' | 'unsupported' | 'generic'
  >('none');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [zoom, setZoom] = useState(1);
  const [zoomCaps, setZoomCaps] = useState<ZoomCapabilities>({
    min: 1,
    max: 3,
    step: 0.1,
    supported: false,
  });

  const applyZoom = useCallback(
    async (nextRaw: number) => {
      const clamped = Math.min(zoomCaps.max, Math.max(zoomCaps.min, Number(nextRaw.toFixed(2))));
      setZoom(clamped);

      const track = videoTrackRef.current;
      if (track && zoomCaps.supported) {
        try {
          await track.applyConstraints({
            advanced: [{ zoom: clamped } as MediaTrackConstraintSet],
          });
        } catch {
          // Fallback auf CSS-Zoom bleibt aktiv, falls Browser Constraint ablehnt
        }
      }
    },
    [zoomCaps]
  );

  useEffect(() => {
    let active = true;

    const stopCamera = () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      videoTrackRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const startScanningLoop = () => {
      let detector: any = null;
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          detector = null;
        }
      }

      const scanFrame = async () => {
        if (!active) return;
        const video = videoRef.current;
        if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
          animFrameRef.current = requestAnimationFrame(scanFrame);
          return;
        }

        let detectedCode: string | null = null;

        if (detector) {
          try {
            const barcodes = await detector.detect(video);
            if (barcodes && barcodes.length > 0) {
              detectedCode = parseLobbyCode(barcodes[0].rawValue);
            }
          } catch {
            detector = null;
          }
        }

        if (!detectedCode) {
          let canvas = canvasRef.current;
          if (!canvas) {
            canvas = document.createElement('canvas');
            canvasRef.current = canvas;
          }

          const width = video.videoWidth;
          const height = video.videoHeight;
          if (width > 0 && height > 0) {
            canvas.width = Math.min(width, 640);
            canvas.height = Math.min(height, 480);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const qrResult = jsQR(imgData.data, canvas.width, canvas.height, {
                inversionAttempts: 'dontInvert',
              });
              if (qrResult && qrResult.data) {
                detectedCode = parseLobbyCode(qrResult.data);
              }
            }
          }
        }

        if (detectedCode) {
          setHasScanned(true);
          try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate(25);
            }
          } catch {
            // ignore
          }
          stopCamera();
          onScanSuccessRef.current(detectedCode);
          return;
        }

        animFrameRef.current = requestAnimationFrame(scanFrame);
      };

      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setErrorType('unsupported');
          setErrorMessage('Dein Browser unterstützt keinen direkten Kamera-Zugriff.');
          setIsInitializing(false);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0] || null;
        videoTrackRef.current = videoTrack;

        if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
          const caps = videoTrack.getCapabilities() as MediaTrackCapabilities & {
            zoom?: { min: number; max: number; step?: number };
          };
          if (caps?.zoom && typeof caps.zoom.max === 'number' && caps.zoom.max > caps.zoom.min) {
            const minZ = Math.max(1, caps.zoom.min || 1);
            const maxZ = Math.min(5, caps.zoom.max);
            setZoomCaps({
              min: minZ,
              max: maxZ,
              step: caps.zoom.step || 0.1,
              supported: true,
            });
            setZoom(minZ);
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
        }

        setIsInitializing(false);
        startScanningLoop();
      } catch (err: any) {
        if (!active) return;
        setIsInitializing(false);

        if (
          err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError' ||
          err.message?.includes('Permission')
        ) {
          setErrorType('permission_denied');
          setErrorMessage(
            'Kamera-Zugriff wurde verweigert. Bitte erlaube den Kamera-Zugriff oder gib den Code manuell ein.'
          );
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorType('no_camera');
          setErrorMessage('Keine Kamera gefunden. Du kannst den Code manuell eingeben.');
        } else {
          setErrorType('generic');
          setErrorMessage('Kamera konnte nicht gestartet werden.');
        }
      }
    }

    void startCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, []);

  const getTouchDistance = (touches: React.TouchList) => {
    const t0 = touches[0];
    const t1 = touches[1];
    if (!t0 || !t1) return 0;
    return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      pinchStartRef.current = {
        dist: getTouchDistance(e.touches),
        zoom,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartRef.current) {
      const dist = getTouchDistance(e.touches);
      if (pinchStartRef.current.dist > 0) {
        const ratio = dist / pinchStartRef.current.dist;
        void applyZoom(pinchStartRef.current.zoom * ratio);
      }
    }
  };

  const handleTouchEnd = () => {
    pinchStartRef.current = null;
  };

  if (errorType !== 'none') {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <CameraOff className="h-12 w-12 text-[#FDA4AF]" />
        <p className="text-sm text-[#CBD5E1]">{errorMessage}</p>
        <div className="w-full max-w-xs">
          <OpenButton fullWidth size="lg" variant="primary" onClick={onSwitchToCodeEntry}>
            CODE EINGEBEN
          </OpenButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      {/* Sucher mit Pinch-to-Zoom auf Smartphones */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="qr-scanner-landscape relative w-full max-w-[280px] sm:max-w-[320px] aspect-square overflow-hidden rounded-2xl border border-white/20 bg-[#0F172A] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center touch-none"
      >
        <video
          ref={videoRef}
          style={!zoomCaps.supported ? { transform: `scale(${zoom})` } : undefined}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-100"
          muted
          playsInline
        />

        <div className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 landscape:w-32 landscape:h-32 rounded-xl border-2 border-[#F59E0B] pointer-events-none flex items-center justify-center">
          {hasScanned && (
            <span className="font-arcade rounded-lg border border-[#34D399]/60 bg-[#10B981] px-4 py-1.5 text-sm text-white uppercase">
              GEFUNDEN!
            </span>
          )}
        </div>

        {isInitializing && (
          <div className="font-arcade absolute inset-0 bg-[#0F172A]/85 flex items-center justify-center text-sm text-white uppercase">
            KAMERA STARTET...
          </div>
        )}
      </div>

      {/* Smartphone Zoom-Steuerung (Hardware-Zoom oder digitaler Fallback) */}
      <div className="flex w-full max-w-[300px] items-center gap-2.5 px-1">
        <button
          type="button"
          onClick={() => void applyZoom(zoom - 0.25)}
          disabled={zoom <= zoomCaps.min}
          aria-label="Herauszoomen"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/[0.05] text-white/85 hover:bg-white/15 disabled:opacity-35 cursor-pointer active:scale-95"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <input
          type="range"
          min={zoomCaps.min}
          max={zoomCaps.max}
          step={zoomCaps.step}
          value={zoom}
          onChange={(e) => void applyZoom(parseFloat(e.target.value))}
          aria-label="Kamera-Zoom"
          className="h-1.5 flex-1 cursor-pointer accent-[#F59E0B]"
        />

        <button
          type="button"
          onClick={() => void applyZoom(zoom + 0.25)}
          disabled={zoom >= zoomCaps.max}
          aria-label="Hereinzoomen"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/[0.05] text-white/85 hover:bg-white/15 disabled:opacity-35 cursor-pointer active:scale-95"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <span className="font-arcade w-10 text-right text-[11px] text-[#FDE68A] tabular-nums">
          {zoom.toFixed(1)}×
        </span>
      </div>

      <div className="w-full max-w-xs">
        <OpenButton
          fullWidth
          size="md"
          variant="outline-amber"
          onClick={onSwitchToCodeEntry}
        >
          CODE EINGEBEN
        </OpenButton>
      </div>
    </div>
  );
}
