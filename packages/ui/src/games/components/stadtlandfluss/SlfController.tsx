import { useEffect, useState } from 'react';
import { Ban, Check, Hand, Send, ArrowRight } from 'lucide-react';
import type { Player, StadtLandFlussMove, StadtLandFlussState } from '@projektbox/shared/types';
import { startsWithLetter } from '@projektbox/shared/utils';
import deskBackdropUrl from '../../../assets/textures/stadtlandfluss/desk_paper_backdrop.jpg';
import { SlfCategoryPicker } from './SlfCategoryPicker';

interface SlfControllerProps {
  gameState: StadtLandFlussState;
  allPlayers: Player[];
  myPlayer: Player;
  timeLeft: number;
  onMove: (move: StadtLandFlussMove) => void;
}

export function SlfController({
  gameState,
  allPlayers,
  myPlayer,
  timeLeft,
  onMove,
}: SlfControllerProps) {
  const myId = myPlayer?.id || '';
  const phase = gameState.phase;
  const categories = gameState.categories ?? [];
  const activePlayers = allPlayers.filter((p) => !p.isTvScreen);
  const isChooser = gameState.categoryChooserId === myId;
  const isSubmitted = gameState.submittedPlayerIds.includes(myId);
  const isReviewReady = gameState.reviewReadyIds.includes(myId);

  const [drafts, setDrafts] = useState<Record<string, string>>(
    () => gameState.answers[myId] ?? {}
  );

  // Sync when new round starts
  useEffect(() => {
    if (phase === 'writing') {
      setDrafts(gameState.answers[myId] ?? {});
    }
  }, [gameState.round, phase]);

  // Debounced draft sync so TV sees live fill-count progress
  useEffect(() => {
    if (phase !== 'writing' || isSubmitted) return;
    const timer = setTimeout(() => {
      onMove({ type: 'save_draft', answers: drafts });
    }, 550);
    return () => clearTimeout(timer);
  }, [drafts, phase, isSubmitted, onMove]);

  if (phase === 'choosing_categories') {
    return (
      <div
        className="relative flex h-full w-full flex-col overflow-hidden bg-[#f5efe4] bg-cover bg-center text-[#1E293B]"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(250,246,238,0.75), rgba(244,237,224,0.88)), url(${deskBackdropUrl})`,
        }}
      >
        <SlfCategoryPicker
          initialCategories={categories}
          chooserName={gameState.categoryChooserName || 'Ein Mitspieler'}
          isChooser={isChooser}
          timeLeft={timeLeft}
          onConfirm={(cats) => onMove({ type: 'set_categories', categories: cats })}
        />
      </div>
    );
  }

  const allFilledValid =
    categories.length > 0 &&
    categories.every((cat) => {
      const val = (drafts[cat] ?? '').trim();
      return val.length > 0 && startsWithLetter(val, gameState.letter);
    });

  return (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#f5efe4] bg-cover bg-center pt-[max(0.45rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.6rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] text-[#1E293B] select-none"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(250,246,238,0.75), rgba(244,237,224,0.88)), url(${deskBackdropUrl})`,
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-between gap-2">
        {/* Clean Open Header Strip (pl-24 reserves MENÜ zone, no ● Name pill) */}
        <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-[#1E3A8A]/25 pr-1 pl-24 sm:pl-28">
          <div className="flex h-8 items-center gap-2.5 leading-none">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1E3A8A] font-serif text-base font-black leading-none text-amber-100 shadow-sm">
              {gameState.letter}
            </span>
            <span className="text-xs font-bold leading-none tabular-nums text-[#475569]">
              {gameState.scores[myId] ?? 0} Pkt
            </span>
          </div>

          <div className="flex h-8 items-center gap-3 leading-none">
            <span className="text-xs font-bold leading-none text-[#475569] uppercase">
              R{gameState.round}/{gameState.maxRounds}
            </span>
            <span
              className={`font-serif text-lg font-black leading-none tabular-nums ${
                timeLeft <= 8 && phase === 'writing'
                  ? 'animate-pulse text-[#DC2626]'
                  : 'text-[#1E3A8A]'
              }`}
            >
              {timeLeft}s
            </span>
          </div>
        </header>

        {phase === 'writing' ? (
          /* Right-Handed in Landscape: Lined inputs on LEFT, STOPP/Submit on RIGHT */
          <div className="flex flex-1 min-h-0 flex-col justify-between gap-2 landscape:grid landscape:grid-cols-[1fr_175px] landscape:items-center landscape:gap-4">
            <div className="flex min-h-0 flex-1 flex-col justify-start gap-2 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const val = drafts[cat] ?? '';
                const trimmed = val.trim();
                const isValid = trimmed.length > 0 && startsWithLetter(trimmed, gameState.letter);
                const isWrongLetter = trimmed.length > 0 && !startsWithLetter(trimmed, gameState.letter);

                return (
                  <label
                    key={cat}
                    className="flex items-center justify-between gap-2 border-b-2 border-[#1E3A8A]/25 py-1.5 focus-within:border-[#1E3A8A]"
                  >
                    <span className="w-28 shrink-0 truncate text-xs font-bold text-[#1E3A8A] uppercase sm:w-36 sm:text-sm">
                      {cat}
                    </span>
                    <input
                      type="text"
                      disabled={isSubmitted}
                      value={val}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={`${gameState.letter}…`}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [cat]: e.target.value }))
                      }
                      className="min-w-0 flex-1 bg-transparent text-base font-bold text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none disabled:opacity-60"
                    />
                    {isValid && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                    {isWrongLetter && (
                      <span className="shrink-0 text-xs font-black text-red-600">
                        ≠ {gameState.letter}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Right-Handed Primary Action */}
            <div className="flex shrink-0 items-center justify-end gap-2 landscape:h-full landscape:flex-col landscape:justify-center">
              {gameState.stopButtonEnabled && allFilledValid && !isSubmitted ? (
                <button
                  type="button"
                  onClick={() => onMove({ type: 'submit_round', answers: drafts, triggerStop: true })}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#7F1D1D] bg-[#DC2626] px-4 py-3 text-base font-black text-white shadow-lg transition active:translate-y-0.5 landscape:h-28 landscape:flex-col"
                >
                  <Hand className="h-6 w-6" />
                  <span>STOPP!</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => onMove({ type: 'submit_round', answers: drafts })}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#14532D] bg-[#16A34A] px-4 py-3 text-base font-black text-white shadow-lg transition active:translate-y-0.5 disabled:opacity-55 landscape:h-28 landscape:flex-col"
                >
                  <Send className="h-5 w-5" />
                  <span>{isSubmitted ? 'Abgegeben' : 'Abgeben'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Review & Veto Voting on Smartphone */
          <div className="flex flex-1 min-h-0 flex-col justify-between gap-2">
            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div key={cat} className="space-y-1 border-b border-[#1E3A8A]/20 pb-2">
                  <div className="text-xs font-black tracking-wider text-[#1E3A8A] uppercase">
                    {cat}
                  </div>
                  {activePlayers.map((p) => {
                    const ev = gameState.evaluated[p.id]?.[cat];
                    const votes = gameState.rejectVotes[p.id]?.[cat] ?? [];
                    const iVoted = votes.includes(myId);
                    const canVote = phase === 'review' && Boolean(ev?.text);

                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="w-20 shrink-0 truncate text-xs font-bold text-[#475569]">
                            {p.name}
                          </span>
                          <span
                            className={`truncate font-bold ${
                              ev?.rejected
                                ? 'text-red-600 line-through opacity-75'
                                : ev?.valid
                                  ? 'text-[#0F172A]'
                                  : 'text-[#94A3B8]'
                            }`}
                          >
                            {ev?.text || '—'}
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`text-xs font-black tabular-nums ${
                              (ev?.points ?? 0) > 0 ? 'text-emerald-700' : 'text-[#94A3B8]'
                            }`}
                          >
                            {ev?.points ?? 0} Pkt
                          </span>
                          {canVote && (
                            <button
                              type="button"
                              onClick={() =>
                                onMove({
                                  type: 'toggle_vote',
                                  targetPlayerId: p.id,
                                  category: cat,
                                })
                              }
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                iVoted
                                  ? 'bg-red-600 text-white'
                                  : 'bg-red-600/12 text-red-700'
                              }`}
                            >
                              <Ban className="h-3 w-3" />
                              <span>Einspruch{votes.length > 0 ? ` (${votes.length})` : ''}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={phase === 'review' && isReviewReady}
              onClick={() => onMove({ type: phase === 'review' ? 'review_ready' : 'next_round' })}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl border-b-4 border-[#14532D] bg-[#16A34A] py-3 text-base font-black text-white shadow-lg transition active:translate-y-0.5 disabled:opacity-55"
            >
              <span>
                {phase === 'review'
                  ? isReviewReady
                    ? 'Warte auf Team…'
                    : 'Auswertung bestätigen'
                  : gameState.round >= gameState.maxRounds
                    ? 'Endergebnis'
                    : 'Nächste Runde'}
              </span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
