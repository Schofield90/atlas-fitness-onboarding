import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Try to refresh the PostgREST schema cache
    const { error: refreshError } = await supabaseAdmin.rpc(
      "pgrst_reload_schema_cache",
      {},
    );

    if (refreshError) {
      console.error("Error refreshing schema cache:", refreshError);
      // Continue even if this fails, as it might not exist
    }

    // Also try the alternative method
    const { error: notifyError } = await supabaseAdmin.rpc(
      "notify_pgrst_ddl_changes",
      {},
    );

    if (notifyError) {
      console.error("Error with notify method:", notifyError);
      // Continue even if this fails
    }

    return NextResponse.json({
      success: true,
      message:
        "Schema cache refresh attempted. Please wait a moment and try again.",
      note: "If the error persists, the Supabase dashboard may need a manual schema reload.",
    });
  } catch (error: any) {
    console.error("Error in schema cache refresh:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        note: "Schema cache refresh failed. You may need to manually reload the schema in Supabase dashboard under Settings > API.",
      },
      { status: 500 },
    );
  }
}
