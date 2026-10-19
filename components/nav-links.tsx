"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/projects", label: "Projects" },
  { href: "/work", label: "Work" },
  { href: "/blog", label: "Writing" },
  { href: "/arcade", label: "Arcade" },
  { href: "/cv", label: "CV" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            data-active={active ? "true" : "false"}
            className={`nav-link py-1 text-[15px] transition-colors hover:text-fg ${active ? "text-fg" : "text-muted"}`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
