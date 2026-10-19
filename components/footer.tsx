import { GitHubIcon, LinkedInIcon, XIcon } from "./icons";

const links = [
  { icon: GitHubIcon, href: "https://github.com/anukulrajan7", label: "GitHub" },
  { icon: LinkedInIcon, href: "https://linkedin.com/in/anukul-raj-31b6a2193", label: "LinkedIn" },
  { icon: XIcon, href: "https://x.com/R01202183Raj", label: "X" },
];

export function Footer() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="mx-auto max-w-[1120px] px-5 md:px-8 py-8 grid gap-6 md:grid-cols-12 md:items-start">
        <div className="md:col-span-5 label text-fg">
          <div>Anukul Raj · field log</div>
          <div className="mt-1.5 text-muted">Hyderabad, IN · 17.385°N 78.486°E</div>
        </div>
        <div className="md:col-span-4 flex flex-col gap-1.5 label">
          <a href="mailto:anukulraj2004@gmail.com" className="hover:text-fg transition-colors w-fit">
            anukulraj2004@gmail.com
          </a>
          <a href="/rss" className="hover:text-fg transition-colors w-fit">
            rss feed
          </a>
          <a href="/resume.pdf" target="_blank" rel="noopener" className="hover:text-fg transition-colors w-fit">
            résumé (pdf)
          </a>
        </div>
        <div className="md:col-span-3 flex md:justify-end items-center gap-2">
          {links.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center w-8 h-8 border border-border text-muted hover:text-fg hover:border-fg transition-colors"
              aria-label={label}
            >
              <Icon size={14} />
            </a>
          ))}
        </div>
        <div className="md:col-span-12 label pt-4 border-t border-border flex flex-wrap justify-between gap-2">
          <span>© {new Date().getFullYear()} Anukul Raj</span>
          <span>Zodiak · Satoshi · Martian Mono</span>
        </div>
      </div>
    </footer>
  );
}
