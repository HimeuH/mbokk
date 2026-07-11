const STORAGE_KEY = "mbokk_token";

// Sanctum token, not a session cookie — authed views are client-fetched only
// (docs/mvp-plan.md), so localStorage is fine; public pages never read this.
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setAuthToken(token: string): void {
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
