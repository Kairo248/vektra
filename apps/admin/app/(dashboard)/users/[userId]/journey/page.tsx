"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  adminBackfillJourney,
  adminGetUserJourney,
} from "@/services/api";
import type {
  MemberJourneyEventResponse,
  MemberJourneyEventType,
} from "@/types/vektra";
import { AccountStateBadge } from "@/components/admin/AccountStateBadge";
import { StatusBanner } from "@/components/StatusBanner";

type Filter = "ALL" | MemberJourneyEventType;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "REWARD_EARNED", label: "Rewards" },
  { id: "PURCHASE", label: "Purchases" },
  { id: "TRANSFER_OUT", label: "Sent" },
  { id: "TRANSFER_IN", label: "Received" },
  { id: "SIGNUP", label: "Signup" },
  { id: "ACCOUNT_ACTIVATED", label: "Activation" },
];

export default function UserJourneyPage() {
  const params = useParams();
  const userId = Number(params.userId);
  const [journey, setJourney] = useState<Awaited<
    ReturnType<typeof adminGetUserJourney>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [backfilling, setBackfilling] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(userId)) {
      setError("Invalid user id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setJourney(await adminGetUserJourney(userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load journey");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const events = useMemo(() => {
    if (!journey) return [];
    if (filter === "ALL") return journey.events;
    return journey.events.filter((e) => e.eventType === filter);
  }, [journey, filter]);

  async function backfill() {
    setBackfilling(true);
    setFeedback(null);
    try {
      const summary = await adminBackfillJourney(userId);
      setFeedback(
        `Backfill complete: ${summary.eventsCreated} created, ${summary.eventsSkipped} skipped.`
      );
      await load();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setBackfilling(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/users"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
          >
            ← Back to users
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Member journey
          </h1>
          {journey && (
            <p className="mt-1 text-sm text-zinc-600">
              {journey.name} {journey.surname} · {journey.email}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={backfill}
          disabled={backfilling || loading}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-60"
        >
          {backfilling ? "Backfilling…" : "Backfill history"}
        </button>
      </div>

      {feedback && (
        <StatusBanner variant={feedback.startsWith("Backfill") ? "success" : "error"}>
          {feedback}
        </StatusBanner>
      )}
      {error && <StatusBanner variant="error">{error}</StatusBanner>}

      {journey && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Balance" value={`${journey.balance.toLocaleString()} V`} />
          <Stat label="Events" value={String(journey.events.length)} />
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Account
            </p>
            <div className="mt-2">
              <AccountStateBadge state={journey.accountState} />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === f.id
                ? "bg-emerald-700 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading journey…</p>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-600">No journey events yet.</p>
            <p className="mt-1 text-xs text-zinc-500">
              Use &quot;Backfill history&quot; to import tasks, purchases, and transfers from
              before this feature existed.
            </p>
          </div>
        ) : (
          <ol className="relative border-l border-zinc-200 pl-6">
            {events.map((event) => (
              <TimelineItem key={event.id} event={event} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function TimelineItem({ event }: { event: MemberJourneyEventResponse }) {
  const meta = eventMeta(event.eventType);
  const when = new Date(event.occurredAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <li className="relative mb-8 last:mb-0">
      <span
        className={`absolute -left-[1.85rem] flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white ${meta.bg}`}
        aria-hidden
      >
        {meta.icon}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-semibold text-zinc-900">{event.title}</p>
          <time className="text-xs text-zinc-500 tabular-nums">{when}</time>
        </div>
        {event.subtitle && (
          <p className="mt-0.5 text-sm text-zinc-600">{event.subtitle}</p>
        )}
        {event.amount != null && (
          <p
            className={`mt-2 inline-flex rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ${
              event.direction === "IN"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-rose-50 text-rose-800"
            }`}
          >
            {event.direction === "IN" ? "+" : "−"}
            {event.amount.toLocaleString()} V
          </p>
        )}
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}

function eventMeta(type: MemberJourneyEventType): {
  bg: string;
  icon: ReactNode;
} {
  switch (type) {
    case "REWARD_EARNED":
      return { bg: "bg-emerald-100 text-emerald-800", icon: <CoinIcon /> };
    case "PURCHASE":
      return { bg: "bg-violet-100 text-violet-800", icon: <BagIcon /> };
    case "TRANSFER_OUT":
      return { bg: "bg-amber-100 text-amber-800", icon: <ArrowOutIcon /> };
    case "TRANSFER_IN":
      return { bg: "bg-sky-100 text-sky-800", icon: <ArrowInIcon /> };
    case "SIGNUP":
      return { bg: "bg-zinc-100 text-zinc-700", icon: <UserIcon /> };
    case "ACCOUNT_ACTIVATED":
      return { bg: "bg-emerald-100 text-emerald-800", icon: <CheckIcon /> };
    default:
      return { bg: "bg-zinc-100 text-zinc-700", icon: <DotIcon /> };
  }
}

function CoinIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}
function ArrowOutIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}
function ArrowInIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
function DotIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 8 8">
      <circle cx={4} cy={4} r={3} />
    </svg>
  );
}
