import { FileText, Mail } from "lucide-react";
import { site } from "@/lib/site-data";
import { GitHubIcon, LinkedInIcon, XIcon } from "./icons";
import { SectionHeading } from "./ui/section-label";

const places = [
  {
    label: "GitHub",
    handle: "anukulrajan7",
    note: "Public repos. Most of my work is private, so ask about the rest.",
    href: site.github,
    Icon: GitHubIcon,
    band: "bg-p7",
  },
  {
    label: "LinkedIn",
    handle: "anukul-raj",
    note: "Work history and the occasional post.",
    href: site.linkedin,
    Icon: LinkedInIcon,
    band: "bg-p6",
  },
  {
    label: "X",
    handle: "@R01202183Raj",
    note: "Short notes on what I'm building.",
    href: site.x,
    Icon: XIcon,
    band: "bg-p2",
  },
  {
    label: "Email",
    handle: site.email,
    note: "The fastest way to reach me. I read every one.",
    href: `mailto:${site.email}`,
    Icon: Mail,
    band: "bg-p3",
  },
  {
    label: "CV",
    handle: "anukulraj.com/cv",
    note: "One page, prints to A4. Also as a PDF.",
    href: "/cv",
    Icon: FileText,
    band: "bg-p4",
  },
];

/** Curated links only: no follower, star or contribution counts anywhere. */
export function FindMe({ className = "" }: { className?: string }) {
  return (
    <section id="find-me" className={className}>
      <SectionHeading name="Find me" aside="Open to opportunities" />
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {places.map(({ label, handle, note, href, Icon, band }) => {
          const external = href.startsWith("http");
          return (
            <li key={label} className="card overflow-hidden">
              <a
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener" : undefined}
                className="group flex h-full flex-col p-5 hover:bg-surface transition-colors"
              >
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-fg ${band} ${band === "bg-p7" ? "text-paper" : "text-ink"}`}
                >
                  <Icon size={20} />
                </span>
                <span className="mt-4 font-bold text-[1.1rem] group-hover:text-accent transition-colors">{label}</span>
                <span className="mt-0.5 text-[14px] text-muted break-all">{handle}</span>
                <span className="mt-3 text-[14.5px] leading-snug">{note}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
