import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering since this page uses authentication
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  try {
    const supabase = await createClient();

    // Handle OAuth callback if code is present
    if (searchParams.code) {
      const { error: sessionError } =
        await supabase.auth.exchangeCodeForSession(searchParams.code);
      if (!sessionError) {
        redirect("/dashboard");
      }
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Auth error on home page:", error);
      redirect("/landing");
    }

    if (user) {
      redirect("/dashboard");
    } else {
      redirect("/landing");
    }
  } catch (error) {
    console.error("Error on home page:", error);
    redirect("/landing");
  }
}
