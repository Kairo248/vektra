"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminApproveCompletion,
  adminListTaskCompletions,
  adminRejectCompletion,
} from "@/services/api";
import type {
  TaskCompletionResponse,
  TaskCompletionStatus,
} from "@/types/vektra";
import { StatusBanner } from "@/components/StatusBanner";
import { StatCard } from "@/components/admin/StatCard";

type Tab = TaskCompletionStatus;

const TABS: { id: Tab; label: string }[] = [
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
];

export default function AdminCompletionsPage() {
  const [pending, setPending] = useState<TaskCompletionResponse[]>([]);
  const [approved, setApproved] = useState<TaskCompletionResponse[]>([]);
  const [rejected, setRejected] = useState<TaskCompletionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    kind: "success" | "error";
  } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("PENDING");
  const [search, setSearch] = useState("");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [p, a, r] = await Promise.allSettled([
      adminListTaskCompletions("PENDING"),
      adminListTaskCompletions("APPROVED"),
      adminListTaskCompletions("REJECTED"),
    ]);
    let firstError: string | null = null;
    if (p.status === "fulfilled") setPending(p.value);
    else firstError = firstError ?? reason(p);
    if (a.status === "fulfilled") setApproved(a.value);
    else firstError = firstError ?? reason(a);
    if (r.status === "fulfilled") setRejected(r.value);
    else firstError = firstError ?? reason(r);
    if (firstError) setError(firstError);
    setUpdatedAt(Date.now());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  function startConfirmReject(id: number) {
    setConfirmRejectId(id);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    confirmTimeoutRef.current = setTimeout(() => {
      setConfirmRejectId((cur) => (cur === id ? null : cur));
    }, 6000);
  }

  function cancelConfirmReject() {
    setConfirmRejectId(null);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
  }

  async function approve(id: number) {
    setBusyId(id);
    setFeedback(null);
    try {
      await adminApproveCompletion(id);
      setFeedback({
        text: "Approved — reward applied for eligible tasks.",
        kind: "success",
      });
      await load();
    } catch (e) {
      setFeedback({
        text: e instanceof Error ? e.message : "Approve failed",
        kind: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: number) {
    setBusyId(id);
    setFeedback(null);
    try {
      await adminRejectCompletion(id);
      setFeedback({ text: "Completion rejected.", kind: "success" });
      cancelConfirmReject();
      await load();
    } catch (e) {
      setFeedback({
        text: e instanceof Error ? e.message : "Reject failed",
        kind: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  const counts: Record<Tab, number> = {
    PENDING: pending.length,
    APPROVED: approved.length,
    REJECTED: rejected.length,
  };

  const pendingReward = useMemo(
    () =>
      pending.reduce((s, r) => s + (Number(r.rewardAmount) || 0), 0),
    [pending]
  );

  const tabRows =
    tab === "PENDING" ? pending : tab === "APPROVED" ? approved : rejected;

  const sortedTabRows = useMemo(() => {
    const ts = (r: TaskCompletionResponse) =>
      tab === "PENDING"
        ? new Date(r.completedAt).getTime()
        : new Date(r.updatedAt).getTime();
    return [...tabRows].sort((a, b) => ts(b) - ts(a));
  }, [tabRows, tab]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedTabRows;
    return sortedTabRows.filter((r) =>
      `${r.taskName} ${r.taskDescription} user ${r.userId} ${r.id}`
        .toLowerCase()
        .includes(q)
    );
  }, [sortedTabRows, search]);

  const initialLoading = loading && updatedAt == null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Reviews
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
            Task completions
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Review manual submissions, approve to release rewards, or reject
            invalid attempts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {updatedAt == null
              ? "Loading…"
              : `Updated ${formatTimeAgo(updatedAt)}`}
          </span>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshIcon
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <StatusBanner variant={feedback.kind === "error" ? "error" : "success"}>
          {feedback.text}
        </StatusBanner>
      )}
      {error && <StatusBanner variant="error">{error}</StatusBanner>}

      {/* KPI strip */}
      <section
        aria-label="Review metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Pending"
          value={initialLoading ? null : counts.PENDING}
          tone="amber"
          loading={initialLoading}
          hint={
            initialLoading
              ? undefined
              : counts.PENDING === 0
                ? "All caught up"
                : "Awaiting review"
          }
          icon={<ClockIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Approved"
          value={initialLoading ? null : counts.APPROVED}
          tone="emerald"
          loading={initialLoading}
          hint={initialLoading ? undefined : "Rewards released"}
          icon={<CheckCircleIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Rejected"
          value={initialLoading ? null : counts.REJECTED}
          tone="rose"
          loading={initialLoading}
          hint={initialLoading ? undefined : "Marked invalid"}
          icon={<XCircleIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Reward at stake"
          value={initialLoading ? null : pendingReward}
          tone="violet"
          loading={initialLoading}
          hint={
            initialLoading
              ? undefined
              : counts.PENDING === 0
                ? "No pending rewards"
                : "Sum of pending rewards"
          }
          icon={<CoinIcon className="h-5 w-5" />}
        />
      </section>

      {/* Toolbar: tabs + search */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  cancelConfirmReject();
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? activeTabClass(t.id)
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {t.label}
                <span
                  className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {counts[t.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-400">
            <SearchIcon className="h-4 w-4" />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by task or user"
            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-8 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400 hover:text-zinc-700"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                <th className="px-5 py-3">Task</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Reward</th>
                <th className="px-5 py-3">Submitted</th>
                <th className="px-5 py-3 text-right">
                  {tab === "PENDING" ? "Actions" : "Status"}
                </th>
              </tr>
            </thead>
            <tbody>
              {initialLoading ? (
                <SkeletonRows />
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      tab={tab}
                      hasAny={tabRows.length > 0}
                      onClear={() => setSearch("")}
                    />
                  </td>
                </tr>
              ) : (
                visible.map((r) => {
                  const isBusy = busyId === r.id;
                  const isConfirming = confirmRejectId === r.id;
                  const submittedAbs = formatDateTime(r.completedAt);
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-zinc-100 transition-colors last:border-b-0 ${
                        tab === "PENDING"
                          ? "bg-amber-50/30 hover:bg-amber-50/60"
                          : "hover:bg-zinc-50"
                      }`}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-zinc-900">
                          {r.taskName}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">
                          {r.taskDescription}
                        </p>
                        <p className="mt-1 text-[11px] font-mono text-zinc-400">
                          completion #{r.id} · task #{r.taskId}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar userId={r.userId} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-900">
                              User #{r.userId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100 tabular-nums">
                          <CoinIcon className="h-3 w-3" />+
                          {r.rewardAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          title={submittedAbs}
                          className="text-xs text-zinc-700"
                        >
                          {formatTimeAgo(new Date(r.completedAt).getTime())}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-zinc-400">
                          {submittedAbs}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {tab === "PENDING" ? (
                          isConfirming ? (
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <span className="text-xs font-medium text-rose-700">
                                Reject this submission?
                              </span>
                              <button
                                type="button"
                                onClick={() => reject(r.id)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
                              >
                                {isBusy ? (
                                  <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <XCircleIcon className="h-3.5 w-3.5" />
                                )}
                                Yes, reject
                              </button>
                              <button
                                type="button"
                                onClick={cancelConfirmReject}
                                disabled={isBusy}
                                className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => approve(r.id)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60"
                              >
                                {isBusy ? (
                                  <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircleIcon className="h-3.5 w-3.5" />
                                )}
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => startConfirmReject(r.id)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:border-rose-200 hover:bg-rose-50 disabled:opacity-60"
                              >
                                <XCircleIcon className="h-3.5 w-3.5" />
                                Reject
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            <CompletionStatusBadge status={r.status} />
                            <span
                              title={formatDateTime(r.updatedAt)}
                              className="text-[11px] text-zinc-400"
                            >
                              Reviewed{" "}
                              {formatTimeAgo(
                                new Date(r.updatedAt).getTime()
                              )}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50/50 px-5 py-2.5 text-xs text-zinc-500">
          <span>
            Showing{" "}
            <span className="font-semibold tabular-nums text-zinc-700">
              {visible.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold tabular-nums text-zinc-700">
              {tabRows.length}
            </span>{" "}
            {tab.toLowerCase()} completions
          </span>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="font-medium text-emerald-700 hover:text-emerald-800"
            >
              Clear search
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* --- helpers --- */

function reason<T>(p: PromiseSettledResult<T>): string {
  if (p.status === "fulfilled") return "";
  return p.reason instanceof Error ? p.reason.message : "Failed to load";
}

function activeTabClass(tab: Tab): string {
  switch (tab) {
    case "PENDING":
      return "bg-amber-600 text-white shadow-sm";
    case "APPROVED":
      return "bg-emerald-700 text-white shadow-sm";
    case "REJECTED":
      return "bg-rose-600 text-white shadow-sm";
  }
}

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

const AVATAR_PALETTE = [
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
];

function UserAvatar({ userId }: { userId: number }) {
  const palette = AVATAR_PALETTE[userId % AVATAR_PALETTE.length];
  return (
    <span
      aria-hidden
      className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-full ring-1 ring-inset ring-black/5 ${palette}`}
    >
      <UserIcon className="h-4 w-4" />
    </span>
  );
}

function CompletionStatusBadge({
  status,
}: {
  status: TaskCompletionStatus;
}) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-100">
        <CheckCircleIcon className="h-3 w-3" />
        Approved
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800 ring-1 ring-inset ring-rose-100">
        <XCircleIcon className="h-3 w-3" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-100">
      <ClockIcon className="h-3 w-3" />
      Pending
    </span>
  );
}

/* --- empty + skeleton --- */

function EmptyState({
  tab,
  hasAny,
  onClear,
}: {
  tab: Tab;
  hasAny: boolean;
  onClear: () => void;
}) {
  if (hasAny) {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200">
          <SearchIcon className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-medium text-zinc-900">
          No matches for your search
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Try a different keyword or clear the search.
        </p>
        <button
          type="button"
          onClick={onClear}
          className="mt-3 text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          Clear search
        </button>
      </div>
    );
  }

  if (tab === "PENDING") {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <CheckCircleIcon className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-medium text-zinc-900">All caught up</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          No pending submissions to review right now.
        </p>
      </div>
    );
  }

  if (tab === "APPROVED") {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200">
          <CheckCircleIcon className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-medium text-zinc-900">
          No approved completions yet
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Approved submissions will appear here as audit history.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200">
        <XCircleIcon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-zinc-900">
        No rejected completions
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Rejected submissions will appear here for reference.
      </p>
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <tr key={i} className="border-b border-zinc-100 last:border-b-0">
          <td className="px-5 py-3">
            <div className="space-y-1.5">
              <div className="h-3.5 w-44 animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-64 animate-pulse rounded bg-zinc-100" />
              <div className="h-2.5 w-32 animate-pulse rounded bg-zinc-100" />
            </div>
          </td>
          <td className="px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-100" />
              <div className="h-3.5 w-20 animate-pulse rounded bg-zinc-100" />
            </div>
          </td>
          <td className="px-5 py-3">
            <div className="h-5 w-14 animate-pulse rounded-full bg-zinc-100" />
          </td>
          <td className="px-5 py-3">
            <div className="space-y-1">
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-100" />
              <div className="h-2.5 w-20 animate-pulse rounded bg-zinc-100" />
            </div>
          </td>
          <td className="px-5 py-3">
            <div className="flex justify-end gap-2">
              <div className="h-7 w-20 animate-pulse rounded-md bg-zinc-100" />
              <div className="h-7 w-16 animate-pulse rounded-md bg-zinc-100" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

/* --- icons --- */

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

function SearchIcon({ className = "" }: { className?: string }) {
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
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function XIcon({ className = "" }: { className?: string }) {
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
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
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

function XCircleIcon({ className = "" }: { className?: string }) {
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
      <path d="M9 9l6 6" />
      <path d="M15 9l-6 6" />
    </svg>
  );
}

function CoinIcon({ className = "" }: { className?: string }) {
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
      <path d="M12 7v10" />
      <path d="M9.5 9.5h4a2 2 0 1 1 0 4h-3a2 2 0 1 0 0 4h4" />
    </svg>
  );
}

function UserIcon({ className = "" }: { className?: string }) {
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
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SpinnerIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
