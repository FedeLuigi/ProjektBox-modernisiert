import {
  GOLD_MINER_OBJECT_SPECS,
  type GoldMinerObjectKind,
} from '@projektbox/shared/utils';

export interface MineObject {
  id: string;
  kind: GoldMinerObjectKind;
  x: number;
  y: number;
  vx: number;
  radius: number;
  value: number;
  weight: number;
  alive: boolean;
  rotation: number;
}

export const MINE_LOGICAL_W = 1280;
export const MINE_LOGICAL_H = 720;
export const MINE_SURFACE_Y = 136;

function createObject(
  id: string,
  kind: GoldMinerObjectKind,
  x: number,
  y: number,
  rotation = 0,
  vx = 0
): MineObject {
  const spec = GOLD_MINER_OBJECT_SPECS[kind];
  return {
    id,
    kind,
    x,
    y,
    vx,
    radius: spec.radius,
    value: spec.value,
    weight: spec.weight,
    alive: true,
    rotation,
  };
}

/**
 * Generates a balanced, non-overlapping Gold Miner cavern layout for the given level.
 * Higher levels introduce deeper strata, more diamonds, diamond moles, and strategic TNT barrels.
 */
export function generateGoldMinerLevel(level: number, playerCount: number): MineObject[] {
  const objects: MineObject[] = [];
  const scaleFactor = 1 + Math.min(0.65, Math.max(0, playerCount - 1) * 0.22);

  const countLargeGold = Math.round((2 + Math.min(3, Math.floor(level / 2))) * scaleFactor);
  const countMedGold = Math.round((4 + Math.min(4, level)) * scaleFactor);
  const countSmallGold = Math.round((5 + Math.min(5, level)) * scaleFactor);
  const countLargeRock = Math.round((2 + Math.min(3, Math.floor(level / 2))) * scaleFactor);
  const countSmallRock = Math.round((3 + Math.min(4, level)) * scaleFactor);
  const countDiamonds = level >= 2 ? Math.round((1 + Math.min(3, Math.floor(level / 2))) * scaleFactor) : 1;
  const countMoles = level >= 2 ? Math.min(4, 1 + Math.floor(level / 2)) : 0;
  const countMystery = 1 + (level >= 3 ? 1 : 0);
  const countTnt = level >= 2 ? Math.min(3, Math.floor(level / 2)) : 0;
  const countBones = level >= 3 ? 2 : 1;

  const canPlace = (x: number, y: number, radius: number): boolean => {
    for (const obj of objects) {
      const dx = obj.x - x;
      const dy = obj.y - y;
      const minDist = obj.radius + radius + 16;
      if (dx * dx + dy * dy < minDist * minDist) {
        return false;
      }
    }
    return true;
  };

  const placeInBand = (
    kind: GoldMinerObjectKind,
    minY: number,
    maxY: number,
    idx: number,
    vx = 0
  ) => {
    const spec = GOLD_MINER_OBJECT_SPECS[kind];
    const marginX = 72 + spec.radius;
    for (let attempt = 0; attempt < 48; attempt++) {
      const x = marginX + Math.random() * (MINE_LOGICAL_W - marginX * 2);
      const y = minY + Math.random() * (maxY - minY);
      if (canPlace(x, y, spec.radius)) {
        objects.push(
          createObject(
            `${kind}-${level}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            kind,
            x,
            y,
            (Math.random() - 0.5) * 0.7,
            vx
          )
        );
        return;
      }
    }
  };

  // Deep high-value targets (diamonds, large gold)
  for (let i = 0; i < countDiamonds; i++) placeInBand('diamond', 440, 665, i);
  for (let i = 0; i < countLargeGold; i++) placeInBand('gold_large', 410, 655, i);

  // Mid-strata nuggets & mystery bags
  for (let i = 0; i < countMedGold; i++) placeInBand('gold_medium', 280, 560, i);
  for (let i = 0; i < countMystery; i++) placeInBand('mystery_bag', 310, 590, i);

  // Strategic TNT barrels near mid-deep clusters
  for (let i = 0; i < countTnt; i++) placeInBand('tnt', 300, 540, i);

  // Shallow & mid small gold + rocks
  for (let i = 0; i < countSmallGold; i++) placeInBand('gold_small', 220, 470, i);
  for (let i = 0; i < countLargeRock; i++) placeInBand('rock_large', 260, 570, i);
  for (let i = 0; i < countSmallRock; i++) placeInBand('rock_small', 225, 490, i);

  // Fossils
  for (let i = 0; i < countBones; i++) {
    placeInBand(i % 2 === 0 ? 'bone' : 'skull', 250, 560, i);
  }

  // Wandering diamond moles
  for (let i = 0; i < countMoles; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    const speed = (68 + level * 8) * dir;
    placeInBand('mole_diamond', 320, 620, i, speed);
  }

  return objects;
}
