import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Ban,
  Check,
  Clock,
  Hand,
  ListPlus,
  RotateCcw,
  Send,
  Sparkles,
  Trophy,
  Wand2,
} from 'lucide-react';
import type {
  EvaluatedAnswer,
  StadtLandFlussState,
  StadtLandFlussTheme,
} from '@projektbox/shared/types';
import {
  normalizeSlfCategories,
  normalizeSlfComparisonKey,
  SLF_CUSTOM_CATEGORY_SUGGESTIONS,
  SLF_MAX_CUSTOM_CATEGORIES,
  SLF_MIN_CUSTOM_CATEGORIES,
  startsWithLetter,
} from '@projektbox/shared/utils';
import type { GameRendererProps } from '../types';
import { Avatar } from '../../components/Avatar';
import { OpenButton } from '../../components/OpenSubpageUI';
import { playMoveSound, playWinSound, triggerHapticFeedback } from '../../utils/soundEffects';

export type { EvaluatedAnswer, StadtLandFlussState, StadtLandFlussTheme };

interface SlfThemeTokens {
  id: StadtLandFlussTheme;
  label: string;
  stageSurface: string;
  heroLetter: string;
  headingText: string;
  subText: string;
  mutedText: string;
  categoryHeader: string;
  categoryChip: string;
  answerValid: string;
  answerRejected: string;
  answerEmpty: string;
  answerText: string;
  pointsValid: string;
  pointsEmpty: string;
  timerNormal: string;
  readyPill: string;
  inputClass: string;
  labelClass: string;
  tabActive: string;
  tabIdle: string;
}

const SLF_THEME_ORDER: StadtLandFlussTheme[] = [
  'studio-open',
  'klassik-papier',
  'neon-quizshow',
  'minimal-editorial',
];

const SLF_THEME_TOKENS: Record<StadtLandFlussTheme, SlfThemeTokens> = {
  'studio-open': {
    id: 'studio-open',
    label: 'Studio',
    stageSurface: 'bg-transparent text-white',
    heroLetter: 'text-[#FDE68A] drop-shadow-[0_6px_28px_rgba(34,211,238,0.35)]',
    headingText: 'text-white',
    subText: 'text-[#67E8F9]',
    mutedText: 'text-[#94A3B8]',
    categoryHeader: 'border-b-2 border-[#22D3EE]/50 text-[#67E8F9]',
    categoryChip: 'border-b-2 border-[#22D3EE]/40 bg-white/[0.04] text-[#E2E8F0]',
    answerValid: 'border-l-4 border-[#34D399] bg-[#10B981]/14 text-white',
    answerRejected: 'border-l-4 border-[#F43F5E] bg-[#E11D48]/14 text-[#FECDD3] line-through opacity-75',
    answerEmpty: 'border-l-2 border-white/15 bg-white/[0.03] text-[#94A3B8] opacity-75',
    answerText: 'text-white',
    pointsValid: 'text-[#6EE7B7]',
    pointsEmpty: 'text-[#94A3B8]',
    timerNormal: 'border-white/20 bg-white/[0.06] text-[#FDE68A]',
    readyPill: 'border-[#34D399]/50 bg-[#10B981]/15 text-[#6EE7B7]',
    inputClass:
      'border-0 border-b-2 border-white/25 bg-white/[0.04] text-white placeholder:text-white/35 focus:border-[#22D3EE]',
    labelClass: 'text-[#FDE68A]',
    tabActive: 'border-[#22D3EE] bg-[#164E63]/80 text-white shadow-[0_0_14px_rgba(34,211,238,0.28)]',
    tabIdle: 'border-white/15 bg-white/[0.04] text-[#CBD5E1] hover:bg-white/10',
  },
  'klassik-papier': {
    id: 'klassik-papier',
    label: 'Papier',
    stageSurface:
      'rounded-3xl bg-[#FAF6EE] text-[#0F172A] shadow-[0_24px_60px_rgba(0,0,0,0.45)] border-2 border-[#E2D9C5]',
    heroLetter: 'text-[#1E3A8A] drop-shadow-none',
    headingText: 'text-[#0F172A]',
    subText: 'text-[#E11D48]',
    mutedText: 'text-[#475569]',
    categoryHeader: 'border-b-2 border-[#1E3A8A]/60 text-[#1E3A8A]',
    categoryChip: 'border-b-2 border-[#93C5FD] bg-[#EFF6FF] text-[#1E3A8A]',
    answerValid: 'border-b-2 border-[#059669]/50 bg-[#ECFDF5] text-[#064E3B]',
    answerRejected: 'border-b-2 border-[#E11D48]/50 bg-[#FFF1F2] text-[#9F1239] line-through opacity-80',
    answerEmpty: 'border-b border-[#CBD5E1] bg-transparent text-[#64748B]',
    answerText: 'text-[#0F172A]',
    pointsValid: 'text-[#047857]',
    pointsEmpty: 'text-[#64748B]',
    timerNormal: 'border-[#CBD5E1] bg-white text-[#1E3A8A]',
    readyPill: 'border-[#10B981] bg-[#D1FAE5] text-[#065F46]',
    inputClass:
      'crystal-input-light border-0 border-b-2 border-[#94A3B8] bg-white/75 text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#1E3A8A]',
    labelClass: 'text-[#1E3A8A]',
    tabActive: 'border-[#1E3A8A] bg-[#1E3A8A] text-white',
    tabIdle: 'border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F1F5F9]',
  },
  'neon-quizshow': {
    id: 'neon-quizshow',
    label: 'Neon',
    stageSurface:
      'rounded-3xl bg-gradient-to-br from-[#0F0726]/95 via-[#180C38]/95 to-[#081229]/95 text-white border border-[#F472B6]/35 shadow-[0_0_50px_rgba(244,114,182,0.18)]',
    heroLetter: 'text-[#F472B6] drop-shadow-[0_0_26px_rgba(244,114,182,0.65)]',
    headingText: 'text-white',
    subText: 'text-[#22D3EE]',
    mutedText: 'text-[#C4B5FD]',
    categoryHeader: 'border-b-2 border-[#F472B6]/70 text-[#F472B6]',
    categoryChip: 'border border-[#22D3EE]/45 bg-[#22D3EE]/10 text-[#67E8F9]',
    answerValid: 'border-l-4 border-[#22D3EE] bg-[#22D3EE]/14 text-white',
    answerRejected: 'border-l-4 border-[#FB7185] bg-[#FB7185]/14 text-[#FECDD3] line-through opacity-75',
    answerEmpty: 'border-l-2 border-[#A78BFA]/30 bg-white/[0.03] text-[#A78BFA] opacity-75',
    answerText: 'text-white',
    pointsValid: 'text-[#22D3EE]',
    pointsEmpty: 'text-[#A78BFA]',
    timerNormal: 'border-[#22D3EE]/60 bg-[#22D3EE]/12 text-[#67E8F9]',
    readyPill: 'border-[#F472B6]/60 bg-[#F472B6]/15 text-[#FBCFE8]',
    inputClass:
      'border-0 border-b-2 border-[#A78BFA]/45 bg-[#1E1042]/70 text-white placeholder:text-[#C4B5FD]/40 focus:border-[#F472B6]',
    labelClass: 'text-[#22D3EE]',
    tabActive: 'border-[#F472B6] bg-[#831843]/85 text-white shadow-[0_0_16px_rgba(244,114,182,0.4)]',
    tabIdle: 'border-[#A78BFA]/30 bg-white/[0.04] text-[#DDD6FE] hover:bg-white/10',
  },
  'minimal-editorial': {
    id: 'minimal-editorial',
    label: 'Minimal',
    stageSurface: 'bg-transparent text-[#F8FAFC]',
    heroLetter: 'text-[#FACC15] drop-shadow-none',
    headingText: 'text-[#F8FAFC]',
    subText: 'text-[#EAB308]',
    mutedText: 'text-[#94A3B8]',
    categoryHeader: 'border-b border-[#FACC15]/45 text-[#FACC15]',
    categoryChip: 'border-b border-white/25 bg-transparent text-[#F1F5F9]',
    answerValid: 'border-b border-white/15 bg-transparent text-white',
    answerRejected: 'border-b border-[#F43F5E]/40 bg-transparent text-[#FDA4AF] line-through opacity-70',
    answerEmpty: 'border-b border-white/10 bg-transparent text-[#64748B]',
    answerText: 'text-[#F8FAFC]',
    pointsValid: 'text-[#FACC15]',
    pointsEmpty: 'text-[#64748B]',
    timerNormal: 'border-white/20 bg-transparent text-[#F8FAFC]',
    readyPill: 'border-[#FACC15]/60 bg-transparent text-[#FDE047]',
    inputClass:
      'border-0 border-b border-white/30 bg-transparent text-white placeholder:text-white/30 focus:border-[#FACC15]',
    labelClass: 'text-[#FACC15]',
    tabActive: 'border-[#FACC15] bg-[#FACC15]/15 text-[#FEF08A]',
    tabIdle: 'border-white/15 bg-transparent text-[#94A3B8] hover:text-white',
  },
};

const CATEGORY_PLACEHOLDERS = [
  'Z. B. AUTOMARKE',
  'Z. B. FILM ODER SERIE',
  'Z. B. ESSEN & TRINKEN',
  'Z. B. BERUF',
  'Z. B. SCHULFACH',
];

function CategoryChooserSheet({
  round,
  maxRounds,
  timeLeft,
  disabled,
  onConfirm,
}: {
  round: number;
  maxRounds: number;
  timeLeft: number;
  disabled?: boolean;
  onConfirm: (categories: string[]) => void;
}) {
  const [inputs, setInputs] = useState<string[]>(() =>
    Array.from({ length: SLF_MAX_CUSTOM_CATEGORIES }, () => '')
  );
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const normalizedCategories = normalizeSlfCategories(inputs);
  const nonEmptyTrimmed = inputs.map((v) => v.trim()).filter((v) => v.length > 0);
  const keyCounts = new Map<string, number>();
  for (const val of nonEmptyTrimmed) {
    const key = normalizeSlfComparisonKey(val);
    if (key) keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
  }
  const hasDuplicates = Array.from(keyCounts.values()).some((c) => c > 1);
  const isReady = normalizedCategories.length >= SLF_MIN_CUSTOM_CATEGORIES;

  const applySuggestionSet = () => {
    const pick =
      SLF_CUSTOM_CATEGORY_SUGGESTIONS[
        Math.floor(Math.random() * SLF_CUSTOM_CATEGORY_SUGGESTIONS.length)
      ];
    setInputs(
      Array.from({ length: SLF_MAX_CUSTOM_CATEGORIES }, (_, idx) => pick[idx] || '')
    );
    setError(null);
    playMoveSound();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (disabled) return;
    if (!isReady) {
      setError(
        `Bitte mindestens ${SLF_MIN_CUSTOM_CATEGORIES} eindeutige Kategorien (je 2–28 Zeichen) eingeben.`
      );
      return;
    }
    setError(null);
    playMoveSound();
    triggerHapticFeedback(20);
    onConfirm(normalizedCategories);
  };

  return (
    <div className="my-auto mx-auto flex w-full max-w-2xl flex-1 min-h-0 flex-col justify-between gap-3 py-1 select-none animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 border-b-2 border-[#F59E0B] pb-0.5">
          <ListPlus className="h-4 w-4 text-[#FBBF24]" />
          <span className="font-arcade text-xs uppercase tracking-wider text-[#FDE68A]">
            RUNDE {round} / {maxRounds} • DU WÄHLST DIE KATEGORIEN
          </span>
        </div>

        <div
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1 font-arcade text-xs shrink-0 ${
            timeLeft <= 10
              ? 'border-[#FDA4AF]/60 bg-[#E11D48] text-white animate-pulse'
              : 'border-white/15 bg-white/[0.06] text-[#FDE68A]'
          }`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{timeLeft} S</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 shrink-0">
        <div>
          <h2 className="font-arcade text-xl sm:text-2xl tracking-wider text-white uppercase">
            EIGENE KATEGORIEN FESTLEGEN
          </h2>
          <p className="font-arcade text-[11px] text-[#94A3B8] uppercase mt-0.5">
            GIB {SLF_MIN_CUSTOM_CATEGORIES} BIS {SLF_MAX_CUSTOM_CATEGORIES} KATEGORIEN FÜR ALLE SPIELER EIN.
          </p>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={applySuggestionSet}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#22D3EE]/45 bg-[#0891B2]/20 px-3 py-2 font-arcade text-[11px] text-[#67E8F9] uppercase hover:bg-[#0891B2]/35 cursor-pointer"
        >
          <Wand2 className="h-3.5 w-3.5" />
          <span>IDEEN</span>
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-1 min-h-0 flex-col justify-between gap-3 overflow-y-auto pr-0.5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-0.5">
          {inputs.map((val, idx) => {
            const trimmed = val.trim();
            const isValidEntry = trimmed.length >= 2;
            const key = trimmed ? normalizeSlfComparisonKey(trimmed) : '';
            const isDup = Boolean(key && (keyCounts.get(key) || 0) > 1);
            return (
              <div
                key={idx}
                className="flex flex-col gap-1"
              >
                <div className="flex items-center justify-between px-0.5">
                  <label
                    htmlFor={`slf-custom-cat-${idx}`}
                    className="font-arcade text-[10px] tracking-wider text-[#FDE68A] uppercase"
                  >
                    KATEGORIE {idx + 1} {idx < SLF_MIN_CUSTOM_CATEGORIES ? '*' : '(OPTIONAL)'}
                  </label>
                  {isDup ? (
                    <span className="font-arcade text-[10px] text-[#FECDD3] uppercase">
                      DOPPELT
                    </span>
                  ) : isValidEntry ? (
                    <Check className="h-3.5 w-3.5 text-[#34D399] stroke-[3]" />
                  ) : null}
                </div>

                <input
                  id={`slf-custom-cat-${idx}`}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  value={val}
                  disabled={disabled}
                  autoFocus={idx === 0}
                  maxLength={28}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={CATEGORY_PLACEHOLDERS[idx] || 'KATEGORIE...'}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setInputs((prev) => prev.map((item, i) => (i === idx ? nextVal : item)));
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (idx < inputs.length - 1) {
                        inputRefs.current[idx + 1]?.focus();
                      } else if (isReady) {
                        handleSubmit();
                      }
                    }
                  }}
                  className={`h-10 rounded-xl border px-3 text-sm font-medium text-white placeholder:text-white/30 focus:border-[#F59E0B] focus:outline-none disabled:opacity-60 transition-colors ${
                    isDup
                      ? 'border-[#FDA4AF]/65 bg-[#E11D48]/15'
                      : isValidEntry
                        ? 'border-[#34D399]/60 bg-[#10B981]/15'
                        : 'border-white/15 bg-[#0F172A]/75'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {(hasDuplicates || error) && (
          <div className="rounded-xl border border-[#FDA4AF]/45 bg-[#E11D48]/20 px-3 py-2 font-arcade text-xs text-[#FECDD3] uppercase text-center">
            {error || 'JEDE KATEGORIE DARF NUR EINMAL VORKOMMEN.'}
          </div>
        )}

        <div className="shrink-0 pt-1">
          <OpenButton
            type="submit"
            fullWidth
            size="lg"
            variant="primary"
            disabled={disabled || !isReady}
          >
            <Send className="h-4 w-4 shrink-0" />
            <span>
              KATEGORIEN STARTEN ({normalizedCategories.length}/{SLF_MAX_CUSTOM_CATEGORIES})
            </span>
          </OpenButton>
        </div>
      </form>
    </div>
  );
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
  theme: SlfThemeTokens;
  onCycleTheme: () => void;
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
  theme,
  onCycleTheme,
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
    <div
      className={`flex w-full max-w-5xl flex-1 min-h-0 flex-col justify-between gap-3 sm:gap-4 mx-auto select-none p-3 sm:p-5 ${theme.stageSurface}`}
    >
      {/* Kopfzeile mit Buchstabe, Timer & Designart */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <span className={`font-arcade text-4xl sm:text-5xl leading-none shrink-0 px-1 ${theme.heroLetter}`}>
            {letter}
          </span>
          <div className="flex flex-col">
            <span className={`font-arcade text-[10px] sm:text-xs tracking-widest uppercase ${theme.subText}`}>
              RUNDE {round} / {maxRounds}
            </span>
            <span className={`font-arcade text-sm sm:text-base uppercase ${theme.headingText}`}>
              WÖRTER MIT {letter}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCycleTheme}
            className={`rounded-xl border px-2.5 py-1.5 font-arcade text-[10px] uppercase cursor-pointer transition-colors ${theme.timerNormal}`}
            title="Designart wechseln"
          >
            STIL: {theme.label}
          </button>
          <div
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-arcade text-xs sm:text-sm shrink-0 transition-colors ${
              timeLeft <= 10
                ? 'border-[#FDA4AF]/60 bg-[#E11D48] text-white animate-pulse shadow-[0_0_16px_rgba(225,29,72,0.45)]'
                : theme.timerNormal
            }`}
          >
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{timeLeft} S</span>
          </div>
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
                className="flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <label
                    htmlFor={`slf-cat-${idx}`}
                    className={`font-arcade text-[11px] sm:text-xs tracking-wider uppercase ${theme.labelClass}`}
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
                  className={`h-11 rounded-t-xl px-3.5 text-sm sm:text-base font-medium focus:outline-none disabled:opacity-60 transition-colors ${
                    !matchesLetter
                      ? 'border-0 border-b-2 border-[#FDA4AF] bg-[#E11D48]/15 text-white'
                      : isReadyField
                        ? 'border-0 border-b-2 border-[#34D399] bg-[#10B981]/12'
                        : theme.inputClass
                  }`}
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
  const [localThemeOverride, setLocalThemeOverride] = useState<StadtLandFlussTheme | null>(null);
  const timeoutTriggeredRef = useRef<{ key: string; sentAt: number } | null>(null);

  const activeThemeId: StadtLandFlussTheme =
    localThemeOverride || gameState?.theme || 'studio-open';
  const theme = SLF_THEME_TOKENS[activeThemeId] || SLF_THEME_TOKENS['studio-open'];
  const cycleTheme = () => {
    const idx = SLF_THEME_ORDER.indexOf(activeThemeId);
    const next = SLF_THEME_ORDER[(idx + 1) % SLF_THEME_ORDER.length];
    setLocalThemeOverride(next);
  };

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
    if (
      timeoutTriggeredRef.current &&
      timeoutTriggeredRef.current.key === phaseKey &&
      Date.now() - timeoutTriggeredRef.current.sentAt < 1800
    ) {
      return;
    }

    if (
      phase === 'choosing_categories' ||
      phase === 'writing' ||
      phase === 'review'
    ) {
      timeoutTriggeredRef.current = { key: phaseKey, sentAt: Date.now() };
      onMove({ type: 'time_up' });
    } else if (phase === 'round_over') {
      timeoutTriggeredRef.current = { key: phaseKey, sentAt: Date.now() };
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
    const renderTvTimerPill = () => (
      <span
        className={`font-arcade shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-4 py-1.5 text-sm sm:text-base ${
          timeLeft <= 10
            ? 'border-[#F87171]/60 bg-[#EF4444]/20 text-[#FCA5A5] animate-pulse'
            : theme.timerNormal
        }`}
      >
        <Clock className="h-4 w-4 shrink-0" />
        <span>{timeLeft} S</span>
      </span>
    );

    const renderTvPlayersStrip = (mode: 'choosing' | 'writing' | 'review') => (
      <div className="flex w-full flex-wrap items-center justify-center gap-5 sm:gap-7 lg:gap-10 py-2">
        {activePlayers.map((p) => {
          const isChooser = p.id === gameState.categoryChooserId;
          const isDone = gameState.submittedPlayerIds?.includes(p.id);
          const isReady = gameState.reviewReadyIds?.includes(p.id);
          const filled = gameState.filledCounts?.[p.id] || 0;
          const totalScore = gameState.scores?.[p.id] || 0;
          const highlighted =
            mode === 'choosing' ? isChooser : mode === 'writing' ? isDone : isReady;

          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 min-w-0 transition-all duration-300 ${
                mode === 'choosing' && !isChooser ? 'opacity-55 scale-95' : ''
              }`}
            >
              <div className="relative shrink-0">
                <div
                  className={`relative rounded-full transition-all ${
                    highlighted
                      ? mode === 'choosing'
                        ? 'ring-4 ring-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.55)]'
                        : 'ring-4 ring-[#34D399] shadow-[0_0_18px_rgba(52,211,153,0.45)]'
                      : 'ring-2 ring-white/20'
                  }`}
                >
                  <Avatar config={p.avatar} size={52} />
                </div>
                {(mode === 'writing' && isDone) || (mode === 'review' && isReady) ? (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981] text-white ring-2 ring-[#0F172A]">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`font-arcade truncate max-w-[130px] text-xs sm:text-sm uppercase ${theme.headingText}`}>
                  {p.name}
                </span>
                <span className={`font-arcade text-[11px] uppercase ${theme.subText}`}>
                  {mode === 'choosing'
                    ? isChooser
                      ? 'WÄHLT...'
                      : `${totalScore} PKT`
                    : mode === 'writing'
                      ? isDone
                        ? 'FERTIG ✓'
                        : `${filled}/${categories.length} • ${totalScore} PKT`
                      : `${totalScore} PKT`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );

    if (phase === 'choosing_categories') {
      return (
        <div
          className={`flex w-full max-w-[1520px] mx-auto flex-1 min-h-0 flex-col justify-between gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8 select-none animate-fade-in ${theme.stageSurface}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-current/10 pb-4">
            <div className="flex items-center gap-3">
              <span className={`font-arcade text-sm sm:text-base tracking-wider uppercase ${theme.subText}`}>
                RUNDE {round}/{maxRounds}
              </span>
              <span className={`font-arcade text-lg sm:text-2xl tracking-wider uppercase ${theme.headingText}`}>
                EIGENE KATEGORIEN
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-xl border px-3 py-1 font-arcade text-xs uppercase ${theme.timerNormal}`}>
                STIL: {theme.label}
              </span>
              {renderTvTimerPill()}
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center py-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-[#F59E0B]/60 bg-[#F59E0B]/15 text-[#FBBF24]">
              <ListPlus className="h-12 w-12" />
            </div>
            <h2 className={`font-arcade text-2xl sm:text-4xl uppercase leading-tight max-w-2xl ${theme.headingText}`}>
              {gameState.categoryChooserName || 'SPIELER'} WÄHLT DIE KATEGORIEN...
            </h2>
          </div>

          {renderTvPlayersStrip('choosing')}
        </div>
      );
    }

    if (phase === 'writing') {
      return (
        <div
          className={`flex w-full max-w-[1520px] mx-auto flex-1 min-h-0 flex-col justify-between gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8 select-none animate-fade-in ${theme.stageSurface}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-current/10 pb-4">
            <div className="flex items-center gap-3">
              <span className={`font-arcade text-sm sm:text-base tracking-wider uppercase ${theme.subText}`}>
                RUNDE {round}/{maxRounds}
              </span>
              <span className={`font-arcade text-lg sm:text-2xl tracking-wider uppercase ${theme.headingText}`}>
                EINGABE LÄUFT
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-xl border px-3 py-1 font-arcade text-xs uppercase ${theme.timerNormal}`}>
                STIL: {theme.label}
              </span>
              {renderTvTimerPill()}
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-8 py-4 text-center">
            <span className={`font-arcade text-7xl sm:text-9xl lg:text-[9.5rem] leading-none ${theme.heroLetter}`}>
              {gameState.letter}
            </span>
            <h2 className={`font-arcade text-xl sm:text-3xl uppercase tracking-wide ${theme.headingText}`}>
              STADT, LAND, FLUSS MIT {gameState.letter}
            </h2>
            <div className="grid w-full max-w-5xl grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className={`px-4 py-3 font-arcade text-sm sm:text-base uppercase tracking-wider text-center ${theme.categoryChip}`}
                >
                  {cat}
                </div>
              ))}
            </div>
          </div>

          {renderTvPlayersStrip('writing')}
        </div>
      );
    }

    if (phase === 'review') {
      return (
        <div
          className={`flex w-full max-w-[1520px] mx-auto flex-1 min-h-0 flex-col justify-between gap-5 lg:gap-7 p-4 sm:p-6 lg:p-8 select-none animate-fade-in ${theme.stageSurface}`}
        >
          {/* Offene Vollbreiten-Kopfzeile */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-current/10 pb-4 shrink-0">
            <div className="flex items-center gap-4">
              <span className={`font-arcade text-4xl sm:text-5xl leading-none ${theme.heroLetter}`}>
                {gameState.letter}
              </span>
              <div className="flex flex-col">
                <span className={`font-arcade text-xs sm:text-sm tracking-widest uppercase ${theme.subText}`}>
                  RUNDE {round}/{maxRounds} • {theme.label.toUpperCase()}
                </span>
                <span className={`font-arcade text-lg sm:text-2xl tracking-wider uppercase ${theme.headingText}`}>
                  {gameState.stoppedByPlayerName
                    ? `STOPP DURCH ${gameState.stoppedByPlayerName}!`
                    : 'AUSWERTUNG'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`rounded-xl border px-3.5 py-1.5 font-arcade text-xs sm:text-sm uppercase ${theme.readyPill}`}>
                BEREIT: {gameState.reviewReadyIds?.length || 0}/{activePlayers.length}
              </span>
              {renderTvTimerPill()}
            </div>
          </div>

          {/* Kompakter horizontaler Spieler-Streifen */}
          {renderTvPlayersStrip('review')}

          {/* Offene Vollbreiten-Kategoriespalten ohne enge Kästen */}
          <div
            className={`w-full flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 ${
              categories.length <= 3
                ? 'lg:grid-cols-3'
                : categories.length === 4
                  ? 'lg:grid-cols-4'
                  : 'lg:grid-cols-5'
            } gap-5 lg:gap-7 items-start`}
          >
            {categories.map((cat) => (
              <div key={cat} className="flex flex-col gap-3 min-w-0">
                <div className={`pb-2 font-arcade text-sm sm:text-base tracking-[0.16em] uppercase ${theme.categoryHeader}`}>
                  {cat}
                </div>
                <div className="flex flex-col gap-2.5">
                  {activePlayers.map((p) => {
                    const entry = gameState.evaluated?.[cat]?.[p.id];
                    const votes = gameState.rejectVotes?.[cat]?.[p.id]?.length || 0;
                    const text = entry?.text || '—';
                    return (
                      <div
                        key={p.id}
                        className={`flex flex-col px-3.5 py-2.5 transition-colors ${
                          entry?.valid
                            ? theme.answerValid
                            : entry?.rejected
                              ? theme.answerRejected
                              : theme.answerEmpty
                        }`}
                      >
                        <div className={`flex items-center justify-between gap-2 text-[11px] font-arcade uppercase ${theme.mutedText}`}>
                          <span className="truncate">{p.name}</span>
                          <span className={entry?.points ? theme.pointsValid : theme.pointsEmpty}>
                            +{entry?.points || 0}
                          </span>
                        </div>
                        <span className={`font-arcade text-base sm:text-lg lg:text-xl uppercase truncate mt-1 ${theme.answerText}`}>
                          {text}
                        </span>
                        {votes > 0 && (
                          <span className="font-arcade text-[10px] text-[#FDA4AF] uppercase mt-1">
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
      <div className="flex w-full max-w-2xl mx-auto flex-col items-center gap-5 p-4 text-center animate-fade-in">
        <div className="flex items-center gap-2 border-b-2 border-[#F59E0B] px-3 pb-1">
          <Trophy className="h-5 w-5 text-[#FBBF24]" />
          <h2 className="font-arcade text-2xl text-white uppercase">
            ZWISCHENSTAND NACH RUNDE {round}
          </h2>
        </div>

        <div className="grid w-full grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-6 py-2">
          {rankedPlayers.map((p, idx) => {
            const gained = gameState.roundScores?.[p.id] || 0;
            const total = gameState.scores?.[p.id] || 0;
            return (
              <div
                key={p.id}
                className="flex flex-col items-center gap-2 text-center min-w-0"
              >
                <div
                  className={`relative rounded-full ${
                    idx === 0
                      ? 'ring-[3px] ring-[#FBBF24] shadow-[0_0_14px_rgba(251,191,36,0.4)]'
                      : 'ring-2 ring-white/20'
                  }`}
                >
                  <Avatar config={p.avatar} size={58} />
                  <span className="absolute -top-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#F59E0B] font-arcade text-[10px] text-[#0F172A] ring-2 ring-[#1B2B40]">
                    #{idx + 1}
                  </span>
                </div>
                <span className="font-arcade w-full truncate text-xs sm:text-sm text-white uppercase">
                  {p.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-arcade text-sm text-[#FDE68A]">{total} PKT</span>
                  {gained > 0 && (
                    <span className="font-arcade text-xs text-[#34D399]">+{gained}</span>
                  )}
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
  // B0) SPIELER-ANSICHT: PHASE 0 (EIGENE KATEGORIEN WÄHLEN)
  // ───────────────────────────────────────────────────────────────
  if (phase === 'choosing_categories') {
    const isChooser = myPlayer.id === gameState.categoryChooserId;
    if (isChooser) {
      return (
        <CategoryChooserSheet
          key={`slf-choose-${round}-${myPlayer.id}`}
          round={round}
          maxRounds={maxRounds}
          timeLeft={timeLeft}
          disabled={disabled}
          onConfirm={(chosenCategories) =>
            onMove({ type: 'set_categories', categories: chosenCategories })
          }
        />
      );
    }

    return (
      <div className="my-auto mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col items-center justify-center gap-5 px-3 py-4 text-center select-none animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#F59E0B]/55 bg-[#F59E0B]/15 text-[#FDE68A]">
          <ListPlus className="h-8 w-8 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <span className="font-arcade text-xs tracking-widest text-[#67E8F9] uppercase">
            RUNDE {round} / {maxRounds}
          </span>
          <h2 className="font-arcade text-xl sm:text-2xl tracking-wider text-white uppercase">
            {gameState.categoryChooserName || 'MITSPIELER'} WÄHLT KATEGORIEN...
          </h2>
          <p className="font-arcade text-xs text-[#94A3B8] uppercase">
            GLEICH GEHT ES LOS ({timeLeft} S)
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          {rankedPlayers.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 ${
                p.id === gameState.categoryChooserId
                  ? 'border-[#F59E0B]/60 bg-[#F59E0B]/15'
                  : 'border-white/15 bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar config={p.avatar} size={28} />
                <span className="font-arcade text-xs text-white uppercase truncate">
                  {p.name}
                </span>
              </div>
              <span className="font-arcade text-xs text-[#FDE68A]">
                {gameState.scores?.[p.id] || 0} PKT
              </span>
            </div>
          ))}
        </div>
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
        theme={theme}
        onCycleTheme={cycleTheme}
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
      <div
        className={`flex w-full max-w-5xl flex-1 min-h-0 flex-col justify-between gap-3 sm:gap-4 mx-auto p-3 sm:p-5 select-none animate-fade-in ${theme.stageSurface}`}
      >
        {/* Kopfzeile Auswertung */}
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <span className={`font-arcade text-3xl sm:text-4xl leading-none ${theme.heroLetter}`}>
              {gameState.letter}
            </span>
            <div className="flex flex-col">
              <span className={`font-arcade text-xs sm:text-sm uppercase ${theme.headingText}`}>
                {gameState.stoppedByPlayerName
                  ? `STOPP: ${gameState.stoppedByPlayerName}`
                  : 'AUSWERTUNG'}
              </span>
              <span className={`font-arcade text-[10px] uppercase ${theme.pointsValid}`}>
                DIESE RUNDE: +{myRoundGain} PKT
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cycleTheme}
              className={`rounded-xl border px-2.5 py-1 font-arcade text-[10px] uppercase cursor-pointer transition-colors ${theme.timerNormal}`}
              title="Designart wechseln"
            >
              STIL: {theme.label}
            </button>
            <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1 font-arcade text-xs ${theme.timerNormal}`}>
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{timeLeft} S</span>
            </div>
          </div>
        </div>

        {/* Kategorie-Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:overflow-x-auto no-scrollbar shrink-0 py-0.5">
          {categories.map((cat) => {
            const active = cat === activeCategoryTab;
            const myCatPoints = gameState.evaluated?.[cat]?.[myPlayer.id]?.points || 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-arcade text-[11px] uppercase transition-all shrink-0 cursor-pointer ${
                  active ? theme.tabActive : theme.tabIdle
                }`}
              >
                <span>{cat}</span>
                {myCatPoints > 0 && (
                  <span className={theme.pointsValid}>+{myCatPoints}</span>
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

        <div className="grid w-full grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-5 py-2">
          {rankedPlayers.map((p, idx) => {
            const gained = gameState.roundScores?.[p.id] || 0;
            const total = gameState.scores?.[p.id] || 0;
            const isMe = p.id === myPlayer.id;
            return (
              <div
                key={p.id}
                className="flex flex-col items-center gap-2 text-center min-w-0"
              >
                <div
                  className={`relative rounded-full ${
                    isMe
                      ? 'ring-[3px] ring-[#22D3EE]'
                      : 'ring-2 ring-white/20'
                  }`}
                >
                  <Avatar config={p.avatar} size={52} />
                  <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F59E0B] font-arcade text-[10px] text-[#0F172A] ring-2 ring-[#1B2B40]">
                    #{idx + 1}
                  </span>
                </div>
                <span className="font-arcade w-full truncate text-xs text-white uppercase">
                  {p.name} {isMe ? '(DU)' : ''}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-arcade text-xs sm:text-sm text-[#FDE68A]">
                    {total} PKT
                  </span>
                  {gained > 0 && (
                    <span className="font-arcade text-[11px] text-[#34D399]">+{gained}</span>
                  )}
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
