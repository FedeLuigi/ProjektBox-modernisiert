import { Assets, Container, Graphics, Matrix, Text, Texture } from 'pixi.js';
import goldTextureUrl from '../../../assets/textures/goldminer/gold_texture.jpg';
import rockTextureUrl from '../../../assets/textures/goldminer/rock_texture.jpg';
import diamondTextureUrl from '../../../assets/textures/goldminer/diamond_texture.jpg';
import woodTextureUrl from '../../../assets/textures/goldminer/wood_texture.jpg';
import {
  MINE_LOGICAL_W,
  MINE_SURFACE_Y,
  type MineObject,
} from './goldMinerLevelGen';

export interface MinerRenderState {
  playerId: string;
  name: string;
  color: string;
  money: number;
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
  gold: Texture | null;
  rock: Texture | null;
  diamond: Texture | null;
  wood: Texture | null;
}

export async function loadGoldMinerTextures(): Promise<LoadedMineTextures> {
  const safeLoad = async (url: string): Promise<Texture | null> => {
    try {
      return await Assets.load<Texture>(url);
    } catch {
      return null;
    }
  };
  const [gold, rock, diamond, wood] = await Promise.all([
    safeLoad(goldTextureUrl),
    safeLoad(rockTextureUrl),
    safeLoad(diamondTextureUrl),
    safeLoad(woodTextureUrl),
  ]);
  return { gold, rock, diamond, wood };
}

function parseHexColor(hex: string, fallback = 0xfacc15): number {
  const cleaned = hex.replace('#', '');
  const parsed = Number.parseInt(cleaned, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Draws only the wooden mining deck beam along MINE_SURFACE_Y;
 * the full-bleed mine_backdrop.jpg sits behind the transparent Pixi canvas
 * so there is zero letterboxing on any TV aspect ratio.
 */
export function buildMineDeck(
  layer: Container,
  woodTexture: Texture | null
): void {
  layer.removeChildren();
  const deck = new Graphics();

  if (woodTexture) {
    const m = new Matrix().scale(180 / woodTexture.width, 18 / woodTexture.height);
    deck.rect(-120, MINE_SURFACE_Y - 12, MINE_LOGICAL_W + 240, 15).fill({
      texture: woodTexture,
      matrix: m,
    });
  } else {
    deck.rect(-120, MINE_SURFACE_Y - 12, MINE_LOGICAL_W + 240, 15).fill({ color: 0x5c2d0c });
  }

  deck.rect(-120, MINE_SURFACE_Y - 13, MINE_LOGICAL_W + 240, 2.5).fill({
    color: 0xd97706,
    alpha: 0.7,
  });
  deck.rect(-120, MINE_SURFACE_Y + 3, MINE_LOGICAL_W + 240, 5).fill({
    color: 0x000000,
    alpha: 0.32,
  });
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
      const m = new Matrix()
        .scale((r * 2.2) / textures.gold.width, (r * 2.2) / textures.gold.height)
        .translate(-r * 1.1, -r * 1.1);
      g.poly(pts).fill({ texture: textures.gold, matrix: m });
    } else {
      g.poly(pts).fill({ color: 0xfacc15 });
    }
    g.poly(pts).stroke({ width: 3, color: 0x451a03 });
    g.poly([
      -r * 0.45, -r * 0.55,
      r * 0.15, -r * 0.62,
      r * 0.35, -r * 0.25,
      -r * 0.2, -r * 0.18,
    ]).fill({ color: 0xfef9c3, alpha: 0.42 });
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
      const m = new Matrix()
        .scale((r * 2.3) / textures.rock.width, (r * 2.3) / textures.rock.height)
        .translate(-r * 1.15, -r * 1.15);
      g.poly(pts).fill({ texture: textures.rock, matrix: m });
    } else {
      g.poly(pts).fill({ color: 0x78716c });
    }
    g.poly(pts).stroke({ width: 3, color: 0x1c1917 });
    g.moveTo(-r * 0.3, -r * 0.45).lineTo(r * 0.18, 0).lineTo(r * 0.42, r * 0.35);
    g.stroke({ width: 2, color: 0x292524, alpha: 0.75 });
  } else if (obj.kind === 'diamond') {
    const pts = [
      0, -r * 1.05,
      r * 0.95, -r * 0.22,
      0, r * 1.05,
      -r * 0.95, -r * 0.22,
    ];
    if (textures.diamond) {
      const m = new Matrix()
        .scale((r * 2.4) / textures.diamond.width, (r * 2.4) / textures.diamond.height)
        .translate(-r * 1.2, -r * 1.2);
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
    // Rich leather/canvas pouch with shaded folds & golden drawstring
    g.roundRect(-r * 0.8, -r * 0.44, r * 1.6, r * 1.38, 10).fill({ color: 0x78350f });
    g.roundRect(-r * 0.68, -r * 0.32, r * 1.3, r * 1.05, 8).fill({ color: 0x92400e });
    g.roundRect(-r * 0.8, -r * 0.44, r * 1.6, r * 1.38, 10).stroke({
      width: 3,
      color: 0x291104,
    });
    g.poly([
      -r * 0.44, -r * 0.44,
      -r * 0.58, -r * 0.92,
      r * 0.58, -r * 0.92,
      r * 0.44, -r * 0.44,
    ]).fill({ color: 0xb45309 });
    g.poly([
      -r * 0.44, -r * 0.44,
      -r * 0.58, -r * 0.92,
      r * 0.58, -r * 0.92,
      r * 0.44, -r * 0.44,
    ]).stroke({ width: 2.5, color: 0x291104 });
    g.roundRect(-r * 0.52, -r * 0.52, r * 1.04, 6, 3).fill({ color: 0xfacc15 });
    container.addChild(g);

    const q = new Text({
      text: '?',
      style: {
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 22,
        fontWeight: '900',
        fill: '#FEF08A',
        stroke: { color: '#291104', width: 4 },
      },
    });
    q.anchor.set(0.5);
    q.y = r * 0.22;
    container.addChild(q);
    return container;
  } else if (obj.kind === 'tnt') {
    // Painterly wooden barrel with iron hoops & crimson TNT band
    if (textures.wood) {
      const m = new Matrix()
        .scale((r * 2) / textures.wood.width, (r * 2) / textures.wood.height)
        .translate(-r, -r);
      g.roundRect(-r * 0.78, -r * 0.92, r * 1.56, r * 1.84, 7).fill({
        texture: textures.wood,
        matrix: m,
      });
    } else {
      g.roundRect(-r * 0.78, -r * 0.92, r * 1.56, r * 1.84, 7).fill({ color: 0x92400e });
    }
    g.rect(-r * 0.78, -r * 0.42, r * 1.56, r * 0.84).fill({ color: 0xb91c1c });
    g.rect(-r * 0.74, -r * 0.28, r * 1.48, r * 0.56).fill({ color: 0xfef3c7 });
    // Iron hoops
    g.rect(-r * 0.8, -r * 0.74, r * 1.6, 5).fill({ color: 0x292524 });
    g.rect(-r * 0.8, r * 0.64, r * 1.6, 5).fill({ color: 0x292524 });
    g.roundRect(-r * 0.78, -r * 0.92, r * 1.56, r * 1.84, 7).stroke({
      width: 3,
      color: 0x1c1917,
    });
    container.addChild(g);

    const label = new Text({
      text: 'TNT',
      style: {
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 12,
        fontWeight: '900',
        fill: '#991B1B',
      },
    });
    label.anchor.set(0.5);
    container.addChild(label);
    return container;
  } else if (obj.kind === 'mole_diamond') {
    // Rich shaded mole with headlamp & faceted textured diamond
    g.ellipse(0, 4, r * 0.98, r * 0.76).fill({ color: 0x3f3a36 });
    g.ellipse(-2, 1, r * 0.82, r * 0.56).fill({ color: 0x57534e });
    g.ellipse(0, 4, r * 0.98, r * 0.76).stroke({ width: 2.8, color: 0x1c1917 });
    // Paws
    g.ellipse(r * 0.52, r * 0.58, 6, 4).fill({ color: 0xd6a68d });
    g.ellipse(-r * 0.42, r * 0.62, 6, 4).fill({ color: 0xd6a68d });
    // Hard hat (closed shape, no stray arc line!)
    g.ellipse(0, -4, r * 0.65, r * 0.42).fill({ color: 0xeab308 });
    g.ellipse(0, -4, r * 0.65, r * 0.42).stroke({ width: 2, color: 0x451a03 });
    g.roundRect(-r * 0.74, -5, r * 1.48, 5, 2).fill({ color: 0xfacc15 });
    // Glowing headlamp
    g.circle(r * 0.46, -8, 4.5).fill({ color: 0xfef08a });
    g.circle(r * 0.46, -8, 4.5).stroke({ width: 1.5, color: 0x451a03 });
    // Snout & eye
    g.circle(r * 0.82, 4, 4.5).fill({ color: 0xf472b6 });
    g.circle(r * 0.42, -1, 2.5).fill({ color: 0x09090b });

    // Textured diamond carried on back
    const dPts = [0, -r * 1.15, 9, -r * 0.72, 0, -r * 0.3, -9, -r * 0.72];
    if (textures.diamond) {
      const m = new Matrix()
        .scale(22 / textures.diamond.width, 22 / textures.diamond.height)
        .translate(-11, -r * 1.15);
      g.poly(dPts).fill({ texture: textures.diamond, matrix: m });
    } else {
      g.poly(dPts).fill({ color: 0x38bdf8 });
    }
    g.poly(dPts).stroke({ width: 1.8, color: 0xe0f2fe });
  } else if (obj.kind === 'skull') {
    g.circle(0, -2, r * 0.76).fill({ color: 0xe7e5e4 });
    g.circle(-2, -4, r * 0.62).fill({ color: 0xf5f5f4 });
    g.circle(0, -2, r * 0.76).stroke({ width: 2.8, color: 0x292524 });
    g.roundRect(-r * 0.38, r * 0.38, r * 0.76, r * 0.42, 3).fill({ color: 0xe7e5e4 });
    g.roundRect(-r * 0.38, r * 0.38, r * 0.76, r * 0.42, 3).stroke({
      width: 2,
      color: 0x292524,
    });
    g.circle(-5, -3, 3.5).fill({ color: 0x1c1917 });
    g.circle(5, -3, 3.5).fill({ color: 0x1c1917 });
  } else {
    g.roundRect(-r * 0.88, -4.5, r * 1.76, 9, 4).fill({ color: 0xe7e5e4 });
    g.circle(-r * 0.85, -4, 5).fill({ color: 0xf5f5f4 });
    g.circle(-r * 0.85, 4, 5).fill({ color: 0xe7e5e4 });
    g.circle(r * 0.85, -4, 5).fill({ color: 0xf5f5f4 });
    g.circle(r * 0.85, 4, 5).fill({ color: 0xe7e5e4 });
    g.stroke({ width: 2.5, color: 0x292524 });
  }

  container.addChild(g);
  return container;
}

export function drawMinersAndHooks(
  g: Graphics,
  miners: MinerRenderState[],
  objects: MineObject[],
  woodTexture: Texture | null
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
      for (let d = 58; d <= 165; d += 22) {
        g.circle(m.anchorX + gx * d, m.anchorY + gy * d, 2.3).fill({
          color: 0xfef08a,
          alpha: 0.5,
        });
      }
    }

    // Wooden mining cart & brass frame (using wood texture if available)
    if (woodTexture) {
      const wm = new Matrix()
        .scale(68 / woodTexture.width, 34 / woodTexture.height)
        .translate(m.anchorX - 34, m.anchorY - 38);
      g.roundRect(m.anchorX - 30, m.anchorY - 38, 60, 30, 7).fill({
        texture: woodTexture,
        matrix: wm,
      });
    } else {
      g.roundRect(m.anchorX - 30, m.anchorY - 38, 60, 30, 7).fill({ color: 0x451a03 });
    }
    g.roundRect(m.anchorX - 30, m.anchorY - 38, 60, 30, 7).stroke({
      width: 2.8,
      color: 0x1c1917,
    });
    // Player color trim bar on cart
    g.roundRect(m.anchorX - 24, m.anchorY - 35, 48, 5, 2.5).fill({ color: colorHex });

    // Miner head & closed hard hat (no stray .arc() path!)
    g.circle(m.anchorX, m.anchorY - 47, 11.5).fill({ color: 0xfde68a });
    g.circle(m.anchorX, m.anchorY - 47, 11.5).stroke({ width: 2, color: 0x292524 });
    g.ellipse(m.anchorX, m.anchorY - 53, 13.5, 8).fill({ color: colorHex });
    g.ellipse(m.anchorX, m.anchorY - 53, 13.5, 8).stroke({ width: 2, color: 0x1c1917 });
    g.roundRect(m.anchorX - 16, m.anchorY - 52, 32, 4.5, 2).fill({ color: colorHex });
    g.roundRect(m.anchorX - 16, m.anchorY - 52, 32, 4.5, 2).stroke({
      width: 1.5,
      color: 0x1c1917,
    });

    // Strength aura ring
    if (m.hasStrength) {
      g.circle(m.anchorX, m.anchorY - 22, 24).stroke({
        width: 2.5,
        color: 0xfb923c,
        alpha: 0.75,
      });
    }

    // Brass winch wheel
    g.circle(m.anchorX, m.anchorY - 6, 11.5).fill({ color: 0x78716c });
    g.circle(m.anchorX, m.anchorY - 6, 11.5).stroke({ width: 2.5, color: 0x1c1917 });
    const spokeX = Math.cos(m.winchSpin) * 9;
    const spokeY = Math.sin(m.winchSpin) * 9;
    g.moveTo(m.anchorX - spokeX, m.anchorY - 6 - spokeY)
      .lineTo(m.anchorX + spokeX, m.anchorY - 6 + spokeY)
      .stroke({ width: 2.5, color: 0xfef08a });

    // Braided steel rope (dark outline + inner tension color)
    const carried = m.carryingId ? objects.find((o) => o.id === m.carryingId) : null;
    const ropeCore = carried && carried.weight >= 2.5 ? 0xf97316 : 0xe7e5e4;
    g.moveTo(m.anchorX, m.anchorY).lineTo(tipX, tipY).stroke({ width: 5, color: 0x1c1917 });
    g.moveTo(m.anchorX, m.anchorY).lineTo(tipX, tipY).stroke({ width: 2.6, color: ropeCore });

    // Articulated steel 2-prong claw with dark outline
    const perpX = Math.cos(m.angle);
    const perpY = -Math.sin(m.angle);
    const dirX = Math.sin(m.angle);
    const dirY = Math.cos(m.angle);
    const spread = m.carryingId ? 8 : 14;

    // Left prong
    g.moveTo(tipX, tipY)
      .lineTo(tipX - perpX * spread + dirX * 10, tipY - perpY * spread + dirY * 10)
      .lineTo(tipX - perpX * (spread * 0.45) + dirX * 18, tipY - perpY * (spread * 0.45) + dirY * 18)
      .stroke({ width: 6, color: 0x1c1917 });
    g.moveTo(tipX, tipY)
      .lineTo(tipX - perpX * spread + dirX * 10, tipY - perpY * spread + dirY * 10)
      .lineTo(tipX - perpX * (spread * 0.45) + dirX * 18, tipY - perpY * (spread * 0.45) + dirY * 18)
      .stroke({ width: 3, color: 0xd6d3d1 });

    // Right prong
    g.moveTo(tipX, tipY)
      .lineTo(tipX + perpX * spread + dirX * 10, tipY + perpY * spread + dirY * 10)
      .lineTo(tipX + perpX * (spread * 0.45) + dirX * 18, tipY + perpY * (spread * 0.45) + dirY * 18)
      .stroke({ width: 6, color: 0x1c1917 });
    g.moveTo(tipX, tipY)
      .lineTo(tipX + perpX * spread + dirX * 10, tipY + perpY * spread + dirY * 10)
      .lineTo(tipX + perpX * (spread * 0.45) + dirX * 18, tipY + perpY * (spread * 0.45) + dirY * 18)
      .stroke({ width: 3, color: 0xd6d3d1 });

    // Claw swivel bolt
    g.circle(tipX, tipY, 6).fill({ color: colorHex });
    g.circle(tipX, tipY, 6).stroke({ width: 2, color: 0x1c1917 });
  }
}

export class GoldMinerNameplatePool {
  private plates: Array<{ root: Container; bg: Graphics; label: Text }> = [];
  private container: Container;

  constructor(container: Container, maxMiners = 8) {
    this.container = container;
    for (let i = 0; i < maxMiners; i++) {
      const root = new Container();
      const bg = new Graphics();
      const label = new Text({
        text: '',
        style: {
          fontFamily: 'Impact, Arial Black, sans-serif',
          fontSize: 14,
          fontWeight: '900',
          fill: '#FEF3C7',
          stroke: { color: '#291104', width: 3 },
        },
      });
      label.anchor.set(0.5);
      root.addChild(bg, label);
      root.visible = false;
      this.container.addChild(root);
      this.plates.push({ root, bg, label });
    }
  }

  public sync(miners: MinerRenderState[]): void {
    for (let i = 0; i < this.plates.length; i++) {
      const plate = this.plates[i];
      const m = miners[i];
      if (!m) {
        plate.root.visible = false;
        continue;
      }
      plate.root.visible = true;
      plate.root.x = m.anchorX;
      plate.root.y = m.anchorY - 78;
      plate.label.text = `${m.name}  $${m.money}`;

      const w = Math.max(88, plate.label.width + 22);
      const h = 24;
      const colorHex = parseHexColor(m.color);

      plate.bg.clear();
      plate.bg.roundRect(-w / 2, -h / 2, w, h, 8).fill({ color: 0x3b1806, alpha: 0.92 });
      plate.bg.roundRect(-w / 2, -h / 2, w, h, 8).stroke({ width: 2.2, color: 0xd97706 });
      plate.bg.circle(-w / 2 + 10, 0, 4).fill({ color: colorHex });
      plate.label.x = 4;
    }
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
