import { Check, Crown, Loader2 } from 'lucide-react';
import { Avatar } from '../Avatar';
import type { Player } from '../../types/multiplayer';

interface LobbyPlayersGridProps {
  players: Player[];
  maxPlayers: number;
  minPlayers: number;
  readyCount: number;
  currentUserId?: string;
  avatarSize?: number;
  showWaitingSlots?: boolean;
  emptyText?: string;
  onEditMe?: () => void;
}

/**
 * Offenes, kartenfreies 4-Spalten-Raster für verbundene Lobby-Spieler.
 * Zeigt große runde Avatare mit visuellem Bereit-/Warte-Zustand direkt am Avatar
 * sowie dem zentrierten Spielernamen darunter.
 */
export function LobbyPlayersGrid({
  players,
  maxPlayers,
  minPlayers,
  readyCount,
  currentUserId,
  avatarSize = 60,
  showWaitingSlots = false,
  emptyText = 'WARTE AUF SPIELER...',
  onEditMe,
}: LobbyPlayersGridProps) {
  const targetReadyTotal = Math.max(minPlayers, players.length);
  const missingPlayersCount = showWaitingSlots
    ? Math.max(0, minPlayers - players.length)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between px-1">
        <span className="font-arcade text-xs sm:text-sm text-[#CBD5E1] uppercase tracking-wider">
          VERBUNDENE SPIELER ({players.length}/{maxPlayers})
        </span>
        <span className="font-arcade text-xs sm:text-sm text-[#34D399] uppercase tracking-wider">
          {readyCount}/{targetReadyTotal} BEREIT
        </span>
      </div>

      {players.length === 0 && missingPlayersCount === 0 ? (
        <div className="py-8 text-center font-arcade text-sm text-[#94A3B8] uppercase">
          {emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-7 py-1">
          {players.map((p, idx) => {
            const isMe = Boolean(currentUserId && p.id === currentUserId);
            const isInteractive = isMe && Boolean(onEditMe);

            return (
              <div
                key={p.id || idx}
                onClick={isInteractive ? onEditMe : undefined}
                title={isInteractive ? 'Klicken, um Name und Avatar anzupassen' : undefined}
                className={`flex flex-col items-center gap-2.5 text-center min-w-0 ${
                  isInteractive ? 'cursor-pointer group' : ''
                }`}
              >
                <div
                  className={`relative rounded-full transition-all duration-200 ${
                    p.isReady
                      ? 'ring-[3px] ring-[#34D399] shadow-[0_0_16px_rgba(52,211,153,0.42)]'
                      : 'opacity-55 ring-2 ring-white/15'
                  } ${isInteractive ? 'group-hover:scale-105' : ''}`}
                >
                  <Avatar config={p.avatar} size={avatarSize} />

                  {p.isReady && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-[#10B981] text-white ring-2 ring-[#1B2B40]">
                      <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[3]" />
                    </span>
                  )}

                  {p.isHost && (
                    <span
                      title="Host dieser Lobby"
                      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F59E0B] text-[#0F172A] ring-2 ring-[#1B2B40]"
                    >
                      <Crown className="h-3 w-3 fill-current" />
                    </span>
                  )}
                </div>

                <span
                  className={`font-arcade w-full truncate text-[11px] sm:text-xs uppercase tracking-wide ${
                    p.isReady ? 'text-white' : 'text-white/70'
                  }`}
                >
                  {p.name}
                  {isMe ? ' (DU)' : ''}
                </span>
              </div>
            );
          })}

          {Array.from({ length: missingPlayersCount }).map((_, slotIdx) => (
            <div
              key={`open-slot-${slotIdx}`}
              className="flex flex-col items-center gap-2.5 text-center opacity-50"
            >
              <div
                style={{ width: avatarSize, height: avatarSize }}
                className="flex items-center justify-center rounded-full border-2 border-dashed border-white/25 bg-white/[0.03]"
              >
                <Loader2 className="h-5 w-5 animate-spin text-[#94A3B8]" />
              </div>
              <span className="font-arcade w-full truncate text-[10px] sm:text-xs text-[#94A3B8] uppercase">
                FREI
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
