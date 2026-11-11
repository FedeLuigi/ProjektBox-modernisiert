import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Play,
  Sparkles,
  Tv,
} from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { getUserProfile } from '../../utils/userProfile';
import { Avatar } from '../Avatar';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import {
  BTN_PRIMARY_BASE,
  BTN_PRIMARY_DISABLED,
  BTN_PRIMARY_ENABLED,
  BTN_SECONDARY_BASE,
  BTN_SECONDARY_NEUTRAL,
  BTN_SUCCESS_CONFIRMED,
  BTN_SUCCESS_READY,
  HEADER_BACK_BTN,
  HEADER_ROW,
} from '../../styles/uiTokens';

interface InLobbyViewProps {
  lobby: Lobby;
  gameTitle?: string;
  onLeave: () => void;
  onGameStart: (lobby?: Lobby) => void;
}

export function InLobbyView({
  lobby: initialLobby,
  gameTitle,
  onLeave,
  onGameStart,
}: InLobbyViewProps) {
  const [lobby, setLobby] = useState<Lobby>(initialLobby);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const currentUser = getUserProfile();

  // Im TV-Modus ist der TV-Screen kein Mitglied der Lobby, sondern nur der Großbildschirm!
  const activePlayers = lobby.isTvMode
    ? lobby.players.filter((p) => !p.isTvScreen)
    : lobby.players;

  const myPlayer =
    activePlayers.find((p) => p.id === currentUser.id) ||
    lobby.players.find((p) => p.id === currentUser.id);

  const isHost = myPlayer?.isHost ?? false;
  const isRoomLeader = lobby.isTvMode
    ? activePlayers[0]?.id === currentUser.id
    : isHost;
  const isReady = myPlayer?.isReady ?? false;

  const allReady =
    activePlayers.length >= lobby.minPlayers &&
    activePlayers.length <= lobby.maxPlayers &&
    activePlayers.every((p) => p.isReady);

  // Wer darf das Spiel starten?
  // Im regulären Modus: Nur der Host
  // Im TV-Modus: Der Raumleiter (Spieler 1 auf Handy) oder jeder Smartphone-Spieler, sobald alle bereit sind!
  const canStartGame = lobby.isTvMode ? (isRoomLeader || allReady) : isHost;

  useEffect(() => {
    const unsubUpdated = socketService.onLobbyUpdated(({ lobby: updatedLobby, message }) => {
      setLobby(updatedLobby);
      if (message) setErrorMsg(message);
    });

    const unsubStarted = socketService.onGameStarted(({ lobby: updatedLobby }) => {
      setLobby(updatedLobby);
      onGameStart(updatedLobby);
    });

    const unsubDiscon = socketService.onPlayerDisconnected(({ playerName }) => {
      setErrorMsg(`${playerName} hat die Verbindung verloren.`);
    });

    return () => {
      unsubUpdated();
      unsubStarted();
      unsubDiscon();
    };
  }, [onGameStart]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(lobby.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleToggleReady = async () => {
    try {
      await socketService.toggleReady();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleStartGame = async () => {
    if (!allReady || !canStartGame || isStarting) return;
    setIsStarting(true);
    try {
      await socketService.startLobby();
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsStarting(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // A) TV-MODUS CONTROLLER-ANSICHT (FÜR SMARTPHONES DIREKT MIT BEREIT-BUTTON)
  // ═════════════════════════════════════════════════════════════════════════════
  if (lobby.isTvMode) {
    return (
      <div className="flex h-full w-full flex-col justify-between animate-fade-in select-none">
        {/* 1. Header: Zurück & Verbindungs-Status */}
        <header className={HEADER_ROW}>
          <button
            type="button"
            onClick={onLeave}
            className={HEADER_BACK_BTN}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Lobby verlassen</span>
          </button>

          <ConnectionStatusBadge />
        </header>

        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-between min-h-0 overflow-y-auto overscroll-y-contain py-2 scrollbar-none">

        {/* ─── Fehlermeldung ─── */}
        {errorMsg && (
          <div className="my-2 rounded-2xl bg-purple-500/15 p-3 text-center text-xs font-bold text-purple-200 ring-1 ring-purple-500/25 animate-fade-in shrink-0">
            {errorMsg}
          </div>
        )}

        {/* 2. ZENTRUM: DIREKTER TV-CONTROLLER MIT GROSSEM BEREIT-BUTTON */}
        <div className="flex flex-col items-center my-auto py-2 w-full">
          {/* Status-Pille: Verbunden mit Fernseher */}
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/20 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-purple-300 ring-1 ring-purple-500/35 mb-2">
            <Tv className="h-3.5 w-3.5 text-purple-400" />
            <span>TV-Controller</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-center text-white tracking-tight">
            {gameTitle || lobby.name}
          </h2>

          <p className="text-xs text-[#8E8E93] text-center mt-0.5">
            Verbunden mit Großbild-Fernseher • Raum <strong className="text-white tracking-wider">{lobby.code}</strong>
          </p>

          {/* Dein Spieler-Profil */}
          <div className="mt-5 flex items-center gap-3.5 p-4 rounded-[24px] bg-[#18181C]/80 ring-1 ring-white/[0.08] backdrop-blur-xl shadow-lg w-full">
            <div className="relative shrink-0">
              <Avatar config={myPlayer?.avatar || currentUser.avatar} size={52} />
              {isRoomLeader && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-black shadow-xs">
                  <Crown className="h-2.5 w-2.5 fill-current" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-black text-sm truncate">
                <span className="truncate">{myPlayer?.name || currentUser.name}</span>
                <span className="text-[11px] text-purple-400 font-semibold shrink-0">(Du)</span>
              </div>
              <div className="text-xs font-medium text-[#8E8E93]">
                {isRoomLeader ? 'Spieler 1 (Raumleiter)' : 'Spieler 2'} • Steuert am Fernseher
              </div>
            </div>
            <span
              className={`text-xs font-black px-3 py-1.5 rounded-full ring-1 shrink-0 ${
                isReady
                  ? 'bg-emerald-500/25 text-emerald-300 ring-emerald-500/40'
                  : 'bg-white/10 text-white/50 ring-white/15'
              }`}
            >
              {isReady ? 'Bereit ✓' : 'Wartet...'}
            </span>
          </div>

          {/* ─── DER BEREIT-BUTTON (IM ZENTRUM) ─── */}
          <div className="mt-6 w-full flex flex-col gap-3">
            <button
              type="button"
              onClick={handleToggleReady}
              className={`${BTN_SECONDARY_BASE} ${
                isReady
                  ? BTN_SUCCESS_CONFIRMED
                  : canStartGame
                    ? BTN_SECONDARY_NEUTRAL
                    : BTN_SUCCESS_READY
              }`}
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>{isReady ? 'Bereit ✓ (Tippen zum Abbrechen)' : 'Ich bin bereit!'}</span>
            </button>

            {/* Start-Button oder Statusanzeige */}
            {canStartGame ? (
              <button
                type="button"
                disabled={!allReady || isStarting}
                onClick={handleStartGame}
                className={`${BTN_PRIMARY_BASE} ${
                  allReady && !isStarting ? BTN_PRIMARY_ENABLED : BTN_PRIMARY_DISABLED
                }`}
              >
                <Play className="h-4 w-4 fill-current" />
                <span>
                  {!allReady
                    ? activePlayers.length < lobby.minPlayers
                      ? `Warte auf ${lobby.minPlayers}. Spieler...`
                      : `Warte bis alle bereit sind (${activePlayers.filter((p) => p.isReady).length}/${activePlayers.length})`
                    : 'Spiel jetzt starten'}
                </span>
              </button>
            ) : (
              <div className="flex h-12 w-full items-center justify-center rounded-full bg-white/[0.06] px-5 ring-1 ring-white/10 text-center text-xs font-semibold text-[#AEAEB2]">
                {activePlayers.length < lobby.minPlayers
                  ? `Warte auf ${lobby.minPlayers}. Spieler am Fernseher...`
                  : `Warte bis alle Mitspieler bereit sind (${activePlayers.filter((p) => p.isReady).length}/${activePlayers.length})`}
              </div>
            )}
          </div>

          {/* ─── MITSPIELER-LISTE AM TV (KOMPAKT) ─── */}
          <div className="mt-6 w-full flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#8E8E93] px-1">
              <span>Mitspieler am Fernseher ({activePlayers.length}/{lobby.maxPlayers})</span>
              {activePlayers.length < lobby.maxPlayers && (
                <span className="text-amber-400 animate-pulse text-[11px]">Warte auf Mitspieler...</span>
              )}
            </div>

            {activePlayers.map((p, idx) => (
              <div
                key={p.id || idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-md"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar config={p.avatar} size={36} />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{p.name}</span>
                      {p.id === currentUser.id && <span className="text-[10px] text-purple-400 font-semibold">(Du)</span>}
                    </div>
                    <div className="text-[10px] text-[#8E8E93]">
                      Spieler {idx + 1}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-extrabold px-3 py-1 rounded-full ring-1 ${
                    p.isReady
                      ? 'bg-emerald-500/25 text-emerald-300 ring-emerald-500/40'
                      : 'bg-white/10 text-white/50 ring-white/10'
                  }`}
                >
                  {p.isReady ? 'Bereit ✓' : 'Noch nicht bereit'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Fußzeile */}
        <div className="shrink-0 text-center text-[11px] text-[#8E8E93] pt-2">
          📱 Dein Smartphone dient als Controller. Das Spiel läuft auf dem Fernseher.
        </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // B) STANDARD MULTIPLAYER LOBBY (OHNE FERNSEHER)
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex h-full w-full flex-col justify-between animate-fade-in select-none">
      {/* 1. HEADER: Zurück-Pille & Status */}
      <header className={HEADER_ROW}>
        <button
          type="button"
          onClick={onLeave}
          className={HEADER_BACK_BTN}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Lobby verlassen</span>
        </button>

        <ConnectionStatusBadge />
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-between min-h-0">

      {/* ─── Fehlermeldung / Info-Banner ─── */}
      {errorMsg && (
        <div className="my-2 rounded-2xl bg-purple-500/15 p-3 text-center text-xs font-bold text-purple-200 ring-1 ring-purple-500/25 animate-fade-in">
          {errorMsg}
        </div>
      )}

      {/* 2. ZENTRUM: LOBBY DETAILS & RAUM-CODE */}
      <div className="flex flex-col items-center my-auto py-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-purple-400 mb-1">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{gameTitle || 'Multiplayer'} Lobby</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-center text-white tracking-tight">
          {lobby.name}
        </h2>

        {/* ─── Große Raum-Code Karte zum Kopieren & Teilen ─── */}
        <div
          onClick={handleCopyCode}
          className="mt-4 flex flex-col items-center justify-center p-4 rounded-3xl bg-white/[0.06] hover:bg-white/[0.09] ring-1 ring-white/15 backdrop-blur-xl transition-all cursor-pointer active:scale-98 group w-full max-w-xs shadow-xl"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
            Beitrittscode für Freunde
          </span>
          <div className="my-1.5 flex items-center gap-3">
            <span className="text-3xl sm:text-4xl font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300">
              {lobby.code}
            </span>
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-purple-600 transition-colors">
              {copiedCode ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </div>
          </div>
          <span className="text-[10px] font-semibold text-purple-300">
            {copiedCode ? 'In die Zwischenablage kopiert! 🎉' : 'Tippen zum Kopieren'}
          </span>
        </div>

        {/* ─── SPIELERLISTE ─── */}
        <div className="mt-6 w-full flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#8E8E93] px-1">
            <span>
              Spieler im Raum ({activePlayers.length}/{lobby.maxPlayers})
            </span>
            {activePlayers.length < lobby.maxPlayers && (
              <span className="text-amber-400 animate-pulse">Warte auf Mitspieler...</span>
            )}
          </div>

          {/* Spieler-Karten dynamisch rendern */}
          {activePlayers.map((p, idx) => (
            <div
              key={p.id || idx}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.05] ring-1 ring-white/10 backdrop-blur-md"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <Avatar config={p.avatar} size={44} />
                  {p.isHost && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-black shadow-xs">
                      <Crown className="h-2.5 w-2.5 fill-current" />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-sm truncate">
                    <span className="truncate">{p.name}</span>
                    {p.id === currentUser.id && (
                      <span className="text-[11px] text-purple-400">(Du)</span>
                    )}
                  </div>
                  <div className="text-[11px] font-medium text-[#8E8E93]">
                    {p.isHost ? 'Host' : 'Herausforderer'}
                  </div>
                </div>
              </div>

              <span
                className={`text-xs font-extrabold px-3 py-1 rounded-full ring-1 ${
                  p.isReady
                    ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30'
                    : 'bg-white/10 text-white/60 ring-white/15'
                }`}
              >
                {p.isReady ? 'Bereit ✓' : 'Nicht bereit'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. UNTERE AKTIONEN (STUFE 2 SEKUNDÄR / STUFE 3 BESTÄTIGT & STUFE 1 PRIMARY) */}
      <div className="shrink-0 pt-4 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleToggleReady}
          className={`${BTN_SECONDARY_BASE} ${
            isReady
              ? BTN_SUCCESS_CONFIRMED
              : isHost
                ? BTN_SECONDARY_NEUTRAL
                : BTN_SUCCESS_READY
          }`}
        >
          <Check className="h-4 w-4" />
          <span>{isReady ? 'Bereit! (Klicken zum Abbrechen)' : 'Ich bin bereit'}</span>
        </button>

        {isHost && (
          <button
            type="button"
            disabled={!allReady || isStarting}
            onClick={handleStartGame}
            className={`${BTN_PRIMARY_BASE} ${
              allReady && !isStarting ? BTN_PRIMARY_ENABLED : BTN_PRIMARY_DISABLED
            }`}
          >
            <Play className="h-4 w-4 fill-current" />
            <span>
              {!allReady
                ? activePlayers.length < lobby.minPlayers
                  ? `Warte auf ${lobby.minPlayers}. Spieler...`
                  : 'Warte bis alle bereit sind...'
                : 'Spiel starten'}
            </span>
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
