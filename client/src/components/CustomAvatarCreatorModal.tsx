import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eraser, Paintbrush, Trash2, Undo2 } from 'lucide-react';
import {
  AVATAR_SKIN_COLORS,
  getAvatarBgMeta,
  type AvatarBg,
} from './Avatar';
import { OpenButton, OpenModalFrame } from './OpenSubpageUI';
import { saveCustomAvatar, type CustomAvatar } from '../utils/userProfile';

interface CustomAvatarCreatorModalProps {
  initialSkinColor: string;
  initialBg: AvatarBg;
  onCancel: () => void;
  onSave: (created: CustomAvatar) => void;
}

const CANVAS_SIZE = 400;
const EXPORT_SIZE = 200;
const MAX_HISTORY = 25;

const PAINT_COLORS = [
  '#0F172A', // Tiefschwarz / Dunkelblau
  '#FFFFFF', // Weiß
  '#EF4444', // Rot
  '#EC4899', // Pink
  '#F97316', // Orange
  '#FACC15', // Gelb
  '#22C55E', // Grün
  '#06B6D4', // Cyan
  '#2563EB', // Blau
  '#7C3AED', // Lila
  '#78350F', // Braun
  '#94A3B8', // Silber / Grau
];

const BRUSH_SIZES = [
  { id: 'sm', label: 'Fein', size: 8, dotClass: 'h-2 w-2' },
  { id: 'md', label: 'Mittel', size: 16, dotClass: 'h-3.5 w-3.5' },
  { id: 'lg', label: 'Breit', size: 30, dotClass: 'h-5 w-5' },
] as const;

/**
 * Großflächiges Zeichenstudio zum Erstellen eines eigenen Avatars.
 * Der Nutzer malt direkt auf dem großen Gesicht (Touch, Stift oder Maus)
 * und speichert das Ergebnis unter einem eigenen Namen.
 */
export function CustomAvatarCreatorModal({
  initialSkinColor,
  initialBg,
  onCancel,
  onSave,
}: CustomAvatarCreatorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);

  const [skinColor, setSkinColor] = useState(initialSkinColor);
  const [paintColor, setPaintColor] = useState('#0F172A');
  const [brushSize, setBrushSize] = useState<number>(BRUSH_SIZES[1].size);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [canUndo, setCanUndo] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [avatarName, setAvatarName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const bgMeta = getAvatarBgMeta(initialBg);

  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const snapshot = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), snapshot];
    setCanUndo(historyRef.current.length > 0);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    historyRef.current = [];
  }, []);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    };
  };

  const drawSegment = (
    from: { x: number; y: number },
    to: { x: number; y: number }
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = tool === 'eraser' ? brushSize * 1.4 : brushSize;

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = paintColor;
      ctx.fillStyle = paintColor;
    }

    ctx.beginPath();
    if (from.x === to.x && from.y === to.y) {
      ctx.arc(to.x, to.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pushHistory();
    const point = getCanvasPoint(e);
    isDrawingRef.current = true;
    lastPointRef.current = point;
    drawSegment(point, point);
    if (tool === 'brush') {
      setHasStrokes(true);
      setErrorMsg(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    drawSegment(lastPointRef.current, point);
    lastPointRef.current = point;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if already released
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || historyRef.current.length === 0) return;

    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    ctx.putImageData(prev, 0, 0);
    setCanUndo(historyRef.current.length > 0);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    pushHistory();
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    setHasStrokes(false);
  };

  const handleSaveCustomAvatar = () => {
    const cleanedName = avatarName.trim().replace(/[\r\n\t]/g, ' ');
    if (cleanedName.length < 2) {
      setErrorMsg('Bitte gib deinem Avatar einen Namen (mind. 2 Zeichen).');
      return;
    }

    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas) return;

    // Kompaktes 200x200 PNG erzeugen für schnelle Speicherung & Lobby-Sync
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = EXPORT_SIZE;
    exportCanvas.height = EXPORT_SIZE;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    exportCtx.drawImage(sourceCanvas, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
    const imageData = exportCanvas.toDataURL('image/png');

    const created = saveCustomAvatar({
      name: cleanedName,
      imageData,
      skinColor,
    });
    onSave(created);
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Eigenen Avatar erstellen"
      className="fixed inset-0 z-70 flex items-center justify-center overflow-y-auto overflow-x-hidden overscroll-contain pt-[max(12px,env(safe-area-inset-top,0px))] pb-[max(12px,env(safe-area-inset-bottom,0px))] pl-[max(8px,env(safe-area-inset-left,0px))] pr-[max(8px,env(safe-area-inset-right,0px))] sm:pt-[max(16px,env(safe-area-inset-top,0px))] sm:pb-[max(16px,env(safe-area-inset-bottom,0px))] sm:pl-[max(16px,env(safe-area-inset-left,0px))] sm:pr-[max(16px,env(safe-area-inset-right,0px))] bg-[#0F172A]/85 backdrop-blur-sm animate-fade-in select-none"
      onClick={onCancel}
    >
      <div className="tablet-modal-box my-auto w-full max-w-md md:max-w-3xl landscape:max-w-3xl flex flex-col">
        <OpenModalFrame
          title="AVATAR"
          accentWord="ERSTELLEN"
          onClose={onCancel}
          contentClassName="w-full gap-2.5 sm:gap-3.5 p-3.5 sm:p-5 landscape:p-3"
        >
          <div className="flex flex-col md:flex-row md:items-center landscape:flex-row landscape:items-center gap-2.5 sm:gap-4 md:gap-5 w-full">
            {/* 1. GROSSE ZEICHENFLÄCHE MIT GESICHT */}
            <div className="flex flex-col items-center justify-center shrink-0 gap-1">
              <div
                className="avatar-creator-canvas-landscape relative aspect-square w-[172px] sm:w-[196px] md:w-[250px] rounded-full border-[3.5px] sm:border-[4px] border-[#334155] shadow-[0_5px_0_rgba(15,23,42,0.28)] overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${bgMeta.from}, ${bgMeta.to})`,
                }}
              >
                {/* Basis-Gesichtsvorlage im exakten Avatar-Maßstab (100x100) */}
                <svg
                  viewBox="0 0 100 100"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  fill="none"
                >
                  <circle cx="50" cy="50" r="36" fill="#FFFFFF" opacity="0.06" />
                  <path
                    d="M22 100 C22 75 34 68 50 68 C66 68 78 75 78 100 Z"
                    fill="#14141E"
                    stroke="#2E284A"
                    strokeWidth="1.5"
                  />
                  <path d="M42 69 L50 78 L58 69" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="25" cy="48" r="5" fill={skinColor} />
                  <circle cx="75" cy="48" r="5" fill={skinColor} />
                  <circle
                    cx="50"
                    cy="48"
                    r="24"
                    fill={skinColor}
                    stroke="rgba(15,23,42,0.12)"
                    strokeWidth="0.8"
                  />
                </svg>

                {/* Interaktive Zeichenfläche direkt auf dem Gesicht */}
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="relative z-10 h-full w-full cursor-crosshair touch-none rounded-full"
                />
              </div>

              <span className="font-arcade text-[10px] sm:text-[11px] tracking-wide text-[#94A3B8] uppercase text-center">
                {hasStrokes ? 'Male weiter direkt aufs Gesicht' : 'Male direkt auf das Gesicht'}
              </span>
            </div>

            {/* 2. WERKZEUGE, FARBEN, HAUTTON & NAME */}
            <div className="flex flex-1 min-w-0 flex-col gap-2 sm:gap-2.5 w-full">
              {/* Werkzeuge & Pinselgröße */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] p-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTool('brush')}
                    title="Pinsel"
                    aria-label="Pinsel"
                    aria-pressed={tool === 'brush'}
                    className={`flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg border cursor-pointer transition-colors active:scale-95 ${
                      tool === 'brush'
                        ? 'bg-[#F59E0B] border-[#FEF3C7]/40 text-[#0F172A]'
                        : 'bg-white/[0.06] border-white/15 text-white/80 hover:text-white'
                    }`}
                  >
                    <Paintbrush className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTool('eraser')}
                    title="Radierer"
                    aria-label="Radierer"
                    aria-pressed={tool === 'eraser'}
                    className={`flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg border cursor-pointer transition-colors active:scale-95 ${
                      tool === 'eraser'
                        ? 'bg-[#F59E0B] border-[#FEF3C7]/40 text-[#0F172A]'
                        : 'bg-white/[0.06] border-white/15 text-white/80 hover:text-white'
                    }`}
                  >
                    <Eraser className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    title="Rückgängig"
                    aria-label="Rückgängig"
                    className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-white/85 hover:text-white cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed active:scale-95"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Zeichnung leeren"
                    aria-label="Zeichnung leeren"
                    className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg border border-[#FDA4AF]/30 bg-[#E11D48]/15 text-[#FDA4AF] hover:bg-[#E11D48]/25 cursor-pointer active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Pinselstärken */}
                <div className="flex items-center gap-1">
                  {BRUSH_SIZES.map((b) => {
                    const active = brushSize === b.size;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBrushSize(b.size)}
                        title={`Pinselgröße: ${b.label}`}
                        aria-label={`Pinselgröße ${b.label}`}
                        aria-pressed={active}
                        className={`flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg border cursor-pointer transition-colors active:scale-95 ${
                          active
                            ? 'bg-[#F59E0B] border-[#FEF3C7]/40 text-[#0F172A]'
                            : 'bg-white/[0.06] border-white/15 text-white/80 hover:text-white'
                        }`}
                      >
                        <span className={`rounded-full bg-current ${b.dotClass}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Malfarben */}
              <div className="flex flex-col gap-1">
                <span className="font-arcade text-[10px] sm:text-[11px] tracking-wider text-[#94A3B8] uppercase">
                  MALFARBE
                </span>
                <div className="grid grid-cols-12 md:grid-cols-6 gap-1 md:gap-1.5">
                  {PAINT_COLORS.map((c) => {
                    const active = tool === 'brush' && paintColor === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setPaintColor(c);
                          setTool('brush');
                        }}
                        aria-label={`Malfarbe ${c}`}
                        aria-pressed={active}
                        style={{ backgroundColor: c }}
                        className={`h-6 sm:h-7 w-full rounded-md border cursor-pointer transition-transform active:scale-95 ${
                          active
                            ? 'border-[#F59E0B] ring-2 ring-[#F59E0B] scale-105'
                            : 'border-white/25'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Gesichtsfarbe / Hautton */}
              <div className="flex flex-col gap-1">
                <span className="font-arcade text-[10px] sm:text-[11px] tracking-wider text-[#94A3B8] uppercase">
                  GESICHTSFARBE
                </span>
                <div className="grid grid-cols-8 gap-1.5">
                  {AVATAR_SKIN_COLORS.map((s) => {
                    const active = skinColor === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSkinColor(s.id)}
                        title={s.label}
                        aria-label={`Gesichtsfarbe ${s.label}`}
                        aria-pressed={active}
                        style={{ backgroundColor: s.id }}
                        className={`h-6 w-6 sm:h-7 sm:w-7 mx-auto rounded-full border cursor-pointer transition-transform active:scale-95 ${
                          active
                            ? 'border-[#F59E0B] ring-2 ring-[#F59E0B] scale-105'
                            : 'border-white/25'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Avatar-Name Eingabe */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="custom-avatar-name-input"
                  className="font-arcade text-[10px] sm:text-[11px] tracking-wider text-[#94A3B8] uppercase"
                >
                  NAME DES AVATARS
                </label>
                <input
                  id="custom-avatar-name-input"
                  type="text"
                  value={avatarName}
                  onChange={(e) => {
                    setAvatarName(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveCustomAvatar();
                    }
                  }}
                  maxLength={18}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Z. B. MEIN HELD"
                  className={`font-sans h-9 sm:h-10 w-full rounded-xl border bg-white/[0.06] ${
                    errorMsg
                      ? 'border-[#FDA4AF]'
                      : 'border-white/20 focus:border-[#F59E0B]'
                  } px-3 text-center text-sm font-bold tracking-wide text-white placeholder:text-white/40 focus:bg-white/[0.09] focus:outline-none caret-[#FBBF24]`}
                />
                {errorMsg && (
                  <span
                    role="alert"
                    className="font-arcade text-xs text-[#FDA4AF] uppercase text-center mt-0.5"
                  >
                    {errorMsg}
                  </span>
                )}
              </div>

              {/* Aktionsbuttons */}
              <div className="flex items-center justify-center gap-2.5 sm:gap-3 pt-0.5">
                <OpenButton
                  size="sm"
                  variant="secondary"
                  onClick={onCancel}
                  className="min-w-[115px] sm:min-w-[125px] h-9 sm:h-10"
                >
                  ABBRECHEN
                </OpenButton>
                <OpenButton
                  size="sm"
                  variant="primary"
                  onClick={handleSaveCustomAvatar}
                  className="min-w-[125px] sm:min-w-[140px] h-9 sm:h-10"
                >
                  SPEICHERN
                </OpenButton>
              </div>
            </div>
          </div>
        </OpenModalFrame>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
