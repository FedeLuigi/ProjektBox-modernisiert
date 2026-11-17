export type SplashVariantId =
  | 'box-unboxing'
  | 'cube-3d'
  | 'particle-forge'
  | 'vector-blueprint'
  | 'cinema-shutter'
  | 'cyber-warp'
  | 'liquid-aurora'
  | 'kinetic-type'
  | 'pixel-wave'
  | 'party-confetti';

export interface SplashVariantMeta {
  id: SplashVariantId;
  title: string;
  techTag: string;
  description: string;
  accentHex: string;
}

export const SPLASH_VARIANT_STORAGE_KEY = 'projektbox.splashVariant';
export const DEFAULT_SPLASH_VARIANT: SplashVariantId = 'box-unboxing';

export const SPLASH_VARIANTS: SplashVariantMeta[] = [
  {
    id: 'box-unboxing',
    title: 'Spielbox Unboxing',
    techTag: 'ISOMETRIE & TOKENS',
    description: '3D-Spielbox fällt auf das Podest, Deckel schwingt auf und Spiel-Tokens schießen heraus.',
    accentHex: '#F59E0B',
  },
  {
    id: 'cube-3d',
    title: 'CSS-3D Würfel',
    techTag: 'CSS PRESERVE-3D',
    description: 'Echter 6-seitiger Raumwürfel rotiert perspektivisch durch den 3D-Raum und rastet ein.',
    accentHex: '#38BDF8',
  },
  {
    id: 'particle-forge',
    title: 'Partikel-Schwarm',
    techTag: 'CANVAS 2D PHYSIK',
    description: 'Über 240 Partikel wirbeln im Feld und formieren sich per Feder-Physik zum Box-Kern.',
    accentHex: '#FBBF24',
  },
  {
    id: 'vector-blueprint',
    title: 'Laser-Gravur',
    techTag: 'SVG STROKE-PATH',
    description: 'Präziser Vektor-Laser zeichnet die Konstruktionslinien der Spielbox in Echtzeit.',
    accentHex: '#38BDF8',
  },
  {
    id: 'cinema-shutter',
    title: 'Kino-Blende',
    techTag: 'CLIP-PATH WIPE',
    description: 'Diagonale Shutter-Blenden schneiden den Bildschirm auf und geben die Bühne frei.',
    accentHex: '#F59E0B',
  },
  {
    id: 'cyber-warp',
    title: 'Hyperspace Warp',
    techTag: 'CANVAS 3D-PROJEKTION',
    description: 'Vollbild-3D-Sternen- & Lichtertunnel beschleunigt bis zum finalen Impact.',
    accentHex: '#10B981',
  },
  {
    id: 'liquid-aurora',
    title: 'Liquid Aurora',
    techTag: 'SVG GOOEY SHADER',
    description: 'Organische Metaball-Farbfelder verschmelzen über SVG-Filter zum leuchtenden Emblem.',
    accentHex: '#EC4899',
  },
  {
    id: 'kinetic-type',
    title: 'Kinetik-Kaskade',
    techTag: '3D SPLIT-LETTER',
    description: 'Jeder Buchstabe von PROJEKT BOX flippt gestaffelt mit elastischem Spring-Timing ein.',
    accentHex: '#F59E0B',
  },
  {
    id: 'pixel-wave',
    title: 'Matrix-Welle',
    techTag: 'CANVAS SINUS-GRID',
    description: 'Interaktives Vollbild-Punktraster pulsiert in einer radialen Sinuswelle aus der Mitte.',
    accentHex: '#10B981',
  },
  {
    id: 'party-confetti',
    title: 'Konfetti-Salve',
    techTag: 'CANVAS BALLISTIK',
    description: 'Zwei Seiten-Kanonen feuern physiksimulierte Gold- & Smaragd-Bänder über die Bühne.',
    accentHex: '#F472B6',
  },
];

export function getSavedSplashVariant(): SplashVariantId {
  try {
    const raw = localStorage.getItem(SPLASH_VARIANT_STORAGE_KEY) as SplashVariantId | null;
    if (raw && SPLASH_VARIANTS.some((v) => v.id === raw)) {
      return raw;
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_SPLASH_VARIANT;
}

export function saveSplashVariant(variant: SplashVariantId): void {
  try {
    localStorage.setItem(SPLASH_VARIANT_STORAGE_KEY, variant);
  } catch {
    // ignore storage errors
  }
}
