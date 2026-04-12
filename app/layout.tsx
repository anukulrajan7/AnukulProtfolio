import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://anukulraj.com"),
  title: {
    default: "Anukul Raj — Product Engineer",
    template: "%s | Anukul Raj",
  },
  description:
    "Product Engineer at Wokay. Building fast, accessible interfaces for real-time collaboration tools. 3 years of experience with React, Next.js, and TypeScript.",
  openGraph: {
    title: "Anukul Raj — Product Engineer",
    description:
      "Product Engineer at Wokay. Building real-time collaboration tools.",
    url: "https://anukulraj.com",
    siteName: "Anukul Raj",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anukul Raj — Product Engineer",
    description:
      "Product Engineer at Wokay. Building real-time collaboration tools.",
    creator: "@R01202183Raj",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Prevent FOUC: enable transitions only after first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.classList.add("theme-ready")))`,
          }}
        />
      </head>
      <body className="max-w-[672px] mx-auto px-6 py-12 md:py-24">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Nav />
          <main className="mt-16 md:mt-20">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
