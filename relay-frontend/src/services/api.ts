import { API_BASE } from "../lib/config";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number; // seconds
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check that the backend is running.");
  }
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  if (!res.ok) {
    const serverMsg = data && typeof data === "object" ? ((data as Record<string, unknown>).message ?? (data as Record<string, unknown>).error) : null;
    const fallback = res.status === 401 ? "Wrong username or password."
      : res.status === 409 ? "That username is already taken."
      : "Something went wrong. Try again.";
    throw new ApiError(res.status, typeof serverMsg === "string" && serverMsg ? serverMsg : fallback);
  }
  return data as T;
}

export const authApi = {
  login: (username: string, password: string) => post<LoginResponse>("/api/auth/login", { username, password }),
  // Register schema is UNVERIFIED: confirm against the RegisterRequest DTO (extra fields such as email?).
  register: (username: string, password: string) => post<unknown>("/api/auth/register", { username, password }),
};

async function get<T>(path: string, token: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check that the backend is running.");
  }
  if (!res.ok) {
    const msg =
        res.status === 401 ? "Your session has expired."
            : res.status === 403 ? "You don't have access to this conversation."
                : "The server couldn't load messages.";
    throw new ApiError(res.status, msg);
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError(res.status, "Unexpected response from the server.");
  }
}

export const chatApi = {
  /** beforeId = null loads the latest page; otherwise the page of messages older than that id. */
  history: (token: string, peer: string, beforeId: string | null, size = 30) =>
      get<unknown>(
          `/api/messages/with/${encodeURIComponent(peer)}?size=${size}${beforeId ? `&beforeId=${encodeURIComponent(beforeId)}` : ""}`,
          token,
      ),
};
