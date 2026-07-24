"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  factoryCreateStoreItem,
  factoryListStoreItems,
  factoryUpdateStoreItemStatus,
} from "@/services/api";
import type {
  CreateStoreItemRequest,
  StoreItemResponse,
  StoreItemStatus,
} from "@/types/vektra";
import { StatusBanner } from "@/components/StatusBanner";

type Filter = "ALL" | StoreItemStatus;

export default function FactoryItemsPage() {
  const [items, setItems] = useState<StoreItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    kind: "success" | "error";
  } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<number | null>(
    null
  );
  const [filter, setFilter] = useState<Filter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cat = categoryFilter.trim() || undefined;
      setItems(
        await factoryListStoreItems({ includeInactive: true, category: cat })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set).sort();
  }, [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "ALL" && item.status !== filter) return false;
      if (!q) return true;
      const hay = `${item.name} ${item.description} ${item.category ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, filter, search]);

  async function setStatus(id: number, status: StoreItemStatus) {
    setBusyId(id);
    setFeedback(null);
    try {
      await factoryUpdateStoreItemStatus(id, { status });
      setFeedback({
        text: `Item ${status === "ACTIVE" ? "activated" : "deactivated"}.`,
        kind: "success",
      });
      setConfirmDeactivateId(null);
      await load();
    } catch (e) {
      setFeedback({
        text: e instanceof Error ? e.message : "Update failed",
        kind: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function createItem(body: CreateStoreItemRequest) {
    setCreating(true);
    setFeedback(null);
    try {
      await factoryCreateStoreItem(body);
      setFeedback({ text: "Store item created.", kind: "success" });
      setCreateOpen(false);
      await load();
    } catch (e) {
      setFeedback({
        text: e instanceof Error ? e.message : "Create failed",
        kind: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Catalog
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
            Store items
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Define what users can buy in the Shop with Vektras.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {feedback ? (
        <StatusBanner variant={feedback.kind === "error" ? "error" : "success"}>
          {feedback.text}
        </StatusBanner>
      ) : null}
      {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {(["ALL", "ACTIVE", "INACTIVE"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                filter === f
                  ? "bg-amber-600 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {f === "ALL" ? "All" : f}
            </button>
          ))}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="min-w-[12rem] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
        >
          New item
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-600">
              <th className="px-5 py-3">Item</th>
              <th className="px-5 py-3">Price</th>
              <th className="px-5 py-3">Stock</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-zinc-500">
                  No items match your filters.
                </td>
              </tr>
            ) : (
              visible.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-zinc-900">{item.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                      {item.description}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      #{item.id}
                      {item.category ? ` · ${item.category}` : ""}
                    </p>
                  </td>
                  <td className="px-5 py-3 tabular-nums font-semibold text-zinc-800">
                    ₵{item.priceAmount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-zinc-700">
                    {item.stock == null ? "Unlimited" : item.stock}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/items/${item.id}/edit`}
                        className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Edit
                      </Link>
                      {confirmDeactivateId === item.id && item.status === "ACTIVE" ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void setStatus(item.id, "INACTIVE")}
                            className="rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeactivateId(null)}
                            className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs"
                          >
                            Cancel
                          </button>
                        </>
                      ) : item.status === "ACTIVE" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeactivateId(item.id);
                            if (confirmTimeoutRef.current)
                              clearTimeout(confirmTimeoutRef.current);
                            confirmTimeoutRef.current = setTimeout(
                              () => setConfirmDeactivateId(null),
                              6000
                            );
                          }}
                          className="rounded-md border border-rose-200 px-2.5 py-1.5 text-xs text-rose-700"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void setStatus(item.id, "ACTIVE")}
                          className="rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createOpen ? (
        <CreateItemDialog
          saving={creating}
          onCancel={() => !creating && setCreateOpen(false)}
          onSave={createItem}
        />
      ) : null}
    </div>
  );
}

function CreateItemDialog({
  saving,
  onCancel,
  onSave,
}: {
  saving: boolean;
  onCancel: () => void;
  onSave: (body: CreateStoreItemRequest) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceAmount, setPriceAmount] = useState("50");
  const [category, setCategory] = useState("");
  const [unlimitedStock, setUnlimitedStock] = useState(true);
  const [stock, setStock] = useState("10");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(priceAmount);
    if (!Number.isFinite(price) || price < 1) return;
    let stockVal: number | null = null;
    if (!unlimitedStock) {
      const s = Number(stock);
      if (!Number.isFinite(s) || s < 0) return;
      stockVal = s;
    }
    onSave({
      name: name.trim(),
      description: description.trim(),
      priceAmount: price,
      category: category.trim() || undefined,
      stock: stockVal,
      status: "ACTIVE",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-900/40" onClick={onCancel} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-5 shadow-xl"
      >
        <h3 className="text-base font-semibold text-zinc-900">New store item</h3>
        <div className="mt-4 space-y-3">
          <input
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <textarea
            required
            rows={3}
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            min={1}
            placeholder="Price (Vektras)"
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Category tag (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={unlimitedStock}
              onChange={(e) => setUnlimitedStock(e.target.checked)}
            />
            Unlimited stock
          </label>
          {!unlimitedStock ? (
            <input
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          ) : null}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border px-3 py-1.5 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
