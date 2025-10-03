import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = createAdminClient();

    const formData = await request.json();

    // Ensure the form belongs to the user's organization
    const saveData = {
      ...formData,
      organization_id: userWithOrg.organizationId,
    };

    const { data: savedForm, error } = await supabase
      .from("forms")
      .insert(saveData)
      .select()
      .single();

    if (error) {
      console.error("Error saving form:", error);
      return NextResponse.json(
        {
          error: `Failed to save form: ${error.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      form: savedForm,
    });
  } catch (error: any) {
    console.error("Error in save form:", error);
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 },
    );
  }
}
