import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface ZombieAssetPack {
  soldier: GLTF | null;
  barrel: THREE.Group | null;
  barrier: THREE.Group | null;
  medkit: THREE.Group | null;
  ammoBox: THREE.Group | null;
}

const loader = new GLTFLoader();

async function loadGltfSafe(url: string): Promise<GLTF | null> {
  try {
    return await loader.loadAsync(url);
  } catch (err) {
    console.warn(`Failed to load 3D model ${url}:`, err);
    return null;
  }
}

function enableShadows(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

let cachedAssetsPromise: Promise<ZombieAssetPack> | null = null;

export function loadZombieAssets(): Promise<ZombieAssetPack> {
  if (cachedAssetsPromise) return cachedAssetsPromise;
  cachedAssetsPromise = (async () => {
    const [soldier, barrelGltf, barrierGltf, medkitGltf, ammoGltf] = await Promise.all([
      loadGltfSafe('/models/zombie/Soldier.glb'),
      loadGltfSafe('/models/zombie/barrel_03/barrel_03_1k.gltf'),
      loadGltfSafe('/models/zombie/concrete_road_barrier/concrete_road_barrier_1k.gltf'),
      loadGltfSafe('/models/zombie/medical_box/medical_box_1k.gltf'),
      loadGltfSafe('/models/zombie/ammo_box/ammo_box_1k.gltf'),
    ]);

    if (soldier) enableShadows(soldier.scene);
    if (barrelGltf) enableShadows(barrelGltf.scene);
    if (barrierGltf) enableShadows(barrierGltf.scene);
    if (medkitGltf) enableShadows(medkitGltf.scene);
    if (ammoGltf) enableShadows(ammoGltf.scene);

    return {
      soldier,
      barrel: barrelGltf ? barrelGltf.scene : null,
      barrier: barrierGltf ? barrierGltf.scene : null,
      medkit: medkitGltf ? medkitGltf.scene : null,
      ammoBox: ammoGltf ? ammoGltf.scene : null,
    };
  })();
  return cachedAssetsPromise;
}

export function cloneAnimatedCharacter(
  gltf: GLTF,
  options: {
    scale: number;
    tintHex?: number;
    emissiveHex?: number;
    emissiveIntensity?: number;
  }
): {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  meshes: THREE.Mesh[];
} {
  const cloned = SkeletonUtils.clone(gltf.scene) as THREE.Group;
  cloned.scale.setScalar(options.scale);
  cloned.rotation.y = Math.PI; // Soldier.glb faces -Z by default; flip to +Z

  const meshes: THREE.Mesh[] = [];
  cloned.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.material) {
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        if (options.tintHex !== undefined) {
          mat.color.lerp(new THREE.Color(options.tintHex), 0.72);
        }
        if (options.emissiveHex !== undefined) {
          mat.emissive.setHex(options.emissiveHex);
          mat.emissiveIntensity = options.emissiveIntensity ?? 0.2;
        }
        mesh.material = mat;
      }
      meshes.push(mesh);
    }
  });

  const wrapper = new THREE.Group();
  wrapper.add(cloned);

  const mixer = new THREE.AnimationMixer(cloned);
  const actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of gltf.animations) {
    actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
  }

  return { root: wrapper, mixer, actions, meshes };
}

export function createDetailedWeaponMesh(weaponId: string): THREE.Group {
  const group = new THREE.Group();
  const gunMetal = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.8,
    roughness: 0.25,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.65,
    roughness: 0.35,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.65,
  });

  if (weaponId === 'pistol') {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 0.38), gunMetal);
    slide.position.set(0, 0.04, 0.18);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.1), darkMetal);
    grip.position.set(0, -0.06, 0.05);
    grip.rotation.x = 0.2;
    const sight = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.03, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    sight.position.set(0, 0.11, 0.32);
    group.add(slide, grip, sight);
  } else if (weaponId === 'smg') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.45), darkMetal);
    receiver.position.set(0, 0.02, 0.2);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 8), gunMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, 0.52);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.08), gunMetal);
    mag.position.set(0, -0.14, 0.25);
    mag.rotation.x = 0.15;
    group.add(receiver, barrel, mag);
  } else if (weaponId === 'shotgun') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.42), darkMetal);
    receiver.position.set(0, 0.02, 0.18);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.58, 8), gunMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 0.55);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.48, 8), gunMetal);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, -0.01, 0.5);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.24), woodMat);
    pump.position.set(0, -0.02, 0.46);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.26), woodMat);
    stock.position.set(0, -0.02, -0.1);
    group.add(receiver, barrel, tube, pump, stock);
  } else if (weaponId === 'rifle') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.52), gunMetal);
    receiver.position.set(0, 0.02, 0.22);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.46, 8), darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, 0.68);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.26), darkMetal);
    stock.position.set(0, 0.0, -0.14);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.09), darkMetal);
    mag.position.set(0, -0.13, 0.26);
    const optic = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.08, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0x6d28d9, emissiveIntensity: 0.7 })
    );
    optic.position.set(0, 0.13, 0.2);
    group.add(receiver, barrel, stock, mag, optic);
  } else if (weaponId === 'plasma') {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.78), darkMetal);
    chassis.position.set(0, 0.02, 0.34);
    const coilMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.6,
    });
    const coil1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.48), coilMat);
    coil1.position.set(0, 0.09, 0.42);
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.18, 10), coilMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.03, 0.78);
    group.add(chassis, coil1, muzzle);
  } else {
    // rocket launcher
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.1, 12), gunMetal);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.08, 0.32);
    const warhead = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.24, 12),
      new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 0.9,
      })
    );
    warhead.rotation.x = Math.PI / 2;
    warhead.position.set(0, 0.08, 0.95);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), darkMetal);
    grip.position.set(0, -0.08, 0.3);
    group.add(tube, warhead, grip);
  }

  return group;
}
