const USER_ID_KEY = "vektra_user_id";
const ACCESS_TOKEN_KEY = "vektra_access_token";

export function getStoredUserId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(USER_ID_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredSession(userId: number, accessToken?: string | null): void {
  sessionStorage.setItem(USER_ID_KEY, String(userId));
  if (accessToken) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function setStoredUserId(id: number): void {
  sessionStorage.setItem(USER_ID_KEY, String(id));
}

export function clearSession(): void {
  sessionStorage.removeItem(USER_ID_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}
