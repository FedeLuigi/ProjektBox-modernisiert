import metalPlateTex from '../../../assets/textures/zombie/ui/metal_plate.jpg';
import greenMetalRustTex from '../../../assets/textures/zombie/ui/green_metal_rust.jpg';
import metalPlate02Tex from '../../../assets/textures/zombie/ui/metal_plate_02.jpg';
import rustCoarseTex from '../../../assets/textures/zombie/ui/rust_coarse_01.jpg';

export const ZOMBIE_UI_TEXTURES = {
  diamondPlate: metalPlateTex,
  oliveSteel: greenMetalRustTex,
  brushedSteel: metalPlate02Tex,
  rust: rustCoarseTex,
} as const;

export function RivetCorners({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';
  const dot = `pointer-events-none absolute ${cls} rounded-full bg-gradient-to-br from-[#CBD5E1] via-[#64748B] to-[#1E293B] ring-1 ring-black/85 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_1px_2px_rgba(0,0,0,0.8)]`;
  return (
    <>
      <span className={`${dot} top-1 left-1`} aria-hidden="true" />
      <span className={`${dot} top-1 right-1`} aria-hidden="true" />
      <span className={`${dot} bottom-1 left-1`} aria-hidden="true" />
      <span className={`${dot} bottom-1 right-1`} aria-hidden="true" />
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
      {/* Diagonal metal scratches */}
      <g stroke="#CBD5E1" strokeOpacity="0.16" strokeLinecap="round">
        <path d="M95 55 L155 82 M102 64 L144 83" strokeWidth="1.2" />
        <path d="M620 42 L685 28 M635 48 L675 39" strokeWidth="1.1" />
        <path d="M510 315 L590 278 M524 320 L578 294" strokeWidth="1.3" />
        <path d="M180 330 L240 355" strokeWidth="1.2" />
        <path d="M360 110 L425 96" strokeWidth="1" />
      </g>

      {/* Claw / Heavy gouge marks */}
      <g stroke="#09090B" strokeOpacity="0.55" strokeLinecap="round">
        <path d="M560 72 L608 110 M572 66 L618 103 M584 61 L628 96" strokeWidth="2.5" />
        <path d="M140 215 L178 242 M148 209 L184 234" strokeWidth="2" />
      </g>

      {/* Bullet holes with jagged metal rim */}
      {[
        { x: 245, y: 74, r: 4.5 },
        { x: 263, y: 86, r: 3.8 },
        { x: 545, y: 128, r: 4.8 },
        { x: 690, y: 245, r: 4.2 },
        { x: 112, y: 162, r: 3.6 },
      ].map((h, i) => (
        <g key={i} transform={`translate(${h.x}, ${h.y})`}>
          <circle r={h.r * 2.1} fill="#09090B" fillOpacity="0.32" />
          <path
            d={`M-${h.r * 1.4} -2 L-${h.r * 0.6} -${h.r * 1.3} L2 -${h.r * 1.2} L${h.r * 1.5} -1 L${h.r * 0.9} ${h.r * 1.3} L-2 ${h.r * 1.4} Z`}
            fill="#52525B"
            fillOpacity="0.7"
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
  size = 30,
}: {
  pct: number;
  accentColor: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const angleDeg = -120 + (clamped / 100) * 240;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" aria-hidden="true">
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

export function BiohazardEmblemSvg({ className = 'h-20 w-20' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <filter id="bioGlowStrong" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="60" cy="60" r="48" fill="none" stroke="#EF4444" strokeOpacity="0.22" strokeWidth="2" strokeDasharray="6 4" />
      <g fill="none" stroke="#EF4444" strokeWidth="7" filter="url(#bioGlowStrong)" opacity="0.95">
        <circle cx="60" cy="36" r="20" />
        <circle cx="39.5" cy="71" r="20" />
        <circle cx="80.5" cy="71" r="20" />
        <circle cx="60" cy="59" r="10.5" strokeWidth="4" />
      </g>
      <circle cx="60" cy="59" r="4.5" fill="#FECACA" />
    </svg>
  );
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
    // P9 Tactical Pistol: slide serrations, front/rear sights, underbarrel rail, trigger guard, angled grip
    return (
      <svg viewBox="0 0 160 72" className={className} aria-hidden="true">
        <g stroke={strokeCol} strokeWidth="2" strokeLinejoin="round">
          {/* Slide & Barrel */}
          <path d="M26 16h88l5 4v11H26V16z" fill={color} />
          {/* Rear & Front Sights */}
          <rect x="29" y="12" width="6" height="4" fill={color} />
          <rect x="106" y="12" width="5" height="4" fill={color} />
          {/* Ejection Port & Serrations */}
          <rect x="66" y="17" width="16" height="5" fill="#1E293B" />
          <path d="M33 19v9 M38 19v9 M43 19v9" stroke="#1E293B" strokeWidth="1.6" />
          {/* Frame & Underbarrel Rail */}
          <path d="M26 31h87v5H84l-3 5H61l-4 18l-4 4H34l7-24H28l-4-4z" fill={color} fillOpacity="0.88" />
          {/* Trigger Guard & Trigger */}
          <path d="M63 31h18l-2 11H62z" fill="none" stroke={color} strokeWidth="2.4" />
          <path d="M71 32c0 4 2 6 4 7" fill="none" stroke="#94A3B8" strokeWidth="2" />
          {/* Grip Texture */}
          <path d="M40 38l-4 19h12l4-19z" fill="#1E293B" fillOpacity="0.55" />
        </g>
      </svg>
    );
  }

  if (weaponId === 'smg') {
    // MP5 Blitz: cocking tube, iron sight drum, handguard, curved 30-round mag, collapsible stock
    return (
      <svg viewBox="0 0 160 72" className={className} aria-hidden="true">
        <g stroke={strokeCol} strokeWidth="1.8" strokeLinejoin="round">
          {/* Collapsible Stock */}
          <path d="M8 22h22v12H13l-5 4V22z" fill={color} fillOpacity="0.85" />
          {/* Upper Receiver & Barrel */}
          <path d="M28 19h76l6 4h28v5h-28v5H28V19z" fill={color} />
          {/* Front Sight Post & Rear Drum Sight */}
          <rect x="42" y="14" width="8" height="5" fill={color} />
          <path d="M106 14l4 5h-7z" fill={color} />
          {/* Forend / Handguard */}
          <path d="M80 26h28l-2 9H78z" fill="#334155" />
          {/* Curved 30-rd Magazine */}
          <path d="M68 33h11c-1 10-4 20-9 28l-9-3c4-7 6-15 7-25z" fill={color} fillOpacity="0.9" />
          {/* Pistol Grip & Trigger */}
          <path d="M40 33h12l-5 19H35l5-19z" fill={color} fillOpacity="0.85" />
          <path d="M52 33h11l-1 9H51z" fill="none" stroke={color} strokeWidth="2" />
        </g>
      </svg>
    );
  }

  if (weaponId === 'shotgun') {
    // Pump-Shotgun: full stock, receiver, long barrel + underbarrel tube magazine, ribbed pump forend
    return (
      <svg viewBox="0 0 160 72" className={className} aria-hidden="true">
        <g stroke={strokeCol} strokeWidth="1.8" strokeLinejoin="round">
          {/* Stock */}
          <path d="M6 34l32-7v11l-11 4l-14 14H6V34z" fill="#78350F" />
          {/* Receiver */}
          <rect x="38" y="25" width="38" height="12" rx="1.5" fill={color} />
          <rect x="52" y="27" width="13" height="4" fill="#1E293B" />
          {/* Long Barrel */}
          <rect x="76" y="25" width="76" height="4.5" fill={color} />
          {/* Front Bead Sight */}
          <rect x="148" y="22.5" width="3" height="2.5" fill="#EF4444" />
          {/* Underbarrel Magazine Tube */}
          <rect x="76" y="31" width="66" height="4" fill={color} fillOpacity="0.85" />
          {/* Ribbed Pump Forend */}
          <rect x="86" y="30" width="32" height="8" rx="1.5" fill="#78350F" />
          <path d="M92 31v6 M97 31v6 M102 31v6 M107 31v6 M112 31v6" stroke="#1C1917" strokeWidth="1.4" />
          {/* Trigger Guard */}
          <path d="M44 37h12l-2 8H43z" fill="none" stroke={color} strokeWidth="2" />
        </g>
      </svg>
    );
  }

  if (weaponId === 'rifle') {
    // M4 Sturmgewehr: telescopic stock, picatinny upper + optic, delta ring handguard, A-frame front sight, 30rd curved STANAG mag
    return (
      <svg viewBox="0 0 160 72" className={className} aria-hidden="true">
        <g stroke={strokeCol} strokeWidth="1.8" strokeLinejoin="round">
          {/* Telescopic Stock */}
          <path d="M6 21h28v13H22l-8 7H6V21z" fill={color} fillOpacity="0.85" />
          {/* Receiver & Buffer Tube */}
          <rect x="34" y="22" width="44" height="13" fill={color} />
          {/* Optic / Carry Handle */}
          <path d="M42 15h24l2 7H40z" fill="#334155" />
          <rect x="46" y="13" width="16" height="3" fill={color} />
          {/* Handguard */}
          <rect x="78" y="22" width="36" height="10" rx="1" fill="#334155" />
          {/* A-Frame Front Sight & Barrel + Flash Hider */}
          <path d="M114 24h32v3.5h-32z" fill={color} />
          <path d="M115 24l4-10h5l2 10z" fill={color} />
          <rect x="145" y="23" width="8" height="5.5" fill="#475569" />
          {/* Curved STANAG Magazine */}
          <path d="M63 35h12c-1 10-3 19-7 27l-10-3c3-7 5-15 5-24z" fill={color} fillOpacity="0.92" />
          {/* Pistol Grip & Trigger Guard */}
          <path d="M39 35h10l-5 18H34l5-18z" fill={color} fillOpacity="0.85" />
          <path d="M49 35h11l-1 8H48z" fill="none" stroke={color} strokeWidth="2" />
        </g>
      </svg>
    );
  }

  if (weaponId === 'plasma') {
    // Plasma-Blaster: heavy bullpup sci-fi chassis, glowing cyan energy core & plasma barrel emitter
    return (
      <svg viewBox="0 0 160 72" className={className} aria-hidden="true">
        <g stroke={strokeCol} strokeWidth="1.8" strokeLinejoin="round">
          {/* Bullpup Chassis */}
          <path d="M10 20h98l12 6v10l-12 5H68l-6 17H49l5-17H28l-6 14H10V20z" fill={color} />
          {/* Glowing Plasma Core & Emitter */}
          <rect x="44" y="24" width="48" height="6" rx="2" fill="#22D3EE" />
          <rect x="120" y="27" width="24" height="7" rx="1.5" fill="#06B6D4" />
          <path d="M52 24v6 M64 24v6 M76 24v6 M88 24v6" stroke="#083344" strokeWidth="1.8" />
          {/* Top Holo-Sight */}
          <path d="M50 14h26l3 6H47z" fill="#1E293B" />
          <rect x="58" y="15.5" width="10" height="3" fill="#22D3EE" />
        </g>
      </svg>
    );
  }

  // Inferno-Werfer (RPG-7): exhaust cone, launcher tube, wooden heatshield, front/rear grips, warhead cone
  return (
    <svg viewBox="0 0 160 72" className={className} aria-hidden="true">
      <g stroke={strokeCol} strokeWidth="1.8" strokeLinejoin="round">
        {/* Rear Exhaust Bell */}
        <path d="M6 21l12 5v10L6 41V21z" fill={color} fillOpacity="0.85" />
        {/* Main Tube */}
        <rect x="18" y="26" width="94" height="10" fill={color} />
        {/* Wooden Heatshield */}
        <rect x="38" y="25" width="34" height="12" rx="1" fill="#78350F" />
        {/* Front & Rear Grips */}
        <path d="M52 37h9l-4 17h-9l4-17z" fill="#78350F" />
        <path d="M84 37h9l-3 15h-9l3-15z" fill={color} fillOpacity="0.9" />
        {/* RPG Warhead */}
        <path d="M112 27l12-6h12l18 10l-18 10h-12l-12-6V27z" fill="#4B5320" />
        <path d="M138 22l16 9l-16 9z" fill="#DC2626" fillOpacity="0.85" />
      </g>
    </svg>
  );
}

export function LockedChainOverlaySvg() {
  return (
    <svg
      viewBox="0 0 160 90"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect width="160" height="90" fill="#050709" fillOpacity="0.58" />
      {/* Heavy crossed chains */}
      <g strokeLinecap="round">
        <line x1="-5" y1="8" x2="165" y2="82" stroke="#1E293B" strokeWidth="8" />
        <line x1="-5" y1="8" x2="165" y2="82" stroke="#64748B" strokeWidth="5" strokeDasharray="10 4" />
        <line x1="-5" y1="8" x2="165" y2="82" stroke="#CBD5E1" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="10 4" />

        <line x1="-5" y1="82" x2="165" y2="8" stroke="#1E293B" strokeWidth="8" />
        <line x1="-5" y1="82" x2="165" y2="8" stroke="#64748B" strokeWidth="5" strokeDasharray="10 4" />
        <line x1="-5" y1="82" x2="165" y2="8" stroke="#CBD5E1" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="10 4" />
      </g>
      {/* Heavy weathered padlock */}
      <g transform="translate(62, 23)">
        <path d="M8 18V11a10 10 0 0 1 20 0v7" fill="none" stroke="#94A3B8" strokeWidth="4.2" />
        <rect x="3" y="17" width="30" height="24" rx="3" fill="#27272A" stroke="#71717A" strokeWidth="2.2" />
        <rect x="6" y="20" width="24" height="18" rx="1.5" fill="#18181B" />
        <circle cx="18" cy="27" r="3" fill="#F59E0B" />
        <path d="M16.5 29h3l1 6h-5z" fill="#F59E0B" />
      </g>
    </svg>
  );
}
