/**
 * Thin wrapper around @vladmandic/face-api that owns model loading and
 * embedding extraction.
 *
 * The library, the models, and TF.js itself are heavy and browser-only, so
 * everything in here is `import`-from-anywhere-safe but only executes when a
 * caller actually invokes a function — there is no top-level work. Callers
 * should still keep their UI in client components and rely on
 * `next/dynamic({ ssr: false })` so this module is only ever pulled into the
 * browser bundle.
 *
 * Invariants we rely on (and that the backend assumes):
 *   - 128 floats per descriptor (FaceNet-style).
 *   - L2-normalized to unit length.
 *   - Wire format: plain `number[]`. The Spring DTO is `float[]`; Jackson
 *     parses a JSON number array into that directly.
 */

import * as faceapi from "@vladmandic/face-api";

/** Where the four model files (3 manifests + 3 weight bins) live. Served
 *  out of `apps/web/public/models/`, so this is the same on every host. */
const MODEL_URL = "/models";

/**
 * face-api caches loaded weights internally, so subsequent calls are cheap.
 * The single in-flight `Promise` keeps two parallel mounts (e.g. login
 * page + profile page in different tabs of the same SPA history) from
 * downloading 7 MB of weights twice.
 */
let modelsPromise: Promise<void> | null = null;

export class ModelLoadError extends Error {
  constructor(cause: unknown) {
    super(
      `Failed to load face models. Check that /models/ is reachable. (${
        cause instanceof Error ? cause.message : String(cause)
      })`
    );
    this.name = "ModelLoadError";
  }
}

export class NoFaceDetectedError extends Error {
  constructor() {
    super("No face detected. Center your face and try again.");
    this.name = "NoFaceDetectedError";
  }
}

export class MultipleFacesError extends Error {
  constructor() {
    super("More than one face detected. Please be alone in the frame.");
    this.name = "MultipleFacesError";
  }
}

/**
 * Idempotent loader for the three nets we need. The first call kicks off
 * the fetch; concurrent callers wait on the same promise.
 */
export async function loadModels(): Promise<void> {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
      } catch (err) {
        // Reset so a transient network failure can be retried.
        modelsPromise = null;
        throw new ModelLoadError(err);
      }
    })();
  }
  return modelsPromise;
}

/**
 * Detect a single face in `source` and return its 128-d L2-normalized
 * descriptor.
 *
 * face-api's recognizer outputs the raw FaceNet activations (typical
 * magnitude 5–20), NOT a unit vector. The Spring backend rejects anything
 * whose L2 norm drifts more than `vektra.face.norm-tolerance` (0.05) from
 * 1.0, so we normalize here before returning. This also keeps the tuned
 * Euclidean threshold (0.5) meaningful — distance between unit vectors and
 * raw activations would not be on the same scale.
 *
 * Throws:
 *   - `NoFaceDetectedError` when 0 faces in frame
 *   - `MultipleFacesError` when 2+ faces in frame (1:N login + 1:N enrollment
 *     are both ambiguous in that case)
 *   - `ModelLoadError` when models couldn't be fetched
 */
export async function extractEmbedding(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<Float32Array> {
  await loadModels();

  // TinyFaceDetector defaults: inputSize 416, scoreThreshold 0.5. Lowering
  // the score a touch helps in dim conference-room lighting without
  // introducing obvious false positives in our manual testing.
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 416,
    scoreThreshold: 0.4,
  });

  const detections = await faceapi
    .detectAllFaces(source, options)
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (detections.length === 0) throw new NoFaceDetectedError();
  if (detections.length > 1) throw new MultipleFacesError();

  return l2Normalize(detections[0].descriptor);
}

/** Convenience: convert the descriptor to the `number[]` shape we send on
 *  the wire. Done as its own helper so the call sites don't sprinkle
 *  `Array.from(...)` everywhere. */
export function descriptorToArray(d: Float32Array): number[] {
  return Array.from(d);
}

/**
 * Scale `vec` to unit length in place, returning the same buffer for
 * convenience. We accumulate in `number` (float64) and only narrow back
 * to float32 on write so a long vector with small components doesn't
 * lose precision in the sum-of-squares step.
 *
 * Edge case: a zero vector (which face-api would never produce in
 * practice for a real detection) is left untouched — dividing by zero
 * here would silently corrupt every component to NaN, and the backend
 * would reject NaN with a clearer "non-finite values" error anyway.
 */
function l2Normalize(vec: Float32Array): Float32Array {
  let sumSquares = 0;
  for (let i = 0; i < vec.length; i++) sumSquares += vec[i] * vec[i];
  const norm = Math.sqrt(sumSquares);
  if (norm === 0 || !Number.isFinite(norm)) return vec;
  for (let i = 0; i < vec.length; i++) vec[i] = vec[i] / norm;
  return vec;
}
