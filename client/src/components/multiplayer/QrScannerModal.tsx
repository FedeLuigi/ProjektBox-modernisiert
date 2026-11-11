import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, KeyRound, X } from 'lucide-react';
import jsQR from 'jsqr';
import { parseLobbyCode } from '../../utils/qrCodeHelper';
import {
  BTN_PRIMARY_BASE,
  BTN_PRIMARY_ENABLED,
  BTN_SECONDARY_BASE,
  BTN_SECONDARY_NEUTRAL,
} from '../../styles/uiTokens';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
  onSwitchToCodeEntry: () => void;
}

export function QrScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  onSwitchToCodeEntry,
}: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [hasScanned, setHasScanned] = useState(false);
  const [errorType, setErrorType] = useState<
    'none' | 'permission_denied' | 'no_camera' | 'unsupported' | 'generic'
  >('none');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Kamera starten und Scan-Loop initialisieren
  useEffect(() => {
    if (!isOpen) return;

    setHasScanned(false);
    setErrorType('none');
    setErrorMessage(null);
    setIsInitializing(true);

    let active = true;

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
            'Kamera-Zugriff wurde verweigert. Bitte erlaube den Kamera-Zugriff in deinen Systemeinstellungen oder tritt mit dem Code bei.'
          );
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorType('no_camera');
          setErrorMessage('Keine Kamera auf diesem Gerät gefunden. Du kannst den Code manuell eingeben.');
        } else {
          setErrorType('generic');
          setErrorMessage('Kamera konnte nicht gestartet werden: ' + (err.message || 'Unbekannter Fehler'));
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Kontinuierliche Scan-Schleife (BarcodeDetector mit jsQR-Fallback)
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
      const video = videoRef.current;
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      let detectedCode: string | null = null;

      // 1. Primär: Native BarcodeDetector API (extrem schnell & nativ)
      if (detector) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0) {
            detectedCode = parseLobbyCode(barcodes[0].rawValue);
          }
        } catch {
          // Fallback auf Canvas & jsQR
          detector = null;
        }
      }

      // 2. Lokaler Fallback: jsQR (vollständig offline auf Canvas für iOS / Safari)
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

      // Wenn ein valider Lobby-Code erkannt wurde
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
        onScanSuccess(detectedCode);
        return;
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      className="fixed inset-0 z-50 flex h-full min-h-screen w-full flex-col items-center justify-between overflow-hidden bg-black/95 text-white select-none animate-fade-in"
    >
      {/* ─── KOPFZEILE MIT SCHLIESSEN-BUTTON ─── */}
      <header
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
        className="w-full flex items-center justify-between px-5 pt-4 z-20"
      >
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30">
            <Camera className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white leading-tight">QR-Code scannen</h2>
            <p className="text-[11px] text-[#8E8E93]">Halte die Kamera auf den Fernseher</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* ─── MITTE: KAMERA-VIEWFINDER ODER FEHLERMELDUNG ─── */}
      <main className="relative flex-1 w-full flex flex-col items-center justify-center p-4">
        {errorType !== 'none' ? (
          /* Fehlermeldung mit sauberer Alternative per Code-Eingabe */
          <div className="w-full max-w-sm rounded-3xl bg-[#161622]/95 p-6 ring-1 ring-rose-500/30 backdrop-blur-2xl text-center flex flex-col items-center shadow-2xl animate-fade-in">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-400 mb-4 ring-1 ring-rose-500/30">
              <CameraOff className="h-7 w-7" />
            </div>

            <h3 className="text-base font-black text-white">Kamera nicht verfügbar</h3>
            <p className="mt-2 text-xs leading-relaxed text-[#AEAEB2]">{errorMessage}</p>

            <button
              type="button"
              onClick={onSwitchToCodeEntry}
              className={`mt-6 ${BTN_PRIMARY_BASE} ${BTN_PRIMARY_ENABLED}`}
            >
              <KeyRound className="h-4 w-4" />
              <span>Stattdessen Code manuell eingeben</span>
            </button>
          </div>
        ) : (
          /* Aktiver Scanner mit dezentem Fadenkreuz */
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-xs sm:max-w-sm aspect-square rounded-[32px] overflow-hidden ring-1 ring-white/15 bg-black flex items-center justify-center shadow-2xl">
              {/* Live Video */}
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                muted
                playsInline
              />

              {/* Dezente Zielhilfe: Schlichte, elegante Eckwinkel im ProjektBox Neonstil */}
              <div className="relative z-10 w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center pointer-events-none">
                {/* 4 saubere Neon-Eckwinkel (keine Doppel-Linien, kein wandernder Laser) */}
                <div
                  className={`absolute top-0 left-0 w-7 h-7 sm:w-8 sm:h-8 border-t-2 border-l-2 rounded-tl-xl transition-colors duration-200 ${
                    hasScanned
                      ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]'
                      : 'border-purple-400/90 shadow-[0_0_10px_rgba(168,85,247,0.45)]'
                  }`}
                />
                <div
                  className={`absolute top-0 right-0 w-7 h-7 sm:w-8 sm:h-8 border-t-2 border-r-2 rounded-tr-xl transition-colors duration-200 ${
                    hasScanned
                      ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]'
                      : 'border-purple-400/90 shadow-[0_0_10px_rgba(168,85,247,0.45)]'
                  }`}
                />
                <div
                  className={`absolute bottom-0 left-0 w-7 h-7 sm:w-8 sm:h-8 border-b-2 border-l-2 rounded-bl-xl transition-colors duration-200 ${
                    hasScanned
                      ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]'
                      : 'border-purple-400/90 shadow-[0_0_10px_rgba(168,85,247,0.45)]'
                  }`}
                />
                <div
                  className={`absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 border-b-2 border-r-2 rounded-br-xl transition-colors duration-200 ${
                    hasScanned
                      ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]'
                      : 'border-purple-400/90 shadow-[0_0_10px_rgba(168,85,247,0.45)]'
                  }`}
                />

                {hasScanned && (
                  <div className="rounded-full px-4 py-2 bg-emerald-500/90 text-white font-bold text-xs sm:text-sm shadow-lg backdrop-blur-md flex items-center gap-1.5 animate-fade-in">
                    <span>✓</span>
                    <span>Lobby erkannt</span>
                  </div>
                )}
              </div>

              {isInitializing && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-xs text-[#8E8E93] font-semibold">
                  Kamera wird gestartet...
                </div>
              )}
            </div>

            <p className="mt-4 text-xs font-medium text-[#8E8E93] text-center">
              QR-Code auf dem Fernseher anvisieren
            </p>
          </div>
        )}
      </main>

      {/* ─── FUSSZEILE MIT ALTERNATIVE PER CODE ─── */}
      <footer
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        className="w-full max-w-sm px-6 pb-4 z-20 flex flex-col items-center gap-2"
      >
        <button
          type="button"
          onClick={onSwitchToCodeEntry}
          className={`${BTN_SECONDARY_BASE} ${BTN_SECONDARY_NEUTRAL}`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Lieber 5-stelligen Code eingeben</span>
        </button>
      </footer>
    </div>
  );
}
