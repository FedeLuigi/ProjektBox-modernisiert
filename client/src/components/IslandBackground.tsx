export function IslandBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden select-none z-0 bg-[#1B2B40]">
      {/* Edler, tiefer Schiefer-Kristall-Hintergrund mit warmem Bernstein-Lichtschimmer oben links und kühlen Facetten rechts */}
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="pbBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22354E" />
            <stop offset="50%" stopColor="#1C2D42" />
            <stop offset="100%" stopColor="#132030" />
          </linearGradient>
          <radialGradient id="pbWarmGlow" cx="18%" cy="18%" r="55%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.16" />
            <stop offset="60%" stopColor="#EA580C" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#1B2B40" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pbEmeraldGlow" cx="85%" cy="82%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.13" />
            <stop offset="65%" stopColor="#0EA5E9" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#1B2B40" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1600" height="900" fill="url(#pbBgGrad)" />
        <rect width="1600" height="900" fill="url(#pbWarmGlow)" />
        <rect width="1600" height="900" fill="url(#pbEmeraldGlow)" />

        {/* Große diagonale Hintergrund-Facetten in abgestuften Schiefer- und Nacht-Nuancen */}
        <polygon points="0,0 680,0 420,900 0,900" fill="#263B56" opacity="0.5" />
        <polygon points="0,0 340,0 560,540 0,380" fill="#2E4766" opacity="0.4" />
        <polygon points="980,0 1600,0 1600,520 760,290" fill="#18273A" opacity="0.55" />
        <polygon points="620,520 1600,360 1600,900 380,900" fill="#152334" opacity="0.6" />
        <polygon points="520,0 1120,0 840,480 390,320" fill="#233750" opacity="0.35" />

        {/* Charakteristische polygonale Kristall-Risslinien an den Rändern */}
        <g fill="none" stroke="#64748B" strokeWidth="1.8" strokeOpacity="0.32">
          <polyline points="24,18 145,280 82,420 210,640 120,880" />
          <polyline points="1570,28 1410,190 1490,340 1360,560 1520,860" />
          <polyline points="380,12 460,115 395,210" />
          <polyline points="1120,890 1210,760 1340,810 1420,695" />
        </g>

        {/* Subtile warme & kristalline Glanzpunkte */}
        <g fill="#FDE68A" fillOpacity="0.22">
          <polygon points="180,120 192,110 202,126 188,134" />
          <polygon points="260,740 275,728 284,744 268,754" />
        </g>
        <g fill="#A7F3D0" fillOpacity="0.18">
          <polygon points="1380,165 1396,155 1404,172 1388,180" />
          <polygon points="1290,710 1306,698 1314,715 1298,722" />
        </g>
      </svg>
    </div>
  );
}
