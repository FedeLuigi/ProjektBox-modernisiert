import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text } from 'pixi.js';
import {
  GiClover,
  GiDiamondHard,
  GiDynamite,
  GiMuscleUp,
  GiPauseButton,
  GiPlayButton,
  GiSoundOff,
  GiSoundOn,
  GiSpellBook,
} from 'react-icons/gi';
import type {
  GoldMinerHudStatePayload,
  GoldMinerMode,
  GoldMinerPlayerHudState,
  GoldMinerShopItemId,
  Player,
} from '@projektbox/shared/types';
import {
  GOLD_MINER_OBJECT_SPECS,
  GOLD_MINER_SHOP_ITEMS,
  getGoldMinerLevelTarget,
  type GoldMinerObjectKind,
} from '@projektbox/shared/utils';
import { socketService } from '../../../services/socket';
import { goldMinerAudio } from './goldMinerAudio';

interface GoldMinerArenaProps {
  players: Player[];
  mode: GoldMinerMode;
  sessionKey?: string;
  isGameOver: boolean;
  localPlayerId?: string;
  onFinish: (payload: { level: number; scores: Record<string, number> }) => void;
}

interface GoldMinerSavedSnapshot {
  level: number;
  timeLeft: number;
  targetMoney: number;
  phase: 'playing' | 'shop' | 'gameover';
  objects: MineObject[];
  shopOffers: Array<{ id: GoldMinerShopItemId; price: number }>;
  miners: MinerRuntime[];
}

const goldMinerSessionSnapshots = new Map<string, GoldMinerSavedSnapshot>();

const LOGICAL_W = 1280;
const LOGICAL_H = 720;
const SURFACE_Y = 136;

interface MineObject {
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

interface MinerRuntime {
  playerId: string;
  name: string;
  color: string;
  anchorX: number;
  anchorY: number;
  angle: number;
  angleDir: number;
  hookState: 'swing' | 'extend' | 'retract';
  hookLength: number;
  carryingId: string | null;
  money: number;
  dynamite: number;
  hasStrength: boolean;
  hasClover: boolean;
  hasRockBook: boolean;
  hasDiamondPolish: boolean;
  readyForNextLevel: boolean;
  winchSpin: number;
}

interface FloatingPopup {
  x: number;
  y: number;
  text: string;
  color: number;
  ttl: number;
}

interface ExplosionEffect {
  x: number;
  y: number;
  radius: number;
  ttl: number;
}

function parseHexColor(color: string | undefined, fallback = 0xfacc15): number {
  if (!color) return fallback;
  const cleaned = color.replace('#', '');
  const parsed = Number.parseInt(cleaned, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function generateLevelObjects(level: number): MineObject[] {
  const objects: MineObject[] = [];
  const count = Math.min(26, 14 + level * 2);

  const pool: GoldMinerObjectKind[] = [
    'gold_small',
    'gold_small',
    'gold_medium',
    'gold_medium',
    'gold_large',
    'rock_small',
    'rock_large',
    'diamond',
    'mystery_bag',
    'bone',
    'skull',
  ];
  if (level >= 2) {
    pool.push('tnt', 'tnt', 'mole_diamond');
  }
  if (level >= 3) {
    pool.push('diamond', 'mole_diamond', 'gold_large');
  }

  let attempts = 0;
  while (objects.length < count && attempts < 500) {
    attempts++;
    const kind = pool[Math.floor(Math.random() * pool.length)];
    const spec = GOLD_MINER_OBJECT_SPECS[kind];
    const minY = kind === 'gold_large' || kind === 'rock_large' ? SURFACE_Y + 190 : SURFACE_Y + 75;
    const maxY = LOGICAL_H - 55;
    const x = 70 + Math.random() * (LOGICAL_W - 140);
    const y = minY + Math.random() * (maxY - minY);

    const overlaps = objects.some((o) => Math.hypot(o.x - x, o.y - y) < o.radius + spec.radius + 18);
    if (overlaps) continue;

    objects.push({
      id: `obj-${level}-${objects.length}`,
      kind,
      x,
      y,
      vx: kind === 'mole_diamond' ? (Math.random() < 0.5 ? 110 : -110) : 0,
      radius: spec.radius,
      value: spec.value,
      weight: spec.weight,
      alive: true,
      rotation: (Math.random() - 0.5) * 0.5,
    });
  }

  return objects;
}

function generateShopOffers(level: number): Array<{ id: GoldMinerShopItemId; price: number }> {
  return GOLD_MINER_SHOP_ITEMS.map((item) => {
    const jitter = Math.floor(Math.random() * 60) - 20;
    const scale = 1 + (level - 1) * 0.12;
    return {
      id: item.id,
      price: Math.max(40, Math.round((item.basePrice * scale + jitter) / 10) * 10),
    };
  });
}

function drawMineObject(g: Graphics, obj: MineObject, timeSec: number): void {
  const { kind, x, y, radius, rotation } = obj;

  if (kind === 'gold_small' || kind === 'gold_medium' || kind === 'gold_large') {
    const pts: number[] = [];
    const lobes = 7;
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2 + rotation;
      const r = radius * (0.82 + 0.22 * Math.sin(i * 2.4 + 1));
      pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.88);
    }
    g.poly(pts).fill(0xfacc15).stroke({ width: 3, color: 0xb45309 });
    g.circle(x - radius * 0.25, y - radius * 0.22, radius * 0.28).fill({ color: 0xfef08a, alpha: 0.75 });
    return;
  }

  if (kind === 'rock_small' || kind === 'rock_large') {
    const pts: number[] = [];
    const sides = 6;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + rotation;
      const r = radius * (0.85 + 0.16 * Math.cos(i * 1.9));
      pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85);
    }
    g.poly(pts).fill(0x78716c).stroke({ width: 3, color: 0x44403c });
    g.poly([
      x - radius * 0.4,
      y - radius * 0.35,
      x + radius * 0.1,
      y - radius * 0.45,
      x + radius * 0.25,
      y - radius * 0.1,
      x - radius * 0.25,
      y + radius * 0.05,
    ]).fill({ color: 0xa8a29e, alpha: 0.55 });
    return;
  }

  if (kind === 'diamond') {
    const pulse = 1 + Math.sin(timeSec * 5 + x) * 0.06;
    const r = radius * pulse;
    g.poly([
      x - r * 0.65,
      y - r * 0.45,
      x + r * 0.65,
      y - r * 0.45,
      x + r * 1.05,
      y - r * 0.05,
      x,
      y + r * 0.95,
      x - r * 1.05,
      y - r * 0.05,
    ])
      .fill(0x67e8f9)
      .stroke({ width: 2, color: 0x0891b2 });
    g.poly([x - r * 0.4, y - r * 0.4, x + r * 0.4, y - r * 0.4, x, y + r * 0.45]).fill({
      color: 0xffffff,
      alpha: 0.55,
    });
    return;
  }

  if (kind === 'mystery_bag') {
    g.circle(x, y + 4, radius * 0.85).fill(0xfde68a).stroke({ width: 2.5, color: 0x92400e });
    g.poly([x - 10, y - radius * 0.55, x + 10, y - radius * 0.55, x + 6, y - radius * 0.85, x - 6, y - radius * 0.85])
      .fill(0xf59e0b)
      .stroke({ width: 2, color: 0x92400e });
    // Red ? mark
    g.moveTo(x - 5.5, y - 3)
      .arc(x, y - 1, 6, Math.PI * 0.9, Math.PI * 2.15)
      .stroke({ width: 3.5, color: 0xdc2626 });
    g.circle(x, y + 11, 2.5).fill(0xdc2626);
    return;
  }

  if (kind === 'tnt') {
    const w = radius * 1.45;
    const h = radius * 1.7;
    g.roundRect(x - w / 2, y - h / 2, w, h, 7).fill(0xb45309).stroke({ width: 2.5, color: 0x78350f });
    g.rect(x - w / 2 + 2, y - 9, w - 4, 18).fill(0xfef3c7);
    g.rect(x - w / 2, y - h / 2 + 5, w, 4).fill(0x475569);
    g.rect(x - w / 2, y + h / 2 - 9, w, 4).fill(0x475569);
    return;
  }

  if (kind === 'mole_diamond') {
    const dir = obj.vx >= 0 ? 1 : -1;
    // Mole body
    g.ellipse(x, y + 2, radius * 0.9, radius * 0.68).fill(0x78350f).stroke({ width: 2, color: 0x451a03 });
    // Nose & eye
    g.circle(x + dir * radius * 0.72, y + 1, 4).fill(0xfda4af);
    g.circle(x + dir * radius * 0.38, y - 5, 2.5).fill(0x111827);
    // Carried diamond
    const dx = x + dir * radius * 0.65;
    const dy = y + 9;
    g.poly([dx - 7, dy - 4, dx + 7, dy - 4, dx + 10, dy, dx, dy + 8, dx - 10, dy])
      .fill(0x67e8f9)
      .stroke({ width: 1.5, color: 0x0891b2 });
    return;
  }

  if (kind === 'bone') {
    g.roundRect(x - 14, y - 4, 28, 8, 3).fill(0xf8fafc).stroke({ width: 1.5, color: 0x94a3b8 });
    g.circle(x - 14, y - 4, 4.5).fill(0xf8fafc);
    g.circle(x - 14, y + 4, 4.5).fill(0xf8fafc);
    g.circle(x + 14, y - 4, 4.5).fill(0xf8fafc);
    g.circle(x + 14, y + 4, 4.5).fill(0xf8fafc);
    return;
  }

  // skull
  g.circle(x, y - 2, radius * 0.72).fill(0xf8fafc).stroke({ width: 2, color: 0x475569 });
  g.roundRect(x - 8, y + 5, 16, 8, 3).fill(0xf8fafc).stroke({ width: 2, color: 0x475569 });
  g.circle(x - 5, y - 2, 3.2).fill(0x1e293b);
  g.circle(x + 5, y - 2, 3.2).fill(0x1e293b);
}

export function GoldMinerArena({
  players,
  mode,
  sessionKey,
  isGameOver,
  localPlayerId,
  onFinish,
}: GoldMinerArenaProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hudState, setHudState] = useState<GoldMinerHudStatePayload | null>(null);

  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const actionsRef = useRef<{
    dropHook: (playerId: string) => void;
    useDynamite: (playerId: string) => void;
    buyItem: (playerId: string, itemId: GoldMinerShopItemId) => void;
    nextLevelReady: (playerId: string) => void;
  } | null>(null);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    const activePlayers = players.filter((p) => !p.isTvScreen);
    const roster =
      activePlayers.length > 0
        ? activePlayers
        : [
            {
              id: localPlayerId || 'solo',
              name: 'Goldgräber',
              color: '#FACC15',
            } as Player,
          ];

    const saved = sessionKey ? goldMinerSessionSnapshots.get(sessionKey) : undefined;

    const miners: MinerRuntime[] = roster.map((p, idx) => {
      const prev = saved?.miners.find((m) => m.playerId === p.id);
      if (prev) {
        return {
          ...prev,
          name: p.name,
          color: p.color || prev.color,
          anchorX: ((idx + 1) / (roster.length + 1)) * LOGICAL_W,
        };
      }
      return {
        playerId: p.id,
        name: p.name,
        color: p.color || '#FACC15',
        anchorX: ((idx + 1) / (roster.length + 1)) * LOGICAL_W,
        anchorY: SURFACE_Y - 12,
        angle: (idx % 2 === 0 ? -1 : 1) * 0.45,
        angleDir: idx % 2 === 0 ? 1 : -1,
        hookState: 'swing',
        hookLength: 36,
        carryingId: null,
        money: 0,
        dynamite: 2,
        hasStrength: false,
        hasClover: false,
        hasRockBook: false,
        hasDiamondPolish: false,
        readyForNextLevel: false,
        winchSpin: 0,
      };
    });

    let level = saved?.level ?? 1;
    let timeLeft = saved?.timeLeft ?? 60;
    let targetMoney = saved?.targetMoney ?? getGoldMinerLevelTarget(level, miners.length, mode);
    let phase: 'playing' | 'shop' | 'gameover' = saved?.phase ?? 'playing';
    let objects: MineObject[] = saved ? saved.objects.map((o) => ({ ...o })) : generateLevelObjects(level);
    let shopOffers = saved?.shopOffers ?? generateShopOffers(level);
    const popups: FloatingPopup[] = [];
    const explosions: ExplosionEffect[] = [];
    let shakeTime = 0;
    let finishedEmitted = false;
    let totalTimeSec = 0;

    const triggerExplosion = (cx: number, cy: number, radius = 145) => {
      goldMinerAudio.playExplosion();
      shakeTime = 0.35;
      explosions.push({ x: cx, y: cy, radius, ttl: 0.45 });
      popups.push({ x: cx, y: cy - 20, text: 'BOOM!', color: 0xf97316, ttl: 1.0 });

      for (const obj of objects) {
        if (!obj.alive) continue;
        if (Math.hypot(obj.x - cx, obj.y - cy) <= radius) {
          obj.alive = false;
          if (obj.kind === 'tnt') {
            triggerExplosion(obj.x, obj.y, 130);
          }
        }
      }
    };

    const startNextLevel = () => {
      level += 1;
      timeLeft = 60;
      targetMoney = getGoldMinerLevelTarget(level, miners.length, mode);
      phase = 'playing';
      objects = generateLevelObjects(level);
      for (const m of miners) {
        m.hookState = 'swing';
        m.hookLength = 36;
        m.carryingId = null;
        m.hasStrength = false;
        m.hasClover = false;
        m.hasRockBook = false;
        m.hasDiamondPolish = false;
        m.readyForNextLevel = false;
      }
    };

    const buildHudSnapshot = (): GoldMinerHudStatePayload => {
      const playersRecord: Record<string, GoldMinerPlayerHudState> = {};
      let teamMoney = 0;
      for (const m of miners) {
        teamMoney += m.money;
        const carriedObj = m.carryingId ? objects.find((o) => o.id === m.carryingId) : null;
        playersRecord[m.playerId] = {
          playerId: m.playerId,
          name: m.name,
          color: m.color,
          money: m.money,
          dynamite: m.dynamite,
          hasStrength: m.hasStrength,
          hasClover: m.hasClover,
          hasRockBook: m.hasRockBook,
          hasDiamondPolish: m.hasDiamondPolish,
          hookState: m.hookState,
          carryingKind: carriedObj?.kind ?? null,
          readyForNextLevel: m.readyForNextLevel,
        };
      }
      return {
        level,
        timeLeft: Math.max(0, Math.round(timeLeft)),
        targetMoney,
        teamMoney,
        phase,
        mode,
        paused: pausedRef.current,
        shopOffers,
        players: playersRecord,
      };
    };

    actionsRef.current = {
      dropHook: (playerId: string) => {
        if (phase !== 'playing' || pausedRef.current) return;
        const m = miners.find((p) => p.playerId === playerId);
        if (!m || m.hookState !== 'swing') return;
        m.hookState = 'extend';
        goldMinerAudio.playDrop();
      },
      useDynamite: (playerId: string) => {
        if (phase !== 'playing' || pausedRef.current) return;
        const m = miners.find((p) => p.playerId === playerId);
        if (!m || m.hookState !== 'retract' || !m.carryingId || m.dynamite <= 0) return;
        m.dynamite -= 1;
        const obj = objects.find((o) => o.id === m.carryingId);
        if (obj) {
          obj.alive = false;
          triggerExplosion(obj.x, obj.y, 95);
        }
        m.carryingId = null;
      },
      buyItem: (playerId: string, itemId: GoldMinerShopItemId) => {
        if (phase !== 'shop') return;
        const m = miners.find((p) => p.playerId === playerId);
        const offer = shopOffers.find((o) => o.id === itemId);
        if (!m || !offer || m.money < offer.price) return;
        if (itemId === 'strength' && m.hasStrength) return;
        if (itemId === 'clover' && m.hasClover) return;
        if (itemId === 'rock_book' && m.hasRockBook) return;
        if (itemId === 'diamond_polish' && m.hasDiamondPolish) return;

        m.money -= offer.price;
        if (itemId === 'dynamite') m.dynamite += 1;
        if (itemId === 'strength') m.hasStrength = true;
        if (itemId === 'clover') m.hasClover = true;
        if (itemId === 'rock_book') m.hasRockBook = true;
        if (itemId === 'diamond_polish') m.hasDiamondPolish = true;
        goldMinerAudio.playCollect(300);
        setHudState(buildHudSnapshot());
      },
      nextLevelReady: (playerId: string) => {
        if (phase !== 'shop') return;
        const m = miners.find((p) => p.playerId === playerId);
        if (m) m.readyForNextLevel = true;
        const allReady = miners.every((p) => p.readyForNextLevel);
        if (allReady || miners.length === 1) {
          startNextLevel();
        }
        setHudState(buildHudSnapshot());
      },
    };

    const unsubInput = socketService.onGoldMinerInput(({ playerId, input }) => {
      if (input.dropHook) actionsRef.current?.dropHook(playerId);
      if (input.useDynamite) actionsRef.current?.useDynamite(playerId);
      if (input.buyItemId) actionsRef.current?.buyItem(playerId, input.buyItemId);
      if (input.nextLevelReady) actionsRef.current?.nextLevelReady(playerId);
      if (input.togglePause) setPaused((prev) => !prev);
    });

    const app = new Application();
    let destroyed = false;
    let stateSyncAccum = 0;

    (async () => {
      await app.init({
        resizeTo: host,
        antialias: true,
        backgroundColor: 0x7d563b,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      if (destroyed) {
        app.destroy(true);
        return;
      }
      host.innerHTML = '';
      host.appendChild(app.canvas);

      const root = new Container();
      app.stage.addChild(root);

      // Static background layers (orange header + 3-tone curved brown earth)
      const bgLayer = new Graphics();
      root.addChild(bgLayer);

      const objectsLayer = new Graphics();
      const tntLabelsLayer = new Container();
      const hooksLayer = new Graphics();
      const minersLayer = new Graphics();
      const fxLayer = new Graphics();
      const popupsLayer = new Container();

      root.addChild(objectsLayer);
      root.addChild(tntLabelsLayer);
      root.addChild(hooksLayer);
      root.addChild(minersLayer);
      root.addChild(fxLayer);
      root.addChild(popupsLayer);

      // Draw static background once
      bgLayer.rect(0, 0, LOGICAL_W, SURFACE_Y).fill(0xff9f0a);
      bgLayer.rect(0, SURFACE_Y - 6, LOGICAL_W, 8).fill(0xc2410c);

      // Earth base + curved strata matching screenshot
      bgLayer.rect(0, SURFACE_Y, LOGICAL_W, LOGICAL_H - SURFACE_Y).fill(0xa37b5c);
      bgLayer
        .moveTo(0, SURFACE_Y + 92)
        .bezierCurveTo(320, SURFACE_Y + 128, 620, SURFACE_Y + 62, 920, SURFACE_Y + 105)
        .bezierCurveTo(1080, SURFACE_Y + 125, 1190, SURFACE_Y + 80, LOGICAL_W, SURFACE_Y + 72)
        .lineTo(LOGICAL_W, LOGICAL_H)
        .lineTo(0, LOGICAL_H)
        .closePath()
        .fill(0x80573a);
      bgLayer
        .moveTo(0, LOGICAL_H - 135)
        .bezierCurveTo(280, LOGICAL_H - 180, 650, LOGICAL_H - 95, 990, LOGICAL_H - 130)
        .bezierCurveTo(1140, LOGICAL_H - 145, 1220, LOGICAL_H - 195, LOGICAL_W, LOGICAL_H - 220)
        .lineTo(LOGICAL_W, LOGICAL_H)
        .lineTo(0, LOGICAL_H)
        .closePath()
        .fill(0x986f52);

      // Blue domes behind each miner
      for (const m of miners) {
        bgLayer
          .moveTo(m.anchorX - 78, SURFACE_Y - 4)
          .arc(m.anchorX, SURFACE_Y - 4, 78, Math.PI, 0)
          .closePath()
          .fill(0x1d358a);
      }

      setHudState(buildHudSnapshot());

      const tntLabelById = new Map<string, Text>();
      const popupTextByRef = new Map<(typeof popups)[number], Text>();

      app.ticker.add((ticker) => {
        if (destroyed) return;
        const dt = Math.min(ticker.deltaMS / 1000, 0.05);
        totalTimeSec += dt;

        // Fit 1280x720 stage cleanly into host
        const scale = Math.min(app.screen.width / LOGICAL_W, app.screen.height / LOGICAL_H);
        root.scale.set(scale);
        const offsetX = (app.screen.width - LOGICAL_W * scale) / 2;
        const offsetY = (app.screen.height - LOGICAL_H * scale) / 2;

        if (shakeTime > 0) {
          shakeTime = Math.max(0, shakeTime - dt);
          root.x = offsetX + (Math.random() - 0.5) * 14;
          root.y = offsetY + (Math.random() - 0.5) * 14;
        } else {
          root.x = offsetX;
          root.y = offsetY;
        }

        if (phase === 'playing' && !pausedRef.current && !isGameOver) {
          timeLeft -= dt;

          // Update moving moles
          for (const obj of objects) {
            if (!obj.alive || obj.vx === 0) continue;
            obj.x += obj.vx * dt;
            if (obj.x < 65) {
              obj.x = 65;
              obj.vx = Math.abs(obj.vx);
            } else if (obj.x > LOGICAL_W - 65) {
              obj.x = LOGICAL_W - 65;
              obj.vx = -Math.abs(obj.vx);
            }
          }

          // Update each miner's hook
          for (const m of miners) {
            if (m.hookState === 'swing') {
              m.angle += m.angleDir * 1.45 * dt;
              if (m.angle > 1.25) {
                m.angle = 1.25;
                m.angleDir = -1;
              } else if (m.angle < -1.25) {
                m.angle = -1.25;
                m.angleDir = 1;
              }
            } else if (m.hookState === 'extend') {
              m.hookLength += 540 * dt;
              m.winchSpin += dt * 10;
              const hx = m.anchorX + Math.sin(m.angle) * m.hookLength;
              const hy = m.anchorY + Math.cos(m.angle) * m.hookLength;

              // Boundary check
              if (hx < 20 || hx > LOGICAL_W - 20 || hy > LOGICAL_H - 18) {
                m.hookState = 'retract';
              } else {
                // Collision check
                for (const obj of objects) {
                  if (!obj.alive) continue;
                  if (Math.hypot(hx - obj.x, hy - obj.y) <= obj.radius + 10) {
                    if (obj.kind === 'tnt') {
                      obj.alive = false;
                      triggerExplosion(obj.x, obj.y, 150);
                      m.hookState = 'retract';
                      m.carryingId = null;
                    } else {
                      m.carryingId = obj.id;
                      m.hookState = 'retract';
                      obj.vx = 0; // Stop mole if grabbed
                      goldMinerAudio.playGrab(obj.kind);
                    }
                    break;
                  }
                }
              }
            } else if (m.hookState === 'retract') {
              const carried = m.carryingId ? objects.find((o) => o.id === m.carryingId) : null;
              let speed = 560;
              if (carried) {
                const weight = m.hasStrength ? Math.max(0.8, carried.weight * 0.45) : carried.weight;
                speed = Math.max(95, 520 / weight);
              }
              m.hookLength -= speed * dt;
              m.winchSpin -= dt * (carried ? 5 : 10);

              if (carried) {
                carried.x = m.anchorX + Math.sin(m.angle) * (m.hookLength + carried.radius * 0.45);
                carried.y = m.anchorY + Math.cos(m.angle) * (m.hookLength + carried.radius * 0.45);
              }

              if (m.hookLength <= 36) {
                m.hookLength = 36;
                m.hookState = 'swing';
                if (carried) {
                  carried.alive = false;
                  m.carryingId = null;

                  let gain = carried.value;
                  let label = `+$${gain}`;
                  let color = 0xfacc15;

                  if (carried.kind === 'mystery_bag') {
                    const roll = Math.random();
                    if (roll < 0.25) {
                      m.dynamite += 1;
                      gain = 100;
                      label = '+1 DYNAMIT!';
                      color = 0xf87171;
                    } else if (roll < 0.45) {
                      timeLeft += 10;
                      gain = 120;
                      label = '+10s ZEIT!';
                      color = 0x4ade80;
                    } else {
                      gain = m.hasClover ? 550 : 250 + Math.floor(Math.random() * 350);
                      label = `+$${gain}`;
                    }
                  } else if ((carried.kind === 'rock_small' || carried.kind === 'rock_large') && m.hasRockBook) {
                    gain *= 3;
                    label = `+$${gain}`;
                  } else if ((carried.kind === 'diamond' || carried.kind === 'mole_diamond') && m.hasDiamondPolish) {
                    gain = Math.round(gain * 1.5);
                    label = `+$${gain}`;
                    color = 0x67e8f9;
                  }

                  m.money += gain;
                  goldMinerAudio.playCollect(gain);
                  popups.push({ x: m.anchorX, y: SURFACE_Y + 38, text: label, color, ttl: 1.15 });
                }
              }
            }
          }

          // Check level timer end
          const remainingAlive = objects.some(
            (o) => o.alive && (o.kind.startsWith('gold') || o.kind === 'diamond' || o.kind === 'mole_diamond' || o.kind === 'mystery_bag'),
          );
          if (timeLeft <= 0 || !remainingAlive) {
            timeLeft = 0;
            const totalTeamMoney = miners.reduce((acc, m) => acc + m.money, 0);
            const bestIndividual = Math.max(...miners.map((m) => m.money));
            const reached = mode === 'coop' ? totalTeamMoney >= targetMoney : bestIndividual >= targetMoney;

            if (reached) {
              goldMinerAudio.playLevelClear();
              phase = 'shop';
              shopOffers = generateShopOffers(level + 1);
            } else {
              phase = 'gameover';
              if (!finishedEmitted) {
                finishedEmitted = true;
                const scores: Record<string, number> = {};
                for (const m of miners) {
                  scores[m.playerId] = m.money;
                }
                onFinishRef.current({ level, scores });
              }
            }
          }
        }

        // Update popups & explosions
        for (let i = popups.length - 1; i >= 0; i--) {
          popups[i].y -= 36 * dt;
          popups[i].ttl -= dt;
          if (popups[i].ttl <= 0) popups.splice(i, 1);
        }
        for (let i = explosions.length - 1; i >= 0; i--) {
          explosions[i].ttl -= dt;
          if (explosions[i].ttl <= 0) explosions.splice(i, 1);
        }

        // Render objects
        objectsLayer.clear();
        const activeTntIds = new Set<string>();
        for (const obj of objects) {
          if (!obj.alive) continue;
          drawMineObject(objectsLayer, obj, totalTimeSec);
          if (obj.kind === 'tnt') {
            activeTntIds.add(obj.id);
            let label = tntLabelById.get(obj.id);
            if (!label) {
              label = new Text({
                text: 'TNT',
                style: {
                  fontFamily: 'Luckiest Guy, Fredoka, sans-serif',
                  fontSize: 13,
                  fill: 0xdc2626,
                  fontWeight: 'bold',
                },
              });
              label.anchor.set(0.5);
              tntLabelById.set(obj.id, label);
              tntLabelsLayer.addChild(label);
            }
            label.x = obj.x;
            label.y = obj.y;
          }
        }
        for (const [id, label] of tntLabelById.entries()) {
          if (!activeTntIds.has(id)) {
            tntLabelsLayer.removeChild(label);
            label.destroy();
            tntLabelById.delete(id);
          }
        }

        // Render miners & hooks
        hooksLayer.clear();
        minersLayer.clear();
        for (const m of miners) {
          const playerHex = parseHexColor(m.color);
          const mx = m.anchorX;
          const my = m.anchorY;

          // Miner body & hat
          minersLayer.roundRect(mx - 18, my - 38, 36, 26, 8).fill(playerHex).stroke({ width: 2, color: 0x1e293b });
          minersLayer.circle(mx, my - 52, 14).fill(0xfdba74).stroke({ width: 2, color: 0x7c2d12 });
          // Beard
          minersLayer
            .moveTo(mx + 12, my - 49)
            .arc(mx, my - 49, 12, 0, Math.PI)
            .closePath()
            .fill(0xe2e8f0);
          // Miner hat
          minersLayer
            .moveTo(mx - 15, my - 56)
            .arc(mx, my - 56, 15, Math.PI, 0)
            .closePath()
            .fill(0xf1f5f9)
            .stroke({ width: 2, color: 0x475569 });
          minersLayer.circle(mx, my - 64, 4).fill(0xfef08a);

          // Winch drum
          minersLayer.roundRect(mx - 20, my - 18, 40, 20, 5).fill(0x334155).stroke({ width: 2, color: 0x0f172a });
          const spokeX = mx + Math.cos(m.winchSpin) * 7;
          const spokeY = my - 8 + Math.sin(m.winchSpin) * 7;
          minersLayer.circle(spokeX, spokeY, 3).fill(0x94a3b8);

          // Rope & claw
          const hx = mx + Math.sin(m.angle) * m.hookLength;
          const hy = my + Math.cos(m.angle) * m.hookLength;
          hooksLayer.moveTo(mx, my).lineTo(hx, hy).stroke({ width: 3, color: 0x1e293b });

          // Claw prongs
          const openAngle = m.carryingId ? 0.35 : 0.72;
          const leftA = m.angle + Math.PI - openAngle;
          const rightA = m.angle + Math.PI + openAngle;
          hooksLayer
            .moveTo(hx, hy)
            .lineTo(hx + Math.sin(leftA) * 14, hy + Math.cos(leftA) * 14)
            .lineTo(hx + Math.sin(leftA - 0.5) * 20, hy + Math.cos(leftA - 0.5) * 20)
            .stroke({ width: 3.5, color: 0x475569 });
          hooksLayer
            .moveTo(hx, hy)
            .lineTo(hx + Math.sin(rightA) * 14, hy + Math.cos(rightA) * 14)
            .lineTo(hx + Math.sin(rightA + 0.5) * 20, hy + Math.cos(rightA + 0.5) * 20)
            .stroke({ width: 3.5, color: 0x475569 });
        }

        // Render explosions & floating popups
        fxLayer.clear();
        for (const ex of explosions) {
          const p = 1 - ex.ttl / 0.45;
          fxLayer.circle(ex.x, ex.y, ex.radius * (0.4 + p * 0.6)).fill({
            color: 0xf97316,
            alpha: (1 - p) * 0.55,
          });
          fxLayer.circle(ex.x, ex.y, ex.radius * 0.55 * (0.4 + p * 0.6)).fill({
            color: 0xfef08a,
            alpha: (1 - p) * 0.7,
          });
        }

        const activePopups = new Set(popups);
        for (const [popRef, txt] of popupTextByRef.entries()) {
          if (!activePopups.has(popRef)) {
            popupsLayer.removeChild(txt);
            txt.destroy();
            popupTextByRef.delete(popRef);
          }
        }
        for (const pop of popups) {
          let txt = popupTextByRef.get(pop);
          if (!txt) {
            txt = new Text({
              text: pop.text,
              style: {
                fontFamily: 'Luckiest Guy, Fredoka, sans-serif',
                fontSize: 30,
                fill: pop.color,
                stroke: { color: 0x000000, width: 5 },
              },
            });
            txt.anchor.set(0.5);
            popupTextByRef.set(pop, txt);
            popupsLayer.addChild(txt);
          }
          txt.x = pop.x;
          txt.y = pop.y;
          txt.alpha = Math.min(1, pop.ttl * 1.4);
        }

        // Sync HUD + Multiplayer state ~10 times per sec
        stateSyncAccum += dt;
        if (stateSyncAccum >= 0.1) {
          stateSyncAccum = 0;
          const snapshot = buildHudSnapshot();
          setHudState(snapshot);
          socketService.emitGoldMinerState(snapshot);
        }
      });
    })();

    return () => {
      if (sessionKey && phase !== 'gameover') {
        goldMinerSessionSnapshots.set(sessionKey, {
          level,
          timeLeft,
          targetMoney,
          phase,
          objects: objects.map((o) => ({ ...o })),
          shopOffers,
          miners: miners.map((m) => ({ ...m })),
        });
      } else if (sessionKey && phase === 'gameover') {
        goldMinerSessionSnapshots.delete(sessionKey);
      }
      destroyed = true;
      unsubInput();
      app.destroy(true);
    };
  }, [players, mode, sessionKey, isGameOver, localPlayerId]);

  // Solo / Host keyboard controls
  useEffect(() => {
    if (!localPlayerId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        actionsRef.current?.dropHook(localPlayerId);
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyD' || e.code === 'KeyE') {
        e.preventDefault();
        actionsRef.current?.useDynamite(localPlayerId);
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        setPaused((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [localPlayerId]);

  const displayedMoney =
    hudState?.mode === 'versus'
      ? Math.max(0, ...Object.values(hudState?.players ?? {}).map((p) => p.money))
      : (hudState?.teamMoney ?? 0);

  const localMiner = localPlayerId ? hudState?.players[localPlayerId] : undefined;
  const totalDynamite = localMiner
    ? localMiner.dynamite
    : Object.values(hudState?.players ?? {}).reduce((s, p) => s + p.dynamite, 0);

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl bg-[#7D563B] shadow-2xl select-none"
      onPointerDown={() => {
        if (localPlayerId && hudState?.phase === 'playing') {
          actionsRef.current?.dropHook(localPlayerId);
        }
      }}
    >
      {/* PixiJS Canvas Mount */}
      <div ref={mountRef} className="h-full w-full" />

      {/* Top HUD Overlay (matches classic Gold Miner screenshot) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-4 py-2 sm:px-6 sm:py-3">
        {/* Left: Money & Target */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-goldminer text-2xl text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.8)] sm:text-3xl">
              $
            </span>
            <span className="font-goldminer text-2xl text-[#22C55E] drop-shadow-[0_2px_0_rgba(0,0,0,0.9)] sm:text-3xl">
              {displayedMoney}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl">🎯</span>
            <span className="font-goldminer text-xl text-[#FACC15] drop-shadow-[0_2px_0_rgba(0,0,0,0.9)] sm:text-2xl">
              {hudState?.targetMoney ?? 650}
            </span>
          </div>
        </div>

        {/* Right: Level, Dynamite, Timer, Pause/Mute */}
        <div className="pointer-events-auto flex items-center gap-3 sm:gap-5">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="font-goldminer text-lg text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.85)] sm:text-xl">
                Level
              </span>
              <span className="font-goldminer text-xl text-[#DC2626] drop-shadow-[0_2px_0_rgba(255,255,255,0.75)] sm:text-2xl">
                {hudState?.level ?? 1}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: Math.min(5, totalDynamite) }).map((_, idx) => (
                  <GiDynamite key={idx} className="h-5 w-5 text-red-600 drop-shadow" />
                ))}
              </div>
              <span className="font-goldminer text-xl text-[#DC2626] drop-shadow-[0_2px_0_rgba(255,255,255,0.75)] sm:text-2xl">
                ⏱ {hudState?.timeLeft ?? 60}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                goldMinerAudio.muted = !muted;
                setMuted(!muted);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-amber-900 bg-amber-500 text-white shadow active:scale-95"
              title="Ton an/aus"
            >
              {muted ? <GiSoundOff className="h-5 w-5" /> : <GiSoundOn className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-emerald-900 bg-[#16A34A] text-white shadow active:scale-95"
              title="Pause"
            >
              {paused ? <GiPlayButton className="h-5 w-5" /> : <GiPauseButton className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Solo / Host Dynamite Floating Button */}
      {localPlayerId && hudState?.phase === 'playing' && (
        <button
          type="button"
          disabled={!localMiner || localMiner.dynamite <= 0 || localMiner.hookState !== 'retract'}
          onPointerDown={(e) => {
            e.stopPropagation();
            actionsRef.current?.useDynamite(localPlayerId);
          }}
          className="font-goldminer absolute right-[max(1rem,calc(env(safe-area-inset-right,0px)+0.75rem))] bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] flex items-center gap-2 rounded-2xl border-b-4 border-red-900 bg-red-600 px-4 py-2.5 text-base text-white shadow-xl disabled:opacity-45"
        >
          <GiDynamite className="h-6 w-6" />
          Dynamit ({localMiner?.dynamite ?? 0})
        </button>
      )}

      {/* Between-Level Shop Overlay */}
      {hudState?.phase === 'shop' && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-2xl rounded-3xl border-4 border-[#B45309] bg-gradient-to-b from-[#FF9F0A] to-[#78350F] p-5 text-white shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-goldminer text-2xl text-amber-100 drop-shadow sm:text-3xl">
                Level {hudState.level} geschafft! Goldgräber-Shop
              </h2>
              {localMiner && (
                <span className="font-goldminer text-xl text-emerald-300">
                  ${localMiner.money}
                </span>
              )}
            </div>

            <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {hudState.shopOffers.map((offer) => {
                const spec = GOLD_MINER_SHOP_ITEMS.find((i) => i.id === offer.id);
                if (!spec) return null;
                const Icon =
                  offer.id === 'dynamite'
                    ? GiDynamite
                    : offer.id === 'strength'
                      ? GiMuscleUp
                      : offer.id === 'clover'
                        ? GiClover
                        : offer.id === 'rock_book'
                          ? GiSpellBook
                          : GiDiamondHard;
                const alreadyOwned = Boolean(
                  localMiner &&
                    ((offer.id === 'strength' && localMiner.hasStrength) ||
                      (offer.id === 'clover' && localMiner.hasClover) ||
                      (offer.id === 'rock_book' && localMiner.hasRockBook) ||
                      (offer.id === 'diamond_polish' && localMiner.hasDiamondPolish))
                );
                const canClick = Boolean(
                  localPlayerId && localMiner && !alreadyOwned && localMiner.money >= offer.price
                );

                return (
                  <button
                    key={offer.id}
                    type="button"
                    disabled={!localPlayerId || !canClick}
                    onClick={() => localPlayerId && actionsRef.current?.buyItem(localPlayerId, offer.id)}
                    className="flex items-center justify-between rounded-2xl border-2 border-amber-300/60 bg-amber-950/75 p-3 text-left transition enabled:hover:bg-amber-900/90 disabled:opacity-70"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-8 w-8 shrink-0 text-amber-300" />
                      <div>
                        <div className="font-bold text-white">{spec.name}</div>
                        <div className="text-xs text-amber-200/80">{spec.description}</div>
                      </div>
                    </div>
                    <span className="font-goldminer text-lg text-yellow-300">
                      {alreadyOwned ? 'Aktiv' : `$${offer.price}`}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-amber-100/90">
                {localPlayerId
                  ? 'Kaufe Upgrades oder starte direkt ins nächste Level!'
                  : 'Spieler können jetzt am Smartphone im Shop einkaufen.'}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (localPlayerId) {
                    actionsRef.current?.nextLevelReady(localPlayerId);
                  } else {
                    for (const pid of Object.keys(hudState.players)) {
                      actionsRef.current?.nextLevelReady(pid);
                    }
                  }
                }}
                className="font-goldminer shrink-0 rounded-2xl border-b-4 border-emerald-900 bg-emerald-500 px-6 py-3 text-lg text-white shadow-lg active:translate-y-0.5"
              >
                Nächstes Level →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
