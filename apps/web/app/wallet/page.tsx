"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  getTasks,
  getTransactions,
  getWalletBalance,
  sendTransfer,
} from "@/services/api";
import { getStoredUserId } from "@/lib/session";
import type {
  TaskResponse,
  TransactionResponse,
  TransactionType,
} from "@/types/vektra";

type TxFilter = "ALL" | "EARN" | "SPEND" | "TRANSFER" | "PENDING";

/** Inflows: EARN (task reward) and TRANSFER_IN (received from another user). */
const CREDIT_TYPES: ReadonlySet<TransactionType> = new Set<TransactionType>([
  "EARN",
  "TRANSFER_IN",
]);

function isCredit(t: TransactionResponse): boolean {
  return CREDIT_TYPES.has(t.type);
}

export default function WalletPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [balance, setBalance] = useState<number | null>(null);
  const [tx, setTx] = useState<TransactionResponse[]>([]);
  const [taskNames, setTaskNames] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hidden, setHidden] = useState(false);
  const [filter, setFilter] = useState<TxFilter>("ALL");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFlash, setTransferFlash] = useState<string | null>(null);

  useEffect(() => {
    setUserId(getStoredUserId());
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (!sessionChecked || !userId) {
      if (sessionChecked && !userId) setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [b, list, tasks] = await Promise.all([
          getWalletBalance(userId),
          getTransactions(userId),
          getTasks().catch(() => [] as TaskResponse[]),
        ]);
        if (cancelled) return;
        setBalance(b.balance);
        setTx(list);
        setTaskNames(buildTaskNameMap(tasks));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load wallet");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, sessionChecked]);

  async function refresh() {
    if (!userId) return;
    setRefreshing(true);
    try {
      const [b, list, tasks] = await Promise.all([
        getWalletBalance(userId),
        getTransactions(userId),
        getTasks().catch(() => [] as TaskResponse[]),
      ]);
      setBalance(b.balance);
      setTx(list);
      setTaskNames(buildTaskNameMap(tasks));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh wallet");
    } finally {
      setRefreshing(false);
    }
  }

  /* ---------- Derived analytics ---------- */

  const stats = useMemo(() => analyzeTransactions(tx), [tx]);
  const sparkline = useMemo(() => buildSparkline(tx), [tx]);
  const filteredTx = useMemo(() => filterTx(tx, filter), [tx, filter]);

  /* ---------- Render gates ---------- */

  if (sessionChecked && !userId) {
    return <UnauthenticatedView />;
  }

  return (
    <div className="space-y-8">
      <HeroCard
        balance={balance}
        loading={loading}
        hidden={hidden}
        onToggleHidden={() => setHidden((v) => !v)}
        onRefresh={refresh}
        refreshing={refreshing}
        monthEarned={stats.monthEarned}
        sparkline={sparkline}
        onSend={() => setTransferOpen(true)}
        canSend={Boolean(userId) && (balance ?? 0) > 0}
      />

      {transferFlash ? (
        <Banner variant="success">{transferFlash}</Banner>
      ) : null}
      {error ? <Banner variant="error">{error}</Banner> : null}

      <StatsStrip loading={loading} stats={stats} />

      {userId ? (
        <TransferModal
          open={transferOpen}
          senderId={userId}
          balance={balance ?? 0}
          onClose={() => setTransferOpen(false)}
          onSuccess={(amount, recipientId, balanceAfter) => {
            setTransferOpen(false);
            setTransferFlash(
              `Sent ₵${amount.toLocaleString("en-US")} to user #${recipientId}. New balance: ₵${balanceAfter.toLocaleString("en-US")}.`
            );
            // Refresh from the source of truth so the new TRANSFER_OUT row + signed
            // balance both flow back through the same path as any other update.
            void refresh();
            // Auto-dismiss the success flash after a few seconds.
            window.setTimeout(() => setTransferFlash(null), 6000);
          }}
        />
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
              Activity
            </h2>
            <p className="text-sm text-zinc-500">
              Every Vektra in and out of your wallet.
            </p>
          </div>
          <FilterChips
            value={filter}
            onChange={setFilter}
            counts={{
              all: tx.length,
              earn: tx.filter((t) => isCredit(t)).length,
              spend: tx.filter((t) => !isCredit(t)).length,
              transfer: tx.filter(
                (t) => t.type === "TRANSFER_IN" || t.type === "TRANSFER_OUT"
              ).length,
              pending: tx.filter((t) => t.status === "PENDING").length,
            }}
          />
        </div>

        {loading ? (
          <TxSkeleton />
        ) : filteredTx.length === 0 ? (
          <EmptyState filter={filter} onClear={() => setFilter("ALL")} />
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {filteredTx.map((row, i) => (
              <TxRow
                key={row.id}
                tx={row}
                index={i}
                taskName={
                  row.taskId != null ? taskNames.get(row.taskId) : undefined
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ============================ HERO CARD ============================ */

function HeroCard({
  balance,
  loading,
  hidden,
  onToggleHidden,
  onRefresh,
  refreshing,
  monthEarned,
  sparkline,
  onSend,
  canSend,
}: {
  balance: number | null;
  loading: boolean;
  hidden: boolean;
  onToggleHidden: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  monthEarned: number;
  sparkline: { points: string; gradientStart: string; gradientEnd: string };
  onSend: () => void;
  canSend: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 p-6 text-white shadow-xl sm:p-10">
      {/* Decorative blobs */}
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl animate-blob"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl animate-blob delay-300"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              Wallet · live
            </div>
            <div className="flex items-center gap-1">
              <IconButton
                onClick={onToggleHidden}
                label={hidden ? "Show balance" : "Hide balance"}
              >
                {hidden ? (
                  <EyeOffIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </IconButton>
              <IconButton
                onClick={onRefresh}
                label="Refresh"
                disabled={refreshing}
              >
                <RefreshIcon
                  className={`h-4 w-4 ${refreshing ? "animate-spin-slow" : ""}`}
                />
              </IconButton>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-emerald-100/80">
              Total balance
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-2 sm:gap-3">
              <div className="flex items-baseline gap-1 text-5xl font-bold tracking-tight tabular-nums sm:text-6xl">
                <span className="text-emerald-100">₵</span>
                {loading || balance == null ? (
                  <span className="inline-block h-12 w-32 animate-pulse rounded-md bg-white/20 sm:h-14" />
                ) : hidden ? (
                  <span aria-label="balance hidden">••••••</span>
                ) : (
                  <CountUp value={balance} />
                )}
              </div>
              {monthEarned > 0 && !hidden ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                  <TrendUpIcon className="h-3 w-3" />
                  +{monthEarned.toLocaleString("en-US")} this month
                </span>
              ) : null}
            </div>
            <p className="mt-2 max-w-md text-sm text-emerald-50/90">
              Sum of every completed ledger transaction. Earnings settle here
              the moment a task is approved.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              title={
                canSend
                  ? "Send Vektras to another user"
                  : "You need a positive balance to send Vektras"
              }
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            >
              <SendIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              Send Vektras
            </button>
            <Link
              href="/tasks"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/20"
            >
              Browse tasks
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/20"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Sparkline visual */}
        <div className="relative w-full max-w-md justify-self-end lg:w-[300px]">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-emerald-100/80">
              <span>Balance trend</span>
              <span>30d</span>
            </div>
            <Sparkline
              points={sparkline.points}
              gradientStart={sparkline.gradientStart}
              gradientEnd={sparkline.gradientEnd}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function IconButton({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/20 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/* ============================ SPARKLINE ============================ */

function Sparkline({
  points,
  gradientStart,
  gradientEnd,
}: {
  points: string;
  gradientStart: string;
  gradientEnd: string;
}) {
  if (!points) {
    return (
      <div className="mt-3 flex h-16 items-center justify-center text-xs text-emerald-100/70">
        Not enough data yet
      </div>
    );
  }
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="mt-3 h-16 w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="spark-stroke" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,40 ${points} 100,40`}
        fill="url(#spark-fill)"
        opacity="0.55"
      />
      <polyline
        points={points}
        fill="none"
        stroke="url(#spark-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ============================ STATS STRIP ============================ */

function StatsStrip({
  loading,
  stats,
}: {
  loading: boolean;
  stats: ReturnType<typeof analyzeTransactions>;
}) {
  const items = [
    {
      label: "Total earned",
      value: stats.totalEarned,
      prefix: "₵ ",
      tone: "emerald" as const,
    },
    {
      label: "Total spent",
      value: stats.totalSpent,
      prefix: "₵ ",
      tone: "zinc" as const,
    },
    {
      label: "Pending",
      value: stats.pendingCount,
      tone: "amber" as const,
    },
    {
      label: "Completed",
      value: stats.completedCount,
      tone: "sky" as const,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((s, i) => (
        <div
          key={s.label}
          className="animate-fade-in-up rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {s.label}
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-zinc-900">
            {loading ? (
              <span className="inline-block h-7 w-20 animate-pulse rounded bg-zinc-100" />
            ) : (
              <>
                {s.prefix ?? ""}
                {s.value.toLocaleString("en-US")}
              </>
            )}
          </div>
          <ToneDot tone={s.tone} />
        </div>
      ))}
    </div>
  );
}

function ToneDot({ tone }: { tone: "emerald" | "zinc" | "amber" | "sky" }) {
  const map = {
    emerald: "bg-emerald-500",
    zinc: "bg-zinc-400",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
  };
  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
      <span className={`h-1.5 w-1.5 rounded-full ${map[tone]}`} />
      Last 90 days
    </div>
  );
}

/* ============================ FILTER CHIPS ============================ */

function FilterChips({
  value,
  onChange,
  counts,
}: {
  value: TxFilter;
  onChange: (v: TxFilter) => void;
  counts: {
    all: number;
    earn: number;
    spend: number;
    transfer: number;
    pending: number;
  };
}) {
  const chips: { value: TxFilter; label: string; count: number }[] = [
    { value: "ALL", label: "All", count: counts.all },
    { value: "EARN", label: "In", count: counts.earn },
    { value: "SPEND", label: "Out", count: counts.spend },
    { value: "TRANSFER", label: "Transfers", count: counts.transfer },
    { value: "PENDING", label: "Pending", count: counts.pending },
  ];
  return (
    <div className="inline-flex flex-wrap rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
      {chips.map((c) => {
        const active = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
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
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {c.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================ TRANSACTION ROW ============================ */

function TxRow({
  tx,
  index,
  taskName,
}: {
  tx: TransactionResponse;
  index: number;
  taskName?: string;
}) {
  const credit = isCredit(tx);
  const isPending = tx.status === "PENDING";
  const isTransfer = tx.type === "TRANSFER_IN" || tx.type === "TRANSFER_OUT";
  const amount = Math.abs(tx.amount);

  // For transfers, the title shows the counterparty's full name (when the
  // backend resolved it) and the secondary line shows their numeric id.
  // We fall back to "user #N" inside the title only when the name lookup
  // came back empty (e.g. the counterparty was removed).
  const counterpartyFullName = isTransfer
    ? [tx.counterpartyName, tx.counterpartySurname]
        .filter((p): p is string => Boolean(p && p.trim()))
        .join(" ")
        .trim() || null
    : null;

  let title: string;
  let directionLabel: string;
  if (isTransfer) {
    const who =
      counterpartyFullName ?? `user #${tx.counterpartyUserId ?? "?"}`;
    if (tx.type === "TRANSFER_IN") {
      title = `Received from ${who}`;
      directionLabel = "Transfer in";
    } else {
      title = `Sent to ${who}`;
      directionLabel = "Transfer out";
    }
  } else {
    title =
      taskName ??
      (tx.taskId != null
        ? `Task #${tx.taskId}`
        : credit
        ? "Earning"
        : "Spending");
    directionLabel = credit ? "Earned" : "Spent";
  }

  // Pick the leading icon and gradient based on direction. Transfers use a
  // distinct diagonal-arrow icon so they're visually separable from task EARN.
  const Icon = isTransfer
    ? tx.type === "TRANSFER_IN"
      ? ArrowDownLeftIcon
      : ArrowUpRightIcon
    : credit
    ? TrendUpIcon
    : TrendDownIcon;

  return (
    <li
      className="animate-fade-in-up flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50/60 sm:px-5 sm:py-4"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${
          credit
            ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-600/20"
            : "bg-gradient-to-br from-rose-500 to-orange-500 shadow-rose-500/20"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="truncate text-sm font-semibold text-zinc-900"
            title={title}
          >
            {title}
          </span>
          {isPending ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-100">
              <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
              Pending
            </span>
          ) : null}
        </div>
        {isTransfer && counterpartyFullName && tx.counterpartyUserId != null ? (
          <div className="mt-0.5 truncate text-xs font-medium text-zinc-600">
            #{tx.counterpartyUserId}
          </div>
        ) : null}
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
          <span>{directionLabel}</span>
          <span aria-hidden>·</span>
          <span title={tx.createdAt}>{relativeTime(tx.createdAt)}</span>
        </div>
      </div>

      <div
        className={`text-right text-sm font-bold tabular-nums ${
          credit ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {credit ? "+" : "−"} ₵{amount.toLocaleString("en-US")}
      </div>
    </li>
  );
}

/* ============================ STATES ============================ */

function TxSkeleton() {
  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-zinc-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-zinc-100" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-zinc-100" />
          </div>
          <div className="h-4 w-16 animate-pulse rounded bg-zinc-100" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({
  filter,
  onClear,
}: {
  filter: TxFilter;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
        <ReceiptIcon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-zinc-900">
        {filter === "ALL"
          ? "No transactions yet"
          : "Nothing matches that filter"}
      </h3>
      <p className="max-w-sm text-sm text-zinc-500">
        {filter === "ALL"
          ? "Complete a task and your first Vektras will show up here."
          : "Switch the filter to see other entries in your ledger."}
      </p>
      {filter !== "ALL" ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Show all
        </button>
      ) : (
        <Link
          href="/tasks"
          className="mt-1 inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow transition-all hover:-translate-y-0.5 hover:bg-emerald-800"
        >
          Find a task →
        </Link>
      )}
    </div>
  );
}

function UnauthenticatedView() {
  return (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <LockIcon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-zinc-900">Sign up to see your wallet</h2>
        <p className="mx-auto max-w-sm text-sm text-zinc-600">
          Your balance, transaction history, and earnings live behind your free
          Vektra account.
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

/* ============================ TRANSFER MODAL ============================ */

/**
 * Send-Vektras dialog. Recipient id is required; email/name are optional
 * "Confirmation of Payee" fields that the backend verifies against the actual
 * recipient. The modal is fully client-side — it relies entirely on the API
 * response for validation, so any rule added server-side (state checks,
 * confirmation mismatch, frozen wallet, etc.) shows up here automatically.
 *
 * Closing rules: Escape and backdrop click both close, but only when not
 * mid-submit (so users can't accidentally tear down a request in flight).
 */
function TransferModal({
  open,
  senderId,
  balance,
  onClose,
  onSuccess,
}: {
  open: boolean;
  senderId: number;
  balance: number;
  onClose: () => void;
  onSuccess: (amount: number, recipientId: number, balanceAfter: number) => void;
}) {
  const [recipientId, setRecipientId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the modal opens — leaving values between opens is
  // a privacy footgun (last recipient lingers on screen for the next user).
  useEffect(() => {
    if (open) {
      setRecipientId("");
      setRecipientName("");
      setRecipientEmail("");
      setAmount("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  // Escape closes, but only when idle. Also locks body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, submitting, onClose]);

  if (!open) return null;

  const parsedRecipientId = Number.parseInt(recipientId, 10);
  const parsedAmount = Number.parseInt(amount, 10);
  const recipientIdValid = Number.isInteger(parsedRecipientId) && parsedRecipientId > 0;
  const recipientIdIsSelf = recipientIdValid && parsedRecipientId === senderId;
  const amountValid = Number.isInteger(parsedAmount) && parsedAmount >= 1;
  const amountFitsBalance = amountValid && parsedAmount <= balance;
  const formValid =
    recipientIdValid &&
    !recipientIdIsSelf &&
    amountValid &&
    amountFitsBalance;

  const balanceAfter = amountValid ? balance - parsedAmount : balance;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await sendTransfer(senderId, {
        recipientId: parsedRecipientId,
        recipientEmail: recipientEmail || undefined,
        recipientName: recipientName || undefined,
        amount: parsedAmount,
      });
      onSuccess(res.amount, res.recipientId, res.senderBalanceAfter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/60 backdrop-blur-sm p-3 sm:items-center sm:p-6"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="animate-fade-in-up w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative isolate overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-5 text-white sm:p-6">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-300/30 blur-3xl"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <h2 id="transfer-title" className="text-lg font-bold tracking-tight sm:text-xl">
                Send Vektras
              </h2>
              <p className="mt-1 text-xs text-emerald-50/90 sm:text-sm">
                Available balance{" "}
                <span className="font-semibold">
                  ₵{balance.toLocaleString("en-US")}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur transition-all hover:bg-white/20 disabled:opacity-50"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 sm:px-6">
          <Field
            label="Recipient ID"
            hint="Required. The numeric user ID of who you're paying."
            error={
              recipientIdIsSelf
                ? "You can't send to your own account."
                : recipientId !== "" && !recipientIdValid
                ? "Enter a positive whole number."
                : null
            }
          >
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              placeholder="e.g. 7"
              required
              disabled={submitting}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Recipient name"
              hint="Optional. If set, must match the recipient's full name."
            >
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Ada Lovelace"
                maxLength={255}
                disabled={submitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </Field>
            <Field
              label="Recipient email"
              hint="Optional. If set, must match the recipient's email."
            >
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="ada@example.com"
                maxLength={255}
                disabled={submitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </Field>
          </div>

          <Field
            label="Amount"
            hint={`Max ₵1,000,000 per transfer.`}
            error={
              amount !== "" && !amountValid
                ? "Enter a positive whole number."
                : amountValid && !amountFitsBalance
                ? `Exceeds available balance (₵${balance.toLocaleString("en-US")}).`
                : null
            }
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
                ₵
              </span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="1000000"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
                disabled={submitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pl-7 text-sm tabular-nums text-zinc-900 shadow-sm transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Quick-pick chips for common amounts (only those that fit the
                current balance). */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[100, 500, 1000, 5000].map((preset) =>
                preset <= balance ? (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    disabled={submitting}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    ₵{preset.toLocaleString("en-US")}
                  </button>
                ) : null
              )}
              {balance > 0 ? (
                <button
                  type="button"
                  onClick={() => setAmount(String(balance))}
                  disabled={submitting}
                  className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                >
                  Max ₵{balance.toLocaleString("en-US")}
                </button>
              ) : null}
            </div>
          </Field>

          {/* Live preview: helps the user double-check the amount before clicking. */}
          {amountValid && amountFitsBalance ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
              <div className="flex items-center justify-between text-zinc-600">
                <span>You&apos;re sending</span>
                <span className="font-semibold tabular-nums text-emerald-700">
                  − ₵{parsedAmount.toLocaleString("en-US")}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-zinc-600">
                <span>Balance after</span>
                <span className="font-semibold tabular-nums text-zinc-900">
                  ₵{balanceAfter.toLocaleString("en-US")}
                </span>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formValid || submitting}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            >
              {submitting ? (
                <>
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <SendIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  Send Vektras
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-semibold text-zinc-700">{label}</span>
      {children}
      {error ? (
        <span className="block text-[11px] font-medium text-red-700">
          {error}
        </span>
      ) : hint ? (
        <span className="block text-[11px] text-zinc-500">{hint}</span>
      ) : null}
    </label>
  );
}

/* ============================ HOOKS & HELPERS ============================ */

function CountUp({ value, duration = 800 }: { value: number; duration?: number }) {
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

function signedAmount(t: TransactionResponse): number {
  return isCredit(t) ? Math.abs(t.amount) : -Math.abs(t.amount);
}

function buildTaskNameMap(tasks: TaskResponse[]): Map<number, string> {
  const m = new Map<number, string>();
  for (const t of tasks) {
    if (typeof t.id === "number" && t.name) m.set(t.id, t.name);
  }
  return m;
}

function analyzeTransactions(list: TransactionResponse[]) {
  // "Earned" bucket = every inflow (task EARN + transfers received).
  // "Spent"  bucket = every outflow (SPEND + transfers sent).
  // This is the same convention used by `signedAmount` / `isCredit`, so the
  // stats strip totals exactly equal sum-of-credits and sum-of-debits.
  let totalEarned = 0;
  let totalSpent = 0;
  let pendingCount = 0;
  let completedCount = 0;
  let monthEarned = 0;
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;

  for (const t of list) {
    if (isCredit(t)) totalEarned += Math.abs(t.amount);
    else totalSpent += Math.abs(t.amount);
    if (t.status === "PENDING") pendingCount += 1;
    if (t.status === "COMPLETED") completedCount += 1;
    if (isCredit(t) && Date.parse(t.createdAt) >= thirtyDaysAgo) {
      monthEarned += Math.abs(t.amount);
    }
  }
  return { totalEarned, totalSpent, pendingCount, completedCount, monthEarned };
}

function buildSparkline(list: TransactionResponse[]) {
  const completed = list
    .filter((t) => t.status === "COMPLETED")
    .slice()
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  if (completed.length < 2) {
    return { points: "", gradientStart: "#a7f3d0", gradientEnd: "#5eead4" };
  }

  let running = 0;
  const samples = completed.map((t) => {
    running += signedAmount(t);
    return running;
  });

  const min = Math.min(...samples, 0);
  const max = Math.max(...samples, 0);
  const range = Math.max(1, max - min);
  const N = samples.length;
  const points = samples
    .map((v, i) => {
      const x = (i / (N - 1)) * 100;
      const y = 40 - ((v - min) / range) * 36 - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return { points, gradientStart: "#ffffff", gradientEnd: "#a7f3d0" };
}

function filterTx(list: TransactionResponse[], f: TxFilter): TransactionResponse[] {
  const base =
    f === "ALL"
      ? list
      : f === "EARN"
      ? list.filter((t) => isCredit(t))
      : f === "SPEND"
      ? list.filter((t) => !isCredit(t))
      : f === "TRANSFER"
      ? list.filter((t) => t.type === "TRANSFER_IN" || t.type === "TRANSFER_OUT")
      : list.filter((t) => t.status === "PENDING");
  return base
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 60) return `${Math.max(diff, 1)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604_800) return `${Math.floor(diff / 86_400)}d ago`;
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ============================ ICONS ============================ */

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.5 19.5 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.62 19.62 0 0 1-3.17 4.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function RefreshIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
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

function TrendUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function TrendDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  );
}

function ReceiptIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="16" y2="13" />
    </svg>
  );
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function AlertIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
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

function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function SendIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ArrowDownLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <line x1="17" y1="7" x2="7" y2="17" />
      <polyline points="17 17 7 17 7 7" />
    </svg>
  );
}

function ArrowUpRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SpinnerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
