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

  if (gameId === 'texas-holdem') {
    return (
      <div
        className={`relative w-full overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#064E3B] to-[#022C22] ${className}`}
      >
        <svg
          viewBox={isHero ? '0 0 640 280' : '0 0 400 210'}
          className="h-full w-full object-cover"
          aria-hidden="true"
        >
          {/* Pokertisch-Oval im Hintergrund */}
          <rect
            x={isHero ? 60 : 28}
            y={isHero ? 34 : 22}
            width={isHero ? 520 : 344}
            height={isHero ? 212 : 162}
            rx={isHero ? 106 : 78}
            fill="#065F46"
            stroke="#92400E"
            strokeWidth={isHero ? 10 : 7}
          />
          <rect
            x={isHero ? 74 : 38}
            y={isHero ? 48 : 32}
            width={isHero ? 492 : 324}
            height={isHero ? 184 : 142}
            rx={isHero ? 92 : 68}
            fill="none"
            stroke="#F59E0B"
            strokeOpacity="0.45"
            strokeWidth="2"
          />

          {/* Zwei gefächerte Pocket-Asse links */}
          <g transform={isHero ? 'translate(132, 68) rotate(-10)' : 'translate(68, 46) rotate(-10)'}>
            <rect
              width={isHero ? 90 : 62}
              height={isHero ? 128 : 88}
              rx="10"
              fill="#F8FAFC"
              stroke="#FBBF24"
              strokeWidth="2.5"
            />
            <text
              x={isHero ? 14 : 10}
              y={isHero ? 30 : 22}
              fill="#0F172A"
              fontSize={isHero ? 24 : 16}
              fontWeight="900"
              fontFamily="sans-serif"
            >
              A
            </text>
            <text
              x={isHero ? 45 : 31}
              y={isHero ? 78 : 54}
              textAnchor="middle"
              fill="#0F172A"
              fontSize={isHero ? 40 : 28}
              fontFamily="sans-serif"
            >
              ♠
            </text>
          </g>

          <g transform={isHero ? 'translate(188, 62) rotate(8)' : 'translate(108, 42) rotate(8)'}>
            <rect
              width={isHero ? 90 : 62}
              height={isHero ? 128 : 88}
              rx="10"
              fill="#F8FAFC"
              stroke="#FDE047"
              strokeWidth="3"
            />
            <text
              x={isHero ? 14 : 10}
              y={isHero ? 30 : 22}
              fill="#DC2626"
              fontSize={isHero ? 24 : 16}
              fontWeight="900"
              fontFamily="sans-serif"
            >
              A
            </text>
            <text
              x={isHero ? 45 : 31}
              y={isHero ? 78 : 54}
              textAnchor="middle"
              fill="#DC2626"
              fontSize={isHero ? 40 : 28}
              fontFamily="sans-serif"
            >
              ♥
            </text>
          </g>

          {/* Flop-Karten & Chips rechts */}
          <g transform={isHero ? 'translate(325, 76)' : 'translate(202, 54)'}>
            {[
              { r: 'K', s: '♠', c: '#0F172A', x: 0 },
              { r: 'D', s: '♠', c: '#0F172A', x: isHero ? 64 : 44 },
              { r: '10', s: '♠', c: '#0F172A', x: isHero ? 128 : 88 },
            ].map((card, i) => (
              <g key={i} transform={`translate(${card.x}, 0)`}>
                <rect
                  width={isHero ? 56 : 38}
                  height={isHero ? 80 : 56}
                  rx="7"
                  fill="#F8FAFC"
                  stroke="#E2E8F0"
                  strokeWidth="2"
                />
                <text
                  x={isHero ? 10 : 6}
                  y={isHero ? 22 : 16}
                  fill={card.c}
                  fontSize={isHero ? 16 : 11}
                  fontWeight="900"
                  fontFamily="sans-serif"
                >
                  {card.r}
                </text>
                <text
                  x={isHero ? 28 : 19}
                  y={isHero ? 56 : 38}
                  textAnchor="middle"
                  fill={card.c}
                  fontSize={isHero ? 24 : 16}
                  fontFamily="sans-serif"
                >
                  {card.s}
                </text>
              </g>
            ))}

            {/* Poker Chips unter den Karten */}
            <g transform={isHero ? 'translate(95, 118)' : 'translate(62, 82)'}>
              <circle r={isHero ? 22 : 15} fill="#D97706" stroke="#FEF08A" strokeWidth="3" strokeDasharray="6 4" />
              <circle cx={isHero ? 36 : 24} r={isHero ? 22 : 15} fill="#DC2626" stroke="#FCA5A5" strokeWidth="3" strokeDasharray="6 4" />
              <text
                x={isHero ? 18 : 12}
                y={isHero ? 5 : 3.5}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize={isHero ? 11 : 8}
                fontWeight="900"
                fontFamily="sans-serif"
              >
                ALL-IN
              </text>
            </g>
          </g>
        </svg>
      </div>
    );
  }

  if (gameId === 'roulette') {
    const sectors = 12;
    return (
      <div
        className={`relative w-full overflow-hidden bg-gradient-to-br from-[#022C22] via-[#065F46] to-[#0F172A] ${className}`}
      >
        <svg
          viewBox={isHero ? '0 0 640 280' : '0 0 400 210'}
          className="h-full w-full object-cover"
          aria-hidden="true"
        >
          {/* Roulette-Kessel links */}
          <g transform={isHero ? 'translate(180, 140)' : 'translate(115, 102)'}>
            <circle r={isHero ? 98 : 74} fill="#451A03" stroke="#F59E0B" strokeWidth="4" />
            <circle r={isHero ? 82 : 62} fill="#0F172A" stroke="#FBBF24" strokeWidth="2" />
            {Array.from({ length: sectors }, (_, i) => {
              const a1 = (i / sectors) * Math.PI * 2 - Math.PI / 2;
              const a2 = ((i + 1) / sectors) * Math.PI * 2 - Math.PI / 2;
              const rO = isHero ? 80 : 60;
              const rI = isHero ? 40 : 30;
              const x1 = rO * Math.cos(a1);
              const y1 = rO * Math.sin(a1);
              const x2 = rO * Math.cos(a2);
              const y2 = rO * Math.sin(a2);
              const x3 = rI * Math.cos(a2);
              const y3 = rI * Math.sin(a2);
              const x4 = rI * Math.cos(a1);
              const y4 = rI * Math.sin(a1);
              const fill = i === 0 ? '#059669' : i % 2 === 1 ? '#DC2626' : '#111827';
              return (
                <path
                  key={i}
                  d={`M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${rO} ${rO} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${rI} ${rI} 0 0 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`}
                  fill={fill}
                  stroke="#D97706"
                  strokeWidth="1.2"
                />
              );
            })}
            <circle r={isHero ? 40 : 30} fill="#064E3B" stroke="#F59E0B" strokeWidth="2.5" />
            <line x1={isHero ? -28 : -20} y1="0" x2={isHero ? 28 : 20} y2="0" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
            <line x1="0" y1={isHero ? -28 : -20} x2="0" y2={isHero ? 28 : 20} stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
            <circle r={isHero ? 11 : 8} fill="#FDE047" />
            {/* Kugel */}
            <circle
              cx={isHero ? 56 : 42}
              cy={isHero ? -34 : -26}
              r={isHero ? 7 : 5.5}
              fill="#F8FAFC"
              stroke="#0F172A"
              strokeWidth="1.5"
            />
          </g>

          {/* Wett-Karten & Casino-Chips rechts */}
          <g transform={isHero ? 'translate(325, 48)' : 'translate(215, 28)'}>
            <rect
              x="0"
              y="0"
              width={isHero ? 250 : 155}
              height={isHero ? 170 : 138}
              rx="14"
              fill="#064E3B"
              stroke="#34D399"
              strokeWidth="3"
            />
            {[
              { n: '17', bg: '#111827', x: 14, y: 14 },
              { n: '32', bg: '#DC2626', x: isHero ? 88 : 58, y: 14 },
              { n: '0', bg: '#059669', x: isHero ? 162 : 102, y: 14 },
            ].map((cell) => (
              <g key={cell.n} transform={`translate(${cell.x}, ${cell.y})`}>
                <rect
                  width={isHero ? 64 : 38}
                  height={isHero ? 44 : 32}
                  rx="8"
                  fill={cell.bg}
                  stroke="#FBBF24"
                  strokeWidth="2"
                />
                <text
                  x={isHero ? 32 : 19}
                  y={isHero ? 28 : 21}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={isHero ? 20 : 14}
                  fontWeight="900"
                  fontFamily="sans-serif"
                >
                  {cell.n}
                </text>
              </g>
            ))}

            {/* Chips */}
            {[
              { label: '100€', fill: '#1E293B', stroke: '#FBBF24', text: '#FDE68A', cx: isHero ? 56 : 38 },
              { label: '25€', fill: '#059669', stroke: '#6EE7B7', text: '#FFFFFF', cx: isHero ? 124 : 78 },
              { label: '5€', fill: '#DC2626', stroke: '#FCA5A5', text: '#FFFFFF', cx: isHero ? 192 : 118 },
            ].map((chip) => (
              <g key={chip.label} transform={`translate(${chip.cx}, ${isHero ? 114 : 90})`}>
                <circle
                  r={isHero ? 26 : 18}
                  fill={chip.fill}
                  stroke={chip.stroke}
                  strokeWidth="3"
                  strokeDasharray="6 4"
                />
                <text
                  y={isHero ? 5 : 4}
                  textAnchor="middle"
                  fill={chip.text}
                  fontSize={isHero ? 13 : 9.5}
                  fontWeight="900"
                  fontFamily="sans-serif"
                >
                  {chip.label}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    );
  }

  if (gameId === 'stadt-land-fluss') {
    return (
      <div
        className={`relative w-full overflow-hidden bg-gradient-to-br from-[#0B2942] via-[#155E75] to-[#0F172A] ${className}`}
      >
        <svg
          viewBox={isHero ? '0 0 640 280' : '0 0 400 210'}
          className="h-full w-full object-cover"
          aria-hidden="true"
        >
          {/* Großer Buchstabe links */}
          <g transform={isHero ? 'translate(88, 42)' : 'translate(32, 26)'}>
            <rect
              x="0"
              y="0"
              width={isHero ? '150' : '112'}
              height={isHero ? '160' : '132'}
              rx="22"
              fill="#0F172A"
              stroke="#22D3EE"
              strokeWidth="4"
            />
            <text
              x={isHero ? '75' : '56'}
              y={isHero ? '112' : '90'}
              textAnchor="middle"
              fill="#FDE68A"
              fontSize={isHero ? '96' : '74'}
              fontWeight="900"
              fontFamily="sans-serif"
            >
              S
            </text>
            <text
              x={isHero ? '75' : '56'}
              y={isHero ? '142' : '116'}
              textAnchor="middle"
              fill="#67E8F9"
              fontSize={isHero ? '12' : '10'}
              fontWeight="800"
              fontFamily="sans-serif"
            >
              BUCHSTABE
            </text>
          </g>

          {/* Kategorie-Karten rechts */}
          <g transform={isHero ? 'translate(270, 42)' : 'translate(166, 26)'}>
            {[
              { cat: 'STADT', word: 'STUTTGART', pts: '+10', color: '#38BDF8', y: 0 },
              { cat: 'LAND', word: 'SPANIEN', pts: '+5', color: '#F59E0B', y: isHero ? 56 : 46 },
              { cat: 'FLUSS', word: 'SPREE', pts: '+20', color: '#34D399', y: isHero ? 112 : 92 },
            ].map((row) => (
              <g key={row.cat} transform={`translate(0, ${row.y})`}>
                <rect
                  x="0"
                  y="0"
                  width={isHero ? '280' : '198'}
                  height={isHero ? '46' : '38'}
                  rx="12"
                  fill="#0F172A"
                  fillOpacity="0.88"
                  stroke={row.color}
                  strokeWidth="2.5"
                />
                <text
                  x="14"
                  y={isHero ? '28' : '23'}
                  fill="#94A3B8"
                  fontSize={isHero ? '11' : '9'}
                  fontWeight="800"
                  fontFamily="sans-serif"
                >
                  {row.cat}
                </text>
                <text
                  x={isHero ? '80' : '60'}
                  y={isHero ? '29' : '24'}
                  fill="#FFFFFF"
                  fontSize={isHero ? '14' : '11'}
                  fontWeight="900"
                  fontFamily="sans-serif"
                >
                  {row.word}
                </text>
                <text
                  x={isHero ? '262' : '184'}
                  y={isHero ? '28' : '23'}
                  textAnchor="end"
                  fill={row.color}
                  fontSize={isHero ? '13' : '11'}
                  fontWeight="900"
                  fontFamily="sans-serif"
                >
                  {row.pts}
                </text>
              </g>
            ))}
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
