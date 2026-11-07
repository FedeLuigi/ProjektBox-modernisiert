import React from 'react';
import { Plus, Minus, Zap, Sparkles } from 'lucide-react';
import { socket } from '../socket';

interface CounterDemoProps {
  count: number;
  isConnected: boolean;
}

export const CounterDemo: React.FC<CounterDemoProps> = ({ count, isConnected }) => {
  const handleIncrement = () => {
    if (!isConnected) return;
    socket.emit('incrementCounter');
  };

  const handleDecrement = () => {
    if (!isConnected) return;
    socket.emit('decrementCounter');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Gemeinsamer Live-Zähler</h2>
              <p className="text-xs text-slate-500">Global synchronisiert über alle Clients</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
            <Sparkles className="w-3 h-3" /> Echtzeit
          </span>
        </div>

        <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 my-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Aktueller Zählerstand
          </span>
          <div className="text-5xl font-black text-slate-900 font-mono tracking-tight transition-transform duration-150 transform hover:scale-105">
            {count}
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-3 text-center">
          Tipp: Öffne ein zweites Browserfenster oder Tab – klicke auf die Buttons und beobachte die sofortige Synchronisation!
        </p>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={handleDecrement}
          disabled={!isConnected}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 text-slate-700 font-semibold rounded-xl text-sm transition-all"
        >
          <Minus className="w-4 h-4" />
          -1
        </button>
        <button
          onClick={handleIncrement}
          disabled={!isConnected}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-sm hover:shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          +1
        </button>
      </div>
    </div>
  );
};
