import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   1. FACETTIERTER 3D-STERN (wie über dem "LEVEL 16" Fenster & an der Leiste)
   ═══════════════════════════════════════════════════════════════════════════ */
export function CrystalStar({
  active = true,
  size = 42,
  className = '',
}: {
  active?: boolean;
  size?: number;
  className?: string;
}) {
  // Helle Gold-Pfirsich-Facetten für aktive Sterne, dunkleres Bronze-Gold für den 3. Stern (exakt wie im Referenzbild)
  const c1 = active ? '#FFF1C9' : '#F3BE7A';
  const c2 = active ? '#FDE0A6' : '#E7A251';
  const c3 = active ? '#F6B969' : '#D48836';
  const c4 = active ? '#EAA14B' : '#BC7122';
  const stroke = active ? '#D9923E' : '#9E5D19';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`select-none overflow-visible drop-shadow-[0_3px_0_rgba(23,96,142,0.45)] ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 10 Facetten-Dreiecke vom Zentrum (50,53) zu den 5 Spitzen und 5 Innenecken */}
      {/* Spitze Oben (50,5) */}
      <polygon points="50,53 36,33 50,5" fill={c1} />
      <polygon points="50,53 50,5 64,33" fill={c2} />
      {/* Spitze Rechts-Oben (96,36) */}
      <polygon points="50,53 64,33 96,36" fill={c1} />
      <polygon points="50,53 96,36 71,59" fill={c3} />
      {/* Spitze Rechts-Unten (79,92) */}
      <polygon points="50,53 71,59 79,92" fill={c2} />
      <polygon points="50,53 79,92 50,74" fill={c4} />
      {/* Spitze Links-Unten (21,92) */}
      <polygon points="50,53 50,74 21,92" fill={c3} />
      <polygon points="50,53 21,92 29,59" fill={c2} />
      {/* Spitze Links-Oben (4,36) */}
      <polygon points="50,53 29,59 4,36" fill={c3} />
      <polygon points="50,53 4,36 36,33" fill={c1} />

      {/* Äußere Kontur */}
      <polygon
        points="50,5 64,33 96,36 71,59 79,92 50,74 21,92 29,59 4,36 36,33"
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. GOLDENE KRISTALL-MÜNZE (wie links an der unteren Fortschrittsleiste)
   ═══════════════════════════════════════════════════════════════════════════ */
export function CrystalCoin({
  size = 42,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`select-none overflow-visible drop-shadow-[0_3px_0_rgba(23,96,142,0.45)] ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Äußerer Münzkörper */}
      <circle cx="50" cy="50" r="45" fill="#FCD89B" stroke="#D99441" strokeWidth="3" />
      {/* Diagonale Glanz-Facette über der Münze */}
      <path
        d="M 18 18 A 45 45 0 0 1 82 18 L 18 82 A 45 45 0 0 1 18 18 Z"
        fill="#FFE7BA"
      />
      {/* Innerer Münzring */}
      <circle cx="50" cy="50" r="31" fill="#F5BE72" stroke="#E09B48" strokeWidth="3" />
      <path
        d="M 28 28 A 31 31 0 0 1 72 28 L 28 72 A 31 31 0 0 1 28 28 Z"
        fill="#FCD89B"
      />
      {/* Feine weiße Glanzlinie oben links */}
      <path
        d="M 20 35 A 36 36 0 0 1 45 14"
        fill="none"
        stroke="#FFF8E7"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. KRISTALL-FORTSCHRITTS- / STATUS-LEISTE MIT STERN ODER MÜNZE
   ═══════════════════════════════════════════════════════════════════════════ */
export function CrystalStatBar({
  type,
  value,
  onClick,
  className = '',
}: {
  type: 'star' | 'coin';
  value: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative inline-flex items-center select-none ${
        onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''
      } ${className}`}
    >
      {/* Überlappendes Icon links */}
      <div className="relative z-20 -mr-4 shrink-0">
        {type === 'star' ? <CrystalStar size={40} active /> : <CrystalCoin size={38} />}
      </div>

      {/* Abgeschrägter Kristall-Balken rechts */}
      <div className="relative z-10 flex h-8 sm:h-9 min-w-[96px] sm:min-w-[122px] items-center justify-center pl-6 pr-3.5 border-[3px] border-[#17608E] bg-[#52A9D6] shadow-[0_3px_0_rgba(12,62,96,0.45)] overflow-hidden">
        {/* Linke hellere Kristall-Hälfte (diagonaler Schnitt wie im Referenzbild) */}
        <div
          className="pointer-events-none absolute inset-0 bg-[#8DD7F7]"
          style={{ clipPath: 'polygon(0 0, 68% 0, 54% 100%, 0 100%)' }}
        />
        {/* Innerer heller Rahmen & Glanz */}
        <div className="pointer-events-none absolute inset-[2px] border border-[#CFF2FF]/75" />
        <span className="font-arcade relative z-10 text-sm sm:text-base tracking-wider text-[#135885] drop-shadow-[0_1px_0_rgba(255,255,255,0.7)]">
          {value}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. QUADRATISCHER / TRAPEZFÖRMIGER ICON-BUTTON (wie die 6 Buttons oben links)
   ═══════════════════════════════════════════════════════════════════════════ */
export function CrystalIconButton({
  children,
  tilt = 'left',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tilt?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses =
    size === 'sm'
      ? 'h-9 w-10 sm:h-10 sm:w-11'
      : size === 'lg'
        ? 'h-12 w-14 sm:h-14 sm:w-16'
        : 'h-10 w-12 sm:h-12 sm:w-14';

  const clip =
    tilt === 'left'
      ? 'polygon(2% 5%, 98% 0%, 100% 95%, 0% 100%)'
      : 'polygon(0% 0%, 100% 5%, 97% 100%, 3% 95%)';

  return (
    <button
      type="button"
      style={{ clipPath: clip }}
      className={`group relative inline-flex shrink-0 items-center justify-center bg-[#1A6798] p-[3px] transition-transform duration-150 hover:scale-105 active:scale-92 cursor-pointer select-none shadow-md ${sizeClasses} ${className}`}
      {...props}
    >
      {/* Mittlerer Rahmen */}
      <div
        style={{ clipPath: clip }}
        className="relative flex h-full w-full items-center justify-center bg-[#5ABCE8] p-[2px]"
      >
        {/* Innere Eis-Fläche mit diagonalen Kristall-Facetten */}
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#88D6F8]">
          {/* Helle diagonale Kristall-Spiegelung */}
          <div
            className="pointer-events-none absolute inset-0 bg-[#B6ECFD]"
            style={{ clipPath: 'polygon(0 0, 58% 0, 18% 100%, 0 100%)' }}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[#D4F4FE]/70"
            style={{ clipPath: 'polygon(28% 0, 48% 0, 8% 100%, 0 100%)' }}
          />
          {/* Weiße Kristall-Risslinie oben rechts */}
          <svg
            viewBox="0 0 60 50"
            className="pointer-events-none absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
          >
            <polyline
              points="4,8 48,5 54,18"
              fill="none"
              stroke="#E6F8FF"
              strokeWidth="1.5"
            />
          </svg>
          {/* Weißes Icon im Zentrum */}
          <div className="relative z-10 text-white drop-shadow-[0_1.5px_0_rgba(22,96,142,0.45)]">
            {children}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. ABGESCHRÄGTER TEXT-BUTTON ("EASY", "NORMAL", "HARD", "PLAY", "EXIT", "OK")
   ═══════════════════════════════════════════════════════════════════════════ */
export function CrystalButton({
  children,
  variant = 'primary',
  size = 'md',
  tilt = 'left',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  tilt?: 'left' | 'right';
  fullWidth?: boolean;
}) {
  const clip =
    tilt === 'left'
      ? 'polygon(0% 6%, 100% 0%, 98% 95%, 2% 100%)'
      : 'polygon(1% 0%, 99% 6%, 97% 100%, 0% 94%)';

  const padClasses =
    size === 'sm'
      ? 'h-9 px-4 text-xs sm:text-sm'
      : size === 'lg'
        ? 'h-12 sm:h-14 px-7 text-base sm:text-xl'
        : 'h-11 sm:h-12 px-6 text-sm sm:text-lg';

  const palette =
    variant === 'danger'
      ? {
          outer: '#7F1D1D',
          mid: '#F87171',
          bg: '#DC2626',
          facet: '#EF4444',
        }
      : variant === 'secondary'
        ? {
            outer: '#155B87',
            mid: '#7ED2F6',
            bg: '#4AAEE0',
            facet: '#67C1EC',
          }
        : {
            // Exakter "EASY / NORMAL / HARD / PLAY / CONTINUE / OK" Farbton aus dem Referenzbild
            outer: '#0E5A8A',
            mid: '#5EC2EE',
            bg: '#2B9FD6',
            facet: '#38ACE0',
          };

  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        clipPath: clip,
        backgroundColor: palette.outer,
      }}
      className={`group relative inline-flex items-center justify-center p-[3px] pb-[4px] pr-[4px] select-none transition-transform duration-150 ${
        disabled
          ? 'opacity-45 cursor-not-allowed'
          : 'hover:scale-[1.02] active:scale-95 cursor-pointer'
      } ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      <div
        style={{
          clipPath: clip,
          backgroundColor: palette.bg,
        }}
        className={`relative flex w-full items-center justify-center gap-2 overflow-hidden border-t-2 border-l-2 border-[#7AD3F7] ${padClasses}`}
      >
        {/* Diagonale hellere Kristall-Facette wie auf den Referenz-Buttons */}
        <div
          style={{
            backgroundColor: palette.facet,
            clipPath: 'polygon(0 0, 58% 0, 38% 100%, 0 100%)',
          }}
          className="pointer-events-none absolute inset-0"
        />

        {/* Charakteristischer spitzer weißer Lichtreflex oben links */}
        <svg
          viewBox="0 0 200 56"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <polygon
            points="6,6 95,3 42,13 6,16"
            fill="#AEE8FC"
            fillOpacity="0.65"
          />
          <polyline
            points="5,18 5,5 110,3"
            fill="none"
            stroke="#E3F7FF"
            strokeWidth="2"
          />
        </svg>

        {/* Text im fetten weißen Arcade-Versalien-Stil */}
        <span className="font-arcade relative z-10 flex items-center justify-center gap-2 tracking-wider text-white uppercase drop-shadow-[0_2px_0_rgba(10,58,92,0.7)]">
          {children}
        </span>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. SCORE / REWARD ANZEIGE-FELD (wie "25873" und "63581" unter SCORE / REWARD)
   ═══════════════════════════════════════════════════════════════════════════ */
export function CrystalReadout({
  label,
  value,
  className = '',
}: {
  label?: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {label && (
        <span className="font-arcade mb-1 text-sm sm:text-base tracking-wider text-[#15608E] uppercase">
          {label}
        </span>
      )}
      <div
        style={{
          clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)',
        }}
        className="relative flex min-w-[145px] sm:min-w-[175px] items-center justify-center bg-[#17689A] p-[2.5px]"
      >
        <div
          style={{
            clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)',
          }}
          className="relative flex w-full items-center justify-center overflow-hidden bg-[#39A9DD] px-5 py-1.5 sm:py-2 border border-[#8AD8F8]"
        >
          {/* Diagonale Facette */}
          <div
            className="pointer-events-none absolute inset-0 bg-[#4EB6E6]"
            style={{ clipPath: 'polygon(0 0, 52% 0, 32% 100%, 0 100%)' }}
          />
          {/* Weißer Kristall-Glanzstreifen oben */}
          <svg
            viewBox="0 0 180 44"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <polygon points="6,6 155,3 95,12 6,14" fill="#B8ECFD" fillOpacity="0.6" />
            <line x1="6" y1="6" x2="155" y2="3" stroke="#E8F9FF" strokeWidth="1.8" />
          </svg>
          <span className="font-arcade relative z-10 text-base sm:text-xl tracking-wider text-white uppercase drop-shadow-[0_1.5px_0_rgba(12,65,102,0.65)]">
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. KRISTALL-SCHIEBEREGLER / TOGGLE (wie "MUSIC" und "SOUND" in OPTIONS)
   ═══════════════════════════════════════════════════════════════════════════ */
export function CrystalSlider({
  label,
  value,
  onChange,
  className = '',
}: {
  label: string;
  value: number; // 0..100
  onChange: (nextVal: number) => void;
  className?: string;
}) {
  const clamped = Math.max(8, Math.min(92, value));

  return (
    <div className={`flex flex-col items-center w-full select-none ${className}`}>
      <span className="font-arcade mb-2 text-lg sm:text-2xl tracking-wider text-[#15608E] uppercase">
        {label}
      </span>

      <div
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
          onChange(pct > 50 ? 82 : 18);
        }}
        className="relative flex h-10 w-full max-w-[260px] items-center cursor-pointer"
      >
        {/* Horizontale dunkelblaue Schiene mit cyanfarbenem Lichtkern */}
        <div className="h-2.5 w-full border-2 border-[#12608E] bg-[#3BA8DC] shadow-xs" />

        {/* Trapezförmiger Kristall-Schiebeknopf (exakt wie im OPTIONS-Fenster) */}
        <div
          style={{
            left: `${clamped}%`,
            clipPath: 'polygon(0% 0%, 100% 6%, 84% 100%, 16% 100%)',
          }}
          className=" absolute -translate-x-1/2 h-9 w-7 bg-[#12608E] p-[2px] transition-all duration-200 hover:scale-110"
        >
          <div
            style={{
              clipPath: 'polygon(0% 0%, 100% 6%, 84% 100%, 16% 100%)',
            }}
            className="relative h-full w-full overflow-hidden bg-[#5AC2EE]"
          >
            {/* Vertikaler weißer Kristall-Glanzstreifen im Griff */}
            <div
              className="absolute inset-y-0 left-1.5 w-2 bg-[#D6F4FF]"
              style={{ clipPath: 'polygon(0 0, 100% 0, 75% 100%, 15% 100%)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. KRISTALL-FENSTER / PANEL ("DIFFICULTY", "LEVEL 16", "OPTIONS")
   ═══════════════════════════════════════════════════════════════════════════ */
export function CrystalPanel({
  children,
  title,
  topTabLabel,
  stars,
  className = '',
  contentClassName = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  title?: ReactNode;
  topTabLabel?: string;
  stars?: 0 | 1 | 2 | 3;
  contentClassName?: string;
}) {
  return (
    <div className={`relative flex flex-col items-center ${className}`} {...props}>
      {/* Optionaler Trapez-Reiter oben auf dem Panel (wie "OPTIONS" im Referenzbild) */}
      {topTabLabel && (
        <div
          style={{
            clipPath: 'polygon(0% 0%, 100% 6%, 92% 100%, 8% 100%)',
          }}
          className="relative z-10 -mb-[4px] bg-[#17608E] p-[3.5px] pb-0"
        >
          <div
            style={{
              clipPath: 'polygon(0% 0%, 100% 6%, 92% 100%, 8% 100%)',
            }}
            className="relative overflow-hidden border-2 border-b-0 border-[#68C5EE] bg-[#9CE0FA] px-8 py-1.5 sm:px-10 sm:py-2"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[#B6ECFD]"
              style={{ clipPath: 'polygon(0 0, 48% 0, 68% 100%, 0 100%)' }}
            />
            <span className="font-arcade relative z-10 text-lg sm:text-2xl tracking-wider text-[#15608E] uppercase">
              {topTabLabel}
            </span>
          </div>
        </div>
      )}

      {/* Optionaler 3-Sterne-Bogen auf dem oberen Panelrand (wie bei "LEVEL 16") */}
      {typeof stars === 'number' && (
        <div className="relative z-30 -mb-5 flex items-end justify-center gap-1 sm:gap-2">
          <div className="-rotate-12 translate-y-1">
            <CrystalStar size={44} active={stars >= 1} />
          </div>
          <div className="-translate-y-1 scale-110">
            <CrystalStar size={48} active={stars >= 2} />
          </div>
          <div className="rotate-12 translate-y-1">
            <CrystalStar size={44} active={stars >= 3} />
          </div>
        </div>
      )}

      {/* Haupt-Kristall-Rechteck mit dunkelblauem Außenrahmen & cyanfarbenem Innenrahmen */}
      <div className="relative w-full border-[4px] border-[#17608E] bg-[#9CE0FA] shadow-[0_12px_0_rgba(14,62,96,0.38)] overflow-hidden">
        {/* Innerer hellblauer Kristall-Bevel-Rahmen */}
        <div className="pointer-events-none absolute inset-0 border-[4px] border-[#66C4EE] z-20" />

        {/* Hintergrund-Facetten & Kristall-Risslinien (wie im Referenzbild) */}
        <svg
          viewBox="0 0 300 420"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full z-0"
        >
          {/* Helle diagonale Eis-Facetten */}
          <polygon points="0,0 165,0 95,420 0,420" fill="#ADE6FB" />
          <polygon points="0,0 65,0 135,280 0,190" fill="#BDEBFC" />
          <polygon points="210,0 300,0 300,195 145,120" fill="#8ED7F6" />
          <polygon points="110,260 300,185 300,420 65,420" fill="#92D9F7" />

          {/* Charakteristische helle & türkise Kristall-Bruchlinien an den Ecken */}
          <polyline
            points="6,6 52,185 18,245 78,340"
            fill="none"
            stroke="#DDF6FF"
            strokeWidth="2"
          />
          <polyline
            points="12,412 68,365 135,382 185,335"
            fill="none"
            stroke="#DDF6FF"
            strokeWidth="2.2"
          />
          <polyline
            points="215,8 192,68 242,95 232,175 288,215"
            fill="none"
            stroke="#75CAF0"
            strokeWidth="2"
          />
        </svg>

        {/* Inhalt des Kristall-Fensters */}
        <div className={`relative z-10 flex flex-col items-center p-5 sm:p-6 ${contentClassName}`}>
          {title && (
            <h2 className="font-arcade mb-4 text-center text-2xl sm:text-3xl tracking-wider text-[#15608E] uppercase">
              {title}
            </h2>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
