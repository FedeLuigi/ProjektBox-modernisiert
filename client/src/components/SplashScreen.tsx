import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // 1. Zügiger Fortschrittsbalken (ca. 1.1 Sekunden für flüssiges Erlebnis)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Leicht variierende Schritte für authentisches Laden
        const step = prev < 60 ? 14 : prev < 90 ? 8 : 4;
        return Math.min(100, prev + step);
      });
    }, 45);

    // 2. Sanfter Übergang: Nach Erreichen von 100% ein kurzes Verweilen, dann Ausblenden
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 1250);

    // 3. Nach Beendigung des Fade-Outs Komponente aus dem DOM aushängen
    const completeTimer = setTimeout(() => {
      setIsDone(true);
      onFinish?.();
    }, 1750);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onFinish]);

  // Sofort überspringen bei Klick/Tippen
  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsDone(true);
      onFinish?.();
    }, 350);
  };

  if (isDone) return null;

  return (
    <div
      onClick={handleSkip}
      role="presentation"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#F2F2F7] dark:bg-[#0B0B0F] select-none transition-all duration-500 ease-out cursor-pointer ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* ─── Ambient Glow Kugeln im Hintergrund ─── */}
      <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-gradient-to-tr from-purple-500/30 to-pink-500/25 dark:from-purple-600/25 dark:to-pink-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 h-64 w-64 rounded-full bg-gradient-to-tr from-amber-400/25 to-orange-500/20 dark:from-amber-500/15 dark:to-orange-600/15 blur-3xl" />

      {/* ─── Zentrierter Spielbox-Körper ─── */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Pulsierender Umkreis-Glow */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-[34px] bg-gradient-to-tr from-[#7C5CFA] via-[#EC4899] to-[#F59E0B] blur-xl opacity-60 animate-splash-pulse-ring" />

          {/* Animiertes Logo: Schwebende iOS-Spielbox mit Glanzeffekt */}
          <div className="relative grid h-28 w-28 sm:h-32 sm:w-32 place-items-center rounded-[30px] bg-gradient-to-br from-[#1E1B2E] via-[#2D2447] to-[#14121F] shadow-[0_24px_50px_rgba(30,27,46,0.35)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.7)] ring-1 ring-white/20 overflow-hidden animate-splash-float">
            {/* Diagonaler Lichtstreif (Shimmer) */}
            <div className="pointer-events-none absolute inset-0 -top-8 -bottom-8 w-14 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-splash-shine" />

            {/* 3D Spielbox SVG Artwork */}
            <svg
              className="h-18 w-18 sm:h-20 sm:w-20 drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Farbverlauf Oberseite */}
                <linearGradient id="topFace" x1="50" y1="18" x2="50" y2="44" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#A78BFA" />
                  <stop offset="1" stopColor="#7C3AED" />
                </linearGradient>
                {/* Farbverlauf Linke Seite */}
                <linearGradient id="leftFace" x1="18" y1="44" x2="50" y2="82" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6344F5" />
                  <stop offset="1" stopColor="#4326C9" />
                </linearGradient>
                {/* Farbverlauf Rechte Seite */}
                <linearGradient id="rightFace" x1="50" y1="44" x2="82" y2="82" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4F46E5" />
                  <stop offset="1" stopColor="#312E81" />
                </linearGradient>
                {/* Goldener Kern */}
                <linearGradient id="coreGlow" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#FDE047" />
                  <stop offset="1" stopColor="#F97316" />
                </linearGradient>
              </defs>

              {/* Isometrische Spielbox: Top Face (Deckel) */}
              <polygon points="50,16 82,32 50,48 18,32" fill="url(#topFace)" />
              {/* Top Face Akzentlinie */}
              <polygon points="50,21 75,33 50,45 25,33" fill="#C4B5FD" opacity="0.4" />

              {/* Isometrische Spielbox: Left Face */}
              <polygon points="18,32 50,48 50,84 18,68" fill="url(#leftFace)" />

              {/* Isometrische Spielbox: Right Face */}
              <polygon points="50,48 82,32 82,68 50,84" fill="url(#rightFace)" />

              {/* D-Pad auf der linken Würfelseite */}
              <g transform="translate(30, 52) skewY(26) scale(0.65)">
                <rect x="-2" y="-9" width="4" height="18" rx="2" fill="#E0E7FF" opacity="0.85" />
                <rect x="-9" y="-2" width="18" height="4" rx="2" fill="#E0E7FF" opacity="0.85" />
              </g>

              {/* 4 Bunte Tasten auf der rechten Würfelseite (die 4 Spiel-Farben) */}
              <g transform="translate(68, 54) skewY(-26) scale(0.8)">
                {/* Sunset Orange (Memory) */}
                <circle cx="-6" cy="0" r="3" fill="#FB923C" />
                {/* Emerald Green (Reflex) */}
                <circle cx="6" cy="0" r="3" fill="#34D399" />
                {/* Indigo Purple (4 Gewinnt) */}
                <circle cx="0" cy="-6" r="3" fill="#C084FC" />
                {/* Ocean Blue (Tic Tac Toe) */}
                <circle cx="0" cy="6" r="3" fill="#38BDF8" />
              </g>

              {/* Strahlender Mittelpunkt / Schloss */}
              <circle cx="50" cy="48" r="4" fill="url(#coreGlow)" />
              <circle cx="50" cy="48" r="6" stroke="#FEF08A" strokeWidth="1.2" opacity="0.75" />
            </svg>
          </div>
        </div>

        {/* ─── Titel & Subline ─── */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#7C5CFA] dark:text-[#A78BFA] mb-1">
            <Sparkles className="h-3 w-3" />
            <span>Minigame Arcade</span>
            <Sparkles className="h-3 w-3" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1C1C1E] dark:text-white">
            PROJEKT<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFA] to-[#EC4899]">BOX</span>
          </h1>

          <p className="mt-1 text-xs font-semibold text-[#8E8E93] dark:text-[#98989D] tracking-wide">
            Dein interaktiver Spielplatz
          </p>
        </div>

        {/* ─── iOS Ladebalken & Status ─── */}
        <div className="mt-8 flex flex-col items-center w-48 sm:w-56">
          {/* Ladebalken-Kapsel */}
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15 backdrop-blur-md">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7C5CFA] via-[#A855F7] to-[#EC4899] transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status-Text & Prozentzahl */}
          <div className="mt-2.5 flex w-full items-center justify-between text-[10px] font-bold tracking-wider text-[#8E8E93] dark:text-[#8E8E93] uppercase">
            <span>{progress < 100 ? 'Lade Spiele...' : 'Bereit'}</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>

      {/* Dezenter iOS Überspringen-Hinweis am unteren Bildschirmrand */}
      <div className="absolute bottom-6 text-[10px] font-medium tracking-wide text-[#AEAEB2] dark:text-[#636366]">
        Tippen zum Überspringen
      </div>
    </div>
  );
}
