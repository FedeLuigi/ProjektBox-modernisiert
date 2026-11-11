import { useId } from 'react';

export type AvatarBase = 'human' | 'bot' | 'cat' | 'alien' | 'skull' | 'ninja';
export type AvatarHat =
  | 'none'
  | 'headset'
  | 'crown'
  | 'cap'
  | 'vr'
  | 'wizard'
  | 'devil_horns'
  | 'halo'
  | 'beanie';
export type AvatarAccessory =
  | 'none'
  | 'sunglasses'
  | 'pixel_shades'
  | 'laser_eyes'
  | 'blush'
  | 'eyepatch';
export type AvatarBg =
  | 'purple'
  | 'cyan'
  | 'sunset'
  | 'emerald'
  | 'gold'
  | 'dark';

export interface AvatarConfig {
  base: AvatarBase;
  skinColor: string;
  hat: AvatarHat;
  accessory: AvatarAccessory;
  bg: AvatarBg;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  base: 'human',
  skinColor: '#FDDCB5',
  hat: 'headset',
  accessory: 'none',
  bg: 'purple',
};

export const AVATAR_SKIN_COLORS = [
  { id: '#FDDCB5', label: 'Hell' },
  { id: '#D49B6A', label: 'Gebräunt' },
  { id: '#6B4423', label: 'Dunkel' },
  { id: '#38BDF8', label: 'Cyan' },
  { id: '#A855F7', label: 'Neon-Lila' },
  { id: '#22C55E', label: 'Acid-Grün' },
  { id: '#F59E0B', label: 'Cyber-Gold' },
  { id: '#0F172A', label: 'Obsidian' },
];

export const AVATAR_BASES: { id: AvatarBase; label: string }[] = [
  { id: 'human', label: 'Gamer' },
  { id: 'bot', label: 'Cyber-Bot' },
  { id: 'cat', label: 'Cyber-Cat' },
  { id: 'alien', label: 'Alien' },
  { id: 'skull', label: 'Cyber-Skull' },
  { id: 'ninja', label: 'Ninja' },
];

export const AVATAR_HATS: { id: AvatarHat; label: string }[] = [
  { id: 'none', label: 'Keiner' },
  { id: 'headset', label: 'Headset' },
  { id: 'crown', label: 'Krone' },
  { id: 'cap', label: 'Kappe' },
  { id: 'vr', label: 'VR-Brille' },
  { id: 'wizard', label: 'Magierhut' },
  { id: 'devil_horns', label: 'Hörner' },
  { id: 'halo', label: 'Heiligenschein' },
  { id: 'beanie', label: 'Mütze' },
];

export const AVATAR_ACCESSORIES: { id: AvatarAccessory; label: string }[] = [
  { id: 'none', label: 'Keines' },
  { id: 'sunglasses', label: 'Sonnenbrille' },
  { id: 'pixel_shades', label: 'Pixel-Brille' },
  { id: 'laser_eyes', label: 'Laser-Augen' },
  { id: 'blush', label: 'Cute Blush' },
  { id: 'eyepatch', label: 'Augenklappe' },
];

export interface AvatarBgMeta {
  id: AvatarBg;
  label: string;
  gradient: string;
  from: string;
  to: string;
  accent: string;
  glowRgba: string;
  haloMidRgba: string;
  haloEdgeRgba: string;
}

export const AVATAR_BGS: AvatarBgMeta[] = [
  {
    id: 'purple',
    label: 'Deep Purple',
    gradient: 'from-[#2E1065] to-[#7C3AED]',
    from: '#2E1065',
    to: '#7C3AED',
    accent: '#A855F7',
    glowRgba: 'rgba(139, 92, 246, 0.58)',
    haloMidRgba: 'rgba(236, 72, 153, 0.30)',
    haloEdgeRgba: 'rgba(168, 85, 247, 0.12)',
  },
  {
    id: 'cyan',
    label: 'Neon Cyan',
    gradient: 'from-[#082F49] to-[#0284C7]',
    from: '#082F49',
    to: '#0284C7',
    accent: '#38BDF8',
    glowRgba: 'rgba(56, 189, 248, 0.58)',
    haloMidRgba: 'rgba(2, 132, 199, 0.34)',
    haloEdgeRgba: 'rgba(56, 189, 248, 0.12)',
  },
  {
    id: 'sunset',
    label: 'Synthwave Sunset',
    gradient: 'from-[#831843] to-[#F97316]',
    from: '#831843',
    to: '#F97316',
    accent: '#FB923C',
    glowRgba: 'rgba(249, 115, 22, 0.58)',
    haloMidRgba: 'rgba(236, 72, 153, 0.34)',
    haloEdgeRgba: 'rgba(249, 115, 22, 0.12)',
  },
  {
    id: 'emerald',
    label: 'Matrix Grün',
    gradient: 'from-[#064E3B] to-[#059669]',
    from: '#064E3B',
    to: '#059669',
    accent: '#34D399',
    glowRgba: 'rgba(16, 185, 129, 0.58)',
    haloMidRgba: 'rgba(5, 150, 105, 0.34)',
    haloEdgeRgba: 'rgba(52, 211, 153, 0.12)',
  },
  {
    id: 'gold',
    label: 'Champion Gold',
    gradient: 'from-[#78350F] to-[#D97706]',
    from: '#78350F',
    to: '#D97706',
    accent: '#FBBF24',
    glowRgba: 'rgba(245, 158, 11, 0.58)',
    haloMidRgba: 'rgba(217, 119, 6, 0.34)',
    haloEdgeRgba: 'rgba(251, 191, 36, 0.12)',
  },
  {
    id: 'dark',
    label: 'Stealth Dark',
    gradient: 'from-[#090A14] to-[#1E293B]',
    from: '#090A14',
    to: '#1E293B',
    accent: '#64748B',
    glowRgba: 'rgba(100, 116, 139, 0.45)',
    haloMidRgba: 'rgba(71, 85, 105, 0.28)',
    haloEdgeRgba: 'rgba(148, 163, 184, 0.10)',
  },
];

export function getAvatarBgMeta(bg?: AvatarBg | string): AvatarBgMeta {
  return AVATAR_BGS.find((item) => item.id === bg) ?? AVATAR_BGS[0];
}

interface AvatarProps {
  config?: AvatarConfig;
  className?: string;
  size?: number | string;
}

export function Avatar({ config = DEFAULT_AVATAR, className = '', size = 64 }: AvatarProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const base = config?.base ?? DEFAULT_AVATAR.base;
  const skinColor = config?.skinColor ?? DEFAULT_AVATAR.skinColor;
  const hat = config?.hat ?? DEFAULT_AVATAR.hat;
  const accessory = config?.accessory ?? DEFAULT_AVATAR.accessory;
  const bgMeta = getAvatarBgMeta(config?.bg);

  const bgGradientId = `${uid}-bg-${bgMeta.id}`;
  const glowFilterId = `${uid}-glow`;
  const laserFilterId = `${uid}-laser`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`block shrink-0 rounded-full overflow-hidden select-none ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${bgMeta.from}, ${bgMeta.to})`,
      }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Eindeutige Gradient-ID pro SVG-Instanz gegen WebKit/DOM-ID-Kollisionen */}
        {AVATAR_BGS.map((item) => (
          <linearGradient key={item.id} id={`${uid}-bg-${item.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={item.from} />
            <stop offset="100%" stopColor={item.to} />
          </linearGradient>
        ))}

        <filter id={glowFilterId} filterUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#A855F7" floodOpacity="0.8" />
        </filter>
        <filter id={laserFilterId} filterUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#EF4444" floodOpacity="0.9" />
        </filter>
      </defs>

      {/* 1. HINTERGRUND-KREIS (Key erzwingt sauberes Repaint bei Farbwechsel) */}
      <circle key={bgMeta.id} cx="50" cy="50" r="49" fill={`url(#${bgGradientId})`} />
      <circle cx="50" cy="50" r="36" fill="#FFFFFF" opacity="0.06" />

      {/* 2. KÖRPER / SCHULTERN */}
      <path
        d="M22 100 C22 75 34 68 50 68 C66 68 78 75 78 100 Z"
        fill="#14141E"
        stroke="#2E284A"
        strokeWidth="1.5"
      />
      {/* Kragen / Neon-Zierleiste */}
      <path d="M42 69 L50 78 L58 69" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />

      {/* 3. BASIS-CHARAKTER / GESICHT */}
      {base === 'human' && (
        <g>
          {/* Ohren */}
          <circle cx="26" cy="48" r="5" fill={skinColor} />
          <circle cx="74" cy="48" r="5" fill={skinColor} />
          {/* Kopf */}
          <circle cx="50" cy="48" r="23" fill={skinColor} />
          {/* Augen */}
          <circle cx="41" cy="46" r="3" fill="#18181B" />
          <circle cx="59" cy="46" r="3" fill="#18181B" />
          <circle cx="42" cy="45" r="1" fill="#FFFFFF" />
          <circle cx="60" cy="45" r="1" fill="#FFFFFF" />
          {/* Mund */}
          <path d="M44 56 Q50 61 56 56" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />
          {/* Haare */}
          <path
            d="M27 42 C29 25 43 23 50 23 C57 23 71 25 73 42 C67 31 58 30 50 32 C42 30 33 31 27 42 Z"
            fill="#1E1B2E"
          />
        </g>
      )}

      {base === 'bot' && (
        <g>
          {/* Antenne */}
          <line x1="50" y1="26" x2="50" y2="15" stroke="#38BDF8" strokeWidth="2" />
          <circle cx="50" cy="14" r="3.5" fill="#38BDF8" filter={`url(#${glowFilterId})`} />
          {/* Kopf */}
          <rect
            x="29"
            y="26"
            width="42"
            height="38"
            rx="10"
            fill={skinColor}
            stroke="#38BDF8"
            strokeWidth="1.8"
          />
          {/* Ohren-Schrauben */}
          <rect x="25" y="38" width="4" height="14" rx="2" fill="#38BDF8" />
          <rect x="71" y="38" width="4" height="14" rx="2" fill="#38BDF8" />
          {/* Visier Display */}
          <rect x="35" y="36" width="30" height="14" rx="4" fill="#0B132B" stroke="#0284C7" strokeWidth="1" />
          {/* LED Augen */}
          <rect x="40" y="41" width="6" height="4" rx="1.5" fill="#38BDF8" />
          <rect x="54" y="41" width="6" height="4" rx="1.5" fill="#38BDF8" />
          {/* Bot-Gitter Mund */}
          <line x1="43" y1="56" x2="57" y2="56" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )}

      {base === 'cat' && (
        <g>
          {/* Katzenohren */}
          <polygon points="28,34 38,13 48,30" fill={skinColor} />
          <polygon points="72,34 62,13 52,30" fill={skinColor} />
          <polygon points="32,32 38,17 44,28" fill="#F472B6" />
          <polygon points="68,32 62,17 56,28" fill="#F472B6" />
          {/* Kopf */}
          <circle cx="50" cy="49" r="22" fill={skinColor} />
          {/* Schnurrhaare */}
          <line x1="28" y1="52" x2="38" y2="53" stroke="#18181B" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="27" y1="57" x2="37" y2="56" stroke="#18181B" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="72" y1="52" x2="62" y2="53" stroke="#18181B" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="73" y1="57" x2="63" y2="56" stroke="#18181B" strokeWidth="1.4" strokeLinecap="round" />
          {/* Katzenaugen */}
          <ellipse cx="40" cy="47" rx="3.5" ry="4.5" fill="#18181B" />
          <ellipse cx="60" cy="47" rx="3.5" ry="4.5" fill="#18181B" />
          <circle cx="41" cy="45" r="1.2" fill="#FFFFFF" />
          <circle cx="61" cy="45" r="1.2" fill="#FFFFFF" />
          {/* Nase & Mund */}
          <polygon points="48,54 52,54 50,56" fill="#F472B6" />
          <path d="M46 57 Q48 59 50 57 Q52 59 54 57" stroke="#18181B" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )}

      {base === 'alien' && (
        <g>
          {/* Antenne */}
          <path d="M50 24 Q46 14 50 11" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="50" cy="9" r="4" fill="#C084FC" filter={`url(#${glowFilterId})`} />
          {/* Kopf */}
          <path
            d="M50 24 C34 24 28 36 32 54 C36 64 45 70 50 70 C55 70 64 64 68 54 C72 36 66 24 50 24 Z"
            fill={skinColor}
          />
          {/* Riesige Mandel-Augen */}
          <ellipse cx="38" cy="46" rx="6.5" ry="10" transform="rotate(-12 38 46)" fill="#090A14" />
          <ellipse cx="62" cy="46" rx="6.5" ry="10" transform="rotate(12 62 46)" fill="#090A14" />
          {/* Galaxie-Glanz in den Augen */}
          <circle cx="37" cy="43" r="2" fill="#C084FC" />
          <circle cx="63" cy="43" r="2" fill="#38BDF8" />
          {/* Mund */}
          <ellipse cx="50" cy="62" rx="2" ry="1" fill="#090A14" />
        </g>
      )}

      {base === 'skull' && (
        <g>
          {/* Totenkopf-Schädel */}
          <path
            d="M50 23 C34 23 30 33 32 48 C33 54 38 58 40 66 L60 66 C62 58 67 54 68 48 C70 33 66 23 50 23 Z"
            fill={skinColor}
            stroke="#1C1C1E"
            strokeWidth="1.5"
          />
          {/* Augenhöhlen */}
          <circle cx="40" cy="44" r="6" fill="#090A14" />
          <circle cx="60" cy="44" r="6" fill="#090A14" />
          <circle cx="41" cy="43" r="2" fill="#A855F7" />
          <circle cx="59" cy="43" r="2" fill="#A855F7" />
          {/* Nasenloch */}
          <polygon points="50,52 47,56 53,56" fill="#090A14" />
          {/* Zähne */}
          <line x1="43" y1="62" x2="57" y2="62" stroke="#090A14" strokeWidth="2" />
          <line x1="46" y1="59" x2="46" y2="65" stroke="#090A14" strokeWidth="1.5" />
          <line x1="50" y1="59" x2="50" y2="65" stroke="#090A14" strokeWidth="1.5" />
          <line x1="54" y1="59" x2="54" y2="65" stroke="#090A14" strokeWidth="1.5" />
        </g>
      )}

      {base === 'ninja' && (
        <g>
          {/* Ninja Maskenhaube */}
          <circle cx="50" cy="48" r="23" fill="#0F172A" />
          {/* Augenschlitz in Hautfarbe */}
          <ellipse cx="50" cy="46" rx="17" ry="6" fill={skinColor} />
          {/* Stirnband */}
          <rect x="27" y="27" width="46" height="8" fill="#DC2626" />
          <circle cx="50" cy="31" r="2.5" fill="#FBBF24" />
          {/* Scharfe Ninja Augen */}
          <ellipse cx="42" cy="46" rx="3.5" ry="2.2" fill="#090A14" />
          <ellipse cx="58" cy="46" rx="3.5" ry="2.2" fill="#090A14" />
          <circle cx="43" cy="45.5" r="1" fill="#FFFFFF" />
          <circle cx="59" cy="45.5" r="1" fill="#FFFFFF" />
        </g>
      )}

      {/* 4. ACCESSOIRES / BRILLEN */}
      {accessory === 'sunglasses' && (
        <g>
          <polygon points="31,41 47,41 44,51 33,50" fill="#05050A" />
          <polygon points="69,41 53,41 56,51 67,50" fill="#05050A" />
          <line x1="46" y1="42" x2="54" y2="42" stroke="#05050A" strokeWidth="2.5" />
          <line x1="33" y1="43" x2="43" y2="49" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />
          <line x1="55" y1="43" x2="65" y2="49" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />
        </g>
      )}

      {accessory === 'pixel_shades' && (
        <g fill="#05050A">
          {/* 8-Bit Pixel Glasses */}
          <rect x="30" y="42" width="18" height="9" />
          <rect x="52" y="42" width="18" height="9" />
          <rect x="47" y="44" width="6" height="3" />
          {/* Glanzpixel */}
          <rect x="32" y="44" width="3" height="3" fill="#FFFFFF" />
          <rect x="35" y="47" width="3" height="3" fill="#FFFFFF" />
          <rect x="54" y="44" width="3" height="3" fill="#FFFFFF" />
          <rect x="57" y="47" width="3" height="3" fill="#FFFFFF" />
        </g>
      )}

      {accessory === 'laser_eyes' && (
        <g filter={`url(#${laserFilterId})`}>
          <circle cx="41" cy="46" r="3.5" fill="#EF4444" />
          <circle cx="59" cy="46" r="3.5" fill="#EF4444" />
          <line x1="41" y1="46" x2="15" y2="46" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="59" y1="46" x2="85" y2="46" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {accessory === 'blush' && (
        <g>
          <ellipse cx="34" cy="53" rx="4.5" ry="2.5" fill="#F43F5E" opacity="0.65" />
          <ellipse cx="66" cy="53" rx="4.5" ry="2.5" fill="#F43F5E" opacity="0.65" />
        </g>
      )}

      {accessory === 'eyepatch' && (
        <g>
          <polygon points="33,40 47,40 44,52 35,51" fill="#0F172A" stroke="#334155" strokeWidth="1" />
          <line x1="26" y1="36" x2="74" y2="55" stroke="#0F172A" strokeWidth="1.8" />
        </g>
      )}

      {/* 5. HÜTE / KOPFBEDECKUNG */}
      {hat === 'headset' && (
        <g>
          {/* Bügel über den Kopf */}
          <path
            d="M26 46 C26 21 36 15 50 15 C64 15 74 21 74 46"
            stroke="#8B5CF6"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Polster Ohrmuscheln */}
          <rect x="21" y="38" width="8" height="18" rx="4" fill="#0F172A" stroke="#A855F7" strokeWidth="1.6" />
          <rect x="71" y="38" width="8" height="18" rx="4" fill="#0F172A" stroke="#A855F7" strokeWidth="1.6" />
          {/* Mikrofonarm & Leuchtspitze */}
          <path d="M26 50 Q26 64 42 63" stroke="#8B5CF6" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle cx="43" cy="63" r="2.5" fill="#38BDF8" filter={`url(#${glowFilterId})`} />
        </g>
      )}

      {hat === 'crown' && (
        <g>
          <polygon
            points="30,28 32,13 42,21 50,9 58,21 68,13 70,28"
            fill="#FBBF24"
            stroke="#B45309"
            strokeWidth="1.4"
          />
          <circle cx="50" cy="22" r="2.8" fill="#EF4444" />
          <circle cx="39" cy="24" r="2" fill="#38BDF8" />
          <circle cx="61" cy="24" r="2" fill="#38BDF8" />
        </g>
      )}

      {hat === 'cap' && (
        <g>
          {/* Kappenkörper rückwärts */}
          <path d="M28 33 C30 17 42 15 50 15 C58 15 70 17 72 33 Z" fill="#EF4444" />
          {/* Schirm rückwärts */}
          <path d="M24 33 C18 35 15 39 17 43 C23 40 30 36 34 33 Z" fill="#991B1B" />
          {/* Kappenknopf */}
          <circle cx="50" cy="15" r="2" fill="#FFFFFF" />
        </g>
      )}

      {hat === 'vr' && (
        <g>
          {/* VR Visor Gehäuse */}
          <rect
            x="28"
            y="37"
            width="44"
            height="17"
            rx="5.5"
            fill="#090D16"
            stroke="#38BDF8"
            strokeWidth="1.8"
          />
          {/* Leuchtender Visor-Spiegel */}
          <rect x="33" y="43" width="34" height="4" rx="2" fill="#38BDF8" filter={`url(#${glowFilterId})`} />
          {/* Riemen um den Kopf */}
          <line x1="28" y1="45" x2="25" y2="45" stroke="#38BDF8" strokeWidth="2.5" />
          <line x1="72" y1="45" x2="75" y2="45" stroke="#38BDF8" strokeWidth="2.5" />
        </g>
      )}

      {hat === 'wizard' && (
        <g>
          {/* Magierhut Kegel */}
          <polygon points="26,30 50,3 74,30" fill="#6D28D9" stroke="#4C1D95" strokeWidth="1.2" />
          {/* Hutkrempe */}
          <ellipse cx="50" cy="30" rx="28" ry="5.5" fill="#5B21B6" />
          {/* Goldener Stern */}
          <polygon points="50,14 52,19 57,19 53,22 55,27 50,24 45,27 47,22 43,19 48,19" fill="#FBBF24" />
        </g>
      )}

      {hat === 'devil_horns' && (
        <g>
          <path
            d="M34 32 C33 22 28 15 22 15 C24 23 29 28 34 34 Z"
            fill="#EF4444"
            filter={`url(#${laserFilterId})`}
          />
          <path
            d="M66 32 C67 22 72 15 78 15 C76 23 71 28 66 34 Z"
            fill="#EF4444"
            filter={`url(#${laserFilterId})`}
          />
        </g>
      )}

      {hat === 'halo' && (
        <g>
          <ellipse
            cx="50"
            cy="13"
            rx="21"
            ry="5.5"
            fill="none"
            stroke="#FBBF24"
            strokeWidth="3.2"
            filter={`url(#${glowFilterId})`}
          />
        </g>
      )}

      {hat === 'beanie' && (
        <g>
          {/* Wollmütze */}
          <path d="M29 33 C30 17 40 13 50 13 C60 13 70 17 71 33 Z" fill="#0284C7" />
          {/* Umschlag */}
          <rect x="27" y="28" width="46" height="8" rx="4" fill="#0369A1" />
          {/* Bommel */}
          <circle cx="50" cy="11" r="4.5" fill="#E0F2FE" />
        </g>
      )}

      {/* 6. GLÜHENDE AUSSENKONTUR PASSEND ZUR HINTERGRUND-AURA */}
      <circle
        cx="50"
        cy="50"
        r="49"
        fill="none"
        stroke={bgMeta.accent}
        strokeWidth="2"
        strokeOpacity="0.85"
      />
    </svg>
  );
}

export default Avatar;
