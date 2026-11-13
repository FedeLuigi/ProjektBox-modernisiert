import { useEffect, useRef } from 'react';

interface CrystalShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  alpha: number;
  warm: boolean;
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
    window.visualViewport?.addEventListener('resize', updateSize);

    const shards: CrystalShard[] = Array.from({ length: 16 }, (_, idx) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.2 - Math.random() * 0.35,
      size: 6 + Math.random() * 12,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.01,
      alpha: 0.12 + Math.random() * 0.18,
      warm: idx % 3 === 0,
    }));

    const render = () => {
      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Tiefer Schiefer-Nacht-Hintergrund (#1B2B40) mit geometrischen Kristall-Facetten
      ctx.fillStyle = '#1B2B40';
      ctx.fillRect(0, 0, width, height);

      // Diagonale Facette links
      ctx.fillStyle = 'rgba(46, 71, 102, 0.48)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width * 0.44, 0);
      ctx.lineTo(width * 0.26, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Diagonale Facette rechts unten
      ctx.fillStyle = 'rgba(21, 35, 52, 0.55)';
      ctx.beginPath();
      ctx.moveTo(width * 0.58, height);
      ctx.lineTo(width, height * 0.32);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Schwebende kleine Kristall-Splitter (abwechselnd Perlmutt & Gold-Bernstein)
      for (const s of shards) {
        s.x += s.vx;
        s.y += s.vy;
        s.rotation += s.vRot;

        if (s.y < -30) {
          s.y = height + 25;
          s.x = Math.random() * width;
        }
        if (s.x < -30) s.x = width + 25;
        if (s.x > width + 30) s.x = -25;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.globalAlpha = s.alpha * opacity;
        ctx.fillStyle = s.warm ? '#FDE68A' : '#E2E8F0';
        ctx.strokeStyle = s.warm ? '#FEF3C7' : '#FFFFFF';
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.moveTo(0, -s.size);
        ctx.lineTo(s.size * 0.68, 0);
        ctx.lineTo(0, s.size);
        ctx.lineTo(-s.size * 0.68, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', updateSize);
      window.visualViewport?.removeEventListener('resize', updateSize);
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, [opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 h-full min-h-dvh w-full pointer-events-none z-0 ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}

export default BackgroundCometCanvas;
