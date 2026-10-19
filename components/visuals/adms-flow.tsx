const log = [
  ["08:58", "Priya S.", "in", "fingerprint"],
  ["09:02", "Dev K.", "in", "fingerprint"],
  ["09:11", "Ritu M.", "in", "card"],
  ["13:04", "Arjun P.", "out", "fingerprint"],
];

export function AdmsFlow({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`absolute inset-0 ${className}`}>
      <svg viewBox="0 0 960 600" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" fill="none">
        <defs>
          <marker id="adms-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#121217" />
          </marker>
        </defs>

        {/* terminal */}
        <rect x="50" y="110" width="150" height="190" rx="18" fill="#FFFFFF" stroke="#121217" strokeWidth="5" />
        <rect x="72" y="132" width="106" height="60" rx="6" fill="var(--p-2)" stroke="#121217" strokeWidth="4" />
        <g stroke="#121217" strokeWidth="5" strokeLinecap="round">
          <path d="M 125 265 a 32 32 0 1 1 0.1 0" />
          <path d="M 125 265 a 20 20 0 1 1 0.1 0" />
          <path d="M 125 265 a 8 8 0 1 1 0.1 0" />
        </g>
        <text x="125" y="330" fontSize="20" fontWeight="700" fill="#121217" textAnchor="middle">
          Biometric device
        </text>

        {/* arrow to gateway */}
        <path d="M 205 205 L 385 205" stroke="#121217" strokeWidth="5" markerEnd="url(#adms-arrow)" />
        <text x="295" y="190" fontSize="19" fontFamily="var(--font-mono), monospace" fill="#121217" textAnchor="middle">
          POST /iclock/cdata
        </text>

        {/* gateway */}
        <rect x="395" y="150" width="180" height="110" rx="14" fill="#121217" />
        <text x="485" y="213" fontSize="26" fontWeight="800" fill="#FFFFFF" textAnchor="middle">
          gateway
        </text>

        {/* branches */}
        <path d="M 580 180 C 640 180, 650 110, 700 110" stroke="#121217" strokeWidth="5" markerEnd="url(#adms-arrow)" />
        <text x="640" y="100" fontSize="18" fontWeight="700" fill="#121217" textAnchor="middle">
          stored → OK
        </text>
        <rect x="712" y="80" width="200" height="60" rx="12" fill="#FFFFFF" stroke="#121217" strokeWidth="4" />
        <text x="812" y="118" fontSize="21" fontWeight="700" fill="#121217" textAnchor="middle">
          event log
        </text>

        <path d="M 580 232 C 640 232, 650 300, 700 300" stroke="var(--p-3)" strokeWidth="5" markerEnd="url(#adms-arrow)" />
        <text x="640" y="330" fontSize="18" fontWeight="700" fill="#121217" textAnchor="middle">
          not stored → 503
        </text>
        <rect x="712" y="270" width="200" height="60" rx="12" fill="#FFFFFF" stroke="#121217" strokeWidth="4" />
        <text x="812" y="308" fontSize="21" fontWeight="700" fill="#121217" textAnchor="middle">
          device retries
        </text>

        {/* event log table */}
        <rect x="50" y="380" width="860" height="180" rx="14" fill="#FFFFFF" stroke="#121217" strokeWidth="4" />
        {log.map((row, i) => (
          <g
            key={row[0]}
            className="viz-run"
            style={{ animation: `viz-tick 4.8s ease-out infinite`, animationDelay: `${i * 0.9}s` }}
          >
            <text x="80" y={420 + i * 36} fontSize="20" fontFamily="var(--font-mono), monospace" fill="#121217">
              {row[0]}
            </text>
            <text x="210" y={420 + i * 36} fontSize="20" fontWeight="700" fill="#121217">
              {row[1]}
            </text>
            <text x="480" y={420 + i * 36} fontSize="20" fill="#121217">
              {row[2]}
            </text>
            <text x="640" y={420 + i * 36} fontSize="20" fill="#121217" opacity="0.7">
              {row[3]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
