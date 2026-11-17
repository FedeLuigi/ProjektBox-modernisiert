import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CameraOff } from 'lucide-react';
import jsQR from 'jsqr';
import { parseLobbyCode } from '../../utils/qrCodeHelper';
import { OpenButton } from '../OpenSubpageUI';

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

  useEffect(() => {
    if (!isOpen) return;

    setHasScanned(false);
    setErrorType('none');
    setErrorMessage(null);
    setIsInitializing(true);

    let active = true;

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
          onScanSuccess(detectedCode);
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

    startCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="QR-Code scannen"
      onClick={onClose}
      className="fixed inset-0 min-h-dvh z-60 flex w-full flex-col items-center justify-between overflow-y-auto overflow-x-hidden bg-[#0F172A]/85 p-4 sm:p-8 backdrop-blur-md text-white select-none animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-1 min-h-0 w-full max-w-xl flex-col justify-between"
      >
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={onClose}
            className="font-arcade inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-3 text-xs tracking-wider text-white uppercase hover:bg-white/12 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>ZURÜCK</span>
          </button>
        </div>

        <div className="my-auto flex w-full flex-col items-center gap-6 py-4 text-center">
          <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
            <span className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
              QR-CODE <span className="text-[#FBBF24]">SCANNEN</span>
            </span>
          </div>

          {errorType !== 'none' ? (
            <div className="flex w-full max-w-sm flex-col items-center gap-4">
              <CameraOff className="h-12 w-12 text-[#FDA4AF]" />
              <p className="text-sm text-[#CBD5E1]">{errorMessage}</p>
              <div className="w-full max-w-xs">
                <OpenButton
                  fullWidth
                  size="lg"
                  variant="primary"
                  onClick={onSwitchToCodeEntry}
                >
                  CODE EINGEBEN
                </OpenButton>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col items-center gap-5">
              <div className="relative w-full max-w-[280px] sm:max-w-[320px] landscape:max-w-[200px] aspect-square overflow-hidden rounded-2xl border border-white/20 bg-[#0F172A] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full object-cover"
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

              <p className="max-w-xs text-xs sm:text-sm text-[#CBD5E1]">
                Richte die Kamera auf den QR-Code oder gib den Code manuell ein.
              </p>

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
          )}
        </div>

        <div aria-hidden="true" className="h-4" />
      </div>
    </div>
  );
}
