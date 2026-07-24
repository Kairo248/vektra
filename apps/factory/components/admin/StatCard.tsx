import type { ReactNode } from "react";

type Tone = "emerald" | "sky" | "amber" | "violet" | "rose" | "zinc";

const toneStyles: Record<Tone, { iconBg: string; iconText: string; ring: string }> = {
  emerald: {
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-700",
    ring: "ring-emerald-100",
  },
  sky: {
    iconBg: "bg-sky-50",
    iconText: "text-sky-700",
    ring: "ring-sky-100",
  },
  amber: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-700",
    ring: "ring-amber-100",
  },
  violet: {
    iconBg: "bg-violet-50",
    iconText: "text-violet-700",
    ring: "ring-violet-100",
  },
  rose: {
    iconBg: "bg-rose-50",
    iconText: "text-rose-700",
    ring: "ring-rose-100",
  },
  zinc: {
    iconBg: "bg-zinc-100",
    iconText: "text-zinc-700",
    ring: "ring-zinc-200",
  },
};

export function StatCard({
  label,
  value,
  hint,
  tone = "emerald",
  loading = false,
  error = false,
  icon,
}: {
  label: string;
  value: number | string | null | undefined;
  hint?: string;
  tone?: Tone;
  loading?: boolean;
  error?: boolean;
  icon: ReactNode;
}) {
  const t = toneStyles[tone];
  const display =
    error
      ? "—"
      : loading
        ? "—"
        : typeof value === "number"
          ? value.toLocaleString()
          : value ?? "—";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${t.iconBg} ${t.iconText} ${t.ring}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-1 text-3xl font-bold tabular-nums tracking-tight ${
          loading ? "animate-pulse text-zinc-300" : "text-zinc-900"
        }`}
      >
        {display}
      </p>
      {hint && (
        <p
          className={`mt-1 text-xs ${
            error ? "text-rose-600" : "text-zinc-500"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
