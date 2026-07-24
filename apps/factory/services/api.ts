import axios, { AxiosError } from "axios";
import { clearSession, getAccessToken } from "@/lib/session";
import type {
  ApiErrorBody,
  CreateStoreItemRequest,
  LoginRequest,
  SignupRequest,
  SignupResponse,
  StoreItemResponse,
  UpdateStoreItemRequest,
  UpdateStoreItemStatusRequest,
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
        url.includes("/v1/auth/login") || url.includes("/v1/users/signup");
      if (!isPublicAuth && typeof window !== "undefined") {
        clearSession();
        sessionStorage.removeItem("vektra_user");
        const p = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
        window.location.href = p ? `${p}/login` : "/login";
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
    return "Session expired or not signed in. Please log in again.";
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

// ——— Factory catalog (maps to Spring `/api/v1/store-items`) ———

export async function factoryListStoreItems(
  opts?: { includeInactive?: boolean; category?: string }
): Promise<StoreItemResponse[]> {
  try {
    const { data } = await apiClient.get<StoreItemResponse[]>("/v1/store-items", {
      params: {
        includeInactive: opts?.includeInactive ?? true,
        category: opts?.category || undefined,
      },
    });
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function factoryGetStoreItem(id: number): Promise<StoreItemResponse> {
  try {
    const { data } = await apiClient.get<StoreItemResponse>(`/v1/store-items/${id}`);
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function factoryCreateStoreItem(
  body: CreateStoreItemRequest
): Promise<StoreItemResponse> {
  try {
    const { data } = await apiClient.post<StoreItemResponse>("/v1/store-items", body);
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function factoryUpdateStoreItem(
  id: number,
  body: UpdateStoreItemRequest
): Promise<StoreItemResponse> {
  try {
    const { data } = await apiClient.patch<StoreItemResponse>(
      `/v1/store-items/${id}`,
      body
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function factoryUpdateStoreItemStatus(
  id: number,
  body: UpdateStoreItemStatusRequest
): Promise<StoreItemResponse> {
  try {
    const { data } = await apiClient.patch<StoreItemResponse>(
      `/v1/store-items/${id}/status`,
      body
    );
    return data;
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
