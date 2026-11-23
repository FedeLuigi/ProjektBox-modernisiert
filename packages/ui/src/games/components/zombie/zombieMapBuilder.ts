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

  const floorTex = loadPbr(floorDiffUrl, floorRoughUrl, floorNorUrl, 9, 9);
  const brickTex = loadPbr(wallDiffUrl, wallRoughUrl, wallNorUrl, 2, 2);
  const ruinTex = loadPbr(ruinDiffUrl, ruinRoughUrl, ruinNorUrl, 3, 2);
  const plankTex = loadPbr(plankDiffUrl, plankRoughUrl, plankNorUrl, 1, 1);
  const crateTex = loadPbr(crateDiffUrl, crateRoughUrl, crateNorUrl, 1, 1);

  // 1. Asphalt Street Floor
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(arenaHalf * 2 + 24, arenaHalf * 2 + 24),
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

  // Dashed yellow street center markings
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.85,
    transparent: true,
    opacity: 0.55,
  });
  for (let z = -arenaHalf + 1.5; z <= arenaHalf - 1.5; z += 3.2) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 1.6), stripeMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.02, z);
    dash.receiveShadow = true;
    scene.add(dash);
  }

  // Faded white crosswalks at North & South street ends
  const whiteLineMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.85,
    transparent: true,
    opacity: 0.35,
  });
  for (const cz of [-arenaHalf + 2.2, arenaHalf - 2.2]) {
    for (let cx = -11; cx <= 11; cx += 2.2) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.2), whiteLineMat);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(cx, 0.025, cz);
      bar.receiveShadow = true;
      scene.add(bar);
    }
  }

  // 2. Concrete Sidewalks framing the arena
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: ruinTex.map,
    roughnessMap: ruinTex.roughnessMap,
    normalMap: ruinTex.normalMap,
    color: 0x94a3b8,
    roughness: 0.9,
  });
  const sidewalkSpecs: Array<[number, number, number, number]> = [
    [0, -arenaHalf - 2.6, arenaHalf * 2 + 12, 4.6],
    [0, arenaHalf + 2.6, arenaHalf * 2 + 12, 4.6],
    [-arenaHalf - 2.6, 0, 4.6, arenaHalf * 2 + 12],
    [arenaHalf + 2.6, 0, 4.6, arenaHalf * 2 + 12],
  ];
  for (const [sx, sz, sw, sd] of sidewalkSpecs) {
    const swMesh = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.24, sd), sidewalkMat);
    swMesh.position.set(sx, 0.12, sz);
    swMesh.receiveShadow = true;
    scene.add(swMesh);
  }

  // Low damaged curb / perimeter wall
  const curbMat = new THREE.MeshStandardMaterial({
    map: brickTex.map,
    roughnessMap: brickTex.roughnessMap,
    normalMap: brickTex.normalMap,
    color: 0x94a3b8,
    roughness: 0.88,
  });
  const curbSpecs: Array<[number, number, number, number]> = [
    [0, -arenaHalf - 0.35, arenaHalf * 2 + 1.0, 0.7],
    [0, arenaHalf + 0.35, arenaHalf * 2 + 1.0, 0.7],
    [-arenaHalf - 0.35, 0, 0.7, arenaHalf * 2 + 1.0],
    [arenaHalf + 0.35, 0, 0.7, arenaHalf * 2 + 1.0],
  ];
  for (const [wx, wz, ww, wd] of curbSpecs) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.55, wd), curbMat);
    curb.position.set(wx, 0.275, wz);
    curb.castShadow = true;
    curb.receiveShadow = true;
    scene.add(curb);
  }

  // 3. Ruined City Houses / Buildings around the perimeter
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
    opacity: 0.32,
  });

  const buildings: Array<{
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    rotY: number;
    useBrick: boolean;
  }> = [
    // North street row
    { x: -11, z: -20.5, w: 9.5, d: 6.5, h: 7.2, rotY: 0, useBrick: true },
    { x: 0.5, z: -21.2, w: 10.5, d: 7, h: 9.0, rotY: 0, useBrick: false },
    { x: 12, z: -20.4, w: 9, d: 6.5, h: 6.5, rotY: 0, useBrick: true },
    // West street row
    { x: -20.8, z: -10, w: 6.5, d: 9.5, h: 8.2, rotY: Math.PI / 2, useBrick: false },
    { x: -20.5, z: 2, w: 6.5, d: 10, h: 6.8, rotY: Math.PI / 2, useBrick: true },
    { x: -21, z: 12.5, w: 6.5, d: 8, h: 7.5, rotY: Math.PI / 2, useBrick: false },
    // East street row
    { x: 20.8, z: -9.5, w: 6.5, d: 9.5, h: 7.4, rotY: -Math.PI / 2, useBrick: true },
    { x: 20.5, z: 2.5, w: 6.5, d: 10, h: 8.8, rotY: -Math.PI / 2, useBrick: false },
    { x: 21, z: 12.5, w: 6.5, d: 8, h: 6.2, rotY: -Math.PI / 2, useBrick: true },
  ];

  for (let bi = 0; bi < buildings.length; bi++) {
    const b = buildings[bi];
    const bGroup = new THREE.Group();
    bGroup.position.set(b.x, 0, b.z);
    const mat = b.useBrick ? brickBuildingMat : ruinBuildingMat;

    // Main ruined structure
    const main = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
    main.position.y = b.h / 2;
    main.castShadow = true;
    main.receiveShadow = true;
    bGroup.add(main);

    // Jagged broken roof parapet chunks (gives unmistakable ruined silhouette)
    for (let c = -1; c <= 1; c += 2) {
      const chunkH = 1.2 + ((bi + c) % 2) * 0.9;
      const chunk = new THREE.Mesh(
        new THREE.BoxGeometry(b.w * 0.36, chunkH, b.d * 0.82),
        mat
      );
      chunk.position.set(c * b.w * 0.28, b.h + chunkH / 2 - 0.1, 0);
      chunk.castShadow = true;
      bGroup.add(chunk);
    }

    // Windows facing the street with wooden planks
    const faceZ = b.rotY === 0 ? b.d / 2 + 0.04 : 0;
    const faceX = b.rotY === Math.PI / 2 ? b.w / 2 + 0.04 : b.rotY === -Math.PI / 2 ? -b.w / 2 - 0.04 : 0;
    const isSide = b.rotY !== 0;

    for (let floorIdx = 0; floorIdx < 2; floorIdx++) {
      const wy = 2.2 + floorIdx * 2.8;
      if (wy > b.h - 1.1) continue;
      for (const offset of [-2.2, 2.2]) {
        const winGroup = new THREE.Group();
        const isLit = (bi + floorIdx + (offset > 0 ? 1 : 0)) % 4 === 0;
        const winMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(1.4, 1.7),
          isLit ? eerieWindowMat : darkWindowMat
        );
        winGroup.add(winMesh);

        // Boarded-up wooden planks across broken windows
        if ((bi + floorIdx) % 2 === 0) {
          for (const pRot of [-0.18, 0.14]) {
            const plank = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.22, 0.08), plankMat);
            plank.rotation.z = pRot;
            plank.position.z = 0.05;
            plank.position.y = pRot > 0 ? 0.3 : -0.25;
            winGroup.add(plank);
          }
        }

        if (isSide) {
          winGroup.position.set(faceX, wy, offset);
          winGroup.rotation.y = b.rotY;
        } else {
          winGroup.position.set(offset, wy, faceZ);
        }
        bGroup.add(winGroup);
      }
    }

    // Fallen rubble chunks at building base
    for (let r = 0; r < 3; r++) {
      const rSize = 0.45 + (r % 2) * 0.35;
      const rubble = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rSize, 0),
        ruinBuildingMat
      );
      rubble.position.set(
        (r - 1) * 2.1,
        rSize * 0.45,
        isSide ? 0 : b.d / 2 + 0.65
      );
      rubble.rotation.set(r, r * 0.7, 0);
      rubble.castShadow = true;
      bGroup.add(rubble);
    }

    scene.add(bGroup);
  }

  // 4. Street Lamps with Warm PointLights & Flickering
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.75,
    roughness: 0.35,
  });
  const lamps: StreetLampHandle[] = [];
  const lampPositions: Array<{ x: number; z: number; inwardX: number; flicker: boolean }> = [
    { x: -16.2, z: -11, inwardX: 1, flicker: false },
    { x: -16.2, z: 0, inwardX: 1, flicker: true },
    { x: -16.2, z: 11, inwardX: 1, flicker: false },
    { x: 16.2, z: -11, inwardX: -1, flicker: true },
    { x: 16.2, z: 0, inwardX: -1, flicker: false },
    { x: 16.2, z: 11, inwardX: -1, flicker: false },
  ];

  for (let i = 0; i < lampPositions.length; i++) {
    const lp = lampPositions[i];
    const lampGroup = new THREE.Group();
    lampGroup.position.set(lp.x, 0, lp.z);

    // Base & Tall Post
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.5, 8), poleMat);
    base.position.y = 0.25;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.6, 8), poleMat);
    post.position.y = 2.8;
    post.castShadow = true;

    // Overhang Arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.12), poleMat);
    arm.position.set(lp.inwardX * 0.75, 5.5, 0);

    // Lamp Head & Glowing Bulb
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.2, 0.42), poleMat);
    head.position.set(lp.inwardX * 1.45, 5.42, 0);

    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfde68a });
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.28), bulbMat);
    bulb.position.set(lp.inwardX * 1.45, 5.3, 0);

    const light = new THREE.PointLight(0xfbbf24, 9.5, 19, 1.5);
    light.position.set(lp.inwardX * 1.45, 5.0, 0);

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
