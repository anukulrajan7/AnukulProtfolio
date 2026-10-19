const rows = [
  { name: "Swiggy", cat: "Food", amt: "₹420", fresh: true },
  { name: "Metro card", cat: "Travel", amt: "₹200" },
  { name: "Rent", cat: "Home", amt: "₹14,000" },
  { name: "Zomato", cat: "Food", amt: "₹310" },
  { name: "Phone bill", cat: "Bills", amt: "₹599" },
];

export function PhoneMock({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`absolute inset-0 flex items-end justify-center ${className}`}>
      <div
        className="relative overflow-hidden"
        style={{
          width: "36cqw",
          height: "58cqw",
          marginBottom: "-6cqw",
          background: "#FFFFFF",
          border: "0.5cqw solid #121217",
          borderRadius: "4cqw 4cqw 0 0",
          color: "#121217",
          fontSize: "2cqw",
        }}
      >
        <div className="flex items-center justify-between px-[2.4cqw] pt-[1.6cqw]" style={{ fontSize: "1.6cqw" }}>
          <span className="font-bold">9:41</span>
          <span className="rounded-full font-bold" style={{ background: "var(--p-2)", padding: "0.3cqw 1.2cqw" }}>
            offline
          </span>
        </div>
        <div className="px-[2.4cqw] mt-[1.8cqw] font-bold" style={{ fontSize: "3cqw" }}>
          PaisaFlow
        </div>
        <div
          className="mx-[2.4cqw] mt-[1.4cqw] flex items-center gap-[1cqw] rounded-full border-2 border-[#121217] px-[1.6cqw] py-[0.8cqw] font-bold"
          style={{ fontSize: "1.7cqw", background: "var(--p-6)" }}
        >
          <span className="inline-block rounded-full" style={{ width: "1.2cqw", height: "1.2cqw", background: "#121217" }} />
          SMS detected · ₹420 Swiggy
        </div>
        <ul className="mt-[1.8cqw]">
          {rows.map((r) => (
            <li
              key={r.name}
              className={`flex items-center justify-between px-[2.4cqw] py-[1.3cqw] border-t border-[#121217]/15 ${r.fresh ? "viz-run" : ""}`}
              style={r.fresh ? { animation: "viz-slide 4s ease-out infinite", background: "#EAF6FF" } : undefined}
            >
              <span>
                <span className="font-bold">{r.name}</span>
                <span className="opacity-60"> · {r.cat}</span>
              </span>
              <span className="font-bold">{r.amt}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between px-[2.4cqw] py-[1.6cqw] border-t-2 border-[#121217] font-bold mt-[0.4cqw]">
          <span>This month</span>
          <span>₹15,529</span>
        </div>
      </div>
    </div>
  );
}
