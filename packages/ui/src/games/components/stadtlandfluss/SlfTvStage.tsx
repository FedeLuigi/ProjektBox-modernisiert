import { Ban, Check, Hand, ArrowRight } from 'lucide-react';
import type { Player, StadtLandFlussMove, StadtLandFlussState } from '@projektbox/shared/types';
import { Avatar } from '../../../components/Avatar';
import deskBackdropUrl from '../../../assets/textures/stadtlandfluss/desk_paper_backdrop.jpg';
import { SlfCategoryPicker } from './SlfCategoryPicker';

interface SlfTvStageProps {
  gameState: StadtLandFlussState;
  allPlayers: Player[];
  myPlayer: Player;
  isTvScreen: boolean;
  timeLeft: number;
  onMove: (move: StadtLandFlussMove) => void;
}

export function SlfTvStage({
  gameState,
  allPlayers,
  myPlayer,
  isTvScreen,
  timeLeft,
  onMove,
}: SlfTvStageProps) {
  const activePlayers = allPlayers.filter((p) => !p.isTvScreen);
  const categories = gameState.categories ?? [];
  const phase = gameState.phase;
  const myId = myPlayer?.id || '';
  const isChooser = !isTvScreen && gameState.categoryChooserId === myId;
  const isReviewReady = gameState.reviewReadyIds.includes(myId);

  return (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-y-auto lg:overflow-hidden bg-[#f5efe4] bg-cover bg-center px-5 pt-14 pb-5 text-[#1E293B] select-none sm:px-8 lg:pt-6"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(250,246,238,0.72), rgba(244,237,224,0.82)), url(${deskBackdropUrl})`,
      }}
    >
      {phase === 'choosing_categories' ? (
        <SlfCategoryPicker
          initialCategories={categories}
          chooserName={gameState.categoryChooserName || 'Ein Mitspieler'}
          isChooser={isChooser}
          timeLeft={timeLeft}
          onConfirm={(cats) => onMove({ type: 'set_categories', categories: cats })}
        />
      ) : (
        <div className="mx-auto flex h-full w-full max-w-[1380px] min-h-0 flex-1 flex-col justify-between gap-4">
          {/* Open Top Header Strip */}
          <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#1E3A8A]/20 pb-3 pl-24 lg:pl-28">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#1E3A8A]/40 bg-[#1E3A8A] font-serif text-3xl font-black leading-none text-amber-100 shadow-md">
                {gameState.letter}
              </div>
              <div className="leading-tight">
                <div className="text-xs font-bold tracking-widest text-[#B45309] uppercase">
                  Runde {gameState.round} von {gameState.maxRounds}
                </div>
                <h1 className="font-serif text-xl font-black text-[#0F172A] sm:text-2xl">
                  {phase === 'writing'
                    ? 'Begriffe suchen'
                    : phase === 'review'
                      ? 'Auswertung & Einspruch'
                      : 'Runden-Ergebnis'}
                </h1>
              </div>
            </div>

            {/* Player Score & Ready Ribbon */}
            <div className="flex flex-wrap items-center gap-4">
              {activePlayers.map((p) => {
                const totalScore = gameState.scores[p.id] ?? 0;
                const roundDelta = gameState.roundScores[p.id] ?? 0;
                const isSubmitted = gameState.submittedPlayerIds.includes(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <Avatar config={p.avatar} size={32} />
                    <div className="leading-tight">
                      <div className="flex items-center gap-1 text-xs font-bold text-[#0F172A]">
                        <span>{p.name}</span>
                        {phase === 'writing' && isSubmitted && (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                      </div>
                      <div className="text-xs font-black tabular-nums text-[#1E3A8A]">
                        {totalScore} Pkt
                        {phase !== 'writing' && roundDelta > 0 && (
                          <span className="ml-1 text-emerald-600">(+{roundDelta})</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="h-7 w-px bg-[#1E3A8A]/20" />

              <span
                className={`font-serif text-2xl font-black leading-none tabular-nums ${
                  timeLeft <= 8 && phase === 'writing'
                    ? 'animate-pulse text-[#DC2626]'
                    : 'text-[#1E3A8A]'
                }`}
              >
                {timeLeft}s
              </span>
            </div>
          </header>

          {/* Main Stage Body */}
          {phase === 'writing' ? (
            <div className="grid flex-1 min-h-0 grid-cols-1 items-center gap-6 lg:grid-cols-[320px_1fr]">
              {/* Left: Giant Ink-Stamp Letter & Category List */}
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-44 w-44 items-center justify-center rounded-full border-4 border-dashed border-[#1E3A8A]/45 bg-[#FAF6EE]/80 font-serif text-8xl font-black leading-none text-[#1E3A8A] shadow-xl">
                  {gameState.letter}
                </div>
                {gameState.stoppedByPlayerName && (
                  <div className="inline-flex items-center gap-1.5 font-bold text-[#DC2626]">
                    <Hand className="h-4 w-4" />
                    <span>STOPP durch {gameState.stoppedByPlayerName}!</span>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className="border-b-2 border-[#1E3A8A]/35 px-2 py-0.5 text-sm font-bold text-[#0F172A]"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: Live Writing Progress per Player (Open Design Rows) */}
              <div className="space-y-4">
                {activePlayers.map((p) => {
                  const filled = gameState.filledCounts[p.id] ?? 0;
                  const pct = Math.min(100, Math.round((filled / Math.max(1, categories.length)) * 100));
                  const done = gameState.submittedPlayerIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-4 border-b border-[#1E3A8A]/15 pb-3"
                    >
                      <Avatar config={p.avatar} size={36} />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between text-sm font-bold text-[#0F172A]">
                          <span className="truncate">{p.name}</span>
                          <span className="tabular-nums text-[#1E3A8A]">
                            {done ? 'Abgegeben ✓' : `${filled} / ${categories.length}`}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1E3A8A]/12">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              done ? 'bg-emerald-600' : 'bg-[#1E3A8A]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Review / Round-Over Open Notebook Matrix */
            <div className="flex flex-1 min-h-0 flex-col justify-between gap-3">
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b-2 border-[#1E3A8A]/35 text-xs font-bold tracking-wider text-[#1E3A8A] uppercase">
                      <th className="py-2 pr-3">Spieler</th>
                      {categories.map((cat) => (
                        <th key={cat} className="px-2 py-2">
                          {cat}
                        </th>
                      ))}
                      <th className="py-2 pl-3 text-right">Runde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePlayers.map((p) => (
                      <tr key={p.id} className="border-b border-[#1E3A8A]/15">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2 font-bold text-[#0F172A]">
                            <Avatar config={p.avatar} size={26} />
                            <span className="max-w-[110px] truncate text-sm">{p.name}</span>
                          </div>
                        </td>
                        {categories.map((cat) => {
                          const ev = gameState.evaluated[p.id]?.[cat];
                          const votes = gameState.rejectVotes[p.id]?.[cat] ?? [];
                          const iVoted = votes.includes(myId);
                          const canVote = !isTvScreen && phase === 'review' && ev?.text;

                          return (
                            <td key={cat} className="px-2 py-2 align-middle">
                              <div className="flex items-center justify-between gap-1.5">
                                <span
                                  className={`text-sm font-bold ${
                                    ev?.rejected
                                      ? 'text-red-600 line-through opacity-75'
                                      : ev?.valid
                                        ? 'text-[#0F172A]'
                                        : 'text-[#64748B]'
                                  }`}
                                >
                                  {ev?.text || '—'}
                                </span>
                                <div className="flex items-center gap-1">
                                  {ev && (
                                    <span
                                      className={`text-xs font-black tabular-nums ${
                                        ev.points > 0 ? 'text-emerald-700' : 'text-[#94A3B8]'
                                      }`}
                                    >
                                      {ev.points}
                                    </span>
                                  )}
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
                                      title="Einspruch einlegen"
                                      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold transition ${
                                        iVoted
                                          ? 'bg-red-600 text-white'
                                          : 'bg-red-600/12 text-red-700 hover:bg-red-600/25'
                                      }`}
                                    >
                                      <Ban className="h-3 w-3" />
                                      {votes.length > 0 && <span>{votes.length}</span>}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                        <td className="py-2.5 pl-3 text-right font-serif text-base font-black tabular-nums text-emerald-700">
                          +{gameState.roundScores[p.id] ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!isTvScreen && (
                <div className="flex justify-end border-t border-[#1E3A8A]/20 pt-3">
                  <button
                    type="button"
                    disabled={phase === 'review' && isReviewReady}
                    onClick={() =>
                      onMove({ type: phase === 'review' ? 'review_ready' : 'next_round' })
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border-b-4 border-[#14532D] bg-[#16A34A] px-7 py-3 text-base font-black text-white shadow-lg transition active:translate-y-0.5 disabled:opacity-55"
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
          )}
        </div>
      )}
    </div>
  );
}
