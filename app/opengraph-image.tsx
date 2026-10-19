import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Anukul Raj, Product Engineer, Hyderabad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#FFFFFF",
          color: "#121217",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28, fontWeight: 700 }}>
          <span>anukul.</span>
          <span style={{ background: "#FFC83D", padding: "8px 18px", borderRadius: 999, fontSize: 22 }}>
            Product Engineer · Wokay · Hyderabad
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, lineHeight: 1.02, letterSpacing: -3, fontWeight: 800, maxWidth: 1000 }}>
            I build software that keeps working when the network doesn&apos;t.
          </div>
          <div style={{ marginTop: 26, fontSize: 30, lineHeight: 1.3, maxWidth: 900, color: "#55555F" }}>
            Video calls for 20 people. Live location on real Android phones. A server that talks to fingerprint
            machines.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 24, fontWeight: 700 }}>
          <div style={{ width: 18, height: 18, borderRadius: 999, background: "#2E3BF0" }} />
          <span>Anukul Raj</span>
          <span style={{ marginLeft: "auto", color: "#2E3BF0" }}>anukulraj.com</span>
        </div>
      </div>
    ),
    size
  );
}
