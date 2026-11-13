import { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';
import jsQR from 'jsqr';
import { parseLobbyCode } from '../../utils/qrCodeHelper';
import { CrystalButton, CrystalPanel } from '../CrystalUI';
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
      className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col items-center justify-between overflow-hidden bg-[#3B82B6] text-[#15608E] select-none animate-fade-in p-4"
    >
      <IslandBackground />

      <header className="relative z-20 w-full max-w-lg flex items-center justify-between pt-2">
        <CrystalButton size="sm" tilt="left" onClick={onClose}>
          EXIT
        </CrystalButton>
        <span className="font-arcade text-lg tracking-wider text-white uppercase drop-shadow-[0_2px_0_rgba(14,62,96,0.65)]">
          QR SCANNER
        </span>
      </header>

      <main className="relative z-20 flex-1 min-h-0 w-full flex flex-col items-center justify-center overflow-y-auto p-3">
        {errorType !== 'none' ? (
          <div className="my-auto w-full max-w-sm pt-3">
            <CrystalPanel topTabLabel="CAMERA" title="NO CAMERA" contentClassName="gap-4">
              <CameraOff className="h-10 w-10 text-[#15608E]" />
              <p className="text-center text-sm font-bold text-[#15608E]">{errorMessage}</p>
              <CrystalButton fullWidth size="md" onClick={onSwitchToCodeEntry}>
                ENTER CODE
              </CrystalButton>
            </CrystalPanel>
          </div>
        ) : (
          <div className="my-auto w-full max-w-sm pt-3">
            <CrystalPanel topTabLabel="SCAN QR" contentClassName="gap-3">
              <div className="relative w-full aspect-square max-h-[46dvh] overflow-hidden border-[4px] border-[#17608E] bg-[#124B70] flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  muted
                  playsInline
                />

                <div className="relative z-10 w-48 h-48 border-[3px] border-[#9CE0FA] pointer-events-none flex items-center justify-center">
                  {hasScanned && (
                    <span className="font-arcade bg-[#2B9FD6] border-2 border-[#0E5A8A] px-4 py-1.5 text-sm text-white uppercase">
                      FOUND!
                    </span>
                  )}
                </div>

                {isInitializing && (
                  <div className="font-arcade absolute inset-0 bg-[#17608E]/85 flex items-center justify-center text-sm text-white uppercase">
                    STARTING CAMERA...
                  </div>
                )}
              </div>

              <CrystalButton
                fullWidth
                size="sm"
                variant="secondary"
                tilt="right"
                onClick={onSwitchToCodeEntry}
              >
                ENTER CODE
              </CrystalButton>
            </CrystalPanel>
          </div>
        )}
      </main>
    </div>
  );
}
