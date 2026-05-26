"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAccountForUser, getUser } from "@/services/api";
import { getStoredUserId } from "@/lib/session";
import type { AccountResponse, UserResponse } from "@/types/vektra";
import { StatusBanner } from "@/components/StatusBanner";

export default function DashboardPage() {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = getStoredUserId();
    if (!id) {
      setLoading(false);
      setError("No user in session. Sign up first.");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [u, a] = await Promise.all([getUser(id), getAccountForUser(id)]);
        if (!cancelled) {
          setUser(u);
          setAccount(a);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-zinc-600" role="status">
        Loading dashboard…
      </p>
    );
  }

  if (error || !user || !account) {
    return (
      <div className="space-y-4">
        <StatusBanner variant="error">
          {error ?? "Missing user data."}
        </StatusBanner>
        <Link
          href="/signup"
          className="inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
        >
          Go to signup
        </Link>
      </div>
    );
  }

  const pending = account.accountState === "PENDING";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>

      {pending && (
        <StatusBanner variant="info">
          Your account is <strong>PENDING</strong>. Task completion is disabled
          until an admin activates your account.
        </StatusBanner>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            User
          </h2>
          <p className="mt-2 text-lg font-medium text-zinc-900">
            {user.name} {user.surname}
          </p>
          <p className="text-sm text-zinc-600">ID: {user.id}</p>
          <p className="text-sm text-zinc-600">Type: {user.userType}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Account
          </h2>
          <p className="mt-2 text-lg font-medium text-zinc-900">
            {account.email}
          </p>
          <p className="mt-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                account.accountState === "ACTIVE"
                  ? "bg-emerald-100 text-emerald-800"
                  : account.accountState === "PENDING"
                    ? "bg-amber-100 text-amber-900"
                    : "bg-zinc-200 text-zinc-800"
              }`}
            >
              {account.accountState}
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/tasks"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Tasks
        </Link>
        <Link
          href="/wallet"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Wallet
        </Link>
      </div>
    </div>
  );
}
