"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { faceLogin } from "@/services/api";
import { setStoredSession } from "@/lib/session";
import { FaceCaptureCard } from "@/components/FaceCaptureCard";

/**
 * Login surface for face authentication. Renders a collapsed "Continue
 * with face" entry; expanding it mounts the camera card. We keep it
 * collapsed by default so users who only want password login never get
 * the camera permission prompt.
 *
 * Loaded with `next/dynamic({ ssr: false })` from the login page so
 * face-api / TF.js never enter the server bundle.
 */
export default function FaceLoginPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white py-2.5 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
      >
        <FaceIcon className="h-4 w-4 text-emerald-700" />
        Continue with face
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Sign in with face</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-medium text-zinc-500 underline-offset-2 hover:underline"
        >
          Cancel
        </button>
      </div>

      <FaceCaptureCard
        submitLabel="Sign in with face"
        busyLabel="Signing in…"
        onEmbedding={async (embedding) => {
          const res = await faceLogin(embedding);
          setStoredSession(res.user.id, res.accessToken ?? undefined);
          router.push("/dashboard");
        }}
      />
    </div>
  );
}

function FaceIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 7V5a1 1 0 0 1 1-1h2" />
      <path d="M20 7V5a1 1 0 0 0-1-1h-2" />
      <path d="M4 17v2a1 1 0 0 0 1 1h2" />
      <path d="M20 17v2a1 1 0 0 1-1 1h-2" />
      <circle cx="9" cy="11" r="0.6" fill="currentColor" />
      <circle cx="15" cy="11" r="0.6" fill="currentColor" />
      <path d="M9 15c.8.7 1.9 1 3 1s2.2-.3 3-1" />
    </svg>
  );
}
