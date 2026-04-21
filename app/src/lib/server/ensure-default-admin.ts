import { IS_PRODUCTION, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@lib/env";
import { createClient } from "@supabase/supabase-js";
import "server-only";
import crypto from "node:crypto";

declare global {
  var __dicisEnsureDefaultAdminPromise: Promise<void> | undefined;
}

const DEV_ADMIN_EMAIL = "admin@dicis.local";
const DEV_ADMIN_PASSWORD = "admin123456";

async function findAuthUserIdByEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  const perPage = 200;

  for (let page = 1; page <= 10; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error("[bootstrap-admin] Failed listing auth users:", error.message);
      return null;
    }

    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );

    if (found) return found.id;
    if (data.users.length < perPage) break;
  }

  return null;
}

async function ensureDefaultAdminInternal() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "[bootstrap-admin] SUPABASE_SERVICE_ROLE_KEY is missing. Skipping default admin creation.",
    );
    return;
  }

  const adminClient = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { count, error: adminCountError } = await adminClient
    .from("users")
    .select("id", { head: true, count: "exact" })
    .eq("role", "admin");

  if (adminCountError) {
    console.error(
      "[bootstrap-admin] Failed checking existing admins:",
      adminCountError.message,
    );
    return;
  }

  if ((count ?? 0) > 0) return;

  const randomSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  const randomPassword = crypto.randomBytes(18).toString("base64url");

  const email = IS_PRODUCTION
    ? `admin.${randomSuffix}@bootstrap.dicis.local`
    : DEV_ADMIN_EMAIL;
  const password = IS_PRODUCTION ? randomPassword : DEV_ADMIN_PASSWORD;

  let authUserId: string | null = null;

  const { data: createdUserData, error: createAuthUserError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { app_role: "admin" },
      user_metadata: { bootstrap_admin: true },
    });

  if (createAuthUserError) {
    const fallbackUserId = await findAuthUserIdByEmail(adminClient, email);

    if (!fallbackUserId) {
      console.error(
        "[bootstrap-admin] Failed creating auth admin user:",
        createAuthUserError.message,
      );
      return;
    }

    authUserId = fallbackUserId;

    const { error: updateAuthUserError } = await adminClient.auth.admin.updateUserById(
      authUserId,
      {
        password,
        email_confirm: true,
        app_metadata: { app_role: "admin" },
        user_metadata: { bootstrap_admin: true },
      },
    );

    if (updateAuthUserError) {
      console.error(
        "[bootstrap-admin] Failed updating existing auth user as admin:",
        updateAuthUserError.message,
      );
      return;
    }
  } else {
    authUserId = createdUserData.user?.id ?? null;
  }

  if (!authUserId) {
    console.error("[bootstrap-admin] Unable to resolve auth user id for admin bootstrap.");
    return;
  }

  const { error: upsertProfileError } = await adminClient.from("users").upsert(
    {
      id: authUserId,
      role: "admin",
    },
    {
      onConflict: "id",
    },
  );

  if (upsertProfileError) {
    console.error(
      "[bootstrap-admin] Failed upserting admin profile in public.users:",
      upsertProfileError.message,
    );
    return;
  }

  console.info("[bootstrap-admin] Default admin created because no admin existed.");
  console.info(`[bootstrap-admin] email: ${email}`);
  console.info(`[bootstrap-admin] password: ${password}`);
  console.info(
    `[bootstrap-admin] environment: ${IS_PRODUCTION ? "production" : "development"}`,
  );
}

export async function ensureDefaultAdmin() {
  if (!globalThis.__dicisEnsureDefaultAdminPromise) {
    globalThis.__dicisEnsureDefaultAdminPromise = ensureDefaultAdminInternal().catch(
      (error) => {
        console.error("[bootstrap-admin] Unexpected bootstrap error:", error);
      },
    );
  }

  await globalThis.__dicisEnsureDefaultAdminPromise;
}
