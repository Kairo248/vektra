"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Overview" },
  { href: "/users", label: "Users" },
  { href: "/tasks", label: "Tasks" },
  { href: "/completions", label: "Task completions" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 border-b border-zinc-200 bg-white pb-4 md:w-52 md:border-b-0 md:border-r md:pb-0 md:pr-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Admin
      </p>
      <nav className="flex flex-row flex-wrap gap-2 md:flex-col md:gap-1">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-emerald-100 text-emerald-900"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
