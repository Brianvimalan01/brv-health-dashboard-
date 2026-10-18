"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/day", label: "Log" },
  { href: "/weight", label: "Weight" },
  { href: "/history", label: "History" },
  { href: "/backup", label: "Backup" },
];

export function Nav() {
  // usePathname has the base path removed and, with trailingSlash, may end in "/".
  const path = usePathname().replace(/(.)\/$/, "$1");
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto text-sm">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 sm:px-3 ${active ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
