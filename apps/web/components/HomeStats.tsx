"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminListUsers, getCompletedTasks } from "@/services/api";
import type { AdminUserListItem, TaskCompletionResponse } from "@/types/vektra";

const POLL_INTERVAL_MS = 15_000;
const TICK_INTERVAL_MS = 5_000;

type Stats = {
  tasksCompleted: number;
  vektrasEarned: number;
  uniqueEarners: number;
  happyUsers: number;
};

const DELAYS = ["delay-100", "delay-200", "delay-300", "delay-400"] as const;

export function HomeStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [, setNow] = useState(Date.now());

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [completions, users] = await Promise.all([
        getCompletedTasks(),
        adminListUsers(),
      ]);
      if (signal?.aborted) return;
      setStats(computeStats(completions, users));
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      if (signal?.aborted) return;
      setError(e instanceof Error ? e.message : "Failed to load stats");
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    const pollId = setInterval(() => void load(ctrl.signal), POLL_INTERVAL_MS);
    const tickId = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => {
      ctrl.abort();
      clearInterval(pollId);
      clearInterval(tickId);
    };
  }, [load]);

  const tasks = useCountUp(stats?.tasksCompleted ?? 0);
  const earned = useCountUp(stats?.vektrasEarned ?? 0);
  const earners = useCountUp(stats?.uniqueEarners ?? 0);
  const happy = useCountUp(stats?.happyUsers ?? 0);

  const items: ReadonlyArray<{
    label: string;
    raw: number | null;
    display: string;
  }> = [
    {
      label: "Tasks completed",
      raw: stats?.tasksCompleted ?? null,
      display: formatNumber(Math.round(tasks)),
    },
    {
      label: "Vektras earned",
      raw: stats?.vektrasEarned ?? null,
      display: "₵ " + formatNumber(Math.round(earned)),
    },
    {
      label: "Active earners",
      raw: stats?.uniqueEarners ?? null,
      display: formatNumber(Math.round(earners)),
    },
    {
      label: "Happy users",
      raw: stats?.happyUsers ?? null,
      display: formatNumber(Math.round(happy)),
    },
  ];

  return (
    <section aria-labelledby="home-stats-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="home-stats-heading" className="sr-only">
          Live Vektra stats
        </h2>
        <LiveIndicator
          status={error ? "error" : stats ? "live" : "loading"}
          updatedAt={updatedAt}
        />
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-emerald-700"
          aria-label="Refresh stats"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => {
          const isLoading = item.raw == null && !error;
          const isUnavailable = item.raw == null && error != null;
          return (
            <div
              key={item.label}
              className={`animate-fade-in-up ${DELAYS[i]} group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-600/5`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="text-3xl font-bold tracking-tight tabular-nums text-zinc-900">
                {isLoading ? (
                  <span className="inline-block h-9 w-24 animate-pulse rounded-md bg-zinc-100" />
                ) : isUnavailable ? (
                  <span className="text-zinc-300">—</span>
                ) : (
                  item.display
                )}
              </div>
              <div className="mt-1 text-sm text-zinc-500">{item.label}</div>
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="mt-3 text-xs text-zinc-500">
          Live stats are temporarily unavailable. {error}
        </p>
      ) : null}
    </section>
  );
}

/* ---------- helpers ---------- */

function computeStats(
  rows: TaskCompletionResponse[],
  users: AdminUserListItem[]
): Stats {
  const earners = new Set<number>();
  let total = 0;
  for (const r of rows) {
    if (typeof r.userId === "number") earners.add(r.userId);
    if (typeof r.rewardAmount === "number") total += r.rewardAmount;
  }
  const happyUsers = users.reduce(
    (acc, u) => (u.accountState === "ACTIVE" ? acc + 1 : acc),
    0
  );
  return {
    tasksCompleted: rows.length,
    vektrasEarned: total,
    uniqueEarners: earners.size,
    happyUsers,
  };
}

function formatNumber(n: number): string {
  if (n < 1000) return new Intl.NumberFormat("en-US").format(n);
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function formatRelative(date: Date | null): string {
  if (!date) return "Loading…";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const valueRef = useRef(0);

  useEffect(() => {
    const from = valueRef.current;
    const to = target;
    if (from === to) return;

    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (to - from) * eased;
      valueRef.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function LiveIndicator({
  status,
  updatedAt,
}: {
  status: "live" | "loading" | "error";
  updatedAt: Date | null;
}) {
  const dotColor =
    status === "error"
      ? "bg-zinc-400"
      : status === "loading"
      ? "bg-amber-400"
      : "bg-emerald-500";
  const ringColor =
    status === "live" ? "bg-emerald-400 animate-ping" : "bg-transparent";
  const label =
    status === "error"
      ? "Stats unavailable"
      : status === "loading"
      ? "Loading…"
      : `Live · updated ${formatRelative(updatedAt)}`;

  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500">
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${ringColor}`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`}
        />
      </span>
      {label}
    </span>
  );
}
