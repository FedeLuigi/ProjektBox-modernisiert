import { useEffect, useRef } from 'react';

interface ScreenComet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  length: number;
  size: number;
  alpha: number;
  decay: number;
}

interface ScreenSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
}

interface BackgroundCometCanvasProps {
  className?: string;
  opacity?: number;
}

export function BackgroundCometCanvas({
  className = '',
  opacity = 1,
}: BackgroundCometCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;
    let width = 0;
    let height = 0;

    const updateSize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    const comets: ScreenComet[] = [];
    const sparks: ScreenSpark[] = [];

    let cooldown = 20; // Startet schnell nach Render

    const spawnComet = () => {
      if (width === 0 || height === 0) return;

      // Startet oben/links über den gesamten Bildschirm verteilt
      const startX = Math.random() * (width + 120) - 80;
      const startY = Math.random() * (height * 0.65) - 30;

      const angle = (Math.PI * (20 + Math.random() * 15)) / 180; // ~20° - 35°
      const speed = 3.2 + Math.random() * 2.4;

      comets.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed,
        length: 48 + Math.random() * 38,
        size: 2.2 + Math.random() * 1.3,
        alpha: 0.75 + Math.random() * 0.2,
        decay: 0.001,
      });
    };

    const render = () => {
      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Regelmäßiges Spawnen über den gesamten Bildschirm
      cooldown--;
      if (cooldown <= 0) {
        spawnComet();
        cooldown = 110 + Math.floor(Math.random() * 90);
      }

      // Kometen rendern
      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.x += c.vx;
        c.y += c.vy;

        if (c.x > width + 100 || c.y > height + 60) {
          comets.splice(i, 1);
          continue;
        }

        const normX = -c.vx / c.speed;
        const normY = -c.vy / c.speed;

        // Funken abwerfen
        if (Math.random() > 0.4) {
          sparks.push({
            x: c.x + (Math.random() - 0.5) * 4,
            y: c.y + (Math.random() - 0.5) * 4,
            vx: normX * (Math.random() * 1.5 + 0.6) + (Math.random() - 0.5),
            vy: normY * (Math.random() * 1.5 + 0.6) + (Math.random() - 0.5),
            size: 1.1 + Math.random() * 1.3,
            alpha: 0.85,
            decay: 0.035,
            color:
              Math.random() > 0.4
                ? '#fbbf24'
                : Math.random() > 0.3
                ? '#f43f5e'
                : '#ffffff',
          });
        }

        // Plasmaschweif
        const tailX = c.x + normX * c.length;
        const tailY = c.y + normY * c.length;

        const grad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${c.alpha * opacity})`);
        grad.addColorStop(0.2, `rgba(251, 191, 36, ${c.alpha * 0.9 * opacity})`);
        grad.addColorStop(0.55, `rgba(244, 63, 94, ${c.alpha * 0.65 * opacity})`);
        grad.addColorStop(0.85, `rgba(168, 85, 247, ${c.alpha * 0.35 * opacity})`);
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = c.size * 1.3;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Kometenkopf
        const glow = ctx.createRadialGradient(
          c.x,
          c.y,
          0.5,
          c.x,
          c.y,
          c.size * 3.6
        );
        glow.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        glow.addColorStop(0.35, `rgba(251, 191, 36, ${0.9 * opacity})`);
        glow.addColorStop(0.7, `rgba(239, 68, 68, ${0.45 * opacity})`);
        glow.addColorStop(1, 'rgba(168, 85, 247, 0)');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size * 3.6, 0, Math.PI * 2);
        ctx.fill();

        // Weißer Kern
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Funken
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= s.decay;

        if (s.alpha <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha * opacity;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, [opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 h-full w-full pointer-events-none -z-10 ${className}`}
      aria-hidden="true"
    />
  );
}

export default BackgroundCometCanvas;
