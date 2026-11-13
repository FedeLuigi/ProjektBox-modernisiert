import { useState } from 'react';
import { type ArtVariant, type Game, TONE_STYLES } from '../data/games';

interface GameCardProps {
  game: Game;
  isActive: boolean;
  isUnlocked: boolean;
  starsEarned: number;
  onSelect: () => void;
  onPlay: () => void;
  onUnlockRequest: () => void;
}

/* ─── Goldener 5-Zack-Stern mit weißem Sticker-Rand (unten links in offenen Karten) ─── */
function GoldenStarBadge({ className = 'h-11 w-11' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`${className} drop-shadow-[0_3px_4px_rgba(0,0,0,0.45)]`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Weißer dicker Sticker-Umriss */}
      <path
        d="M32 4 L40.5 20.2 L58.5 23.2 L45.8 36.2 L48.5 54.2 L32 46 L15.5 54.2 L18.2 36.2 L5.5 23.2 L23.5 20.2 Z"
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {/* Goldener Stern-Körper */}
      <path
        d="M32 6 L39.8 21 L56.5 23.8 L44.6 35.8 L47.1 52.5 L32 44.8 L16.9 52.5 L19.4 35.8 L7.5 23.8 L24.2 21 Z"
        fill="url(#starGoldGrad)"
        stroke="#C26D0A"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Innerer Glanzpunkt */}
      <path
        d="M32 11 L37.5 22 L49.5 24 L40.8 32.8 L42.6 45 L32 39.5"
        fill="#FEF08A"
        fillOpacity="0.55"
      />
      <ellipse
        cx="25"
        cy="23"
        rx="4.5"
        ry="2.5"
        transform="rotate(-25 25 23)"
        fill="#FFFFFF"
        fillOpacity="0.85"
      />
      <defs>
        <linearGradient id="starGoldGrad" x1="12" y1="8" x2="50" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── Großes glänzendes 3D-Cartoon-Vorhängeschloss für gesperrte Karten ─── */
function CartoonPadlock({ wiggling }: { wiggling: boolean }) {
  return (
    <div
      className={`relative flex items-center justify-center ${
        wiggling ? 'animate-lock-wiggle' : 'transition-transform duration-200 group-hover:scale-105'
      }`}
    >
      <svg
        viewBox="0 0 120 135"
        className="h-28 w-25 sm:h-32 sm:w-28 drop-shadow-[0_8px_10px_rgba(12,16,48,0.55)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="lockBodyGrad" x1="25" y1="45" x2="95" y2="122" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F1F7FD" />
            <stop offset="55%" stopColor="#CFE2F3" />
            <stop offset="100%" stopColor="#9DB9D8" />
          </linearGradient>
          <linearGradient id="lockShackleGrad" x1="35" y1="10" x2="85" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E6F0FA" />
            <stop offset="100%" stopColor="#9BB6D4" />
          </linearGradient>
          <linearGradient id="lockIndentGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C84AD" />
            <stop offset="100%" stopColor="#8CA7CE" />
          </linearGradient>
        </defs>

        {/* Bügel oben (Shackle) */}
        <path
          d="M 41 58 L 41 34 C 41 18, 79 18, 79 34 L 79 58"
          stroke="#4E5D78"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M 41 58 L 41 34 C 41 18, 79 18, 79 34 L 79 58"
          stroke="url(#lockShackleGrad)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Bügel-Glanzstreifen */}
        <path
          d="M 45 50 L 45 33 C 45 23, 68 21, 72 28"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />

        {/* Schloss-Körper (abgerundete Glocken-/Tropfenform wie im Vorbild) */}
        <path
          d="M 60 46 C 84 46, 102 68, 104 94 C 106 114, 90 122, 60 122 C 30 122, 14 114, 16 94 C 18 68, 36 46, 60 46 Z"
          fill="url(#lockBodyGrad)"
          stroke="#4E5D78"
          strokeWidth="3.5"
        />

        {/* Unterer 3D-Schattenrand im Schlosskörper */}
        <path
          d="M 20 98 C 24 113, 38 118, 60 118 C 82 118, 96 113, 100 98 C 98 115, 84 120, 60 120 C 36 120, 22 115, 20 98 Z"
          fill="#85A3C6"
        />

        {/* Weißer Glanzbogen links oben */}
        <path
          d="M 26 84 C 28 65, 42 53, 58 52"
          stroke="#FFFFFF"
          strokeWidth="5"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />

        {/* Zwei charakteristische ovale Vertiefungen in der Mitte */}
        <ellipse
          cx="44"
          cy="86"
          rx="11"
          ry="16"
          transform="rotate(-6 44 86)"
          fill="url(#lockIndentGrad)"
          stroke="#5C7399"
          strokeWidth="2"
        />
        <ellipse
          cx="76"
          cy="86"
          rx="11"
          ry="16"
          transform="rotate(6 76 86)"
          fill="url(#lockIndentGrad)"
          stroke="#5C7399"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

/* ─── Illustrierte Poster-Grafik je nach Episode & Sperr-Status ─── */
function CardIllustration({
  variant,
  isUnlocked,
}: {
  variant: ArtVariant;
  isUnlocked: boolean;
}) {
  if (variant === 'jungleSunset') {
    return (
      <svg
        viewBox="0 0 200 320"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Warmer Sonnenuntergangs-Himmel */}
        <rect width="200" height="320" fill={isUnlocked ? '#F7CC97' : '#57609E'} />
        {/* Große tiefstehende Sonne / Bögen */}
        <circle
          cx="25"
          cy="115"
          r="95"
          fill={isUnlocked ? '#F29B7E' : '#48508C'}
        />
        <circle
          cx="15"
          cy="130"
          r="65"
          fill={isUnlocked ? '#F5B396' : '#3E4680'}
        />
        {/* Horizont-Wasserstreifen */}
        <rect
          x="0"
          y="165"
          width="200"
          height="45"
          fill={isUnlocked ? '#B8E8D4' : '#3A4178'}
        />
        {/* Roter/Korallener Felsen rechts im Hintergrund */}
        <path
          d="M 110 215 L 155 125 L 200 140 L 200 225 Z"
          fill={isUnlocked ? '#D96B59' : '#31376B'}
        />
        {/* Mittlere türkis-grüne Dschungel-Hügel */}
        <path
          d="M 0 215 Q 65 180 145 215 L 200 205 L 200 320 L 0 320 Z"
          fill={isUnlocked ? '#52A382' : '#2C3263'}
        />
        <path
          d="M 0 245 Q 85 215 200 240 L 200 320 L 0 320 Z"
          fill={isUnlocked ? '#2A6F68' : '#232854'}
        />

        {/* Große Fächerpalmen-Silhouette rechts oben (wie auf Karte 1) */}
        <g stroke={isUnlocked ? '#1F4E54' : '#1B2048'} fill={isUnlocked ? '#1F4E54' : '#1B2048'}>
          {/* Stamm */}
          <path
            d="M 148 255 Q 168 155 142 52"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          {/* Fächerblätter */}
          <path d="M 142 52 C 105 32, 75 55, 78 68 C 98 62, 122 58, 142 52 Z" />
          <path d="M 142 52 C 110 15, 88 20, 86 35 C 108 36, 125 44, 142 52 Z" />
          <path d="M 142 52 C 132 8, 115 2, 108 16 C 122 25, 134 38, 142 52 Z" />
          <path d="M 142 52 C 158 6, 145 0, 136 12 C 140 26, 142 38, 142 52 Z" />
          <path d="M 142 52 C 185 15, 198 32, 188 46 C 172 44, 158 48, 142 52 Z" />
          <path d="M 142 52 C 192 42, 202 68, 188 78 C 172 68, 156 58, 142 52 Z" />
          <path d="M 142 52 C 110 62, 85 82, 95 94 C 112 82, 128 66, 142 52 Z" />
        </g>

        {/* Zweite kleinere Palme im Vordergrund Mitte-Rechts */}
        <g fill={isUnlocked ? '#163D42' : '#15193B'}>
          <path d="M 122 260 L 116 205 L 124 205 Z" />
          <path d="M 120 208 C 92 192, 74 208, 82 218 C 96 214, 108 210, 120 208 Z" />
          <path d="M 120 208 C 102 178, 88 182, 90 196 C 102 198, 112 204, 120 208 Z" />
          <path d="M 120 208 C 138 176, 154 182, 148 196 C 138 198, 128 204, 120 208 Z" />
          <path d="M 120 208 C 148 194, 166 212, 156 222 C 144 216, 132 212, 120 208 Z" />
        </g>

        {/* Dunkle Dschungel-Blätter & exotische Blüten unten links */}
        <path
          d="M 0 285 Q 65 268 145 305 L 200 295 L 200 320 L 0 320 Z"
          fill={isUnlocked ? '#122E34' : '#121636'}
        />
        <path d="M -5 310 C 12 265, 38 255, 42 268 C 28 282, 15 298, -5 310 Z" fill={isUnlocked ? '#19383D' : '#171C42'} />
        <path d="M 10 315 C 32 275, 58 272, 58 285 C 42 296, 25 308, 10 315 Z" fill={isUnlocked ? '#19383D' : '#171C42'} />
        {isUnlocked && (
          <>
            <circle cx="48" cy="304" r="9" fill="#E86B8C" />
            <circle cx="64" cy="312" r="7" fill="#F29C6B" />
          </>
        )}
      </svg>
    );
  }

  if (variant === 'mountainFlight') {
    return (
      <svg
        viewBox="0 0 200 320"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Himmel */}
        <rect width="200" height="320" fill={isUnlocked ? '#7C65C9' : '#6A71AF'} />
        {/* Wolkenbänder & Lichtstrahlen */}
        <path
          d="M 0 75 Q 95 45 200 85 L 200 185 L 0 185 Z"
          fill={isUnlocked ? '#9C82E6' : '#5B62A1'}
        />
        <circle cx="145" cy="95" r="36" fill={isUnlocked ? '#FDE047' : '#7E86C4'} fillOpacity="0.6" />
        {/* Steile Felseninseln & Schlucht */}
        <path
          d="M 115 195 C 125 115, 165 95, 200 105 L 200 265 L 115 265 Z"
          fill={isUnlocked ? '#5B4299' : '#3C427D'}
        />
        <path
          d="M 0 155 C 35 145, 65 185, 82 245 L 0 265 Z"
          fill={isUnlocked ? '#483282' : '#323870'}
        />
        {/* Wasserfall / Lagune unten */}
        <ellipse cx="105" cy="265" rx="95" ry="38" fill={isUnlocked ? '#5EEAD4' : '#464E8C'} />
        <path
          d="M 0 265 Q 85 245 200 275 L 200 320 L 0 320 Z"
          fill={isUnlocked ? '#2D1E59' : '#23285C'}
        />
        {/* Kleine funkelnde Sterne */}
        <circle cx="38" cy="48" r="2.5" fill="#FFFFFF" fillOpacity="0.65" />
        <circle cx="165" cy="38" r="2" fill="#FFFFFF" fillOpacity="0.55" />
        <circle cx="88" cy="115" r="2" fill="#FFFFFF" fillOpacity="0.5" />
      </svg>
    );
  }

  if (variant === 'nightParty') {
    return (
      <svg
        viewBox="0 0 200 320"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Dunkelblauer Nacht-Dschungel (wie auf Karte 3 "PARTY CRASHERS") */}
        <rect width="200" height="320" fill={isUnlocked ? '#1F6E68' : '#2B326B'} />
        <circle cx="100" cy="110" r="78" fill={isUnlocked ? '#34D399' : '#38417E'} fillOpacity="0.45" />
        {/* Große tropische Blätter-Silhouetten oben & seitlich */}
        <path
          d="M 0 0 L 95 0 C 75 45, 35 65, 0 55 Z"
          fill={isUnlocked ? '#114240' : '#1B204A'}
        />
        <path
          d="M 200 0 L 115 0 C 135 52, 168 72, 200 65 Z"
          fill={isUnlocked ? '#114240' : '#1B204A'}
        />
        {/* Baumstamm & Lianen */}
        <path
          d="M 0 185 Q 85 165 200 205 L 200 320 L 0 320 Z"
          fill={isUnlocked ? '#15544F' : '#222859'}
        />
        <path
          d="M 0 238 Q 110 210 200 248 L 200 320 L 0 320 Z"
          fill={isUnlocked ? '#0D3633' : '#171C44'}
        />
        {/* Funkelnde Glühwürmchen / Party-Lichter */}
        <circle cx="42" cy="255" r="3" fill={isUnlocked ? '#FDE047' : '#6C75B5'} />
        <circle cx="152" cy="242" r="2.5" fill={isUnlocked ? '#FDE047' : '#6C75B5'} />
        <circle cx="118" cy="272" r="2" fill={isUnlocked ? '#6EE7B7' : '#5861A3'} />
      </svg>
    );
  }

  if (variant === 'palmBeach') {
    return (
      <svg
        viewBox="0 0 200 320"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Strand-Kulisse mit Palmen & Liegestuhl (wie auf Karte 4 "BACON BEACH") */}
        <rect width="200" height="320" fill={isUnlocked ? '#38BDF8' : '#555E9C'} />
        <rect x="0" y="95" width="200" height="95" fill={isUnlocked ? '#7DD3FC' : '#47508E'} />
        {/* Meer & Strandwellen */}
        <path
          d="M 0 185 Q 100 172 200 190 L 200 320 L 0 320 Z"
          fill={isUnlocked ? '#0284C7' : '#363E7A'}
        />
        <path
          d="M 0 225 Q 90 205 200 232 L 200 320 L 0 320 Z"
          fill={isUnlocked ? '#FDE68A' : '#262C60'}
        />
        {/* Große Strandpalme links */}
        <g stroke={isUnlocked ? '#0F4C6C' : '#303770'} fill={isUnlocked ? '#0F4C6C' : '#303770'}>
          <path d="M 28 235 Q 38 145 52 68" strokeWidth="6" fill="none" />
          <path d="M 52 68 C 22 52, 2 68, 8 82 C 24 76, 38 72, 52 68 Z" />
          <path d="M 52 68 C 28 36, 12 42, 16 56 C 30 58, 42 62, 52 68 Z" />
          <path d="M 52 68 C 78 38, 98 48, 92 62 C 78 60, 65 64, 52 68 Z" />
          <path d="M 52 68 C 84 58, 102 76, 92 88 C 78 80, 65 74, 52 68 Z" />
        </g>
        {/* Strandliege Silhouette rechts unten */}
        <g
          stroke={isUnlocked ? '#0C3854' : '#1B204A'}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M 112 268 L 178 242" />
          <path d="M 152 212 L 175 268" />
          <path d="M 122 248 L 138 275" />
        </g>
        {/* Vordergrund Blätter unten */}
        <path
          d="M 0 278 Q 95 258 200 285 L 200 320 L 0 320 Z"
          fill={isUnlocked ? '#082F49' : '#181D46'}
        />
      </svg>
    );
  }

  // cyberLagoon (Karte 5)
  return (
    <svg
      viewBox="0 0 200 320"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="320" fill={isUnlocked ? '#4F46E5' : '#495291'} />
      <circle cx="100" cy="135" r="70" fill={isUnlocked ? '#818CF8' : '#3B437D'} />
      <path
        d="M 0 195 L 65 125 L 135 185 L 200 130 L 200 320 L 0 320 Z"
        fill={isUnlocked ? '#312E81' : '#293066'}
      />
      <path
        d="M 0 250 Q 100 220 200 255 L 200 320 L 0 320 Z"
        fill={isUnlocked ? '#1E1B4B' : '#1B204A'}
      />
    </svg>
  );
}

export function GameCard({
  game,
  isActive,
  isUnlocked,
  starsEarned,
  onSelect,
  onPlay,
  onUnlockRequest,
}: GameCardProps) {
  const [wiggling, setWiggling] = useState(false);
  const style = TONE_STYLES[game.tone];

  const handleCardClick = () => {
    onSelect();
    if (isUnlocked) {
      onPlay();
    } else {
      setWiggling(true);
      setTimeout(() => setWiggling(false), 480);
      onUnlockRequest();
    }
  };

  const headerColor = isUnlocked ? style.unlockedHeaderBg : style.headerBg;
  const footerColor = isUnlocked ? '#1B313B' : '#1D2258';

  return (
    <article
      onClick={handleCardClick}
      className={`group relative shrink-0 cursor-pointer select-none transition-transform duration-200 ${
        isActive ? 'scale-[1.02] z-20' : 'hover:scale-[1.01] z-10'
      } w-[148px] sm:w-[172px] md:w-[186px] h-[290px] sm:h-[345px] md:h-[385px] landscape:h-[70dvh] landscape:max-h-[395px] landscape:min-h-[225px] landscape:w-[138px] landscape:sm:w-[162px] landscape:md:w-[182px]`}
    >
      {/* ─── Charakteristischer versetzter weißer Comic-Cutout-Rahmen (wie im Bild) ─── */}
      {/* Untere linke/rechte verbreiterte weiße Rahmenstufe (ab der Kartenmitte) */}
      <div
        className="pointer-events-none absolute -left-[4px] -right-[3px] top-[48%] -bottom-[4px] bg-white shadow-[0_12px_26px_rgba(12,28,58,0.42)]"
        style={{
          clipPath: 'polygon(0 4%, 100% 0, 100% 100%, 0 100%)',
        }}
      />
      {/* Obere schräg geschnittene weiße Kante */}
      <div
        className="pointer-events-none absolute -inset-[3px] bg-white shadow-[0_8px_20px_rgba(12,28,58,0.3)]"
        style={{
          clipPath: 'polygon(0 1%, 100% 0, 99.5% 100%, 0.5% 100%)',
        }}
      />

      {/* ─── Innerer Karten-Container ─── */}
      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-[#1D2258]">
        {/* 1. OBERER EPISODEN-BANNER (z.B. "HOT PURSUIT" / "WHEN CUBES FLY") */}
        <header
          style={{ backgroundColor: headerColor }}
          className="relative z-20 flex h-[17%] min-h-[44px] w-full flex-col items-center justify-center px-2 text-center shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
        >
          <span className="font-arcade block text-[15px] sm:text-[18px] landscape:text-[14px] landscape:sm:text-[17px] leading-[1.02] tracking-wider text-white uppercase drop-shadow-[0_1.5px_0_rgba(0,0,0,0.35)]">
            {game.episodeLines ? game.episodeLines[0] : game.title.split(' ')[0]}
          </span>
          <span className="font-arcade block text-[15px] sm:text-[18px] landscape:text-[14px] landscape:sm:text-[17px] leading-[1.02] tracking-wider text-white uppercase drop-shadow-[0_1.5px_0_rgba(0,0,0,0.35)]">
            {game.episodeLines ? game.episodeLines[1] : (game.title.split(' ').slice(1).join(' ') || 'GAME')}
          </span>
        </header>

        {/* 2. MITTLERES POSTER-ARTWORK + SCHLOSS BEI GESPERRTEN KARTEN */}
        <div className="relative flex-1 w-full overflow-hidden">
          <CardIllustration variant={game.artVariant || 'jungleSunset'} isUnlocked={isUnlocked} />

          {/* Wenn gesperrt: Großes 3D-Cartoon-Vorhängeschloss zentriert */}
          {!isUnlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1E2460]/15">
              <CartoonPadlock wiggling={wiggling} />
            </div>
          )}

          {/* Dezentes Spiel-Tag bei Hover oder auf entsperrten Karten */}
          {isUnlocked && (
            <div className="absolute top-2 right-2 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-bold text-white/95 backdrop-blur-xs">
              {game.title}
            </div>
          )}
        </div>

        {/* 3. UNTERER FOOTER-BALKEN (Goldener Stern + "22/135" bei offenen Karten) */}
        <footer
          style={{ backgroundColor: footerColor }}
          className="relative z-20 flex h-[17%] min-h-[42px] w-full items-center justify-center px-2.5"
        >
          {isUnlocked ? (
            <div className="flex w-full items-center justify-between gap-1">
              {/* Großer goldener Stern mit weißem Rand ragt leicht nach oben */}
              <div className="-mt-2.5 -ml-0.5 shrink-0">
                <GoldenStarBadge className="h-9 w-9 sm:h-11 sm:w-11 landscape:h-8 landscape:w-8 landscape:sm:h-10 landscape:sm:w-10" />
              </div>
              <span className="font-arcade text-[15px] sm:text-[18px] landscape:text-[14px] landscape:sm:text-[17px] tracking-wide text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]">
                {starsEarned}/{game.starsTotal ?? 135}
              </span>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-white/45 group-hover:text-white/85 transition-colors">
                {game.title}
              </span>
            </div>
          )}
        </footer>
      </div>
    </article>
  );
}
