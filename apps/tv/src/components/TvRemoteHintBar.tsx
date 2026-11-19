export function TvRemoteHintBar() {
  return (
    <footer className="mx-auto flex w-full max-w-[1600px] shrink-0 items-center justify-center px-6 py-2">
      <div className="font-arcade flex flex-wrap items-center justify-center gap-x-5 gap-y-1 rounded-xl border border-white/12 bg-[#0F172A]/60 px-5 py-1.5 text-[11px] tracking-widest text-[#94A3B8] uppercase backdrop-blur-md">
        <span>↑ ↓ ← → NAVIGIEREN</span>
        <span>•</span>
        <span className="text-[#FDE68A]">OK / ENTER AUSWÄHLEN</span>
        <span>•</span>
        <span>ZURÜCK / ESC</span>
      </div>
    </footer>
  );
}
