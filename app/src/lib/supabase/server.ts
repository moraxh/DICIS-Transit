import {
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
} from "@lib/env";
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
          } catch (error) {
            console.error("Error setting cookies:", error);
          }
        },
      },
    },
  );
}
