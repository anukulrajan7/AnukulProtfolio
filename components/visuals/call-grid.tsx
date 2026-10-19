const people = [
  { initial: "P", name: "Priya", speaking: true },
  { initial: "D", name: "Dev" },
  { initial: "R", name: "Ritu" },
  { initial: "A", name: "Arjun" },
];

export function CallGrid({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`absolute inset-0 p-[5cqw] flex flex-col ${className}`} style={{ color: "#121217", fontSize: "2.1cqw" }}>
      <div className="flex items-center justify-between font-bold mb-[2cqw]">
        <span>2 to 4 people · P2P mesh</span>
        <span className="rounded-full border-2 border-[#121217] px-[1.6cqw] py-[0.4cqw]" style={{ background: "#FFFFFF" }}>
          5+ people → SFU
        </span>
      </div>
      <div className="relative flex-1 min-h-0">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <g stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.9">
            <line x1="25" y1="25" x2="75" y2="25" />
            <line x1="25" y1="75" x2="75" y2="75" />
            <line x1="25" y1="25" x2="25" y2="75" />
            <line x1="75" y1="25" x2="75" y2="75" />
            <line x1="25" y1="25" x2="75" y2="75" />
            <line x1="75" y1="25" x2="25" y2="75" />
          </g>
        </svg>
        <div className="relative grid grid-cols-2 grid-rows-2 gap-[2.4cqw] h-full">
          {people.map((p) => (
            <div
              key={p.name}
              className={`relative flex items-center justify-center rounded-[2cqw] ${p.speaking ? "viz-run" : ""}`}
              style={{
                background: "linear-gradient(160deg, #2a2d45, #121217)",
                border: p.speaking ? "0.5cqw solid var(--p-3)" : "0.5cqw solid #121217",
                animation: p.speaking ? "viz-pulse 2.4s ease-out infinite" : undefined,
              }}
            >
              <span className="font-bold" style={{ color: "#FFFFFF", fontSize: "7cqw" }}>
                {p.initial}
              </span>
              <span
                className="absolute left-[1.4cqw] bottom-[1.2cqw] rounded-full px-[1.2cqw] font-bold"
                style={{ background: "#FFFFFF", fontSize: "1.7cqw", lineHeight: "2.8cqw" }}
              >
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
