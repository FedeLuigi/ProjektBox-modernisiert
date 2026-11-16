import { type ReactNode } from 'react';
import { ArrowLeft, X } from 'lucide-react';

export type OpenButtonVariant =
  | 'primary'
  | 'amber'
  | 'indigo'
  | 'rose'
  | 'secondary'
  | 'outline-amber';

interface OpenButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: OpenButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: ReactNode;
}

const BUTTON_VARIANTS: Record<OpenButtonVariant, string> = {
  primary:
    'border border-[#6EE7B7]/40 bg-[#10B981] text-white hover:bg-[#059669] shadow-[0_6px_20px_rgba(16,185,129,0.28)]',
  amber:
    'border border-[#FEF3C7]/40 bg-[#F59E0B] text-[#0F172A] hover:bg-[#D97706] shadow-[0_6px_20px_rgba(245,158,11,0.25)]',
  indigo:
    'border border-[#A5B4FC]/40 bg-[#6366F1] text-white hover:bg-[#4F46E5] shadow-[0_6px_20px_rgba(99,102,241,0.28)]',
  rose:
    'border border-[#FDA4AF]/40 bg-[#E11D48] text-white hover:bg-[#BE123C] shadow-[0_6px_20px_rgba(225,29,72,0.28)]',
  secondary:
    'border border-white/20 bg-white/[0.06] text-white/90 hover:bg-white/12 hover:text-white',
  'outline-amber':
    'border border-[#F59E0B]/60 bg-transparent text-[#FDE68A] hover:bg-[#F59E0B]/15',
};

const BUTTON_SIZES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-8 sm:h-9 px-3 text-[11px] sm:text-xs rounded-lg',
  md: 'h-10 px-4 text-xs sm:text-sm rounded-xl',
  lg: 'h-11 sm:h-12 px-5 text-sm sm:text-base rounded-xl',
};

export function OpenButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  type = 'button',
  ...rest
}: OpenButtonProps) {
  return (
    <button
      type={type}
      className={`font-arcade inline-flex items-center justify-center gap-2 tracking-wider uppercase transition-all cursor-pointer active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${
        BUTTON_VARIANTS[variant]
      } ${BUTTON_SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * Durchgängige Kopfzeile für Vollbild-Unterseiten (Lobby, QR-Scanner, TV-Ansicht)
 * im identischen Design wie MainMenuHeader (max-w-[1440px], kurzer Seitenabstand, Haarlinie unten).
 */
export function OpenSubpageHeader({
  backLabel = 'ZURÜCK',
  onBack,
  title,
  accentWord,
  rightSlot,
}: {
  backLabel?: string;
  onBack: () => void;
  title: string;
  accentWord?: string;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1440px] shrink-0 px-4 sm:px-6 lg:px-8">
      <header className="tablet-header relative z-30 flex w-full flex-nowrap items-center justify-between gap-3 border-b border-white/15 py-2 landscape:py-1">
        <button
          type="button"
          onClick={onBack}
          className="font-arcade inline-flex h-8 sm:h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-3 text-[11px] sm:text-xs tracking-wider text-white/90 uppercase transition-all hover:bg-white/12 hover:text-white cursor-pointer active:scale-95"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          <span>{backLabel}</span>
        </button>

        <div className="min-w-0 border-b-2 border-[#F59E0B] px-1.5 pb-0.5 select-none">
          <span className="font-arcade block truncate text-sm sm:text-lg md:text-xl tracking-wider text-white uppercase drop-shadow-[0_2px_10px_rgba(15,23,42,0.75)]">
            {title}
            {accentWord && <span className="text-[#FBBF24]"> {accentWord}</span>}
          </span>
        </div>

        <div className="shrink-0 flex items-center">{rightSlot}</div>
      </header>
    </div>
  );
}

/**
 * Dunkler, rahmenlos wirkender Glas-Dialog im Open-Gallery-Stil für Modals (Profil, Optionen, TV-Beitritt).
 */
export function OpenModalFrame({
  title,
  accentWord,
  onClose,
  children,
  className = '',
  contentClassName = '',
}: {
  title: string;
  accentWord?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`relative flex w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0F172A]/90 text-white backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.65)] ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 sm:px-6 py-3 landscape:py-2">
        <div className="border-b-2 border-[#F59E0B] pb-0.5 select-none">
          <span className="font-arcade text-base sm:text-lg tracking-wider text-white uppercase">
            {title}
            {accentWord && <span className="text-[#FBBF24]"> {accentWord}</span>}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-white/75 transition-colors hover:bg-white/12 hover:text-white cursor-pointer active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className={`flex flex-col p-4 sm:p-6 landscape:p-3.5 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
