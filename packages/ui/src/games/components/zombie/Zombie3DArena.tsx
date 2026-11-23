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
import {
  cloneAnimatedCharacter,
  createDetailedWeaponMesh,
  loadZombieAssets,
  type ZombieAssetPack,
} from './zombieModels';
import { buildZombieStreetMap } from './zombieMapBuilder';

interface Zombie3DArenaProps {
  players: Player[];
  difficulty: ZombieDifficulty;
  isGameOver: boolean;
  localPlayerId?: string;
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
  modelHolder: THREE.Group;
  weaponGroup: THREE.Group;
  muzzleFlash: THREE.Mesh;
  muzzleFlashUntil: number;
  mixer?: THREE.AnimationMixer;
  actions?: Record<string, THREE.AnimationAction>;
  activeAnim?: string;
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
  flashMeshes: THREE.Mesh[];
  mixer?: THREE.AnimationMixer;
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
  localPlayerId,
  onFinish,
}: Zombie3DArenaProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const localInputRef = useRef<ZombieInputPayload | null>(null);
  const localLeftPadRef = useRef<HTMLDivElement | null>(null);
  const localRightPadRef = useRef<HTMLDivElement | null>(null);
  const [localLeftKnob, setLocalLeftKnob] = useState({ x: 0, y: 0, pointerId: null as number | null });
  const [localRightKnob, setLocalRightKnob] = useState({ x: 0, y: 0, pointerId: null as number | null });

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
    const hemiLight = new THREE.HemisphereLight(0x64748b, 0x090d16, 0.72);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xcbd5e1, 0.95);
    dirLight.position.set(14, 26, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 70;
    const d = 22;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    const flashLight = new THREE.PointLight(0xfbbf24, 0, 11);
    flashLight.position.set(0, 2, 0);
    scene.add(flashLight);

    // Build real Zombie Street Map (Asphalt, Crosswalks, Sidewalks, Ruined Houses, Street Lamps)
    const mapHandles = buildZombieStreetMap(scene, ARENA_HALF);
    const loadedTextures = mapHandles.textures;
    const crateMat = mapHandles.crateMat;

    // Tactical Cover Obstacles
    const obstacles: ObstacleBox[] = [
      { x: -6.5, z: -6.5, halfW: 1.1, halfD: 1.1 },
      { x: 6.5, z: -6.5, halfW: 1.1, halfD: 1.1 },
      { x: -6.5, z: 6.5, halfW: 1.1, halfD: 1.1 },
      { x: 6.5, z: 6.5, halfW: 1.1, halfD: 1.1 },
      { x: 0, z: -9, halfW: 1.8, halfD: 0.8 },
      { x: 0, z: 9, halfW: 1.8, halfD: 0.8 },
    ];
    const crateTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: 0.35,
    });
    const obstacleMeshes: THREE.Object3D[] = [];
    for (const box of obstacles) {
      const holder = new THREE.Group();
      holder.position.set(box.x, 0, box.z);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(box.halfW * 2, 1.4, box.halfD * 2),
        crateMat
      );
      mesh.position.y = 0.7;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(box.halfW * 2 + 0.06, 0.14, box.halfD * 2 + 0.06),
        crateTrimMat
      );
      trim.position.y = 1.32;
      holder.add(mesh, trim);
      scene.add(holder);
      obstacleMeshes.push(holder);
    }

    let loadedAssets: ZombieAssetPack | null = null;
    let isDisposed = false;

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

      const modelHolder = new THREE.Group();
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
      modelHolder.add(body, head, visor);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.65, 0.82, 28),
        new THREE.MeshBasicMaterial({
          color: colorNum,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;

      const weaponGroup = new THREE.Group();
      weaponGroup.position.set(0.38, 1.08, 0.22);
      weaponGroup.add(createDetailedWeaponMesh('pistol'));

      const muzzleFlash = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfde047 })
      );
      muzzleFlash.position.set(0.38, 1.12, 1.05);
      muzzleFlash.visible = false;

      group.add(modelHolder, ring, weaponGroup, muzzleFlash);
      scene.add(group);

      const starterWeapon = getWeaponForLevel(1);
      playerEntities.set(p.id, {
        id: p.id,
        name: p.name,
        color: colorHex,
        isBot: Boolean(p.isBot),
        mesh: group,
        modelHolder,
        weaponGroup,
        muzzleFlash,
        muzzleFlashUntil: 0,
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

    // Load real Poly Haven 3D models & animated Soldier GLB asynchronously
    loadZombieAssets().then((assets) => {
      if (isDisposed) return;
      loadedAssets = assets;

      // Upgrade obstacle cover boxes with real Poly Haven concrete road barriers & barrels
      if (assets.barrier) {
        obstacles.forEach((box, idx) => {
          const old = obstacleMeshes[idx];
          if (old) scene.remove(old);
          const bClone = assets.barrier!.clone();
          const bBox = new THREE.Box3().setFromObject(bClone);
          const bSize = new THREE.Vector3();
          bBox.getSize(bSize);
          const sx = (box.halfW * 2) / Math.max(0.1, bSize.x);
          const sz = (box.halfD * 2) / Math.max(0.1, bSize.z);
          bClone.scale.set(sx, 1.35 / Math.max(0.1, bSize.y), sz);
          bClone.position.set(box.x, 0, box.z);
          scene.add(bClone);
          obstacleMeshes[idx] = bClone;
        });
      }

      if (assets.barrel) {
        const barrelSpots: Array<[number, number]> = [
          [-12, -12], [-10.8, -12.3],
          [12, -12], [11.2, -11],
          [-12, 12], [-11, 11.1],
          [12, 12], [12.3, 10.7],
        ];
        for (const [bx, bz] of barrelSpots) {
          const barrel = assets.barrel.clone();
          barrel.scale.setScalar(1.35);
          barrel.position.set(bx, 0, bz);
          barrel.rotation.y = Math.random() * Math.PI * 2;
          scene.add(barrel);
        }
      }

      // Upgrade player avatars with animated Soldier.glb
      if (assets.soldier) {
        let pIdx = 0;
        for (const p of playerEntities.values()) {
          const colorNum = new THREE.Color(p.color || PLAYER_COLORS[pIdx % PLAYER_COLORS.length]).getHex();
          const animChar = cloneAnimatedCharacter(assets.soldier, {
            scale: 1.08,
            tintHex: colorNum,
          });
          p.modelHolder.clear();
          p.modelHolder.add(animChar.root);
          p.mixer = animChar.mixer;
          p.actions = animChar.actions;
          const idle = animChar.actions['idle'];
          if (idle) {
            idle.play();
            p.activeAnim = 'idle';
          }
          pIdx += 1;
        }
      }
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
    const dyingZombies: Array<{ mesh: THREE.Group; startedAt: number; expiresAt: number }> = [];
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
      const flashMeshes: THREE.Mesh[] = [];
      let mixer: THREE.AnimationMixer | undefined;

      if (loadedAssets?.soldier) {
        const animChar = cloneAnimatedCharacter(loadedAssets.soldier, {
          scale: 1.05 * scale,
          tintHex: baseColor,
          emissiveHex: kind === 'brute' ? 0x581c87 : 0x14532d,
          emissiveIntensity: 0.25,
        });
        group.add(animChar.root);
        flashMeshes.push(...animChar.meshes);
        mixer = animChar.mixer;
        const animName = kind === 'runner' ? 'run' : 'walk';
        const action = animChar.actions[animName] || animChar.actions['walk'] || animChar.actions['idle'];
        if (action) {
          action.timeScale = kind === 'runner' ? 1.35 : kind === 'brute' ? 0.85 : 1.0;
          action.play();
        }
        // Glowing red zombie eyes on head
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.05 * scale, 6, 6), eyeMat);
        leftEye.position.set(-0.08 * scale, 1.72 * scale, 0.14 * scale);
        const rightEye = leftEye.clone();
        rightEye.position.x = 0.08 * scale;
        group.add(leftEye, rightEye);
      } else {
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
        flashMeshes.push(bodyMesh);
      }

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
        flashMeshes,
        mixer,
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
      const modelTemplate = kind === 'medkit' ? loadedAssets?.medkit : loadedAssets?.ammoBox;
      if (modelTemplate) {
        const cloned = modelTemplate.clone();
        cloned.scale.setScalar(1.8);
        cloned.position.y = 0.35;
        group.add(cloned);
      } else {
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
      }
      const glowRing = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.6, 20),
        new THREE.MeshBasicMaterial({
          color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75,
        })
      );
      glowRing.rotation.x = -Math.PI / 2;
      glowRing.position.y = 0.04;
      group.add(glowRing);
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
      for (const fm of z.flashMeshes) {
        const mat = fm.material as THREE.MeshStandardMaterial;
        if (mat?.emissive) {
          mat.emissive.setHex(0xffffff);
          mat.emissiveIntensity = 0.85;
        }
      }

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
              killer.weaponGroup.add(createDetailedWeaponMesh(nextWeapon.id));
              killer.currentWeaponMeshId = nextWeapon.id;
              showBanner(`${killer.name.toUpperCase()} • LVL ${nextLevel}: ${nextWeapon.name.toUpperCase()}!`);
            } else {
              showBanner(`${killer.name.toUpperCase()} • LEVEL ${nextLevel}!`);
            }
          }
        }
        spawnParticles(z.x, 0.9, z.z, z.baseColor, 12);
        if (Math.random() < 0.22) {
          spawnPickup(z.x, z.z, Math.random() < 0.55 ? 'medkit' : 'xp', now);
        }
        dyingZombies.push({
          mesh: z.mesh,
          startedAt: now,
          expiresAt: now + 450,
        });
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

          let inp =
            localPlayerId && p.id === localPlayerId && localInputRef.current
              ? { ...localInputRef.current }
              : inputs.get(p.id) || { moveX: 0, moveY: 0, aimX: 0, aimY: 0, firing: false };
          if (localPlayerId && p.id === localPlayerId && localInputRef.current) {
            localInputRef.current.reload = false;
            localInputRef.current.dash = false;
          }

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

          // Update player skeletal animation (Idle vs Run)
          if (p.mixer && p.actions) {
            const desiredAnim = mLen > 0.12 ? 'run' : 'idle';
            if (p.activeAnim !== desiredAnim) {
              p.actions[p.activeAnim || 'idle']?.fadeOut(0.12);
              p.actions[desiredAnim]?.reset().fadeIn(0.12).play();
              p.activeAnim = desiredAnim;
            }
            p.mixer.update(dt);
          }

          if (p.muzzleFlash.visible && now >= p.muzzleFlashUntil) {
            p.muzzleFlash.visible = false;
          }

          // Smooth weapon recoil recovery
          p.weaponGroup.position.z += (0.22 - p.weaponGroup.position.z) * Math.min(1, dt * 18);

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

              // Recoil kick + muzzle flash + dynamic point light
              p.weaponGroup.position.z = 0.06;
              flashLight.color.setHex(projColor);
              flashLight.position.set(p.x + p.aimX * 1.0, 1.15, p.z + p.aimZ * 1.0);
              flashLight.intensity = 3.2;
              (p.muzzleFlash.material as THREE.MeshBasicMaterial).color.setHex(projColor);
              p.muzzleFlash.scale.setScalar(weapon.id === 'rocket' ? 1.5 : 0.9 + Math.random() * 0.45);
              p.muzzleFlash.visible = true;
              p.muzzleFlashUntil = now + 60;

              // Eject spinning brass shell casing (for ballistic weapons)
              if (weapon.id !== 'plasma' && weapon.id !== 'rocket') {
                const shell = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.03, 0.03, 0.11, 6),
                  new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.2 })
                );
                shell.position.set(p.x + p.aimZ * 0.35, 1.05, p.z - p.aimX * 0.35);
                shell.rotation.set(Math.random(), Math.random(), Math.PI / 2);
                scene.add(shell);
                particles.push({
                  mesh: shell,
                  vx: p.aimZ * (2.2 + Math.random() * 1.4),
                  vy: 2.8 + Math.random() * 1.5,
                  vz: -p.aimX * (2.2 + Math.random() * 1.4),
                  expiresAt: now + 650,
                });
              }

              for (let i = 0; i < weapon.pellets; i++) {
                const spreadOffset = (Math.random() - 0.5) * weapon.spread;
                const ang = baseAngle + spreadOffset;
                const vx = Math.sin(ang) * weapon.projectileSpeed;
                const vz = Math.cos(ang) * weapon.projectileSpeed;

                const projMesh = new THREE.Mesh(
                  weapon.id === 'rocket'
                    ? new THREE.CylinderGeometry(0.11, 0.15, 0.72, 8)
                    : weapon.id === 'plasma'
                      ? new THREE.CylinderGeometry(0.07, 0.07, 0.9, 8)
                      : new THREE.BoxGeometry(0.07, 0.07, 0.95),
                  new THREE.MeshBasicMaterial({
                    color: weapon.id === 'plasma' || weapon.id === 'rocket' ? projColor : 0xfef08a,
                  })
                );
                if (weapon.id === 'rocket' || weapon.id === 'plasma') {
                  projMesh.rotation.x = Math.PI / 2;
                }
                projMesh.position.set(p.x + Math.sin(ang) * 1.05, 1.08, p.z + Math.cos(ang) * 1.05);
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
          if (z.mixer) {
            z.mixer.update(dt);
          }
          if (z.hitFlashUntil > 0 && now >= z.hitFlashUntil) {
            z.hitFlashUntil = 0;
            for (const fm of z.flashMeshes) {
              const mat = fm.material as THREE.MeshStandardMaterial;
              if (mat?.emissive) {
                mat.emissive.setHex(z.kind === 'brute' ? 0x581c87 : loadedAssets?.soldier ? 0x14532d : 0x000000);
                mat.emissiveIntensity = loadedAssets?.soldier ? 0.25 : 0;
              }
            }
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
                    lp.weaponGroup.add(createDetailedWeaponMesh(nw.id));
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

        // Update Dying Zombies (dramatic collapse onto street)
        for (let i = dyingZombies.length - 1; i >= 0; i--) {
          const dz = dyingZombies[i];
          const progress = Math.min(1, (now - dz.startedAt) / 450);
          dz.mesh.rotation.x = -progress * (Math.PI / 2);
          dz.mesh.position.y = Math.max(0.05, 0.25 * (1 - progress));
          if (now >= dz.expiresAt) {
            scene.remove(dz.mesh);
            dyingZombies.splice(i, 1);
          }
        }

        // Flickering Street Lamps
        for (const lamp of mapHandles.lamps) {
          if (!lamp.flicker) continue;
          const waveVal = Math.sin(now * 0.015 + lamp.phase) * Math.sin(now * 0.043 + lamp.phase);
          const isDim = waveVal > 0.65;
          lamp.light.intensity = isDim ? 1.8 : 9.5;
          lamp.bulbMat.color.setHex(isDim ? 0x78350f : 0xfde68a);
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
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    resizeObserver?.observe(container);
    window.addEventListener('resize', onResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(rafId);
      unsubInput();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
      if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
      loadedTextures.forEach((tex) => tex.dispose());
      renderer.dispose();
    };
  }, [players, difficulty, isGameOver, localPlayerId]);

  const computeLocalStick = (
    el: HTMLDivElement | null,
    clientX: number,
    clientY: number
  ): { x: number; y: number } => {
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = Math.max(20, rect.width / 2 - 14);
    let dx = (clientX - cx) / maxR;
    let dy = (clientY - cy) / maxR;
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    return { x: dx, y: dy };
  };

  const updateLocalInput = (patch: Partial<ZombieInputPayload>) => {
    const prev = localInputRef.current || {
      moveX: 0,
      moveY: 0,
      aimX: 0,
      aimY: 0,
      firing: false,
    };
    localInputRef.current = { ...prev, ...patch };
  };

  return (
    <div className="relative h-full w-full flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/15 bg-[#0B1322] shadow-2xl select-none">
      {/* Fullscreen 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {/* Floating Top-Left Wave & Zombie Count */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-[#F59E0B]/55 bg-[#0F172A]/80 px-3 py-1 font-arcade text-xs sm:text-sm text-[#FDE68A] uppercase backdrop-blur-md">
            WELLE {hudOverlay.wave}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#F43F5E]/45 bg-[#0F172A]/80 px-3 py-1 font-arcade text-xs sm:text-sm text-[#FDA4AF] uppercase backdrop-blur-md">
            <Skull className="h-3.5 w-3.5" />
            <span>{hudOverlay.zombiesRemaining}</span>
          </span>
        </div>

        {!localPlayerId && (
          <span className="font-arcade hidden md:inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0F172A]/75 px-3 py-1 text-[11px] text-[#94A3B8] uppercase backdrop-blur-md">
            <Crosshair className="h-3.5 w-3.5 text-[#38BDF8]" />
            <span>SMARTPHONE ALS CONTROLLER NUTZEN</span>
          </span>
        )}
      </div>

      {/* Level-Up / Wave Banner */}
      {bannerText && (
        <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-30 animate-bounce">
          <div className="flex items-center gap-2 rounded-2xl border border-[#FBBF24]/70 bg-[#0F172A]/90 px-4 py-2 shadow-xl backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-[#FBBF24]" />
            <span className="font-arcade text-xs sm:text-base text-[#FDE68A] uppercase tracking-wider whitespace-nowrap">
              {bannerText}
            </span>
          </div>
        </div>
      )}

      {/* Floating Bottom Player Strip */}
      <div
        className={`pointer-events-none absolute bottom-2 left-3 right-3 z-20 flex flex-wrap items-end justify-center gap-2 ${
          localPlayerId ? 'px-32 sm:px-40' : ''
        }`}
      >
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
                className={`flex min-w-[140px] max-w-[200px] flex-1 flex-col gap-1 rounded-xl border px-2.5 py-1.5 backdrop-blur-md transition-all ${
                  hud && !hud.alive
                    ? 'border-[#EF4444]/40 bg-[#0F172A]/70 opacity-55'
                    : 'border-white/15 bg-[#0F172A]/78'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-arcade truncate text-[11px] text-white uppercase">
                      {p.name}
                    </span>
                  </div>
                  <span className="font-arcade shrink-0 rounded bg-[#F59E0B]/25 px-1.5 py-0.5 text-[9px] text-[#FDE68A]">
                    LVL {level}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Heart className="h-2.5 w-2.5 shrink-0 text-[#FB7185]" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full transition-all duration-150"
                      style={{
                        width: `${hpPct}%`,
                        backgroundColor: hpPct <= 30 ? '#EF4444' : '#10B981',
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Zap className="h-2.5 w-2.5 shrink-0 text-[#38BDF8]" />
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-[#38BDF8] transition-all duration-150"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] font-arcade text-[#CBD5E1] uppercase">
                  <span className="truncate" style={{ color: weapon.color }}>
                    {hud && !hud.alive ? 'BESIEGT' : weapon.shortName}
                  </span>
                  <span className="text-[#FDE68A]">{hud?.kills || 0} KILLS</span>
                </div>
              </div>
            );
          })}
      </div>

      {/* Standalone Smartphone Touch Controls (only when played without TV) */}
      {localPlayerId && (
        <>
          <div
            ref={localLeftPadRef}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const off = computeLocalStick(localLeftPadRef.current, e.clientX, e.clientY);
              setLocalLeftKnob({ x: off.x, y: off.y, pointerId: e.pointerId });
              updateLocalInput({ moveX: off.x, moveY: off.y });
            }}
            onPointerMove={(e) => {
              if (localLeftKnob.pointerId !== e.pointerId) return;
              const off = computeLocalStick(localLeftPadRef.current, e.clientX, e.clientY);
              setLocalLeftKnob({ x: off.x, y: off.y, pointerId: e.pointerId });
              updateLocalInput({ moveX: off.x, moveY: off.y });
            }}
            onPointerUp={(e) => {
              if (localLeftKnob.pointerId !== e.pointerId) return;
              setLocalLeftKnob({ x: 0, y: 0, pointerId: null });
              updateLocalInput({ moveX: 0, moveY: 0 });
            }}
            onPointerCancel={() => {
              setLocalLeftKnob({ x: 0, y: 0, pointerId: null });
              updateLocalInput({ moveX: 0, moveY: 0 });
            }}
            className="absolute bottom-3 left-3 z-30 flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#38BDF8]/50 bg-[#0F172A]/45 backdrop-blur-sm touch-none"
          >
            <div
              className="h-11 w-11 rounded-full bg-[#38BDF8]/85 shadow-lg"
              style={{ transform: `translate(${localLeftKnob.x * 30}px, ${localLeftKnob.y * 30}px)` }}
            />
          </div>

          <div
            ref={localRightPadRef}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const off = computeLocalStick(localRightPadRef.current, e.clientX, e.clientY);
              setLocalRightKnob({ x: off.x, y: off.y, pointerId: e.pointerId });
              updateLocalInput({ aimX: off.x, aimY: off.y, firing: Math.hypot(off.x, off.y) > 0.25 });
            }}
            onPointerMove={(e) => {
              if (localRightKnob.pointerId !== e.pointerId) return;
              const off = computeLocalStick(localRightPadRef.current, e.clientX, e.clientY);
              setLocalRightKnob({ x: off.x, y: off.y, pointerId: e.pointerId });
              updateLocalInput({ aimX: off.x, aimY: off.y, firing: Math.hypot(off.x, off.y) > 0.25 });
            }}
            onPointerUp={(e) => {
              if (localRightKnob.pointerId !== e.pointerId) return;
              setLocalRightKnob({ x: 0, y: 0, pointerId: null });
              updateLocalInput({ aimX: 0, aimY: 0, firing: false });
            }}
            onPointerCancel={() => {
              setLocalRightKnob({ x: 0, y: 0, pointerId: null });
              updateLocalInput({ aimX: 0, aimY: 0, firing: false });
            }}
            className="absolute bottom-3 right-3 z-30 flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#F43F5E]/55 bg-[#0F172A]/45 backdrop-blur-sm touch-none"
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F43F5E]/85 text-white shadow-lg"
              style={{ transform: `translate(${localRightKnob.x * 30}px, ${localRightKnob.y * 30}px)` }}
            >
              <Crosshair className="h-5 w-5" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => updateLocalInput({ dash: true })}
            className="absolute bottom-34 right-5 z-30 rounded-xl border border-[#38BDF8]/60 bg-[#0F172A]/75 px-3 py-1.5 font-arcade text-[10px] text-[#7DD3FC] backdrop-blur-sm active:scale-95"
          >
            DASH
          </button>
        </>
      )}

      {hudOverlay.players.length > 0 && hudOverlay.players.every((p) => !p.alive) && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-2xl border border-[#EF4444]/60 bg-[#0F172A]/90 px-5 py-3 font-arcade text-sm text-[#FDA4AF] uppercase backdrop-blur-md">
            <ShieldAlert className="h-5 w-5" />
            <span>ALLE SPIELER WURDEN ÜBERRANNT...</span>
          </div>
        </div>
      )}
    </div>
  );
}
