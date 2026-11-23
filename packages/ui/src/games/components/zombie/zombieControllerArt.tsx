import {
  GiAk47,
  GiAk47U,
  GiBiohazard,
  GiPadlock,
  GiPistolGun,
  GiRayGun,
  GiRocket,
  GiShotgun,
} from 'react-icons/gi';
import metalPlateTex from '../../../assets/textures/zombie/ui/metal_plate.jpg';
import greenMetalRustTex from '../../../assets/textures/zombie/ui/green_metal_rust.jpg';
import metalPlate02Tex from '../../../assets/textures/zombie/ui/metal_plate_02.jpg';
import rustCoarseTex from '../../../assets/textures/zombie/ui/rust_coarse_01.jpg';
import darkWoodTex from '../../../assets/textures/zombie/ui/dark_wood.jpg';
import rustyMetal02Tex from '../../../assets/textures/zombie/ui/rusty_metal_02.jpg';

export const ZOMBIE_UI_TEXTURES = {
  diamondPlate: metalPlateTex,
  oliveSteel: greenMetalRustTex,
  brushedSteel: metalPlate02Tex,
  rust: rustCoarseTex,
  darkWood: darkWoodTex,
  rustyPlate: rustyMetal02Tex,
} as const;

/**
 * Globale SVG-Distress-Filter (feTurbulence + feDisplacementMap)
 * für abgenutzte, ausgefranste Ränder an Stempeln und Tags.
 */
export function ZombieSvgFilters() {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
      <defs>
        <filter id="zombieDistress" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

export function RivetCorners({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';
  const dot = `pointer-events-none absolute ${cls} rounded-full bg-gradient-to-br from-[#CBD5E1] via-[#64748B] to-[#1E293B] ring-1 ring-black/85 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_1px_2px_rgba(0,0,0,0.85)]`;
  return (
    <>
      <span className={`${dot} top-1.5 left-1.5`} aria-hidden="true" />
      <span className={`${dot} top-1.5 right-1.5`} aria-hidden="true" />
      <span className={`${dot} bottom-1.5 left-1.5`} aria-hidden="true" />
      <span className={`${dot} bottom-1.5 right-1.5`} aria-hidden="true" />
    </>
  );
}

/**
 * Overlay mit Einschusslöchern, Kratzern und Schmutz/Rost-Spuren.
 */
export function GrungeDetailsOverlay({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 400"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    >
      <g stroke="#CBD5E1" strokeOpacity="0.18" strokeLinecap="round">
        <path d="M95 55 L155 82 M102 64 L144 83" strokeWidth="1.2" />
        <path d="M620 42 L685 28 M635 48 L675 39" strokeWidth="1.1" />
        <path d="M510 315 L590 278 M524 320 L578 294" strokeWidth="1.3" />
        <path d="M180 330 L240 355" strokeWidth="1.2" />
        <path d="M360 110 L425 96" strokeWidth="1" />
      </g>

      <g stroke="#09090B" strokeOpacity="0.62" strokeLinecap="round">
        <path d="M560 72 L608 110 M572 66 L618 103 M584 61 L628 96" strokeWidth="2.6" />
        <path d="M140 215 L178 242 M148 209 L184 234" strokeWidth="2.1" />
      </g>

      {[
        { x: 245, y: 74, r: 4.5 },
        { x: 263, y: 86, r: 3.8 },
        { x: 545, y: 128, r: 4.8 },
        { x: 690, y: 245, r: 4.2 },
        { x: 112, y: 162, r: 3.6 },
      ].map((h, i) => (
        <g key={i} transform={`translate(${h.x}, ${h.y})`}>
          <circle r={h.r * 2.1} fill="#09090B" fillOpacity="0.34" />
          <path
            d={`M-${h.r * 1.4} -2 L-${h.r * 0.6} -${h.r * 1.3} L2 -${h.r * 1.2} L${h.r * 1.5} -1 L${h.r * 0.9} ${h.r * 1.3} L-2 ${h.r * 1.4} Z`}
            fill="#52525B"
            fillOpacity="0.72"
          />
          <circle r={h.r} fill="#020305" stroke="#94A3B8" strokeOpacity="0.45" strokeWidth="0.9" />
        </g>
      ))}
    </svg>
  );
}

export function AnalogGaugeSvg({
  pct,
  accentColor,
  size = 28,
}: {
  pct: number;
  accentColor: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const angleDeg = -120 + (clamped / 100) * 240;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]" aria-hidden="true">
      <circle cx="20" cy="20" r="18.5" fill="#18181B" stroke="#52525B" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="15" fill="#D6D3D1" fillOpacity="0.92" />
      <circle cx="20" cy="20" r="15" fill="none" stroke="#44403C" strokeWidth="1" />
      <path
        d="M 8.5 28 A 13 13 0 1 1 31.5 28"
        fill="none"
        stroke="#57534E"
        strokeWidth="1.6"
        strokeDasharray="2 2.8"
      />
      <path
        d="M 27 9 A 13 13 0 0 1 31.5 28"
        fill="none"
        stroke={accentColor}
        strokeWidth="2.6"
      />
      <g transform={`rotate(${angleDeg} 20 20)`}>
        <line x1="20" y1="23" x2="20" y2="6.5" stroke="#B91C1C" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <circle cx="20" cy="20" r="3" fill="#27272A" stroke="#71717A" strokeWidth="1" />
    </svg>
  );
}

export function BiohazardEmblem({ className = 'h-20 w-20' }: { className?: string }) {
  return (
    <div className="relative flex items-center justify-center" aria-hidden="true">
      <div className="absolute h-24 w-24 rounded-full bg-[#DC2626]/25 blur-xl" />
      <GiBiohazard
        className={`${className} text-[#EF4444] drop-shadow-[0_0_16px_rgba(239,68,68,0.85)]`}
      />
    </div>
  );
}

export function WeaponGameIcon({
  weaponId,
  className = 'h-5 w-5',
  color = '#CBD5E1',
}: {
  weaponId: string;
  className?: string;
  color?: string;
}) {
  const style = { color };
  if (weaponId === 'pistol') return <GiPistolGun className={className} style={style} />;
  if (weaponId === 'smg') return <GiAk47U className={className} style={style} />;
  if (weaponId === 'shotgun') return <GiShotgun className={className} style={style} />;
  if (weaponId === 'rifle') return <GiAk47 className={className} style={style} />;
  if (weaponId === 'plasma') return <GiRayGun className={className} style={style} />;
  return <GiRocket className={className} style={style} />;
}

/**
 * Detaillierte, realistische Waffen-Illustrationen mit klaren Umrissen,
 * Läufen, Magazinen, Abzügen, Visieren und Griffen.
 */
export function WeaponSilhouetteSvg({
  weaponId,
  className = 'h-10 w-28',
  color = '#CBD5E1',
}: {
  weaponId: string;
  className?: string;
  color?: string;
}) {
  const strokeCol = '#09090B';

  if (weaponId === 'pistol') {
    return (
      <svg viewBox="0 0 160 72" className={className} aria-hidden="true">
        <g stroke={strokeCol} strokeWidth="2" strokeLinejoin="round">
          <path d="M26 16h88l5 4v11H26V16z" fill={color} />
          <rect x="29" y="12" width="6" height="4" fill={color} />
          <rect x="106" y="12" width="5" height="4" fill={color} />
          <rect x="66" y="17" width="16" height="5" fill="#1E293B" />
          <path d="M33 19v9 M38 19v9 M43 19v9" stroke="#1E293B" strokeWidth="1.6" />
          <path d="M26 31h87v5H84l-3 5H61l-4 18l-4 4H34l7-24H28l-4-4z" fill={color} fillOpacity="0.88" />
          <path d="M63 31h18l-2 11H62z" fill="none" stroke={color} strokeWidth="2.4" />
          <path d="M71 32c0 4 2 6 4 7" fill="none" stroke="#94A3B8" strokeWidth="2" />
          <path d="M40 38l-4 19h12l4-19z" fill="#1E293B" fillOpacity="0.55" />
        </g>
      </svg>
    );
  }

  if (weaponId === 'smg') {
    return (
      <svg viewBox="0 0 160 72" className={className} aria-hidden="true">
        <g stroke={strokeCol} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M8 22h22v12H13l-5 4V22z" fill={color} fillOpacity="0.85" />
          <path d="M28 19h76l6 4h28v5h-28v5H28V19z" fill={color} />
          <rect x="42" y="14" width="8" height="5" fill={color} />
          <path d="M106 14l4 5h-7z" fill={color} />
          <path d="M80 26h28l-2 9H78z" fill="#334155" />
          <path d="M68 33h11c-1 10-4 20-9 28l-9-3c4-7 6-15 7-25z" fill={color} fillOpacity="0.9" />
          <path d="M40 33h12l-5 19H35l5-19z" fill={color} fillOpacity="0.85" />
          <path d="M52 33h11l-1 9H51z" fill="none" stroke={color} strokeWidth="2" />
        </g>
      </svg>
    );
  }

  if (weaponId === 'shotgun') {
    return (
      <svg viewBox="0 0 160 72" className={className} aria-hidden="true">
        <g stroke={strokeCol} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M6 34l32-7v11l-11 4l-14 14H6V34z" fill="#78350F" />
          <rect x="38" y="25" width="38" height="12" rx="1.5" fill={color} />
          <rect x="52" y="27" width="13" height="4" fill="#1E293B" />
          <rect x="76" y="25" width="76" height="4.5" fill={color} />
          <rect x="148" y="22.5" width="3" height="2.5" fill="#EF4444" />
          <rect x="76" y="31" width="66" height="4" fill={color} fillOpacity="0.85" />
          <rect x="86" y="30" width="32" height="8" rx="1.5" fill="#78350F" />
          <path d="M92 31v6 M97 31v6 M102 31v6 M107 31v6 M112 31v6" stroke="#1C1917" strokeWidth="1.4" />
          <path d="M44 37h12l-2 8H43z" fill="none" stroke={color} strokeWidth="2" />
        </g>
      </svg>
    );
  }

  if (weaponId === 'rifle') {
    return (
      <svg viewBox="0 0 160 72" className={className} aria-hidden="true">
        <g stroke={strokeCol} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M6 21h28v13H22l-8 7H6V21z" fill={color} fillOpacity="0.85" />
          <rect x="34" y="22" width="44" height="13" fill={color} />
          <path d="M42 15h24l2 7H40z" fill="#334155" />
          <rect x="46" y="13" width="16" height="3" fill={color} />
          <rect x="78" y="22" width="36" height="10" rx="1" fill="#334155" />
          <path d="M114 24h32v3.5h-32z" fill={color} />
          <path d="M115 24l4-10h5l2 10z" fill={color} />
          <rect x="145" y="23" width="8" height="5.5" fill="#475569" />
          <path d="M63 35h12c-1 10-3 19-7 27l-10-3c3-7 5-15 5-24z" fill={color} fillOpacity="0.92" />
          <path d="M39 35h10l-5 18H34l5-18z" fill={color} fillOpacity="0.85" />
          <path d="M49 35h11l-1 8H48z" fill="none" stroke={color} strokeWidth="2" />
        </g>
      </svg>
    );
  }

  if (weaponId === 'plasma') {
    return (
      <svg viewBox="0 0 160 72" className={className} aria-hidden="true">
        <g stroke={strokeCol} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M10 20h98l12 6v10l-12 5H68l-6 17H49l5-17H28l-6 14H10V20z" fill={color} />
          <rect x="44" y="24" width="48" height="6" rx="2" fill="#22D3EE" />
          <rect x="120" y="27" width="24" height="7" rx="1.5" fill="#06B6D4" />
          <path d="M52 24v6 M64 24v6 M76 24v6 M88 24v6" stroke="#083344" strokeWidth="1.8" />
          <path d="M50 14h26l3 6H47z" fill="#1E293B" />
          <rect x="58" y="15.5" width="10" height="3" fill="#22D3EE" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 160 72" className={className} aria-hidden="true">
      <g stroke={strokeCol} strokeWidth="1.8" strokeLinejoin="round">
        <path d="M6 21l12 5v10L6 41V21z" fill={color} fillOpacity="0.85" />
        <rect x="18" y="26" width="94" height="10" fill={color} />
        <rect x="38" y="25" width="34" height="12" rx="1" fill="#78350F" />
        <path d="M52 37h9l-4 17h-9l4-17z" fill="#78350F" />
        <path d="M84 37h9l-3 15h-9l3-15z" fill={color} fillOpacity="0.9" />
        <path d="M112 27l12-6h12l18 10l-18 10h-12l-12-6V27z" fill="#4B5320" />
        <path d="M138 22l16 9l-16 9z" fill="#DC2626" fillOpacity="0.85" />
      </g>
    </svg>
  );
}

export function LockedChainOverlaySvg() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <svg
        viewBox="0 0 160 90"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect width="160" height="90" fill="#050709" fillOpacity="0.6" />
        <g strokeLinecap="round">
          <line x1="-5" y1="8" x2="165" y2="82" stroke="#1E293B" strokeWidth="8" />
          <line x1="-5" y1="8" x2="165" y2="82" stroke="#64748B" strokeWidth="5" strokeDasharray="10 4" />
          <line x1="-5" y1="8" x2="165" y2="82" stroke="#CBD5E1" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="10 4" />

          <line x1="-5" y1="82" x2="165" y2="8" stroke="#1E293B" strokeWidth="8" />
          <line x1="-5" y1="82" x2="165" y2="8" stroke="#64748B" strokeWidth="5" strokeDasharray="10 4" />
          <line x1="-5" y1="82" x2="165" y2="8" stroke="#CBD5E1" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="10 4" />
        </g>
      </svg>
      <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-sm border-2 border-[#71717A] bg-[#18181B]/95 shadow-[0_3px_10px_rgba(0,0,0,0.9)]">
        <GiPadlock className="h-5 w-5 text-[#F59E0B]" />
      </div>
    </div>
  );
}
