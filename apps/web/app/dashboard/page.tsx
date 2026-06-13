"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  getAccountForUser,
  getTasks,
  getTransactions,
  getUser,
  getWalletBalance,
} from "@/services/api";
import { getStoredUserId } from "@/lib/session";
import type {
  AccountResponse,
  TaskResponse,
  TransactionResponse,
  TransactionType,
  UserResponse,
} from "@/types/vektra";
import { StatusBanner } from "@/components/StatusBanner";

/** Inflows: EARN (task reward) and TRANSFER_IN (received from another user).
 *  Mirrors the same convention used on the wallet page so the two views agree. */
const CREDIT_TYPES: ReadonlySet<TransactionType> = new Set<TransactionType>([
  "EARN",
  "TRANSFER_IN",
]);

function isCredit(t: TransactionResponse): boolean {
  return CREDIT_TYPES.has(t.type);
}

type DashboardData = {
  user: UserResponse;
  account: AccountResponse;
  balance: number;
  transactions: TransactionResponse[];
  tasks: TaskResponse[];
};

export default function DashboardPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUserId(getStoredUserId());
    setSessionChecked(true);
  }, []);

  const load = useCallback(
    async (id: number, opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const [user, account, wallet, transactions, tasks] = await Promise.all([
          getUser(id),
          getAccountForUser(id),
          getWalletBalance(id).catch(() => ({ userId: id, balance: 0 })),
          getTransactions(id).catch(() => [] as TransactionResponse[]),
          getTasks().catch(() => [] as TaskResponse[]),
        ]);
        setData({
          user,
          account,
          balance: wallet.balance ?? 0,
          transactions,
          tasks,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!sessionChecked) return;
    if (!userId) {
      setLoading(false);
      return;
    }
    void load(userId);
  }, [userId, sessionChecked, load]);

  if (sessionChecked && !userId) {
    return <NoSessionState />;
  }

  if (loading || !sessionChecked) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <StatusBanner variant="error">
          {error ?? "Missing user data."}
        </StatusBanner>
        <div className="flex flex-wrap gap-3">
          {userId ? (
            <button
              type="button"
              onClick={() => void load(userId)}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
            >
              Try again
            </button>
          ) : null}
          <Link
            href="/signup"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Go to signup
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DashboardView
      data={data}
      refreshing={refreshing}
      onRefresh={() => userId && void load(userId, { silent: true })}
    />
  );
}

/* ---------------------------------------------------------------- */
/* Main view                                                        */
/* ---------------------------------------------------------------- */

function DashboardView({
  data,
  refreshing,
  onRefresh,
}: {
  data: DashboardData;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { user, account, balance, transactions, tasks } = data;

  const pending = account.accountState === "PENDING";
  const suspended = account.accountState === "SUSPENDED";

  const stats = useMemo(() => {
    const earnedTotal = transactions
      .filter((t) => t.type === "EARN" && t.status === "COMPLETED")
      .reduce((acc, t) => acc + (t.amount ?? 0), 0);
    const completedCount = transactions.filter(
      (t) => t.type === "EARN" && t.taskCompletionId != null
    ).length;
    const pendingCount = transactions.filter((t) => t.status === "PENDING").length;
    return { earnedTotal, completedCount, pendingCount };
  }, [transactions]);

  const recentTx = useMemo(
    () =>
      [...transactions]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5),
    [transactions]
  );

  const recommended = useMemo(
    () =>
      tasks
        .filter((t) => t.status === "ACTIVE")
        .sort((a, b) => b.rewardAmount - a.rewardAmount)
        .slice(0, 3),
    [tasks]
  );

  const balanceAnim = useCountUp(balance);
  const earnedAnim = useCountUp(stats.earnedTotal);
  const completedAnim = useCountUp(stats.completedCount);

  const greeting = useGreeting();

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* ---------- HERO ---------- */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-emerald-100/70 bg-white px-5 py-8 shadow-sm sm:rounded-3xl sm:px-10 sm:py-12">
        <div
          className="pointer-events-none absolute inset-0 bg-grid mask-radial-fade"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-300/40 blur-3xl animate-blob"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-[-6rem] h-64 w-64 rounded-full bg-teal-300/40 blur-3xl animate-blob delay-300"
          aria-hidden
        />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm backdrop-blur">
              <AccountDot state={account.accountState} />
              {greeting}, {user.name}
            </div>
            <h1 className="animate-fade-in-up delay-100 text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
              Welcome back to your{" "}
              <span className="text-gradient-emerald">dashboard</span>
            </h1>
            <p className="animate-fade-in-up delay-200 max-w-xl text-sm text-zinc-600 sm:text-base">
              Here&apos;s a quick snapshot of your account, your latest earnings,
              and tasks waiting to bring you more Vektras.
            </p>

            <div className="animate-fade-in-up delay-300 flex flex-wrap items-center gap-2 pt-1">
              <Link
                href="/tasks"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-600/30"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                Browse tasks
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/wallet"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-800"
              >
                View wallet
              </Link>
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-emerald-700 disabled:opacity-50"
              >
                <RefreshIcon
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin-slow" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Hero balance card */}
          <div className="animate-fade-in delay-300 relative w-full max-w-xs shrink-0">
            <div className="pointer-events-none absolute inset-0 mx-auto h-44 w-44 translate-y-2 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="relative rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-2xl shadow-emerald-900/10 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Wallet balance
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight tabular-nums text-zinc-900">
                  ₵ {formatNumber(Math.round(balanceAnim))}
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 bg-[length:200%_100%] transition-[width] duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(8, balance > 0 ? 50 + Math.log10(Math.max(balance, 1)) * 15 : 8))}%`,
                    animation: "shimmer 2.5s linear infinite",
                  }}
                />
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                {stats.completedCount > 0
                  ? `From ${stats.completedCount} completed task${stats.completedCount === 1 ? "" : "s"}.`
                  : "Complete your first task to start earning."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- ACCOUNT NOTICES ---------- */}
      {pending ? (
        <div className="animate-fade-in-up">
          <StatusBanner variant="info">
            Your account is <strong>PENDING</strong>. Task completion is disabled
            until an admin activates your account.
          </StatusBanner>
        </div>
      ) : null}
      {suspended ? (
        <div className="animate-fade-in-up">
          <StatusBanner variant="error">
            Your account is <strong>SUSPENDED</strong>. Please contact support to
            restore access.
          </StatusBanner>
        </div>
      ) : null}

      {/* ---------- STATS ---------- */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          delay="delay-100"
          label="Wallet balance"
          value={`₵ ${formatNumber(Math.round(balanceAnim))}`}
          hint="Available Vektras"
          icon={<WalletIcon className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          delay="delay-200"
          label="Total earned"
          value={`₵ ${formatNumber(Math.round(earnedAnim))}`}
          hint="All-time rewards"
          icon={<CoinIcon className="h-5 w-5" />}
          accent="teal"
        />
        <StatCard
          delay="delay-300"
          label="Tasks completed"
          value={formatNumber(Math.round(completedAnim))}
          hint="Approved completions"
          icon={<CheckIcon className="h-5 w-5" />}
          accent="lime"
        />
        <StatCard
          delay="delay-400"
          label="Account state"
          value={account.accountState}
          hint={user.userType === "ADMIN" ? "Admin account" : "Member account"}
          icon={<ShieldIcon className="h-5 w-5" />}
          accent={
            account.accountState === "ACTIVE"
              ? "emerald"
              : account.accountState === "PENDING"
                ? "amber"
                : "zinc"
          }
        />
      </section>

      {/* ---------- CONTENT GRID ---------- */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="animate-fade-in-up lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Recent activity
                </h2>
                <p className="text-xs text-zinc-500">
                  Your latest wallet transactions.
                </p>
              </div>
              <Link
                href="/wallet"
                className="group inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
              >
                View all
                <span className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </div>

            {recentTx.length === 0 ? (
              <EmptyActivity />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {recentTx.map((tx, i) => {
                  const credit = isCredit(tx);
                  const amount = Math.abs(tx.amount);
                  const isTransfer =
                    tx.type === "TRANSFER_IN" || tx.type === "TRANSFER_OUT";
                  // Mirrors the wallet row: prefer a real name; fall back to
                  // "user #N" only when the backend couldn't resolve it.
                  const counterpartyFullName = isTransfer
                    ? [tx.counterpartyName, tx.counterpartySurname]
                        .filter((p): p is string => Boolean(p && p.trim()))
                        .join(" ")
                        .trim() || null
                    : null;
                  let label: string;
                  if (tx.type === "TRANSFER_IN") {
                    label = `Received from ${
                      counterpartyFullName ??
                      `user #${tx.counterpartyUserId ?? "?"}`
                    }`;
                  } else if (tx.type === "TRANSFER_OUT") {
                    label = `Sent to ${
                      counterpartyFullName ??
                      `user #${tx.counterpartyUserId ?? "?"}`
                    }`;
                  } else if (tx.type === "EARN") {
                    label = "Reward received";
                  } else {
                    label = "Spent";
                  }
                  return (
                    <li
                      key={tx.id}
                      className={`animate-fade-in-up flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-zinc-50/70`}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            credit
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                              : "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                          }`}
                        >
                          {credit ? (
                            <ArrowDownIcon className="h-4 w-4" />
                          ) : (
                            <ArrowUpIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {label}
                            {tx.taskCompletionId ? (
                              <span className="ml-1 text-xs font-normal text-zinc-500">
                                · completion #{tx.taskCompletionId}
                              </span>
                            ) : null}
                          </p>
                          {isTransfer &&
                          counterpartyFullName &&
                          tx.counterpartyUserId != null ? (
                            <p className="truncate text-xs font-medium text-zinc-600">
                              #{tx.counterpartyUserId}
                            </p>
                          ) : null}
                          <p className="truncate text-xs text-zinc-500">
                            {formatRelative(new Date(tx.createdAt))} ·{" "}
                            <StatusPill status={tx.status} />
                          </p>
                        </div>
                      </div>
                      <div
                        className={`shrink-0 text-sm font-semibold tabular-nums ${
                          credit ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {credit ? "+" : "−"} ₵{amount}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Side column: profile + recommended */}
        <div className="space-y-6">
          <div className="animate-fade-in-up delay-100 group relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/60 p-5 shadow-sm">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-100/40 blur-2xl transition-all duration-500 group-hover:bg-emerald-200/60" />
            <div className="relative flex items-center gap-4">
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-pulse-ring" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white shadow-md shadow-emerald-600/30 ring-4 ring-white">
                  {initials(user.name, user.surname)}
                </div>
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-zinc-900">
                  {user.name} {user.surname}
                </p>
                <p className="truncate text-xs text-zinc-500">{account.email}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Field label="User ID" value={`#${user.id}`} />
              <Field label="Role" value={user.userType} />
              <Field label="Status" value={account.accountState} />
              <Field label="Joined" value={formatShortDate(user.createdAt)} />
            </dl>
          </div>

          <div className="animate-fade-in-up delay-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Earn next
                </h2>
                <p className="text-xs text-zinc-500">Top active tasks for you.</p>
              </div>
              <Link
                href="/tasks"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
              >
                See all →
              </Link>
            </div>
            {recommended.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-zinc-500">
                No active tasks right now. Check back soon!
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {recommended.map((task, i) => (
                  <li
                    key={task.id}
                    className="animate-fade-in-up flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-emerald-50/30"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {task.name}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {task.description}
                      </p>
                    </div>
                    <Link
                      href="/tasks"
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                    >
                      + ₵{task.rewardAmount}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Sub components                                                    */
/* ---------------------------------------------------------------- */

type Accent = "emerald" | "teal" | "lime" | "amber" | "zinc";

const ACCENTS: Record<
  Accent,
  { ring: string; icon: string; glow: string; bar: string }
> = {
  emerald: {
    ring: "ring-emerald-100",
    icon: "bg-emerald-50 text-emerald-700",
    glow: "group-hover:bg-emerald-200/60",
    bar: "from-transparent via-emerald-400/60 to-transparent",
  },
  teal: {
    ring: "ring-teal-100",
    icon: "bg-teal-50 text-teal-700",
    glow: "group-hover:bg-teal-200/60",
    bar: "from-transparent via-teal-400/60 to-transparent",
  },
  lime: {
    ring: "ring-lime-100",
    icon: "bg-lime-50 text-lime-700",
    glow: "group-hover:bg-lime-200/60",
    bar: "from-transparent via-lime-400/60 to-transparent",
  },
  amber: {
    ring: "ring-amber-100",
    icon: "bg-amber-50 text-amber-700",
    glow: "group-hover:bg-amber-200/60",
    bar: "from-transparent via-amber-400/60 to-transparent",
  },
  zinc: {
    ring: "ring-zinc-100",
    icon: "bg-zinc-100 text-zinc-700",
    glow: "group-hover:bg-zinc-200/60",
    bar: "from-transparent via-zinc-400/60 to-transparent",
  },
};

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
  delay,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  accent: Accent;
  delay: string;
}) {
  const a = ACCENTS[accent];
  return (
    <div
      className={`${delay} animate-fade-in-up group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-600/5`}
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-100/0 blur-2xl transition-all duration-500 ${a.glow}`}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${a.bar}`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-zinc-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{hint}</p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${a.icon} ${a.ring} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "COMPLETED"
      ? "bg-emerald-100 text-emerald-800"
      : status === "PENDING"
        ? "bg-amber-100 text-amber-900"
        : "bg-zinc-200 text-zinc-800";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {status}
    </span>
  );
}

function AccountDot({ state }: { state: AccountResponse["accountState"] }) {
  const color =
    state === "ACTIVE"
      ? "bg-emerald-500"
      : state === "PENDING"
        ? "bg-amber-500"
        : "bg-zinc-400";
  const ring =
    state === "ACTIVE" ? "bg-emerald-400 animate-ping" : "bg-transparent";
  return (
    <span className="relative flex h-2 w-2">
      <span
        className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${ring}`}
      />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 px-3 py-2 ring-1 ring-zinc-100">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-zinc-800">
        {value}
      </dd>
    </div>
  );
}

function EmptyActivity() {
  return (
    <div className="px-5 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <SparkleIcon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-medium text-zinc-800">
        No activity yet
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Complete your first task to see transactions appear here.
      </p>
      <Link
        href="/tasks"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
      >
        Find a task
        <ArrowRightIcon className="h-3 w-3" />
      </Link>
    </div>
  );
}

function NoSessionState() {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <ShieldIcon className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-900">
        You&apos;re not signed in
      </h2>
      <p className="text-sm text-zinc-600">
        Sign in or create an account to view your personal dashboard.
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        <Link
          href="/login"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading dashboard">
      <div className="h-44 animate-pulse rounded-2xl bg-zinc-100 sm:h-52" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-zinc-100"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-2xl bg-zinc-100 lg:col-span-2" />
        <div className="space-y-6">
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-100" />
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-100" />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Helpers                                                            */
/* ---------------------------------------------------------------- */

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

function useGreeting() {
  const [g, setG] = useState("Welcome");
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 5) setG("Good night");
    else if (h < 12) setG("Good morning");
    else if (h < 18) setG("Good afternoon");
    else setG("Good evening");
  }, []);
  return g;
}

function formatNumber(n: number): string {
  if (n < 1000) return new Intl.NumberFormat("en-US").format(n);
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function formatRelative(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function initials(name: string, surname: string): string {
  const a = (name?.[0] ?? "").toUpperCase();
  const b = (surname?.[0] ?? "").toUpperCase();
  return `${a}${b}` || "V";
}

/* ---------------------------------------------------------------- */
/* Icons                                                              */
/* ---------------------------------------------------------------- */

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

function ArrowUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path
        fillRule="evenodd"
        d="M10 17a1 1 0 01-1-1V6.414L5.707 9.707a1 1 0 11-1.414-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 11-1.414 1.414L11 6.414V16a1 1 0 01-1 1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ArrowDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path
        fillRule="evenodd"
        d="M10 3a1 1 0 011 1v9.586l3.293-3.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L9 13.586V4a1 1 0 011-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function RefreshIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function WalletIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M20 7H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12v4z" />
      <path d="M4 5v14a2 2 0 0 0 2 2h14V7H6a2 2 0 0 1-2-2z" />
      <circle cx="16" cy="14" r="1.25" fill="currentColor" />
    </svg>
  );
}

function CoinIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9.5a3 3 0 0 0-3-1.5 3 3 0 0 0 0 6 3 3 0 0 1 0 6 3 3 0 0 1-3-1.5" />
      <line x1="12" y1="6" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12" y2="18" />
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

function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SparkleIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}
