import axios, { AxiosError } from "axios";
import { clearSession, getAccessToken } from "@/lib/session";
import type {
  AccountResponse,
  AdminUserListItem,
  ApiErrorBody,
  ChangePasswordRequest,
  CreateTaskRequest,
  FaceStatusResponse,
  LoginRequest,
  SignupRequest,
  SignupResponse,
  TaskCompletionResponse,
  TaskCompletionStatus,
  TaskResponse,
  TransactionResponse,
  TransferRequest,
  TransferResponse,
  UpdateTaskStatusRequest,
  UpdateUserRequest,
  UserResponse,
  WalletBalanceResponse,
} from "@/types/vektra";

/**
 * Base URL:
 * - Docker + Nginx: `/api` (browser → Nginx → Spring; same origin, no CORS).
 * - Local Next dev: `/spring-api` → rewrites in `next.config.mjs` to `BACKEND_URL` + `/api/...`.
 * - Or set `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:8080/api` with CORS on the backend).
 */
const baseURL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "/spring-api";

export const apiClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      const url = String(err.config?.url ?? "");
      const isPublicAuth =
        url.includes("/v1/auth/login") ||
        url.includes("/v1/auth/face-login") ||
        url.includes("/v1/users/signup");
      if (!isPublicAuth && typeof window !== "undefined") {
        clearSession();
      }
    }
    return Promise.reject(err);
  }
);

function getErrorMessage(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : "Something went wrong";
  }
  const ax = err as AxiosError<ApiErrorBody>;
  const data = ax.response?.data;

  if (!ax.response) {
    if (ax.code === "ERR_NETWORK" || ax.message === "Network Error") {
      return (
        "Cannot reach the API. Start Spring Boot on port 8080, or set NEXT_PUBLIC_API_URL=http://localhost:8080/api in web/.env.local and restart Next.js."
      );
    }
    return ax.message || "Request failed (no response from server)";
  }

  if (data?.message) return data.message;
  if (data?.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
    return Object.entries(data.fieldErrors)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
  }
  if (ax.response.status === 401) {
    if (data?.message) return data.message;
    const url = String(ax.config?.url ?? "");
    if (url.includes("/v1/auth/login")) {
      return "Invalid email or password";
    }
    if (url.includes("/v1/auth/face-login")) {
      return "Face not recognized";
    }
    return "Session expired or not signed in. Please log in again.";
  }
  if (ax.response.status === 429) {
    return data?.message ?? "Too many attempts. Please wait and try again.";
  }
  if (ax.response.status === 404) {
    return (
      data?.message ??
      "API returned 404. Check URL: Spring expects POST http://localhost:8080/api/v1/auth/login. Fix BACKEND_URL / spring-api proxy or use NEXT_PUBLIC_API_URL."
    );
  }
  if (ax.response.status === 403) return "Not allowed (account may be pending)";
  if (ax.response.status === 409) return "Conflict — maybe already completed";
  return ax.message || "Request failed";
}

export async function signup(body: SignupRequest): Promise<SignupResponse> {
  try {
    const { data } = await apiClient.post<SignupResponse>(
      "/v1/users/signup",
      body
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

/** Same response shape as signup: user + account + wallet (no secrets). */
export async function login(body: LoginRequest): Promise<SignupResponse> {
  try {
    const { data } = await apiClient.post<SignupResponse>(
      "/v1/auth/login",
      body
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function getUser(userId: number): Promise<UserResponse> {
  try {
    const { data } = await apiClient.get<UserResponse>(`/v1/users/${userId}`);
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

/**
 * PATCH the user's profile (name / surname). Fields omitted from the body
 * are left untouched by the server, so callers can update one attribute
 * without echoing the rest.
 */
export async function updateUser(
  userId: number,
  body: UpdateUserRequest
): Promise<UserResponse> {
  try {
    const { data } = await apiClient.patch<UserResponse>(
      `/v1/users/${userId}`,
      body
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

/**
 * POST /v1/auth/change-password. 204 No Content on success; throws with a
 * useful message for wrong current password / weak new password / same as
 * the old one.
 */
export async function changePassword(
  body: ChangePasswordRequest
): Promise<void> {
  try {
    await apiClient.post("/v1/auth/change-password", body);
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

/* ──────────────────────────────────────────────────────────────────────
 * Face login
 *
 * Embeddings are 128 floats produced client-side by face-api.js
 * (FaceNet-style, L2-normalized). The backend never sees image bytes.
 * ────────────────────────────────────────────────────────────────────── */

/**
 * 1:N face login. Backend scans every enrolled embedding, returns the
 * closest user iff Euclidean distance < threshold, else 401.
 *
 * Response shape mirrors password login so callers can drop the result into
 * `setStoredSession` exactly the same way.
 */
export async function faceLogin(embedding: number[]): Promise<SignupResponse> {
  try {
    const { data } = await apiClient.post<SignupResponse>(
      "/v1/auth/face-login",
      { embedding }
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

/**
 * Enroll (or re-enroll) the caller's face. Idempotent: the backend
 * upserts a single row per user, so calling this again replaces the
 * previous embedding.
 */
export async function enrollFace(
  userId: number,
  embedding: number[]
): Promise<void> {
  try {
    await apiClient.post(`/v1/users/${userId}/face`, { embedding });
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function getFaceStatus(
  userId: number
): Promise<FaceStatusResponse> {
  try {
    const { data } = await apiClient.get<FaceStatusResponse>(
      `/v1/users/${userId}/face`
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

/**
 * Removes the stored embedding. Idempotent on the backend (no-op when
 * not enrolled), so the UI can call it without first checking status.
 */
export async function deleteFaceCredential(userId: number): Promise<void> {
  try {
    await apiClient.delete(`/v1/users/${userId}/face`);
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function getAccountForUser(
  userId: number
): Promise<AccountResponse> {
  try {
    const { data } = await apiClient.get<AccountResponse>(
      `/v1/users/${userId}/account`
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function getTasks(): Promise<TaskResponse[]> {
  try {
    const { data } = await apiClient.get<TaskResponse[]>("/v1/tasks");
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function completeTask(
  userId: number,
  taskId: number
): Promise<TaskCompletionResponse> {
  try {
    const { data } = await apiClient.post<TaskCompletionResponse>(
      `/v1/users/${userId}/tasks/${taskId}/completions`
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function getWalletBalance(
  userId: number
): Promise<WalletBalanceResponse> {
  try {
    const { data } = await apiClient.get<WalletBalanceResponse>(
      `/v1/users/${userId}/wallet/balance`
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function getTransactions(
  userId: number
): Promise<TransactionResponse[]> {
  try {
    const { data } = await apiClient.get<TransactionResponse[]>(
      `/v1/users/${userId}/transactions`
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

/**
 * Peer-to-peer transfer: moves `body.amount` Vektras from the caller to the
 * user identified by `body.recipientId`.
 *
 * The optional `recipientEmail` / `recipientName` are "Confirmation of Payee"
 * fields — when present, the backend verifies they match the actual recipient
 * and rejects the transfer if they don't, catching typo'd IDs.
 *
 * Empty strings on optional fields are stripped before the request so the
 * backend's `@Email` validator doesn't fire on "".
 */
export async function sendTransfer(
  senderId: number,
  body: TransferRequest
): Promise<TransferResponse> {
  const payload: TransferRequest = {
    recipientId: body.recipientId,
    amount: body.amount,
  };
  const email = body.recipientEmail?.trim();
  if (email) payload.recipientEmail = email;
  const name = body.recipientName?.trim();
  if (name) payload.recipientName = name;

  try {
    const { data } = await apiClient.post<TransferResponse>(
      `/v1/users/${senderId}/transfers`,
      payload
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

// ——— Admin (maps to Spring `/api/v1/...`) ———

export async function adminListUsers(): Promise<AdminUserListItem[]> {
  try {
    const { data } = await apiClient.get<AdminUserListItem[]>("/v1/admin/users");
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function adminActivateAccount(
  accountId: number
): Promise<AccountResponse> {
  try {
    const { data } = await apiClient.patch<AccountResponse>(
      `/v1/accounts/${accountId}/activate`
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function adminSuspendAccount(
  accountId: number
): Promise<AccountResponse> {
  try {
    const { data } = await apiClient.patch<AccountResponse>(
      `/v1/accounts/${accountId}/suspend`
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function adminListTasks(): Promise<TaskResponse[]> {
  try {
    const { data } = await apiClient.get<TaskResponse[]>("/v1/admin/tasks");
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function adminCreateTask(
  body: CreateTaskRequest
): Promise<TaskResponse> {
  try {
    const { data } = await apiClient.post<TaskResponse>("/v1/tasks", body);
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function adminUpdateTaskStatus(
  taskId: number,
  body: UpdateTaskStatusRequest
): Promise<TaskResponse> {
  try {
    const { data } = await apiClient.patch<TaskResponse>(
      `/v1/tasks/${taskId}/status`,
      body
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function adminListTaskCompletions(
  status: TaskCompletionStatus = "PENDING"
): Promise<TaskCompletionResponse[]> {
  try {
    const { data } = await apiClient.get<TaskCompletionResponse[]>(
      "/v1/admin/task-completions",
      { params: { status } }
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

/** Public-ish read of every APPROVED completion (used for homepage stats). */
export async function getCompletedTasks(): Promise<TaskCompletionResponse[]> {
  try {
    const { data } = await apiClient.get<TaskCompletionResponse[]>(
      "/v1/admin/completed-tasks"
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function adminApproveCompletion(
  id: number
): Promise<TaskCompletionResponse> {
  try {
    const { data } = await apiClient.patch<TaskCompletionResponse>(
      `/v1/task-completions/${id}/approve`
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function adminRejectCompletion(
  id: number
): Promise<TaskCompletionResponse> {
  try {
    const { data } = await apiClient.patch<TaskCompletionResponse>(
      `/v1/task-completions/${id}/reject`
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
