import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Play,
  Sparkles,
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
  const myPlayer = lobby.players.find((p) => p.id === currentUser.id);
  const isHost = myPlayer?.isHost ?? false;
  const isReady = myPlayer?.isReady ?? false;
  const allReady =
    lobby.players.length >= lobby.minPlayers &&
    lobby.players.length <= lobby.maxPlayers &&
    lobby.players.every((p) => p.isReady);

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
    if (!allReady || !isHost || isStarting) return;
    setIsStarting(true);
    try {
      await socketService.startLobby();
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsStarting(false);
    }
  };

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
          className="mt-5 flex flex-col items-center justify-center p-4 rounded-3xl bg-white/[0.06] hover:bg-white/[0.09] ring-1 ring-white/15 backdrop-blur-xl transition-all cursor-pointer active:scale-98 group w-full max-w-xs shadow-xl"
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
        <div className="mt-7 w-full flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#8E8E93] px-1">
            <span>
              Spieler im Raum ({lobby.players.length}/{lobby.maxPlayers})
            </span>
            {lobby.players.length < lobby.maxPlayers && (
              <span className="text-amber-400 animate-pulse">Warte auf Mitspieler...</span>
            )}
          </div>

          {/* Spieler-Karten dynamisch rendern */}
          {lobby.players.map((p, idx) => (
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
          {lobby.players.length < lobby.maxPlayers && (
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
                ? lobby.players.length < lobby.minPlayers
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
