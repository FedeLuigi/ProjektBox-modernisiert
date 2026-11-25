import { Assets, Container, Graphics, Matrix, Sprite, Text, Texture } from 'pixi.js';
import goldTextureUrl from '../../../assets/textures/goldminer/gold_texture.jpg';
import rockTextureUrl from '../../../assets/textures/goldminer/rock_texture.jpg';
import diamondTextureUrl from '../../../assets/textures/goldminer/diamond_texture.jpg';
import backdropUrl from '../../../assets/textures/goldminer/mine_backdrop.jpg';
import {
  MINE_LOGICAL_H,
  MINE_LOGICAL_W,
  MINE_SURFACE_Y,
  type MineObject,
} from './goldMinerLevelGen';

export interface MinerRenderState {
  playerId: string;
  name: string;
  color: string;
  anchorX: number;
  anchorY: number;
  angle: number;
  hookState: 'swing' | 'extend' | 'retract';
  hookLength: number;
  carryingId: string | null;
  winchSpin: number;
  hasStrength: boolean;
}

export interface FloatingPopup {
  x: number;
  y: number;
  text: string;
  color: number;
  ttl: number;
  maxTtl: number;
}

export interface ExplosionEffect {
  x: number;
  y: number;
  radius: number;
  ttl: number;
  maxTtl: number;
}

export interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  size: number;
  ttl: number;
  maxTtl: number;
}

export interface LoadedMineTextures {
  backdrop: Texture | null;
  gold: Texture | null;
  rock: Texture | null;
  diamond: Texture | null;
}

export async function loadGoldMinerTextures(): Promise<LoadedMineTextures> {
  const safeLoad = async (url: string): Promise<Texture | null> => {
    try {
      return await Assets.load<Texture>(url);
    } catch {
      return null;
    }
  };
  const [backdrop, gold, rock, diamond] = await Promise.all([
    safeLoad(backdropUrl),
    safeLoad(goldTextureUrl),
    safeLoad(rockTextureUrl),
    safeLoad(diamondTextureUrl),
  ]);
  return { backdrop, gold, rock, diamond };
}

function parseHexColor(hex: string, fallback = 0xfacc15): number {
  const cleaned = hex.replace('#', '');
  const parsed = Number.parseInt(cleaned, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function buildMineBackdrop(
  layer: Container,
  backdropTexture: Texture | null
): void {
  layer.removeChildren();

  if (backdropTexture) {
    const bg = new Sprite(backdropTexture);
    bg.width = MINE_LOGICAL_W;
    bg.height = MINE_LOGICAL_H;
    layer.addChild(bg);
  } else {
    const fallback = new Graphics();
    fallback.rect(0, 0, MINE_LOGICAL_W, MINE_SURFACE_Y).fill({ color: 0xf59e0b });
    fallback
      .rect(0, MINE_SURFACE_Y, MINE_LOGICAL_W, MINE_LOGICAL_H - MINE_SURFACE_Y)
      .fill({ color: 0x451a03 });
    layer.addChild(fallback);
  }

  // Timber deck & depth rim at MINE_SURFACE_Y for razor-sharp figure-ground separation
  const deck = new Graphics();
  deck.rect(0, MINE_SURFACE_Y - 12, MINE_LOGICAL_W, 14).fill({ color: 0x5c2d0c, alpha: 0.96 });
  deck.rect(0, MINE_SURFACE_Y - 14, MINE_LOGICAL_W, 3).fill({ color: 0xb45309, alpha: 0.9 });
  deck.rect(0, MINE_SURFACE_Y + 2, MINE_LOGICAL_W, 5).fill({ color: 0x000000, alpha: 0.28 });

  // Subtle vertical timber posts every 320px
  for (let x = 24; x < MINE_LOGICAL_W; x += 320) {
    deck.rect(x, MINE_SURFACE_Y - 10, 12, MINE_LOGICAL_H - MINE_SURFACE_Y).fill({
      color: 0x3b1c08,
      alpha: 0.22,
    });
  }
  layer.addChild(deck);
}

export function createMineObjectGraphic(
  obj: MineObject,
  textures: LoadedMineTextures
): Container {
  const container = new Container();
  container.x = obj.x;
  container.y = obj.y;
  container.rotation = obj.rotation;

  const g = new Graphics();
  const r = obj.radius;

  if (obj.kind.startsWith('gold_')) {
    const pts = [
      -r * 0.92, -r * 0.22,
      -r * 0.52, -r * 0.85,
      r * 0.28, -r * 0.9,
      r * 0.94, -r * 0.28,
      r * 0.82, r * 0.62,
      r * 0.08, r * 0.92,
      -r * 0.78, r * 0.68,
    ];
    if (textures.gold) {
      const m = new Matrix().scale((r * 2.2) / textures.gold.width, (r * 2.2) / textures.gold.height).translate(-r * 1.1, -r * 1.1);
      g.poly(pts).fill({ texture: textures.gold, matrix: m });
    } else {
      g.poly(pts).fill({ color: 0xfacc15 });
    }
    g.poly(pts).stroke({ width: 3, color: 0x713f12 });
    // Specular glint highlight
    g.poly([
      -r * 0.45, -r * 0.55,
      r * 0.15, -r * 0.62,
      r * 0.35, -r * 0.25,
      -r * 0.2, -r * 0.18,
    ]).fill({ color: 0xfef9c3, alpha: 0.45 });
  } else if (obj.kind.startsWith('rock_')) {
    const pts = [
      -r * 0.95, r * 0.1,
      -r * 0.68, -r * 0.78,
      r * 0.14, -r * 0.94,
      r * 0.9, -r * 0.46,
      r * 0.96, r * 0.44,
      r * 0.22, r * 0.92,
      -r * 0.64, r * 0.78,
    ];
    if (textures.rock) {
      const m = new Matrix().scale((r * 2.3) / textures.rock.width, (r * 2.3) / textures.rock.height).translate(-r * 1.15, -r * 1.15);
      g.poly(pts).fill({ texture: textures.rock, matrix: m });
    } else {
      g.poly(pts).fill({ color: 0x78716c });
    }
    g.poly(pts).stroke({ width: 3, color: 0x1c1917 });
    g.moveTo(-r * 0.3, -r * 0.45).lineTo(r * 0.18, 0).lineTo(r * 0.42, r * 0.35);
    g.stroke({ width: 2, color: 0x292524, alpha: 0.7 });
  } else if (obj.kind === 'diamond') {
    const pts = [
      0, -r * 1.05,
      r * 0.95, -r * 0.22,
      0, r * 1.05,
      -r * 0.95, -r * 0.22,
    ];
    if (textures.diamond) {
      const m = new Matrix().scale((r * 2.4) / textures.diamond.width, (r * 2.4) / textures.diamond.height).translate(-r * 1.2, -r * 1.2);
      g.poly(pts).fill({ texture: textures.diamond, matrix: m });
    } else {
      g.poly(pts).fill({ color: 0x38bdf8 });
    }
    g.poly(pts).stroke({ width: 2.5, color: 0xe0f2fe });
    g.poly([0, -r * 0.7, r * 0.42, -r * 0.15, 0, r * 0.4, -r * 0.42, -r * 0.15]).fill({
      color: 0xffffff,
      alpha: 0.35,
    });
  } else if (obj.kind === 'mystery_bag') {
    g.roundRect(-r * 0.78, -r * 0.45, r * 1.56, r * 1.35, 9).fill({ color: 0x92400e });
    g.roundRect(-r * 0.78, -r * 0.45, r * 1.56, r * 1.35, 9).stroke({ width: 2.5, color: 0x451a03 });
    g.poly([-r * 0.45, -r * 0.45, -r * 0.58, -r * 0.92, r * 0.58, -r * 0.92, r * 0.45, -r * 0.45]).fill({
      color: 0xb45309,
    });
    g.rect(-r * 0.5, -r * 0.5, r, 5).fill({ color: 0xfacc15 });
    container.addChild(g);

    const q = new Text({
      text: '?',
      style: {
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 22,
        fontWeight: '900',
        fill: '#FEF08A',
        stroke: { color: '#451A03', width: 4 },
      },
    });
    q.anchor.set(0.5);
    q.y = r * 0.2;
    container.addChild(q);
    return container;
  } else if (obj.kind === 'tnt') {
    g.roundRect(-r * 0.76, -r * 0.9, r * 1.52, r * 1.8, 6).fill({ color: 0xdc2626 });
    g.roundRect(-r * 0.76, -r * 0.9, r * 1.52, r * 1.8, 6).stroke({ width: 3, color: 0x450a0a });
    g.rect(-r * 0.76, -r * 0.38, r * 1.52, r * 0.76).fill({ color: 0xfef3c7 });
    g.rect(-r * 0.78, -r * 0.72, r * 1.56, 4).fill({ color: 0x292524 });
    g.rect(-r * 0.78, r * 0.64, r * 1.56, 4).fill({ color: 0x292524 });
    container.addChild(g);

    const label = new Text({
      text: 'TNT',
      style: {
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 13,
        fontWeight: '900',
        fill: '#991B1B',
      },
    });
    label.anchor.set(0.5);
    container.addChild(label);
    return container;
  } else if (obj.kind === 'mole_diamond') {
    // Mole body
    g.ellipse(0, 2, r * 0.95, r * 0.78).fill({ color: 0x57534e });
    g.ellipse(0, 2, r * 0.95, r * 0.78).stroke({ width: 2.5, color: 0x1c1917 });
    // Hard hat
    g.arc(0, -4, r * 0.62, Math.PI, 0).fill({ color: 0xfacc15 });
    g.rect(-r * 0.72, -5, r * 1.44, 4).fill({ color: 0xeab308 });
    // Pink snout + eyes
    g.circle(r * 0.78, 2, 4).fill({ color: 0xf472b6 });
    g.circle(r * 0.4, -2, 2.5).fill({ color: 0x09090b });
    // Carried diamond
    g.poly([0, -r * 1.05, 8, -r * 0.65, 0, -r * 0.28, -8, -r * 0.65]).fill({ color: 0x38bdf8 });
    g.poly([0, -r * 1.05, 8, -r * 0.65, 0, -r * 0.28, -8, -r * 0.65]).stroke({
      width: 1.5,
      color: 0xe0f2fe,
    });
  } else if (obj.kind === 'skull') {
    g.circle(0, -2, r * 0.76).fill({ color: 0xf5f5f4 });
    g.circle(0, -2, r * 0.76).stroke({ width: 2.5, color: 0x44403c });
    g.rect(-r * 0.38, r * 0.4, r * 0.76, r * 0.42).fill({ color: 0xf5f5f4 });
    g.circle(-5, -3, 3.5).fill({ color: 0x1c1917 });
    g.circle(5, -3, 3.5).fill({ color: 0x1c1917 });
  } else {
    // Bone
    g.roundRect(-r * 0.88, -4.5, r * 1.76, 9, 4).fill({ color: 0xf5f5f4 });
    g.circle(-r * 0.85, -4, 5).fill({ color: 0xf5f5f4 });
    g.circle(-r * 0.85, 4, 5).fill({ color: 0xf5f5f4 });
    g.circle(r * 0.85, -4, 5).fill({ color: 0xf5f5f4 });
    g.circle(r * 0.85, 4, 5).fill({ color: 0xf5f5f4 });
    g.stroke({ width: 2, color: 0x57534e });
  }

  container.addChild(g);
  return container;
}

export function drawMinersAndHooks(
  g: Graphics,
  miners: MinerRenderState[],
  objects: MineObject[]
): void {
  g.clear();

  for (const m of miners) {
    const colorHex = parseHexColor(m.color);
    const tipX = m.anchorX + Math.sin(m.angle) * m.hookLength;
    const tipY = m.anchorY + Math.cos(m.angle) * m.hookLength;

    // Subtle targeting dotted guide while swinging
    if (m.hookState === 'swing') {
      const gx = Math.sin(m.angle);
      const gy = Math.cos(m.angle);
      for (let d = 56; d <= 160; d += 22) {
        g.circle(m.anchorX + gx * d, m.anchorY + gy * d, 2.2).fill({
          color: colorHex,
          alpha: 0.45,
        });
      }
    }

    // Miner cart / platform badge
    g.roundRect(m.anchorX - 28, m.anchorY - 38, 56, 30, 8).fill({ color: 0x292524 });
    g.roundRect(m.anchorX - 28, m.anchorY - 38, 56, 30, 8).stroke({
      width: 2.5,
      color: colorHex,
    });

    // Miner hard hat & head
    g.circle(m.anchorX, m.anchorY - 46, 12).fill({ color: 0xfde68a });
    g.arc(m.anchorX, m.anchorY - 49, 13, Math.PI, 0).fill({ color: colorHex });
    g.rect(m.anchorX - 15, m.anchorY - 50, 30, 4).fill({ color: colorHex });

    // Strength glow ring
    if (m.hasStrength) {
      g.circle(m.anchorX, m.anchorY - 22, 22).stroke({
        width: 2,
        color: 0xfb923c,
        alpha: 0.7,
      });
    }

    // Rotating winch wheel
    g.circle(m.anchorX, m.anchorY - 6, 11).fill({ color: 0x78716c });
    g.circle(m.anchorX, m.anchorY - 6, 11).stroke({ width: 2, color: 0x1c1917 });
    const spokeX = Math.cos(m.winchSpin) * 9;
    const spokeY = Math.sin(m.winchSpin) * 9;
    g.moveTo(m.anchorX - spokeX, m.anchorY - 6 - spokeY)
      .lineTo(m.anchorX + spokeX, m.anchorY - 6 + spokeY)
      .stroke({ width: 2.5, color: 0xfef08a });

    // Tension-colored rope (turns warm orange when hauling heavy load)
    const carried = m.carryingId ? objects.find((o) => o.id === m.carryingId) : null;
    const ropeColor = carried && carried.weight >= 2.5 ? 0xf97316 : 0xe7e5e4;
    g.moveTo(m.anchorX, m.anchorY).lineTo(tipX, tipY).stroke({ width: 3.2, color: ropeColor });

    // Articulated 2-prong claw at tip
    const perpX = Math.cos(m.angle);
    const perpY = -Math.sin(m.angle);
    const dirX = Math.sin(m.angle);
    const dirY = Math.cos(m.angle);
    const spread = m.carryingId ? 8 : 14;

    g.circle(tipX, tipY, 5.5).fill({ color: colorHex });
    g.circle(tipX, tipY, 5.5).stroke({ width: 1.5, color: 0x09090b });

    // Left prong
    g.moveTo(tipX, tipY)
      .lineTo(tipX - perpX * spread + dirX * 10, tipY - perpY * spread + dirY * 10)
      .lineTo(tipX - perpX * (spread * 0.45) + dirX * 18, tipY - perpY * (spread * 0.45) + dirY * 18)
      .stroke({ width: 3.5, color: 0xd6d3d1 });

    // Right prong
    g.moveTo(tipX, tipY)
      .lineTo(tipX + perpX * spread + dirX * 10, tipY + perpY * spread + dirY * 10)
      .lineTo(tipX + perpX * (spread * 0.45) + dirX * 18, tipY + perpY * (spread * 0.45) + dirY * 18)
      .stroke({ width: 3.5, color: 0xd6d3d1 });
  }
}

export class GoldMinerPopupPool {
  private pool: Text[] = [];
  private container: Container;

  constructor(container: Container, initialSize = 16) {
    this.container = container;
    for (let i = 0; i < initialSize; i++) {
      const t = new Text({
        text: '',
        style: {
          fontFamily: 'Impact, Arial Black, sans-serif',
          fontSize: 24,
          fontWeight: '900',
          fill: '#FEF08A',
          stroke: { color: '#1C1917', width: 5 },
        },
      });
      t.anchor.set(0.5);
      t.visible = false;
      this.container.addChild(t);
      this.pool.push(t);
    }
  }

  public sync(popups: FloatingPopup[]): void {
    for (let i = 0; i < this.pool.length; i++) {
      const node = this.pool[i];
      const p = popups[i];
      if (!p) {
        node.visible = false;
        continue;
      }
      node.visible = true;
      node.text = p.text;
      node.x = p.x;
      node.y = p.y;
      node.style.fill = p.color;
      node.alpha = Math.min(1, Math.max(0, p.ttl / (p.maxTtl * 0.45)));
      const popScale = 1 + (1 - p.ttl / p.maxTtl) * 0.16;
      node.scale.set(popScale);
    }
  }
}
