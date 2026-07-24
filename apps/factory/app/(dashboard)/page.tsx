"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { factoryListStoreItems } from "@/services/api";
import { StatCard } from "@/components/admin/StatCard";
import type { StoreItemResponse } from "@/types/vektra";

export default function FactoryHomePage() {
  const [items, setItems] = useState<StoreItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await factoryListStoreItems({ includeInactive: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let lowStock = 0;
    for (const item of items) {
      if (item.status === "ACTIVE") active += 1;
      else inactive += 1;
      if (item.stock != null && item.stock <= 3) lowStock += 1;
    }
    return { total: items.length, active, inactive, lowStock };
  }, [items]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          Catalog studio
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
          Factory overview
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Create and manage store items users can buy with Vektras.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total items"
          value={loading ? null : stats.total}
          tone="sky"
          loading={loading}
          icon={<BoxIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Active in shop"
          value={loading ? null : stats.active}
          tone="emerald"
          loading={loading}
          icon={<CheckIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Inactive"
          value={loading ? null : stats.inactive}
          tone="zinc"
          loading={loading}
          icon={<PauseIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Low stock (≤3)"
          value={loading ? null : stats.lowStock}
          tone="amber"
          loading={loading}
          hint="Finite stock only"
          icon={<AlertIcon className="h-5 w-5" />}
        />
      </section>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Quick start</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Items must be ACTIVE to appear in the Shop (Phase 3).
            </p>
          </div>
          <Link
            href="/items"
            className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
          >
            Manage store items →
          </Link>
        </div>
      </div>
    </div>
  );
}

function BoxIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PauseIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
    </svg>
  );
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}
