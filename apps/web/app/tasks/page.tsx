"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  completeTask,
  getAccountForUser,
  getTasks,
  getWalletBalance,
} from "@/services/api";
import { getStoredUserId } from "@/lib/session";
import type {
  AccountResponse,
  EarnType,
  TaskResponse,
} from "@/types/vektra";

type EarnFilter = "ALL" | EarnType;
type SortKey = "default" | "reward-desc" | "reward-asc" | "newest";

type Toast = {
  id: number;
  variant: "success" | "info" | "error";
  message: string;
};

export default function TasksPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [query, setQuery] = useState("");
  const [earnFilter, setEarnFilter] = useState<EarnFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("default");

  const canComplete = account?.accountState === "ACTIVE";

  useEffect(() => {
    setUserId(getStoredUserId());
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;
    if (!userId) {
      setLoading(false);
      setError("No user in session. Sign up first.");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [list, acc, wallet] = await Promise.all([
          getTasks(),
          getAccountForUser(userId),
          getWalletBalance(userId).catch(() => null),
        ]);
        if (cancelled) return;
        setTasks(list);
        setAccount(acc);
        if (wallet) setBalance(wallet.balance);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load tasks");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, sessionChecked]);

  async function refreshBalance() {
    if (!userId) return;
    try {
      const wallet = await getWalletBalance(userId);
      setBalance(wallet.balance);
    } catch {
      /* keep previous balance silently */
    }
  }

  async function onComplete(task: TaskResponse) {
    if (!userId || !canComplete) return;
    setActionId(task.id);
    try {
      const res = await completeTask(userId, task.id);
      if (res.status === "APPROVED") {
        pushToast(
          {
            variant: "success",
            message: `+ ₵${task.rewardAmount} credited for "${task.name}".`,
          },
          setToast
        );
        void refreshBalance();
      } else {
        pushToast(
          {
            variant: "info",
            message: `"${task.name}" submitted — waiting for approval.`,
          },
          setToast
        );
      }
    } catch (e) {
      pushToast(
        {
          variant: "error",
          message: e instanceof Error ? e.message : "Could not complete task",
        },
        setToast
      );
    } finally {
      setActionId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tasks.filter((t) => {
      if (earnFilter !== "ALL" && t.earnType !== earnFilter) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
    if (sortKey === "reward-desc") {
      list = [...list].sort((a, b) => b.rewardAmount - a.rewardAmount);
    } else if (sortKey === "reward-asc") {
      list = [...list].sort((a, b) => a.rewardAmount - b.rewardAmount);
    } else if (sortKey === "newest") {
      list = [...list].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
      );
    }
    return list;
  }, [tasks, query, earnFilter, sortKey]);

  const totalPotential = useMemo(
    () => tasks.reduce((sum, t) => sum + (t.rewardAmount ?? 0), 0),
    [tasks]
  );

  /* ---------- Render ---------- */

  if (sessionChecked && !userId) {
    return <UnauthenticatedView />;
  }

  return (
    <div className="space-y-8">
      <Header
        balance={balance}
        taskCount={tasks.length}
        totalPotential={totalPotential}
        loading={loading}
      />

      {error ? (
        <Banner variant="error">{error}</Banner>
      ) : !loading && account && !canComplete ? (
        <Banner variant="info">
          Your account is <strong>{account.accountState}</strong>. Tasks unlock
          once it&apos;s <strong>ACTIVE</strong>.
        </Banner>
      ) : null}

      <Toolbar
        query={query}
        onQueryChange={setQuery}
        earnFilter={earnFilter}
        onEarnFilterChange={setEarnFilter}
        sortKey={sortKey}
        onSortChange={setSortKey}
        counts={{
          all: tasks.length,
          automatic: tasks.filter((t) => t.earnType === "AUTOMATIC").length,
          manual: tasks.filter((t) => t.earnType === "MANUAL").length,
        }}
      />

      {loading ? (
        <TaskGridSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          hasTasks={tasks.length > 0}
          onClear={() => {
            setQuery("");
            setEarnFilter("ALL");
          }}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {filtered.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              index={i}
              busy={actionId === task.id}
              disabled={!canComplete}
              onComplete={onComplete}
            />
          ))}
        </ul>
      )}

      <ToastView toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

/* ---------------------- HEADER ---------------------- */

function Header({
  balance,
  taskCount,
  totalPotential,
  loading,
}: {
  balance: number | null;
  taskCount: number;
  totalPotential: number;
  loading: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-emerald-100/70 bg-white p-6 shadow-sm sm:p-8">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl animate-blob"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-teal-200/40 blur-3xl animate-blob delay-300"
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <SparkleIcon className="h-3 w-3" />
            Earn now
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Pick a task,{" "}
            <span className="text-gradient-emerald">earn Vektras</span>.
          </h1>
          <p className="max-w-xl text-sm text-zinc-600 sm:text-base">
            Browse what&apos;s live, finish, and watch your wallet grow. Some
            tasks pay out instantly, others go through quick review.
          </p>
        </div>

        <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:w-auto">
          <Link
            href="/wallet"
            className="group relative overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-600/10"
          >
            <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-700/80">
              Your balance
            </div>
            <div className="mt-1 flex items-baseline gap-1 text-2xl font-bold tracking-tight text-zinc-900 tabular-nums">
              {loading || balance == null ? (
                <span className="inline-block h-7 w-20 animate-pulse rounded bg-zinc-100" />
              ) : (
                <>
                  <span className="text-emerald-700">₵</span>
                  <CountUp value={balance} />
                </>
              )}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700/80 group-hover:text-emerald-700">
              Open wallet
              <span className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </Link>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Available
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 tabular-nums">
              {loading ? (
                <span className="inline-block h-7 w-12 animate-pulse rounded bg-zinc-100" />
              ) : (
                taskCount
              )}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              up to{" "}
              <span className="font-semibold text-emerald-700">
                ₵{loading ? "—" : totalPotential.toLocaleString("en-US")}
              </span>{" "}
              in rewards
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------- TOOLBAR ---------------------- */

function Toolbar({
  query,
  onQueryChange,
  earnFilter,
  onEarnFilterChange,
  sortKey,
  onSortChange,
  counts,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  earnFilter: EarnFilter;
  onEarnFilterChange: (v: EarnFilter) => void;
  sortKey: SortKey;
  onSortChange: (v: SortKey) => void;
  counts: { all: number; automatic: number; manual: number };
}) {
  const chips: { value: EarnFilter; label: string; count: number }[] = [
    { value: "ALL", label: "All", count: counts.all },
    { value: "AUTOMATIC", label: "Instant", count: counts.automatic },
    { value: "MANUAL", label: "Review", count: counts.manual },
  ];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* Search */}
      <div className="relative w-full lg:max-w-sm">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search tasks…"
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Clear search"
          >
            <XIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Filter chips + Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
          {chips.map((c) => {
            const active = earnFilter === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onEarnFilterChange(c.value)}
                className={`group inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {c.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] font-bold ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200"
                  }`}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <select
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="appearance-none rounded-xl border border-zinc-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-zinc-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            aria-label="Sort tasks"
          >
            <option value="default">Sort: Featured</option>
            <option value="reward-desc">Highest reward</option>
            <option value="reward-asc">Lowest reward</option>
            <option value="newest">Newest</option>
          </select>
          <ChevronDownIcon
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------------- TASK CARD ---------------------- */

function TaskCard({
  task,
  index,
  busy,
  disabled,
  onComplete,
}: {
  task: TaskResponse;
  index: number;
  busy: boolean;
  disabled: boolean;
  onComplete: (t: TaskResponse) => void;
}) {
  const isAuto = task.earnType === "AUTOMATIC";
  const ageDays = daysSince(task.createdAt);
  const isNew = ageDays != null && ageDays <= 3;

  return (
    <li
      className="group animate-fade-in-up relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-600/5"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-100/0 blur-2xl transition-all duration-500 group-hover:bg-emerald-200/40"
        aria-hidden
      />

      <div className="relative flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-transform duration-500 group-hover:rotate-3 group-hover:scale-110 ${
            isAuto
              ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30"
              : "bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sky-500/30"
          }`}
        >
          {isAuto ? (
            <BoltIcon className="h-6 w-6" />
          ) : (
            <HandIcon className="h-6 w-6" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-zinc-900">
              {task.name}
            </h2>
            {isNew ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                New
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-600">
            {task.description}
          </p>
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-dashed border-zinc-200 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
            <span className="text-emerald-600">₵</span>
            {task.rewardAmount.toLocaleString("en-US")}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
              isAuto
                ? "bg-amber-50 text-amber-800 ring-1 ring-amber-100"
                : "bg-sky-50 text-sky-800 ring-1 ring-sky-100"
            }`}
          >
            {isAuto ? "Instant payout" : "Manual review"}
          </span>
        </div>

        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => onComplete(task)}
          className="group/btn relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg bg-gradient-to-r from-emerald-700 to-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-600/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md"
        >
          <span
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"
            aria-hidden
          />
          {busy ? (
            <>
              <SpinnerIcon className="h-3.5 w-3.5 animate-spin-slow" />
              Working…
            </>
          ) : (
            <>
              Complete
              <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
            </>
          )}
        </button>
      </div>
    </li>
  );
}

/* ---------------------- SKELETON ---------------------- */

function TaskGridSkeleton() {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="animate-fade-in-up rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-zinc-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-100" />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-dashed border-zinc-200 pt-4">
            <div className="h-7 w-24 animate-pulse rounded-lg bg-zinc-100" />
            <div className="h-8 w-24 animate-pulse rounded-lg bg-zinc-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------- EMPTY STATE ---------------------- */

function EmptyState({
  hasTasks,
  onClear,
}: {
  hasTasks: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
        <SearchIcon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-zinc-900">
        {hasTasks ? "No tasks match your filters" : "No active tasks right now"}
      </h3>
      <p className="max-w-sm text-sm text-zinc-500">
        {hasTasks
          ? "Try clearing your search or switching the filter — there are tasks waiting."
          : "Check back soon — fresh tasks land here regularly."}
      </p>
      {hasTasks ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

/* ---------------------- UNAUTHENTICATED ---------------------- */

function UnauthenticatedView() {
  return (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <LockIcon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-zinc-900">Sign up to see tasks</h2>
        <p className="mx-auto max-w-sm text-sm text-zinc-600">
          Create your free Vektra account in seconds — then start earning from
          the tasks waiting on the other side.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/signup"
          className="rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}

/* ---------------------- BANNER ---------------------- */

function Banner({
  variant,
  children,
}: {
  variant: "info" | "success" | "error";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-900",
  } as const;
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${styles[variant]}`}
    >
      <span className="mt-0.5">
        {variant === "error" ? (
          <AlertIcon className="h-4 w-4" />
        ) : variant === "success" ? (
          <CheckIcon className="h-4 w-4" />
        ) : (
          <InfoIcon className="h-4 w-4" />
        )}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* ---------------------- TOAST ---------------------- */

function pushToast(t: Omit<Toast, "id">, setToast: (t: Toast) => void) {
  setToast({ ...t, id: Date.now() });
}

function ToastView({
  toast,
  onClose,
}: {
  toast: Toast | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onClose, 4000);
    return () => clearTimeout(id);
  }, [toast, onClose]);

  if (!toast) return null;

  const palette =
    toast.variant === "success"
      ? "border-emerald-200 bg-white text-emerald-900"
      : toast.variant === "error"
      ? "border-red-200 bg-white text-red-900"
      : "border-sky-200 bg-white text-sky-900";

  const icon =
    toast.variant === "success" ? (
      <CheckIcon className="h-4 w-4 text-emerald-600" />
    ) : toast.variant === "error" ? (
      <AlertIcon className="h-4 w-4 text-red-600" />
    ) : (
      <InfoIcon className="h-4 w-4 text-sky-600" />
    );

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:bottom-6 sm:right-6 sm:justify-end"
    >
      <div
        className={`animate-fade-in-up pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-xl ${palette}`}
      >
        <span className="mt-0.5">{icon}</span>
        <div className="flex-1 text-sm font-medium">{toast.message}</div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          aria-label="Dismiss"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------------------- COUNT-UP ---------------------- */

function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const ref = useRef(value);

  useEffect(() => {
    const from = ref.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (to - from) * eased;
      ref.current = v;
      setDisplay(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{Math.round(display).toLocaleString("en-US")}</>;
}

/* ---------------------- HELPERS ---------------------- */

function daysSince(iso: string): number | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

/* ---------------------- ICONS ---------------------- */

function BoltIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function HandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M18 11V6a2 2 0 0 0-4 0v5" />
      <path d="M14 10V4a2 2 0 0 0-4 0v6" />
      <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.7-2.7L.6 13.5c-.4-.7-.3-1.5.4-2 .8-.6 1.9-.4 2.5.4L5 13" />
    </svg>
  );
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path
        fillRule="evenodd"
        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SpinnerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 1-9 9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path
        fillRule="evenodd"
        d="M16.704 5.296a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 111.414-1.414l2.793 2.793 6.793-6.793a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function AlertIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SparkleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path d="M10 2 11.5 7.5 17 9l-5.5 1.5L10 16l-1.5-5.5L3 9l5.5-1.5z" />
    </svg>
  );
}
