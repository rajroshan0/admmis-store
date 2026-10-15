import { createServerClient } from "@supabase/ssr";
import { createClient as createJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

/** Supabase client for Server Components, Route Handlers and Server Actions. Acts as the logged-in user (RLS applies). */
export async function createClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    );
  }

  // The mobile app has no browser cookies: it sends its login token as "Authorization: Bearer <token>".
  // Supabase verifies the token itself, so the user is still who the token says (and RLS still applies).
  const bearer = /^Bearer\s+(\S+)$/i.exec((await headers()).get("authorization") ?? "")?.[1];
  if (bearer) {
    return createJsClient(url, key, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies can't be set there.
          // The middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
