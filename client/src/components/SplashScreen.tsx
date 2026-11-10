import { useEffect, useRef, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [logoOpacity, setLogoOpacity] = useState(0);

  // Prüfen, ob der Splash bereits in dieser Session/Installation gesehen wurde
  const [isRepeatVisit] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('spielbox_splash_seen') === 'true';
    } catch {
      return false;
    }
  });

  // Prüfen auf Barrierefreiheit & WebGL-Verfügbarkeit
  const [shouldUseSimpleFade] = useState(() => {
    if (typeof window === 'undefined') return true;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const hasWebGL = (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(
          window.WebGLRenderingContext &&
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
      } catch {
        return false;
      }
    })();
    return prefersReducedMotion || !hasWebGL;
  });

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Sofortiges Überspringen bei Klick / Touch
  const handleSkip = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    setTimeout(() => {
      try {
        localStorage.setItem('spielbox_splash_seen', 'true');
      } catch {
        // ignore
      }
      onFinishRef.current?.();
    }, 250);
  };

  // ─── MODUS A: Kurzer 1s Fade für Folgestarts oder bei fehlendem WebGL / Motion-Reduce ───
  useEffect(() => {
    if (isRepeatVisit || shouldUseSimpleFade) {
      // 1. Logo schnell einblenden
      const t1 = setTimeout(() => {
        setLogoOpacity(1);
      }, 100);

      // 2. Weicher Fade-Out
      const t2 = setTimeout(() => {
        setIsFadingOut(true);
      }, 700);

      // 3. Abschluss nach 1.0s
      const t3 = setTimeout(() => {
        try {
          localStorage.setItem('spielbox_splash_seen', 'true');
        } catch {
          // ignore
        }
        onFinishRef.current?.();
      }, 1000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
    return undefined;
  }, [isRepeatVisit, shouldUseSimpleFade]);

  // ─── MODUS B: Volle 3D Three.js Spielebox-Animation (max. 2,5s) ───
  useEffect(() => {
    if (isRepeatVisit || shouldUseSimpleFade) return;

    let isDisposed = false;
    let animFrameId: number | null = null;
    let timeoutLogo: ReturnType<typeof setTimeout> | null = null;
    let timeoutFade: ReturnType<typeof setTimeout> | null = null;
    let timeoutFinish: ReturnType<typeof setTimeout> | null = null;

    // Asynchrones Lazy-Loading von Three.js
    (async () => {
      try {
        const THREE = await import('three');
        const { RoundedBoxGeometry } = await import(
          'three/examples/jsm/geometries/RoundedBoxGeometry.js'
        );

        if (isDisposed || !mountRef.current) return;

        const container = mountRef.current;
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        // 1. Szene & Kamera
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 50);
        camera.position.set(0, 0.8, 5.2);
        camera.lookAt(0, 0.35, 0);

        // 2. Renderer mit max Pixel-Ratio 2
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);

        // 3. Lichter: Umgebungslicht + Key-Light + farbige Rim-Lights
        const ambientLight = new THREE.AmbientLight(0x231f3d, 1.4);
        scene.add(ambientLight);

        // Weißes Key-Light
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
        keyLight.position.set(3.5, 5, 4);
        scene.add(keyLight);

        // Lila/Pinkes Rim-Light von oben/hinten
        const rimLight1 = new THREE.PointLight(0xd946ef, 4.5, 12);
        rimLight1.position.set(-3.2, 2.8, -2);
        scene.add(rimLight1);

        // Türkises/Cyanes Rim-Light von rechts/unten
        const rimLight2 = new THREE.PointLight(0x38bdf8, 4.0, 12);
        rimLight2.position.set(3.2, -1.5, -1);
        scene.add(rimLight2);

        // Weicher Frontal-Glow
        const frontLight = new THREE.PointLight(0x8b5cf6, 2.2, 8);
        frontLight.position.set(0, -1.8, 2.8);
        scene.add(frontLight);

        // ─── 4. MODELLE BAUEN (KEINE EXTERNEN DATEIEN) ───

        // A) DIE 3D-SPIELEBOX MIT DECKEL
        const boxGroup = new THREE.Group();
        scene.add(boxGroup);

        // Haupt-Körper der Box
        const boxMat = new THREE.MeshStandardMaterial({
          color: 0x111026,
          roughness: 0.24,
          metalness: 0.38,
          emissive: 0x3b1d75,
          emissiveIntensity: 0.22,
        });
        const boxBodyGeo = new RoundedBoxGeometry(2.3, 1.35, 2.3, 4, 0.12);
        const boxBody = new THREE.Mesh(boxBodyGeo, boxMat);
        boxGroup.add(boxBody);

        // Innenkante der Box (leuchtender Neon-Rahmen)
        const innerRimGeo = new RoundedBoxGeometry(2.18, 0.15, 2.18, 3, 0.06);
        const innerRimMat = new THREE.MeshStandardMaterial({
          color: 0x7c3aed,
          roughness: 0.3,
          metalness: 0.5,
          emissive: 0x9333ea,
          emissiveIntensity: 0.6,
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

          // Neon Rahmen
          lCtx.strokeStyle = '#a855f7';
          lCtx.lineWidth = 14;
          lCtx.strokeRect(30, 30, 452, 452);

          // Controller Silhouette
          lCtx.fillStyle = '#38bdf8';
          lCtx.beginPath();
          lCtx.roundRect(140, 160, 232, 120, [40]);
          lCtx.fill();

          // D-Pad & Buttons
          lCtx.fillStyle = '#0f172a';
          lCtx.fillRect(175, 195, 45, 16);
          lCtx.fillRect(190, 180, 16, 45);
          lCtx.beginPath();
          lCtx.arc(310, 205, 11, 0, Math.PI * 2);
          lCtx.arc(335, 225, 11, 0, Math.PI * 2);
          lCtx.fill();

          // Logo-Text
          lCtx.fillStyle = '#ffffff';
          lCtx.font = '900 52px system-ui, sans-serif';
          lCtx.textAlign = 'center';
          lCtx.fillText('SPIELBOX', 256, 360);
        }
        const logoTexture = new THREE.CanvasTexture(logoCanvas);

        // Deckel mit Scharnier (Hinge am hinteren Rand der Box)
        const lidHinge = new THREE.Group();
        lidHinge.position.set(0, 0.68, -1.15);
        boxGroup.add(lidHinge);

        const lidGeo = new RoundedBoxGeometry(2.4, 0.26, 2.4, 4, 0.12);
        const lidMat = new THREE.MeshStandardMaterial({
          color: 0x161430,
          roughness: 0.22,
          metalness: 0.4,
          emissive: 0x4c1d95,
          emissiveIntensity: 0.25,
          map: logoTexture,
        });
        const lidMesh = new THREE.Mesh(lidGeo, lidMat);
        lidMesh.position.set(0, 0.13, 1.2);
        lidHinge.add(lidMesh);

        // B) WÜRFEL MIT AUGEN (Mehrteilig)
        const diceGroup = new THREE.Group();
        const diceBaseGeo = new RoundedBoxGeometry(0.55, 0.55, 0.55, 4, 0.08);
        const diceMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.2,
          metalness: 0.4,
          emissive: 0x1e1b4b,
          emissiveIntensity: 0.3,
        });
        const diceMesh = new THREE.Mesh(diceBaseGeo, diceMat);
        diceGroup.add(diceMesh);

        // Augen (Pips) aus Zylindern mit Neon-Cyan Emissive
        const pipGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16);
        const pipMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.9,
          roughness: 0.15,
        });

        const addPip = (
          x: number,
          y: number,
          z: number,
          rotX = 0,
          rotY = 0,
          rotZ = 0
        ) => {
          const pip = new THREE.Mesh(pipGeo, pipMat);
          pip.position.set(x, y, z);
          pip.rotation.set(rotX, rotY, rotZ);
          diceGroup.add(pip);
        };

        // Eins (vorne Z+)
        addPip(0, 0, 0.28, Math.PI / 2, 0, 0);
        // Sechs (hinten Z-)
        for (let r = -1; r <= 1; r++) {
          addPip(-0.14, r * 0.14, -0.28, Math.PI / 2, 0, 0);
          addPip(0.14, r * 0.14, -0.28, Math.PI / 2, 0, 0);
        }
        // Zwei (oben Y+)
        addPip(-0.14, 0.28, -0.14);
        addPip(0.14, 0.28, 0.14);

        scene.add(diceGroup);

        // C) SPIELSTEIN (SCHEIBE MIT RAND & KERN)
        const chipGroup = new THREE.Group();
        const chipCoreGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.09, 32);
        const chipCoreMat = new THREE.MeshStandardMaterial({
          color: 0xec4899,
          roughness: 0.25,
          metalness: 0.35,
          emissive: 0xbe185d,
          emissiveIntensity: 0.5,
        });
        const chipCore = new THREE.Mesh(chipCoreGeo, chipCoreMat);
        chipGroup.add(chipCore);

        // Erhabener äußerer Rand (Torus)
        const chipRimGeo = new THREE.TorusGeometry(0.38, 0.038, 16, 32);
        const chipRimMat = new THREE.MeshStandardMaterial({
          color: 0xf43f5e,
          roughness: 0.2,
          metalness: 0.55,
          emissive: 0xf43f5e,
          emissiveIntensity: 0.6,
        });
        const chipRim = new THREE.Mesh(chipRimGeo, chipRimMat);
        chipRim.rotation.x = Math.PI / 2;
        chipGroup.add(chipRim);
        scene.add(chipGroup);

        // D) SPIELFIGUR (LATHEGEOMETRY + METALL-KRAGEN)
        const pawnGroup = new THREE.Group();
        const pawnPoints = [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.3, 0),
          new THREE.Vector2(0.3, 0.06),
          new THREE.Vector2(0.24, 0.12),
          new THREE.Vector2(0.15, 0.32),
          new THREE.Vector2(0.1, 0.52),
          new THREE.Vector2(0.15, 0.56),
          new THREE.Vector2(0.1, 0.6),
          new THREE.Vector2(0.18, 0.74),
          new THREE.Vector2(0.17, 0.86),
          new THREE.Vector2(0.1, 0.96),
          new THREE.Vector2(0, 1.0),
        ];
        const pawnGeo = new THREE.LatheGeometry(pawnPoints, 32);
        const pawnMat = new THREE.MeshStandardMaterial({
          color: 0x8b5cf6,
          roughness: 0.2,
          metalness: 0.4,
          emissive: 0x6d28d9,
          emissiveIntensity: 0.4,
        });
        const pawnMesh = new THREE.Mesh(pawnGeo, pawnMat);
        pawnGroup.add(pawnMesh);

        // Leuchtender Halsring
        const collarGeo = new THREE.TorusGeometry(0.14, 0.03, 16, 32);
        const collarMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.2,
          metalness: 0.6,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.8,
        });
        const collarMesh = new THREE.Mesh(collarGeo, collarMat);
        collarMesh.rotation.x = Math.PI / 2;
        collarMesh.position.y = 0.56;
        pawnGroup.add(collarMesh);
        scene.add(pawnGroup);

        // E) EXTRUDIERTES "X"
        const xGroup = new THREE.Group();
        const xBar1 = new RoundedBoxGeometry(0.65, 0.13, 0.1, 3, 0.04);
        const xMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          roughness: 0.22,
          metalness: 0.5,
          emissive: 0x0891b2,
          emissiveIntensity: 0.65,
        });
        const xMesh1 = new THREE.Mesh(xBar1, xMat);
        xMesh1.rotation.z = Math.PI / 4;
        const xMesh2 = new THREE.Mesh(xBar1, xMat);
        xMesh2.rotation.z = -Math.PI / 4;
        xGroup.add(xMesh1);
        xGroup.add(xMesh2);
        scene.add(xGroup);

        // F) EXTRUDIERTES "O" (Ring mit Innenloch)
        const oGroup = new THREE.Group();
        const oShape = new THREE.Shape();
        oShape.absarc(0, 0, 0.33, 0, Math.PI * 2, false);
        const oHole = new THREE.Path();
        oHole.absarc(0, 0, 0.19, 0, Math.PI * 2, true);
        oShape.holes.push(oHole);

        const oGeo = new THREE.ExtrudeGeometry(oShape, {
          depth: 0.1,
          bevelEnabled: true,
          bevelThickness: 0.025,
          bevelSize: 0.025,
          bevelSegments: 3,
        });
        oGeo.center();
        const oMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.24,
          metalness: 0.45,
          emissive: 0xd97706,
          emissiveIntensity: 0.6,
        });
        const oMesh = new THREE.Mesh(oGeo, oMat);
        oGroup.add(oMesh);
        scene.add(oGroup);

        // Anfangs alle Spielfiguren unsichtbar / in der Box positionieren
        const items = [diceGroup, chipGroup, pawnGroup, xGroup, oGroup];
        items.forEach((item) => {
          item.scale.set(0.001, 0.001, 0.001);
          item.position.set(0, 0.2, 0);
        });

        // ─── 5. PARALLAX-INTERAKTION (TOUCH / POINTER / NEIGUNG) ───
        let targetParallaxX = 0;
        let targetParallaxY = 0;
        let curParallaxX = 0;
        let curParallaxY = 0;

        const onPointerMove = (e: PointerEvent) => {
          const px = (e.clientX / window.innerWidth - 0.5) * 0.45;
          const py = (e.clientY / window.innerHeight - 0.5) * 0.35;
          targetParallaxX = px;
          targetParallaxY = py;
        };

        const onTouchMove = (e: TouchEvent) => {
          if (e.touches.length > 0) {
            const touch = e.touches[0];
            const px = (touch.clientX / window.innerWidth - 0.5) * 0.45;
            const py = (touch.clientY / window.innerHeight - 0.5) * 0.35;
            targetParallaxX = px;
            targetParallaxY = py;
          }
        };

        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });

        // Responsive Resize
        const onResize = () => {
          if (!container || isDisposed) return;
          const newW = container.clientWidth || window.innerWidth;
          const newH = container.clientHeight || window.innerHeight;
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        };
        window.addEventListener('resize', onResize);

        // ─── 6. ABLAUF & ANIMATIONSLOOP (MAX. 2,5 SEKUNDEN) ───
        const startTime = performance.now();

        const renderLoop = (now: number) => {
          if (isDisposed) return;

          const elapsedSec = (now - startTime) / 1000;

          // Parallax weich interpolieren
          curParallaxX += (targetParallaxX - curParallaxX) * 0.08;
          curParallaxY += (targetParallaxY - curParallaxY) * 0.08;
          camera.position.x = curParallaxX;
          camera.position.y = 0.8 - curParallaxY;
          camera.lookAt(0, 0.35, 0);

          // 1. Box fällt herein & federt leicht ein (0.0s – 0.65s)
          const dropP = Math.min(elapsedSec / 0.65, 1);
          // Gedämpftes Federn
          const bounceY =
            dropP >= 1
              ? 0
              : 5.5 * Math.pow(1 - dropP, 2.5) * Math.cos(dropP * Math.PI * 2.5);
          boxGroup.position.y = bounceY;
          boxGroup.rotation.y = -0.35 + Math.sin(elapsedSec * 2.5) * 0.08;
          boxGroup.rotation.x = 0.12 - dropP * 0.08;

          // 2. Deckel klappt auf (0.60s – 1.05s)
          if (elapsedSec > 0.6) {
            const lidP = Math.min((elapsedSec - 0.6) / 0.45, 1);
            // Weicher Übergang mit leichtem Überschwingen
            const lidAngle = -Math.sin(lidP * (Math.PI / 2)) * 2.2;
            lidHinge.rotation.x = lidAngle;
          }

          // 3. Spielfiguren fliegen dynamisch heraus (0.75s – 2.0s)
          if (elapsedSec > 0.75) {
            const flyP = Math.min((elapsedSec - 0.75) / 0.85, 1);
            const easeOutBack =
              1 + 1.2 * Math.pow(flyP - 1, 3) + 0.8 * Math.pow(flyP - 1, 2);
            const currentScale = Math.min(flyP * 1.08, 1);

            // A) WÜRFEL (links oben, dreht sich wild)
            diceGroup.scale.setScalar(currentScale * 0.85);
            diceGroup.position.set(
              -1.45 * easeOutBack,
              0.2 + 1.25 * Math.sin(flyP * (Math.PI / 2)),
              0.8 * easeOutBack
            );
            diceGroup.rotation.x += 0.045;
            diceGroup.rotation.y += 0.06;
            diceGroup.rotation.z += 0.035;

            // B) SPIELFIGUR (Mitte-Rechts oben, stolze Haltung)
            pawnGroup.scale.setScalar(currentScale * 0.8);
            pawnGroup.position.set(
              0.95 * easeOutBack,
              0.2 + 1.55 * Math.sin(flyP * (Math.PI / 2)),
              0.55 * easeOutBack
            );
            pawnGroup.rotation.y += 0.03;
            pawnGroup.rotation.z = Math.sin(elapsedSec * 3) * 0.12;

            // C) SPIELSTEIN (links vorne, taumelt flach)
            chipGroup.scale.setScalar(currentScale * 0.85);
            chipGroup.position.set(
              -0.85 * easeOutBack,
              0.2 + 0.65 * Math.sin(flyP * (Math.PI / 2)),
              1.45 * easeOutBack
            );
            chipGroup.rotation.x += 0.05;
            chipGroup.rotation.y += 0.04;

            // D) "X" (rechts vorne, rotiert)
            xGroup.scale.setScalar(currentScale * 0.9);
            xGroup.position.set(
              1.4 * easeOutBack,
              0.2 + 0.75 * Math.sin(flyP * (Math.PI / 2)),
              1.15 * easeOutBack
            );
            xGroup.rotation.z += 0.04;
            xGroup.rotation.y += 0.03;

            // E) "O" (mittig schwebend)
            oGroup.scale.setScalar(currentScale * 0.85);
            oGroup.position.set(
              -0.15 * easeOutBack,
              0.2 + 1.85 * Math.sin(flyP * (Math.PI / 2)),
              0.4 * easeOutBack
            );
            oGroup.rotation.x += 0.025;
            oGroup.rotation.y += 0.035;
          }

          renderer.render(scene, camera);
          animFrameId = requestAnimationFrame(renderLoop);
        };

        animFrameId = requestAnimationFrame(renderLoop);

        // 4. Logo "Spielbox" blendet ab 1,35 s ein
        timeoutLogo = setTimeout(() => {
          setLogoOpacity(1);
        }, 1350);

        // 5. Gesamtdauer max. 2,5 s: Sanfter Fade-Out ab 2,1 s
        timeoutFade = setTimeout(() => {
          setIsFadingOut(true);
        }, 2100);

        // 6. Übergang ins Menü nach 2,5 s
        timeoutFinish = setTimeout(() => {
          try {
            localStorage.setItem('spielbox_splash_seen', 'true');
          } catch {
            // ignore
          }
          onFinishRef.current?.();
        }, 2500);

        // Aufräumfunktion bei Unmount / Abbruch
        return () => {
          isDisposed = true;
          if (animFrameId) cancelAnimationFrame(animFrameId);
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('touchmove', onTouchMove);
          window.removeEventListener('resize', onResize);

          // Geometrien & Materialien aufräumen
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
      } catch (err) {
        console.error('Three.js Splash Error, fallback to static:', err);
        // Fallback: Schnell beenden
        setTimeout(() => onFinishRef.current?.(), 800);
      }
    })();

    return () => {
      isDisposed = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (timeoutLogo) clearTimeout(timeoutLogo);
      if (timeoutFade) clearTimeout(timeoutFade);
      if (timeoutFinish) clearTimeout(timeoutFinish);
    };
  }, [isRepeatVisit, shouldUseSimpleFade]);

  return (
    <div
      role="presentation"
      onClick={handleSkip}
      onTouchStart={handleSkip}
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      className={`fixed inset-0 z-50 w-full h-full min-h-screen overflow-hidden bg-[#0b0b12] flex items-center justify-center select-none cursor-pointer transition-opacity duration-400 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 3D Three.js WebGL Container */}
      {!isRepeatVisit && !shouldUseSimpleFade && (
        <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      )}

      {/* Sanftes Umgebungslicht (passend zum dunklen Design #0b0b12) */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full blur-3xl opacity-50 bg-purple-600/20" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-40 bg-indigo-600/15" />

      {/* Typografie "Spielbox" mit dezentem Neonglow */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `translateY(${logoOpacity === 1 ? '0px' : '10px'}) scale(${
            logoOpacity === 1 ? 1 : 0.96
          })`,
        }}
        className="relative z-30 flex flex-col items-center pointer-events-none transition-all duration-700 ease-out mt-auto pb-14"
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
