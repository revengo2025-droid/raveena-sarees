/**
 * Raveena Sarees — Admin User Setup Script
 * 
 * Creates the admin user (revengo2025@gmail.com / Revengo@2025#) in Supabase Auth
 * and sets their profile role to 'admin'.
 * 
 * Usage: node scripts/setup-admin.mjs
 * 
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Parse .env.local manually
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf-8");
    const vars = {};
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      vars[key] = value;
    }
    return vars;
  } catch {
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = "revengo2025@gmail.com";
const ADMIN_PASSWORD = "Revengo@2025#";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("🔧 Setting up admin user:", ADMIN_EMAIL);

  // 1. Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  let userId;

  if (existingUser) {
    console.log("✅ User already exists in Supabase Auth, updating password...");
    userId = existingUser.id;

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

    if (updateError) {
      console.error("❌ Failed to update user password:", updateError.message);
      process.exit(1);
    }
    console.log("✅ Password updated successfully");
  } else {
    console.log("📝 Creating new user in Supabase Auth...");
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: "Raveena Admin",
      },
    });

    if (createError) {
      console.error("❌ Failed to create user:", createError.message);
      process.exit(1);
    }

    userId = newUser.user.id;
    console.log("✅ User created with ID:", userId);
  }

  // 2. Upsert profile with admin role
  console.log("📝 Setting admin role in profiles table...");
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: ADMIN_EMAIL,
      full_name: "Raveena Admin",
      role: "admin",
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("❌ Failed to set admin role:", profileError.message);
    console.log("💡 You may need to run the migration 005_revengo_admin.sql manually in the SQL editor.");
    process.exit(1);
  }

  console.log("✅ Admin role set successfully!");
  console.log("");
  console.log("🎉 Admin setup complete!");
  console.log("   Email:    ", ADMIN_EMAIL);
  console.log("   Password: ", ADMIN_PASSWORD);
  console.log("   Login at: /auth/login");
  console.log("");
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
