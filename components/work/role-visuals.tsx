import type { RoleVisual } from "./work-data";
import { BrowserFrame } from "@/components/visuals/browser-frame";

/*
 * Role tile illustrations. Decorative (aria-hidden), built from HTML/SVG,
 * sized with container units so they scale with the tile. Animations use
 * the .viz-run gate from visuals.css: they run on hover or when in view and
 * are disabled under prefers-reduced-motion.
 */

const ink = "#121217";
const paper = "#FFFFFF";

export function RoleVisualFor({ visual }: { visual: RoleVisual }) {
  switch (visual) {
    case "landing":
      return <LandingMock />;
    case "dashboard":
      return <DashboardMock />;
    case "feed":
      return <FeedMock />;
    case "workspace":
      // The real product site, public marketing page only.
      return <BrowserFrame src="/work/wokay.webp" alt="wokay.com home page: the chat-first work platform" url="wokay.com" />;
    default:
      return null;
  }
}

/* ---- iMeet: a marketing page, desktop and phone, same layout ---------- */

function Line({ w, h = "1.4cqw", bg = ink, op = 1 }: { w: string; h?: string; bg?: string; op?: number }) {
  return <span className="block rounded-full" style={{ width: w, height: h, background: bg, opacity: op }} />;
}

function LandingMock() {
  return (
    <div aria-hidden className="absolute inset-0 p-[5cqw] flex items-end gap-[3cqw]" style={{ color: ink }}>
      {/* desktop */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{ height: "54cqw", background: paper, border: "0.5cqw solid " + ink, borderRadius: "2.4cqw 2.4cqw 0 0", marginBottom: "-6cqw" }}
      >
        <div className="flex items-center justify-between px-[2.4cqw] py-[1.6cqw]" style={{ borderBottom: "0.3cqw solid " + ink }}>
          <span className="font-bold" style={{ fontSize: "2.4cqw" }}>
            imeet
          </span>
          <span className="flex gap-[1.6cqw]">
            <Line w="5cqw" h="1cqw" op={0.4} />
            <Line w="5cqw" h="1cqw" op={0.4} />
            <Line w="5cqw" h="1cqw" op={0.4} />
            <span className="rounded-full" style={{ width: "8cqw", height: "2.4cqw", background: "var(--p-1)", marginTop: "-0.7cqw" }} />
          </span>
        </div>
        <div className="px-[2.4cqw] pt-[3cqw] flex gap-[3cqw]">
          <div className="flex-1 space-y-[1.4cqw]">
            <Line w="34cqw" h="3cqw" />
            <Line w="26cqw" h="3cqw" />
            <Line w="30cqw" h="1.1cqw" op={0.45} />
            <Line w="22cqw" h="1.1cqw" op={0.45} />
            <span className="inline-block rounded-full font-bold" style={{ fontSize: "1.7cqw", background: "var(--p-2)", padding: "0.6cqw 2cqw", border: "0.3cqw solid " + ink }}>
              Start learning
            </span>
          </div>
          <div className="rounded-[1.6cqw] viz-run" style={{ width: "20cqw", height: "16cqw", background: "var(--p-5)", border: "0.3cqw solid " + ink, animation: "viz-breathe 4s ease-in-out infinite" }} />
        </div>
        <div className="px-[2.4cqw] mt-[3cqw] grid grid-cols-3 gap-[2cqw]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[1.4cqw] p-[1.6cqw] space-y-[1cqw]" style={{ border: "0.3cqw solid " + ink, background: i === 1 ? "var(--p-6)" : paper }}>
              <span className="block rounded-full" style={{ width: "3cqw", height: "3cqw", background: ink }} />
              <Line w="80%" h="1cqw" />
              <Line w="60%" h="0.9cqw" op={0.45} />
            </div>
          ))}
        </div>
      </div>
      {/* phone: same page, stacked */}
      <div
        className="relative overflow-hidden shrink-0"
        style={{ width: "22cqw", height: "44cqw", background: paper, border: "0.5cqw solid " + ink, borderRadius: "3cqw 3cqw 0 0", marginBottom: "-6cqw" }}
      >
        <div className="px-[1.8cqw] pt-[2.2cqw] space-y-[1.1cqw]">
          <span className="flex items-center justify-between">
            <span className="font-bold" style={{ fontSize: "1.8cqw" }}>
              imeet
            </span>
            <span className="space-y-[0.5cqw]">
              <Line w="2.6cqw" h="0.5cqw" />
              <Line w="2.6cqw" h="0.5cqw" />
              <Line w="2.6cqw" h="0.5cqw" />
            </span>
          </span>
          <Line w="100%" h="2cqw" />
          <Line w="70%" h="2cqw" />
          <Line w="90%" h="0.8cqw" op={0.45} />
          <span className="block rounded-full" style={{ width: "100%", height: "3cqw", background: "var(--p-2)", border: "0.3cqw solid " + ink }} />
          <span className="block rounded-[1.2cqw]" style={{ width: "100%", height: "9cqw", background: "var(--p-5)", border: "0.3cqw solid " + ink }} />
          <span className="block rounded-[1.2cqw]" style={{ width: "100%", height: "9cqw", background: "var(--p-6)", border: "0.3cqw solid " + ink }} />
        </div>
      </div>
    </div>
  );
}

/* ---- Echo: a data dashboard with a bar chart and an xlsx import -------- */

const bars = [38, 56, 44, 72, 60, 84, 66, 90];

function DashboardMock() {
  return (
    <div aria-hidden className="absolute inset-0 p-[5cqw]" style={{ color: ink, fontSize: "2cqw" }}>
      <div
        className="relative h-full overflow-hidden grid"
        style={{ gridTemplateColumns: "16cqw 1fr", background: paper, border: "0.5cqw solid " + ink, borderRadius: "2.4cqw" }}
      >
        <div className="p-[2cqw] space-y-[1.8cqw]" style={{ borderRight: "0.3cqw solid " + ink, background: "#F2F1EC" }}>
          <span className="font-bold block" style={{ fontSize: "2.4cqw" }}>
            echo
          </span>
          {["Overview", "Sales", "Regions", "Exports"].map((s, i) => (
            <span key={s} className="block rounded-[0.8cqw] px-[1cqw] py-[0.6cqw]" style={{ fontSize: "1.6cqw", background: i === 0 ? ink : "transparent", color: i === 0 ? paper : ink, fontWeight: 700 }}>
              {s}
            </span>
          ))}
        </div>
        <div className="p-[2.4cqw] flex flex-col min-h-0">
          <div className="flex items-center justify-between">
            <span className="font-bold" style={{ fontSize: "2.2cqw" }}>
              Monthly sales
            </span>
            <span className="rounded-full font-bold flex items-center gap-[0.8cqw]" style={{ fontSize: "1.6cqw", background: "var(--p-4)", padding: "0.5cqw 1.4cqw", border: "0.3cqw solid " + ink }}>
              <span className="inline-block" style={{ width: "1.4cqw", height: "1.6cqw", background: ink, borderRadius: "0.2cqw" }} />
              sales.xlsx imported
            </span>
          </div>
          <div className="grid grid-cols-3 gap-[1.6cqw] mt-[1.8cqw]">
            {[
              ["Revenue", "4.2L"],
              ["Orders", "1,284"],
              ["Regions", "6"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[1.2cqw] p-[1.2cqw]" style={{ border: "0.3cqw solid " + ink }}>
                <span className="block opacity-60" style={{ fontSize: "1.4cqw" }}>
                  {k}
                </span>
                <span className="block font-bold" style={{ fontSize: "2.6cqw" }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
          <div className="flex-1 min-h-0 mt-[2cqw] flex items-end gap-[1.4cqw] px-[0.4cqw]" style={{ borderBottom: "0.3cqw solid " + ink }}>
            {bars.map((h, i) => (
              <span
                key={i}
                className="flex-1 viz-run"
                style={{
                  height: `${h}%`,
                  background: i === bars.length - 1 ? "var(--p-3)" : "var(--p-1)",
                  borderRadius: "0.8cqw 0.8cqw 0 0",
                  border: "0.3cqw solid " + ink,
                  borderBottom: 0,
                  transformOrigin: "bottom",
                  animation: `viz-tick 3.2s ease-out ${i * 0.12}s infinite`,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-[0.8cqw] opacity-60" style={{ fontSize: "1.4cqw" }}>
            <span>Jan</span>
            <span>Apr</span>
            <span>Jul</span>
            <span>Oct</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Social X: a feed that updates while you scroll ------------------- */

const posts = [
  { who: "Meera", when: "now", text: "shipped the new feed today", likes: 12, fresh: true, c: "var(--p-5)" },
  { who: "Kabir", when: "2m", text: "anyone up for a run on Sunday?", likes: 4, c: "var(--p-6)" },
  { who: "Sana", when: "9m", text: "late night build, worth it", likes: 31, c: "var(--p-2)" },
  { who: "Rohan", when: "14m", text: "new profile page looks clean", likes: 8, c: "var(--p-4)" },
];

function FeedMock() {
  return (
    <div aria-hidden className="absolute inset-0 p-[5cqw] flex justify-center" style={{ color: ink, fontSize: "2cqw" }}>
      <div className="relative w-full overflow-hidden" style={{ maxWidth: "62cqw", background: paper, border: "0.5cqw solid " + ink, borderRadius: "2.4cqw 2.4cqw 0 0", marginBottom: "-6cqw" }}>
        <div className="flex items-center justify-between px-[2.4cqw] py-[1.6cqw]" style={{ borderBottom: "0.3cqw solid " + ink }}>
          <span className="font-bold" style={{ fontSize: "2.4cqw" }}>
            Home
          </span>
          <span className="rounded-full font-bold" style={{ fontSize: "1.6cqw", background: "var(--p-2)", padding: "0.5cqw 1.4cqw", border: "0.3cqw solid " + ink }}>
            Follow
          </span>
        </div>
        <div className="mx-[2.4cqw] mt-[1.4cqw] rounded-full text-center font-bold viz-run" style={{ fontSize: "1.6cqw", background: "var(--p-1)", color: paper, padding: "0.6cqw 0", animation: "viz-slide 4s ease-out infinite" }}>
          3 new posts
        </div>
        <ul>
          {posts.map((p) => (
            <li
              key={p.who}
              className={`flex gap-[1.8cqw] px-[2.4cqw] py-[1.8cqw] ${p.fresh ? "viz-run" : ""}`}
              style={{
                borderBottom: "0.2cqw solid rgba(18,18,23,0.15)",
                animation: p.fresh ? "viz-slide 4s ease-out infinite" : undefined,
                background: p.fresh ? "#FFF3EF" : undefined,
              }}
            >
              <span className="shrink-0 rounded-full flex items-center justify-center font-bold" style={{ width: "5cqw", height: "5cqw", background: p.c, border: "0.3cqw solid " + ink, fontSize: "2.2cqw" }}>
                {p.who[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-[1cqw]">
                  <span className="font-bold" style={{ fontSize: "1.9cqw" }}>
                    {p.who}
                  </span>
                  <span className="opacity-60" style={{ fontSize: "1.5cqw" }}>
                    {p.when}
                  </span>
                </span>
                <span className="block" style={{ fontSize: "1.8cqw" }}>
                  {p.text}
                </span>
                <span className="flex gap-[2.4cqw] mt-[0.8cqw] opacity-70" style={{ fontSize: "1.5cqw" }}>
                  <span>♥ {p.likes}</span>
                  <span>↩ 2</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
