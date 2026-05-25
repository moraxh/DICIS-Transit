import {
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
} from "@lib/env.server";
import { createServerClient } from "@supabase/ssr";
import { cookies as cookiesPromise } from "next/headers";

export async function createClient() {
  const cookieStore = await cookiesPromise();

  return createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach((cookie) => {
              cookieStore.set(cookie);
            });
          } catch {
            // Headers already sent (e.g. called from a Server Component render path).
            // Session will still work for the current request; the cookie will be
            // re-set on the next mutable response. This is expected Supabase SSR behavior.
          }
        },
      },
    },
  );
}
