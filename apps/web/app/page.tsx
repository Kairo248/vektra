import Link from "next/link";
import { HomeStats } from "@/components/HomeStats";

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-24">
      {/* ---------- HERO ---------- */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-emerald-100/70 bg-white px-5 py-12 shadow-sm sm:rounded-3xl sm:px-12 sm:py-24">
        {/* Background grid */}
        <div className="pointer-events-none absolute inset-0 bg-grid mask-radial-fade" aria-hidden />

        {/* Floating gradient blobs */}
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-300/40 blur-3xl animate-blob"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 top-24 h-80 w-80 rounded-full bg-teal-300/40 blur-3xl animate-blob delay-300"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-lime-200/50 blur-3xl animate-blob delay-500"
          aria-hidden
        />

        <div className="relative grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Copy */}
          <div className="space-y-5 sm:space-y-7">
            <div className="inline-flex animate-fade-in-up items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Now live — start earning today
            </div>

            <h1 className="animate-fade-in-up delay-100 text-[2.25rem] font-bold leading-[1.08] tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
              Complete tasks.
              <br className="hidden sm:block" />{" "}
              Earn{" "}
              <span className="text-gradient-emerald">Vektras</span>
              <span className="text-emerald-600">.</span>
            </h1>

            <p className="animate-fade-in-up delay-200 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
              A modern rewards platform where every task you finish turns into
              real value. Sign up, pick a task, get paid in Vektras — it&apos;s
              that simple.
            </p>

            <div className="animate-fade-in-up delay-300 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/signup"
                className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-600/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:w-auto sm:justify-start"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                Get started
                <svg
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>

              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white/80 px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-800 sm:w-auto sm:justify-start"
              >
                Log in
              </Link>

              <Link
                href="/tasks"
                className="group inline-flex w-full items-center justify-center gap-1 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:text-emerald-700 sm:w-auto sm:justify-start sm:px-2 sm:py-3"
              >
                Browse tasks
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>

            {/* Trust row */}
            <div className="animate-fade-in-up delay-400 flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-zinc-500 sm:pt-2">
              <div className="flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-emerald-600" />
                Free to join
              </div>
              <div className="flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-emerald-600" />
                Instant rewards
              </div>
              <div className="flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-emerald-600" />
                Secure wallet
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative h-[300px] animate-fade-in delay-300 sm:h-[420px]">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* ---------- STATS (live from /v1/admin/completed-tasks) ---------- */}
      <HomeStats />

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="space-y-8 sm:space-y-10">
        <div className="max-w-2xl space-y-3">
          <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            How it works
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Three steps to your first reward.
          </h2>
          <p className="text-sm text-zinc-600 sm:text-base">
            We&apos;ve cut the busywork. Create an account, find something
            you&apos;re good at, and watch your Vektras stack up.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-600/5"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-100/0 blur-2xl transition-all duration-500 group-hover:bg-emerald-200/60" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                    {step.icon}
                  </div>
                  <span className="text-5xl font-bold text-zinc-100 transition-colors duration-300 group-hover:text-emerald-100">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-zinc-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section className="grid gap-5 md:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/60 p-7 transition-all duration-300 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-600/5"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition-all duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:ring-emerald-600">
                {f.icon}
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-zinc-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-600">{f.body}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 px-5 py-12 text-center shadow-xl sm:rounded-3xl sm:px-12 sm:py-20">
        <div
          className="pointer-events-none absolute -left-16 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-white/10 blur-3xl animate-blob"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-teal-300/20 blur-3xl animate-blob delay-300"
          aria-hidden
        />

        <div className="relative mx-auto max-w-2xl space-y-5">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to start earning?
          </h2>
          <p className="text-sm text-emerald-50/90 sm:text-base">
            Join Vektra today — your first task is just a click away.
          </p>
          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <Link
              href="/signup"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-800 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:w-auto"
            >
              Create your account
              <svg
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 sm:w-auto"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- Data ---------- */

const STEPS = [
  {
    title: "Create your account",
    body: "Sign up in seconds with just an email. No credit card, no friction.",
    icon: <UserPlusIcon className="h-6 w-6" />,
  },
  {
    title: "Pick a task",
    body: "Browse curated tasks that match your skills and available time.",
    icon: <ListIcon className="h-6 w-6" />,
  },
  {
    title: "Get paid in Vektras",
    body: "Finish, submit, and watch rewards land in your wallet instantly.",
    icon: <CoinIcon className="h-6 w-6" />,
  },
];

const FEATURES = [
  {
    title: "Secure wallet",
    body: "Your Vektras are safely tracked with full transaction history at all times.",
    icon: <ShieldIcon className="h-5 w-5" />,
  },
  {
    title: "Real-time tracking",
    body: "See task progress and earnings update instantly across every device.",
    icon: <BoltIcon className="h-5 w-5" />,
  },
  {
    title: "Curated tasks",
    body: "Every task is reviewed for quality so your time is always well-spent.",
    icon: <SparkleIcon className="h-5 w-5" />,
  },
  {
    title: "Community-first",
    body: "Built with creators and earners in mind. Your feedback shapes Vektra.",
    icon: <HeartIcon className="h-5 w-5" />,
  },
];

/* ---------- Hero Visual ---------- */

function HeroVisual() {
  return (
    <div className="relative h-full w-full">
      {/* Soft glow */}
      <div className="absolute inset-0 mx-auto h-56 w-56 translate-y-8 rounded-full bg-emerald-400/20 blur-3xl sm:h-72 sm:w-72" />

      {/* Orbit ring */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-emerald-200/70 animate-spin-slow sm:h-[340px] sm:w-[340px]" />

      {/* Central card */}
      <div className="absolute left-1/2 top-1/2 w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:w-[280px] sm:p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 sm:text-xs">
            Wallet balance
          </div>
          <div className="flex h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 sm:mt-3">
          <span className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            ₵ 1,248
          </span>
          <span className="text-xs font-semibold text-emerald-600 sm:text-sm">
            +12.4%
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 sm:mt-4">
          <div
            className="h-full w-3/4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 bg-[length:200%_100%]"
            style={{ animation: "shimmer 2.5s linear infinite" }}
          />
        </div>
        <div className="mt-4 space-y-2 sm:mt-5 sm:space-y-2.5">
          {[
            { label: "Logo design review", value: "+ ₵120" },
            { label: "Survey response", value: "+ ₵40" },
            { label: "Video transcription", value: "+ ₵85" },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-lg bg-zinc-50/80 px-2.5 py-1.5 text-[11px] sm:px-3 sm:py-2 sm:text-xs"
            >
              <span className="text-zinc-600">{row.label}</span>
              <span className="font-semibold text-emerald-700">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating coin top-left */}
      <div className="absolute left-1 top-2 animate-float-slow sm:left-2 sm:top-4">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-pulse-ring" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-600/40 ring-4 ring-white sm:h-16 sm:w-16">
            <span className="text-lg font-bold sm:text-2xl">₵</span>
          </div>
        </div>
      </div>

      {/* Floating badge bottom-right */}
      <div className="absolute bottom-2 right-1 animate-float-slower delay-200 sm:bottom-6 sm:right-2">
        <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-2.5 py-1.5 shadow-lg sm:px-3 sm:py-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 sm:h-7 sm:w-7">
            <CheckIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="pr-0.5 text-[11px] sm:pr-1 sm:text-xs">
            <div className="font-semibold text-zinc-900">Task complete</div>
            <div className="text-zinc-500">+ ₵40 Vektras</div>
          </div>
        </div>
      </div>

      {/* Floating mini-coin top-right (hidden on phones to avoid clutter) */}
      <div className="absolute right-6 top-16 hidden animate-float-slow delay-300 sm:block">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-300 to-emerald-500 text-white shadow-md ring-4 ring-white">
          <span className="text-sm font-bold">₵</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Icons ---------- */

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path
        fillRule="evenodd"
        d="M16.704 5.296a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 111.414-1.414l2.793 2.793 6.793-6.793a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function UserPlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function ListIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function CoinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9.5a3 3 0 0 0-3-1.5h0a3 3 0 0 0 0 6h0a3 3 0 0 1 0 6h0a3 3 0 0 1-3-1.5" />
      <line x1="12" y1="6" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12" y2="18" />
    </svg>
  );
}

function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function BoltIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function SparkleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}

function HeartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
