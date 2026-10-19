import { liveProjectCount, stats } from "@/lib/site-data";
import { HandArrow, HandNote } from "./hand-note";

/**
 * Four verified numbers. The project count is derived from site data so it
 * cannot drift; the others carry their source in lib/site-data.ts.
 */
export function ProofStrip({ className = "" }: { className?: string }) {
  const items = [
    stats[0],
    stats[1],
    { value: String(liveProjectCount), label: "projects live right now.", source: "lib/site-data.ts" },
    stats[2],
  ];

  return (
    <section aria-label="Proof" className={`relative ${className}`}>
      <div className="absolute -top-9 right-2 hidden lg:flex items-end gap-2 text-fg">
        <HandNote size="sm" className="text-[1.2rem] rotate-[-2deg]">real numbers, checked</HandNote>
        <HandArrow className="w-12 h-6 rotate-[40deg] -mb-2" />
      </div>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-fg border-2 border-fg rounded-[14px] overflow-hidden">
        {items.map((s) => (
          <div key={s.label} className="bg-card p-5 md:p-6 flex flex-col">
            <dt className="order-2 text-[15px] text-muted leading-snug mt-2">{s.label}</dt>
            <dd className="order-1 display text-[2.4rem] md:text-[3rem] leading-none text-fg">{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
