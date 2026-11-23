import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Crosshair, Heart, ShieldAlert, Skull, Sparkles, Zap } from 'lucide-react';
import type {
  ZombieDifficulty,
  ZombieInputPayload,
  ZombiePlayerHudState,
} from '@projektbox/shared/types';
import {
  getLevelForXp,
  getWeaponById,
  getWeaponForLevel,
  getXpBoundsForLevel,
} from '@projektbox/shared/utils';
import type { Player } from '@projektbox/shared/types';
import { socketService } from '../../../services/socket';

interface Zombie3DArenaProps {
  players: Player[];
  difficulty: ZombieDifficulty;
  isGameOver: boolean;
  onFinish: (payload: {
    wave: number;
    scores: Record<string, number>;
    kills: Record<string, number>;
    levels: Record<string, number>;
    weapons: Record<string, string>;
  }) => void;
}

interface PlayerEntity {
  id: string;
  name: string;
  color: string;
  isBot: boolean;
  mesh: THREE.Group;
  weaponGroup: THREE.Group;
  currentWeaponMeshId: string;
  x: number;
  z: number;
  aimX: number;
  aimZ: number;
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  weaponId: string;
  ammo: number;
  maxAmmo: number;
  reloadingUntil: number;
  lastShotAt: number;
  dashReadyAt: number;
  dashUntil: number;
  dashDirX: number;
  dashDirZ: number;
  invulnUntil: number;
  kills: number;
  score: number;
  alive: boolean;
}

interface ZombieEntity {
  id: number;
  kind: 'shambler' | 'runner' | 'brute';
  mesh: THREE.Group;
  bodyMesh: THREE.Mesh;
  baseColor: number;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  xpReward: number;
  scoreReward: number;
  hitFlashUntil: number;
  lastAttackAt: number;
  wobblePhase: number;
}

interface ProjectileEntity {
  mesh: THREE.Mesh;
  ownerId: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  radius: number;
  piercing: boolean;
  splashRadius: number;
  color: number;
  hitIds: Set<number>;
  expiresAt: number;
}

interface ParticleEntity {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  expiresAt: number;
}

interface PickupEntity {
  id: number;
  kind: 'medkit' | 'xp';
  mesh: THREE.Group;
  x: number;
  z: number;
  expiresAt: number;
}

interface ObstacleBox {
  x: number;
  z: number;
  halfW: number;
  halfD: number;
}

const PLAYER_COLORS = [
  '#38BDF8',
  '#F472B6',
  '#34D399',
  '#FBBF24',
  '#A78BFA',
  '#FB7185',
  '#22D3EE',
  '#F97316',
];

const ARENA_HALF = 15.5;

function createWeaponMesh(weaponId: string): THREE.Group {
  const group = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.7,
    roughness: 0.3,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.5,
    roughness: 0.4,
  });

  if (weaponId === 'pistol') {
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.45), metalMat);
    barrel.position.set(0, 0, 0.22);
    group.add(barrel);
  } else if (weaponId === 'smg') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.65), metalMat);
    body.position.set(0, 0, 0.28);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.1), darkMat);
    mag.position.set(0, -0.14, 0.28);
    group.add(body, mag);
  } else if (weaponId === 'shotgun') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.85), darkMat);
    body.position.set(0, 0, 0.35);
    const pump = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.14, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 })
    );
    pump.position.set(0, -0.04, 0.48);
    group.add(body, pump);
  } else if (weaponId === 'rifle') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.95), metalMat);
    body.position.set(0, 0, 0.42);
    const scope = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0x4c1d95 })
    );
    scope.position.set(0, 0.14, 0.32);
    group.add(body, scope);
  } else if (weaponId === 'plasma') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.9), darkMat);
    body.position.set(0, 0, 0.4);
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.12, 0.55),
      new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.4,
      })
    );
    core.position.set(0, 0.08, 0.45);
    group.add(body, core);
  } else {
    // rocket
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 1.05, 10),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.35 })
    );
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.05, 0.38);
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.25, 10),
      new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xbe123c,
        emissiveIntensity: 0.8,
      })
    );
    tip.rotation.x = Math.PI / 2;
    tip.position.set(0, 0.05, 0.98);
    group.add(tube, tip);
  }

  return group;
}

function resolveObstaclePush(
  x: number,
  z: number,
  radius: number,
  obstacles: ObstacleBox[]
): { x: number; z: number } {
  let nx = Math.max(-ARENA_HALF + radius, Math.min(ARENA_HALF - radius, x));
  let nz = Math.max(-ARENA_HALF + radius, Math.min(ARENA_HALF - radius, z));

  for (const box of obstacles) {
    const dx = nx - box.x;
    const dz = nz - box.z;
    const overlapX = box.halfW + radius - Math.abs(dx);
    const overlapZ = box.halfD + radius - Math.abs(dz);
    if (overlapX > 0 && overlapZ > 0) {
      if (overlapX < overlapZ) {
        nx += dx >= 0 ? overlapX : -overlapX;
      } else {
        nz += dz >= 0 ? overlapZ : -overlapZ;
      }
    }
  }
  return { x: nx, z: nz };
}

export function Zombie3DArena({
  players,
  difficulty,
  isGameOver,
  onFinish,
}: Zombie3DArenaProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const [hudOverlay, setHudOverlay] = useState<{
    wave: number;
    zombiesRemaining: number;
    players: ZombiePlayerHudState[];
  }>({
    wave: 1,
    zombiesRemaining: 0,
    players: [],
  });
  const [bannerText, setBannerText] = useState<string | null>(null);
  const bannerTimerRef = useRef<number | null>(null);

  const showBanner = (text: string) => {
    setBannerText(text);
    if (bannerTimerRef.current) {
      window.clearTimeout(bannerTimerRef.current);
    }
    bannerTimerRef.current = window.setTimeout(() => {
      setBannerText(null);
    }, 2600);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const activeList = players.filter((p) => !p.isTvScreen);
    if (activeList.length === 0) return;

    // ─── THREE.JS SCENE SETUP ───
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1322);
    scene.fog = new THREE.FogExp2(0x0b1322, 0.018);

    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 720;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 120);
    camera.position.set(0, 22, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xe2e8f0, 1.35);
    dirLight.position.set(14, 26, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 70;
    const d = 20;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    const flashLight = new THREE.PointLight(0xfbbf24, 0, 9);
    flashLight.position.set(0, 2, 0);
    scene.add(flashLight);

    // Arena Floor & Grid
    const floorGeo = new THREE.PlaneGeometry(ARENA_HALF * 2 + 2, ARENA_HALF * 2 + 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111c30,
      roughness: 0.88,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(ARENA_HALF * 2, 16, 0x334155, 0x1e293b);
    grid.position.y = 0.02;
    scene.add(grid);

    // Glowing Perimeter Walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.3,
      roughness: 0.5,
    });
    const wallPositions: Array<[number, number, number, number]> = [
      [0, -ARENA_HALF - 0.4, ARENA_HALF * 2 + 1.2, 0.8],
      [0, ARENA_HALF + 0.4, ARENA_HALF * 2 + 1.2, 0.8],
      [-ARENA_HALF - 0.4, 0, 0.8, ARENA_HALF * 2 + 1.2],
      [ARENA_HALF + 0.4, 0, 0.8, ARENA_HALF * 2 + 1.2],
    ];
    for (const [wx, wz, ww, wd] of wallPositions) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, 1.1, wd), wallMat);
      wall.position.set(wx, 0.55, wz);
      wall.receiveShadow = true;
      scene.add(wall);
    }

    // Tactical Cover Crates
    const obstacles: ObstacleBox[] = [
      { x: -6.5, z: -6.5, halfW: 1.1, halfD: 1.1 },
      { x: 6.5, z: -6.5, halfW: 1.1, halfD: 1.1 },
      { x: -6.5, z: 6.5, halfW: 1.1, halfD: 1.1 },
      { x: 6.5, z: 6.5, halfW: 1.1, halfD: 1.1 },
      { x: 0, z: -9, halfW: 1.8, halfD: 0.8 },
      { x: 0, z: 9, halfW: 1.8, halfD: 0.8 },
    ];
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.65,
      metalness: 0.25,
    });
    const crateTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: 0.35,
    });
    for (const box of obstacles) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(box.halfW * 2, 1.4, box.halfD * 2),
        crateMat
      );
      mesh.position.set(box.x, 0.7, box.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(box.halfW * 2 + 0.06, 0.14, box.halfD * 2 + 0.06),
        crateTrimMat
      );
      trim.position.set(box.x, 1.32, box.z);
      scene.add(mesh, trim);
    }

    // ─── PLAYERS ───
    const playerEntities = new Map<string, PlayerEntity>();
    const inputs = new Map<string, ZombieInputPayload>();
    const spawnRadius = activeList.length === 1 ? 0 : 3.2;

    activeList.forEach((p, idx) => {
      const angle = (idx / Math.max(1, activeList.length)) * Math.PI * 2;
      const sx = Math.cos(angle) * spawnRadius;
      const sz = Math.sin(angle) * spawnRadius;
      const colorHex = p.color || PLAYER_COLORS[idx % PLAYER_COLORS.length];
      const colorNum = new THREE.Color(colorHex).getHex();

      const group = new THREE.Group();
      group.position.set(sx, 0, sz);

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 1.05, 0.6),
        new THREE.MeshStandardMaterial({ color: colorNum, roughness: 0.45 })
      );
      body.position.y = 0.75;
      body.castShadow = true;

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.56, 0.58),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 })
      );
      head.position.y = 1.62;
      head.castShadow = true;

      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.18, 0.12),
        new THREE.MeshStandardMaterial({
          color: colorNum,
          emissive: colorNum,
          emissiveIntensity: 0.9,
        })
      );
      visor.position.set(0, 1.64, 0.28);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.62, 0.76, 24),
        new THREE.MeshBasicMaterial({
          color: colorNum,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;

      const weaponGroup = new THREE.Group();
      weaponGroup.position.set(0.45, 0.92, 0.15);
      weaponGroup.add(createWeaponMesh('pistol'));

      group.add(body, head, visor, ring, weaponGroup);
      scene.add(group);

      const starterWeapon = getWeaponForLevel(1);
      playerEntities.set(p.id, {
        id: p.id,
        name: p.name,
        color: colorHex,
        isBot: Boolean(p.isBot),
        mesh: group,
        weaponGroup,
        currentWeaponMeshId: starterWeapon.id,
        x: sx,
        z: sz,
        aimX: 0,
        aimZ: 1,
        hp: 100,
        maxHp: 100,
        xp: 0,
        level: 1,
        weaponId: starterWeapon.id,
        ammo: starterWeapon.magSize,
        maxAmmo: starterWeapon.magSize,
        reloadingUntil: 0,
        lastShotAt: 0,
        dashReadyAt: 0,
        dashUntil: 0,
        dashDirX: 0,
        dashDirZ: 0,
        invulnUntil: 0,
        kills: 0,
        score: 0,
        alive: true,
      });

      inputs.set(p.id, {
        moveX: 0,
        moveY: 0,
        aimX: 0,
        aimY: 0,
        firing: false,
      });
    });

    // Keyboard fallback for local desktop/TV testing
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => keys.add(e.key.toLowerCase());
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Socket listener for Smartphone Controller Inputs
    const unsubInput = socketService.onZombieInput(({ playerId, input }) => {
      inputs.set(playerId, input);
    });

    // ─── GAME STATE ───
    const zombies: ZombieEntity[] = [];
    const projectiles: ProjectileEntity[] = [];
    const particles: ParticleEntity[] = [];
    const pickups: PickupEntity[] = [];

    let nextEntityId = 1;
    let wave = 1;
    let zombiesToSpawn = 0;
    let nextSpawnAt = 0;
    let wavePauseUntil = performance.now() + 900;
    let gameFinishedSent = false;
    let screenShake = 0;

    const diffMult =
      difficulty === 'nightmare' ? 1.45 : difficulty === 'hard' ? 1.2 : 1.0;

    const startWave = (w: number, now: number) => {
      wave = w;
      zombiesToSpawn = Math.round((5 + w * 3) * diffMult);
      nextSpawnAt = now + 400;
      showBanner(`WELLE ${w} STARTET!`);
    };

    startWave(1, performance.now());

    const spawnParticles = (x: number, y: number, z: number, color: number, count: number) => {
      const now = performance.now();
      for (let i = 0; i < count; i++) {
        const size = 0.14 + Math.random() * 0.14;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(size, size, size),
          new THREE.MeshBasicMaterial({ color })
        );
        mesh.position.set(x, y, z);
        scene.add(mesh);
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 5;
        particles.push({
          mesh,
          vx: Math.cos(angle) * spd,
          vy: 2.5 + Math.random() * 4.5,
          vz: Math.sin(angle) * spd,
          expiresAt: now + 350 + Math.random() * 250,
        });
      }
    };

    const spawnZombie = (now: number) => {
      const id = nextEntityId++;
      const roll = Math.random();
      const isBossWave = wave % 3 === 0 && zombiesToSpawn === 1;
      const kind: ZombieEntity['kind'] =
        isBossWave || (wave >= 4 && roll > 0.88)
          ? 'brute'
          : wave >= 2 && roll > 0.65
            ? 'runner'
            : 'shambler';

      const baseColor =
        kind === 'brute' ? 0x9333ea : kind === 'runner' ? 0xf97316 : 0x22c55e;
      const scale = kind === 'brute' ? 1.55 : kind === 'runner' ? 0.85 : 1.0;
      const maxHp =
        (kind === 'brute' ? 210 : kind === 'runner' ? 42 : 68) *
        (1 + (wave - 1) * 0.18) *
        diffMult;
      const speed =
        (kind === 'brute' ? 2.5 : kind === 'runner' ? 5.2 : 3.3) *
        (1 + Math.min(0.45, (wave - 1) * 0.04));

      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.7,
      });
      const bodyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.85 * scale, 1.15 * scale, 0.55 * scale),
        bodyMat
      );
      bodyMesh.position.y = 0.72 * scale;
      bodyMesh.castShadow = true;

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.56 * scale, 0.54 * scale, 0.54 * scale),
        new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.6 })
      );
      head.position.y = 1.58 * scale;
      head.castShadow = true;

      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
      const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.1 * scale, 0.08 * scale, 0.08 * scale), eyeMat);
      leftEye.position.set(-0.12 * scale, 1.6 * scale, 0.27 * scale);
      const rightEye = leftEye.clone();
      rightEye.position.x = 0.12 * scale;

      group.add(bodyMesh, head, leftEye, rightEye);

      // Spawn along arena perimeter
      const edge = Math.floor(Math.random() * 4);
      const offset = (Math.random() * 2 - 1) * (ARENA_HALF - 1.2);
      const sx = edge === 0 ? offset : edge === 1 ? offset : edge === 2 ? -ARENA_HALF + 0.8 : ARENA_HALF - 0.8;
      const sz = edge === 0 ? -ARENA_HALF + 0.8 : edge === 1 ? ARENA_HALF - 0.8 : offset;
      group.position.set(sx, 0, sz);
      scene.add(group);

      zombies.push({
        id,
        kind,
        mesh: group,
        bodyMesh,
        baseColor,
        x: sx,
        z: sz,
        hp: maxHp,
        maxHp,
        speed,
        damage: kind === 'brute' ? 28 : kind === 'runner' ? 14 : 18,
        radius: 0.55 * scale,
        xpReward: kind === 'brute' ? 120 : kind === 'runner' ? 35 : 25,
        scoreReward: kind === 'brute' ? 400 : kind === 'runner' ? 140 : 100,
        hitFlashUntil: 0,
        lastAttackAt: now,
        wobblePhase: Math.random() * Math.PI * 2,
      });
    };

    const spawnPickup = (x: number, z: number, kind: 'medkit' | 'xp', now: number) => {
      const group = new THREE.Group();
      const color = kind === 'medkit' ? 0x10b981 : 0xfbbf24;
      const core = new THREE.Mesh(
        kind === 'medkit'
          ? new THREE.BoxGeometry(0.55, 0.35, 0.55)
          : new THREE.OctahedronGeometry(0.32, 0),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.85,
        })
      );
      core.position.y = 0.45;
      group.add(core);
      group.position.set(x, 0, z);
      scene.add(group);
      pickups.push({
        id: nextEntityId++,
        kind,
        mesh: group,
        x,
        z,
        expiresAt: now + 14000,
      });
    };

    const damageZombie = (z: ZombieEntity, dmg: number, ownerId: string, now: number) => {
      z.hp -= dmg;
      z.hitFlashUntil = now + 90;
      (z.bodyMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
      (z.bodyMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;

      if (z.hp <= 0) {
        const killer = playerEntities.get(ownerId);
        if (killer) {
          killer.kills += 1;
          killer.score += z.scoreReward;
          const prevLevel = killer.level;
          killer.xp += z.xpReward;
          const nextLevel = getLevelForXp(killer.xp);
          if (nextLevel > prevLevel) {
            killer.level = nextLevel;
            killer.maxHp = 100 + (nextLevel - 1) * 15;
            killer.hp = Math.min(killer.maxHp, killer.hp + 35);
            const nextWeapon = getWeaponForLevel(nextLevel);
            if (nextWeapon.id !== killer.weaponId) {
              killer.weaponId = nextWeapon.id;
              killer.maxAmmo = nextWeapon.magSize;
              killer.ammo = nextWeapon.magSize;
              killer.reloadingUntil = 0;
              // Swap 3D weapon mesh
              killer.weaponGroup.clear();
              killer.weaponGroup.add(createWeaponMesh(nextWeapon.id));
              killer.currentWeaponMeshId = nextWeapon.id;
              showBanner(`${killer.name.toUpperCase()} • LVL ${nextLevel}: ${nextWeapon.name.toUpperCase()}!`);
            } else {
              showBanner(`${killer.name.toUpperCase()} • LEVEL ${nextLevel}!`);
            }
          }
        }
        spawnParticles(z.x, 0.9, z.z, z.baseColor, 10);
        if (Math.random() < 0.22) {
          spawnPickup(z.x, z.z, Math.random() < 0.55 ? 'medkit' : 'xp', now);
        }
        scene.remove(z.mesh);
        return true;
      }
      return false;
    };

    // ─── MAIN 60FPS GAME LOOP ───
    let lastTime = performance.now();
    let lastHudSyncAt = 0;
    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (!isGameOver && !gameFinishedSent) {
        // Wave Spawning
        if (zombiesToSpawn > 0 && now >= nextSpawnAt) {
          spawnZombie(now);
          zombiesToSpawn -= 1;
          nextSpawnAt = now + Math.max(260, 1050 - wave * 75);
        } else if (zombiesToSpawn === 0 && zombies.length === 0) {
          if (now >= wavePauseUntil) {
            if (wavePauseUntil > 0 && now - wavePauseUntil < 100) {
              startWave(wave + 1, now);
            } else {
              wavePauseUntil = now + 2200;
            }
          }
        }

        // Update Players
        const livingPlayers: PlayerEntity[] = [];
        const firstHuman = Array.from(playerEntities.values()).find((p) => !p.isBot);

        for (const p of playerEntities.values()) {
          if (!p.alive) continue;
          livingPlayers.push(p);

          // Finish reload
          if (p.reloadingUntil > 0 && now >= p.reloadingUntil) {
            p.ammo = p.maxAmmo;
            p.reloadingUntil = 0;
          }

          let inp = inputs.get(p.id) || { moveX: 0, moveY: 0, aimX: 0, aimY: 0, firing: false };

          // Keyboard fallback for the first human player (WASD + Arrows + R + Shift)
          if (firstHuman && p.id === firstHuman.id && keys.size > 0) {
            const kx = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
            const ky = (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0);
            const ax = (keys.has('arrowright') ? 1 : 0) - (keys.has('arrowleft') ? 1 : 0);
            const ay = (keys.has('arrowdown') ? 1 : 0) - (keys.has('arrowup') ? 1 : 0);
            if (kx !== 0 || ky !== 0 || ax !== 0 || ay !== 0 || keys.has('r') || keys.has('shift')) {
              inp = {
                moveX: kx || inp.moveX,
                moveY: ky || inp.moveY,
                aimX: ax || inp.aimX,
                aimY: ay || inp.aimY,
                firing: ax !== 0 || ay !== 0 || keys.has(' ') || inp.firing,
                reload: keys.has('r') || inp.reload,
                dash: keys.has('shift') || inp.dash,
              };
            }
          }

          // Smart Bot AI
          if (p.isBot) {
            let nearestZ: ZombieEntity | null = null;
            let nearestDist = Infinity;
            for (const z of zombies) {
              const dist = Math.hypot(z.x - p.x, z.z - p.z);
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestZ = z;
              }
            }
            if (nearestZ) {
              const dx = nearestZ.x - p.x;
              const dz = nearestZ.z - p.z;
              const len = Math.max(0.001, Math.hypot(dx, dz));
              const desiredMoveX = len < 6.5 ? -dx / len : len > 9 ? dx / len : -dz / len * 0.7;
              const desiredMoveZ = len < 6.5 ? -dz / len : len > 9 ? dz / len : dx / len * 0.7;
              inp = {
                moveX: desiredMoveX,
                moveY: desiredMoveZ,
                aimX: dx / len,
                aimY: dz / len,
                firing: len < 16,
                dash: len < 2.2,
              };
            } else {
              inp = { moveX: -p.x * 0.15, moveY: -p.z * 0.15, aimX: 0, aimY: 1, firing: false };
            }
          }

          // Manual Reload
          if (inp.reload && p.reloadingUntil === 0 && p.ammo < p.maxAmmo) {
            const spec = getWeaponById(p.weaponId);
            p.reloadingUntil = now + spec.reloadMs;
          }

          // Dash
          if (inp.dash && now >= p.dashReadyAt) {
            const dLen = Math.hypot(inp.moveX, inp.moveY);
            p.dashDirX = dLen > 0.15 ? inp.moveX / dLen : p.aimX;
            p.dashDirZ = dLen > 0.15 ? inp.moveY / dLen : p.aimZ;
            p.dashUntil = now + 180;
            p.dashReadyAt = now + 2600;
            p.invulnUntil = Math.max(p.invulnUntil, now + 240);
            spawnParticles(p.x, 0.4, p.z, 0x38bdf8, 6);
          }

          // Movement
          const isDashing = now < p.dashUntil;
          const baseSpeed = isDashing ? 18.5 : 6.8;
          let mx = isDashing ? p.dashDirX : inp.moveX;
          let mz = isDashing ? p.dashDirZ : inp.moveY;
          const mLen = Math.hypot(mx, mz);
          if (mLen > 1) {
            mx /= mLen;
            mz /= mLen;
          }
          const pushed = resolveObstaclePush(
            p.x + mx * baseSpeed * dt,
            p.z + mz * baseSpeed * dt,
            0.55,
            obstacles
          );
          p.x = pushed.x;
          p.z = pushed.z;

          // Aim
          const aimMag = Math.hypot(inp.aimX, inp.aimY);
          if (aimMag > 0.2) {
            p.aimX = inp.aimX / aimMag;
            p.aimZ = inp.aimY / aimMag;
          } else if (mLen > 0.25) {
            p.aimX = mx / mLen;
            p.aimZ = mz / mLen;
          }

          p.mesh.position.set(p.x, 0, p.z);
          p.mesh.rotation.y = Math.atan2(p.aimX, p.aimZ);

          // Shooting
          const weapon = getWeaponById(p.weaponId);
          if (inp.firing && p.reloadingUntil === 0 && now - p.lastShotAt >= weapon.fireRateMs) {
            if (p.ammo <= 0) {
              p.reloadingUntil = now + weapon.reloadMs;
            } else {
              p.ammo -= 1;
              p.lastShotAt = now;
              if (p.ammo === 0) {
                p.reloadingUntil = now + weapon.reloadMs;
              }

              const levelDamageMult = 1 + (p.level - 1) * 0.1;
              const baseAngle = Math.atan2(p.aimX, p.aimZ);
              const projColor = new THREE.Color(weapon.color).getHex();

              flashLight.color.setHex(projColor);
              flashLight.position.set(p.x + p.aimX * 0.9, 1.1, p.z + p.aimZ * 0.9);
              flashLight.intensity = 2.4;

              for (let i = 0; i < weapon.pellets; i++) {
                const spreadOffset = (Math.random() - 0.5) * weapon.spread;
                const ang = baseAngle + spreadOffset;
                const vx = Math.sin(ang) * weapon.projectileSpeed;
                const vz = Math.cos(ang) * weapon.projectileSpeed;

                const projMesh = new THREE.Mesh(
                  weapon.id === 'rocket'
                    ? new THREE.SphereGeometry(0.22, 8, 8)
                    : new THREE.BoxGeometry(0.14, 0.14, 0.42),
                  new THREE.MeshBasicMaterial({ color: projColor })
                );
                projMesh.position.set(p.x + Math.sin(ang) * 0.9, 0.95, p.z + Math.cos(ang) * 0.9);
                projMesh.rotation.y = ang;
                scene.add(projMesh);

                projectiles.push({
                  mesh: projMesh,
                  ownerId: p.id,
                  x: projMesh.position.x,
                  z: projMesh.position.z,
                  vx,
                  vz,
                  damage: weapon.damage * levelDamageMult,
                  radius: weapon.id === 'rocket' ? 0.35 : 0.22,
                  piercing: Boolean(weapon.piercing),
                  splashRadius: weapon.splashRadius || 0,
                  color: projColor,
                  hitIds: new Set<number>(),
                  expiresAt: now + 1300,
                });
              }
            }
          }
        }

        // Fade muzzle flash
        if (flashLight.intensity > 0) {
          flashLight.intensity = Math.max(0, flashLight.intensity - dt * 18);
        }

        // Update Projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const pr = projectiles[i];
          pr.x += pr.vx * dt;
          pr.z += pr.vz * dt;
          pr.mesh.position.set(pr.x, 0.95, pr.z);

          let removeProj = now >= pr.expiresAt || Math.abs(pr.x) > ARENA_HALF || Math.abs(pr.z) > ARENA_HALF;

          if (!removeProj) {
            for (const box of obstacles) {
              if (Math.abs(pr.x - box.x) < box.halfW && Math.abs(pr.z - box.z) < box.halfD) {
                removeProj = true;
                spawnParticles(pr.x, 0.9, pr.z, pr.color, 4);
                break;
              }
            }
          }

          if (!removeProj) {
            for (let zi = zombies.length - 1; zi >= 0; zi--) {
              const z = zombies[zi];
              if (pr.hitIds.has(z.id)) continue;
              const dist = Math.hypot(pr.x - z.x, pr.z - z.z);
              if (dist <= z.radius + pr.radius) {
                pr.hitIds.add(z.id);

                if (pr.splashRadius > 0) {
                  // Rocket AoE Explosion!
                  screenShake = Math.max(screenShake, 0.35);
                  spawnParticles(pr.x, 0.9, pr.z, 0xf43f5e, 16);
                  for (let k = zombies.length - 1; k >= 0; k--) {
                    const target = zombies[k];
                    const splashDist = Math.hypot(pr.x - target.x, pr.z - target.z);
                    if (splashDist <= pr.splashRadius) {
                      const killed = damageZombie(target, pr.damage, pr.ownerId, now);
                      if (killed) zombies.splice(k, 1);
                    }
                  }
                  removeProj = true;
                  break;
                } else {
                  const killed = damageZombie(z, pr.damage, pr.ownerId, now);
                  if (killed) zombies.splice(zi, 1);
                  if (!pr.piercing) {
                    removeProj = true;
                    break;
                  }
                }
              }
            }
          }

          if (removeProj) {
            scene.remove(pr.mesh);
            projectiles.splice(i, 1);
          }
        }

        // Update Zombies
        for (const z of zombies) {
          if (z.hitFlashUntil > 0 && now >= z.hitFlashUntil) {
            z.hitFlashUntil = 0;
            (z.bodyMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
            (z.bodyMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
          }

          let target: PlayerEntity | null = null;
          let minDist = Infinity;
          for (const lp of livingPlayers) {
            const d = Math.hypot(lp.x - z.x, lp.z - z.z);
            if (d < minDist) {
              minDist = d;
              target = lp;
            }
          }

          if (target) {
            const dx = target.x - z.x;
            const dz = target.z - z.z;
            const len = Math.max(0.001, Math.hypot(dx, dz));
            const nextPos = resolveObstaclePush(
              z.x + (dx / len) * z.speed * dt,
              z.z + (dz / len) * z.speed * dt,
              z.radius,
              obstacles
            );
            z.x = nextPos.x;
            z.z = nextPos.z;
            z.wobblePhase += dt * 10;
            z.mesh.position.set(z.x, Math.abs(Math.sin(z.wobblePhase)) * 0.08, z.z);
            z.mesh.rotation.y = Math.atan2(dx, dz);
            z.mesh.rotation.z = Math.sin(z.wobblePhase) * 0.06;

            if (len <= z.radius + 0.58 && now - z.lastAttackAt >= 750 && now >= target.invulnUntil) {
              z.lastAttackAt = now;
              target.hp = Math.max(0, target.hp - z.damage);
              target.invulnUntil = now + 260;
              screenShake = Math.max(screenShake, 0.22);
              spawnParticles(target.x, 1.0, target.z, 0xef4444, 6);
              if (target.hp <= 0) {
                target.alive = false;
                target.mesh.visible = false;
                spawnParticles(target.x, 1.0, target.z, 0xf43f5e, 14);
                showBanner(`${target.name.toUpperCase()} WURDE ÜBERRANNT!`);
              }
            }
          }
        }

        // Update Pickups
        for (let i = pickups.length - 1; i >= 0; i--) {
          const pk = pickups[i];
          pk.mesh.rotation.y += dt * 2.5;
          if (now >= pk.expiresAt) {
            scene.remove(pk.mesh);
            pickups.splice(i, 1);
            continue;
          }
          for (const lp of livingPlayers) {
            if (Math.hypot(lp.x - pk.x, lp.z - pk.z) < 1.1) {
              if (pk.kind === 'medkit') {
                lp.hp = Math.min(lp.maxHp, lp.hp + 30);
              } else {
                lp.xp += 45;
                lp.score += 50;
                const nl = getLevelForXp(lp.xp);
                if (nl > lp.level) {
                  lp.level = nl;
                  lp.maxHp = 100 + (nl - 1) * 15;
                  lp.hp = Math.min(lp.maxHp, lp.hp + 35);
                  const nw = getWeaponForLevel(nl);
                  if (nw.id !== lp.weaponId) {
                    lp.weaponId = nw.id;
                    lp.maxAmmo = nw.magSize;
                    lp.ammo = nw.magSize;
                    lp.weaponGroup.clear();
                    lp.weaponGroup.add(createWeaponMesh(nw.id));
                    showBanner(`${lp.name.toUpperCase()} • LVL ${nl}: ${nw.name.toUpperCase()}!`);
                  }
                }
              }
              scene.remove(pk.mesh);
              pickups.splice(i, 1);
              break;
            }
          }
        }

        // Update Particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const pt = particles[i];
          pt.vy -= 14 * dt;
          pt.mesh.position.x += pt.vx * dt;
          pt.mesh.position.y = Math.max(0.05, pt.mesh.position.y + pt.vy * dt);
          pt.mesh.position.z += pt.vz * dt;
          if (now >= pt.expiresAt) {
            scene.remove(pt.mesh);
            particles.splice(i, 1);
          }
        }

        // Camera framing
        let focusX = 0;
        let focusZ = 0;
        if (livingPlayers.length > 0) {
          for (const lp of livingPlayers) {
            focusX += lp.x;
            focusZ += lp.z;
          }
          focusX /= livingPlayers.length;
          focusZ /= livingPlayers.length;
        }
        screenShake = Math.max(0, screenShake - dt * 1.8);
        const shakeX = (Math.random() - 0.5) * screenShake;
        const shakeY = (Math.random() - 0.5) * screenShake;

        camera.position.x += (focusX * 0.45 + shakeX - camera.position.x) * Math.min(1, dt * 4);
        camera.position.z += (focusZ * 0.45 + 17.5 - camera.position.z) * Math.min(1, dt * 4);
        camera.position.y = 21.5 + shakeY;
        camera.lookAt(focusX * 0.35, 0, focusZ * 0.35);

        // Check Game Over (all players dead)
        if (livingPlayers.length === 0 && !gameFinishedSent) {
          gameFinishedSent = true;
          const scores: Record<string, number> = {};
          const kills: Record<string, number> = {};
          const levels: Record<string, number> = {};
          const weapons: Record<string, string> = {};
          for (const p of playerEntities.values()) {
            scores[p.id] = p.score;
            kills[p.id] = p.kills;
            levels[p.id] = p.level;
            weapons[p.id] = p.weaponId;
          }
          onFinishRef.current({ wave, scores, kills, levels, weapons });
        }

        // Sync HUD + Smartphones (~10Hz)
        if (now - lastHudSyncAt >= 100) {
          lastHudSyncAt = now;
          const hudPlayers: Record<string, ZombiePlayerHudState> = {};
          const list: ZombiePlayerHudState[] = [];
          for (const p of playerEntities.values()) {
            const entry: ZombiePlayerHudState = {
              playerId: p.id,
              hp: Math.round(p.hp),
              maxHp: p.maxHp,
              xp: p.xp,
              level: p.level,
              weaponId: p.weaponId,
              ammo: p.ammo,
              maxAmmo: p.maxAmmo,
              reloading: p.reloadingUntil > 0,
              kills: p.kills,
              score: p.score,
              alive: p.alive,
              dashReadyAt: p.dashReadyAt,
            };
            hudPlayers[p.id] = entry;
            list.push(entry);
          }
          const zombiesRemaining = zombies.length + zombiesToSpawn;
          setHudOverlay({ wave, zombiesRemaining, players: list });
          socketService.emitZombieState({
            wave,
            zombiesRemaining,
            players: hudPlayers,
            status: livingPlayers.length === 0 ? 'won' : 'playing',
          });
        }
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 720;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      unsubInput();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
      renderer.dispose();
    };
  }, [players, difficulty, isGameOver]);

  return (
    <div className="relative flex w-full flex-col gap-3 select-none">
      {/* Top Wave & Banner Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <span className="rounded-xl border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-3.5 py-1.5 font-arcade text-sm sm:text-base text-[#FDE68A] uppercase">
            WELLE {hudOverlay.wave}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#F43F5E]/40 bg-[#F43F5E]/15 px-3.5 py-1.5 font-arcade text-xs sm:text-sm text-[#FDA4AF] uppercase">
            <Skull className="h-4 w-4" />
            <span>{hudOverlay.zombiesRemaining} ZOMBIES</span>
          </span>
        </div>

        <span className="font-arcade hidden md:inline-flex items-center gap-1.5 text-xs text-[#94A3B8] uppercase">
          <Crosshair className="h-3.5 w-3.5 text-[#38BDF8]" />
          <span>SMARTPHONE ALS CONTROLLER NUTZEN</span>
        </span>
      </div>

      {/* 3D WebGL Canvas */}
      <div className="relative w-full h-[54vh] min-h-[340px] max-h-[620px] overflow-hidden rounded-3xl border border-white/15 bg-[#0B1322] shadow-2xl">
        <div ref={mountRef} className="h-full w-full" />

        {bannerText && (
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-20 animate-bounce">
            <div className="flex items-center gap-2 rounded-2xl border border-[#FBBF24]/70 bg-[#0F172A]/90 px-5 py-2.5 shadow-xl backdrop-blur-md">
              <Sparkles className="h-5 w-5 text-[#FBBF24]" />
              <span className="font-arcade text-sm sm:text-lg text-[#FDE68A] uppercase tracking-wider whitespace-nowrap">
                {bannerText}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Open Player Strip below 3D Arena */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {players
          .filter((p) => !p.isTvScreen)
          .map((p, idx) => {
            const hud = hudOverlay.players.find((h) => h.playerId === p.id);
            const weapon = getWeaponById(hud?.weaponId || 'pistol');
            const level = hud?.level || 1;
            const xp = hud?.xp || 0;
            const { currentMinXp, nextLevelXp } = getXpBoundsForLevel(level);
            const xpPct = Math.min(
              100,
              Math.max(0, ((xp - currentMinXp) / Math.max(1, nextLevelXp - currentMinXp)) * 100)
            );
            const hpPct = hud ? Math.max(0, (hud.hp / Math.max(1, hud.maxHp)) * 100) : 100;
            const color = p.color || PLAYER_COLORS[idx % PLAYER_COLORS.length];

            return (
              <div
                key={p.id}
                className={`flex flex-col gap-1.5 rounded-2xl border px-3 py-2.5 transition-all ${
                  hud && !hud.alive
                    ? 'border-[#EF4444]/35 bg-[#EF4444]/10 opacity-55'
                    : 'border-white/10 bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-arcade truncate text-xs text-white uppercase">
                      {p.name}
                    </span>
                  </div>
                  <span className="font-arcade shrink-0 rounded-md bg-[#F59E0B]/20 px-1.5 py-0.5 text-[10px] text-[#FDE68A]">
                    LVL {level}
                  </span>
                </div>

                {/* HP Bar */}
                <div className="flex items-center gap-1.5">
                  <Heart className="h-3 w-3 shrink-0 text-[#FB7185]" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#10B981] transition-all duration-150"
                      style={{
                        width: `${hpPct}%`,
                        backgroundColor: hpPct <= 30 ? '#EF4444' : '#10B981',
                      }}
                    />
                  </div>
                </div>

                {/* XP Bar */}
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 shrink-0 text-[#38BDF8]" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#38BDF8] transition-all duration-150"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-arcade text-[#CBD5E1] uppercase">
                  <span className="truncate" style={{ color: weapon.color }}>
                    {hud && !hud.alive ? 'BESIEGT' : weapon.shortName}
                  </span>
                  <span className="text-[#FDE68A]">{hud?.kills || 0} KILLS</span>
                </div>
              </div>
            );
          })}
      </div>

      {hudOverlay.players.length > 0 && hudOverlay.players.every((p) => !p.alive) && (
        <div className="flex items-center justify-center gap-2 text-xs font-arcade text-[#FDA4AF] uppercase">
          <ShieldAlert className="h-4 w-4" />
          <span>ALLE SPIELER WURDEN ÜBERRANNT...</span>
        </div>
      )}
    </div>
  );
}
