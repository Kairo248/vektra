"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  changePassword,
  getAccountForUser,
  getUser,
  updateUser,
} from "@/services/api";
import { clearSession, getStoredUserId } from "@/lib/session";
import type { AccountResponse, UserResponse } from "@/types/vektra";
import { StatusBanner } from "@/components/StatusBanner";

type Loaded = { user: UserResponse; account: AccountResponse };

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUserId(getStoredUserId());
    setSessionChecked(true);
  }, []);

  const load = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const [user, account] = await Promise.all([
        getUser(id),
        getAccountForUser(id),
      ]);
      setData({ user, account });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;
    if (!userId) {
      setLoading(false);
      return;
    }
    void load(userId);
  }, [sessionChecked, userId, load]);

  if (sessionChecked && !userId) {
    return <NotSignedIn />;
  }

  if (loading || !sessionChecked) {
    return <ProfileSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <StatusBanner variant="error">
          {error ?? "Could not load your profile."}
        </StatusBanner>
        {userId ? (
          <button
            type="button"
            onClick={() => void load(userId)}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <ProfileView
      data={data}
      onUserUpdated={(u) => setData((d) => (d ? { ...d, user: u } : d))}
      onLogout={() => {
        clearSession();
        router.push("/login");
        router.refresh();
      }}
    />
  );
}

/* ----------------------------------------------------------------- */
/* Main view                                                          */
/* ----------------------------------------------------------------- */

function ProfileView({
  data,
  onUserUpdated,
  onLogout,
}: {
  data: Loaded;
  onUserUpdated: (u: UserResponse) => void;
  onLogout: () => void;
}) {
  const { user, account } = data;

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white shadow-md shadow-emerald-600/30 ring-4 ring-white">
            {initials(user.name, user.surname)}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              {user.name} {user.surname}
            </h1>
            <p className="mt-0.5 truncate text-sm text-zinc-600">
              {account.email} · <span className="font-medium">{user.userType}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <StateBadge state={account.accountState} />
              <span className="text-zinc-500">
                Member since {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <ProfileForm user={user} onUpdated={onUserUpdated} />

      <AccountInfoCard account={account} />

      <ChangePasswordForm userId={user.id} />

      <DangerZone onLogoutAll={onLogout} />
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Edit name / surname                                                */
/* ----------------------------------------------------------------- */

function ProfileForm({
  user,
  onUpdated,
}: {
  user: UserResponse;
  onUpdated: (u: UserResponse) => void;
}) {
  const [name, setName] = useState(user.name);
  const [surname, setSurname] = useState(user.surname);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const dirty = useMemo(
    () => name.trim() !== user.name || surname.trim() !== user.surname,
    [name, surname, user.name, user.surname]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const trimmedSurname = surname.trim();
    if (!trimmedName || !trimmedSurname) {
      setError("Name and surname cannot be empty.");
      return;
    }
    if (!dirty) return;

    setSaving(true);
    try {
      // Only send changed fields — that's the value-add of PATCH.
      const body: { name?: string; surname?: string } = {};
      if (trimmedName !== user.name) body.name = trimmedName;
      if (trimmedSurname !== user.surname) body.surname = trimmedSurname;

      const updated = await updateUser(user.id, body);
      onUpdated(updated);
      setSuccess("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title="Profile details"
      subtitle="Update how your name appears across Vektra."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}
        {success ? <StatusBanner variant="success">{success}</StatusBanner> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
            />
          </Field>
          <Field label="Surname">
            <input
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              maxLength={120}
              required
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-xs text-zinc-500">
            {dirty
              ? "You have unsaved changes."
              : "Looking good — nothing to save."}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setName(user.name);
                setSurname(user.surname);
                setError(null);
                setSuccess(null);
              }}
              disabled={!dirty || saving}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={!dirty || saving}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </Section>
  );
}

/* ----------------------------------------------------------------- */
/* Account info (read-only)                                            */
/* ----------------------------------------------------------------- */

function AccountInfoCard({ account }: { account: AccountResponse }) {
  return (
    <Section
      title="Account"
      subtitle="Email and state are managed by the platform — contact an admin to change them."
    >
      <dl className="grid gap-4 sm:grid-cols-3">
        <Info label="Email" value={account.email} />
        <Info
          label="State"
          value={<StateBadge state={account.accountState} />}
        />
        <Info label="Last updated" value={formatDateTime(account.updatedAt)} />
      </dl>
    </Section>
  );
}

/* ----------------------------------------------------------------- */
/* Change password                                                     */
/* ----------------------------------------------------------------- */

function ChangePasswordForm({ userId }: { userId: number }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from the current one.");
      return;
    }

    setSaving(true);
    try {
      await changePassword({ userId, currentPassword, newPassword });
      setSuccess("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not change password."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title="Password"
      subtitle="Choose a fresh password — 8 characters minimum."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}
        {success ? <StatusBanner variant="success">{success}</StatusBanner> : null}

        <Field label="Current password">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </Section>
  );
}

/* ----------------------------------------------------------------- */
/* Danger zone — log out from all devices                              */
/* ----------------------------------------------------------------- */

function DangerZone({ onLogoutAll }: { onLogoutAll: () => void }) {
  const [confirming, setConfirming] = useState(false);

  // NOTE: with the current backend Spring Security is permitAll() and no
  // real JWTs are issued or validated, so there is nothing server-side to
  // revoke. Clearing the local session is genuinely "all devices" for now.
  // Once tokens are introduced, this is also the spot to call a future
  // POST /v1/auth/logout-all endpoint that bumps a per-account token
  // version, invalidating tokens issued before the bump.
  return (
    <section className="overflow-hidden rounded-2xl border border-red-200 bg-red-50/40 shadow-sm">
      <div className="border-b border-red-200/70 bg-white/60 px-5 py-4">
        <h2 className="text-base font-semibold text-red-900">Danger zone</h2>
        <p className="text-xs text-red-800/80">
          Sign out everywhere this device knows about.
        </p>
      </div>

      <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-red-900">
            Log out from all devices
          </p>
          <p className="text-xs text-red-800/80">
            Clears your local session and sends you to the login page.
          </p>
        </div>

        {confirming ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onLogoutAll}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
            >
              Yes, log me out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Log out everywhere
          </button>
        )}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- */
/* Layout helpers                                                      */
/* ----------------------------------------------------------------- */

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        {subtitle ? (
          <p className="text-xs text-zinc-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-zinc-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2.5 ring-1 ring-zinc-100">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-zinc-800">
        {value}
      </dd>
    </div>
  );
}

function StateBadge({ state }: { state: AccountResponse["accountState"] }) {
  const cls =
    state === "ACTIVE"
      ? "bg-emerald-100 text-emerald-800"
      : state === "PENDING"
        ? "bg-amber-100 text-amber-900"
        : "bg-zinc-200 text-zinc-800";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {state}
    </span>
  );
}

function NotSignedIn() {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">
        You&apos;re not signed in
      </h2>
      <p className="text-sm text-zinc-600">
        Log in to view and edit your profile.
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        <Link
          href="/login"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading profile">
      <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
      <div className="h-52 animate-pulse rounded-2xl bg-zinc-100" />
      <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
      <div className="h-56 animate-pulse rounded-2xl bg-zinc-100" />
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Formatting                                                          */
/* ----------------------------------------------------------------- */

function initials(name: string, surname: string): string {
  const a = (name?.[0] ?? "").toUpperCase();
  const b = (surname?.[0] ?? "").toUpperCase();
  return `${a}${b}` || "V";
}

function formatDate(iso: string): string {
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

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
