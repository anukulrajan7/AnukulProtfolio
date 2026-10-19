import Link from "next/link";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export function Nav() {
  return (
    <header className="border-b border-border">
      <nav className="mx-auto max-w-[1120px] px-5 md:px-8 flex items-center justify-between gap-4 h-14">
        <Link href="/" className="display text-[1.25rem] leading-none hover:text-accent transition-colors shrink-0">
          Anukul <span className="italic">Raj</span>
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden sm:flex items-center gap-4 md:gap-6">
            <NavLinks />
          </div>
          <ThemeToggle />
        </div>
      </nav>
      <div className="sm:hidden mx-auto max-w-[1120px] px-5 flex items-center gap-4 overflow-x-auto h-10 border-t border-border">
        <NavLinks />
      </div>
    </header>
  );
}
