import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, User, Smile } from 'lucide-react';
import { socket } from '../socket';
import type { ChatMessage, UserNotification } from '../types/socket';

interface ChatDemoProps {
  messages: ChatMessage[];
  notifications: UserNotification[];
  isConnected: boolean;
}

const DEFAULT_NAMES = ['CodeNinja', 'PixelPionier', 'ByteBäcker', 'TechTiger', 'RocketDev', 'DevPanda'];

export const ChatDemo: React.FC<ChatDemoProps> = ({
  messages,
  notifications,
  isConnected,
}) => {
  const [userName, setUserName] = useState<string>(() => {
    return DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)];
  });
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Automatisches Scrollen ans Ende bei neuen Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, notifications]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isConnected) return;

    socket.emit('sendMessage', {
      user: userName.trim() || 'Anonym',
      text: inputMessage.trim(),
    });

    setInputMessage('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[520px]">
      {/* Chat-Kopfzeile */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Echtzeit-Chat</h2>
            <p className="text-xs text-slate-500">Live Socket.io Room Broadcast</p>
          </div>
        </div>

        {/* Name anpassen */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Dein Name"
            maxLength={18}
            className="text-xs bg-transparent border-none text-slate-700 font-medium focus:outline-none w-24 sm:w-28"
            title="Klicke hier, um deinen Chat-Namen zu ändern"
          />
        </div>
      </div>

      {/* Nachrichtenliste */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
            <Smile className="w-8 h-8 mb-2 stroke-1" />
            <p>Noch keine Nachrichten. Schreib die Erste!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user === userName;
            const isSystem = msg.user.includes('System-Bot');

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isSystem
                    ? 'items-center text-center my-2'
                    : isMe
                    ? 'items-end'
                    : 'items-start'
                }`}
              >
                {!isSystem && (
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400 px-1">
                    <span className="font-semibold text-slate-600">{msg.user}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all ${
                    isSystem
                      ? 'bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs py-2 px-4 rounded-xl'
                      : isMe
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}
                >
                  <p className="leading-relaxed break-words">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}

        {/* Live Benachrichtigungen (z.B. User ist beigetreten) */}
        {notifications.map((notif, idx) => (
          <div
            key={idx}
            className="text-center text-[11px] font-medium text-slate-500 py-1 bg-slate-100/70 rounded-full max-w-xs mx-auto animate-fade-in"
          >
            {notif.text}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Eingabefeld */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={isConnected ? 'Nachricht eingeben...' : 'Verbinde mit Server...'}
          disabled={!isConnected}
          className="flex-1 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl px-4 py-2.5 outline-none transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!isConnected || !inputMessage.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
