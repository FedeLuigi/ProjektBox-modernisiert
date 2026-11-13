import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import type { CrystalAccent } from '../data/games';

export interface AccentPalette {
  outer: string;
  bg: string;
  facet: string;
  topBorder: string;
  sheenFill: string;
  sheenStroke: string;
  text: string;
  shadow: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  panelBorder: string;
  panelInnerBorder: string;
  panelTintA: string;
  panelTintB: string;
}

export const ACCENT_PALETTES: Record<CrystalAccent, AccentPalette> = {
  amber: {
    outer: '#78350F',
    bg: '#EA580C',
    facet: '#F97316',
    topBorder: '#FDBA74',
    sheenFill: '#FFEDD5',
    sheenStroke: '#FFF7ED',
    text: '#FFFFFF',
    shadow: 'rgba(120,53,15,0.75)',
    badgeBg: '#FFF7ED',
    badgeText: '#C2410C',
    badgeBorder: '#F97316',
    panelBorder: '#9A3412',
    panelInnerBorder: '#FDBA74',
    panelTintA: '#FFF7ED',
    panelTintB: '#FFEDD5',
  },
  coral: {
    outer: '#881337',
    bg: '#E11D48',
    facet: '#F43F5E',
    topBorder: '#FDA4AF',
    sheenFill: '#FFE4E6',
    sheenStroke: '#FFF1F2',
    text: '#FFFFFF',
    shadow: 'rgba(136,19,55,0.75)',
    badgeBg: '#FFF1F2',
    badgeText: '#BE123C',
    badgeBorder: '#F43F5E',
    panelBorder: '#9F1239',
    panelInnerBorder: '#FDA4AF',
    panelTintA: '#FFF1F2',
    panelTintB: '#FFE4E6',
  },
  emerald: {
    outer: '#064E3B',
    bg: '#059669',
    facet: '#10B981',
    topBorder: '#6EE7B7',
    sheenFill: '#D1FAE5',
    sheenStroke: '#ECFDF5',
    text: '#FFFFFF',
    shadow: 'rgba(6,78,59,0.75)',
    badgeBg: '#ECFDF5',
    badgeText: '#047857',
    badgeBorder: '#10B981',
    panelBorder: '#065F46',
    panelInnerBorder: '#6EE7B7',
    panelTintA: '#ECFDF5',
    panelTintB: '#D1FAE5',
  },
  violet: {
    outer: '#4C1D95',
    bg: '#7C3AED',
    facet: '#8B5CF6',
    topBorder: '#C4B5FD',
    sheenFill: '#EDE9FE',
    sheenStroke: '#F5F3FF',
    text: '#FFFFFF',
    shadow: 'rgba(76,29,149,0.75)',
    badgeBg: '#F5F3FF',
    badgeText: '#6D28D9',
    badgeBorder: '#8B5CF6',
    panelBorder: '#5B21B6',
    panelInnerBorder: '#C4B5FD',
    panelTintA: '#F5F3FF',
    panelTintB: '#EDE9FE',
  },
  rose: {
    outer: '#831843',
    bg: '#DB2777',
    facet: '#EC4899',
    topBorder: '#F9A8D4',
    sheenFill: '#FCE7F3',
    sheenStroke: '#FDF2F8',
    text: '#FFFFFF',
    shadow: 'rgba(131,24,67,0.75)',
    badgeBg: '#FDF2F8',
    badgeText: '#BE185D',
    badgeBorder: '#EC4899',
    panelBorder: '#9D174D',
    panelInnerBorder: '#F9A8D4',
    panelTintA: '#FDF2F8',
    panelTintB: '#FCE7F3',
  },
  gold: {
    outer: '#713F12',
    bg: '#D97706',
    facet: '#F59E0B',
    topBorder: '#FDE68A',
    sheenFill: '#FEF3C7',
    sheenStroke: '#FFFBEB',
    text: '#FFFFFF',
    shadow: 'rgba(113,63,18,0.75)',
    badgeBg: '#FFFBEB',
    badgeText: '#B45309',
    badgeBorder: '#F59E0B',
    panelBorder: '#92400E',
    panelInnerBorder: '#FDE68A',
    panelTintA: '#FFFBEB',
    panelTintB: '#FEF3C7',
  },
  indigo: {
    outer: '#1E1B4B',
    bg: '#4F46E5',
    facet: '#6366F1',
    topBorder: '#A5B4FC',
    sheenFill: '#E0E7FF',
    sheenStroke: '#EEF2FF',
    text: '#FFFFFF',
    shadow: 'rgba(30,27,75,0.75)',
    badgeBg: '#EEF2FF',
    badgeText: '#4338CA',
    badgeBorder: '#6366F1',
    panelBorder: '#3730A3',
    panelInnerBorder: '#A5B4FC',
    panelTintA: '#EEF2FF',
    panelTintB: '#E0E7FF',
  },
  cyan: {
    outer: '#0E5A8A',
    bg: '#0284C7',
    facet: '#0EA5E9',
    topBorder: '#7DD3FC',
    sheenFill: '#E0F2FE',
    sheenStroke: '#F0F9FF',
    text: '#FFFFFF',
    shadow: 'rgba(14,90,138,0.75)',
    badgeBg: '#F0F9FF',
    badgeText: '#0369A1',
    badgeBorder: '#0EA5E9',
    panelBorder: '#075985',
    panelInnerBorder: '#7DD3FC',
    panelTintA: '#F0F9FF',
    panelTintB: '#E0F2FE',
  },
};

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
  const c1 = active ? '#FFF7D6' : '#E2E8F0';
  const c2 = active ? '#FDE08D' : '#CBD5E1';
  const c3 = active ? '#F59E0B' : '#94A3B8';
  const c4 = active ? '#D97706' : '#64748B';
  const stroke = active ? '#92400E' : '#475569';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`select-none overflow-visible drop-shadow-[0_3px_0_rgba(15,23,42,0.45)] ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="50,53 36,33 50,5" fill={c1} />
      <polygon points="50,53 50,5 64,33" fill={c2} />
      <polygon points="50,53 64,33 96,36" fill={c1} />
      <polygon points="50,53 96,36 71,59" fill={c3} />
      <polygon points="50,53 71,59 79,92" fill={c2} />
      <polygon points="50,53 79,92 50,74" fill={c4} />
      <polygon points="50,53 50,74 21,92" fill={c3} />
      <polygon points="50,53 21,92 29,59" fill={c2} />
      <polygon points="50,53 29,59 4,36" fill={c3} />
      <polygon points="50,53 4,36 36,33" fill={c1} />

      <polygon
        points="50,5 64,33 96,36 71,59 79,92 50,74 21,92 29,59 4,36 36,33"
        fill="none"
        stroke={stroke}
        strokeWidth="2.8"
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
      className={`select-none overflow-visible drop-shadow-[0_3px_0_rgba(15,23,42,0.45)] ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="45" fill="#FDE68A" stroke="#B45309" strokeWidth="3.2" />
      <path
        d="M 18 18 A 45 45 0 0 1 82 18 L 18 82 A 45 45 0 0 1 18 18 Z"
        fill="#FEF3C7"
      />
      <circle cx="50" cy="50" r="31" fill="#F59E0B" stroke="#92400E" strokeWidth="3" />
      <path
        d="M 28 28 A 31 31 0 0 1 72 28 L 28 72 A 31 31 0 0 1 28 28 Z"
        fill="#FBBF24"
      />
      <path
        d="M 20 35 A 36 36 0 0 1 45 14"
        fill="none"
        stroke="#FFFBEB"
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
  const isStar = type === 'star';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`relative inline-flex items-center select-none ${
        onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''
      } ${className}`}
    >
      {/* Überlappendes Icon links */}
      <div className="relative z-20 -mr-3.5 sm:-mr-4 shrink-0">
        {isStar ? (
          <CrystalStar size={34} active className="sm:w-[40px] sm:h-[40px]" />
        ) : (
          <CrystalCoin size={32} className="sm:w-[38px] sm:h-[38px]" />
        )}
      </div>

      {/* Abgeschrägter Kristall-Balken rechts: Neutral-Perlmutt für Sterne, Warm-Gold für Münzen */}
      <div
        className={`relative z-10 flex h-7 sm:h-9 landscape:h-7 min-w-[78px] sm:min-w-[116px] items-center justify-center pl-4 sm:pl-6 pr-2.5 sm:pr-3.5 border-[2.5px] sm:border-[3px] shadow-[0_3px_0_rgba(15,23,42,0.45)] overflow-hidden ${
          isStar
            ? 'border-[#334155] bg-[#E2E8F0]'
            : 'border-[#92400E] bg-[#FDE68A]'
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-0 ${
            isStar ? 'bg-[#F8FAFC]' : 'bg-[#FEF3C7]'
          }`}
          style={{ clipPath: 'polygon(0 0, 68% 0, 54% 100%, 0 100%)' }}
        />
        <div
          className={`pointer-events-none absolute inset-[2px] border ${
            isStar ? 'border-white/90' : 'border-[#FFFBEB]/85'
          }`}
        />
        <span
          className={`font-arcade relative z-10 text-xs sm:text-base landscape:text-xs tracking-wider truncate max-w-[110px] sm:max-w-none ${
            isStar
              ? 'text-[#1E293B] drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]'
              : 'text-[#78350F] drop-shadow-[0_1px_0_rgba(255,255,255,0.85)]'
          }`}
        >
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
  variant = 'neutral',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tilt?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'neutral' | 'crystal' | 'amber' | 'emerald' | 'rose';
}) {
  const sizeClasses =
    size === 'sm'
      ? 'h-8 w-9 sm:h-9 sm:w-10'
      : size === 'lg'
        ? 'h-11 w-13 sm:h-14 sm:w-16'
        : 'h-9 w-10 sm:h-11 sm:w-13 landscape:h-9 landscape:w-10';

  const clip =
    tilt === 'left'
      ? 'polygon(2% 5%, 98% 0%, 100% 95%, 0% 100%)'
      : 'polygon(0% 0%, 100% 5%, 97% 100%, 3% 95%)';

  const styles =
    variant === 'emerald'
      ? {
          outer: '#064E3B',
          mid: '#34D399',
          base: '#10B981',
          facet1: '#6EE7B7',
          facet2: '#A7F3D0',
          stroke: '#ECFDF5',
          iconText: 'text-white drop-shadow-[0_1.5px_0_rgba(6,78,59,0.65)]',
        }
      : variant === 'amber'
        ? {
            outer: '#78350F',
            mid: '#FBBF24',
            base: '#F59E0B',
            facet1: '#FDE68A',
            facet2: '#FEF3C7',
            stroke: '#FFFBEB',
            iconText: 'text-white drop-shadow-[0_1.5px_0_rgba(120,53,15,0.65)]',
          }
        : variant === 'rose'
          ? {
              outer: '#831843',
              mid: '#F472B6',
              base: '#EC4899',
              facet1: '#F9A8D4',
              facet2: '#FCE7F3',
              stroke: '#FDF2F8',
              iconText: 'text-white drop-shadow-[0_1.5px_0_rgba(131,24,67,0.65)]',
            }
          : variant === 'crystal'
            ? {
                outer: '#1A6798',
                mid: '#5ABCE8',
                base: '#88D6F8',
                facet1: '#B6ECFD',
                facet2: '#D4F4FE',
                stroke: '#E6F8FF',
                iconText: 'text-white drop-shadow-[0_1.5px_0_rgba(22,96,142,0.5)]',
              }
            : {
                outer: '#334155',
                mid: '#CBD5E1',
                base: '#E2E8F0',
                facet1: '#F1F5F9',
                facet2: '#FFFFFF',
                stroke: '#FFFFFF',
                iconText: 'text-[#1E293B] drop-shadow-[0_1px_0_rgba(255,255,255,0.85)]',
              };

  return (
    <button
      type="button"
      style={{ clipPath: clip, backgroundColor: styles.outer }}
      className={`group relative inline-flex shrink-0 items-center justify-center p-[2.5px] sm:p-[3px] transition-transform duration-150 hover:scale-105 active:scale-92 cursor-pointer select-none shadow-[0_4px_0_rgba(15,23,42,0.35)] ${sizeClasses} ${className}`}
      {...props}
    >
      <div
        style={{ clipPath: clip, backgroundColor: styles.mid }}
        className="relative flex h-full w-full items-center justify-center p-[2px]"
      >
        <div
          style={{ backgroundColor: styles.base }}
          className="relative flex h-full w-full items-center justify-center overflow-hidden"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundColor: styles.facet1,
              clipPath: 'polygon(0 0, 58% 0, 18% 100%, 0 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-75"
            style={{
              backgroundColor: styles.facet2,
              clipPath: 'polygon(28% 0, 48% 0, 8% 100%, 0 100%)',
            }}
          />
          <svg
            viewBox="0 0 60 50"
            className="pointer-events-none absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
          >
            <polyline
              points="4,8 48,5 54,18"
              fill="none"
              stroke={styles.stroke}
              strokeWidth="1.5"
            />
          </svg>
          <div className={`relative z-10 ${styles.iconText}`}>
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
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | CrystalAccent;
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
      ? 'h-8 sm:h-9 landscape:h-8 px-3 sm:px-4 text-xs sm:text-sm landscape:text-xs'
      : size === 'lg'
        ? 'h-11 sm:h-14 landscape:h-10 px-5 sm:px-7 text-base sm:text-xl landscape:text-sm'
        : 'h-10 sm:h-12 landscape:h-9 px-4 sm:px-6 text-sm sm:text-lg landscape:text-sm';

  const palette =
    variant === 'danger'
      ? {
          outer: '#881337',
          bg: '#E11D48',
          facet: '#F43F5E',
          topBorder: '#FDA4AF',
          sheenFill: '#FFE4E6',
          sheenStroke: '#FFF1F2',
          textClass: 'text-white drop-shadow-[0_2px_0_rgba(136,19,55,0.75)]',
        }
      : variant === 'secondary'
        ? {
            // Neutrales Schiefer-Perlmutt für Nebenaktionen (EXIT, HOME, BACK, inaktive Filter)
            outer: '#334155',
            bg: '#E2E8F0',
            facet: '#F1F5F9',
            topBorder: '#FFFFFF',
            sheenFill: '#FFFFFF',
            sheenStroke: '#FFFFFF',
            textClass: 'text-[#1E293B] drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]',
          }
        : variant === 'success'
          ? {
              outer: '#78350F',
              bg: '#D97706',
              facet: '#F59E0B',
              topBorder: '#FDE68A',
              sheenFill: '#FEF3C7',
              sheenStroke: '#FFFBEB',
              textClass: 'text-white drop-shadow-[0_2px_0_rgba(120,53,15,0.75)]',
            }
          : variant === 'primary'
            ? {
                // Vitales Smaragd-Jade für primäre Hauptaktionen (PLAY, READY, OK)
                outer: '#064E3B',
                bg: '#059669',
                facet: '#10B981',
                topBorder: '#6EE7B7',
                sheenFill: '#D1FAE5',
                sheenStroke: '#ECFDF5',
                textClass: 'text-white drop-shadow-[0_2px_0_rgba(6,78,59,0.75)]',
              }
            : {
                outer: ACCENT_PALETTES[variant].outer,
                bg: ACCENT_PALETTES[variant].bg,
                facet: ACCENT_PALETTES[variant].facet,
                topBorder: ACCENT_PALETTES[variant].topBorder,
                sheenFill: ACCENT_PALETTES[variant].sheenFill,
                sheenStroke: ACCENT_PALETTES[variant].sheenStroke,
                textClass: `text-white drop-shadow-[0_2px_0_${ACCENT_PALETTES[variant].shadow}]`,
              };

  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        clipPath: clip,
        backgroundColor: palette.outer,
      }}
      className={`group relative inline-flex items-center justify-center p-[2.5px] sm:p-[3px] pb-[3.5px] sm:pb-[4px] pr-[3.5px] sm:pr-[4px] select-none transition-transform duration-150 ${
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
          borderColor: palette.topBorder,
        }}
        className={`relative flex w-full items-center justify-center gap-1.5 sm:gap-2 overflow-hidden border-t-2 border-l-2 ${padClasses}`}
      >
        <div
          style={{
            backgroundColor: palette.facet,
            clipPath: 'polygon(0 0, 58% 0, 38% 100%, 0 100%)',
          }}
          className="pointer-events-none absolute inset-0"
        />

        <svg
          viewBox="0 0 200 56"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <polygon
            points="6,6 95,3 42,13 6,16"
            fill={palette.sheenFill}
            fillOpacity="0.65"
          />
          <polyline
            points="5,18 5,5 110,3"
            fill="none"
            stroke={palette.sheenStroke}
            strokeWidth="2"
          />
        </svg>

        <span className={`font-arcade relative z-10 flex items-center justify-center gap-1.5 tracking-wider uppercase truncate ${palette.textClass}`}>
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
  variant,
  className = '',
}: {
  label?: string;
  value: ReactNode;
  variant?: 'neutral' | 'gold' | 'crystal' | 'emerald' | 'rose' | 'violet';
  className?: string;
}) {
  // Automatische Differenzierung: REWARD / COIN / WORD erhalten warme Gold-Akzente, SCORE / Standard ruhiges Schiefer-Kristall
  const resolvedVariant =
    variant ??
    (label && /reward|coin|bonus|best/i.test(label) ? 'gold' : 'neutral');

  const style =
    resolvedVariant === 'gold'
      ? {
          outer: '#78350F',
          bg: '#D97706',
          facet: '#F59E0B',
          border: '#FDE68A',
          sheen: '#FEF3C7',
          line: '#FFFBEB',
          text: 'text-white drop-shadow-[0_1.5px_0_rgba(120,53,15,0.75)]',
        }
      : resolvedVariant === 'emerald'
        ? {
            outer: '#064E3B',
            bg: '#059669',
            facet: '#10B981',
            border: '#6EE7B7',
            sheen: '#D1FAE5',
            line: '#ECFDF5',
            text: 'text-white drop-shadow-[0_1.5px_0_rgba(6,78,59,0.75)]',
          }
        : resolvedVariant === 'rose'
          ? {
              outer: '#831843',
              bg: '#DB2777',
              facet: '#EC4899',
              border: '#F9A8D4',
              sheen: '#FCE7F3',
              line: '#FDF2F8',
              text: 'text-white drop-shadow-[0_1.5px_0_rgba(131,24,67,0.75)]',
            }
          : resolvedVariant === 'violet'
            ? {
                outer: '#4C1D95',
                bg: '#7C3AED',
                facet: '#8B5CF6',
                border: '#C4B5FD',
                sheen: '#EDE9FE',
                line: '#F5F3FF',
                text: 'text-white drop-shadow-[0_1.5px_0_rgba(76,29,149,0.75)]',
              }
            : resolvedVariant === 'crystal'
              ? {
                  outer: '#17689A',
                  bg: '#39A9DD',
                  facet: '#4EB6E6',
                  border: '#8AD8F8',
                  sheen: '#B8ECFD',
                  line: '#E8F9FF',
                  text: 'text-white drop-shadow-[0_1.5px_0_rgba(12,65,102,0.65)]',
                }
              : {
                  // Kontrastreiches Schiefer-Kristall für beste Zahlen-Lesbarkeit ohne Blaudominanz
                  outer: '#0F172A',
                  bg: '#1E293B',
                  facet: '#334155',
                  border: '#64748B',
                  sheen: '#94A3B8',
                  line: '#E2E8F0',
                  text: 'text-[#F8FAFC] drop-shadow-[0_1.5px_0_rgba(2,6,23,0.85)]',
                };

  return (
    <div className={`flex flex-col items-center min-w-0 ${className}`}>
      {label && (
        <span className="font-arcade mb-0.5 sm:mb-1 text-[11px] sm:text-sm landscape:text-[11px] tracking-wider text-[#334155] uppercase">
          {label}
        </span>
      )}
      <div
        style={{
          clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)',
          backgroundColor: style.outer,
        }}
        className="relative flex w-full min-w-[105px] sm:min-w-[165px] landscape:min-w-[110px] items-center justify-center p-[2.5px]"
      >
        <div
          style={{
            clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)',
            backgroundColor: style.bg,
            borderColor: style.border,
          }}
          className="relative flex w-full items-center justify-center overflow-hidden px-3 sm:px-5 py-1 sm:py-1.5 landscape:py-1 border"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundColor: style.facet,
              clipPath: 'polygon(0 0, 52% 0, 32% 100%, 0 100%)',
            }}
          />
          <svg
            viewBox="0 0 180 44"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <polygon points="6,6 155,3 95,12 6,14" fill={style.sheen} fillOpacity="0.45" />
            <line x1="6" y1="6" x2="155" y2="3" stroke={style.line} strokeWidth="1.6" />
          </svg>
          <span className={`font-arcade relative z-10 text-sm sm:text-lg landscape:text-sm tracking-wider uppercase truncate max-w-[190px] sm:max-w-[260px] ${style.text}`}>
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
  const isOn = value > 50;

  return (
    <div className={`flex flex-col items-center w-full select-none ${className}`}>
      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
        <span className="font-arcade text-base sm:text-2xl landscape:text-base tracking-wider text-[#1E293B] uppercase">
          {label}
        </span>
        <span
          className={`font-arcade text-[10px] sm:text-xs px-2 py-0.5 border ${
            isOn
              ? 'bg-[#ECFDF5] text-[#047857] border-[#10B981]'
              : 'bg-[#E2E8F0] text-[#475569] border-[#94A3B8]'
          }`}
        >
          {isOn ? 'ON' : 'OFF'}
        </span>
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onChange(value > 50 ? 18 : 82);
          }
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
          onChange(pct > 50 ? 82 : 18);
        }}
        className="relative flex h-9 sm:h-10 w-full max-w-[260px] items-center cursor-pointer"
      >
        <div
          className={`h-3 w-full border-2 transition-colors ${
            isOn
              ? 'border-[#065F46] bg-[#10B981]'
              : 'border-[#475569] bg-[#CBD5E1]'
          } shadow-inner`}
        />

        <div
          style={{
            left: `${clamped}%`,
            clipPath: 'polygon(0% 0%, 100% 6%, 84% 100%, 16% 100%)',
          }}
          className={`absolute -translate-x-1/2 h-8 sm:h-9 w-6 sm:w-7 p-[2px] transition-all duration-200 hover:scale-110 ${
            isOn ? 'bg-[#064E3B]' : 'bg-[#334155]'
          }`}
        >
          <div
            style={{
              clipPath: 'polygon(0% 0%, 100% 6%, 84% 100%, 16% 100%)',
            }}
            className={`relative h-full w-full overflow-hidden ${
              isOn ? 'bg-[#34D399]' : 'bg-[#F8FAFC]'
            }`}
          >
            <div
              className="absolute inset-y-0 left-1.5 w-2 bg-white/85"
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
  variant = 'frost',
  accent,
  className = '',
  contentClassName = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  title?: ReactNode;
  topTabLabel?: string;
  stars?: 0 | 1 | 2 | 3;
  variant?: 'frost' | 'crystal' | 'slate';
  accent?: CrystalAccent;
  contentClassName?: string;
}) {
  const accentInfo = accent ? ACCENT_PALETTES[accent] : null;

  const surface =
    variant === 'slate'
      ? {
          outerBorder: '#0F172A',
          bg: '#1E293B',
          innerBorder: '#475569',
          f1: '#26354D',
          f2: '#334155',
          f3: '#192338',
          f4: '#1E293B',
          crackLight: '#64748B',
          crackDark: '#0F172A',
          titleText: 'text-[#F8FAFC]',
          tabOuter: '#0F172A',
          tabBg: '#334155',
          tabFacet: '#475569',
          tabBorder: '#64748B',
          tabText: 'text-white',
        }
      : variant === 'crystal'
        ? {
            outerBorder: '#17608E',
            bg: '#9CE0FA',
            innerBorder: '#66C4EE',
            f1: '#ADE6FB',
            f2: '#BDEBFC',
            f3: '#8ED7F6',
            f4: '#92D9F7',
            crackLight: '#DDF6FF',
            crackDark: '#75CAF0',
            titleText: 'text-[#15608E]',
            tabOuter: '#17608E',
            tabBg: '#9CE0FA',
            tabFacet: '#B6ECFD',
            tabBorder: '#68C5EE',
            tabText: 'text-[#15608E]',
          }
        : {
            // Edle helle Frost-/Perlmutt-Kristalloberfläche mit optionaler Akzent-Tönung
            outerBorder: accentInfo ? accentInfo.panelBorder : '#2B425B',
            bg: '#EEF4F9',
            innerBorder: accentInfo ? accentInfo.panelInnerBorder : '#FFFFFF',
            f1: accentInfo ? accentInfo.panelTintA : '#F8FAFC',
            f2: '#FFFFFF',
            f3: accentInfo ? accentInfo.panelTintB : '#E2ECF5',
            f4: '#E8F0F8',
            crackLight: '#FFFFFF',
            crackDark: '#CBD5E1',
            titleText: 'text-[#1E293B]',
            tabOuter: accentInfo ? accentInfo.outer : '#2B425B',
            tabBg: accentInfo ? accentInfo.bg : '#334155',
            tabFacet: accentInfo ? accentInfo.facet : '#475569',
            tabBorder: accentInfo ? accentInfo.topBorder : '#94A3B8',
            tabText: 'text-white',
          };

  return (
    <div className={`relative flex flex-col items-center ${className}`} {...props}>
      {/* Optionaler Trapez-Reiter oben auf dem Panel (wie "OPTIONS" im Referenzbild) */}
      {topTabLabel && (
        <div
          style={{
            clipPath: 'polygon(0% 0%, 100% 6%, 92% 100%, 8% 100%)',
            backgroundColor: surface.tabOuter,
          }}
          className="relative z-10 -mb-[4px] p-[3.5px] pb-0"
        >
          <div
            style={{
              clipPath: 'polygon(0% 0%, 100% 6%, 92% 100%, 8% 100%)',
              backgroundColor: surface.tabBg,
              borderColor: surface.tabBorder,
            }}
            className="relative overflow-hidden border-2 border-b-0 px-6 py-1 sm:px-10 sm:py-1.5 landscape:py-1"
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundColor: surface.tabFacet,
                clipPath: 'polygon(0 0, 48% 0, 68% 100%, 0 100%)',
              }}
            />
            <span className={`font-arcade relative z-10 text-base sm:text-xl landscape:text-sm tracking-wider uppercase drop-shadow-[0_1.5px_0_rgba(15,23,42,0.5)] ${surface.tabText}`}>
              {topTabLabel}
            </span>
          </div>
        </div>
      )}

      {/* Optionaler 3-Sterne-Bogen auf dem oberen Panelrand (wie bei "LEVEL 16") */}
      {typeof stars === 'number' && (
        <div className="relative z-30 -mb-4 sm:-mb-5 landscape:-mb-3.5 flex items-end justify-center gap-1 sm:gap-2">
          <div className="-rotate-12 translate-y-1">
            <CrystalStar size={36} active={stars >= 1} className="sm:w-[44px] sm:h-[44px] landscape:w-[32px] landscape:h-[32px]" />
          </div>
          <div className="-translate-y-1 scale-110">
            <CrystalStar size={40} active={stars >= 2} className="sm:w-[48px] sm:h-[48px] landscape:w-[36px] landscape:h-[36px]" />
          </div>
          <div className="rotate-12 translate-y-1">
            <CrystalStar size={36} active={stars >= 3} className="sm:w-[44px] sm:h-[44px] landscape:w-[32px] landscape:h-[32px]" />
          </div>
        </div>
      )}

      {/* Haupt-Kristall-Rechteck mit tieferem Schlagschatten und feiner Facetten-Struktur */}
      <div
        style={{
          borderColor: surface.outerBorder,
          backgroundColor: surface.bg,
        }}
        className="relative w-full border-[4px] shadow-[0_12px_24px_rgba(9,20,38,0.42),0_6px_0_rgba(15,23,42,0.45)] overflow-hidden"
      >
        {/* Optionaler farbiger Akzent-Streifen an der Oberkante für Spiel-/Funktions-Differenzierung */}
        {accentInfo && (
          <div
            style={{ backgroundColor: accentInfo.bg }}
            className="relative z-20 h-1.5 w-full"
          />
        )}

        <div
          style={{ borderColor: surface.innerBorder }}
          className="pointer-events-none absolute inset-0 border-[3px] sm:border-[3.5px] z-20"
        />

        <svg
          viewBox="0 0 300 420"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full z-0"
        >
          <polygon points="0,0 165,0 95,420 0,420" fill={surface.f1} />
          <polygon points="0,0 65,0 135,280 0,190" fill={surface.f2} />
          <polygon points="210,0 300,0 300,195 145,120" fill={surface.f3} />
          <polygon points="110,260 300,185 300,420 65,420" fill={surface.f4} />

          <polyline
            points="6,6 52,185 18,245 78,340"
            fill="none"
            stroke={surface.crackLight}
            strokeWidth="2"
          />
          <polyline
            points="12,412 68,365 135,382 185,335"
            fill="none"
            stroke={surface.crackLight}
            strokeWidth="2.2"
          />
          <polyline
            points="215,8 192,68 242,95 232,175 288,215"
            fill="none"
            stroke={surface.crackDark}
            strokeWidth="1.8"
          />
        </svg>

        {/* Inhalt des Kristall-Fensters */}
        <div className={`relative z-10 flex flex-col items-center p-4 sm:p-6 landscape:p-3.5 ${contentClassName}`}>
          {title && (
            <h2 className={`font-arcade mb-3 sm:mb-4 landscape:mb-2 text-center text-xl sm:text-3xl landscape:text-lg tracking-wider uppercase ${surface.titleText}`}>
              {title}
            </h2>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
