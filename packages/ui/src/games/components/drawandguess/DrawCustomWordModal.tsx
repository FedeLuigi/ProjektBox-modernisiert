import { useState } from 'react';
import { Check, Paintbrush } from 'lucide-react';

interface DrawCustomWordModalProps {
  isDrawer: boolean;
  drawerName: string;
  timeLeft: number;
  onConfirm: (word: string) => Promise<void> | void;
}

export function DrawCustomWordModal({
  isDrawer,
  drawerName,
  timeLeft,
  onConfirm,
}: DrawCustomWordModalProps) {
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalized = word.trim().replace(/ß/gi, 'ss');
  const hasInvalidChars = normalized.length > 0 && !/^[a-zA-ZäöüÄÖÜ]+$/.test(normalized);
  const isValid = normalized.length >= 2 && normalized.length <= 20 && !hasInvalidChars;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) {
      setError(
        hasInvalidChars
          ? 'Nur Buchstaben (A–Z, Ä, Ö, Ü) ohne Sonderzeichen.'
          : 'Bitte 2–20 Buchstaben eingeben.'
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(normalized);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Wort konnte nicht bestätigt werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col items-center justify-center gap-5 px-4 text-center text-[#1E293B]">
      <div className="flex w-full items-center justify-between border-b border-[#1E293B]/20 pb-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#B45309] uppercase">
          <Paintbrush className="h-4 w-4" />
          <span>{isDrawer ? 'Du zeichnest' : `${drawerName} wählt`}</span>
        </span>
        <span className="font-serif text-xl font-black tabular-nums text-[#1E3A8A]">
          {timeLeft}s
        </span>
      </div>

      {isDrawer ? (
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <h2 className="font-serif text-2xl font-black text-[#0F172A]">
            Eigenes Wort eingeben
          </h2>
          <input
            type="text"
            autoFocus
            maxLength={20}
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="z. B. Leuchtturm"
            className="w-full border-0 border-b-2 border-[#1E3A8A]/40 bg-transparent py-2 text-center text-2xl font-black tracking-wide text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#1E3A8A] focus:outline-none"
          />
          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#14532D] bg-[#16A34A] py-3.5 text-base font-black text-white shadow-lg transition active:translate-y-0.5 disabled:opacity-45"
          >
            <Check className="h-5 w-5" />
            <span>Wort bestätigen</span>
          </button>
        </form>
      ) : (
        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-black text-[#0F172A]">
            {drawerName} denkt sich ein Wort aus…
          </h2>
        </div>
      )}
    </div>
  );
}
