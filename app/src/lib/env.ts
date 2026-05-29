import { z } from "zod";

// Helper for generic validation
function validateEnv<T extends z.ZodTypeAny>(schema: T) {
  try {
    return schema.parse({
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      REQUIRE_CAMPUS_WIFI: process.env.REQUIRE_CAMPUS_WIFI,
      CAMPUS_ALLOWED_CIDR: process.env.CAMPUS_ALLOWED_CIDR,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID:
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      NEXT_PUBLIC_FIREBASE_VAPID_KEY:
        process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        "Invalid environment variables:",
        error.flatten().fieldErrors,
      );
    }
    // We throw to prevent app from running with invalid config
    throw new Error("Invalid environment variables");
  }
}

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "preview", "test"])
    .default("development"),

  // Public variables that the browser needs
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1),

  // Backend/Server side only
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Custom logic variables
  REQUIRE_CAMPUS_WIFI: z.preprocess(
    (val) => val === "true" || val === true,
    z.boolean().default(false),
  ),
  CAMPUS_ALLOWED_CIDR: z.string().default("192.168.1.0/24"),

  // Firebase Admin (server-only)
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),

  // Firebase client (public)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: z.string().min(1).optional(),
});

const env = validateEnv(envSchema);

const config = {
  ...env,
  IS_PRODUCTION: env.NODE_ENV === "production" || env.NODE_ENV === "preview",
};

export const {
  NODE_ENV,
  IS_PRODUCTION,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_MAPBOX_TOKEN,
  SUPABASE_SERVICE_ROLE_KEY,
  REQUIRE_CAMPUS_WIFI,
  CAMPUS_ALLOWED_CIDR,
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_VAPID_KEY,
} = config;
