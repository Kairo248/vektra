"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signup } from "@/services/api";
import { setStoredSession } from "@/lib/session";
import { StatusBanner } from "@/components/StatusBanner";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signup({ name, surname, email, password });
      setStoredSession(res.user.id, res.accessToken ?? undefined);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Create account</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Your account starts as <strong>PENDING</strong> until an admin
          activates it.
        </p>
      </div>

      {success && (
        <StatusBanner variant="success">
          Account created. Redirecting to dashboard…
        </StatusBanner>
      )}
      {error && <StatusBanner variant="error">{error}</StatusBanner>}

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Name
          </label>
          <input
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Surname
          </label>
          <input
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            autoComplete="family-name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Email
          </label>
          <input
            required
            type="email"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Password
          </label>
          <input
            required
            type="password"
            minLength={8}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-zinc-500">At least 8 characters.</p>
        </div>
        <button
          type="submit"
          disabled={loading || success}
          className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Sign up"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-emerald-800 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
