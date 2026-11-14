interface GamePreviewArtworkProps {
  gameId: string;
  variant?: 'card' | 'hero';
  className?: string;
}

export function GamePreviewArtwork({
  gameId,
  variant = 'card',
  className = '',
}: GamePreviewArtworkProps) {
  const isHero = variant === 'hero';

  if (gameId === 'draw-and-guess') {
    return (
      <div
        className={`relative w-full overflow-hidden bg-gradient-to-br from-[#2E1065] via-[#831843] to-[#0F172A] ${className}`}
      >
        {/* Atmosphärische Lichtkugeln */}
        <div className="pointer-events-none absolute -top-12 -left-12 h-44 w-44 rounded-full bg-[#F43F5E]/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 right-8 h-48 w-48 rounded-full bg-[#A855F7]/30 blur-2xl" />

        <svg
          viewBox={isHero ? '0 0 640 280' : '0 0 400 210'}
          className="h-full w-full object-cover"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="dg-canvas" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFDF9" />
              <stop offset="100%" stopColor="#FCE7F3" />
            </linearGradient>
            <linearGradient id="dg-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EC4899" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>

          {/* Dekorative Hintergrund-Sterne */}
          <circle cx="42" cy="36" r="2.5" fill="#FDE68A" opacity="0.7" />
          <circle cx="355" cy="28" r="3" fill="#F9A8D4" opacity="0.6" />
          <circle cx="65" cy="175" r="2" fill="#A5B4FC" opacity="0.6" />

          {/* Live Zeichen-Board in der Mitte */}
          <g transform={isHero ? 'translate(85, 26)' : 'translate(42, 22)'}>
            <rect
              x="0"
              y="0"
              width={isHero ? '280' : '215'}
              height={isHero ? '195' : '152'}
              rx="16"
              fill="url(#dg-canvas)"
              stroke="#1E293B"
              strokeWidth="4"
            />
            {/* Top-Leiste des Zeichenbretts */}
            <rect
              x="12"
              y="10"
              width={isHero ? '120' : '95'}
              height="16"
              rx="8"
              fill="#F1F5F9"
            />
            <text
              x="22"
              y="22"
              fill="#475569"
              fontSize="10"
              fontWeight="800"
              fontFamily="sans-serif"
            >
              _ _ K E _ E (6)
            </text>

            {/* Gezeichnete Rakete / Motiv auf dem Canvas */}
            <path
              d={
                isHero
                  ? 'M115 145 C115 95, 145 55, 165 45 C185 55, 215 95, 215 145 Z'
                  : 'M82 118 C82 78, 106 46, 122 38 C138 46, 162 78, 162 118 Z'
              }
              fill="none"
              stroke="url(#dg-stroke)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx={isHero ? '165' : '122'}
              cy={isHero ? '95' : '78'}
              r={isHero ? '14' : '11'}
              fill="#38BDF8"
              stroke="#0284C7"
              strokeWidth="3.5"
            />
            {/* Flamme */}
            <path
              d={
                isHero
                  ? 'M148 148 Q165 182 182 148'
                  : 'M108 120 Q122 146 136 120'
              }
              fill="#F59E0B"
              stroke="#EA580C"
              strokeWidth="3"
            />

            {/* Farbpalette unten links auf dem Canvas */}
            <circle cx="24" cy={isHero ? '174' : '135'} r="6.5" fill="#EF4444" />
            <circle cx="42" cy={isHero ? '174' : '135'} r="6.5" fill="#F59E0B" />
            <circle cx="60" cy={isHero ? '174' : '135'} r="6.5" fill="#10B981" />
            <circle cx="78" cy={isHero ? '174' : '135'} r="6.5" fill="#3B82F6" />
          </g>

          {/* Schwebende Rate-Sprechblasen der Mitspieler */}
          <g transform={isHero ? 'translate(390, 42)' : 'translate(240, 32)'}>
            {/* Sprechblase 1 */}
            <rect
              x="0"
              y="0"
              width={isHero ? '165' : '128'}
              height="38"
              rx="12"
              fill="#1E293B"
              stroke="#475569"
              strokeWidth="2.5"
            />
            <circle cx="20" cy="19" r="9" fill="#38BDF8" />
            <text
              x="36"
              y="23"
              fill="#F8FAFC"
              fontSize={isHero ? '13' : '11'}
              fontWeight="700"
              fontFamily="sans-serif"
            >
              Flugzeug?
            </text>

            {/* Sprechblase 2 (Treffer!) */}
            <g transform="translate(10, 50)">
              <rect
                x="0"
                y="0"
                width={isHero ? '185' : '136'}
                height="42"
                rx="12"
                fill="#059669"
                stroke="#6EE7B7"
                strokeWidth="2.5"
              />
              <circle cx="22" cy="21" r="10" fill="#FDE68A" />
              <text
                x="38"
                y="25"
                fill="#FFFFFF"
                fontSize={isHero ? '13' : '11'}
                fontWeight="800"
                fontFamily="sans-serif"
              >
                RAKETE! +100
              </text>
            </g>

            {/* Sprechblase 3 */}
            <g transform="translate(-5, 104)">
              <rect
                x="0"
                y="0"
                width={isHero ? '155' : '122'}
                height="36"
                rx="12"
                fill="#831843"
                stroke="#F472B6"
                strokeWidth="2"
              />
              <text
                x="16"
                y="22"
                fill="#FCE7F3"
                fontSize={isHero ? '12' : '10.5'}
                fontWeight="700"
                fontFamily="sans-serif"
              >
                ⏱️ 42s • 2–8 Spieler
              </text>
            </g>
          </g>
        </svg>
      </div>
    );
  }

  if (gameId === 'connect') {
    const cols = 7;
    const rows = 5;
    // Beispiel-Spielstand mit 4-Gewinnt-Diagonale
    const board: number[][] = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0, 0],
      [0, 0, 1, 2, 0, 0, 0],
      [0, 1, 2, 1, 2, 0, 0],
      [1, 2, 1, 2, 2, 1, 0],
    ];
    const winCells = new Set(['4-0', '3-1', '2-2', '1-3']);

    return (
      <div
        className={`relative w-full overflow-hidden bg-gradient-to-br from-[#1E293B] via-[#881337] to-[#0F172A] ${className}`}
      >
        <div className="pointer-events-none absolute -top-10 left-1/4 h-40 w-40 rounded-full bg-[#F43F5E]/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-10 h-44 w-44 rounded-full bg-[#F59E0B]/25 blur-2xl" />

        <svg
          viewBox={isHero ? '0 0 640 280' : '0 0 400 210'}
          className="h-full w-full object-cover"
          aria-hidden="true"
        >
          {/* Spielbrett-Rahmen */}
          <g transform={isHero ? 'translate(145, 24)' : 'translate(76, 18)'}>
            <rect
              x="0"
              y="0"
              width={isHero ? '275' : '248'}
              height={isHero ? '198' : '174'}
              rx="16"
              fill="#1E3A8A"
              stroke="#60A5FA"
              strokeWidth="4"
            />

            {Array.from({ length: rows }).map((_, r) =>
              Array.from({ length: cols }).map((__, c) => {
                const val = board[r][c];
                const isWin = winCells.has(`${r}-${c}`);
                const cx = (isHero ? 26 : 24) + c * (isHero ? 37 : 33.5);
                const cy = (isHero ? 26 : 23) + r * (isHero ? 36 : 32);
                const radius = isHero ? 13.5 : 12;

                let fill = '#0F172A';
                let stroke = '#1D4ED8';
                if (val === 1) {
                  fill = '#F43F5E';
                  stroke = isWin ? '#FDE047' : '#FDA4AF';
                } else if (val === 2) {
                  fill = '#F59E0B';
                  stroke = '#FDE68A';
                }

                return (
                  <g key={`${r}-${c}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isWin ? '3.5' : '2'}
                    />
                    {val > 0 && (
                      <circle
                        cx={cx - 3}
                        cy={cy - 3}
                        r={radius * 0.35}
                        fill="#FFFFFF"
                        opacity="0.35"
                      />
                    )}
                  </g>
                );
              })
            )}

            {/* Gewinn-Verbindungslinie */}
            <line
              x1={isHero ? 26 : 24}
              y1={isHero ? 170 : 151}
              x2={isHero ? 137 : 124.5}
              y2={isHero ? 62 : 55}
              stroke="#FDE047"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>

          {/* Rechts im Hero-Modus: Taktik-Badges */}
          {isHero && (
            <g transform="translate(445, 65)">
              <rect
                x="0"
                y="0"
                width="145"
                height="44"
                rx="12"
                fill="#0F172A"
                stroke="#F43F5E"
                strokeWidth="2.5"
              />
              <circle cx="24" cy="22" r="10" fill="#F43F5E" />
              <text
                x="42"
                y="27"
                fill="#FFFFFF"
                fontSize="13"
                fontWeight="800"
                fontFamily="sans-serif"
              >
                4 IN EINER REIHE
              </text>

              <g transform="translate(0, 58)">
                <rect
                  x="0"
                  y="0"
                  width="145"
                  height="44"
                  rx="12"
                  fill="#0F172A"
                  stroke="#F59E0B"
                  strokeWidth="2.5"
                />
                <circle cx="24" cy="22" r="10" fill="#F59E0B" />
                <text
                  x="42"
                  y="27"
                  fill="#FDE68A"
                  fontSize="13"
                  fontWeight="800"
                  fontFamily="sans-serif"
                >
                  1v1 TAKTIK-DUELL
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>
    );
  }

  // Default / Tic Tac Toe
  return (
    <div
      className={`relative w-full overflow-hidden bg-gradient-to-br from-[#1E1B4B] via-[#4C1D95] to-[#0F172A] ${className}`}
    >
      <div className="pointer-events-none absolute -top-10 right-12 h-40 w-40 rounded-full bg-[#8B5CF6]/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-10 h-40 w-40 rounded-full bg-[#06B6D4]/25 blur-2xl" />

      <svg
        viewBox={isHero ? '0 0 640 280' : '0 0 400 210'}
        className="h-full w-full object-cover"
        aria-hidden="true"
      >
        <g transform={isHero ? 'translate(185, 22)' : 'translate(112, 16)'}>
          {/* 3x3 Board Hintergrund */}
          <rect
            x="0"
            y="0"
            width={isHero ? '200' : '176'}
            height={isHero ? '200' : '176'}
            rx="20"
            fill="#0F172A"
            stroke="#8B5CF6"
            strokeWidth="4"
          />

          {/* Gitterlinien */}
          <line
            x1={isHero ? '67' : '59'}
            y1="16"
            x2={isHero ? '67' : '59'}
            y2={isHero ? '184' : '160'}
            stroke="#334155"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1={isHero ? '133' : '117'}
            y1="16"
            x2={isHero ? '133' : '117'}
            y2={isHero ? '184' : '160'}
            stroke="#334155"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1="16"
            y1={isHero ? '67' : '59'}
            x2={isHero ? '184' : '160'}
            y2={isHero ? '67' : '59'}
            stroke="#334155"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1="16"
            y1={isHero ? '133' : '117'}
            x2={isHero ? '184' : '160'}
            y2={isHero ? '133' : '117'}
            stroke="#334155"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* X oben links */}
          <g stroke="#38BDF8" strokeWidth="6" strokeLinecap="round">
            <line x1="22" y1="22" x2="44" y2="44" />
            <line x1="44" y1="22" x2="22" y2="44" />
          </g>

          {/* O oben mitte */}
          <circle
            cx={isHero ? '100' : '88'}
            cy="33"
            r="13"
            fill="none"
            stroke="#F43F5E"
            strokeWidth="6"
          />

          {/* X mitte */}
          <g
            transform={isHero ? 'translate(67, 67)' : 'translate(55, 55)'}
            stroke="#38BDF8"
            strokeWidth="6"
            strokeLinecap="round"
          >
            <line x1="22" y1="22" x2="44" y2="44" />
            <line x1="44" y1="22" x2="22" y2="44" />
          </g>

          {/* O unten links */}
          <circle
            cx="33"
            cy={isHero ? '165' : '145'}
            r="13"
            fill="none"
            stroke="#F43F5E"
            strokeWidth="6"
          />

          {/* X unten rechts */}
          <g
            transform={isHero ? 'translate(133, 133)' : 'translate(112, 112)'}
            stroke="#38BDF8"
            strokeWidth="6"
            strokeLinecap="round"
          >
            <line x1="22" y1="22" x2="44" y2="44" />
            <line x1="44" y1="22" x2="22" y2="44" />
          </g>

          {/* Diagonale Gewinn-Linie */}
          <line
            x1="20"
            y1="20"
            x2={isHero ? '180' : '156'}
            y2={isHero ? '180' : '156'}
            stroke="#FDE047"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>

        {isHero && (
          <g transform="translate(415, 72)">
            <rect
              x="0"
              y="0"
              width="165"
              height="44"
              rx="12"
              fill="#0F172A"
              stroke="#38BDF8"
              strokeWidth="2.5"
            />
            <text
              x="22"
              y="27"
              fill="#E0F2FE"
              fontSize="13"
              fontWeight="800"
              fontFamily="sans-serif"
            >
              ⚡ BLITZ-DUELL 3×3
            </text>

            <g transform="translate(0, 56)">
              <rect
                x="0"
                y="0"
                width="165"
                height="44"
                rx="12"
                fill="#0F172A"
                stroke="#A855F7"
                strokeWidth="2.5"
              />
              <text
                x="22"
                y="27"
                fill="#F3E8FF"
                fontSize="13"
                fontWeight="800"
                fontFamily="sans-serif"
              >
                ⏱️ ~2 MIN. PRO RUNDE
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
