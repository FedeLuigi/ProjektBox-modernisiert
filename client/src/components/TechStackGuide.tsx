import React from 'react';
import { Layers, Terminal, FolderTree, Cpu, ShieldCheck } from 'lucide-react';

export const TechStackGuide: React.FC = () => {
  const cards = [
    {
      title: 'Frontend (Client)',
      tech: 'React 19 + Vite + Tailwind CSS + Lucide',
      color: 'border-indigo-100 bg-indigo-50/30',
      icon: <Layers className="w-5 h-5 text-indigo-600" />,
      description:
        'Moderne komponentenbasierte Oberfläche mit React, blitzschnellem Hot-Reload über Vite, responsivem Styling mit Tailwind CSS und Icons von Lucide React.',
      path: 'client/src/',
    },
    {
      title: 'Backend (Server)',
      tech: 'Node.js + Express + Socket.io + TypeScript',
      color: 'border-emerald-100 bg-emerald-50/30',
      icon: <Cpu className="w-5 h-5 text-emerald-600" />,
      description:
        'Stabiler Express-Server kombiniert mit Socket.io für bidirektionale Echtzeit-Events. Mit tsx für sofortiges Neuladen bei Codeänderungen ohne manuellen Build.',
      path: 'server/src/',
    },
    {
      title: 'End-to-End Typsicherheit',
      tech: 'TypeScript',
      color: 'border-blue-100 bg-blue-50/30',
      icon: <ShieldCheck className="w-5 h-5 text-blue-600" />,
      description:
        'Socket-Events sind auf Client und Server synchron typisiert. Dadurch hast du automatische Code-Vervollständigung und Fehlerprüfungen während des Programmierens.',
      path: 'types/socket.ts',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
          <FolderTree className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800">Projektübersicht & Einstieg</h2>
          <p className="text-xs text-slate-500">So ist dieses Starter-Boilerplate aufgebaut</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {cards.map((card, idx) => (
          <div key={idx} className={`p-4 rounded-xl border ${card.color} flex flex-col justify-between`}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                {card.icon}
                <span className="font-bold text-sm text-slate-800">{card.title}</span>
              </div>
              <p className="text-xs font-semibold text-slate-600 mb-2">{card.tech}</p>
              <p className="text-xs text-slate-600 leading-relaxed">{card.description}</p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Pfad:</span>
              <span className="font-semibold text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                {card.path}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Terminal Guide */}
      <div className="bg-slate-900 rounded-xl p-4 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2 mb-3 text-slate-400 border-b border-slate-800 pb-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-white">Nützliche Befehle im Root-Verzeichnis:</span>
        </div>
        <div className="space-y-1.5 text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-indigo-400">npm run dev</span>
            <span className="text-slate-500">Startet Client und Server gleichzeitig im Entwicklungsmodus</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-indigo-400">npm run dev:client</span>
            <span className="text-slate-500">Startet nur den Vite Frontend-Server</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-indigo-400">npm run dev:server</span>
            <span className="text-slate-500">Startet nur den Node.js Express Server</span>
          </div>
        </div>
      </div>
    </div>
  );
};
