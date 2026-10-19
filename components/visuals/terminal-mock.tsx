const lines = [
  { text: "→ plugins     7 installed" },
  { text: "→ hooks       15 installed" },
  { text: "→ conflicts   none" },
  { text: "✓ done in 41s", ok: true },
];

export function TerminalMock({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`absolute inset-0 p-[5cqw] font-mono ${className}`} style={{ color: "#FFFFFF", fontSize: "2.6cqw", lineHeight: 1.75 }}>
      <div className="flex gap-[1.2cqw] mb-[3cqw]">
        <span className="rounded-full" style={{ width: "2cqw", height: "2cqw", background: "var(--p-3)" }} />
        <span className="rounded-full" style={{ width: "2cqw", height: "2cqw", background: "var(--p-2)" }} />
        <span className="rounded-full" style={{ width: "2cqw", height: "2cqw", background: "var(--p-4)" }} />
      </div>
      <div>
        <span style={{ color: "var(--p-4)" }}>$</span> ./install.sh --profile standard
      </div>
      {lines.map((l, i) => (
        <div
          key={l.text}
          className="viz-run whitespace-pre"
          style={{
            animation: "viz-type 5s steps(1, end) infinite",
            animationDelay: `${0.4 + i * 0.7}s`,
            color: l.ok ? "var(--p-4)" : "#FFFFFF",
            opacity: 0.92,
          }}
        >
          {l.text}
        </div>
      ))}
      <div className="mt-[2cqw] opacity-50">memory · hooks · guards · review loop</div>
    </div>
  );
}
