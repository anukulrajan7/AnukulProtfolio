import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Anukul Raj — Product Engineer, Hyderabad";
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
          background: "#F1ECE1",
          color: "#17150F",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 2, color: "#6E675A" }}>
          <span>§00 — FIELD LOG</span>
          <span>17.385°N 78.486°E · HYD</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 132, lineHeight: 1, letterSpacing: -4 }}>Anukul Raj</div>
          <div style={{ marginTop: 28, fontSize: 34, lineHeight: 1.3, maxWidth: 900, color: "#17150F" }}>
            Real-time systems: live location tracking, WebRTC calls, device gateways — and the interfaces around them.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 22, letterSpacing: 2, color: "#6E675A" }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: "#FF4F00" }} />
          <span>PRODUCT ENGINEER 2 · WOKAY</span>
          <span style={{ marginLeft: "auto" }}>anukulraj.com</span>
        </div>
      </div>
    ),
    size
  );
}
