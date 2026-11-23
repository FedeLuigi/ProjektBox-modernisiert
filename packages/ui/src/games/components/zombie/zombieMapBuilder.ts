import * as THREE from 'three';
import floorDiffUrl from '../../../assets/textures/zombie/floor_diff.jpg';
import floorRoughUrl from '../../../assets/textures/zombie/floor_rough.jpg';
import floorNorUrl from '../../../assets/textures/zombie/floor_nor.jpg';
import wallDiffUrl from '../../../assets/textures/zombie/wall_diff.jpg';
import wallRoughUrl from '../../../assets/textures/zombie/wall_rough.jpg';
import wallNorUrl from '../../../assets/textures/zombie/wall_nor.jpg';
import ruinDiffUrl from '../../../assets/textures/zombie/ruin_diff.jpg';
import ruinRoughUrl from '../../../assets/textures/zombie/ruin_rough.jpg';
import ruinNorUrl from '../../../assets/textures/zombie/ruin_nor.jpg';
import plankDiffUrl from '../../../assets/textures/zombie/plank_diff.jpg';
import plankRoughUrl from '../../../assets/textures/zombie/plank_rough.jpg';
import plankNorUrl from '../../../assets/textures/zombie/plank_nor.jpg';
import crateDiffUrl from '../../../assets/textures/zombie/crate_diff.jpg';
import crateRoughUrl from '../../../assets/textures/zombie/crate_rough.jpg';
import crateNorUrl from '../../../assets/textures/zombie/crate_nor.jpg';

export interface StreetLampHandle {
  light: THREE.PointLight;
  bulbMat: THREE.MeshBasicMaterial;
  flicker: boolean;
  phase: number;
}

export interface AlleySpawnPoint {
  x: number;
  z: number;
  jitterX: number;
  jitterZ: number;
}

export const ZOMBIE_ALLEY_SPAWNS: AlleySpawnPoint[] = [
  { x: 0, z: -22.5, jitterX: 2.2, jitterZ: 1.5 },   // Nord-Gasse (Hauptstraße)
  { x: 0, z: 22.5, jitterX: 2.2, jitterZ: 1.5 },    // Süd-Gasse (Hauptstraße)
  { x: -22.5, z: 0, jitterX: 1.5, jitterZ: 2.2 },   // West-Gasse
  { x: 22.5, z: 0, jitterX: 1.5, jitterZ: 2.2 },    // Ost-Gasse
  { x: -13.5, z: -21.5, jitterX: 1.0, jitterZ: 1.5 }, // Nordwest-Seitengasse
  { x: 13.5, z: -21.5, jitterX: 1.0, jitterZ: 1.5 },  // Nordost-Seitengasse
];

export interface ZombieMapHandles {
  textures: THREE.Texture[];
  lamps: StreetLampHandle[];
  crateMat: THREE.MeshStandardMaterial;
}

export function buildZombieStreetMap(
  scene: THREE.Scene,
  arenaHalf: number
): ZombieMapHandles {
  const loader = new THREE.TextureLoader();
  const textures: THREE.Texture[] = [];

  const loadPbr = (
    diffUrl: string,
    roughUrl: string,
    norUrl: string,
    rx: number,
    ry: number
  ) => {
    const setup = (url: string, isColor: boolean) => {
      const tex = loader.load(url);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(rx, ry);
      if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
      textures.push(tex);
      return tex;
    };
    return {
      map: setup(diffUrl, true),
      roughnessMap: setup(roughUrl, false),
      normalMap: setup(norUrl, false),
    };
  };

  const floorTex = loadPbr(floorDiffUrl, floorRoughUrl, floorNorUrl, 12, 12);
  const brickTex = loadPbr(wallDiffUrl, wallRoughUrl, wallNorUrl, 2, 2);
  const ruinTex = loadPbr(ruinDiffUrl, ruinRoughUrl, ruinNorUrl, 3, 2);
  const plankTex = loadPbr(plankDiffUrl, plankRoughUrl, plankNorUrl, 1, 1);
  const crateTex = loadPbr(crateDiffUrl, crateRoughUrl, crateNorUrl, 1, 1);

  // 1. Wide Continuous City Asphalt (stretches into the dark alleys & fog)
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({
      map: floorTex.map,
      roughnessMap: floorTex.roughnessMap,
      normalMap: floorTex.normalMap,
      color: 0x94a3b8,
      roughness: 0.92,
      metalness: 0.08,
    })
  );
  street.rotation.x = -Math.PI / 2;
  street.receiveShadow = true;
  scene.add(street);

  // Crossroads dashed yellow center lines (North-South & East-West streets!)
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.85,
    transparent: true,
    opacity: 0.5,
  });
  for (let d = -26; d <= 26; d += 3.2) {
    if (Math.abs(d) < 5.5) continue; // keep center intersection open
    const nsDash = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 1.5), stripeMat);
    nsDash.rotation.x = -Math.PI / 2;
    nsDash.position.set(0, 0.02, d);
    nsDash.receiveShadow = true;
    scene.add(nsDash);

    const ewDash = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.26), stripeMat);
    ewDash.rotation.x = -Math.PI / 2;
    ewDash.position.set(d, 0.02, 0);
    ewDash.receiveShadow = true;
    scene.add(ewDash);
  }

  // Faded crosswalks leading into each of the 4 main alleys
  const whiteLineMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.85,
    transparent: true,
    opacity: 0.32,
  });
  for (const cz of [-10.5, 10.5]) {
    for (let cx = -3.8; cx <= 3.8; cx += 1.9) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 2.1), whiteLineMat);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(cx, 0.025, cz);
      bar.receiveShadow = true;
      scene.add(bar);
    }
  }
  for (const cx of [-10.5, 10.5]) {
    for (let cz = -3.8; cz <= 3.8; cz += 1.9) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.75), whiteLineMat);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(cx, 0.025, cz);
      bar.receiveShadow = true;
      scene.add(bar);
    }
  }

  // 2. 4 Corner City Block Sidewalks (creating natural open streets & alleys between them!)
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: ruinTex.map,
    roughnessMap: ruinTex.roughnessMap,
    normalMap: ruinTex.normalMap,
    color: 0x94a3b8,
    roughness: 0.9,
  });
  const cornerBlocks: Array<[number, number, number, number]> = [
    [-19, -19, 17, 17], // NW corner block
    [19, -19, 17, 17],  // NE corner block
    [-19, 19, 17, 17],  // SW corner block
    [19, 19, 17, 17],   // SE corner block
  ];
  for (const [bx, bz, bw, bd] of cornerBlocks) {
    const swMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.24, bd), sidewalkMat);
    swMesh.position.set(bx, 0.12, bz);
    swMesh.receiveShadow = true;
    scene.add(swMesh);
  }

  // 3. Ruined City Houses on the 4 Corner Blocks (leaving open alleys between buildings!)
  const brickBuildingMat = new THREE.MeshStandardMaterial({
    map: brickTex.map,
    roughnessMap: brickTex.roughnessMap,
    normalMap: brickTex.normalMap,
    color: 0xa8a29e,
    roughness: 0.9,
  });
  const ruinBuildingMat = new THREE.MeshStandardMaterial({
    map: ruinTex.map,
    roughnessMap: ruinTex.roughnessMap,
    normalMap: ruinTex.normalMap,
    color: 0x94a3b8,
    roughness: 0.92,
  });
  const plankMat = new THREE.MeshStandardMaterial({
    map: plankTex.map,
    roughnessMap: plankTex.roughnessMap,
    normalMap: plankTex.normalMap,
    color: 0xc29b70,
    roughness: 0.85,
  });
  const darkWindowMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.4,
  });
  const eerieWindowMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.3,
  });

  const buildings: Array<{
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    useBrick: boolean;
  }> = [
    // NW Block (leaves North Alley x=0, West Alley z=0, and NW Side Alley x=-13.5 open!)
    { x: -7.5, z: -18.5, w: 6.2, d: 7.5, h: 8.4, useBrick: true },
    { x: -19.5, z: -12.5, w: 7.5, d: 6.4, h: 7.2, useBrick: false },
    { x: -20.0, z: -21.0, w: 8.5, d: 7.0, h: 9.6, useBrick: true },
    // NE Block (leaves North Alley x=0, East Alley z=0, and NE Side Alley x=13.5 open!)
    { x: 7.5, z: -18.5, w: 6.2, d: 7.5, h: 7.6, useBrick: false },
    { x: 19.5, z: -12.5, w: 7.5, d: 6.4, h: 8.8, useBrick: true },
    { x: 20.0, z: -21.0, w: 8.5, d: 7.0, h: 6.9, useBrick: false },
    // SW Block (leaves South Alley x=0 & West Alley z=0 open!)
    { x: -8.5, z: 18.5, w: 7.2, d: 7.0, h: 7.4, useBrick: false },
    { x: -19.5, z: 12.5, w: 7.5, d: 6.5, h: 8.0, useBrick: true },
    // SE Block (leaves South Alley x=0 & East Alley z=0 open!)
    { x: 8.5, z: 18.5, w: 7.2, d: 7.0, h: 8.2, useBrick: true },
    { x: 19.5, z: 12.5, w: 7.5, d: 6.5, h: 6.8, useBrick: false },
  ];

  for (let bi = 0; bi < buildings.length; bi++) {
    const b = buildings[bi];
    const bGroup = new THREE.Group();
    bGroup.position.set(b.x, 0, b.z);
    const mat = b.useBrick ? brickBuildingMat : ruinBuildingMat;

    const main = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
    main.position.y = b.h / 2;
    main.castShadow = true;
    main.receiveShadow = true;
    bGroup.add(main);

    // Jagged broken roof chunks
    for (let c = -1; c <= 1; c += 2) {
      const chunkH = 1.1 + ((bi + c) % 2) * 0.85;
      const chunk = new THREE.Mesh(
        new THREE.BoxGeometry(b.w * 0.36, chunkH, b.d * 0.8),
        mat
      );
      chunk.position.set(c * b.w * 0.27, b.h + chunkH / 2 - 0.1, 0);
      chunk.castShadow = true;
      bGroup.add(chunk);
    }

    // Windows facing inward toward the intersection
    const faceZ = b.z < 0 ? b.d / 2 + 0.04 : -b.d / 2 - 0.04;
    const rotY = b.z < 0 ? 0 : Math.PI;
    for (let floorIdx = 0; floorIdx < 2; floorIdx++) {
      const wy = 2.2 + floorIdx * 2.7;
      if (wy > b.h - 1.1) continue;
      for (const ox of [-1.4, 1.4]) {
        const winGroup = new THREE.Group();
        const isLit = (bi + floorIdx + (ox > 0 ? 1 : 0)) % 4 === 0;
        const winMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(1.3, 1.6),
          isLit ? eerieWindowMat : darkWindowMat
        );
        winGroup.add(winMesh);

        if ((bi + floorIdx) % 2 === 0) {
          for (const pRot of [-0.18, 0.15]) {
            const plank = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.2, 0.08), plankMat);
            plank.rotation.z = pRot;
            plank.position.z = 0.05;
            plank.position.y = pRot > 0 ? 0.28 : -0.25;
            winGroup.add(plank);
          }
        }
        winGroup.position.set(ox, wy, faceZ);
        winGroup.rotation.y = rotY;
        bGroup.add(winGroup);
      }
    }

    // Fallen rubble at street edge
    for (let r = 0; r < 2; r++) {
      const rSize = 0.42 + (r % 2) * 0.3;
      const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(rSize, 0), ruinBuildingMat);
      rubble.position.set((r - 0.5) * 2.2, rSize * 0.45, b.z < 0 ? b.d / 2 + 0.55 : -b.d / 2 - 0.55);
      rubble.rotation.set(r, r * 0.8, 0);
      rubble.castShadow = true;
      bGroup.add(rubble);
    }

    scene.add(bGroup);
  }

  // 4. Street Lamps at the 4 Intersection Corners & Alley Entrances
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.75,
    roughness: 0.35,
  });
  const lamps: StreetLampHandle[] = [];
  const lampPositions: Array<{ x: number; z: number; inwardX: number; flicker: boolean }> = [
    { x: -11.2, z: -11.2, inwardX: 1, flicker: false },
    { x: 11.2, z: -11.2, inwardX: -1, flicker: true },
    { x: -11.2, z: 11.2, inwardX: 1, flicker: true },
    { x: 11.2, z: 11.2, inwardX: -1, flicker: false },
    { x: -arenaHalf + 1.5, z: -5.5, inwardX: 1, flicker: false },
    { x: arenaHalf - 1.5, z: 5.5, inwardX: -1, flicker: false },
  ];

  for (let i = 0; i < lampPositions.length; i++) {
    const lp = lampPositions[i];
    const lampGroup = new THREE.Group();
    lampGroup.position.set(lp.x, 0, lp.z);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.5, 8), poleMat);
    base.position.y = 0.25;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.4, 8), poleMat);
    post.position.y = 2.7;
    post.castShadow = true;

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), poleMat);
    arm.position.set(lp.inwardX * 0.7, 5.3, 0);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.4), poleMat);
    head.position.set(lp.inwardX * 1.35, 5.22, 0);

    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfde68a });
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.26), bulbMat);
    bulb.position.set(lp.inwardX * 1.35, 5.1, 0);

    const light = new THREE.PointLight(0xfbbf24, 10.5, 20, 1.45);
    light.position.set(lp.inwardX * 1.35, 4.85, 0);

    lampGroup.add(base, post, arm, head, bulb, light);
    scene.add(lampGroup);

    lamps.push({
      light,
      bulbMat,
      flicker: lp.flicker,
      phase: i * 1.7,
    });
  }

  const crateMat = new THREE.MeshStandardMaterial({
    map: crateTex.map,
    roughnessMap: crateTex.roughnessMap,
    normalMap: crateTex.normalMap,
    color: 0xe2e8f0,
    roughness: 0.55,
    metalness: 0.65,
  });

  return { textures, lamps, crateMat };
}
