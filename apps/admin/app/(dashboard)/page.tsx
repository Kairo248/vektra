import Link from "next/link";
import { CompletedTasksOverviewCard } from "@/components/admin/CompletedTasksOverviewCard";

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Admin dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manage users, tasks, and manual completion reviews.
        </p>
      </div>

      <CompletedTasksOverviewCard />

      <ul className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/users", title: "Users", desc: "Approve or suspend accounts" },
          { href: "/tasks", title: "Tasks", desc: "Create and toggle task status" },
          {
            href: "/completions",
            title: "Completions",
            desc: "Review pending submissions",
          },
        ].map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <h2 className="font-semibold text-zinc-900">{card.title}</h2>
              <p className="mt-1 text-sm text-zinc-600">{card.desc}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
