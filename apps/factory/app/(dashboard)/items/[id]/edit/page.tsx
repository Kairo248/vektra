"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  factoryGetStoreItem,
  factoryUpdateStoreItem,
  factoryUpdateStoreItemStatus,
} from "@/services/api";
import type { StoreItemResponse } from "@/types/vektra";
import { StatusBanner } from "@/components/StatusBanner";

export default function EditStoreItemPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [item, setItem] = useState<StoreItemResponse | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [category, setCategory] = useState("");
  const [unlimitedStock, setUnlimitedStock] = useState(true);
  const [stock, setStock] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) {
      setError("Invalid item id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await factoryGetStoreItem(id);
      setItem(data);
      setName(data.name);
      setDescription(data.description);
      setPriceAmount(String(data.priceAmount));
      setCategory(data.category ?? "");
      setUnlimitedStock(data.stock == null);
      setStock(data.stock != null ? String(data.stock) : "0");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load item");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(priceAmount);
    if (!Number.isFinite(price) || price < 1) {
      setError("Price must be a positive number.");
      return;
    }
    let stockBody: { stock?: number; unlimitedStock?: boolean } = {};
    if (unlimitedStock) {
      stockBody = { unlimitedStock: true };
    } else {
      const s = Number(stock);
      if (!Number.isFinite(s) || s < 0) {
        setError("Stock must be zero or greater.");
        return;
      }
      stockBody = { stock: s };
    }
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const updated = await factoryUpdateStoreItem(id, {
        name: name.trim(),
        description: description.trim(),
        priceAmount: price,
        category: category.trim() || "",
        ...stockBody,
      });
      setItem(updated);
      setFeedback("Changes saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!item) return;
    const next = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setSaving(true);
    setError(null);
    try {
      const updated = await factoryUpdateStoreItemStatus(id, { status: next });
      setItem(updated);
      setFeedback(`Item is now ${next}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading item…</p>;
  }

  if (error && !item) {
    return (
      <div className="space-y-3">
        <StatusBanner variant="error">{error}</StatusBanner>
        <Link href="/items" className="text-sm text-amber-700 hover:underline">
          ← Back to items
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/items" className="text-xs font-medium text-amber-700 hover:underline">
          ← Store items
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Edit item #{id}</h1>
      </div>

      {feedback ? <StatusBanner variant="success">{feedback}</StatusBanner> : null}
      {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}

      <form
        onSubmit={onSave}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div>
          <label className="text-xs font-semibold uppercase text-zinc-600">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-zinc-600">
            Description
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-zinc-600">
            Price (Vektras)
          </label>
          <input
            required
            type="number"
            min={1}
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-zinc-600">
            Category
          </label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. perks"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
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

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            disabled={saving || !item}
            onClick={() => void toggleStatus()}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
          >
            {item?.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/items")}
            className="rounded-lg px-4 py-2 text-sm text-zinc-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
