"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminGetAllCompletedTasks,
  adminListTaskCompletions,
  adminListTasks,
  adminListUsers,
} from "@/services/api";
import { StatCard } from "@/components/admin/StatCard";
import { AccountStateBadge } from "@/components/admin/AccountStateBadge";
import type {
  AccountState,
  AdminUserListItem,
  TaskCompletionResponse,
  TaskResponse,
} from "@/types/vektra";

type LoadResult<T> = { ok: true; data: T } | { ok: false; error: string };

function settled<T>(p: PromiseSettledResult<T>): LoadResult<T> {
  if (p.status === "fulfilled") return { ok: true, data: p.value };
  const reason = p.reason;
  return {
    ok: false,
    error: reason instanceof Error ? reason.message : "Failed to load",
  };
}

export default function AdminHomePage() {
  const [users, setUsers] = useState<LoadResult<AdminUserListItem[]> | null>(
    null
  );
  const [tasks, setTasks] = useState<LoadResult<TaskResponse[]> | null>(null);
  const [pending, setPending] = useState<
    LoadResult<TaskCompletionResponse[]> | null
  >(null);
  const [completed, setCompleted] = useState<
    LoadResult<TaskCompletionResponse[]> | null
  >(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    const [u, t, p, c] = await Promise.allSettled([
      adminListUsers(),
      adminListTasks(),
      adminListTaskCompletions("PENDING"),
      adminGetAllCompletedTasks(),
    ]);
    setUsers(settled(u));
    setTasks(settled(t));
    setPending(settled(p));
    setCompleted(settled(c));
    setUpdatedAt(Date.now());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const initialLoading = updatedAt == null;

  const userCount = users?.ok ? users.data.length : null;
  const activeTasks = tasks?.ok
    ? tasks.data.filter((x) => x.status === "ACTIVE").length
    : null;
  const inactiveTasks = tasks?.ok
    ? tasks.data.filter((x) => x.status === "INACTIVE").length
    : null;
  const pendingCount = pending?.ok ? pending.data.length : null;
  const completedCount = completed?.ok ? completed.data.length : null;

  const breakdown = useMemo(() => {
    const empty: Record<AccountState, number> = {
      ACTIVE: 0,
      PENDING: 0,
      SUSPENDED: 0,
    };
    if (!users?.ok) return empty;
    return users.data.reduce((acc, u) => {
      acc[u.accountState] += 1;
      return acc;
    }, { ...empty });
  }, [users]);

  const breakdownTotal =
    breakdown.ACTIVE + breakdown.PENDING + breakdown.SUSPENDED;

  const pendingPreview = useMemo(() => {
    if (!pending?.ok) return [];
    return [...pending.data]
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() -
          new Date(a.completedAt).getTime()
      )
      .slice(0, 5);
  }, [pending]);

  const anyError =
    (users && !users.ok) ||
    (tasks && !tasks.ok) ||
    (pending && !pending.ok) ||
    (completed && !completed.ok);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Overview
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
            Admin dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Snapshot of users, tasks, and pending reviews across the platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {initialLoading
              ? "Loading…"
              : `Updated ${formatTimeAgo(updatedAt!)}`}
          </span>
          <button
            type="button"
            onClick={() => loadAll()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshIcon
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {anyError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Some metrics failed to load. The values shown may be incomplete.
        </div>
      )}

      {/* KPI strip */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Users"
          value={userCount}
          tone="sky"
          loading={initialLoading && !users}
          error={!!users && !users.ok}
          hint={
            users?.ok
              ? `${breakdown.ACTIVE} active · ${breakdown.PENDING} pending`
              : users && !users.ok
                ? users.error
                : undefined
          }
          icon={<UsersIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Active tasks"
          value={activeTasks}
          tone="emerald"
          loading={initialLoading && !tasks}
          error={!!tasks && !tasks.ok}
          hint={
            tasks?.ok
              ? `${inactiveTasks} inactive`
              : tasks && !tasks.ok
                ? tasks.error
                : undefined
          }
          icon={<ClipboardIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Pending approvals"
          value={pendingCount}
          tone="amber"
          loading={initialLoading && !pending}
          error={!!pending && !pending.ok}
          hint={
            pending?.ok
              ? pendingCount === 0
                ? "All caught up"
                : "Awaiting review"
              : pending && !pending.ok
                ? pending.error
                : undefined
          }
          icon={<ClockIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Approved completions"
          value={completedCount}
          tone="violet"
          loading={initialLoading && !completed}
          error={!!completed && !completed.ok}
          hint={
            completed?.ok
              ? "Across all users"
              : completed && !completed.ok
                ? completed.error
                : undefined
          }
          icon={<CheckCircleIcon className="h-5 w-5" />}
        />
      </section>

      {/* Mid section: breakdown + quick actions */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Account state breakdown */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Account state breakdown
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Distribution of user accounts by state.
              </p>
            </div>
            <Link
              href="/users"
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
            >
              Manage users →
            </Link>
          </div>

          {users && !users.ok ? (
            <p className="mt-6 text-sm text-rose-600">{users.error}</p>
          ) : !users ? (
            <BreakdownSkeleton />
          ) : breakdownTotal === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">No users yet.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {(Object.keys(breakdown) as AccountState[]).map((state) => {
                const count = breakdown[state];
                const pct =
                  breakdownTotal === 0
                    ? 0
                    : Math.round((count / breakdownTotal) * 100);
                return (
                  <li key={state}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <AccountStateBadge state={state} />
                      </div>
                      <span className="tabular-nums text-zinc-700">
                        <span className="font-semibold text-zinc-900">
                          {count}
                        </span>
                        <span className="ml-1.5 text-xs text-zinc-500">
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full rounded-full ${barColor(state)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Quick actions</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Jump straight to work.</p>

          <ul className="mt-4 space-y-2">
            {[
              {
                href: "/users",
                title: "Manage users",
                desc: "Approve or suspend accounts",
                icon: <UsersIcon className="h-4 w-4" />,
                tone: "sky" as const,
              },
              {
                href: "/tasks",
                title: "Manage tasks",
                desc: "Create and toggle status",
                icon: <ClipboardIcon className="h-4 w-4" />,
                tone: "emerald" as const,
              },
              {
                href: "/completions",
                title: "Review completions",
                desc:
                  pendingCount && pendingCount > 0
                    ? `${pendingCount} pending`
                    : "Pending submissions",
                icon: <ClockIcon className="h-4 w-4" />,
                tone: "amber" as const,
                badge: pendingCount && pendingCount > 0 ? pendingCount : null,
              },
            ].map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <span
                    className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-md ring-1 ${quickActionTone(
                      a.tone
                    )}`}
                  >
                    {a.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900">
                      {a.title}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {a.desc}
                    </span>
                  </span>
                  {a.badge ? (
                    <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
                      {a.badge}
                    </span>
                  ) : null}
                  <ChevronRightIcon className="h-4 w-4 flex-none text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-600" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pending approvals preview */}
      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Pending approvals
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Most recent submissions awaiting review.
            </p>
          </div>
          <Link
            href="/completions"
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            View all →
          </Link>
        </div>

        {pending && !pending.ok ? (
          <p className="px-5 py-6 text-sm text-rose-600">{pending.error}</p>
        ) : !pending ? (
          <PendingSkeleton />
        ) : pendingPreview.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircleIcon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium text-zinc-900">
              All caught up
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              No pending completions to review.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {pendingPreview.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {c.taskName}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    User #{c.userId} · {formatDateTime(c.completedAt)}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100 tabular-nums">
                  +{c.rewardAmount.toLocaleString()}
                </span>
                <Link
                  href="/completions"
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Review →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* --- helpers --- */

function formatTimeAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function barColor(state: AccountState): string {
  switch (state) {
    case "ACTIVE":
      return "bg-emerald-500";
    case "PENDING":
      return "bg-amber-500";
    case "SUSPENDED":
      return "bg-rose-500";
  }
}

function quickActionTone(tone: "sky" | "emerald" | "amber"): string {
  switch (tone) {
    case "sky":
      return "bg-sky-50 text-sky-700 ring-sky-100";
    case "emerald":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "amber":
      return "bg-amber-50 text-amber-700 ring-amber-100";
  }
}

/* --- skeletons --- */

function BreakdownSkeleton() {
  return (
    <ul className="mt-5 space-y-3">
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-12 animate-pulse rounded bg-zinc-100" />
          </div>
          <div className="mt-1.5 h-1.5 animate-pulse rounded-full bg-zinc-100" />
        </li>
      ))}
    </ul>
  );
}

function PendingSkeleton() {
  return (
    <ul className="divide-y divide-zinc-100">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
          </div>
          <div className="h-6 w-12 animate-pulse rounded-full bg-zinc-100" />
        </li>
      ))}
    </ul>
  );
}

/* --- icons --- */

function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ClipboardIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5L16 9.5" />
    </svg>
  );
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-3.5-7.1" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

function ChevronRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
