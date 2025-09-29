import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createSampleClasses } from "@/app/lib/calendar/class-transformer";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if organization already has classes
    const { data: existingClasses } = await supabase
      .from("class_sessions")
      .select("id")
      .eq("organization_id", organizationId)
      .limit(1);

    if (existingClasses && existingClasses.length > 0) {
      return NextResponse.json({
        message: "Organization already has classes",
        exists: true,
      });
    }

    // Create sample classes
    const sampleClasses = createSampleClasses(organizationId);

    // Add created_by field
    const classesWithCreator = sampleClasses.map((cls) => ({
      ...cls,
      created_by: user.id,
    }));

    // Insert sample classes
    const { data: insertedClasses, error } = await supabase
      .from("class_sessions")
      .insert(classesWithCreator)
      .select();

    if (error) {
      console.error("Error inserting sample classes:", error);
      return NextResponse.json(
        { error: "Failed to create sample classes", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Created ${insertedClasses?.length || 0} sample classes`,
      classes: insertedClasses,
    });
  } catch (error) {
    console.error("Error in seed route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
