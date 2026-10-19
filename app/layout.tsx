import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { martianMono } from "./fonts";
import "./globals.css";

const description =
  "Field log of Anukul Raj, Product Engineer at Wokay in Hyderabad. Real-time systems: live location tracking, WebRTC calling, device gateways, and the interfaces around them. Notes on frontend and systems work.";

export const metadata: Metadata = {
  metadataBase: new URL("https://anukulraj.com"),
  title: {
    default: "Anukul Raj — Product Engineer",
    template: "%s | Anukul Raj",
  },
  description,
  openGraph: {
    title: "Anukul Raj — Product Engineer",
    description,
    url: "https://anukulraj.com",
    siteName: "Anukul Raj",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anukul Raj — Product Engineer",
    description,
    creator: "@R01202183Raj",
  },
  alternates: {
    types: { "application/rss+xml": "https://anukulraj.com/rss" },
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={martianMono.variable}>
      <head>
        {/* Prevent FOUC: enable transitions only after first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.classList.add("theme-ready")))`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Nav />
          <main className="flex-1 mx-auto w-full max-w-[1120px] px-5 md:px-8 pt-10 md:pt-16">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
