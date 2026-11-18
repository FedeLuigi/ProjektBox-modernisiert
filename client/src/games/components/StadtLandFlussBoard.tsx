import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Ban,
  Check,
  Clock,
  Hand,
  RotateCcw,
  Send,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { GameRendererProps } from '../types';
import { Avatar } from '../../components/Avatar';
import { OpenButton } from '../../components/OpenSubpageUI';
import { playMoveSound, playWinSound, triggerHapticFeedback } from '../../utils/soundEffects';

export interface EvaluatedAnswer {
  text: string;
  valid: boolean;
  rejected: boolean;
  points: number;
  reason?: string;
}

export interface StadtLandFlussState {
  gameId: 'stadt-land-fluss';
  round: number;
  maxRounds: number;
  roundDuration: number;
  stopButtonEnabled: boolean;
  categoryPreset: string;
  categories: string[];
  letter: string;
  phase: 'writing' | 'review' | 'round_over' | 'game_over';
  phaseEndsAt: number;
  answers: Record<string, Record<string, string>>;
  filledCounts: Record<string, number>;
  submittedPlayerIds: string[];
  stoppedByPlayerName?: string;
  rejectVotes: Record<string, Record<string, string[]>>;
  evaluated: Record<string, Record<string, EvaluatedAnswer>>;
  roundScores: Record<string, number>;
  reviewReadyIds: string[];
  scores: Record<string, number>;
  winnerId?: string | null;
}

function startsWithLetter(text: string, letter: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const first = trimmed[0]
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return first === letter.toUpperCase();
}

interface WritingSheetProps {
  letter: string;
  round: number;
  maxRounds: number;
  timeLeft: number;
  categories: string[];
  stopButtonEnabled: boolean;
  initialAnswers: Record<string, string>;
  hasSubmitted: boolean;
  activePlayers: GameRendererProps<StadtLandFlussState>['allPlayers'];
  myPlayerId: string;
  filledCounts: Record<string, number>;
  submittedPlayerIds: string[];
  disabled?: boolean;
  onSaveDraft: (answers: Record<string, string>) => void;
  onSubmitRound: (answers: Record<string, string>, triggerStop: boolean) => void;
}

function WritingSheet({
  letter,
  round,
  maxRounds,
  timeLeft,
  categories,
  stopButtonEnabled,
  initialAnswers,
  hasSubmitted,
  activePlayers,
  myPlayerId,
  filledCounts,
  submittedPlayerIds,
  disabled,
  onSaveDraft,
  onSubmitRound,
}: WritingSheetProps) {
  const [draft, setDraft] = useState<Record<string, string>>(() => ({ ...initialAnswers }));
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const dirtyRef = useRef(false);
  const latestDraftRef = useRef(draft);

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      if (dirtyRef.current && !hasSubmitted && !disabled) {
        onSaveDraft(latestDraftRef.current);
      }
    };
    // Nur beim Verlassen der Schreibphase ausstehende Eingaben sichern
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (cat: string, value: string) => {
    if (hasSubmitted) return;
    const next = { ...draft, [cat]: value };
    setDraft(next);
    dirtyRef.current = true;
    latestDraftRef.current = next;

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      draftTimerRef.current = null;
      if (!disabled) {
        dirtyRef.current = false;
        onSaveDraft(next);
      }
    }, 350);
  };

  const validFilledCount = categories.filter((cat) => {
    const val = (draft[cat] || '').trim();
    return val.length >= 2 && startsWithLetter(val, letter);
  }).length;
  const allFilledCount = categories.filter((cat) => (draft[cat] || '').trim().length >= 2).length;
  const canTriggerStop = stopButtonEnabled && allFilledCount >= categories.length && !hasSubmitted;

  const handleTriggerSubmit = (triggerStop: boolean) => {
    if (hasSubmitted || disabled) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    dirtyRef.current = false;
    playMoveSound();
    triggerHapticFeedback(triggerStop ? [20, 40, 25] : 18);
    onSubmitRound(draft, triggerStop);
  };

  const otherPlayers = activePlayers.filter((p) => p.id !== myPlayerId);

  return (
    <div className="flex w-full max-w-4xl flex-1 min-h-0 flex-col justify-between gap-2.5 sm:gap-3 mx-auto select-none">
      {/* Kopfzeile mit Buchstabe, Timer & Live-Fortschritt */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-arcade text-4xl sm:text-5xl leading-none text-[#FDE68A] drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] shrink-0 px-1">
            {letter}
          </span>
          <div className="flex flex-col">
            <span className="font-arcade text-[10px] sm:text-xs tracking-widest text-[#67E8F9] uppercase">
              RUNDE {round} / {maxRounds}
            </span>
            <span className="font-arcade text-sm sm:text-base text-white uppercase">
              WÖRTER MIT {letter}
            </span>
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-arcade text-xs sm:text-sm shrink-0 transition-colors ${
            timeLeft <= 10
              ? 'border-[#FDA4AF]/60 bg-[#E11D48] text-white animate-pulse shadow-[0_0_16px_rgba(225,29,72,0.45)]'
              : 'border-white/15 bg-white/[0.06] text-[#FDE68A] backdrop-blur-md'
          }`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{timeLeft} S</span>
        </div>
      </div>

      {/* Mitspieler Live-Fortschritt (ideal für Nur-Spieler-Modus ohne TV) */}
      {otherPlayers.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 py-0.5">
          {otherPlayers.map((p) => {
            const count = filledCounts[p.id] || 0;
            const done = submittedPlayerIds.includes(p.id);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-arcade uppercase shrink-0 ${
                  done
                    ? 'border-[#34D399]/50 bg-[#10B981]/20 text-[#6EE7B7]'
                    : 'border-white/15 bg-white/[0.04] text-[#CBD5E1]'
                }`}
              >
                <span className="truncate max-w-[85px]">{p.name}</span>
                <span>{done ? '✓' : `${count}/${categories.length}`}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Kategorie-Eingabefelder */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5 py-0.5">
          {categories.map((cat, idx) => {
            const val = draft[cat] || '';
            const trimmed = val.trim();
            const isValidLength = trimmed.length >= 2;
            const matchesLetter = trimmed.length > 0 ? startsWithLetter(trimmed, letter) : true;
            const isReadyField = isValidLength && matchesLetter;

            return (
              <div
                key={cat}
                className={`flex flex-col gap-1 rounded-2xl border p-2.5 sm:p-3 transition-colors backdrop-blur-md ${
                  !matchesLetter
                    ? 'border-[#FDA4AF]/50 bg-[#E11D48]/10'
                    : isReadyField
                      ? 'border-[#34D399]/45 bg-[#10B981]/10'
                      : 'border-white/15 bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor={`slf-cat-${idx}`}
                    className="font-arcade text-[11px] sm:text-xs tracking-wider text-[#FDE68A] uppercase"
                  >
                    {cat}
                  </label>
                  {!matchesLetter ? (
                    <span className="font-arcade text-[10px] text-[#FECDD3] uppercase">
                      MUSS MIT {letter} BEGINNEN
                    </span>
                  ) : isReadyField ? (
                    <Check className="h-3.5 w-3.5 text-[#34D399] stroke-[3]" />
                  ) : (
                    <span className="font-arcade text-[10px] text-[#94A3B8] uppercase">
                      {idx + 1}/{categories.length}
                    </span>
                  )}
                </div>

                <input
                  id={`slf-cat-${idx}`}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  value={val}
                  disabled={hasSubmitted || disabled}
                  onChange={(e) => updateField(cat, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (idx < categories.length - 1) {
                        inputRefs.current[idx + 1]?.focus();
                      } else if (canTriggerStop) {
                        handleTriggerSubmit(true);
                      } else {
                        handleTriggerSubmit(false);
                      }
                    }
                  }}
                  maxLength={40}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={`Mit ${letter}...`}
                  className="h-10 rounded-xl border border-white/15 bg-[#0F172A]/70 px-3 text-sm font-medium text-white placeholder:text-white/30 focus:border-[#22D3EE] focus:outline-none disabled:opacity-60"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Unten: Abgeben / Stopp Button */}
      <div className="shrink-0 pt-1">
        {hasSubmitted ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#34D399]/50 bg-[#10B981]/20 px-4 py-3 font-arcade text-xs sm:text-sm text-[#6EE7B7] uppercase">
            <Check className="h-4 w-4 stroke-[3]" />
            <span>
              ABGEGEBEN – WARTE AUF MITSPIELER ({submittedPlayerIds.length}/{activePlayers.length})
            </span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            {canTriggerStop && (
              <OpenButton
                fullWidth
                size="lg"
                variant="amber"
                disabled={disabled}
                onClick={() => handleTriggerSubmit(true)}
              >
                <Hand className="h-4 w-4 shrink-0" />
                <span>STOPP! RUNDE BEENDEN</span>
              </OpenButton>
            )}
            <OpenButton
              fullWidth
              size="lg"
              variant={canTriggerStop ? 'secondary' : 'primary'}
              disabled={disabled || (validFilledCount === 0 && allFilledCount === 0)}
              onClick={() => handleTriggerSubmit(false)}
            >
              <Send className="h-4 w-4 shrink-0" />
              <span>
                FERTIG ({validFilledCount}/{categories.length})
              </span>
            </OpenButton>
          </div>
        )}
      </div>
    </div>
  );
}

export function StadtLandFlussBoard({
  gameState,
  myPlayer,
  allPlayers,
  isGameOver,
  onMove,
  disabled,
}: GameRendererProps<StadtLandFlussState>) {
  const isTv = Boolean(myPlayer?.isTvScreen);
  const activePlayers = useMemo(
    () => allPlayers.filter((p) => !p.isTvScreen),
    [allPlayers]
  );

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const timeoutTriggeredRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const phase = gameState?.phase || 'writing';
  const round = gameState?.round || 1;
  const maxRounds = gameState?.maxRounds || 3;
  const categories = gameState?.categories || ['Stadt', 'Land', 'Fluss', 'Tier', 'Name'];

  const activeCategoryTab = categories.includes(selectedCategory)
    ? selectedCategory
    : categories[0];

  const timeLeft = gameState?.phaseEndsAt
    ? Math.max(0, Math.ceil((gameState.phaseEndsAt - nowMs) / 1000))
    : 0;

  // Automatische Timer-Auslösung für Writing, Review und Round-Over
  useEffect(() => {
    if (isTv || isGameOver || !gameState?.phaseEndsAt) return;
    if (timeLeft > 0) return;

    const phaseKey = `${round}-${phase}`;
    if (timeoutTriggeredRef.current === phaseKey) return;

    if (phase === 'writing' || phase === 'review') {
      timeoutTriggeredRef.current = phaseKey;
      onMove({ type: 'time_up' });
    } else if (phase === 'round_over') {
      timeoutTriggeredRef.current = phaseKey;
      onMove({ type: 'next_round' });
    }
  }, [timeLeft, isTv, isGameOver, gameState?.phaseEndsAt, round, phase, onMove]);

  if (isGameOver || !gameState) {
    return null;
  }

  const rankedPlayers = [...activePlayers].sort(
    (a, b) => (gameState.scores?.[b.id] || 0) - (gameState.scores?.[a.id] || 0)
  );

  // ───────────────────────────────────────────────────────────────
  // A) TV-SCREEN ANSICHT (GROSSFORMAT FÜR WOHNZIMMER-BILDSCHIRM)
  // ───────────────────────────────────────────────────────────────
  if (isTv) {
    if (phase === 'writing') {
      return (
        <div className="flex w-full flex-col gap-3 sm:gap-5 select-none animate-fade-in">
          {/* Große Buchstaben-Bühne */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-5 rounded-2xl sm:rounded-3xl border border-[#22D3EE]/35 bg-[#0F172A]/80 p-3 sm:p-5 lg:p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
              <span className="font-arcade text-4xl sm:text-6xl lg:text-7xl leading-none text-[#FDE68A] drop-shadow-[0_4px_20px_rgba(34,211,238,0.3)] shrink-0 px-1 sm:px-2">
                {gameState.letter}
              </span>
              <div className="flex min-w-0 flex-col gap-1 text-left">
                <span className="font-arcade text-[10px] sm:text-xs tracking-wider text-[#67E8F9] uppercase">
                  RUNDE {round} VON {maxRounds} • EINGABE LÄUFT
                </span>
                <h2 className="font-arcade text-base sm:text-2xl lg:text-3xl text-white uppercase leading-tight">
                  STADT, LAND, FLUSS MIT {gameState.letter}
                </h2>
                <div className="flex flex-wrap gap-1 sm:gap-1.5 pt-0.5">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-lg border border-white/15 bg-white/[0.06] px-2 py-0.5 sm:px-2.5 sm:py-1 font-arcade text-[10px] sm:text-xs text-[#CBD5E1] uppercase"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div
              className={`flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border px-4 py-1.5 sm:px-6 sm:py-3 shrink-0 ${
                timeLeft <= 10
                  ? 'border-[#FDA4AF]/70 bg-[#E11D48]/80 text-white animate-pulse'
                  : 'border-[#F59E0B]/50 bg-[#F59E0B]/15 text-[#FDE68A]'
              }`}
            >
              <span className="font-arcade text-[10px] tracking-widest uppercase opacity-80">
                RESTZEIT
              </span>
              <span className="font-arcade text-3xl sm:text-4xl">{timeLeft}S</span>
            </div>
          </div>

          {/* Live-Fortschritt aller Spieler ohne Wörter zu spoilern */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {activePlayers.map((p) => {
              const filled = gameState.filledCounts?.[p.id] || 0;
              const isDone = gameState.submittedPlayerIds?.includes(p.id);
              const totalScore = gameState.scores?.[p.id] || 0;
              return (
                <div
                  key={p.id}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 transition-all backdrop-blur-md ${
                    isDone
                      ? 'border-[#34D399]/60 bg-[#10B981]/15'
                      : 'border-white/15 bg-[#0F172A]/75'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar config={p.avatar} size={36} />
                      <span className="font-arcade text-sm text-white uppercase truncate">
                        {p.name}
                      </span>
                    </div>
                    <span className="font-arcade text-xs text-[#FDE68A] shrink-0">
                      {totalScore} PKT
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {categories.map((cat, idx) => (
                      <div
                        key={cat}
                        className={`h-2.5 rounded-full transition-all ${
                          idx < filled
                            ? isDone
                              ? 'bg-[#34D399] shadow-[0_0_8px_#34D399]'
                              : 'bg-[#22D3EE] shadow-[0_0_8px_#22D3EE]'
                            : 'bg-white/15'
                        }`}
                      />
                    ))}
                  </div>

                  <span
                    className={`font-arcade text-[10px] uppercase ${
                      isDone ? 'text-[#6EE7B7]' : 'text-[#94A3B8]'
                    }`}
                  >
                    {isDone ? 'FERTIG ABGEGEBEN ✓' : `${filled} / ${categories.length} AUSGEFÜLLT`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (phase === 'review') {
      return (
        <div className="flex w-full flex-col gap-2.5 sm:gap-4 select-none animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 rounded-2xl border border-white/15 bg-[#0F172A]/85 px-3.5 sm:px-5 py-2 sm:py-3 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-[#22D3EE]/50 bg-[#164E63]/70 px-3 py-1 font-arcade text-base text-[#FDE68A]">
                {gameState.letter}
              </span>
              <span className="font-arcade text-sm sm:text-lg text-white uppercase">
                {gameState.stoppedByPlayerName
                  ? `STOPP DURCH ${gameState.stoppedByPlayerName}!`
                  : 'GEMEINSAME AUSWERTUNG'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-[#34D399]/40 bg-[#10B981]/15 px-3 py-1 font-arcade text-xs text-[#6EE7B7] uppercase">
                BEREIT: {gameState.reviewReadyIds?.length || 0} / {activePlayers.length}
              </span>
              <span className="rounded-xl border border-white/20 bg-white/[0.06] px-3 py-1 font-arcade text-xs text-[#FDE68A]">
                {timeLeft} S
              </span>
            </div>
          </div>

          {/* TV-Übersichtstabelle aller Kategorien & Antworten */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
            {categories.map((cat) => (
              <div
                key={cat}
                className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-[#0F172A]/80 p-3 backdrop-blur-xl"
              >
                <div className="border-b border-[#22D3EE]/40 pb-1.5 font-arcade text-xs tracking-wider text-[#67E8F9] uppercase">
                  {cat}
                </div>
                <div className="flex flex-col gap-1.5">
                  {activePlayers.map((p) => {
                    const entry = gameState.evaluated?.[cat]?.[p.id];
                    const votes = gameState.rejectVotes?.[cat]?.[p.id]?.length || 0;
                    const text = entry?.text || '—';
                    return (
                      <div
                        key={p.id}
                        className={`flex flex-col rounded-xl border px-2.5 py-2 ${
                          entry?.valid
                            ? 'border-[#34D399]/40 bg-[#10B981]/15'
                            : entry?.rejected
                              ? 'border-[#FDA4AF]/45 bg-[#E11D48]/15 line-through opacity-75'
                              : 'border-white/10 bg-white/[0.03] opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px] font-arcade text-[#94A3B8] uppercase">
                          <span className="truncate">{p.name}</span>
                          <span
                            className={
                              entry?.points ? 'text-[#FDE68A]' : 'text-[#FECDD3]'
                            }
                          >
                            +{entry?.points || 0}
                          </span>
                        </div>
                        <span className="font-arcade text-xs sm:text-sm text-white uppercase truncate mt-0.5">
                          {text}
                        </span>
                        {votes > 0 && (
                          <span className="font-arcade text-[9px] text-[#FDA4AF] uppercase mt-0.5">
                            VETO: {votes}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // TV Round-Over
    return (
      <div className="flex w-full max-w-2xl mx-auto flex-col items-center gap-5 rounded-3xl border border-white/15 bg-[#0F172A]/85 p-6 text-center backdrop-blur-xl animate-fade-in">
        <div className="flex items-center gap-2 border-b-2 border-[#F59E0B] px-3 pb-1">
          <Trophy className="h-5 w-5 text-[#FBBF24]" />
          <h2 className="font-arcade text-2xl text-white uppercase">
            ZWISCHENSTAND NACH RUNDE {round}
          </h2>
        </div>

        <div className="flex w-full flex-col gap-2">
          {rankedPlayers.map((p, idx) => {
            const gained = gameState.roundScores?.[p.id] || 0;
            const total = gameState.scores?.[p.id] || 0;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-arcade text-sm text-[#FBBF24] w-6">#{idx + 1}</span>
                  <Avatar config={p.avatar} size={34} />
                  <span className="font-arcade text-sm text-white uppercase truncate">{p.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {gained > 0 && (
                    <span className="rounded-lg border border-[#34D399]/50 bg-[#10B981]/20 px-2 py-0.5 font-arcade text-xs text-[#6EE7B7]">
                      +{gained}
                    </span>
                  )}
                  <span className="font-arcade text-base text-[#FDE68A]">{total} PKT</span>
                </div>
              </div>
            );
          })}
        </div>

        <span className="font-arcade text-xs text-[#94A3B8] uppercase">
          {round >= maxRounds
            ? `ENDSTAND IN ${timeLeft} S...`
            : `NÄCHSTE RUNDE IN ${timeLeft} S...`}
        </span>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────
  // B) SPIELER-ANSICHT: PHASE 1 (EIGENE WÖRTER EINGEBEN)
  // ───────────────────────────────────────────────────────────────
  if (phase === 'writing') {
    const myInitial = gameState.answers?.[myPlayer.id] || {};
    const hasSubmitted = gameState.submittedPlayerIds?.includes(myPlayer.id);

    return (
      <WritingSheet
        key={`slf-round-${round}-${gameState.letter}`}
        letter={gameState.letter}
        round={round}
        maxRounds={maxRounds}
        timeLeft={timeLeft}
        categories={categories}
        stopButtonEnabled={gameState.stopButtonEnabled !== false}
        initialAnswers={myInitial}
        hasSubmitted={Boolean(hasSubmitted)}
        activePlayers={activePlayers}
        myPlayerId={myPlayer.id}
        filledCounts={gameState.filledCounts || {}}
        submittedPlayerIds={gameState.submittedPlayerIds || []}
        disabled={disabled}
        onSaveDraft={(answers) => onMove({ type: 'save_draft', answers })}
        onSubmitRound={(answers, triggerStop) =>
          onMove({ type: 'submit_round', answers, triggerStop })
        }
      />
    );
  }

  // ───────────────────────────────────────────────────────────────
  // C) SPIELER-ANSICHT: PHASE 2 (AUSWERTUNG & LIVE-VETO)
  // ───────────────────────────────────────────────────────────────
  if (phase === 'review') {
    const hasConfirmedReady = gameState.reviewReadyIds?.includes(myPlayer.id);
    const myRoundGain = gameState.roundScores?.[myPlayer.id] || 0;
    const categoryEntries = activePlayers.map((p) => ({
      player: p,
      entry: gameState.evaluated?.[activeCategoryTab]?.[p.id],
      votes: gameState.rejectVotes?.[activeCategoryTab]?.[p.id] || [],
    }));

    return (
      <div className="flex w-full max-w-3xl flex-1 min-h-0 flex-col justify-between gap-2.5 sm:gap-3 mx-auto select-none animate-fade-in">
        {/* Kopfzeile Auswertung */}
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-[#22D3EE]/50 bg-[#0F172A]/85 px-2.5 py-1 font-arcade text-sm text-[#FDE68A]">
              {gameState.letter}
            </span>
            <div className="flex flex-col">
              <span className="font-arcade text-xs sm:text-sm text-white uppercase">
                {gameState.stoppedByPlayerName
                  ? `STOPP: ${gameState.stoppedByPlayerName}`
                  : 'AUSWERTUNG'}
              </span>
              <span className="font-arcade text-[10px] text-[#6EE7B7] uppercase">
                DIESE RUNDE: +{myRoundGain} PKT
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-1 font-arcade text-xs text-[#FDE68A]">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{timeLeft} S</span>
          </div>
        </div>

        {/* Kategorie-Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 sm:gap-1.5 sm:overflow-x-auto no-scrollbar shrink-0 py-0.5">
          {categories.map((cat) => {
            const active = cat === activeCategoryTab;
            const myCatPoints = gameState.evaluated?.[cat]?.[myPlayer.id]?.points || 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-arcade text-[11px] uppercase transition-all shrink-0 cursor-pointer ${
                  active
                    ? 'border-[#22D3EE] bg-[#164E63]/80 text-white shadow-[0_0_14px_rgba(34,211,238,0.28)]'
                    : 'border-white/15 bg-white/[0.04] text-[#CBD5E1] hover:bg-white/10'
                }`}
              >
                <span>{cat}</span>
                {myCatPoints > 0 && (
                  <span className="text-[#6EE7B7]">+{myCatPoints}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Spieler-Antworten in der ausgewählten Kategorie */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
          {categoryEntries.map(({ player: p, entry, votes }) => {
            const isMe = p.id === myPlayer.id;
            const iVotedAgainst = votes.includes(myPlayer.id);
            const wordText = entry?.text || '';
            const canVote =
              !isMe &&
              wordText.length >= 2 &&
              startsWithLetter(wordText, gameState.letter);

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-3 transition-colors ${
                  entry?.valid
                    ? 'border-[#34D399]/45 bg-[#10B981]/10'
                    : entry?.rejected
                      ? 'border-[#FDA4AF]/45 bg-[#E11D48]/15'
                      : 'border-white/15 bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Avatar config={p.avatar} size={32} />
                  <div className="flex flex-col min-w-0">
                    <span className="font-arcade text-[10px] text-[#94A3B8] uppercase truncate">
                      {p.name} {isMe ? '(DU)' : ''}
                    </span>
                    <span
                      className={`font-arcade text-sm sm:text-base uppercase truncate ${
                        entry?.rejected
                          ? 'line-through text-[#FECDD3]'
                          : wordText
                            ? 'text-white'
                            : 'text-white/35'
                      }`}
                    >
                      {wordText || '— LEER —'}
                    </span>
                    {entry?.reason && (
                      <span className="font-arcade text-[9px] text-[#CBD5E1] uppercase">
                        {entry.reason}
                        {votes.length > 0 ? ` • ${votes.length} VETO` : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`rounded-lg border px-2 py-1 font-arcade text-xs ${
                      entry?.points
                        ? 'border-[#F59E0B]/50 bg-[#F59E0B]/20 text-[#FDE68A]'
                        : 'border-white/15 bg-white/[0.04] text-[#94A3B8]'
                    }`}
                  >
                    +{entry?.points || 0}
                  </span>

                  {canVote && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        playMoveSound();
                        onMove({
                          type: 'toggle_vote',
                          targetPlayerId: p.id,
                          category: activeCategoryTab,
                        });
                      }}
                      title={
                        iVotedAgainst ? 'Veto zurücknehmen' : 'Antwort anzweifeln / streichen'
                      }
                      className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 font-arcade text-[10px] uppercase transition-all cursor-pointer active:scale-95 ${
                        iVotedAgainst
                          ? 'border-[#FDA4AF]/60 bg-[#E11D48] text-white'
                          : 'border-white/20 bg-white/[0.06] text-[#FECDD3] hover:bg-[#E11D48]/30'
                      }`}
                    >
                      {iVotedAgainst ? (
                        <>
                          <RotateCcw className="h-3 w-3" />
                          <span>DOCH OK</span>
                        </>
                      ) : (
                        <>
                          <Ban className="h-3 w-3" />
                          <span>STREICHEN</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Weiter-Button */}
        <div className="shrink-0 pt-1">
          <OpenButton
            fullWidth
            size="lg"
            variant={hasConfirmedReady ? 'secondary' : 'primary'}
            disabled={disabled || hasConfirmedReady}
            onClick={() => {
              playWinSound();
              onMove({ type: 'review_ready' });
            }}
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>
              {hasConfirmedReady
                ? `BEREIT ✓ – WARTE AUF MITSPIELER (${gameState.reviewReadyIds?.length || 0}/${activePlayers.length})`
                : `WEITER (${gameState.reviewReadyIds?.length || 0}/${activePlayers.length})`}
            </span>
          </OpenButton>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────
  // D) SPIELER-ANSICHT: PHASE 3 (RUNDEN-ZWISCHENSTAND)
  // ───────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 min-h-0 flex-col items-center overflow-y-auto px-2 py-2 sm:py-4 select-none animate-fade-in">
      <div className="my-auto flex w-full flex-col items-center gap-3 sm:gap-5 text-center">
        <div className="flex items-center gap-2 border-b-2 border-[#22D3EE] px-3 pb-1">
          <Sparkles className="h-5 w-5 text-[#67E8F9]" />
          <h2 className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
            RUNDE {round} <span className="text-[#FDE68A]">BEENDET</span>
          </h2>
        </div>

        <div className="flex w-full flex-col gap-2">
          {rankedPlayers.map((p, idx) => {
            const gained = gameState.roundScores?.[p.id] || 0;
            const total = gameState.scores?.[p.id] || 0;
            const isMe = p.id === myPlayer.id;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 ${
                  isMe
                    ? 'border-[#22D3EE]/55 bg-[#164E63]/35'
                    : 'border-white/15 bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-arcade text-xs text-[#FBBF24] w-5">#{idx + 1}</span>
                  <Avatar config={p.avatar} size={30} />
                  <span className="font-arcade text-xs sm:text-sm text-white uppercase truncate">
                    {p.name} {isMe ? '(DU)' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {gained > 0 && (
                    <span className="rounded-lg border border-[#34D399]/50 bg-[#10B981]/20 px-2 py-0.5 font-arcade text-[11px] text-[#6EE7B7]">
                      +{gained}
                    </span>
                  )}
                  <span className="font-arcade text-sm sm:text-base text-[#FDE68A]">
                    {total} PKT
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <span className="font-arcade text-xs text-[#94A3B8] uppercase">
          {round >= maxRounds
            ? `ENDERGEBNIS IN ${timeLeft} S...`
            : `NÄCHSTE RUNDE IN ${timeLeft} S...`}
        </span>
      </div>
    </div>
  );
}
