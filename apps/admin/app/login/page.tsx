"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBanner } from "@/components/StatusBanner";

export default function LoginPage() {
  const router = useRouter();
  const { login, userId, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && userId != null) {
      router.replace("/");
    }
  }, [ready, userId, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (!ready || userId != null) return null;

  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Log in</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Sign in with an administrator account.
        </p>
      </div>

      {error && <StatusBanner variant="error">{error}</StatusBanner>}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
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
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
