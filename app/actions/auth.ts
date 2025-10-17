"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export async function signIn(email: string, password: string, redirectPath?: string) {
  const supabase = await createClient();

  // Validate email domain
  if (!email.endsWith("@gymleadhub.co.uk")) {
    return {
      error: "Access restricted to @gymleadhub.co.uk email addresses",
    };
  }

  // Attempt sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data?.user) {
    return { error: "Authentication failed" };
  }

  // Verify user email is sam@gymleadhub.co.uk
  if (data.user.email?.toLowerCase() !== "sam@gymleadhub.co.uk") {
    await supabase.auth.signOut();
    return { error: "You do not have admin access to this platform" };
  }

  // Session is set server-side by the createClient function
  // Now redirect using server-side redirect (not client-side window.location)
  redirect(redirectPath || "/saas-admin");
}
