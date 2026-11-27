import { useState } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import {
  normalizeSlfCategories,
  normalizeSlfComparisonKey,
  SLF_CUSTOM_CATEGORY_SUGGESTIONS,
  SLF_MAX_CUSTOM_CATEGORIES,
  SLF_MIN_CUSTOM_CATEGORIES,
} from '@projektbox/shared/utils';

interface SlfCategoryPickerProps {
  initialCategories: string[];
  chooserName: string;
  isChooser: boolean;
  timeLeft: number;
  onConfirm: (categories: string[]) => void;
}

export function SlfCategoryPicker({
  initialCategories,
  chooserName,
  isChooser,
  timeLeft,
  onConfirm,
}: SlfCategoryPickerProps) {
  const [selected, setSelected] = useState<string[]>(() =>
    normalizeSlfCategories(initialCategories)
  );
  const [customInput, setCustomInput] = useState('');

  const addCategory = (cat: string) => {
    if (!isChooser || selected.length >= SLF_MAX_CUSTOM_CATEGORIES) return;
    const trimmed = cat.trim();
    if (!trimmed) return;
    const key = normalizeSlfComparisonKey(trimmed);
    if (selected.some((c) => normalizeSlfComparisonKey(c) === key)) return;
    setSelected((prev) => [...prev, trimmed]);
  };

  const removeCategory = (idx: number) => {
    if (!isChooser) return;
    setSelected((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddCustom = () => {
    addCategory(customInput);
    setCustomInput('');
  };

  const canStart = selected.length >= SLF_MIN_CUSTOM_CATEGORIES;

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-between gap-4 px-4 pt-14 pb-5 text-[#1E293B] select-none sm:px-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1E3A8A]/20 pb-3">
        <div>
          <div className="text-xs font-bold tracking-widest text-[#B45309] uppercase">
            Kategorienwahl
          </div>
          <h2 className="font-serif text-2xl font-black text-[#0F172A] sm:text-3xl">
            {isChooser ? 'Wähle deine Kategorien' : `${chooserName} wählt gerade…`}
          </h2>
        </div>
        <div className="font-serif text-2xl font-black tabular-nums text-[#1E3A8A]">
          {timeLeft}s
        </div>
      </div>

      {/* Selected Categories */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#475569] uppercase">
          <span>
            Ausgewählt ({selected.length}/{SLF_MAX_CUSTOM_CATEGORIES})
          </span>
          <span>Mindestens {SLF_MIN_CUSTOM_CATEGORIES}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {selected.map((cat, idx) => (
            <button
              key={cat}
              type="button"
              disabled={!isChooser}
              onClick={() => removeCategory(idx)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#1E3A8A]/35 bg-[#1E3A8A] px-3.5 py-1.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1E40AF] disabled:cursor-default"
            >
              <span>{cat}</span>
              {isChooser && <X className="h-3.5 w-3.5 opacity-80" />}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions & Custom Input (only interactive for chooser) */}
      {isChooser ? (
        <div className="flex flex-1 min-h-0 flex-col justify-between gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              maxLength={26}
              placeholder="Eigene Kategorie eintippen…"
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
              className="flex-1 border-0 border-b-2 border-[#1E3A8A]/35 bg-transparent px-1 py-2 text-base font-bold text-[#0F172A] placeholder:text-[#64748B] focus:border-[#1E3A8A] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={!customInput.trim() || selected.length >= SLF_MAX_CUSTOM_CATEGORIES}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#B45309] px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-[#92400E] disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              <span>Hinzufügen</span>
            </button>
          </div>

          <div className="flex flex-1 min-h-0 flex-wrap content-start gap-2 overflow-y-auto py-1">
            {SLF_CUSTOM_CATEGORY_SUGGESTIONS.flat().map((sug) => {
              const already = selected.some(
                (c) => normalizeSlfComparisonKey(c) === normalizeSlfComparisonKey(sug)
              );
              return (
                <button
                  key={sug}
                  type="button"
                  disabled={already || selected.length >= SLF_MAX_CUSTOM_CATEGORIES}
                  onClick={() => addCategory(sug)}
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                    already
                      ? 'border-emerald-600/40 bg-emerald-600/15 text-emerald-800'
                      : 'border-[#1E3A8A]/25 bg-white/60 text-[#1E293B] hover:bg-white'
                  }`}
                >
                  + {sug}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!canStart}
            onClick={() => onConfirm(selected)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#14532D] bg-[#16A34A] py-3.5 text-lg font-black tracking-wide text-white shadow-lg transition active:translate-y-0.5 disabled:opacity-45"
          >
            <Sparkles className="h-5 w-5" />
            <span>Runde starten</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-center text-base font-bold text-[#475569]">
          Warte kurz, bis {chooserName} die Kategorien bestätigt…
        </div>
      )}
    </div>
  );
}
