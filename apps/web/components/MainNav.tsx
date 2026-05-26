import Link from "next/link";
import { NavAuth } from "@/components/NavAuth";

const links = [
  { href: "/", label: "Home" },
  { href: "/signup", label: "Signup" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/wallet", label: "Wallet" },
];

export function MainNav() {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-emerald-800"
        >
          Vektra
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-zinc-600">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-2 py-1 hover:bg-zinc-100 hover:text-zinc-900"
            >
              {l.label}
            </Link>
          ))}
          <span className="hidden h-4 w-px bg-zinc-200 sm:inline-block" />
          <NavAuth />
        </nav>
      </div>
    </header>
  );
}
