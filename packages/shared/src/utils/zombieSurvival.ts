export type ZombieWeaponId =
  | 'pistol'
  | 'smg'
  | 'shotgun'
  | 'rifle'
  | 'plasma'
  | 'rocket';

export interface ZombieWeaponSpec {
  id: ZombieWeaponId;
  name: string;
  shortName: string;
  unlockLevel: number;
  damage: number;
  fireRateMs: number;
  magSize: number;
  reloadMs: number;
  pellets: number;
  spread: number;
  projectileSpeed: number;
  color: string;
  piercing?: boolean;
  splashRadius?: number;
}

export const ZOMBIE_WEAPONS: ZombieWeaponSpec[] = [
  {
    id: 'pistol',
    name: 'P9 Pistole',
    shortName: 'PISTOLE',
    unlockLevel: 1,
    damage: 28,
    fireRateMs: 340,
    magSize: 12,
    reloadMs: 1050,
    pellets: 1,
    spread: 0.03,
    projectileSpeed: 28,
    color: '#38BDF8',
  },
  {
    id: 'smg',
    name: 'MP5 Blitz',
    shortName: 'MP5',
    unlockLevel: 2,
    damage: 20,
    fireRateMs: 115,
    magSize: 30,
    reloadMs: 1250,
    pellets: 1,
    spread: 0.08,
    projectileSpeed: 30,
    color: '#34D399',
  },
  {
    id: 'shotgun',
    name: 'Pump-Shotgun',
    shortName: 'SHOTGUN',
    unlockLevel: 3,
    damage: 24,
    fireRateMs: 620,
    magSize: 8,
    reloadMs: 1450,
    pellets: 5,
    spread: 0.24,
    projectileSpeed: 26,
    color: '#FBBF24',
  },
  {
    id: 'rifle',
    name: 'M4 Sturmgewehr',
    shortName: 'M4 STURM',
    unlockLevel: 4,
    damage: 36,
    fireRateMs: 140,
    magSize: 32,
    reloadMs: 1350,
    pellets: 1,
    spread: 0.04,
    projectileSpeed: 36,
    color: '#A78BFA',
  },
  {
    id: 'plasma',
    name: 'Plasma-Blaster',
    shortName: 'PLASMA',
    unlockLevel: 5,
    damage: 48,
    fireRateMs: 105,
    magSize: 45,
    reloadMs: 1200,
    pellets: 1,
    spread: 0.02,
    projectileSpeed: 40,
    color: '#22D3EE',
    piercing: true,
  },
  {
    id: 'rocket',
    name: 'Inferno-Werfer',
    shortName: 'RAKETEN',
    unlockLevel: 6,
    damage: 120,
    fireRateMs: 720,
    magSize: 6,
    reloadMs: 1700,
    pellets: 1,
    spread: 0.01,
    projectileSpeed: 23,
    color: '#F43F5E',
    splashRadius: 3.6,
  },
];

export const ZOMBIE_LEVEL_THRESHOLDS = [0, 100, 250, 450, 750, 1150] as const;

export function getLevelForXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  for (let i = ZOMBIE_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (safeXp >= ZOMBIE_LEVEL_THRESHOLDS[i]) {
      if (i === ZOMBIE_LEVEL_THRESHOLDS.length - 1) {
        const extraLevels = Math.floor((safeXp - ZOMBIE_LEVEL_THRESHOLDS[i]) / 500);
        return i + 1 + extraLevels;
      }
      return i + 1;
    }
  }
  return 1;
}

export function getXpBoundsForLevel(level: number): { currentMinXp: number; nextLevelXp: number } {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel <= ZOMBIE_LEVEL_THRESHOLDS.length) {
    const currentMinXp = ZOMBIE_LEVEL_THRESHOLDS[safeLevel - 1];
    const nextLevelXp =
      safeLevel < ZOMBIE_LEVEL_THRESHOLDS.length
        ? ZOMBIE_LEVEL_THRESHOLDS[safeLevel]
        : ZOMBIE_LEVEL_THRESHOLDS[ZOMBIE_LEVEL_THRESHOLDS.length - 1] + 500;
    return { currentMinXp, nextLevelXp };
  }
  const baseTop = ZOMBIE_LEVEL_THRESHOLDS[ZOMBIE_LEVEL_THRESHOLDS.length - 1];
  const offset = safeLevel - ZOMBIE_LEVEL_THRESHOLDS.length;
  return {
    currentMinXp: baseTop + offset * 500,
    nextLevelXp: baseTop + (offset + 1) * 500,
  };
}

export function getWeaponForLevel(level: number): ZombieWeaponSpec {
  const safeLevel = Math.max(1, Math.floor(level));
  let best = ZOMBIE_WEAPONS[0];
  for (const weapon of ZOMBIE_WEAPONS) {
    if (safeLevel >= weapon.unlockLevel) {
      best = weapon;
    }
  }
  return best;
}

export function getWeaponById(weaponId: string): ZombieWeaponSpec {
  return ZOMBIE_WEAPONS.find((w) => w.id === weaponId) || ZOMBIE_WEAPONS[0];
}
