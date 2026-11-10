import { useEffect, useRef, useState } from 'react';
import { Compass, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
}

// Typ-Erweiterung für iOS 13+ Gyroskop-Berechtigung
interface IOSDeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Normalisierte Neigungswerte im Bereich [-1, 1] für 3D-Parallax
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [sensorActive, setSensorActive] = useState(false);
  const targetTilt = useRef({ x: 0, y: 0 });
  const currentTilt = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // 1. Gleichmäßiger, eleganter Ladeverlauf (ca. 3.2 Sekunden bis 100%)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return Math.min(100, prev + 1);
      });
    }, 32);

    // 2. Nach ca. 3.7 Sekunden sanftes Ausblenden starten
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 3700);

    // 3. Nach ca. 4.3 Sekunden vollständig beenden
    const completeTimer = setTimeout(() => {
      setIsDone(true);
      onFinish?.();
    }, 4300);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onFinish]);

  useEffect(() => {
    // Butterweiche Interpolation (Lerp) für flüssige 60fps 3D-Neigung
    let rafId: number;
    const animateTilt = () => {
      currentTilt.current.x += (targetTilt.current.x - currentTilt.current.x) * 0.14;
      currentTilt.current.y += (targetTilt.current.y - currentTilt.current.y) * 0.14;
      setTilt({
        x: Number(currentTilt.current.x.toFixed(3)),
        y: Number(currentTilt.current.y.toFixed(3)),
      });
      rafId = requestAnimationFrame(animateTilt);
    };
    rafId = requestAnimationFrame(animateTilt);

    // Smartphone Gyroskop-Sensor (DeviceOrientation)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null && e.beta === null) return;
      setSensorActive(true);
      // gamma: Links/Rechts Neigung (-35° bis +35°)
      const rawX = (e.gamma ?? 0) / 30;
      // beta: Vor/Zurück Neigung (zentriert um typische 45° Halteposition)
      const rawY = ((e.beta ?? 45) - 45) / 30;

      targetTilt.current = {
        x: Math.max(-1, Math.min(1, rawX)),
        y: Math.max(-1, Math.min(1, rawY)),
      };
    };

    // Fallback über Beschleunigungssensor (DeviceMotion / Gravitation)
    const handleMotion = (e: DeviceMotionEvent) => {
      if (sensorActive) return;
      const acc = e.accelerationIncludingGravity;
      if (!acc || (acc.x === null && acc.y === null)) return;
      const rawX = -(acc.x ?? 0) / 7;
      const rawY = ((acc.y ?? -5) + 5) / 7;
      targetTilt.current = {
        x: Math.max(-1, Math.min(1, rawX)),
        y: Math.max(-1, Math.min(1, rawY)),
      };
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [sensorActive]);

  // iOS 13+ Berechtigung bei Berührung anfragen & Touch/Maus-Parallax unterstützen
  const requestIOSMotionPermission = async () => {
    try {
      const DOE = DeviceOrientationEvent as unknown as IOSDeviceOrientationEvent;
      if (typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission();
        if (res === 'granted') setSensorActive(true);
      }
    } catch {
      // Ignorieren falls nicht benötigt
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const normY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    targetTilt.current = {
      x: Math.max(-1, Math.min(1, normX)),
      y: Math.max(-1, Math.min(1, normY)),
    };
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFadingOut(true);
    setTimeout(() => {
      setIsDone(true);
      onFinish?.();
    }, 300);
  };

  if (isDone) return null;

  // Berechnete 3D-Werte aus der Smartphone-Bewegung
  const rotateX = -tilt.y * 22;
  const rotateY = tilt.x * 22;
  const shiftX = tilt.x * 14;
  const shiftY = tilt.y * 14;

  return (
    <div
      onPointerDown={requestIOSMotionPermission}
      onPointerMove={handlePointerMove}
      role="presentation"
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#07070C] select-none transition-all duration-600 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* ─── Epische Parallax Hintergrund-Lichtkugeln (bewegen sich gegenläufig zur Neigung) ─── */}
      <div
        style={{
          transform: `translate3d(${-tilt.x * 45}px, ${-tilt.y * 45}px, 0)`,
        }}
        className="pointer-events-none absolute h-80 w-80 rounded-full bg-gradient-to-tr from-purple-600/35 to-pink-600/25 blur-3xl transition-transform duration-75"
      />
      <div
        style={{
          transform: `translate3d(${tilt.x * 35}px, ${tilt.y * 35}px, 0)`,
        }}
        className="pointer-events-none absolute -bottom-10 h-72 w-72 rounded-full bg-gradient-to-tr from-amber-500/25 to-orange-600/20 blur-3xl transition-transform duration-75"
      />

      {/* ─── Zentrierter 3D-Spielbox-Bereich ─── */}
      <div
        style={{ perspective: '900px' }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* 3D Neigbare Spielbox */}
        <div
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate3d(${shiftX}px, ${shiftY}px, 0)`,
            transformStyle: 'preserve-3d',
          }}
          className="relative mb-7 transition-transform duration-75 ease-out"
        >
          {/* Pulsierender Umkreis-Glow */}
          <div className="absolute -inset-2 rounded-[36px] bg-gradient-to-tr from-[#7C5CFA] via-[#EC4899] to-[#F59E0B] blur-xl opacity-65 animate-splash-pulse-ring" />

          {/* Äußerer iOS Squircle Container */}
          <div className="relative grid h-32 w-32 sm:h-36 sm:w-36 place-items-center rounded-[32px] bg-gradient-to-br from-[#1E1B2E] via-[#2D2447] to-[#12101B] shadow-[0_28px_65px_rgba(0,0,0,0.75)] ring-1 ring-white/25 overflow-hidden animate-splash-float">
            {/* Dynamischer Hologramm-Lichtreflex (reagiert direkt auf die Neigung) */}
            <div
              style={{
                transform: `translate3d(${-tilt.x * 55}px, ${-tilt.y * 55}px, 0)`,
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 70%)',
              }}
              className="pointer-events-none absolute h-40 w-40 rounded-full mix-blend-overlay"
            />

            {/* Diagonaler Glanzstreifen */}
            <div className="pointer-events-none absolute inset-0 -top-8 -bottom-8 w-14 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-splash-shine" />

            {/* Innerer 3D Spielbox-Würfel mit eigenem Parallax-Vorsprung */}
            <svg
              style={{
                transform: `translate3d(${tilt.x * 9}px, ${tilt.y * 9}px, 24px)`,
              }}
              className="h-20 w-20 sm:h-22 sm:w-22 drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)] transition-transform duration-75"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="topFace" x1="50" y1="18" x2="50" y2="44" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#C4B5FD" />
                  <stop offset="1" stopColor="#7C3AED" />
                </linearGradient>
                <linearGradient id="leftFace" x1="18" y1="44" x2="50" y2="82" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6344F5" />
                  <stop offset="1" stopColor="#4326C9" />
                </linearGradient>
                <linearGradient id="rightFace" x1="50" y1="44" x2="82" y2="82" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4F46E5" />
                  <stop offset="1" stopColor="#312E81" />
                </linearGradient>
                <linearGradient id="coreGlow" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#FDE047" />
                  <stop offset="1" stopColor="#F97316" />
                </linearGradient>
              </defs>

              {/* Isometrische Spielbox: Deckel */}
              <polygon points="50,15 83,32 50,48 17,32" fill="url(#topFace)" />
              <polygon points="50,20 75,33 50,45 25,33" fill="#EDE9FE" opacity="0.45" />

              {/* Linke & Rechte Würfelseite */}
              <polygon points="17,32 50,48 50,85 17,68" fill="url(#leftFace)" />
              <polygon points="50,48 83,32 83,68 50,85" fill="url(#rightFace)" />

              {/* D-Pad links */}
              <g transform="translate(30, 53) skewY(26) scale(0.68)">
                <rect x="-2.2" y="-9" width="4.4" height="18" rx="2" fill="#E0E7FF" opacity="0.9" />
                <rect x="-9" y="-2.2" width="18" height="4.4" rx="2" fill="#E0E7FF" opacity="0.9" />
              </g>

              {/* 4 Farbige Arcade-Buttons rechts */}
              <g transform="translate(68, 54) skewY(-26) scale(0.82)">
                <circle cx="-6" cy="0" r="3.2" fill="#FB923C" />
                <circle cx="6" cy="0" r="3.2" fill="#34D399" />
                <circle cx="0" cy="-6" r="3.2" fill="#C084FC" />
                <circle cx="0" cy="6" r="3.2" fill="#38BDF8" />
              </g>

              {/* Leuchtender Kern */}
              <circle cx="50" cy="48" r="4.2" fill="url(#coreGlow)" />
              <circle cx="50" cy="48" r="6.5" stroke="#FEF08A" strokeWidth="1.2" opacity="0.8" />
            </svg>
          </div>
        </div>

        {/* ─── Titel & Subline (mit sanftem Parallax-Versatz) ─── */}
        <div
          style={{
            transform: `translate3d(${tilt.x * 6}px, ${tilt.y * 6}px, 0)`,
          }}
          className="text-center transition-transform duration-75"
        >
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#A78BFA] mb-1">
            <Sparkles className="h-3 w-3" />
            <span>Minigame Arcade</span>
            <Sparkles className="h-3 w-3" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            PROJEKT
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFA] to-[#EC4899]">
              BOX
            </span>
          </h1>

          <p className="mt-1 text-xs font-semibold text-[#98989D] tracking-wide">
            Dein interaktiver Spielplatz
          </p>
        </div>

        {/* ─── iOS Ladebalken & Status ─── */}
        <div className="mt-7 flex flex-col items-center w-52 sm:w-60">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/15 backdrop-blur-md">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7C5CFA] via-[#A855F7] to-[#EC4899] transition-all duration-75 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-2.5 flex w-full items-center justify-between text-[10px] font-bold tracking-wider text-[#8E8E93] uppercase">
            <span>
              {progress < 40
                ? 'Initialisiere Spielbox...'
                : progress < 85
                  ? 'Lade Minispiele...'
                  : progress < 100
                    ? 'Fast bereit...'
                    : 'Startklar!'}
            </span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* ─── 3D Bewegungs-Indikator Pille ─── */}
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1 text-[10px] font-semibold text-[#98989D] backdrop-blur-md">
          <Compass
            style={{ transform: `rotate(${tilt.x * 45}deg)` }}
            className="h-3.5 w-3.5 text-[#A78BFA] transition-transform duration-75"
          />
          <span>Bewege dein Smartphone für 3D-Effekt</span>
        </div>
      </div>

      {/* ─── Überspringen-Button unten ─── */}
      <button
        type="button"
        onClick={handleSkip}
        style={{
          bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.75rem))',
        }}
        className="absolute rounded-full bg-white/[0.08] px-4 py-1.5 text-[11px] font-bold tracking-wide text-[#AEAEB2] backdrop-blur-md transition-transform active:scale-95 cursor-pointer"
      >
        Überspringen ›
      </button>
    </div>
  );
}
