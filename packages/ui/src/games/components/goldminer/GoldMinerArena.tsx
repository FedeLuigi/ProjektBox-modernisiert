import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import confetti from 'canvas-confetti';
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
  GOLD_MINER_SHOP_ITEMS,
  getGoldMinerItemValue,
  getGoldMinerLevelTarget,
  getGoldMinerRetractSpeed,
  rollMysteryBagReward,
} from '@projektbox/shared/utils';
import { socketService } from '../../../services/socket';
import { goldMinerAudio } from './goldMinerAudio';
import backdropUrl from '../../../assets/textures/goldminer/mine_backdrop.jpg';
import {
  MINE_LOGICAL_H,
  MINE_LOGICAL_W,
  MINE_SURFACE_Y,
  generateGoldMinerLevel,
  type MineObject,
} from './goldMinerLevelGen';
import { evaluateGoldMinerBotAction } from './goldMinerBotAi';
import {
  GoldMinerNameplatePool,
  GoldMinerPopupPool,
  GoldMinerRigPool,
  buildMineDeck,
  createMineObjectGraphic,
  loadGoldMinerTextures,
  type ExplosionEffect,
  type FloatingPopup,
  type LoadedMineTextures,
  type SparkParticle,
} from './goldMinerRenderer';

interface GoldMinerArenaProps {
  players: Player[];
  mode: GoldMinerMode;
  sessionKey?: string;
  isGameOver: boolean;
  localPlayerId?: string;
  onFinish: (payload: { level: number; scores: Record<string, number> }) => void;
}

interface MinerRuntime {
  playerId: string;
  name: string;
  color: string;
  isBot: boolean;
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
  botCooldown: number;
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

const LEVEL_DURATION_SEC = 60;
const HOOK_BASE_LENGTH = 36;
const HOOK_EXTEND_SPEED = 690;
const HOOK_SWING_SPEED = 1.62;
const HOOK_ANGLE_LIMIT = 1.24;
const TNT_BLAST_RADIUS = 135;

const SHOP_ICONS: Record<GoldMinerShopItemId, typeof GiDynamite> = {
  dynamite: GiDynamite,
  strength: GiMuscleUp,
  clover: GiClover,
  rock_book: GiSpellBook,
  diamond_polish: GiDiamondHard,
};

function generateShopOffers(level: number): Array<{ id: GoldMinerShopItemId; price: number }> {
  const mult = 1 + (level - 1) * 0.14;
  return GOLD_MINER_SHOP_ITEMS.map((item) => ({
    id: item.id,
    price: Math.round((item.basePrice * mult) / 10) * 10,
  }));
}

export function GoldMinerArena({
  players,
  mode,
  sessionKey = 'default',
  isGameOver,
  localPlayerId,
  onFinish,
}: GoldMinerArenaProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<GoldMinerHudStatePayload | null>(null);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);

  const playersRef = useRef(players);
  playersRef.current = players;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const isGameOverRef = useRef(isGameOver);
  isGameOverRef.current = isGameOver;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const actionsRef = useRef<{
    dropHook: (playerId: string) => void;
    useDynamite: (playerId: string) => void;
    buyItem: (playerId: string, itemId: GoldMinerShopItemId) => void;
    nextLevelReady: (playerId: string) => void;
  } | null>(null);

  useEffect(() => {
    goldMinerAudio.muted = muted;
  }, [muted]);

  useEffect(() => {
    const hostEl = hostRef.current;
    if (!hostEl) return;

    let destroyed = false;
    let app: Application | null = null;
    const saved = goldMinerSessionSnapshots.get(sessionKey);

    const activePlayers = playersRef.current.length > 0 ? playersRef.current : [];
    const buildMiners = (): MinerRuntime[] => {
      const count = Math.max(1, activePlayers.length);
      return activePlayers.map((p, idx) => {
        const slotX = ((idx + 1) / (count + 1)) * MINE_LOGICAL_W;
        return {
          playerId: p.id,
          name: p.name,
          color: p.color || '#FACC15',
          isBot: Boolean(p.isBot),
          anchorX: slotX,
          anchorY: MINE_SURFACE_Y - 12,
          angle: ((idx % 2 === 0 ? -1 : 1) * 0.35) % HOOK_ANGLE_LIMIT,
          angleDir: idx % 2 === 0 ? 1 : -1,
          hookState: 'swing',
          hookLength: HOOK_BASE_LENGTH,
          carryingId: null,
          money: 0,
          dynamite: 1,
          hasStrength: false,
          hasClover: false,
          hasRockBook: false,
          hasDiamondPolish: false,
          readyForNextLevel: false,
          winchSpin: 0,
          botCooldown: 0.25 + idx * 0.08,
        };
      });
    };

    const sim = {
      level: saved?.level ?? 1,
      timeLeft: saved?.timeLeft ?? LEVEL_DURATION_SEC,
      targetMoney:
        saved?.targetMoney ??
        getGoldMinerLevelTarget(1, Math.max(1, activePlayers.length), modeRef.current),
      phase: saved?.phase ?? ('playing' as 'playing' | 'shop' | 'gameover'),
      objects:
        saved?.objects.map((o) => ({ ...o })) ??
        generateGoldMinerLevel(1, Math.max(1, activePlayers.length)),
      shopOffers: saved?.shopOffers.map((s) => ({ ...s })) ?? generateShopOffers(1),
      miners: saved?.miners.map((m) => ({ ...m })) ?? buildMiners(),
      popups: [] as FloatingPopup[],
      explosions: [] as ExplosionEffect[],
      sparks: [] as SparkParticle[],
      shakeTime: 0,
      lastTickSecond: -1,
      finishEmitted: false,
    };

    const addPopup = (x: number, y: number, text: string, color = 0xfef08a) => {
      if (sim.popups.length >= 16) sim.popups.shift();
      sim.popups.push({ x, y, text, color, ttl: 1.25, maxTtl: 1.25 });
    };

    const addSparks = (x: number, y: number, color: number, count = 12) => {
      for (let i = 0; i < count; i++) {
        if (sim.sparks.length >= 90) sim.sparks.shift();
        const a = Math.random() * Math.PI * 2;
        const spd = 70 + Math.random() * 190;
        sim.sparks.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd - 35,
          color,
          size: 2.5 + Math.random() * 3,
          ttl: 0.45 + Math.random() * 0.25,
          maxTtl: 0.7,
        });
      }
    };

    const buildHudPayload = (): GoldMinerHudStatePayload => {
      const playersMap: Record<string, GoldMinerPlayerHudState> = {};
      let teamMoney = 0;
      for (const m of sim.miners) {
        teamMoney += m.money;
        const carriedObj = m.carryingId
          ? sim.objects.find((o) => o.id === m.carryingId)
          : null;
        playersMap[m.playerId] = {
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
        level: sim.level,
        timeLeft: sim.timeLeft,
        targetMoney: sim.targetMoney,
        teamMoney,
        phase: sim.phase,
        mode: modeRef.current,
        paused: pausedRef.current,
        shopOffers: sim.shopOffers,
        players: playersMap,
      };
    };

    const syncHud = (emitSocket = false) => {
      const payload = buildHudPayload();
      setHud(payload);
      if (emitSocket) {
        socketService.emitGoldMinerState(payload);
      }
    };

    let objectLayer: Container | null = null;
    const objectViews = new Map<string, Container>();
    let loadedTextures: LoadedMineTextures = {
      gold: null,
      rock: null,
      diamond: null,
      wood: null,
      minerWinch: null,
      hookClaw: null,
      moleDiamond: null,
    };

    const rebuildObjectViews = () => {
      if (!objectLayer) return;
      objectLayer.removeChildren();
      objectViews.clear();
      for (const obj of sim.objects) {
        if (!obj.alive) continue;
        const view = createMineObjectGraphic(obj, loadedTextures);
        objectLayer.addChild(view);
        objectViews.set(obj.id, view);
      }
    };

    const triggerTntExplosion = (cx: number, cy: number, owner: MinerRuntime) => {
      goldMinerAudio.playExplosion();
      sim.explosions.push({ x: cx, y: cy, radius: TNT_BLAST_RADIUS, ttl: 0.42, maxTtl: 0.42 });
      sim.shakeTime = 0.3;
      addSparks(cx, cy, 0xf97316, 22);
      addPopup(cx, cy - 18, 'BOOM!', 0xfef08a);

      for (const obj of sim.objects) {
        if (!obj.alive) continue;
        if (Math.hypot(obj.x - cx, obj.y - cy) <= TNT_BLAST_RADIUS + obj.radius * 0.45) {
          obj.alive = false;
          const view = objectViews.get(obj.id);
          if (view) view.visible = false;
          if (obj.kind === 'diamond' || obj.kind.startsWith('gold_')) {
            const bonus = Math.round(obj.value * 0.35);
            owner.money += bonus;
            if (bonus > 0) addPopup(obj.x, obj.y, `+$${bonus}`, 0xfde047);
          }
        }
      }
    };

    const advanceToNextLevel = () => {
      sim.level += 1;
      sim.timeLeft = LEVEL_DURATION_SEC;
      sim.targetMoney = getGoldMinerLevelTarget(
        sim.level,
        Math.max(1, sim.miners.length),
        modeRef.current
      );
      sim.phase = 'playing';
      sim.objects = generateGoldMinerLevel(sim.level, Math.max(1, sim.miners.length));
      sim.lastTickSecond = -1;
      for (const m of sim.miners) {
        m.hookState = 'swing';
        m.hookLength = HOOK_BASE_LENGTH;
        m.carryingId = null;
        m.readyForNextLevel = false;
      }
      rebuildObjectViews();
      syncHud(true);
    };

    actionsRef.current = {
      dropHook: (playerId: string) => {
        if (pausedRef.current || sim.phase !== 'playing' || isGameOverRef.current) return;
        const m = sim.miners.find((x) => x.playerId === playerId);
        if (!m || m.hookState !== 'swing') return;
        m.hookState = 'extend';
        goldMinerAudio.playDrop();
        syncHud(true);
      },
      useDynamite: (playerId: string) => {
        if (pausedRef.current || sim.phase !== 'playing' || isGameOverRef.current) return;
        const m = sim.miners.find((x) => x.playerId === playerId);
        if (!m || m.hookState !== 'retract' || !m.carryingId || m.dynamite <= 0) return;

        const carried = sim.objects.find((o) => o.id === m.carryingId);
        m.dynamite -= 1;
        m.carryingId = null;
        if (carried) {
          carried.alive = false;
          const view = objectViews.get(carried.id);
          if (view) view.visible = false;
          sim.explosions.push({
            x: carried.x,
            y: carried.y,
            radius: 56,
            ttl: 0.35,
            maxTtl: 0.35,
          });
          addSparks(carried.x, carried.y, 0xef4444, 16);
          addPopup(carried.x, carried.y, 'GESPRENGT!', 0xf87171);
        }
        sim.shakeTime = 0.22;
        goldMinerAudio.playExplosion();
        syncHud(true);
      },
      buyItem: (playerId: string, itemId: GoldMinerShopItemId) => {
        if (sim.phase !== 'shop') return;
        const m = sim.miners.find((x) => x.playerId === playerId);
        const offer = sim.shopOffers.find((o) => o.id === itemId);
        if (!m || !offer || m.money < offer.price) return;

        if (itemId === 'dynamite') {
          m.money -= offer.price;
          m.dynamite += 1;
        } else if (itemId === 'strength' && !m.hasStrength) {
          m.money -= offer.price;
          m.hasStrength = true;
        } else if (itemId === 'clover' && !m.hasClover) {
          m.money -= offer.price;
          m.hasClover = true;
        } else if (itemId === 'rock_book' && !m.hasRockBook) {
          m.money -= offer.price;
          m.hasRockBook = true;
        } else if (itemId === 'diamond_polish' && !m.hasDiamondPolish) {
          m.money -= offer.price;
          m.hasDiamondPolish = true;
        } else {
          return;
        }
        goldMinerAudio.playBuy();
        syncHud(true);
      },
      nextLevelReady: (playerId: string) => {
        if (sim.phase !== 'shop') return;
        const m = sim.miners.find((x) => x.playerId === playerId);
        if (!m) return;
        m.readyForNextLevel = true;
        const allHumansReady = sim.miners
          .filter((x) => !x.isBot)
          .every((x) => x.readyForNextLevel);
        if (allHumansReady) {
          advanceToNextLevel();
        } else {
          syncHud(true);
        }
      },
    };

    const unsubInput = socketService.onGoldMinerInput(({ playerId, input }) => {
      if (!actionsRef.current) return;
      if (input.togglePause) {
        setPaused((prev) => !prev);
        return;
      }
      if (input.dropHook) actionsRef.current.dropHook(playerId);
      if (input.useDynamite) actionsRef.current.useDynamite(playerId);
      if (input.buyItemId) actionsRef.current.buyItem(playerId, input.buyItemId);
      if (input.nextLevelReady) actionsRef.current.nextLevelReady(playerId);
    });

    (async () => {
      const [pixiApp, textures] = await Promise.all([
        (async () => {
          const instance = new Application();
          await instance.init({
            width: MINE_LOGICAL_W,
            height: MINE_LOGICAL_H,
            backgroundAlpha: 0,
            antialias: true,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
            autoDensity: true,
          });
          return instance;
        })(),
        loadGoldMinerTextures(),
      ]);

      if (destroyed) {
        pixiApp.destroy(true, { children: true });
        return;
      }

      app = pixiApp;
      loadedTextures = textures;
      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';
      app.canvas.style.objectFit = 'contain';
      app.canvas.style.display = 'block';
      hostEl.appendChild(app.canvas);

      const worldLayer = new Container();
      const backdropLayer = new Container();
      objectLayer = new Container();
      const rigLayer = new Container();
      const fxGraphics = new Graphics();
      const nameplateLayer = new Container();
      const popupLayer = new Container();

      buildMineDeck(backdropLayer, loadedTextures.wood);
      worldLayer.addChild(
        backdropLayer,
        objectLayer,
        rigLayer,
        fxGraphics,
        nameplateLayer,
        popupLayer
      );
      app.stage.addChild(worldLayer);

      const rigPool = new GoldMinerRigPool(rigLayer, loadedTextures, 8);
      const nameplatePool = new GoldMinerNameplatePool(nameplateLayer, 8);
      const popupPool = new GoldMinerPopupPool(popupLayer, 16);
      rebuildObjectViews();
      syncHud(true);

      let hudEmitAccum = 0;

      app.ticker.add((ticker) => {
        if (destroyed || isGameOverRef.current) return;
        const dt = Math.min(0.05, ticker.deltaMS / 1000);

        if (pausedRef.current) {
          return;
        }

        // Camera shake on TNT/dynamite
        if (sim.shakeTime > 0) {
          sim.shakeTime = Math.max(0, sim.shakeTime - dt);
          const mag = (sim.shakeTime / 0.3) * 9;
          worldLayer.x = (Math.random() - 0.5) * mag * 2;
          worldLayer.y = (Math.random() - 0.5) * mag * 2;
        } else {
          worldLayer.x = 0;
          worldLayer.y = 0;
        }

        if (sim.phase === 'playing') {
          sim.timeLeft = Math.max(0, sim.timeLeft - dt);

          // Urgent last-10s audio tick
          const secLeft = Math.ceil(sim.timeLeft);
          if (secLeft <= 10 && secLeft > 0 && secLeft !== sim.lastTickSecond) {
            sim.lastTickSecond = secLeft;
            goldMinerAudio.playTick(secLeft <= 3);
          }

          // Move diamond moles with lively walk-cycle bounce, tilt, squash-and-stretch & dust
          const walkClock = performance.now() * 0.011;
          for (let idx = 0; idx < sim.objects.length; idx++) {
            const obj = sim.objects[idx];
            if (!obj.alive || obj.vx === 0) continue;
            const isCarried = sim.miners.some((m) => m.carryingId === obj.id);
            if (isCarried) continue;
            obj.x += obj.vx * dt;
            if (obj.x < 72 || obj.x > MINE_LOGICAL_W - 72) {
              obj.vx = -obj.vx;
              obj.x = Math.max(72, Math.min(MINE_LOGICAL_W - 72, obj.x));
            }
            const view = objectViews.get(obj.id);
            if (view) {
              const phase = walkClock + idx * 1.3;
              const dir = obj.vx >= 0 ? 1 : -1;
              view.x = obj.x;
              view.y = obj.y - Math.abs(Math.sin(phase)) * 5.5;
              view.rotation = Math.sin(phase) * 0.1;
              const stretch = Math.sin(phase * 2) * 0.055;
              view.scale.set(dir * (1 - stretch), 1 + stretch);
              if (Math.random() < dt * 7) {
                addSparks(obj.x - dir * 10, obj.y + 14, 0x9a7255, 1);
              }
            }
          }

          // Update each miner & hook
          for (const m of sim.miners) {
            // Bot decision loop
            if (m.isBot && actionsRef.current) {
              m.botCooldown -= dt;
              if (m.botCooldown <= 0) {
                m.botCooldown = 0.14;
                const decision = evaluateGoldMinerBotAction(m, sim.objects);
                if (decision.useDynamite) {
                  actionsRef.current.useDynamite(m.playerId);
                } else if (decision.dropHook) {
                  actionsRef.current.dropHook(m.playerId);
                }
              }
            }

            if (m.hookState === 'swing') {
              m.angle += m.angleDir * HOOK_SWING_SPEED * dt;
              if (m.angle >= HOOK_ANGLE_LIMIT) {
                m.angle = HOOK_ANGLE_LIMIT;
                m.angleDir = -1;
              } else if (m.angle <= -HOOK_ANGLE_LIMIT) {
                m.angle = -HOOK_ANGLE_LIMIT;
                m.angleDir = 1;
              }
            } else if (m.hookState === 'extend') {
              m.hookLength += HOOK_EXTEND_SPEED * dt;
              m.winchSpin += 9 * dt;
              const tipX = m.anchorX + Math.sin(m.angle) * m.hookLength;
              const tipY = m.anchorY + Math.cos(m.angle) * m.hookLength;

              if (tipX <= 16 || tipX >= MINE_LOGICAL_W - 16 || tipY >= MINE_LOGICAL_H - 12) {
                m.hookState = 'retract';
              } else {
                for (const obj of sim.objects) {
                  if (!obj.alive) continue;
                  const alreadyCarried = sim.miners.some((other) => other.carryingId === obj.id);
                  if (alreadyCarried) continue;
                  if (Math.hypot(obj.x - tipX, obj.y - tipY) <= obj.radius + 9) {
                    if (obj.kind === 'tnt') {
                      triggerTntExplosion(obj.x, obj.y, m);
                      m.hookState = 'retract';
                    } else {
                      m.carryingId = obj.id;
                      m.hookState = 'retract';
                      goldMinerAudio.playGrab(obj.kind);
                      addSparks(obj.x, obj.y, obj.kind === 'diamond' ? 0x38bdf8 : 0xfacc15, 8);
                    }
                    break;
                  }
                }
              }
            } else if (m.hookState === 'retract') {
              const carried = m.carryingId
                ? sim.objects.find((o) => o.id === m.carryingId)
                : null;
              const speed = getGoldMinerRetractSpeed(carried?.weight, m.hasStrength);
              m.hookLength -= speed * dt;
              m.winchSpin -= (speed / 55) * dt;

              if (carried && carried.alive) {
                carried.x = m.anchorX + Math.sin(m.angle) * (m.hookLength + carried.radius * 0.5);
                carried.y = m.anchorY + Math.cos(m.angle) * (m.hookLength + carried.radius * 0.5);
                const view = objectViews.get(carried.id);
                if (view) {
                  view.x = carried.x;
                  view.y = carried.y;
                }
              }

              if (m.hookLength <= HOOK_BASE_LENGTH) {
                m.hookLength = HOOK_BASE_LENGTH;
                m.hookState = 'swing';

                if (carried && carried.alive) {
                  carried.alive = false;
                  const view = objectViews.get(carried.id);
                  if (view) view.visible = false;

                  if (carried.kind === 'mystery_bag') {
                    const reward = rollMysteryBagReward(m.hasClover);
                    if (reward.kind === 'strength') m.hasStrength = true;
                    else if (reward.kind === 'dynamite') m.dynamite += reward.amount;
                    else m.money += reward.amount;
                    addPopup(m.anchorX, m.anchorY + 26, reward.label, 0xfef08a);
                    goldMinerAudio.playCollect(reward.amount || 350);
                  } else {
                    const earned = getGoldMinerItemValue(carried.kind, carried.value, {
                      hasRockBook: m.hasRockBook,
                      hasDiamondPolish: m.hasDiamondPolish,
                    });
                    m.money += earned;
                    addPopup(
                      m.anchorX,
                      m.anchorY + 26,
                      `+$${earned}`,
                      carried.kind === 'diamond' || carried.kind === 'mole_diamond'
                        ? 0x38bdf8
                        : 0x4ade80
                    );
                    goldMinerAudio.playCollect(earned);
                  }
                }
                m.carryingId = null;
                syncHud(true);
              }
            }
          }

          // Check level completion (timer reached 0 OR all high-value treasures cleared)
          const anyValuableLeft = sim.objects.some(
            (o) =>
              o.alive &&
              (o.kind.startsWith('gold_') ||
                o.kind === 'diamond' ||
                o.kind === 'mole_diamond' ||
                o.kind === 'mystery_bag')
          );

          if (sim.timeLeft <= 0 || !anyValuableLeft) {
            const totalMoney = sim.miners.reduce((sum, m) => sum + m.money, 0);
            const highestIndividual = sim.miners.reduce((max, m) => Math.max(max, m.money), 0);
            const passed =
              modeRef.current === 'versus'
                ? highestIndividual >= sim.targetMoney
                : totalMoney >= sim.targetMoney;

            if (passed) {
              sim.phase = 'shop';
              sim.shopOffers = generateShopOffers(sim.level);
              for (const m of sim.miners) {
                m.hasStrength = false;
                m.hasRockBook = false;
                m.hasDiamondPolish = false;
                m.readyForNextLevel = m.isBot;
              }
              goldMinerAudio.playLevelClear();
              confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
              syncHud(true);
            } else {
              sim.phase = 'gameover';
              syncHud(true);
              if (!sim.finishEmitted) {
                sim.finishEmitted = true;
                const scores: Record<string, number> = {};
                for (const m of sim.miners) scores[m.playerId] = m.money;
                onFinishRef.current({ level: sim.level, scores });
              }
            }
          }
        }

        // Update popups, sparks, explosions
        for (let i = sim.popups.length - 1; i >= 0; i--) {
          sim.popups[i].ttl -= dt;
          sim.popups[i].y -= 36 * dt;
          if (sim.popups[i].ttl <= 0) sim.popups.splice(i, 1);
        }
        for (let i = sim.sparks.length - 1; i >= 0; i--) {
          const sp = sim.sparks[i];
          sp.ttl -= dt;
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          sp.vy += 260 * dt;
          if (sp.ttl <= 0) sim.sparks.splice(i, 1);
        }
        for (let i = sim.explosions.length - 1; i >= 0; i--) {
          sim.explosions[i].ttl -= dt;
          if (sim.explosions[i].ttl <= 0) sim.explosions.splice(i, 1);
        }

        // Draw dynamic layers
        rigPool.sync(sim.miners, sim.objects);
        nameplatePool.sync(sim.miners);
        fxGraphics.clear();
        for (const ex of sim.explosions) {
          const progress = 1 - ex.ttl / ex.maxTtl;
          const r = ex.radius * (0.35 + progress * 0.65);
          fxGraphics.circle(ex.x, ex.y, r).fill({ color: 0xf97316, alpha: (1 - progress) * 0.55 });
          fxGraphics.circle(ex.x, ex.y, r * 0.6).fill({
            color: 0xfef08a,
            alpha: (1 - progress) * 0.7,
          });
        }
        for (const sp of sim.sparks) {
          fxGraphics.circle(sp.x, sp.y, sp.size).fill({
            color: sp.color,
            alpha: Math.max(0, sp.ttl / sp.maxTtl),
          });
        }
        popupPool.sync(sim.popups);

        // Periodic HUD sync (every ~0.2s)
        hudEmitAccum += dt;
        if (hudEmitAccum >= 0.2) {
          hudEmitAccum = 0;
          syncHud(true);
        }
      });
    })();

    return () => {
      destroyed = true;
      unsubInput();
      goldMinerSessionSnapshots.set(sessionKey, {
        level: sim.level,
        timeLeft: sim.timeLeft,
        targetMoney: sim.targetMoney,
        phase: sim.phase,
        objects: sim.objects.map((o) => ({ ...o })),
        shopOffers: sim.shopOffers.map((s) => ({ ...s })),
        miners: sim.miners.map((m) => ({ ...m })),
      });
      if (app) {
        app.destroy(true, { children: true });
      }
    };
  }, [sessionKey]);

  // Solo / Host keyboard shortcuts
  useEffect(() => {
    if (!localPlayerId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        setPaused((prev) => !prev);
        return;
      }
      if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        actionsRef.current?.dropHook(localPlayerId);
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyE') {
        e.preventDefault();
        actionsRef.current?.useDynamite(localPlayerId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [localPlayerId]);

  const isCoop = mode !== 'versus';
  const displayedMoney = isCoop
    ? hud?.teamMoney ?? 0
    : localPlayerId
      ? hud?.players[localPlayerId]?.money ?? 0
      : hud?.teamMoney ?? 0;
  const targetMoney = hud?.targetMoney ?? 650;
  const progressPct = Math.min(100, Math.round((displayedMoney / Math.max(1, targetMoney)) * 100));
  const timeLeftSec = Math.ceil(hud?.timeLeft ?? LEVEL_DURATION_SEC);
  const localMiner = localPlayerId ? hud?.players[localPlayerId] : undefined;

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#1c0f06] select-none">
      {/* Full-bleed mining cavern backdrop (zero letterboxing on any aspect ratio) */}
      <img
        src={backdropUrl}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      {/* Transparent PixiJS Playfield */}
      <div
        ref={hostRef}
        onPointerDown={() => {
          if (localPlayerId && hud?.phase === 'playing' && !paused) {
            actionsRef.current?.dropHook(localPlayerId);
          }
        }}
        className="relative z-10 h-full w-full cursor-pointer"
      />

      {/* Floating Top-Left Timber/Gold Progress HUD (aligned font baselines) */}
      <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-3 rounded-2xl border-2 border-[#B45309]/85 bg-gradient-to-b from-[#451A03]/92 to-[#271003]/94 px-3.5 py-2 text-white shadow-[0_6px_16px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-goldminer text-sm tracking-wider text-amber-300 uppercase leading-none">
            LVL
          </span>
          <span className="font-goldminer text-xl text-amber-100 leading-none">
            {hud?.level ?? 1}
          </span>
        </div>

        <div className="h-5 w-px bg-amber-600/40" />

        <div className="flex items-center gap-2 leading-none">
          <span className="font-goldminer text-xl leading-none text-emerald-400 drop-shadow-[0_2px_0_rgba(0,0,0,0.85)]">
            ${displayedMoney}
          </span>
          <span className="font-goldminer text-sm leading-none text-amber-200/80">
            / ${targetMoney}
          </span>
          <div className="hidden h-2.5 w-24 overflow-hidden rounded-full bg-black/50 ring-1 ring-amber-500/30 sm:block">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Floating Top-Right Timer & Audio/Pause Controls (single bar, identical item height) */}
      <div className="absolute top-3 right-3 z-20 flex h-11 items-center gap-1 rounded-2xl border-2 border-[#B45309]/85 bg-gradient-to-b from-[#451A03]/92 to-[#271003]/94 px-3 text-white shadow-[0_6px_16px_rgba(0,0,0,0.45)]">
        <div
          className={`font-goldminer flex h-9 items-center justify-center px-2 text-lg leading-none tabular-nums ${
            timeLeftSec <= 10 ? 'animate-pulse text-red-400' : 'text-amber-200'
          }`}
        >
          <span className="translate-y-[1px]">{paused ? 'PAUSE' : `${timeLeftSec}s`}</span>
        </div>

        <div className="h-5 w-px bg-amber-600/40" />

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? 'Fortsetzen' : 'Pause'}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-amber-200 transition hover:bg-amber-900/50"
        >
          {paused ? <GiPlayButton className="h-5 w-5" /> : <GiPauseButton className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Ton einschalten' : 'Ton ausschalten'}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-amber-200 transition hover:bg-amber-900/50"
        >
          {muted ? <GiSoundOff className="h-5 w-5" /> : <GiSoundOn className="h-5 w-5" />}
        </button>
      </div>

      {/* Solo / Host Quick Dynamite Hint */}
      {localPlayerId && hud?.phase === 'playing' && localMiner && (
        <div className="pointer-events-none absolute right-4 bottom-3 z-20 flex items-center gap-2 rounded-xl bg-black/55 px-3 py-1.5 text-xs font-bold text-amber-100 backdrop-blur-sm">
          <span>[Leertaste / Klick] Haken</span>
          <span>•</span>
          <span className={localMiner.dynamite > 0 ? 'text-red-300' : 'text-stone-400'}>
            [W / E] Dynamit ({localMiner.dynamite})
          </span>
        </div>
      )}

      {/* Pause Overlay */}
      {paused && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-amber-500/70 bg-[#291306] px-10 py-7 text-center shadow-2xl">
            <h2 className="font-goldminer text-4xl text-amber-300">PAUSE</h2>
            <button
              type="button"
              onClick={() => setPaused(false)}
              className="font-goldminer flex items-center gap-2 rounded-2xl border-b-4 border-emerald-800 bg-emerald-500 px-7 py-3 text-xl text-white transition active:translate-y-0.5"
            >
              <GiPlayButton className="h-6 w-6" /> Weitergraben
            </button>
          </div>
        </div>
      )}

      {/* Between-Level Shop Overlay */}
      {hud?.phase === 'shop' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-3xl flex-col gap-4 rounded-3xl border-2 border-amber-500 bg-gradient-to-b from-[#451A03] to-[#271003] p-6 text-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-goldminer text-3xl text-amber-300">
                  Level {hud.level} geschafft!
                </h2>
                <p className="text-sm text-amber-200/80">
                  {localPlayerId
                    ? 'Wähle deine Upgrades für die nächste Tiefe:'
                    : 'Spieler kaufen auf ihren Smartphones ein...'}
                </p>
              </div>
              {localPlayerId && (
                <div className="font-goldminer text-2xl text-emerald-400">
                  Guthaben: ${localMiner?.money ?? 0}
                </div>
              )}
            </div>

            {/* Open shelf grid (zero Box-in-Box borders around items) */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {hud.shopOffers.map((offer) => {
                const spec = GOLD_MINER_SHOP_ITEMS.find((i) => i.id === offer.id);
                if (!spec) return null;
                const Icon = SHOP_ICONS[offer.id];
                const owned =
                  localMiner &&
                  ((offer.id === 'strength' && localMiner.hasStrength) ||
                    (offer.id === 'clover' && localMiner.hasClover) ||
                    (offer.id === 'rock_book' && localMiner.hasRockBook) ||
                    (offer.id === 'diamond_polish' && localMiner.hasDiamondPolish));
                const canBuy = Boolean(
                  localPlayerId && localMiner && localMiner.money >= offer.price && !owned
                );

                return (
                  <button
                    key={offer.id}
                    type="button"
                    disabled={!canBuy}
                    onClick={() => {
                      if (localPlayerId) actionsRef.current?.buyItem(localPlayerId, offer.id);
                    }}
                    className={`flex items-center justify-between gap-3 rounded-xl border-b border-amber-700/40 px-2 py-2.5 text-left transition ${
                      owned
                        ? 'text-emerald-300 opacity-85'
                        : canBuy
                          ? 'hover:bg-amber-900/40 active:scale-95'
                          : 'opacity-45'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Icon className="h-7 w-7 shrink-0 text-amber-300" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold leading-tight text-amber-50">
                          {spec.name}
                        </div>
                        <div className="line-clamp-2 text-xs leading-tight text-amber-200/75">
                          {spec.description}
                        </div>
                      </div>
                    </div>
                    <span className="font-goldminer shrink-0 text-lg leading-none text-yellow-300">
                      {owned ? 'AKTIV' : `$${offer.price}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {localPlayerId && (
              <button
                type="button"
                onClick={() => actionsRef.current?.nextLevelReady(localPlayerId)}
                className="font-goldminer w-full rounded-2xl border-b-4 border-emerald-800 bg-emerald-500 py-3.5 text-2xl text-white shadow-lg transition hover:bg-emerald-400 active:translate-y-0.5"
              >
                Nächstes Level starten!
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
