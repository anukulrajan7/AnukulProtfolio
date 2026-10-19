"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/work", label: "Work" },
  { href: "/projects", label: "Projects" },
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
            className={`nav-link label py-1 hover:text-fg transition-colors ${active ? "text-fg" : ""}`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
