"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminActivateAccount,
  adminListUsers,
  adminSuspendAccount,
  updateUser,
} from "@/services/api";
import type { AccountState, AdminUserListItem } from "@/types/vektra";
import { AccountStateBadge } from "@/components/admin/AccountStateBadge";
import { StatusBanner } from "@/components/StatusBanner";

type Filter = "ALL" | AccountState;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "PENDING", label: "Pending" },
  { id: "SUSPENDED", label: "Suspended" },
];

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    kind: "success" | "error";
  } | null>(null);
  const [busyAccountId, setBusyAccountId] = useState<number | null>(null);
  const [confirmSuspendId, setConfirmSuspendId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [editing, setEditing] = useState<AdminUserListItem | null>(null);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await adminListUsers());
      setUpdatedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  function startConfirmSuspend(accountId: number) {
    setConfirmSuspendId(accountId);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    confirmTimeoutRef.current = setTimeout(() => {
      setConfirmSuspendId((cur) => (cur === accountId ? null : cur));
    }, 6000);
  }

  function cancelConfirmSuspend() {
    setConfirmSuspendId(null);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
  }

  async function activate(accountId: number) {
    setBusyAccountId(accountId);
    setFeedback(null);
    try {
      await adminActivateAccount(accountId);
      setFeedback({ text: "Account activated.", kind: "success" });
      await load();
    } catch (e) {
      setFeedback({
        text: e instanceof Error ? e.message : "Activate failed",
        kind: "error",
      });
    } finally {
      setBusyAccountId(null);
    }
  }

  async function suspend(accountId: number) {
    setBusyAccountId(accountId);
    setFeedback(null);
    try {
      await adminSuspendAccount(accountId);
      setFeedback({ text: "Account suspended.", kind: "success" });
      cancelConfirmSuspend();
      await load();
    } catch (e) {
      setFeedback({
        text: e instanceof Error ? e.message : "Suspend failed",
        kind: "error",
      });
    } finally {
      setBusyAccountId(null);
    }
  }

  const counts = useMemo(() => {
    const c = { ALL: rows.length, ACTIVE: 0, PENDING: 0, SUSPENDED: 0 };
    for (const r of rows) c[r.accountState] += 1;
    return c;
  }, [rows]);

  async function saveEdit(
    target: AdminUserListItem,
    body: { name: string; surname: string }
  ) {
    setBusyAccountId(target.accountId);
    setFeedback(null);
    try {
      const patch: { name?: string; surname?: string } = {};
      if (body.name !== target.name) patch.name = body.name;
      if (body.surname !== target.surname) patch.surname = body.surname;
      if (Object.keys(patch).length === 0) {
        setEditing(null);
        return;
      }
      await updateUser(target.userId, patch);
      setFeedback({ text: "User details updated.", kind: "success" });
      setEditing(null);
      await load();
    } catch (e) {
      setFeedback({
        text: e instanceof Error ? e.message : "Update failed",
        kind: "error",
      });
    } finally {
      setBusyAccountId(null);
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "ALL" && r.accountState !== filter) return false;
      if (!q) return true;
      const hay = `${r.name} ${r.surname} ${r.email}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, filter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            User management
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
            Users
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Approve pending signups, search the directory, and suspend accounts
            when needed.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {updatedAt == null ? "Loading…" : `Updated ${formatTimeAgo(updatedAt)}`}
          </span>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshIcon
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Feedback banners */}
      {feedback && (
        <StatusBanner variant={feedback.kind === "error" ? "error" : "success"}>
          {feedback.text}
        </StatusBanner>
      )}
      {error && <StatusBanner variant="error">{error}</StatusBanner>}

      {/* Toolbar: filters + search */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const count = counts[f.id];
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {f.label}
                <span
                  className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-400">
            <SearchIcon className="h-4 w-4" />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-8 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400 hover:text-zinc-700"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <SkeletonRows />
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      hasUsers={rows.length > 0}
                      filter={filter}
                      search={search}
                      onClear={() => {
                        setFilter("ALL");
                        setSearch("");
                      }}
                    />
                  </td>
                </tr>
              ) : (
                visible.map((r) => {
                  const isBusy = busyAccountId === r.accountId;
                  const isConfirming = confirmSuspendId === r.accountId;
                  return (
                    <tr
                      key={r.userId}
                      className={`border-b border-zinc-100 transition-colors last:border-b-0 ${
                        r.accountState === "PENDING"
                          ? "bg-amber-50/40 hover:bg-amber-50/70"
                          : "hover:bg-zinc-50"
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.name} surname={r.surname} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-900">
                              {r.name} {r.surname}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-zinc-500">
                              user #{r.userId} · account #{r.accountId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-zinc-800">{r.email}</span>
                      </td>
                      <td className="px-5 py-3">
                        <AccountStateBadge state={r.accountState} />
                      </td>
                      <td className="px-5 py-3">
                        {isConfirming ? (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <span className="text-xs font-medium text-rose-700">
                              Suspend this account?
                            </span>
                            <button
                              type="button"
                              onClick={() => suspend(r.accountId)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
                            >
                              {isBusy ? (
                                <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <BanIcon className="h-3.5 w-3.5" />
                              )}
                              Yes, suspend
                            </button>
                            <button
                              type="button"
                              onClick={cancelConfirmSuspend}
                              disabled={isBusy}
                              className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditing(r)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
                            >
                              <PencilIcon className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            {r.accountState === "PENDING" && (
                              <button
                                type="button"
                                onClick={() => activate(r.accountId)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60"
                              >
                                {isBusy ? (
                                  <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <UserCheckIcon className="h-3.5 w-3.5" />
                                )}
                                Approve
                              </button>
                            )}
                            {r.accountState === "SUSPENDED" && (
                              <button
                                type="button"
                                onClick={() => activate(r.accountId)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
                              >
                                {isBusy ? (
                                  <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <UserCheckIcon className="h-3.5 w-3.5" />
                                )}
                                Reactivate
                              </button>
                            )}
                            {r.accountState !== "SUSPENDED" && (
                              <button
                                type="button"
                                onClick={() =>
                                  startConfirmSuspend(r.accountId)
                                }
                                disabled={isBusy}
                                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:border-rose-200 hover:bg-rose-50 disabled:opacity-60"
                              >
                                <BanIcon className="h-3.5 w-3.5" />
                                Suspend
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50/50 px-5 py-2.5 text-xs text-zinc-500">
          <span>
            Showing{" "}
            <span className="font-semibold tabular-nums text-zinc-700">
              {visible.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold tabular-nums text-zinc-700">
              {rows.length}
            </span>{" "}
            users
          </span>
          {filter !== "ALL" && (
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className="font-medium text-emerald-700 hover:text-emerald-800"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {editing && (
        <EditUserDialog
          user={editing}
          saving={busyAccountId === editing.accountId}
          onCancel={() => setEditing(null)}
          onSave={(values) => saveEdit(editing, values)}
        />
      )}
    </div>
  );
}

/* --- edit dialog --- */

function EditUserDialog({
  user,
  saving,
  onCancel,
  onSave,
}: {
  user: AdminUserListItem;
  saving: boolean;
  onCancel: () => void;
  onSave: (values: { name: string; surname: string }) => void;
}) {
  const [name, setName] = useState(user.name);
  const [surname, setSurname] = useState(user.surname);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    firstFieldRef.current?.select();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, saving]);

  const trimmedName = name.trim();
  const trimmedSurname = surname.trim();
  const blank = trimmedName.length === 0 || trimmedSurname.length === 0;
  const dirty =
    trimmedName !== user.name.trim() || trimmedSurname !== user.surname.trim();
  const canSave = !saving && !blank && dirty;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onSave({ name: trimmedName, surname: trimmedSurname });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
        onClick={() => {
          if (!saving) onCancel();
        }}
      />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl ring-1 ring-zinc-900/5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div>
            <h3
              id="edit-user-title"
              className="text-base font-semibold text-zinc-900"
            >
              Edit user
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              user #{user.userId} · {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Close"
            className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-60"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <label
              htmlFor="edit-user-name"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
            >
              First name
            </label>
            <input
              id="edit-user-name"
              ref={firstFieldRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              disabled={saving}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-zinc-50"
            />
          </div>

          <div>
            <label
              htmlFor="edit-user-surname"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
            >
              Last name
            </label>
            <input
              id="edit-user-surname"
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              maxLength={120}
              required
              disabled={saving}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-zinc-50"
            />
          </div>

          <p className="text-xs text-zinc-500">
            Email is managed on the account and cannot be edited here.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50/50 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckIcon className="h-3.5 w-3.5" />
            )}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

/* --- helpers --- */

function formatTimeAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

const AVATAR_PALETTE = [
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
];

function Avatar({ name, surname }: { name: string; surname: string }) {
  const initials = `${(name?.[0] ?? "").toUpperCase()}${(
    surname?.[0] ?? ""
  ).toUpperCase()}`;
  const seed = `${name}${surname}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const palette = AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  return (
    <span
      aria-hidden
      className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset ring-black/5 ${palette}`}
    >
      {initials || "?"}
    </span>
  );
}

function EmptyState({
  hasUsers,
  filter,
  search,
  onClear,
}: {
  hasUsers: boolean;
  filter: Filter;
  search: string;
  onClear: () => void;
}) {
  const filtered = hasUsers && (filter !== "ALL" || search.trim().length > 0);
  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200">
        <UsersIcon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-zinc-900">
        {filtered ? "No users match your filters" : "No users yet"}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        {filtered
          ? "Try clearing the search or filter to see more results."
          : "When users sign up, they'll appear here for review."}
      </p>
      {filtered && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <tr key={i} className="border-b border-zinc-100 last:border-b-0">
          <td className="px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-100" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-32 animate-pulse rounded bg-zinc-100" />
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
              </div>
            </div>
          </td>
          <td className="px-5 py-3">
            <div className="h-3.5 w-40 animate-pulse rounded bg-zinc-100" />
          </td>
          <td className="px-5 py-3">
            <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-100" />
          </td>
          <td className="px-5 py-3">
            <div className="flex justify-end gap-2">
              <div className="h-7 w-20 animate-pulse rounded-md bg-zinc-100" />
              <div className="h-7 w-20 animate-pulse rounded-md bg-zinc-100" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

/* --- icons --- */

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-3.5-7.1" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function UserCheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M16 11l2 2 4-4" />
    </svg>
  );
}

function BanIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  );
}

function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PencilIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 20h4l10.5-10.5a2.83 2.83 0 0 0-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

function SpinnerIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
