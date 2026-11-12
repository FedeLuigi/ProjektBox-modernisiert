interface GameBackgroundProps {
  gameId: string;
  fullBleed?: boolean;
}

export function GameBackground({ gameId, fullBleed = false }: GameBackgroundProps) {
  const aspectRatio = fullBleed ? 'xMidYMid slice' : 'xMidYMid meet';
  switch (gameId) {
    case 'memory':
      return (
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 240 300"
          preserveAspectRatio={aspectRatio}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Perspektivisch schwebende Memory-Karten */}
          <g opacity="0.32" className="dark:opacity-35">
            {/* Karte 1: Aufgedeckt (Stern) */}
            <rect
              x="130"
              y="20"
              width="60"
              height="75"
              rx="12"
              fill="currentColor"
              className="text-orange-400/30 dark:text-orange-300/20"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M160 45L163 53H171L165 58L167 66L160 61L153 66L155 58L149 53H157L160 45Z"
              fill="currentColor"
              className="text-orange-500/70 dark:text-orange-400/60"
            />

            {/* Karte 2: Verdeckt (Rautenmuster) */}
            <rect
              x="170"
              y="85"
              width="60"
              height="75"
              rx="12"
              fill="currentColor"
              className="text-amber-400/25 dark:text-amber-300/15"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="200" cy="122.5" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />

            {/* Karte 3: Aufgedeckt (Herz) */}
            <rect
              x="25"
              y="110"
              width="60"
              height="75"
              rx="12"
              fill="currentColor"
              className="text-rose-400/25 dark:text-rose-300/15"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M55 142C50 135 40 139 40 148C40 158 55 168 55 168C55 168 70 158 70 148C70 139 60 135 55 142Z"
              fill="currentColor"
              className="text-rose-500/60 dark:text-rose-400/50"
            />

            {/* Karte 4: Verdeckt mit Fragezeichen */}
            <rect
              x="140"
              y="170"
              width="64"
              height="80"
              rx="12"
              fill="currentColor"
              className="text-orange-400/20 dark:text-orange-300/15"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <text
              x="172"
              y="222"
              textAnchor="middle"
              fontSize="34"
              fontWeight="900"
              fill="currentColor"
              className="text-orange-500/50 dark:text-orange-400/40"
            >
              ?
            </text>

            {/* Karte 5: Klein am Rand */}
            <rect
              x="-10"
              y="190"
              width="50"
              height="65"
              rx="10"
              fill="currentColor"
              className="text-amber-500/15 dark:text-amber-400/10"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </g>
        </svg>
      );

    case 'connect':
      return (
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 240 300"
          preserveAspectRatio={aspectRatio}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Vier-Gewinnt Spielfeld-Gitter mit Chips */}
          <g opacity="0.35" className="dark:opacity-35">
            {/* Blaues Gitterbrett */}
            <rect
              x="45"
              y="55"
              width="170"
              height="190"
              rx="18"
              fill="currentColor"
              className="text-indigo-600/30 dark:text-indigo-400/20"
              stroke="currentColor"
              strokeWidth="2"
            />

            {/* Zeile 1 */}
            <circle cx="80" cy="90" r="14" fill="currentColor" className="text-yellow-400/75 dark:text-yellow-300/70" />
            <circle cx="120" cy="90" r="14" fill="currentColor" className="text-purple-950/40 dark:text-black/50" />
            <circle cx="160" cy="90" r="14" fill="currentColor" className="text-red-500/75 dark:text-red-400/70" />
            <circle cx="195" cy="90" r="10" fill="currentColor" className="text-purple-950/40 dark:text-black/50" />

            {/* Zeile 2 */}
            <circle cx="80" cy="130" r="14" fill="currentColor" className="text-red-500/75 dark:text-red-400/70" />
            <circle cx="120" cy="130" r="14" fill="currentColor" className="text-yellow-400/75 dark:text-yellow-300/70" />
            <circle cx="160" cy="130" r="14" fill="currentColor" className="text-purple-950/40 dark:text-black/50" />
            <circle cx="195" cy="130" r="10" fill="currentColor" className="text-yellow-400/60 dark:text-yellow-300/50" />

            {/* Zeile 3 */}
            <circle cx="80" cy="170" r="14" fill="currentColor" className="text-red-500/75 dark:text-red-400/70" />
            <circle cx="120" cy="170" r="14" fill="currentColor" className="text-red-500/75 dark:text-red-400/70" />
            <circle cx="160" cy="170" r="14" fill="currentColor" className="text-yellow-400/75 dark:text-yellow-300/70" />
            <circle cx="195" cy="170" r="10" fill="currentColor" className="text-red-500/60 dark:text-red-400/50" />

            {/* Zeile 4 (Boden) */}
            <circle cx="80" cy="210" r="14" fill="currentColor" className="text-yellow-400/75 dark:text-yellow-300/70" />
            <circle cx="120" cy="210" r="14" fill="currentColor" className="text-yellow-400/75 dark:text-yellow-300/70" />
            <circle cx="160" cy="210" r="14" fill="currentColor" className="text-red-500/75 dark:text-red-400/70" />
            <circle cx="195" cy="210" r="10" fill="currentColor" className="text-yellow-400/60 dark:text-yellow-300/50" />

            {/* Einfallender Chip von oben */}
            <circle
              cx="120"
              cy="35"
              r="13"
              fill="currentColor"
              className="text-yellow-400/80 dark:text-yellow-300/80"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M120 20L120 45" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
          </g>
        </svg>
      );

    case 'reaction':
      return (
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 240 300"
          preserveAspectRatio={aspectRatio}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Reaktions-Impulswelle & Speedometer */}
          <g opacity="0.32" className="dark:opacity-35">
            {/* Speedometer-Bogen */}
            <circle
              cx="170"
              cy="90"
              r="60"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray="180 300"
              className="text-emerald-500/40 dark:text-emerald-400/30"
            />
            <circle
              cx="170"
              cy="90"
              r="50"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="10 15"
              className="text-emerald-400/50 dark:text-emerald-300/40"
            />

            {/* Blitz-Symbol im Zentrum */}
            <path
              d="M180 55L150 95H175L160 135L200 85H175L180 55Z"
              fill="currentColor"
              className="text-emerald-400/60 dark:text-emerald-300/50"
            />

            {/* Dynamische Puls-/EKG-Linie quer über die Karte */}
            <path
              d="M-10 200L50 200L65 175L80 230L100 150L118 245L135 185L150 205L165 195L250 200"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-500/70 dark:text-emerald-400/60"
            />

            {/* Reaktionszeit-Badge "180ms" */}
            <rect
              x="30"
              y="60"
              width="80"
              height="34"
              rx="10"
              fill="currentColor"
              className="text-emerald-600/25 dark:text-emerald-400/15"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <text
              x="70"
              y="83"
              textAnchor="middle"
              fontSize="16"
              fontWeight="900"
              letterSpacing="1"
              fill="currentColor"
              className="text-emerald-500/80 dark:text-emerald-300/75"
            >
              ⚡ 180 ms
            </text>
          </g>
        </svg>
      );

    case 'tic-tac-toe':
      return (
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 240 300"
          preserveAspectRatio={aspectRatio}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Tic Tac Toe 3x3 Gitter mit leuchtenden X & O */}
          <g opacity="0.32" className="dark:opacity-35">
            {/* Gitterlinien */}
            <line x1="90" y1="40" x2="90" y2="240" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-sky-500/50 dark:text-sky-400/40" />
            <line x1="150" y1="40" x2="150" y2="240" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-sky-500/50 dark:text-sky-400/40" />
            <line x1="30" y1="100" x2="210" y2="100" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-sky-500/50 dark:text-sky-400/40" />
            <line x1="30" y1="170" x2="210" y2="170" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-sky-500/50 dark:text-sky-400/40" />

            {/* X oben links */}
            <path
              d="M48 58L72 82M72 58L48 82"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
              className="text-cyan-400/85 dark:text-cyan-300/80"
            />

            {/* O oben Mitte */}
            <circle
              cx="120"
              cy="70"
              r="14"
              stroke="currentColor"
              strokeWidth="4"
              className="text-pink-400/85 dark:text-pink-300/80"
            />

            {/* X Mitte */}
            <path
              d="M108 123L132 147M132 123L108 147"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
              className="text-cyan-400/85 dark:text-cyan-300/80"
            />

            {/* O Mitte rechts */}
            <circle
              cx="180"
              cy="135"
              r="14"
              stroke="currentColor"
              strokeWidth="4"
              className="text-pink-400/85 dark:text-pink-300/80"
            />

            {/* X unten rechts (Gewinnreihe!) */}
            <path
              d="M168 193L192 217M192 193L168 217"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
              className="text-cyan-400/85 dark:text-cyan-300/80"
            />

            {/* Gewinndiagonale Durchstreichung */}
            <line
              x1="40"
              y1="50"
              x2="200"
              y2="225"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeDasharray="6 4"
              className="text-yellow-400/70 dark:text-yellow-300/60"
            />
          </g>
        </svg>
      );

    case 'snake':
      return (
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 240 300"
          preserveAspectRatio={aspectRatio}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Retro Pixel-Snake Jagd */}
          <g opacity="0.35" className="dark:opacity-35">
            {/* Hintergrund-Rasterpunkte */}
            <pattern id="snake-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.5" fill="currentColor" className="text-emerald-500/25 dark:text-emerald-400/20" />
            </pattern>
            <rect x="20" y="30" width="200" height="240" rx="16" fill="url(#snake-grid)" />

            {/* Schlange (Geschwungener Körper) */}
            <path
              d="M50 210H110V150H70V90H170V130H150"
              stroke="currentColor"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-500/75 dark:text-emerald-400/70"
            />

            {/* Schlangenkopf & Augen */}
            <circle cx="150" cy="130" r="8" fill="currentColor" className="text-emerald-400 dark:text-emerald-300" />
            <circle cx="148" cy="128" r="2" fill="white" />
            <circle cx="152" cy="128" r="2" fill="white" />

            {/* Roter Apfel (Futter) */}
            <circle cx="190" cy="180" r="10" fill="currentColor" className="text-rose-500/90 dark:text-rose-400/90" />
            <path d="M190 170Q193 164 196 166" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600 dark:text-emerald-400" />

            {/* Bonuspunkte Stern */}
            <circle cx="50" cy="60" r="6" fill="currentColor" className="text-amber-400/80 dark:text-amber-300/70" />
          </g>
        </svg>
      );

    case '2048':
      return (
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 240 300"
          preserveAspectRatio={aspectRatio}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 2048 Zahlen-Kacheln */}
          <g opacity="0.35" className="dark:opacity-35">
            {/* Kachel 2048 (Gold) */}
            <rect x="120" y="30" width="85" height="85" rx="16" fill="currentColor" className="text-amber-400/70 dark:text-amber-400/60" />
            <text x="162.5" y="80" textAnchor="middle" fontSize="24" fontWeight="900" fill="currentColor" className="text-amber-950 dark:text-white">
              2048
            </text>

            {/* Kachel 1024 */}
            <rect x="25" y="55" width="75" height="75" rx="14" fill="currentColor" className="text-orange-400/60 dark:text-orange-400/50" />
            <text x="62.5" y="100" textAnchor="middle" fontSize="20" fontWeight="900" fill="currentColor" className="text-orange-950 dark:text-white">
              1024
            </text>

            {/* Kachel 512 */}
            <rect x="110" y="130" width="70" height="70" rx="14" fill="currentColor" className="text-amber-500/50 dark:text-amber-500/40" />
            <text x="145" y="172" textAnchor="middle" fontSize="22" fontWeight="900" fill="currentColor" className="text-white">
              512
            </text>

            {/* Kachel 64 */}
            <rect x="35" y="145" width="60" height="60" rx="12" fill="currentColor" className="text-orange-600/50 dark:text-orange-500/40" />
            <text x="65" y="182" textAnchor="middle" fontSize="20" fontWeight="900" fill="currentColor" className="text-white">
              64
            </text>

            {/* Kachel 16 */}
            <rect x="125" y="215" width="55" height="55" rx="10" fill="currentColor" className="text-orange-300/40 dark:text-orange-300/30" />
            <text x="152.5" y="249" textAnchor="middle" fontSize="18" fontWeight="800" fill="currentColor" className="text-orange-950 dark:text-white">
              16
            </text>
          </g>
        </svg>
      );

    case 'minesweeper':
      return (
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 240 300"
          preserveAspectRatio={aspectRatio}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Minenfeld Gitter mit Zahlen, Flaggen & Mine */}
          <g opacity="0.35" className="dark:opacity-35">
            {/* Kacheln 3x3 */}
            <rect x="40" y="45" width="45" height="45" rx="8" fill="currentColor" className="text-slate-400/30 dark:text-slate-600/30" stroke="currentColor" strokeWidth="1.5" />
            <text x="62.5" y="75" textAnchor="middle" fontSize="22" fontWeight="900" fill="currentColor" className="text-blue-500 dark:text-blue-400">1</text>

            <rect x="95" y="45" width="45" height="45" rx="8" fill="currentColor" className="text-slate-400/30 dark:text-slate-600/30" stroke="currentColor" strokeWidth="1.5" />
            <text x="117.5" y="75" textAnchor="middle" fontSize="22" fontWeight="900" fill="currentColor" className="text-emerald-500 dark:text-emerald-400">2</text>

            <rect x="150" y="45" width="45" height="45" rx="8" fill="currentColor" className="text-slate-400/30 dark:text-slate-600/30" stroke="currentColor" strokeWidth="1.5" />
            {/* Rote Flagge auf Feld (1,3) */}
            <path d="M165 60L180 68L165 76V82" stroke="currentColor" strokeWidth="2.5" className="text-red-500 dark:text-red-400" />
            <polygon points="165,60 180,68 165,76" fill="currentColor" className="text-red-500 dark:text-red-400" />

            {/* Zeile 2 */}
            <rect x="40" y="100" width="45" height="45" rx="8" fill="currentColor" className="text-slate-400/30 dark:text-slate-600/30" stroke="currentColor" strokeWidth="1.5" />
            <text x="62.5" y="130" textAnchor="middle" fontSize="22" fontWeight="900" fill="currentColor" className="text-red-500 dark:text-red-400">3</text>

            <rect x="95" y="100" width="45" height="45" rx="8" fill="currentColor" className="text-slate-500/40 dark:text-slate-700/40" stroke="currentColor" strokeWidth="2" />
            {/* Seemine */}
            <circle cx="117.5" cy="122.5" r="10" fill="currentColor" className="text-slate-800 dark:text-slate-200" />
            <line x1="117.5" y1="108" x2="117.5" y2="137" stroke="currentColor" strokeWidth="2.5" className="text-slate-800 dark:text-slate-200" />
            <line x1="103" y1="122.5" x2="132" y2="122.5" stroke="currentColor" strokeWidth="2.5" className="text-slate-800 dark:text-slate-200" />

            <rect x="150" y="100" width="45" height="45" rx="8" fill="currentColor" className="text-slate-400/30 dark:text-slate-600/30" stroke="currentColor" strokeWidth="1.5" />
            <text x="172.5" y="130" textAnchor="middle" fontSize="22" fontWeight="900" fill="currentColor" className="text-blue-500 dark:text-blue-400">1</text>

            {/* Zeile 3 */}
            <rect x="40" y="155" width="45" height="45" rx="8" fill="currentColor" className="text-slate-400/20 dark:text-slate-600/20" stroke="currentColor" strokeWidth="1" />
            <rect x="95" y="155" width="45" height="45" rx="8" fill="currentColor" className="text-slate-400/20 dark:text-slate-600/20" stroke="currentColor" strokeWidth="1" />
            <text x="117.5" y="185" textAnchor="middle" fontSize="22" fontWeight="900" fill="currentColor" className="text-emerald-500 dark:text-emerald-400">1</text>
            <rect x="150" y="155" width="45" height="45" rx="8" fill="currentColor" className="text-slate-400/20 dark:text-slate-600/20" stroke="currentColor" strokeWidth="1" />
          </g>
        </svg>
      );

    case 'space-dodge':
      return (
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 240 300"
          preserveAspectRatio={aspectRatio}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Raumschiff & Asteroidenfeld im Weltraum */}
          <g opacity="0.35" className="dark:opacity-35">
            {/* Sternenhimmel */}
            <circle cx="30" cy="40" r="1.5" fill="currentColor" className="text-sky-300" />
            <circle cx="180" cy="30" r="2" fill="currentColor" className="text-sky-200" />
            <circle cx="80" cy="90" r="1.5" fill="currentColor" className="text-indigo-300" />
            <circle cx="210" cy="110" r="1.5" fill="currentColor" className="text-sky-300" />
            <circle cx="45" cy="170" r="2" fill="currentColor" className="text-sky-200" />
            <circle cx="195" cy="220" r="1.5" fill="currentColor" className="text-sky-300" />

            {/* Asteroid 1 (Groß) */}
            <polygon
              points="150,50 185,40 210,65 195,95 160,90 145,70"
              fill="currentColor"
              className="text-slate-500/40 dark:text-slate-400/30"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="175" cy="65" r="4" fill="currentColor" className="text-slate-600/50 dark:text-slate-300/40" />

            {/* Asteroid 2 (Klein) */}
            <polygon
              points="40,110 60,105 70,120 58,135 38,125"
              fill="currentColor"
              className="text-slate-500/40 dark:text-slate-400/30"
              stroke="currentColor"
              strokeWidth="1"
            />

            {/* Raumschiff (Retro Dreiecks-Fighter) */}
            <path
              d="M120 160L145 220L120 205L95 220L120 160Z"
              fill="currentColor"
              className="text-cyan-400/80 dark:text-cyan-300/75"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Cockpit */}
            <circle cx="120" cy="185" r="4" fill="currentColor" className="text-sky-950 dark:text-sky-100" />

            {/* Antriebsflamme */}
            <path
              d="M112 210L120 235L128 210Z"
              fill="currentColor"
              className="text-orange-500/90 dark:text-orange-400/90"
            />
            <line x1="120" y1="235" x2="120" y2="255" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" className="text-amber-400/70" />
          </g>
        </svg>
      );

    case 'draw-and-guess':
      return (
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 240 300"
          preserveAspectRatio={aspectRatio}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Maler-Staffelei, Palette und Pinselstriche */}
          <g opacity="0.35" className="dark:opacity-35">
            {/* Staffelei-Beine */}
            <line x1="80" y1="60" x2="50" y2="240" stroke="currentColor" strokeWidth="3" className="text-amber-500/40" />
            <line x1="160" y1="60" x2="190" y2="240" stroke="currentColor" strokeWidth="3" className="text-amber-500/40" />
            <line x1="120" y1="40" x2="120" y2="230" stroke="currentColor" strokeWidth="3" className="text-amber-500/30" />

            {/* Leinwand */}
            <rect
              x="60"
              y="70"
              width="120"
              height="95"
              rx="8"
              fill="currentColor"
              className="text-white/80 dark:text-white/10"
              stroke="currentColor"
              strokeWidth="2"
            />

            {/* Bunte Pinsel-Kurve auf Leinwand */}
            <path
              d="M75 135 C 95 90, 140 160, 165 105"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              className="text-pink-500/70"
            />
            <path
              d="M85 110 C 110 140, 135 90, 155 125"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className="text-purple-500/70"
            />

            {/* Maler-Palette */}
            <path
              d="M130 180 C 130 165, 175 160, 195 180 C 215 200, 205 235, 175 235 C 150 235, 130 215, 130 180 Z"
              fill="currentColor"
              className="text-amber-600/30 dark:text-amber-400/20"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="160" cy="185" r="4" fill="currentColor" className="text-rose-500/80" />
            <circle cx="180" cy="190" r="4" fill="currentColor" className="text-sky-500/80" />
            <circle cx="170" cy="210" r="4" fill="currentColor" className="text-emerald-500/80" />
          </g>
        </svg>
      );

    default:
      return null;
  }
}
