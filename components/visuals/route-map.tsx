const ROUTE =
  "M 70 470 C 150 460, 190 420, 240 380 S 330 300, 400 290 C 470 280, 500 330, 560 300 S 660 190, 740 180 C 800 175, 840 150, 880 120";

/** A deterministic jitter around the route, so SSR and client markup match. */
function rawDots(): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const anchors = [
    [70, 470], [120, 462], [170, 440], [210, 410], [250, 372], [290, 338], [330, 310], [370, 296],
    [410, 290], [450, 294], [490, 312], [530, 310], [570, 290], [610, 250], [650, 210], [690, 190],
    [730, 182], [770, 176], [810, 165], [850, 140], [880, 120],
  ];
  anchors.forEach(([x, y], i) => {
    for (let k = 0; k < 2; k++) {
      const a = i * 1.7 + k * 2.3;
      pts.push({ x: x + Math.sin(a) * 22 + Math.cos(a * 1.3) * 10, y: y + Math.cos(a) * 20 + Math.sin(a * 0.7) * 8 });
    }
  });
  return pts;
}

export function RouteMap({ className = "" }: { className?: string }) {
  const dots = rawDots();
  return (
    <div aria-hidden className={`absolute inset-0 ${className}`}>
      <svg viewBox="0 0 960 600" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        {/* street grid */}
        <g stroke="#121217" strokeOpacity="0.14" strokeWidth="2">
          {[80, 200, 320, 440, 560, 680, 800, 920].map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="600" />
          ))}
          {[80, 200, 320, 440, 520].map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="960" y2={y} />
          ))}
        </g>
        <g stroke="#121217" strokeOpacity="0.22" strokeWidth="6">
          <line x1="0" y1="260" x2="960" y2="260" />
          <line x1="500" y1="0" x2="500" y2="600" />
        </g>

        {/* raw GPS samples */}
        <g fill="#121217" fillOpacity="0.45">
          {dots.map((d, i) => (
            <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r="4.5" />
          ))}
        </g>

        {/* cleaned path */}
        <path d={ROUTE} fill="none" stroke="#121217" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        {/* gap: paint over the middle stretch, then dash it */}
        <path d="M 400 290 C 470 280, 500 330, 560 300" fill="none" stroke="var(--p-4)" strokeWidth="14" strokeLinecap="butt" />
        <path d="M 400 290 C 470 280, 500 330, 560 300" fill="none" stroke="#121217" strokeWidth="5" strokeDasharray="10 12" strokeLinecap="round" />
        <text x="470" y="352" fontSize="20" fontWeight="700" fill="#121217" textAnchor="middle">
          gap · unknown
        </text>

        {/* stay */}
        <circle cx="880" cy="120" r="40" fill="none" stroke="#121217" strokeWidth="4" strokeDasharray="8 8" />
        <circle cx="880" cy="120" r="9" fill="#121217" />
        <text x="880" y="190" fontSize="20" fontWeight="700" fill="#121217" textAnchor="middle">
          stay 14 min
        </text>

        {/* start */}
        <circle cx="70" cy="470" r="10" fill="#FFFFFF" stroke="#121217" strokeWidth="5" />
        <text x="60" y="520" fontSize="20" fontWeight="700" fill="#121217">
          raw dots vs cleaned path
        </text>

        {/* moving dot: shares the SVG coordinate space with the route */}
        <circle
          className="viz-run"
          r="12"
          fill="var(--p-3)"
          stroke="#121217"
          strokeWidth="4"
          style={{
            offsetPath: `path("${ROUTE}")`,
            offsetRotate: "0deg",
            animation: "viz-route-run 6s linear infinite",
          }}
        />
      </svg>
    </div>
  );
}
