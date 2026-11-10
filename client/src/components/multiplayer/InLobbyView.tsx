import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Play,
  Sparkles,
  Tv,
  Users,
} from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { getUserProfile } from '../../utils/userProfile';
import { Avatar } from '../Avatar';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';

interface InLobbyViewProps {
  lobby: Lobby;
  gameTitle?: string;
  onLeave: () => void;
  onGameStart: () => void;
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
      onGameStart();
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
      <div className="flex flex-col h-full justify-between max-w-md mx-auto w-full py-2 animate-fade-in select-none">
        {/* 1. Header: Zurück & Verbindungs-Status */}
        <div className="flex items-center justify-between pb-2 shrink-0">
          <button
            type="button"
            onClick={onLeave}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white ring-1 ring-white/10 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Lobby verlassen</span>
          </button>

          <ConnectionStatusBadge />
        </div>

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
          <div className="mt-5 flex items-center gap-3.5 p-3.5 rounded-3xl bg-white/[0.06] ring-1 ring-white/15 backdrop-blur-xl w-full">
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

          {/* ─── DER GROSSE, PROMINENTE BEREIT-BUTTON (DIREKT IM ZENTRUM) ─── */}
          <div className="mt-6 w-full flex flex-col gap-3">
            <button
              type="button"
              onClick={handleToggleReady}
              className={`w-full py-5 px-6 rounded-3xl font-black text-lg sm:text-xl tracking-wide transition-all active:scale-95 cursor-pointer shadow-2xl flex items-center justify-center gap-3 ${
                isReady
                  ? 'bg-emerald-600/30 text-emerald-300 ring-2 ring-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:bg-emerald-600/40'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-[0_0_35px_rgba(16,185,129,0.45)] hover:brightness-110 animate-pulse'
              }`}
            >
              <Check className="h-6 w-6 stroke-[3]" />
              <span>{isReady ? 'Bereit ✓ (Tippen zum Abbrechen)' : 'Ich bin bereit!'}</span>
            </button>

            {/* Start-Button oder Statusanzeige */}
            {canStartGame ? (
              <button
                type="button"
                disabled={!allReady || isStarting}
                onClick={handleStartGame}
                className={`w-full py-4 px-6 rounded-3xl font-black text-base tracking-wide transition-all active:scale-95 cursor-pointer shadow-xl flex items-center justify-center gap-2.5 ${
                  allReady && !isStarting
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white shadow-[0_0_35px_rgba(168,85,247,0.45)] hover:brightness-110 animate-bounce'
                    : 'bg-white/[0.08] text-white/40 ring-1 ring-white/10 cursor-not-allowed'
                }`}
              >
                <Play className="h-5 w-5 fill-current" />
                <span>
                  {!allReady
                    ? activePlayers.length < lobby.minPlayers
                      ? `Warte auf ${lobby.minPlayers}. Spieler...`
                      : `Warte bis alle bereit sind (${activePlayers.filter((p) => p.isReady).length}/${activePlayers.length})`
                    : '🚀 Spiel jetzt starten'}
                </span>
              </button>
            ) : (
              <div className="w-full py-3.5 px-4 rounded-2xl bg-white/[0.05] ring-1 ring-white/10 text-center text-xs font-semibold text-[#8E8E93]">
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

            {activePlayers.length < lobby.maxPlayers && (
              <div className="py-2.5 px-3 text-center border border-dashed border-white/10 rounded-2xl text-[11px] font-medium text-[#8E8E93]">
                Weitere Mitspieler können den QR-Code vom Fernseher scannen
              </div>
            )}
          </div>
        </div>

        {/* 3. Fußzeile */}
        <div className="shrink-0 text-center text-[11px] text-[#8E8E93] pt-2">
          📱 Dein Smartphone dient als Controller. Das Spiel läuft auf dem Fernseher.
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // B) STANDARD MULTIPLAYER LOBBY (OHNE FERNSEHER)
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full justify-between max-w-lg mx-auto w-full py-2 animate-fade-in">
      {/* 1. HEADER: Zurück-Pille & Status */}
      <div className="flex items-center justify-between pb-4">
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white ring-1 ring-white/10 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Lobby verlassen</span>
        </button>

        <ConnectionStatusBadge />
      </div>

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

          {/* Platzhalter falls Raum noch nicht voll */}
          {activePlayers.length < lobby.maxPlayers && (
            <div className="flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-dashed border-white/15 text-[#8E8E93] text-xs font-bold animate-pulse">
              <Users className="h-4 w-4" />
              <span>Teile den Code {lobby.code}, damit Freunde beitreten können</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. UNTERE AKTIONEN (BEREIT / STARTEN) */}
      <div className="shrink-0 pt-4 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleToggleReady}
          className={`w-full py-3.5 rounded-full text-sm font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2 ${
            isReady
              ? 'bg-emerald-600/30 text-emerald-300 ring-1 ring-emerald-500/50 hover:bg-emerald-600/40'
              : 'bg-white/15 text-white hover:bg-white/20 ring-1 ring-white/20'
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
            className={`w-full py-3.5 rounded-full text-sm font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
              allReady && !isStarting
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-500/30 hover:brightness-110'
                : 'bg-white/[0.08] text-white/40 ring-1 ring-white/10 cursor-not-allowed'
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
  );
}
