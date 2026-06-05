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
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
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

  function handleCapsLock(
    e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>
  ) {
    const ev = e as unknown as { getModifierState?: (k: string) => boolean };
    if (typeof ev.getModifierState === "function") {
      setCapsLockOn(ev.getModifierState("CapsLock"));
    }
  }

  if (!ready || userId != null) return null;

  return (
    <div className="w-full max-w-5xl">
      <div className="grid overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl ring-1 ring-zinc-900/5 md:grid-cols-[1.1fr_1fr]">
        {/* Left: branded admin panel */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-900 p-10 text-zinc-100 md:flex">
          {/* Decorative grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          {/* Glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-700/20 blur-3xl"
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-emerald-200/90 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.7)]" />
              Restricted area
            </div>
            <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight">
              Vektra <span className="text-emerald-300">Admin</span> Console
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-300">
              Manage users, monitor task completions, and oversee the platform
              from a single secure workspace.
            </p>
          </div>

          <ul className="relative mt-10 space-y-3 text-sm text-zinc-300">
            {[
              "Role-based access control",
              "Audit-ready activity logs",
              "Real-time platform metrics",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <CheckIcon className="h-4 w-4 flex-none text-emerald-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="relative mt-10 flex items-center gap-2 text-xs text-zinc-400">
            <LockIcon className="h-3.5 w-3.5" />
            <span>
              Authorized personnel only. All sessions are logged and monitored.
            </span>
          </div>
        </aside>

        {/* Right: form */}
        <section className="p-7 sm:p-10">
          <div className="mx-auto w-full max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <ShieldIcon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Administrator
              </span>
            </div>

            <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900">
              Sign in to your console
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600">
              Use your administrator credentials to continue.
            </p>

            {error && (
              <div className="mt-5">
                <StatusBanner variant="error">{error}</StatusBanner>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
                >
                  Email address
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <MailIcon className="h-4 w-4" />
                  </span>
                  <input
                    id="email"
                    required
                    type="email"
                    placeholder="admin@vektra.app"
                    className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
                >
                  Password
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <LockIcon className="h-4 w-4" />
                  </span>
                  <input
                    id="password"
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-9 pr-11 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleCapsLock}
                    onKeyUp={handleCapsLock}
                    onClick={handleCapsLock}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    title={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 hover:text-zinc-800 focus:text-zinc-800 focus:outline-none"
                    tabIndex={0}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {capsLockOn && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                    <WarningIcon className="h-3.5 w-3.5" />
                    Caps Lock is on
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <SpinnerIcon className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in to console
                    <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <LockIcon className="h-3.5 w-3.5" />
                Secured session
              </span>
              <span>v1.0</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* --- Icons (inline, no extra deps) --- */

function ShieldIcon({ className = "" }: { className?: string }) {
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
      <path d="M12 3l8 3v6c0 4.5-3.2 8.5-8 9-4.8-.5-8-4.5-8-9V6l8-3z" />
      <path d="M9.5 12.5l2 2 3.5-4" />
    </svg>
  );
}

function MailIcon({ className = "" }: { className?: string }) {
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function LockIcon({ className = "" }: { className?: string }) {
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
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ className = "" }: { className?: string }) {
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
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className = "" }: { className?: string }) {
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
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A10.9 10.9 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 4" />
      <path d="M6.6 6.6A17 17 0 0 0 2 12s3.5 6 10 6c1.6 0 3-.3 4.3-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
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

function WarningIcon({ className = "" }: { className?: string }) {
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
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v5" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function ArrowRightIcon({ className = "" }: { className?: string }) {
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
      <path d="M5 12h14" />
      <path d="M13 5l7 7-7 7" />
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
