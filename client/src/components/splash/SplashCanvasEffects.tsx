import { useEffect, useRef } from 'react';

type CanvasMode = 'particle-forge' | 'cyber-warp' | 'pixel-wave' | 'party-confetti';

const PALETTE = ['#F59E0B', '#FBBF24', '#38BDF8', '#10B981', '#F472B6', '#FDE68A'];

/**
 * Hochperformante Canvas-2D-Effekt-Engine für die Splash-Varianten:
 * - particle-forge: 240 Partikel mit Feder-Physik, die zum Box-Rahmen konvergieren
 * - cyber-warp: 3D-Z-Tiefenprojektion eines Sternen-/Lichtertunnels
 * - pixel-wave: Radiale Sinuswellen-Matrix über den gesamten Bildschirm
 * - party-confetti: Ballistische Konfetti-Kanonen mit Gravitation & Rotation
 */
export function SplashCanvasEffect({
  mode,
  reducedMotion = false,
}: {
  mode: CanvasMode;
  reducedMotion?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const startTime = performance.now();
    let rafId = 0;

    // 1) PARTICLE-FORGE SETUP
    const particleCount = reducedMotion ? 60 : 220;
    const particles = Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = Math.max(width, height) * (0.28 + (i % 7) * 0.07);
      // Zielposition auf einem leuchtenden Rechteck um das Zentrum
      const side = i % 4;
      const boxW = Math.min(440, width * 0.72);
      const boxH = 140;
      const t = ((i / particleCount) * 4) % 1;
      let tx = 0;
      let ty = 0;
      if (side === 0) {
        tx = -boxW / 2 + t * boxW;
        ty = -boxH / 2;
      } else if (side === 1) {
        tx = boxW / 2;
        ty = -boxH / 2 + t * boxH;
      } else if (side === 2) {
        tx = boxW / 2 - t * boxW;
        ty = boxH / 2;
      } else {
        tx = -boxW / 2;
        ty = boxH / 2 - t * boxH;
      }
      return {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        tx: width / 2 + tx,
        ty: height / 2 + ty,
        size: 1.8 + (i % 3) * 1.1,
        color: PALETTE[i % PALETTE.length],
      };
    });

    // 2) CYBER-WARP SETUP
    const starCount = reducedMotion ? 50 : 180;
    const stars = Array.from({ length: starCount }, (_, i) => ({
      x: (Math.random() - 0.5) * width * 1.6,
      y: (Math.random() - 0.5) * height * 1.6,
      z: Math.random() * 1200 + 80,
      color: PALETTE[i % PALETTE.length],
    }));

    // 3) PARTY-CONFETTI SETUP
    const confettiCount = reducedMotion ? 40 : 140;
    const confetti = Array.from({ length: confettiCount }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const speed = 7 + Math.random() * 10;
      const spreadAngle = fromLeft
        ? -Math.PI / 3 + (Math.random() - 0.5) * 0.65
        : -((2 * Math.PI) / 3) + (Math.random() - 0.5) * 0.65;
      return {
        x: fromLeft ? width * 0.06 : width * 0.94,
        y: height * 0.78,
        vx: Math.cos(spreadAngle) * speed,
        vy: Math.sin(spreadAngle) * speed - 4,
        w: 7 + Math.random() * 7,
        h: 4 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.22,
        color: PALETTE[i % PALETTE.length],
      };
    });

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      if (mode === 'particle-forge') {
        for (const p of particles) {
          const dx = p.tx - p.x;
          const dy = p.ty - p.y;
          p.vx = p.vx * 0.84 + dx * 0.09;
          p.vy = p.vy * 0.84 + dy * 0.09;
          if (!reducedMotion) {
            p.x += p.vx;
            p.y += p.vy;
          } else {
            p.x = p.tx;
            p.y = p.ty;
          }

          ctx.beginPath();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.85;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (mode === 'cyber-warp') {
        const cx = width / 2;
        const cy = height / 2;
        const speed = reducedMotion ? 4 : Math.min(28, 8 + elapsed * 14);
        for (const s of stars) {
          s.z -= speed;
          if (s.z <= 20) {
            s.z = 1200;
            s.x = (Math.random() - 0.5) * width * 1.6;
            s.y = (Math.random() - 0.5) * height * 1.6;
          }
          const k = 320 / s.z;
          const px = cx + s.x * k;
          const py = cy + s.y * k;
          const pk = 320 / (s.z + speed * 2.2);
          const ox = cx + s.x * pk;
          const oy = cy + s.y * pk;

          ctx.beginPath();
          ctx.strokeStyle = s.color;
          ctx.lineWidth = Math.max(1, (1 - s.z / 1200) * 3);
          ctx.globalAlpha = Math.min(1, (1 - s.z / 1200) * 1.1);
          ctx.moveTo(ox, oy);
          ctx.lineTo(px, py);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (mode === 'pixel-wave') {
        const gap = width < 640 ? 28 : 34;
        const cx = width / 2;
        const cy = height / 2;
        for (let x = gap / 2; x < width; x += gap) {
          for (let y = gap / 2; y < height; y += gap) {
            const dist = Math.hypot(x - cx, y - cy);
            const wave = reducedMotion ? 0.5 : Math.sin(dist * 0.025 - elapsed * 6.5);
            const norm = (wave + 1) * 0.5;
            const r = 1.6 + norm * 3.4;
            ctx.beginPath();
            ctx.fillStyle = norm > 0.68 ? '#F59E0B' : norm > 0.42 ? '#10B981' : '#38BDF8';
            ctx.globalAlpha = 0.14 + norm * 0.55;
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      } else if (mode === 'party-confetti') {
        for (const c of confetti) {
          if (!reducedMotion) {
            c.vy += 0.28;
            c.vx *= 0.992;
            c.x += c.vx;
            c.y += c.vy;
            c.rot += c.vRot;
          }
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(c.rot);
          ctx.fillStyle = c.color;
          ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [mode, reducedMotion]);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" />;
}
