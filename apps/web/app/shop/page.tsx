"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getAccountForUser,
  getWalletBalance,
  listStoreItems,
  purchaseStoreItem,
} from "@/services/api";
import { getStoredUserId } from "@/lib/session";
import type { AccountResponse, StoreItemResponse } from "@/types/vektra";

type Toast = {
  id: number;
  variant: "success" | "info" | "error";
  message: string;
};

export default function ShopPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [items, setItems] = useState<StoreItemResponse[]>([]);
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [confirmItem, setConfirmItem] = useState<StoreItemResponse | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const canBuy = Boolean(userId && account?.accountState === "ACTIVE");

  useEffect(() => {
    setUserId(getStoredUserId());
    setSessionChecked(true);
  }, []);

  const loadCatalog = useCallback(async () => listStoreItems(), []);

  useEffect(() => {
    if (!sessionChecked) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await loadCatalog();
        if (cancelled) return;
        setItems(list);

        if (userId) {
          const [acc, wallet] = await Promise.all([
            getAccountForUser(userId),
            getWalletBalance(userId).catch(() => null),
          ]);
          if (cancelled) return;
          setAccount(acc);
          if (wallet) setBalance(wallet.balance);
        } else {
          setAccount(null);
          setBalance(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load shop");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, sessionChecked, loadCatalog]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "ALL" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.category?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, query, category]);

  async function handlePurchase(item: StoreItemResponse) {
    if (!userId) return;
    setBuyingId(item.id);
    setConfirmItem(null);
    try {
      const res = await purchaseStoreItem(userId, item.id);
      setBalance(res.balanceAfter);
      pushToast(
        {
          variant: "success",
          message: `Purchased "${res.storeItemName}" for ₵${res.amountPaid.toLocaleString("en-US")}. Balance: ₵${res.balanceAfter.toLocaleString("en-US")}.`,
        },
        setToast
      );
      const list = await loadCatalog();
      setItems(list);
    } catch (e) {
      pushToast(
        {
          variant: "error",
          message: e instanceof Error ? e.message : "Purchase failed",
        },
        setToast
      );
    } finally {
      setBuyingId(null);
    }
  }

  function onBuyClick(item: StoreItemResponse) {
    if (!userId) return;
    if (!canBuy) {
      pushToast(
        {
          variant: "info",
          message: `Your account must be ACTIVE to buy items (current: ${account?.accountState ?? "unknown"}).`,
        },
        setToast
      );
      return;
    }
    if (balance != null && balance < item.priceAmount) {
      pushToast(
        {
          variant: "error",
          message: `Insufficient balance — you need ₵${item.priceAmount.toLocaleString("en-US")} but have ₵${balance.toLocaleString("en-US")}.`,
        },
        setToast
      );
      return;
    }
    setConfirmItem(item);
  }

  return (
    <div className="space-y-8">
      <Header
        balance={balance}
        itemCount={items.length}
        loading={loading}
        signedIn={Boolean(userId)}
      />

      {error ? <Banner variant="error">{error}</Banner> : null}

      {!loading && !userId ? (
        <Banner variant="info">
          Browse the catalog below.{" "}
          <Link href="/login" className="font-semibold underline underline-offset-2">
            Log in
          </Link>{" "}
          or{" "}
          <Link href="/signup" className="font-semibold underline underline-offset-2">
            sign up
          </Link>{" "}
          to buy with your Vektras.
        </Banner>
      ) : null}

      {userId && account && !canBuy ? (
        <Banner variant="info">
          Your account is <strong>{account.accountState}</strong>. Purchases unlock
          once it&apos;s <strong>ACTIVE</strong>.
        </Banner>
      ) : null}

      <Toolbar
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
        categories={categories}
        total={items.length}
        showing={filtered.length}
      />

      {loading ? (
        <ItemGridSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          hasItems={items.length > 0}
          onClear={() => {
            setQuery("");
            setCategory("ALL");
          }}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, i) => (
            <ItemCard
              key={item.id}
              item={item}
              index={i}
              balance={balance}
              signedIn={Boolean(userId)}
              canBuy={canBuy}
              busy={buyingId === item.id}
              onBuy={() => onBuyClick(item)}
            />
          ))}
        </ul>
      )}

      {confirmItem && userId ? (
        <ConfirmModal
          item={confirmItem}
          balance={balance ?? 0}
          submitting={buyingId === confirmItem.id}
          onClose={() => {
            if (buyingId == null) setConfirmItem(null);
          }}
          onConfirm={() => void handlePurchase(confirmItem)}
        />
      ) : null}

      <ToastView toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

/* ---------------------- HEADER ---------------------- */

function Header({
  balance,
  itemCount,
  loading,
  signedIn,
}: {
  balance: number | null;
  itemCount: number;
  loading: boolean;
  signedIn: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-violet-100/70 bg-white p-6 shadow-sm sm:p-8">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl animate-blob"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-fuchsia-200/30 blur-3xl animate-blob delay-300"
        aria-hidden
      />

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
            Vektra shop
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Spend your Vektras
          </h1>
          <p className="max-w-lg text-sm text-zinc-600">
            Browse perks and rewards created in Factory. Prices are in Vektras —
            your wallet balance updates instantly after each purchase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {signedIn ? (
            <div className="rounded-xl border border-violet-100 bg-violet-50/80 px-4 py-3 text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">
                Your balance
              </div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-violet-900">
                {loading || balance == null ? (
                  <span className="inline-block h-6 w-24 animate-pulse rounded bg-violet-100" />
                ) : (
                  <>₵{balance.toLocaleString("en-US")}</>
                )}
              </div>
            </div>
          ) : null}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Items available
            </div>
            <div className="mt-0.5 text-xl font-bold tabular-nums text-zinc-900">
              {loading ? (
                <span className="inline-block h-6 w-10 animate-pulse rounded bg-zinc-200" />
              ) : (
                itemCount
              )}
            </div>
          </div>
          <Link
            href="/wallet"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            Wallet →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------------- TOOLBAR ---------------------- */

function Toolbar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  categories,
  total,
  showing,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  categories: string[];
  total: number;
  showing: number;
}) {
  const chips = ["ALL", ...categories];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search items…"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 shadow-sm transition-colors focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
        <p className="text-xs text-zinc-500">
          Showing {showing} of {total}
        </p>
      </div>
      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onCategoryChange(c)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  active
                    ? "bg-violet-600 text-white shadow-sm"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800"
                }`}
              >
                {c === "ALL" ? "All categories" : c}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------- ITEM CARD ---------------------- */

function ItemCard({
  item,
  index,
  balance,
  signedIn,
  canBuy,
  busy,
  onBuy,
}: {
  item: StoreItemResponse;
  index: number;
  balance: number | null;
  signedIn: boolean;
  canBuy: boolean;
  busy: boolean;
  onBuy: () => void;
}) {
  const soldOut = item.stock != null && item.stock <= 0;
  const lowStock =
    item.stock != null && item.stock > 0 && item.stock <= 3;
  const cantAfford =
    signedIn && balance != null && balance < item.priceAmount && !soldOut;

  let buyLabel = "Buy now";
  if (!signedIn) buyLabel = "Log in to buy";
  else if (soldOut) buyLabel = "Sold out";
  else if (!canBuy) buyLabel = "Account not active";
  else if (cantAfford) buyLabel = "Insufficient balance";

  const buyDisabled =
    busy || soldOut || !signedIn || !canBuy || cantAfford;

  return (
    <li
      className="animate-fade-in-up flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <div className="border-b border-zinc-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-bold tracking-tight text-zinc-900">
            {item.name}
          </h2>
          {item.category ? (
            <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700 ring-1 ring-violet-100">
              {item.category}
            </span>
          ) : null}
        </div>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-600">
          {item.description}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Price
            </div>
            <div className="text-2xl font-bold tabular-nums text-violet-800">
              ₵{item.priceAmount.toLocaleString("en-US")}
            </div>
          </div>
          <StockBadge stock={item.stock} soldOut={soldOut} lowStock={lowStock} />
        </div>

        <button
          type="button"
          onClick={onBuy}
          disabled={buyDisabled}
          className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-600/20 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md"
        >
          {busy ? (
            <>
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <BagIcon className="h-4 w-4" />
              {buyLabel}
            </>
          )}
        </button>
      </div>
    </li>
  );
}

function StockBadge({
  stock,
  soldOut,
  lowStock,
}: {
  stock: number | null;
  soldOut: boolean;
  lowStock: boolean;
}) {
  if (stock == null) {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
        In stock
      </span>
    );
  }
  if (soldOut) {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 ring-1 ring-zinc-200">
        Sold out
      </span>
    );
  }
  if (lowStock) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-100">
        {stock} left
      </span>
    );
  }
  return (
    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-100">
      {stock} in stock
    </span>
  );
}

/* ---------------------- CONFIRM MODAL ---------------------- */

function ConfirmModal({
  item,
  balance,
  submitting,
  onClose,
  onConfirm,
}: {
  item: StoreItemResponse;
  balance: number;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
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
  }, [onClose, submitting]);

  const balanceAfter = balance - item.priceAmount;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/60 backdrop-blur-sm p-3 sm:items-center sm:p-6"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="animate-fade-in-up w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 p-5 text-white sm:p-6">
          <h2 id="purchase-title" className="text-lg font-bold tracking-tight">
            Confirm purchase
          </h2>
          <p className="mt-1 text-sm text-violet-100/90">{item.name}</p>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <p className="text-sm text-zinc-600">{item.description}</p>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
            <div className="flex justify-between text-zinc-600">
              <span>Price</span>
              <span className="font-semibold tabular-nums text-violet-800">
                − ₵{item.priceAmount.toLocaleString("en-US")}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between text-zinc-600">
              <span>Balance after</span>
              <span className="font-semibold tabular-nums text-zinc-900">
                ₵{balanceAfter.toLocaleString("en-US")}
              </span>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  Buying…
                </>
              ) : (
                <>Buy for ₵{item.priceAmount.toLocaleString("en-US")}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- STATES ---------------------- */

function ItemGridSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
        >
          <div className="h-28 animate-pulse bg-violet-50" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
            <div className="h-8 w-full animate-pulse rounded bg-zinc-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({
  hasItems,
  onClear,
}: {
  hasItems: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 text-violet-600 ring-1 ring-violet-100">
        <BagIcon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-zinc-900">
        {hasItems ? "No items match your filters" : "Nothing in the shop yet"}
      </h3>
      <p className="max-w-sm text-sm text-zinc-500">
        {hasItems
          ? "Try a different search or category."
          : "Admins can add items in Factory — check back soon."}
      </p>
      {hasItems ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

function Banner({
  variant,
  children,
}: {
  variant: "info" | "error";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    error: "border-red-200 bg-red-50 text-red-900",
  } as const;
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${styles[variant]}`}
      role="status"
    >
      {children}
    </div>
  );
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
    const t = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    info: "border-sky-200 bg-sky-50 text-sky-900",
    error: "border-red-200 bg-red-50 text-red-900",
  } as const;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm animate-fade-in-up rounded-xl border px-4 py-3 text-sm shadow-lg ${styles[toast.variant]}`}
      role="status"
    >
      <div className="flex items-start gap-2">
        <span className="flex-1">{toast.message}</span>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-current opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function pushToast(
  next: Omit<Toast, "id">,
  setToast: (t: Toast | null) => void
) {
  setToast({ ...next, id: Date.now() });
}

/* ---------------------- ICONS ---------------------- */

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BagIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
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
