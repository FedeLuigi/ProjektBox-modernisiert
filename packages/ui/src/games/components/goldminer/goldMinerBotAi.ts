import {
  MINE_LOGICAL_H,
  MINE_LOGICAL_W,
  MINE_SURFACE_Y,
  type MineObject,
} from './goldMinerLevelGen';

export interface BotMinerView {
  anchorX: number;
  anchorY: number;
  angle: number;
  hookState: 'swing' | 'extend' | 'retract';
  carryingId: string | null;
  dynamite: number;
  hasRockBook: boolean;
}

/**
 * Computes whether a bot should drop its hook at the current swing angle,
 * or detonate dynamite if it accidentally hooked a low-value heavy obstacle.
 */
export function evaluateGoldMinerBotAction(
  miner: BotMinerView,
  objects: MineObject[]
): { dropHook: boolean; useDynamite: boolean } {
  if (miner.hookState === 'retract' && miner.carryingId && miner.dynamite > 0) {
    const carried = objects.find((o) => o.id === miner.carryingId);
    if (
      carried &&
      !miner.hasRockBook &&
      (carried.kind === 'rock_large' ||
        carried.kind === 'rock_small' ||
        carried.kind === 'bone' ||
        carried.kind === 'skull')
    ) {
      return { dropHook: false, useDynamite: true };
    }
    return { dropHook: false, useDynamite: false };
  }

  if (miner.hookState !== 'swing') {
    return { dropHook: false, useDynamite: false };
  }

  const dx = Math.sin(miner.angle);
  const dy = Math.cos(miner.angle);
  if (dy <= 0.1) {
    return { dropHook: false, useDynamite: false };
  }

  let closestDist = Infinity;
  let closestObj: MineObject | null = null;

  for (const obj of objects) {
    if (!obj.alive) continue;
    const relX = obj.x - miner.anchorX;
    const relY = obj.y - miner.anchorY;
    const proj = relX * dx + relY * dy;
    if (proj <= 35) continue;

    const tipX = miner.anchorX + dx * proj;
    const tipY = miner.anchorY + dy * proj;
    if (tipX < 20 || tipX > MINE_LOGICAL_W - 20 || tipY > MINE_LOGICAL_H - 12 || tipY < MINE_SURFACE_Y) {
      continue;
    }

    const perpDist = Math.hypot(obj.x - tipX, obj.y - tipY);
    if (perpDist <= obj.radius + 9 && proj < closestDist) {
      closestDist = proj;
      closestObj = obj;
    }
  }

  if (!closestObj) {
    return { dropHook: false, useDynamite: false };
  }

  // Prefer high value-per-weight targets; avoid firing straight into rocks unless Rock Book is active
  const isLowValueRock =
    !miner.hasRockBook &&
    (closestObj.kind === 'rock_small' ||
      closestObj.kind === 'rock_large' ||
      closestObj.kind === 'bone' ||
      closestObj.kind === 'skull');

  if (isLowValueRock) {
    return { dropHook: false, useDynamite: false };
  }

  const scoreDensity =
    closestObj.kind === 'mystery_bag'
      ? 180
      : closestObj.kind === 'tnt'
        ? 90
        : closestObj.value / Math.max(0.9, closestObj.weight);

  return {
    dropHook: scoreDensity >= 65,
    useDynamite: false,
  };
}
