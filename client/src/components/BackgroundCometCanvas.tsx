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
  hasEntered: boolean;
  age: number;
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
    window.visualViewport?.addEventListener('resize', updateSize);

    const comets: ScreenComet[] = [];
    const sparks: ScreenSpark[] = [];

    let cooldown = 20; // Startet schnell nach Render

    const spawnComet = () => {
      if (width === 0 || height === 0) return;

      // 4 Ränder zur zufälligen Auswahl: top (40%), left (25%), right (25%), bottom (10%)
      const edgeRoll = Math.random();
      let edge: 'top' | 'left' | 'right' | 'bottom';
      if (edgeRoll < 0.4) {
        edge = 'top';
      } else if (edgeRoll < 0.65) {
        edge = 'left';
      } else if (edgeRoll < 0.9) {
        edge = 'right';
      } else {
        edge = 'bottom';
      }

      let startX = 0;
      let startY = 0;
      let angle = 0; // im Bogenmaß (Radians)

      // Kometen starten IMMER 120px außerhalb des sichtbaren Fensters
      const margin = 120;

      switch (edge) {
        case 'top': {
          // Startet vollständig oberhalb des Bildschirms
          startX = Math.random() * (width + margin * 2) - margin;
          startY = -margin;
          // Fliegt schräg nach unten ins Bild
          if (startX < width * 0.5) {
            angle = ((30 + Math.random() * 45) * Math.PI) / 180; // 30° bis 75° nach unten-rechts
          } else {
            angle = ((105 + Math.random() * 45) * Math.PI) / 180; // 105° bis 150° nach unten-links
          }
          break;
        }
        case 'left': {
          // Startet vollständig links außerhalb des Bildschirms
          startX = -margin;
          startY = Math.random() * (height + margin * 2) - margin;
          // Fliegt nach rechts ins Bild
          if (startY < height * 0.5) {
            angle = ((15 + Math.random() * 45) * Math.PI) / 180; // 15° bis 60° nach unten-rechts
          } else {
            angle = ((-15 - Math.random() * 45) * Math.PI) / 180; // -15° bis -60° nach oben-rechts
          }
          break;
        }
        case 'right': {
          // Startet vollständig rechts außerhalb des Bildschirms
          startX = width + margin;
          startY = Math.random() * (height + margin * 2) - margin;
          // Fliegt nach links ins Bild
          if (startY < height * 0.5) {
            angle = ((120 + Math.random() * 45) * Math.PI) / 180; // 120° bis 165° nach unten-links
          } else {
            angle = ((-120 - Math.random() * 45) * Math.PI) / 180; // -120° bis -165° nach oben-links
          }
          break;
        }
        case 'bottom': {
          // Startet vollständig unterhalb des Bildschirms
          startX = Math.random() * (width + margin * 2) - margin;
          startY = height + margin;
          // Fliegt nach oben ins Bild
          if (startX < width * 0.5) {
            angle = ((-35 - Math.random() * 40) * Math.PI) / 180; // -35° bis -75° nach oben-rechts
          } else {
            angle = ((-105 - Math.random() * 40) * Math.PI) / 180; // -105° bis -145° nach oben-links
          }
          break;
        }
      }

      const speed = 3.6 + Math.random() * 2.4;

      comets.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed,
        length: 50 + Math.random() * 38,
        size: 2.0 + Math.random() * 1.3,
        alpha: 0.8 + Math.random() * 0.2,
        decay: 0.001,
        hasEntered: false,
        age: 0,
      });
    };

    const render = () => {
      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Regelmäßiges Spawnen neuer Kometen von den Rändern
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
        c.age++;

        // Sobald der Komet den sichtbaren Bildschirm berührt hat, Status festhalten
        if (
          !c.hasEntered &&
          c.x >= 0 &&
          c.x <= width &&
          c.y >= 0 &&
          c.y <= height
        ) {
          c.hasEntered = true;
        }

        // Erst despawnen, wenn der Komet den Bildschirm überquert hat und auf der Gegenseite 140px draußen ist
        const isOffscreen =
          c.x < -140 || c.x > width + 140 || c.y < -140 || c.y > height + 140;

        if ((c.hasEntered && isOffscreen) || c.age > 800) {
          comets.splice(i, 1);
          continue;
        }

        const normX = -c.vx / c.speed;
        const normY = -c.vy / c.speed;

        // Funken abwerfen (nur wenn der Komet sichtbar ist oder kurz davor)
        if (
          Math.random() > 0.4 &&
          c.x >= -30 &&
          c.x <= width + 30 &&
          c.y >= -30 &&
          c.y <= height + 30
        ) {
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
