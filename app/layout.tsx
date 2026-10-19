import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { site } from "@/lib/site-data";
import { bricolage, kalam, martianMono } from "./fonts";
import "./globals.css";

const description =
  "Anukul Raj is a product engineer in Hyderabad. Video calls, live location tracking, device gateways, and the interfaces around them. Work, projects and notes.";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Anukul Raj, Product Engineer in Hyderabad",
    template: "%s | Anukul Raj",
  },
  description,
  applicationName: "Anukul Raj",
  authors: [{ name: "Anukul Raj", url: site.url }],
  creator: "Anukul Raj",
  keywords: [
    "Anukul Raj",
    "product engineer",
    "frontend engineer",
    "React",
    "Next.js",
    "TypeScript",
    "React Native",
    "Go",
    "WebRTC",
    "mediasoup",
    "live location tracking",
    "Hyderabad",
  ],
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": `${site.url}/rss` },
  },
  openGraph: {
    title: "Anukul Raj, Product Engineer",
    description,
    url: site.url,
    siteName: "Anukul Raj",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anukul Raj, Product Engineer",
    description,
    creator: "@R01202183Raj",
  },
  robots: { index: true, follow: true },
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${site.url}/#person`,
  name: "Anukul Raj",
  url: site.url,
  image: `${site.url}${site.photo}`,
  jobTitle: "Product Engineer 2",
  worksFor: { "@type": "Organization", name: "Wokay", url: "https://wokay.com" },
  address: { "@type": "PostalAddress", addressLocality: "Hyderabad", addressCountry: "IN" },
  email: `mailto:${site.email}`,
  sameAs: [site.github, site.linkedin, site.x],
  knowsAbout: ["React", "Next.js", "TypeScript", "React Native", "Go", "WebRTC", "mediasoup", "live location tracking"],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${site.url}/#website`,
  url: site.url,
  name: "Anukul Raj",
  author: { "@id": `${site.url}/#person` },
  inLanguage: "en",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${kalam.variable} ${martianMono.variable}`}
    >
      <head>
        {/* Prevent FOUC: enable transitions only after first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.classList.add("theme-ready")))`,
          }}
        />
        <JsonLd data={personSchema} />
        <JsonLd data={websiteSchema} />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Nav />
          <main className="flex-1 mx-auto w-full max-w-[1200px] px-5 md:px-8 pt-8 md:pt-12">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
