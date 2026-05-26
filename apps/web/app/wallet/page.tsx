"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTransactions, getWalletBalance } from "@/services/api";
import { getStoredUserId } from "@/lib/session";
import type { TransactionResponse } from "@/types/vektra";
import { StatusBanner } from "@/components/StatusBanner";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function WalletPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [tx, setTx] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUserId(getStoredUserId());
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;
    if (!userId) {
      setLoading(false);
      setError("No user in session.");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [b, list] = await Promise.all([
          getWalletBalance(userId),
          getTransactions(userId),
        ]);
        if (!cancelled) {
          setBalance(b.balance);
          setTx(list);
        }
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

  if (sessionChecked && !userId) {
    return (
      <div className="space-y-4">
        <StatusBanner variant="error">Sign up to view your wallet.</StatusBanner>
        <Link
          href="/signup"
          className="inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white"
        >
          Sign up
        </Link>
      </div>
    );
  }

  if (!sessionChecked || loading) {
    return (
      <p className="text-sm text-zinc-600" role="status">
        Loading wallet…
      </p>
    );
  }

  if (error) {
    return <StatusBanner variant="error">{error}</StatusBanner>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Wallet</h1>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <p className="text-sm font-medium text-emerald-900">Current balance</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-950">
          {balance ?? 0}{" "}
          <span className="text-lg font-normal text-emerald-800">Vektras</span>
        </p>
        <p className="mt-2 text-xs text-emerald-800">
          Sum of all completed ledger transactions.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          Transaction history
        </h2>
        {tx.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No transactions yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {tx.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100">
                    <td className="px-3 py-2 text-zinc-600">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td
                      className={`px-3 py-2 font-medium tabular-nums ${
                        row.amount >= 0 ? "text-emerald-800" : "text-red-700"
                      }`}
                    >
                      {row.amount > 0 ? `+${row.amount}` : row.amount}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
