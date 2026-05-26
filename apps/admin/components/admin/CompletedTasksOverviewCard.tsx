"use client";

import { useCallback, useEffect, useState } from "react";
import { adminGetAllCompletedTasks } from "@/services/api";

export function CompletedTasksOverviewCard() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await adminGetAllCompletedTasks();
      setCount(rows.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setCount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Completed tasks (overall)
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Approved completions across all users
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-4 text-4xl font-bold tabular-nums tracking-tight text-emerald-900">
          {loading ? "—" : count?.toLocaleString() ?? "—"}
        </p>
      )}
    </div>
  );
}
