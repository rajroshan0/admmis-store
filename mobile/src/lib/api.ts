import { API_URL } from "./config";
import { supabase } from "./supabase";

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    public extra?: Record<string, unknown>,
  ) {
    super(code);
  }
}

/** Calls the website's API as the signed-in customer (the login token goes in the Authorization header). */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("network", 0);
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(String(json.error ?? "generic"), res.status, json);
  return json as T;
}
