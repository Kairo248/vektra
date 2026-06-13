"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MultipleFacesError,
  NoFaceDetectedError,
  descriptorToArray,
  extractEmbedding,
  loadModels,
} from "@/lib/face";
import { StatusBanner } from "@/components/StatusBanner";

/* ────────────────────────────────────────────────────────────────────────
 * FaceCaptureCard
 *
 * Reusable surface for "ask the user's permission, show the camera,
 * extract a face embedding". Used by both the login panel and the profile
 * enrollment section.
 *
 * The parent owns what to do with the embedding (POST to face-login vs
 * face-enroll) — this component just hands it back as `number[]` of
 * length 128.
 *
 * Why one component instead of two: enrollment and login both want the
 * exact same UX (preview, single Capture button, the same error language
 * for "no face" / "multiple faces" / "permission denied"). Forking would
 * just produce two near-identical files that drift.
 * ──────────────────────────────────────────────────────────────────── */

type Phase =
  | "checking" // detecting browser / secure context support
  | "starting" // calling getUserMedia
  | "live" // stream attached, awaiting user click
  | "capturing" // running detector + descriptor
  | "submitting" // parent is doing something with the embedding
  | "blocked"; // unrecoverable — see `error`

interface Props {
  /** Called once we have a valid 128-d embedding. The promise it returns
   *  drives the "submitting" phase; if it rejects, the message is shown
   *  inline and the user can try again. */
  onEmbedding: (embedding: number[]) => Promise<void> | void;
  /** Verb on the capture button. e.g. "Sign in" or "Enroll face". */
  submitLabel?: string;
  /** Verb shown while `onEmbedding` is in flight. */
  busyLabel?: string;
  /** Optional — let the parent disable capture (e.g. during a cooldown). */
  disabled?: boolean;
}

export function FaceCaptureCard({
  onEmbedding,
  submitLabel = "Capture",
  busyLabel = "Working…",
  disabled = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);

  // Stop the camera on unmount. We also stop it imperatively from the
  // capture path so a webcam light doesn't linger after a successful
  // login.
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
  }, []);

  useEffect(() => stopStream, [stopStream]);

  // Boot the camera as soon as the component mounts. The two pre-flight
  // failures we surface explicitly are "browser too old" (no
  // mediaDevices) and "served over plain http but not on localhost"
  // (no secure context), because the actual getUserMedia error in those
  // cases is misleading.
  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (typeof window === "undefined") return;
      if (!window.isSecureContext) {
        if (cancelled) return;
        setError(
          "Camera requires a secure context — open the site over HTTPS or http://localhost."
        );
        setPhase("blocked");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        if (cancelled) return;
        setError(
          "This browser does not expose a camera. Try Chrome, Firefox, or Edge."
        );
        setPhase("blocked");
        return;
      }

      setPhase("starting");
      try {
        // Kick off the model fetch in parallel with the camera prompt.
        // Both resolve before the user can realistically click Capture,
        // so the perceived latency is near zero.
        const modelP = loadModels().catch(() => {
          /* surfaced on capture instead, so a slow CDN doesn't block
             the preview from showing */
        });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360, facingMode: "user" },
          audio: false,
        });
        await modelP;
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {
            /* autoplay can be flaky on some browsers; the user clicking
               Capture still works because the video element is ready
               either way. */
          });
        }
        setPhase("live");
      } catch (err) {
        if (cancelled) return;
        setError(friendlyMediaError(err));
        setPhase("blocked");
      }
    }

    void start();
    return () => {
      cancelled = true;
    };
    // We intentionally only run this once — re-running would re-prompt
    // for the camera every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCapture() {
    const video = videoRef.current;
    if (!video || phase !== "live" || disabled) return;

    setError(null);
    setPhase("capturing");
    try {
      const descriptor = await extractEmbedding(video);
      setPhase("submitting");
      await onEmbedding(descriptorToArray(descriptor));
      // We do NOT auto-stop the camera here: the parent might want
      // to allow a re-try after a recoverable error. Unmount stops it.
      setPhase("live");
    } catch (err) {
      if (err instanceof NoFaceDetectedError || err instanceof MultipleFacesError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Try again.");
      }
      setPhase("live");
    }
  }

  const buttonDisabled =
    disabled ||
    phase === "checking" ||
    phase === "starting" ||
    phase === "capturing" ||
    phase === "submitting" ||
    phase === "blocked";

  const buttonLabel =
    phase === "starting"
      ? "Starting camera…"
      : phase === "capturing"
        ? "Reading face…"
        : phase === "submitting"
          ? busyLabel
          : submitLabel;

  return (
    <div className="space-y-3">
      {phase === "blocked" && error ? (
        <StatusBanner variant="error">{error}</StatusBanner>
      ) : null}
      {error && phase !== "blocked" ? (
        <StatusBanner variant="error">{error}</StatusBanner>
      ) : null}

      <div className="overflow-hidden rounded-xl bg-zinc-900 shadow-inner ring-1 ring-zinc-200">
        {/* Mirrored so the preview matches the user's mental model
            (raise right hand → it goes right on screen). The model
            sees the unmirrored stream because `transform` is purely
            CSS — the underlying <video> element data is unchanged. */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="block aspect-[4/3] w-full -scale-x-100 object-cover"
        />
      </div>

      <p className="text-xs text-zinc-500">
        {phase === "live"
          ? "Center your face in the frame, then click below."
          : phase === "starting" || phase === "checking"
            ? "Setting up camera…"
            : phase === "capturing"
              ? "Reading your face — hold still for a moment."
              : phase === "submitting"
                ? "Talking to the server…"
                : "Camera unavailable."}
      </p>

      <button
        type="button"
        onClick={onCapture}
        disabled={buttonDisabled}
        className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

/**
 * Translate the DOMException flavors `getUserMedia` throws into something
 * a user can act on. Names from the Permissions / Media Capture spec.
 */
function friendlyMediaError(err: unknown): string {
  if (err instanceof Error) {
    switch (err.name) {
      case "NotAllowedError":
      case "SecurityError":
        return "Camera permission denied. Allow camera access for this site and reload.";
      case "NotFoundError":
      case "OverconstrainedError":
        return "No camera detected. Plug one in or switch devices.";
      case "NotReadableError":
        return "Camera is in use by another app. Close other tabs / apps and try again.";
      case "AbortError":
        return "Camera start was interrupted. Try again.";
      default:
        return err.message || "Could not access the camera.";
    }
  }
  return "Could not access the camera.";
}
