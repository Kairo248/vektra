"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteFaceCredential,
  enrollFace,
  getFaceStatus,
} from "@/services/api";
import type { FaceStatusResponse } from "@/types/vektra";
import { FaceCaptureCard } from "@/components/FaceCaptureCard";
import { StatusBanner } from "@/components/StatusBanner";

/**
 * Profile-page section for enabling / re-enrolling / disabling face login.
 *
 * Loaded with `next/dynamic({ ssr: false })` from the profile page so
 * face-api / TF.js never enter the server bundle. (FaceCaptureCard is the
 * actual heavy import; this wrapper is just plumbing on top.)
 *
 * State machine:
 *   - `loading` while we GET /v1/users/{id}/face
 *   - `idle` when the request settled — `status.enrolled` decides the UI
 *   - `capturing` once the user clicks Enable / Re-enroll
 *   - `confirmingDelete` once the user clicks Disable
 */

type Phase = "loading" | "idle" | "capturing" | "confirmingDelete";

interface Props {
  userId: number;
}

export default function FaceLoginSection({ userId }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [status, setStatus] = useState<FaceStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const next = await getFaceStatus(userId);
      setStatus(next);
      setPhase("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load face status.");
      setPhase("idle");
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onEmbedding(embedding: number[]) {
    setError(null);
    setSuccess(null);
    try {
      await enrollFace(userId, embedding);
      setSuccess("Face enrolled. You can now sign in by face.");
      await refresh();
      setPhase("idle");
    } catch (e) {
      // Re-throw so FaceCaptureCard surfaces it inline and the user can
      // retry without re-mounting the camera.
      throw e instanceof Error ? e : new Error("Could not enroll face.");
    }
  }

  async function onDelete() {
    setError(null);
    setSuccess(null);
    try {
      await deleteFaceCredential(userId);
      setSuccess("Face login disabled.");
      setStatus({ enrolled: false });
      setPhase("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disable face login.");
      setPhase("idle");
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-base font-semibold text-zinc-900">Face login</h2>
        <p className="text-xs text-zinc-500">
          Sign in with your face instead of an email and password. Your face
          stays on this device — only a 128-number signature is stored.
        </p>
      </div>

      <div className="space-y-4 px-5 py-5">
        {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}
        {success ? (
          <StatusBanner variant="success">{success}</StatusBanner>
        ) : null}

        {phase === "loading" ? (
          <div className="h-10 w-48 animate-pulse rounded bg-zinc-100" />
        ) : phase === "capturing" ? (
          <CaptureFlow
            label={status?.enrolled ? "Re-enroll face" : "Enroll face"}
            onCancel={() => setPhase("idle")}
            onEmbedding={onEmbedding}
          />
        ) : phase === "confirmingDelete" ? (
          <ConfirmDelete
            onCancel={() => setPhase("idle")}
            onConfirm={onDelete}
          />
        ) : (
          <IdleState
            status={status}
            onEnroll={() => {
              setSuccess(null);
              setPhase("capturing");
            }}
            onDisable={() => {
              setSuccess(null);
              setPhase("confirmingDelete");
            }}
          />
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function IdleState({
  status,
  onEnroll,
  onDisable,
}: {
  status: FaceStatusResponse | null;
  onEnroll: () => void;
  onDisable: () => void;
}) {
  if (!status || !status.enrolled) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900">Not enrolled</p>
          <p className="text-xs text-zinc-500">
            Enable face login from this device to skip your password next time.
          </p>
        </div>
        <button
          type="button"
          onClick={onEnroll}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
        >
          Enable face login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-emerald-900">Enrolled</p>
        <p className="text-xs text-zinc-500">
          {status.enrolledAt
            ? `Set up on ${formatDateTime(status.enrolledAt)}.`
            : "Face login is active for this account."}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEnroll}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Re-enroll
        </button>
        <button
          type="button"
          onClick={onDisable}
          className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Disable
        </button>
      </div>
    </div>
  );
}

function CaptureFlow({
  label,
  onCancel,
  onEmbedding,
}: {
  label: string;
  onCancel: () => void;
  onEmbedding: (embedding: number[]) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-900">{label}</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-medium text-zinc-500 underline-offset-2 hover:underline"
        >
          Cancel
        </button>
      </div>
      <FaceCaptureCard
        submitLabel={label}
        busyLabel="Saving…"
        onEmbedding={onEmbedding}
      />
    </div>
  );
}

function ConfirmDelete({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-red-900">Disable face login?</p>
        <p className="text-xs text-red-800/80">
          Your stored face signature will be deleted. You can re-enroll any time.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
        >
          Yes, disable
        </button>
      </div>
    </div>
  );
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
    return iso;
  }
}
