import metalPlateTex from '../../../assets/textures/zombie/ui/metal_plate.jpg';
import greenMetalRustTex from '../../../assets/textures/zombie/ui/green_metal_rust.jpg';
import metalPlate02Tex from '../../../assets/textures/zombie/ui/metal_plate_02.jpg';

export const ZOMBIE_UI_TEXTURES = {
  diamondPlate: metalPlateTex,
  oliveSteel: greenMetalRustTex,
  brushedSteel: metalPlate02Tex,
} as const;

export function RivetCorners({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2';
  const dot = `pointer-events-none absolute ${cls} rounded-full bg-gradient-to-br from-[#CBD5E1] to-[#334155] ring-1 ring-black/70 shadow-inner`;
  return (
    <>
      <span className={`${dot} top-1 left-1`} aria-hidden="true" />
      <span className={`${dot} top-1 right-1`} aria-hidden="true" />
      <span className={`${dot} bottom-1 left-1`} aria-hidden="true" />
      <span className={`${dot} bottom-1 right-1`} aria-hidden="true" />
    </>
  );
}

export function AnalogGaugeSvg({
  pct,
  accentColor,
  size = 30,
}: {
  pct: number;
  accentColor: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  // Needle sweeps from -120deg (left) to +120deg (right)
  const angleDeg = -120 + (clamped / 100) * 240;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#18181B" stroke="#52525B" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="14.5" fill="#E7E5E4" fillOpacity="0.9" />
      <path
        d="M 8.5 28 A 13 13 0 1 1 31.5 28"
        fill="none"
        stroke="#78716C"
        strokeWidth="1.5"
        strokeDasharray="2 3"
      />
      <path
        d="M 27 9 A 13 13 0 0 1 31.5 28"
        fill="none"
        stroke={accentColor}
        strokeWidth="2.4"
      />
      <g transform={`rotate(${angleDeg} 20 20)`}>
        <line x1="20" y1="22" x2="20" y2="7" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx="20" cy="20" r="2.8" fill="#27272A" stroke="#71717A" strokeWidth="1" />
    </svg>
  );
}

export function BiohazardEmblemSvg({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <filter id="bioGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g fill="none" stroke="#EF4444" strokeWidth="5.5" filter="url(#bioGlow)" opacity="0.88">
        <circle cx="50" cy="31" r="17" />
        <circle cx="33.5" cy="60" r="17" />
        <circle cx="66.5" cy="60" r="17" />
        <circle cx="50" cy="50" r="9" strokeWidth="3.5" />
      </g>
      <circle cx="50" cy="50" r="3.5" fill="#FCA5A5" />
    </svg>
  );
}

export function WeaponSilhouetteSvg({
  weaponId,
  className = 'h-9 w-24',
  color = '#CBD5E1',
}: {
  weaponId: string;
  className?: string;
  color?: string;
}) {
  if (weaponId === 'pistol') {
    return (
      <svg viewBox="0 0 120 52" className={className} fill={color} aria-hidden="true">
        <path d="M18 12h68l4 4v8H54l-4 6H42l-7 18H19l7-20h-8V12zm50 14h10v4H68v-4z" />
        <rect x="44" y="24" width="12" height="5" rx="1" fill="none" stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  if (weaponId === 'smg') {
    return (
      <svg viewBox="0 0 120 52" className={className} fill={color} aria-hidden="true">
        <path d="M10 18h14v-4h54l4 4h22v5H82v4H64l-4 18h-9l4-18H40l-4 13H26l4-13H10v-9z" />
        <rect x="48" y="8" width="16" height="4" rx="1" />
      </svg>
    );
  }
  if (weaponId === 'shotgun') {
    return (
      <svg viewBox="0 0 120 52" className={className} fill={color} aria-hidden="true">
        <path d="M6 26l22-5h78v4H58v4h36v4H54l-8 4H29l-6 10H10l8-13L6 29v-3z" />
        <rect x="60" y="29" width="24" height="5" rx="1" />
      </svg>
    );
  }
  if (weaponId === 'rifle') {
    return (
      <svg viewBox="0 0 120 52" className={className} fill={color} aria-hidden="true">
        <path d="M5 17h20l5 3h32v-4h16v4h34v4H78v4H62l5 17H56l-5-17H39l-4 12H25l4-12H5v-11z" />
        <rect x="37" y="12" width="18" height="4" rx="1" />
      </svg>
    );
  }
  if (weaponId === 'plasma') {
    return (
      <svg viewBox="0 0 120 52" className={className} fill={color} aria-hidden="true">
        <path d="M8 16h78l10 5v6l-10 4H56l-5 15H40l5-15H24l-4 10H10l4-10H8V16z" />
        <rect x="34" y="19" width="38" height="4" rx="2" fill="#22D3EE" />
        <rect x="96" y="21" width="14" height="6" rx="1" fill="#22D3EE" />
      </svg>
    );
  }
  // rocket launcher
  return (
    <svg viewBox="0 0 120 52" className={className} fill={color} aria-hidden="true">
      <path d="M8 18h10l6 3h58l8-4h18l6 7-6 7H90l-8-4H54v13H43V27H24l-6 3H8V18z" />
    </svg>
  );
}

export function LockedChainOverlaySvg() {
  return (
    <svg
      viewBox="0 0 120 70"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line x1="0" y1="6" x2="120" y2="64" stroke="#475569" strokeWidth="5" strokeDasharray="7 3" />
      <line x1="0" y1="64" x2="120" y2="6" stroke="#475569" strokeWidth="5" strokeDasharray="7 3" />
      <line x1="0" y1="6" x2="120" y2="64" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="7 3" />
      <line x1="0" y1="64" x2="120" y2="6" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="7 3" />
      <g transform="translate(47, 19)">
        <path d="M6 12V8a7 7 0 0 1 14 0v4" fill="none" stroke="#CBD5E1" strokeWidth="3" />
        <rect x="3" y="12" width="20" height="16" rx="2" fill="#1E293B" stroke="#94A3B8" strokeWidth="2" />
        <circle cx="13" cy="19" r="2.2" fill="#F59E0B" />
        <rect x="12" y="20" width="2" height="4" fill="#F59E0B" />
      </g>
    </svg>
  );
}
