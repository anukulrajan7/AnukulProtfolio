import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/", label: "home" },
  { href: "/blog", label: "writing" },
  { href: "/work", label: "work" },
  { href: "/projects", label: "projects" },
];

export function Nav() {
  return (
    <nav className="flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-heading text-lg font-extrabold tracking-tight hover:text-accent transition-colors">
          AR
        </Link>
        <div className="flex items-center gap-5 text-sm">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className="nav-link text-muted hover:text-fg transition-colors py-1">
              {label}
            </Link>
          ))}
        </div>
      </div>
      <ThemeToggle />
    </nav>
  );
}
