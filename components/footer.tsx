import { Mail } from "lucide-react";
import { GitHubIcon, LinkedInIcon, XIcon } from "./icons";

const links = [
  { icon: GitHubIcon, href: "https://github.com/anukulrajan7", label: "GitHub" },
  { icon: LinkedInIcon, href: "https://linkedin.com/in/anukul-raj-31b6a2193", label: "LinkedIn" },
  { icon: XIcon, href: "https://x.com/R01202183Raj", label: "X" },
  { icon: Mail, href: "mailto:anukulraj2004@gmail.com", label: "Email" },
];

export function Footer() {
  return (
    <footer className="mt-24 pt-8 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {links.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener"
              className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors"
              aria-label={label}
            >
              <Icon size={16} />
            </a>
          ))}
        </div>
        <span className="text-xs text-muted">
          &copy; {new Date().getFullYear()} Anukul Raj
        </span>
      </div>
    </footer>
  );
}
