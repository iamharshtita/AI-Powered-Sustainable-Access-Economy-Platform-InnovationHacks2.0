/**
 * API client for the Sustainable Access Platform backend.
 * Automatically attaches the Auth0 access token to every request.
 *
 * Usage (server components / route handlers):
 *   import { apiClient } from "@/lib/api";
 *   const client = await apiClient();
 *   const data = await client.get("/api/search?q=laptop");
 *
 * Usage (client components — use fetch with the token from useUser):
 *   const { user } = useUser();
 *   fetch(`${BASE_URL}/api/search?q=laptop`, {
 *     headers: { Authorization: `Bearer ${accessToken}` }
 *   });
 */

import { auth0 } from "./auth0";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function getAccessToken(): Promise<string | null> {
  try {
    const tokenResult = await auth0.getAccessToken();
    return tokenResult?.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? `API error ${res.status}`);
  }

  return res.json();
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
