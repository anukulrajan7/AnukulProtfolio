import Link from "next/link";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";
import { site } from "@/lib/site-data";

export function Nav() {
  return (
    <header>
      <nav className="mx-auto max-w-[1200px] px-5 md:px-8 flex items-center justify-between gap-4 h-16">
        <Link
          href="/"
          className="display text-[1.5rem] leading-none hover:text-accent transition-colors shrink-0"
          aria-label="Anukul Raj, home"
        >
          anukul<span className="text-accent">.</span>
        </Link>
        <div className="flex items-center gap-4 md:gap-7">
          <div className="hidden sm:flex items-center gap-5 md:gap-7">
            <NavLinks />
          </div>
          <a href={`mailto:${site.email}`} className="btn btn-primary btn-sm hidden md:inline-flex">
            Email me
          </a>
          <ThemeToggle />
        </div>
      </nav>
      <div className="sm:hidden mx-auto max-w-[1200px] px-5 flex items-center gap-5 overflow-x-auto h-11 border-b border-border">
        <NavLinks />
      </div>
    </header>
  );
}
