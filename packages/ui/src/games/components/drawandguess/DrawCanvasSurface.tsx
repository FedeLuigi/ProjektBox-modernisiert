import { useEffect, useRef } from 'react';
import type { StrokeSegment } from '@projektbox/shared/types';
import { socketService } from '../../../services/socket';

export function renderAllStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: StrokeSegment[],
  width: number,
  height: number
) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    const isDot = stroke.x0 === stroke.x1 && stroke.y0 === stroke.y1;
    if (isDot) {
      ctx.beginPath();
      ctx.fillStyle = stroke.color;
      const r = Math.max(1, (stroke.size * (width / 400)) / 2);
      ctx.arc(stroke.x0 * width, stroke.y0 * height, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(1, stroke.size * (width / 400));
      ctx.moveTo(stroke.x0 * width, stroke.y0 * height);
      ctx.lineTo(stroke.x1 * width, stroke.y1 * height);
      ctx.stroke();
    }
  }
}

interface DrawCanvasSurfaceProps {
  round: number;
  strokes: StrokeSegment[];
  isDrawer: boolean;
  canDraw: boolean;
  brushColor: string;
  brushSize: number;
  isEraser: boolean;
  onEmitStroke: (stroke: StrokeSegment) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  renderedCountRef: React.MutableRefObject<number>;
  className?: string;
}

export function DrawCanvasSurface({
  round,
  strokes,
  isDrawer,
  canDraw,
  brushColor,
  brushSize,
  isEraser,
  onEmitStroke,
  canvasRef,
  renderedCountRef,
  className = '',
}: DrawCanvasSurfaceProps) {
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const strokeIdRef = useRef(1);
  const strokeBufferRef = useRef<StrokeSegment[]>([]);
  const renderedRoundRef = useRef<number>(round);
  const prevCanvasElRef = useRef<HTMLCanvasElement | null>(null);

  const flushStrokes = () => {
    if (strokeBufferRef.current.length === 0) return;
    const batch = [...strokeBufferRef.current];
    strokeBufferRef.current = [];
    socketService.emitStrokes(batch);
  };

  // Live stroke listeners for spectators/TV/guessers
  useEffect(() => {
    const unsubStrokes = socketService.onLiveStrokes(({ strokes: incoming }) => {
      if (isDrawer) return;
      const canvas = canvasRef.current;
      if (!canvas || !incoming || incoming.length === 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const stroke of incoming) {
        const isDot = stroke.x0 === stroke.x1 && stroke.y0 === stroke.y1;
        if (isDot) {
          ctx.beginPath();
          ctx.fillStyle = stroke.color;
          const r = Math.max(1, (stroke.size * (width / 400)) / 2);
          ctx.arc(stroke.x0 * width, stroke.y0 * height, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = Math.max(1, stroke.size * (width / 400));
          ctx.moveTo(stroke.x0 * width, stroke.y0 * height);
          ctx.lineTo(stroke.x1 * width, stroke.y1 * height);
          ctx.stroke();
        }
      }
      renderedCountRef.current += incoming.length;
    });

    const unsubClear = socketService.onLiveClear(() => {
      if (isDrawer) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      renderedCountRef.current = 0;
    });

    const unsubUndo = socketService.onLiveUndo(({ strokes: nextStrokes }) => {
      if (isDrawer) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderAllStrokes(ctx, nextStrokes, canvas.width, canvas.height);
      renderedCountRef.current = nextStrokes.length;
    });

    return () => {
      unsubStrokes();
      unsubClear();
      unsubUndo();
    };
  }, [isDrawer, canvasRef, renderedCountRef]);

  // Sync authoritative state strokes on round change or reconnect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isNewCanvas = prevCanvasElRef.current !== canvas;
    if (isNewCanvas) prevCanvasElRef.current = canvas;
    const isRoundChanged = isNewCanvas || renderedRoundRef.current !== round;

    if (isRoundChanged || renderedCountRef.current > strokes.length) {
      renderedRoundRef.current = round;
      renderAllStrokes(ctx, strokes, canvas.width, canvas.height);
      renderedCountRef.current = strokes.length;
      return;
    }

    if (strokes.length === 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      renderedCountRef.current = 0;
      return;
    }

    if (renderedCountRef.current < strokes.length) {
      const start = renderedCountRef.current;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = start; i < strokes.length; i++) {
        const s = strokes[i];
        if (s.x0 === s.x1 && s.y0 === s.y1) {
          ctx.beginPath();
          ctx.fillStyle = s.color;
          ctx.arc(s.x0 * canvas.width, s.y0 * canvas.height, Math.max(1, (s.size * (canvas.width / 400)) / 2), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.strokeStyle = s.color;
          ctx.lineWidth = Math.max(1, s.size * (canvas.width / 400));
          ctx.moveTo(s.x0 * canvas.width, s.y0 * canvas.height);
          ctx.lineTo(s.x1 * canvas.width, s.y1 * canvas.height);
          ctx.stroke();
        }
      }
      renderedCountRef.current = strokes.length;
    }
  }, [round, strokes, canvasRef, renderedCountRef]);

  const getNormPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const drawSegmentLocal = (seg: StrokeSegment) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (seg.x0 === seg.x1 && seg.y0 === seg.y1) {
      ctx.beginPath();
      ctx.fillStyle = seg.color;
      ctx.arc(seg.x0 * canvas.width, seg.y0 * canvas.height, Math.max(1, (seg.size * (canvas.width / 400)) / 2), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = Math.max(1, seg.size * (canvas.width / 400));
      ctx.moveTo(seg.x0 * canvas.width, seg.y0 * canvas.height);
      ctx.lineTo(seg.x1 * canvas.width, seg.y1 * canvas.height);
      ctx.stroke();
    }
    renderedCountRef.current += 1;
  };

  const activeColor = isEraser ? '#FFFFFF' : brushColor;
  const activeSize = isEraser ? Math.max(18, brushSize * 1.8) : brushSize;

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      onPointerDown={(e) => {
        if (!canDraw) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const pos = getNormPos(e);
        if (!pos) return;
        isDrawingRef.current = true;
        lastPosRef.current = pos;
        strokeIdRef.current += 1;
        const seg: StrokeSegment = {
          x0: pos.x,
          y0: pos.y,
          x1: pos.x,
          y1: pos.y,
          color: activeColor,
          size: activeSize,
          strokeId: strokeIdRef.current,
        };
        drawSegmentLocal(seg);
        strokeBufferRef.current.push(seg);
        onEmitStroke(seg);
      }}
      onPointerMove={(e) => {
        if (!canDraw || !isDrawingRef.current || !lastPosRef.current) return;
        const pos = getNormPos(e);
        if (!pos) return;
        const prev = lastPosRef.current;
        if (Math.hypot(pos.x - prev.x, pos.y - prev.y) < 0.004) return;
        lastPosRef.current = pos;
        const seg: StrokeSegment = {
          x0: prev.x,
          y0: prev.y,
          x1: pos.x,
          y1: pos.y,
          color: activeColor,
          size: activeSize,
          strokeId: strokeIdRef.current,
        };
        drawSegmentLocal(seg);
        strokeBufferRef.current.push(seg);
        if (strokeBufferRef.current.length >= 4) flushStrokes();
        onEmitStroke(seg);
      }}
      onPointerUp={() => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        lastPosRef.current = null;
        flushStrokes();
      }}
      onPointerCancel={() => {
        isDrawingRef.current = false;
        lastPosRef.current = null;
        flushStrokes();
      }}
      className={`aspect-[4/3] w-full rounded-2xl border-2 border-[#1E293B]/20 bg-white shadow-[0_14px_34px_rgba(0,0,0,0.16)] touch-none ${
        canDraw ? 'cursor-crosshair' : 'cursor-default'
      } ${className}`}
    />
  );
}
