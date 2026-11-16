import { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';
import jsQR from 'jsqr';
import { parseLobbyCode } from '../../utils/qrCodeHelper';
import { OpenButton, OpenSubpageHeader } from '../OpenSubpageUI';
import { IslandBackground } from '../IslandBackground';

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
      className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col items-center justify-between overflow-hidden bg-[#1B2B40] text-white select-none animate-fade-in pb-4 landscape:pb-2"
    >
      <IslandBackground />

      <OpenSubpageHeader
        backLabel="ABBRECHEN"
        onBack={onClose}
        title="QR-CODE"
        accentWord="SCANNER"
      />

      <main className="relative z-20 flex-1 min-h-0 w-full flex flex-col items-center justify-center overflow-y-auto p-4 landscape:p-2">
        {errorType !== 'none' ? (
          <div className="tablet-modal-box my-auto w-full max-w-sm landscape:max-w-md rounded-2xl border border-white/15 bg-[#0F172A]/85 p-6 text-center backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] flex flex-col items-center gap-4">
            <CameraOff className="h-10 w-10 landscape:h-7 landscape:w-7 text-[#FDA4AF]" />
            <p className="text-sm landscape:text-xs text-[#CBD5E1]">{errorMessage}</p>
            <OpenButton fullWidth size="md" variant="primary" onClick={onSwitchToCodeEntry} className="landscape:h-9 landscape:text-xs">
              CODE EINGEBEN
            </OpenButton>
          </div>
        ) : (
          <div className="tablet-modal-box my-auto w-full max-w-sm landscape:max-w-lg rounded-2xl border border-white/15 bg-[#0F172A]/85 p-5 landscape:p-4 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] flex flex-col landscape:flex-row landscape:items-center gap-4">
            <div className="relative w-full aspect-square max-h-[46dvh] landscape:max-h-none landscape:w-40 landscape:h-40 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-[#0F172A] flex items-center justify-center">
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                muted
                playsInline
              />

              <div className="relative z-10 w-48 h-48 landscape:w-28 landscape:h-28 rounded-xl border-2 border-[#F59E0B] pointer-events-none flex items-center justify-center">
                {hasScanned && (
                  <span className="font-arcade rounded-lg border border-[#34D399]/60 bg-[#10B981] px-4 py-1.5 text-sm landscape:text-xs text-white uppercase">
                    GEFUNDEN!
                  </span>
                )}
              </div>

              {isInitializing && (
                <div className="font-arcade absolute inset-0 bg-[#0F172A]/85 flex items-center justify-center text-sm landscape:text-xs text-white uppercase">
                  KAMERA STARTET...
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-center gap-3 w-full landscape:flex-1">
              <p className="text-center text-xs text-[#CBD5E1]">
                Richte die Kamera auf den QR-Code am TV oder gib den Code manuell ein.
              </p>
              <OpenButton
                fullWidth
                size="sm"
                variant="outline-amber"
                onClick={onSwitchToCodeEntry}
                className="landscape:h-9 landscape:text-xs"
              >
                CODE EINGEBEN
              </OpenButton>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
