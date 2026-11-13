export function IslandBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden select-none z-0 bg-[#3B82B6]">
      {/* Geometrische Kristall-Facetten & feine Bruchlinien im exakt gleichen Cerulean-Blau (#3B82B6) wie das Referenzbild */}
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Große diagonale Hintergrund-Facetten */}
        <polygon points="0,0 680,0 420,900 0,900" fill="#4189BE" opacity="0.55" />
        <polygon points="0,0 320,0 560,540 0,380" fill="#4891C6" opacity="0.45" />
        <polygon points="980,0 1600,0 1600,520 760,290" fill="#357AB0" opacity="0.5" />
        <polygon points="620,520 1600,360 1600,900 380,900" fill="#3376AA" opacity="0.55" />
        <polygon points="520,0 1120,0 840,480 390,320" fill="#458CC0" opacity="0.35" />

        {/* Charakteristische polygonale Kristall-Risslinien an den Rändern */}
        <g fill="none" stroke="#64B2E0" strokeWidth="2" strokeOpacity="0.35">
          <polyline points="24,18 145,280 82,420 210,640 120,880" />
          <polyline points="1570,28 1410,190 1490,340 1360,560 1520,860" />
          <polyline points="380,12 460,115 395,210" />
          <polyline points="1120,890 1210,760 1340,810 1420,695" />
        </g>

        {/* Subtile helle Eis-Glanzpunkte */}
        <g fill="#9CE0FA" fillOpacity="0.22">
          <polygon points="180,120 192,110 202,126 188,134" />
          <polygon points="1380,165 1396,155 1404,172 1388,180" />
          <polygon points="260,740 275,728 284,744 268,754" />
          <polygon points="1290,710 1306,698 1314,715 1298,722" />
        </g>
      </svg>
    </div>
  );
}
