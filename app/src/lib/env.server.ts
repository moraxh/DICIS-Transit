import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "preview", "test"])
    .default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  REQUIRE_CAMPUS_WIFI: z.preprocess(
    (val) => val === "true" || val === true,
    z.boolean().default(false),
  ),
  CAMPUS_ALLOWED_CIDR: z.string().default("192.168.1.0/24"),
});

function validateServerEnv() {
  try {
    return serverEnvSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      REQUIRE_CAMPUS_WIFI: process.env.REQUIRE_CAMPUS_WIFI,
      CAMPUS_ALLOWED_CIDR: process.env.CAMPUS_ALLOWED_CIDR,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        "Invalid server environment variables:",
        error.flatten().fieldErrors,
      );
    }
    throw new Error("Invalid server environment variables");
  }
}

const serverEnv = validateServerEnv();

export const {
  NODE_ENV,
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_MAPBOX_TOKEN,
  SUPABASE_SERVICE_ROLE_KEY,
  REQUIRE_CAMPUS_WIFI,
  CAMPUS_ALLOWED_CIDR,
} = serverEnv;

export const IS_PRODUCTION =
  serverEnv.NODE_ENV === "production" || serverEnv.NODE_ENV === "preview";
