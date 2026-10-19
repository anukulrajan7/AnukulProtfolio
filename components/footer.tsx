import { GitHubIcon, LinkedInIcon, XIcon } from "./icons";
import { HandNote } from "./hand-note";
import { site } from "@/lib/site-data";

const links = [
  { icon: GitHubIcon, href: site.github, label: "GitHub" },
  { icon: LinkedInIcon, href: site.linkedin, label: "LinkedIn" },
  { icon: XIcon, href: site.x, label: "X" },
];

export function Footer() {
  return (
    <footer className="mt-24 bg-accent text-on-accent">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8 py-14 md:py-20">
        <div className="grid gap-10 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <h2 className="display text-[2.4rem] md:text-[4rem] max-w-[16ch]">
              Got a real-time problem? I&apos;d like to hear about it.
            </h2>
            <p className="mt-5 text-[1.05rem] max-w-[46ch] text-[#C9CCFF] dark:text-[#2a2d55]">
              Calls, tracking, odd devices, or a frontend that has to stay fast. One email is enough. I read
              every one.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href={`mailto:${site.email}`} className="btn btn-sun">
                Email me
              </a>
              <span className="text-[15px] font-medium">{site.email}</span>
            </div>
          </div>
          <div className="md:col-span-4 flex md:justify-end items-center gap-3">
            {links.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-current hover:bg-on-accent hover:text-accent transition-colors"
                aria-label={label}
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-[#C9CCFF]/40 dark:border-[#2a2d55]/50 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-[15px]">
          <HandNote size="sm" className="text-[1.25rem]">
            made in Hyderabad, mostly after 9pm
          </HandNote>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-medium">
            <a href="/rss" className="hover:underline">
              RSS
            </a>
            <a href="/resume.pdf" target="_blank" rel="noopener" className="hover:underline">
              Résumé (PDF)
            </a>
            <span>© {new Date().getFullYear()} Anukul Raj</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
