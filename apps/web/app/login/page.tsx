"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { login } from "@/services/api";
import { setStoredSession } from "@/lib/session";
import { StatusBanner } from "@/components/StatusBanner";

/**
 * Face login pulls in face-api + TF.js (~1 MB compressed JS plus the model
 * weights from /models/). Loading it dynamically with `ssr: false` keeps
 * those heavy deps out of every other route's bundle and prevents Next
 * from trying to evaluate browser-only code on the server.
 */
const FaceLoginPanel = dynamic(() => import("./FaceLoginPanel"), {
  ssr: false,
  loading: () => (
    <div className="h-12 animate-pulse rounded-lg border border-zinc-200 bg-white" />
  ),
});

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login({ email, password });
      setStoredSession(res.user.id, res.accessToken ?? undefined);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Log in</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Use the email and password for your Vektra account.
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

      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-zinc-200" aria-hidden />
        or
        <span className="h-px flex-1 bg-zinc-200" aria-hidden />
      </div>

      <FaceLoginPanel />

      <p className="text-center text-sm text-zinc-600">
        No account?{" "}
        <Link
          href="/signup"
          className="font-medium text-emerald-800 underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
