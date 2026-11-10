import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

interface SplashScreenProps {
  onFinish?: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [logoOpacity, setLogoOpacity] = useState(0);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Sofortiges Überspringen bei Klick oder Touch
  const handleSkip = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    setTimeout(() => {
      onFinishRef.current?.();
    }, 250);
  };

  useEffect(() => {
    let isDisposed = false;
    let animFrameId: number | null = null;
    let timeoutLogo: ReturnType<typeof setTimeout> | null = null;
    let timeoutFade: ReturnType<typeof setTimeout> | null = null;
    let timeoutFinish: ReturnType<typeof setTimeout> | null = null;

    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const aspect = width / height;

    // 1. Szene & Responsive Kamera (angepasster Bildwinkel für Smartphones & Desktop)
    const scene = new THREE.Scene();
    const fov = aspect < 1 ? 52 : 40;
    const cameraZ = aspect < 1 ? 5.6 : 4.8;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 50);
    camera.position.set(0, 0.7, cameraZ);
    camera.lookAt(0, 0.25, 0);

    // 2. Renderer mit max. Pixel-Ratio 2
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.className = 'w-full h-full block pointer-events-none';
    container.appendChild(renderer.domElement);

    // 3. Licht-Setup: Ambient + Key-Light + farbige Rim-Lights
    const ambientLight = new THREE.AmbientLight(0x282245, 1.5);
    scene.add(ambientLight);

    // Weißes Key-Light für Glanzlichter
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(3.5, 5, 4);
    scene.add(keyLight);

    // Magenta/Pinkes Rim-Light von oben/hinten
    const rimLight1 = new THREE.PointLight(0xd946ef, 5.0, 14);
    rimLight1.position.set(-3.5, 3.2, -2);
    scene.add(rimLight1);

    // Türkises/Cyanes Rim-Light von rechts/unten
    const rimLight2 = new THREE.PointLight(0x38bdf8, 4.5, 14);
    rimLight2.position.set(3.5, -1.8, -1);
    scene.add(rimLight2);

    // Warmes violettes Frontallicht
    const frontLight = new THREE.PointLight(0x8b5cf6, 2.6, 10);
    frontLight.position.set(0, -1.5, 3);
    scene.add(frontLight);

    // ─── 4. 3D-MODELLE IM CODE ZUSAMMENSETZEN ───

    // A) DIE 3D-SPIELEBOX
    const boxGroup = new THREE.Group();
    scene.add(boxGroup);

    // Haupt-Boxkörper mit abgerundeten Kanten
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x121026,
      roughness: 0.22,
      metalness: 0.38,
      emissive: 0x3b1d75,
      emissiveIntensity: 0.25,
    });
    const boxBodyGeo = new RoundedBoxGeometry(2.3, 1.35, 2.3, 4, 0.12);
    const boxBody = new THREE.Mesh(boxBodyGeo, boxMat);
    boxGroup.add(boxBody);

    // Innenkante der Box (leuchtender violetter Neon-Rahmen)
    const innerRimGeo = new RoundedBoxGeometry(2.18, 0.15, 2.18, 3, 0.06);
    const innerRimMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed,
      roughness: 0.25,
      metalness: 0.5,
      emissive: 0x9333ea,
      emissiveIntensity: 0.7,
    });
    const innerRim = new THREE.Mesh(innerRimGeo, innerRimMat);
    innerRim.position.y = 0.64;
    boxGroup.add(innerRim);

    // Canvas-Textur für das Deckel-Logo generieren
    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = 512;
    logoCanvas.height = 512;
    const lCtx = logoCanvas.getContext('2d');
    if (lCtx) {
      lCtx.fillStyle = '#16142e';
      lCtx.fillRect(0, 0, 512, 512);

      // Neon-Rand
      lCtx.strokeStyle = '#a855f7';
      lCtx.lineWidth = 14;
      lCtx.strokeRect(30, 30, 452, 452);

      // Controller-Grafik
      lCtx.fillStyle = '#38bdf8';
      lCtx.beginPath();
      lCtx.roundRect(140, 160, 232, 120, [40]);
      lCtx.fill();

      // Buttons & Steuerkreuz
      lCtx.fillStyle = '#0f172a';
      lCtx.fillRect(175, 195, 45, 16);
      lCtx.fillRect(190, 180, 16, 45);
      lCtx.beginPath();
      lCtx.arc(310, 205, 11, 0, Math.PI * 2);
      lCtx.arc(335, 225, 11, 0, Math.PI * 2);
      lCtx.fill();

      // Schriftzug
      lCtx.fillStyle = '#ffffff';
      lCtx.font = '900 52px system-ui, -apple-system, sans-serif';
      lCtx.textAlign = 'center';
      lCtx.fillText('SPIELBOX', 256, 360);
    }
    const logoTexture = new THREE.CanvasTexture(logoCanvas);

    // Deckel an Scharnier-Achse montieren (hinten oben an der Box)
    const lidHinge = new THREE.Group();
    lidHinge.position.set(0, 0.68, -1.15);
    boxGroup.add(lidHinge);

    const lidGeo = new RoundedBoxGeometry(2.4, 0.26, 2.4, 4, 0.12);
    const lidMat = new THREE.MeshStandardMaterial({
      color: 0x161430,
      roughness: 0.2,
      metalness: 0.42,
      emissive: 0x4c1d95,
      emissiveIntensity: 0.3,
      map: logoTexture,
    });
    const lidMesh = new THREE.Mesh(lidGeo, lidMat);
    lidMesh.position.set(0, 0.13, 1.2);
    lidHinge.add(lidMesh);

    // B) WÜRFEL MIT AUGEN (Mehrteilig)
    const diceGroup = new THREE.Group();
    const diceBaseGeo = new RoundedBoxGeometry(0.58, 0.58, 0.58, 4, 0.08);
    const diceMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.4,
      emissive: 0x1e1b4b,
      emissiveIntensity: 0.35,
    });
    const diceMesh = new THREE.Mesh(diceBaseGeo, diceMat);
    diceGroup.add(diceMesh);

    // Augen (Pips) mit hellem Neon-Cyan
    const pipGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16);
    const pipMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.95,
      roughness: 0.15,
    });

    const addPip = (x: number, y: number, z: number, rotX = 0, rotY = 0, rotZ = 0) => {
      const pip = new THREE.Mesh(pipGeo, pipMat);
      pip.position.set(x, y, z);
      pip.rotation.set(rotX, rotY, rotZ);
      diceGroup.add(pip);
    };

    // 1 (vorne Z+)
    addPip(0, 0, 0.295, Math.PI / 2, 0, 0);
    // 6 (hinten Z-)
    for (let r = -1; r <= 1; r++) {
      addPip(-0.15, r * 0.15, -0.295, Math.PI / 2, 0, 0);
      addPip(0.15, r * 0.15, -0.295, Math.PI / 2, 0, 0);
    }
    // 2 (oben Y+)
    addPip(-0.15, 0.295, -0.15);
    addPip(0.15, 0.295, 0.15);
    scene.add(diceGroup);

    // C) SPIELSTEIN (SCHEIBE MIT RAND & METALL-RING)
    const chipGroup = new THREE.Group();
    const chipCoreGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 32);
    const chipCoreMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      roughness: 0.22,
      metalness: 0.35,
      emissive: 0xbe185d,
      emissiveIntensity: 0.55,
    });
    const chipCore = new THREE.Mesh(chipCoreGeo, chipCoreMat);
    chipGroup.add(chipCore);

    // Erhabener äußerer Rand (Torus)
    const chipRimGeo = new THREE.TorusGeometry(0.4, 0.04, 16, 32);
    const chipRimMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.18,
      metalness: 0.6,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.65,
    });
    const chipRim = new THREE.Mesh(chipRimGeo, chipRimMat);
    chipRim.rotation.x = Math.PI / 2;
    chipGroup.add(chipRim);
    scene.add(chipGroup);

    // D) SPIELFIGUR (LATHEGEOMETRY MIT KRAGEN)
    const pawnGroup = new THREE.Group();
    const pawnPoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.32, 0),
      new THREE.Vector2(0.32, 0.07),
      new THREE.Vector2(0.26, 0.13),
      new THREE.Vector2(0.16, 0.34),
      new THREE.Vector2(0.11, 0.54),
      new THREE.Vector2(0.16, 0.59),
      new THREE.Vector2(0.11, 0.64),
      new THREE.Vector2(0.19, 0.78),
      new THREE.Vector2(0.18, 0.9),
      new THREE.Vector2(0.11, 1.0),
      new THREE.Vector2(0, 1.05),
    ];
    const pawnGeo = new THREE.LatheGeometry(pawnPoints, 32);
    const pawnMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      roughness: 0.2,
      metalness: 0.4,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.45,
    });
    const pawnMesh = new THREE.Mesh(pawnGeo, pawnMat);
    pawnGroup.add(pawnMesh);

    // Leuchtender Halsring
    const collarGeo = new THREE.TorusGeometry(0.15, 0.03, 16, 32);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      metalness: 0.6,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.85,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.rotation.x = Math.PI / 2;
    collarMesh.position.y = 0.59;
    pawnGroup.add(collarMesh);
    scene.add(pawnGroup);

    // E) EXTRUDIERTES "X"
    const xGroup = new THREE.Group();
    const xBarGeo = new RoundedBoxGeometry(0.7, 0.14, 0.11, 3, 0.04);
    const xMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.22,
      metalness: 0.5,
      emissive: 0x0891b2,
      emissiveIntensity: 0.7,
    });
    const xMesh1 = new THREE.Mesh(xBarGeo, xMat);
    xMesh1.rotation.z = Math.PI / 4;
    const xMesh2 = new THREE.Mesh(xBarGeo, xMat);
    xMesh2.rotation.z = -Math.PI / 4;
    xGroup.add(xMesh1);
    xGroup.add(xMesh2);
    scene.add(xGroup);

    // F) EXTRUDIERTES "O" (Ring mit Innenloch)
    const oGroup = new THREE.Group();
    const oShape = new THREE.Shape();
    oShape.absarc(0, 0, 0.35, 0, Math.PI * 2, false);
    const oHole = new THREE.Path();
    oHole.absarc(0, 0, 0.2, 0, Math.PI * 2, true);
    oShape.holes.push(oHole);

    const oGeo = new THREE.ExtrudeGeometry(oShape, {
      depth: 0.11,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 3,
    });
    oGeo.center();
    const oMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.24,
      metalness: 0.45,
      emissive: 0xd97706,
      emissiveIntensity: 0.65,
    });
    const oMesh = new THREE.Mesh(oGeo, oMat);
    oGroup.add(oMesh);
    scene.add(oGroup);

    // Spielfiguren anfangs in der Box verstecken
    const items = [diceGroup, chipGroup, pawnGroup, xGroup, oGroup];
    items.forEach((item) => {
      item.scale.set(0.001, 0.001, 0.001);
      item.position.set(0, 0.2, 0);
    });

    // ─── 5. PARALLAX-INTERAKTION (TOUCH & MAUS) ───
    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let curParallaxX = 0;
    let curParallaxY = 0;

    const onPointerMove = (e: PointerEvent) => {
      targetParallaxX = (e.clientX / window.innerWidth - 0.5) * 0.45;
      targetParallaxY = (e.clientY / window.innerHeight - 0.5) * 0.35;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        targetParallaxX = (touch.clientX / window.innerWidth - 0.5) * 0.45;
        targetParallaxY = (touch.clientY / window.innerHeight - 0.5) * 0.35;
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    const onResize = () => {
      if (!container || isDisposed) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      const newAspect = newW / newH;
      camera.fov = newAspect < 1 ? 52 : 40;
      camera.position.z = newAspect < 1 ? 5.6 : 4.8;
      camera.aspect = newAspect;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', onResize);

    // ─── 6. ABLAUF & ANIMATIONSSCHLEIFE (CA. 4,4 SEKUNDEN) ───
    const startTime = performance.now();

    const renderLoop = (now: number) => {
      if (isDisposed) return;

      const elapsedSec = (now - startTime) / 1000;

      // Parallax sanft interpolieren
      curParallaxX += (targetParallaxX - curParallaxX) * 0.08;
      curParallaxY += (targetParallaxY - curParallaxY) * 0.08;
      camera.position.x = curParallaxX;
      camera.position.y = 0.7 - curParallaxY;
      camera.lookAt(0, 0.25, 0);

      // Phase 1: Box fällt herein & federt ein (0.0s – 0.9s)
      const dropP = Math.min(elapsedSec / 0.9, 1);
      const bounceY =
        dropP >= 1
          ? 0
          : 5.0 * Math.pow(1 - dropP, 2.5) * Math.cos(dropP * Math.PI * 2.5);
      boxGroup.position.y = bounceY;
      boxGroup.rotation.y = -0.32 + Math.sin(elapsedSec * 2.0) * 0.08;
      boxGroup.rotation.x = 0.12 - dropP * 0.08;

      // Phase 2: Deckel klappt nach hinten auf (0.9s – 1.5s)
      if (elapsedSec > 0.9) {
        const lidP = Math.min((elapsedSec - 0.9) / 0.6, 1);
        const lidAngle = -Math.sin(lidP * (Math.PI / 2)) * 2.2;
        lidHinge.rotation.x = lidAngle;
      }

      // Phase 3: Spielfiguren fliegen dynamisch heraus (1.2s – 3.8s)
      if (elapsedSec > 1.2) {
        const flyP = Math.min((elapsedSec - 1.2) / 1.1, 1);
        // Weiche elastische Flugbahn
        const easeOutBack =
          1 + 1.1 * Math.pow(flyP - 1, 3) + 0.7 * Math.pow(flyP - 1, 2);
        const currentScale = Math.min(flyP * 1.05, 1);
        const hover = Math.sin(elapsedSec * 2.5);

        // A) WÜRFEL (links oben)
        diceGroup.scale.setScalar(currentScale * 0.9);
        diceGroup.position.set(
          -1.5 * easeOutBack,
          0.3 + 1.35 * Math.sin(flyP * (Math.PI / 2)) + hover * 0.06,
          0.85 * easeOutBack
        );
        diceGroup.rotation.x += 0.035;
        diceGroup.rotation.y += 0.045;
        diceGroup.rotation.z += 0.025;

        // B) SPIELFIGUR (rechts oben)
        pawnGroup.scale.setScalar(currentScale * 0.85);
        pawnGroup.position.set(
          1.05 * easeOutBack,
          0.3 + 1.65 * Math.sin(flyP * (Math.PI / 2)) + hover * 0.08,
          0.6 * easeOutBack
        );
        pawnGroup.rotation.y += 0.025;
        pawnGroup.rotation.z = Math.sin(elapsedSec * 2.8) * 0.1;

        // C) SPIELSTEIN (links vorne)
        chipGroup.scale.setScalar(currentScale * 0.9);
        chipGroup.position.set(
          -0.95 * easeOutBack,
          0.3 + 0.7 * Math.sin(flyP * (Math.PI / 2)) + hover * 0.05,
          1.5 * easeOutBack
        );
        chipGroup.rotation.x += 0.04;
        chipGroup.rotation.y += 0.035;

        // D) "X" (rechts vorne)
        xGroup.scale.setScalar(currentScale * 0.95);
        xGroup.position.set(
          1.45 * easeOutBack,
          0.3 + 0.8 * Math.sin(flyP * (Math.PI / 2)) - hover * 0.06,
          1.2 * easeOutBack
        );
        xGroup.rotation.z += 0.035;
        xGroup.rotation.y += 0.025;

        // E) "O" (mittig schwebend)
        oGroup.scale.setScalar(currentScale * 0.9);
        oGroup.position.set(
          -0.12 * easeOutBack,
          0.3 + 1.95 * Math.sin(flyP * (Math.PI / 2)) + hover * 0.07,
          0.45 * easeOutBack
        );
        oGroup.rotation.x += 0.02;
        oGroup.rotation.y += 0.03;
      }

      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(renderLoop);
    };

    animFrameId = requestAnimationFrame(renderLoop);

    // Phase 4: Logo "Spielbox" blendet ab 2,0 s sanft ein
    timeoutLogo = setTimeout(() => {
      setLogoOpacity(1);
    }, 2000);

    // Phase 5: Gesamtdauer: Weicher Fade-Out ab 3,8 s
    timeoutFade = setTimeout(() => {
      setIsFadingOut(true);
    }, 3800);

    // Phase 6: Übergang ins Hauptmenü nach ca. 4,4 s
    timeoutFinish = setTimeout(() => {
      onFinishRef.current?.();
    }, 4400);

    return () => {
      isDisposed = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (timeoutLogo) clearTimeout(timeoutLogo);
      if (timeoutFade) clearTimeout(timeoutFade);
      if (timeoutFinish) clearTimeout(timeoutFinish);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', onResize);

      // Geometrien & Texturen im GPU-Speicher freigeben
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      logoTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      role="presentation"
      onClick={handleSkip}
      onTouchStart={handleSkip}
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      className={`fixed inset-0 z-50 w-full h-full min-h-screen overflow-hidden bg-[#0b0b12] flex items-center justify-center select-none cursor-pointer transition-opacity duration-600 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 3D Three.js WebGL Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Sanftes Umgebungslicht (passend zum dunklen Design #0b0b12) */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full blur-3xl opacity-50 bg-purple-600/20" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-40 bg-indigo-600/15" />

      {/* Typografie "Spielbox" mit edlem Neonglow */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `translateY(${logoOpacity === 1 ? '0px' : '10px'}) scale(${
            logoOpacity === 1 ? 1 : 0.96
          })`,
        }}
        className="relative z-30 flex flex-col items-center pointer-events-none transition-all duration-700 ease-out mt-auto pb-12"
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-400 drop-shadow-[0_0_25px_rgba(168,85,247,0.7)] drop-shadow-[0_0_50px_rgba(56,189,248,0.4)]">
          Spielbox
        </h1>
        <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-white/50 mt-1">
          Tippen zum Überspringen
        </span>
      </div>
    </div>
  );
}

export default SplashScreen;
