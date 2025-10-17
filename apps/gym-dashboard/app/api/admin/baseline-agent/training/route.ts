import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/client";

/**
 * GET /api/admin/baseline-agent/training
 *
 * Fetches all training data from ai_feedback table for baseline agent refinement.
 * Returns feedback examples categorized by type (tone, accuracy, length, etc.)
 * Super admin only.
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check super admin access
    const isSuperAdmin =
      user.email === 'sam@gymleadhub.co.uk' ||
      user.email?.endsWith('@gymleadhub.co.uk') ||
      user.email?.endsWith('@atlas-gyms.co.uk');

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Fetch all training feedback
    const { data: feedbacks, error: fetchError } = await supabaseAdmin
      .from("ai_feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching training data:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch training data" },
        { status: 500 }
      );
    }

    // Group feedback by category
    const categorized = {
      tone: [],
      accuracy: [],
      length: [],
      sales_approach: [],
      information: [],
      other: [],
    } as Record<string, any[]>;

    (feedbacks || []).forEach((feedback: any) => {
      const category = feedback.feedback_category || "other";
      if (categorized[category]) {
        categorized[category].push(feedback);
      } else {
        categorized.other.push(feedback);
      }
    });

    // Calculate stats
    const stats = {
      total: feedbacks?.length || 0,
      by_category: Object.entries(categorized).map(([category, items]) => ({
        category,
        count: items.length,
      })),
    };

    return NextResponse.json({
      success: true,
      data: {
        feedbacks: feedbacks || [],
        categorized,
        stats,
      }
    });

  } catch (error: any) {
    console.error("Error in GET /api/admin/baseline-agent/training:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
