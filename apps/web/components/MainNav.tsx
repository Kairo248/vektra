"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NavAuth } from "@/components/NavAuth";

const links = [
  { href: "/", label: "Home" },
  { href: "/signup", label: "Signup" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/wallet", label: "Wallet" },
];

export function MainNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-emerald-800"
          >
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-sm">
              V
            </span>
            Vektra
          </Link>

          {/* Desktop nav (md and up) */}
          <nav className="hidden items-center gap-1 text-sm font-medium text-zinc-600 md:flex">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href} active={isActive(pathname, l.href)}>
                {l.label}
              </NavLink>
            ))}
            <span className="mx-1 h-4 w-px bg-zinc-200" />
            <NavAuth />
          </nav>

          {/* Hamburger (mobile) */}
          <button
            type="button"
            className="-mr-1 inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <span className="relative block h-4 w-5" aria-hidden>
              <span
                className={`absolute left-0 top-0 h-0.5 w-full rounded-sm bg-current transition-all duration-300 ${
                  open ? "translate-y-[7px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[7px] h-0.5 w-full rounded-sm bg-current transition-opacity duration-200 ${
                  open ? "opacity-0" : ""
                }`}
              />
              <span
                className={`absolute bottom-0 left-0 h-0.5 w-full rounded-sm bg-current transition-all duration-300 ${
                  open ? "-translate-y-[7px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>

        {/* Mobile drawer — absolutely positioned so it overlays page content
            rather than expanding the sticky header's height. */}
        <div
          id="mobile-nav"
          className={`absolute inset-x-0 top-full overflow-hidden border-t border-zinc-200 bg-white shadow-lg transition-[max-height,opacity] duration-300 ease-out md:hidden ${
            open ? "max-h-[80vh] opacity-100" : "pointer-events-none max-h-0 opacity-0"
          }`}
        >
          <nav className="flex max-h-[80vh] flex-col gap-1 overflow-y-auto px-3 py-3 text-sm font-medium text-zinc-700">
            {links.map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                  isActive(pathname, l.href)
                    ? "bg-emerald-50 text-emerald-800"
                    : "hover:bg-zinc-50 hover:text-zinc-900"
                } ${open ? "animate-fade-in-up" : ""}`}
                style={open ? { animationDelay: `${i * 40}ms` } : undefined}
              >
                <span>{l.label}</span>
                <span
                  className={`transition-transform group-hover:translate-x-0.5 ${
                    isActive(pathname, l.href) ? "text-emerald-600" : "text-zinc-300"
                  }`}
                  aria-hidden
                >
                  →
                </span>
              </Link>
            ))}
            <div className="my-2 h-px bg-zinc-100" />
            <div className="px-1 py-1">
              <NavAuth />
            </div>
          </nav>
        </div>
      </header>

      {/* Backdrop sits as a sibling of the header so its z-index is compared
          against the header at the body level (header z-40 > backdrop z-30). */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-30 cursor-default bg-zinc-900/30 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
    </>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`relative rounded-md px-3 py-1.5 transition-colors ${
        active
          ? "text-emerald-800"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      {children}
      {active ? (
        <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-emerald-500" />
      ) : null}
    </Link>
  );
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
