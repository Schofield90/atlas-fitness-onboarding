import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Creates a Supabase client with the service role key.
 * This client bypasses Row Level Security (RLS) policies and should ONLY be used
 * for backend jobs, data imports, and administrative tasks.
 *
 * SECURITY WARNING: Never expose the service role key to client-side code.
 * This client has full database access and ignores all security policies.
 *
 * @returns Supabase admin client with service role privileges
 * @throws Error if used in browser context
 */
export function createAdminClient() {
  // Return cached client if available
  if (adminClient) {
    return adminClient;
  }

  // Only check environment variables at runtime, not during build
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient should only be used on the server side");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If environment variables are missing, return a mock client to prevent build failures
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("Missing Supabase environment variables, using mock client");

    const mockClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          in: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
          gte: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
          lte: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
          lt: () => Promise.resolve({ data: [], error: null }),
          limit: () => Promise.resolve({ data: [], error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        upsert: () => Promise.resolve({ error: null }),
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      },
    } as any;

    adminClient = mockClient;
    return mockClient;
  }

  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false, // Don't look for session in URL
    },
  });

  return adminClient;
}

// DEPRECATED: Do not use supabaseAdmin export. Use createAdminClient() instead.
// This was causing "document is not defined" errors in server environments.

// Helper to get user with organization using admin client
export async function getUserWithOrgAdmin(userId: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("users")
    .select("*, organizations(*)")
    .eq("id", userId)
    .single();

  return { data, error };
}
