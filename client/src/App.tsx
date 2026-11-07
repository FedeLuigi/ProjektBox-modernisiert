import { useState, useEffect } from 'react';
import { socket } from './socket';
import type { ChatMessage, UserNotification } from './types/socket';
import { Header } from './components/Header';
import { ChatDemo } from './components/ChatDemo';
import { CounterDemo } from './components/CounterDemo';
import { ApiDemo } from './components/ApiDemo';
import { TechStackGuide } from './components/TechStackGuide';
import { Heart, Sparkles, Check } from 'lucide-react';

export function App() {
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [socketId, setSocketId] = useState<string | null>(socket.id || null);
  const [userCount, setUserCount] = useState<number>(1);
  const [counter, setCounter] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    // Verbindungs-Events
    function onConnect() {
      setIsConnected(true);
      setSocketId(socket.id || null);
    }

    function onDisconnect() {
      setIsConnected(false);
      setSocketId(null);
      setLatency(null);
    }

    // Server-Events
    function onUserCount(count: number) {
      setUserCount(count);
    }

    function onCounterUpdated(count: number) {
      setCounter(count);
    }

    function onReceiveMessage(message: ChatMessage) {
      setMessages((prev) => {
        // Duplikate vermeiden
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    }

    function onUserNotification(notification: UserNotification) {
      setNotifications((prev) => [...prev.slice(-4), notification]);
      // Nach 4 Sekunden wieder ausblenden
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n !== notification));
      }, 4000);
    }

    function onPong(clientTimestamp: number) {
      const pingDuration = Date.now() - clientTimestamp;
      setLatency(pingDuration);
    }

    // Event Listener registrieren
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('userCount', onUserCount);
    socket.on('counterUpdated', onCounterUpdated);
    socket.on('receiveMessage', onReceiveMessage);
    socket.on('userNotification', onUserNotification);
    socket.on('pong', onPong);

    // Initialer Zustand abfragen, falls bereits verbunden
    if (socket.connected) {
      onConnect();
    }

    // Regelmäßige Ping-Messung (alle 4 Sekunden)
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping', Date.now());
      }
    }, 4000);

    // Aufräumen beim Entladen der Komponente
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('userCount', onUserCount);
      socket.off('counterUpdated', onCounterUpdated);
      socket.off('receiveMessage', onReceiveMessage);
      socket.off('userNotification', onUserNotification);
      socket.off('pong', onPong);
      clearInterval(pingInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Kopfzeile */}
      <Header
        isConnected={isConnected}
        userCount={userCount}
        latency={latency}
        socketId={socketId}
      />

      {/* Hauptbereich */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Begrüßungs-Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 sm:p-8 text-white shadow-lg shadow-indigo-100">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-indigo-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Einsteigerfreundliches Fullstack Boilerplate</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Echtzeit-Webanwendungen mit React & Socket.io
            </h1>
            <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
              Dieses Boilerplate kombiniert moderne Webtechnologien in einer sauberen, modularen Struktur.
              Alle Komponenten sind sofort einsatzbereit, typisiert und mit nützlichen Kommentaren versehen.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs font-medium">
              <span className="bg-white/10 px-2.5 py-1 rounded-md flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> React 19 + Vite
              </span>
              <span className="bg-white/10 px-2.5 py-1 rounded-md flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Tailwind CSS + Lucide
              </span>
              <span className="bg-white/10 px-2.5 py-1 rounded-md flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Node + Express + TypeScript
              </span>
              <span className="bg-white/10 px-2.5 py-1 rounded-md flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Socket.io WebSockets
              </span>
            </div>
          </div>

          {/* Deko-Effekt im Hintergrund */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        </div>

        {/* Interaktive Demo-Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Linke Spalte: Echtzeit-Chat (7 Spalten) */}
          <div className="lg:col-span-7">
            <ChatDemo
              messages={messages}
              notifications={notifications}
              isConnected={isConnected}
            />
          </div>

          {/* Rechte Spalte: Live-Zähler & REST-API Tester (5 Spalten) */}
          <div className="lg:col-span-5 space-y-6">
            <CounterDemo count={counter} isConnected={isConnected} />
            <ApiDemo />
          </div>
        </div>

        {/* Struktur & Entwickler-Guide */}
        <TechStackGuide />
      </main>

      {/* Fußzeile */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-1">
            Erstellt mit <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> für einen einfachen Start in moderne Fullstack-Entwicklung.
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Client: Port 5173</span>
            <span>•</span>
            <span>Server: Port 5000</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
