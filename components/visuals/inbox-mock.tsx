const mails = [
  { from: "Priya S.", subject: "Timesheet for last week", time: "09:41", selected: true },
  { from: "Dev K.", subject: "Leave request, 3 days", time: "09:12" },
  { from: "Ritu M.", subject: "Re: onboarding docs", time: "Yesterday" },
  { from: "Arjun P.", subject: "Salary slip for September", time: "Mon" },
];

export function InboxMock({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`absolute inset-0 p-[5cqw] ${className}`}>
      <div
        className="h-full w-full overflow-hidden grid grid-cols-[38%_1fr]"
        style={{ background: "#FFFFFF", border: "2px solid #121217", borderRadius: "2cqw", color: "#121217" }}
      >
        <ul className="border-r-2 border-[#121217]" style={{ fontSize: "2.2cqw" }}>
          {mails.map((m) => (
            <li
              key={m.subject}
              className="px-[2.4cqw] py-[2cqw] border-b border-[#121217]/20"
              style={m.selected ? { background: "#FFD9CF" } : undefined}
            >
              <div className="flex justify-between gap-2 font-bold">
                <span className="truncate">{m.from}</span>
                <span className="opacity-60 font-medium">{m.time}</span>
              </div>
              <div className="truncate opacity-80">{m.subject}</div>
            </li>
          ))}
        </ul>
        <div className="p-[3cqw] flex flex-col" style={{ fontSize: "2.3cqw" }}>
          <div className="font-bold" style={{ fontSize: "3.1cqw" }}>
            Timesheet for last week
          </div>
          <div className="opacity-60 mt-[0.6cqw]">Priya S. · to HR</div>
          <p className="mt-[2cqw] leading-snug opacity-85">
            Hi, attaching my hours for last week. Monday was a half day, rest as usual. Let me know if anything
            is missing.
          </p>
          <div className="mt-auto">
            <span
              className="viz-run inline-block rounded-full font-bold"
              style={{
                background: "var(--p-2)",
                padding: "1cqw 2.2cqw",
                fontSize: "2.2cqw",
                animation: "viz-breathe 3s ease-in-out infinite",
              }}
            >
              Draft. Waiting for your OK.
            </span>
            <div className="font-mono opacity-60 mt-[1.6cqw]" style={{ fontSize: "1.7cqw" }}>
              audit · classified: timesheet · drafted 09:42 · not sent
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
