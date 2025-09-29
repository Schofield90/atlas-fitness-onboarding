import { NextRequest, NextResponse } from "next/server";
import { handleApiRoute, supabaseAdmin } from "@/lib/api/middleware";
import { requireAuth, createOrgScopedClient } from "@/lib/auth-middleware";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Authentication check
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Create organization-scoped Supabase client
  const supabase = createOrgScopedClient(auth.organizationId);

  return handleApiRoute(request, async (req) => {
    const { user } = req;

    // Fetch all tags with contact counts for the organization
    const { data: tags, error } = await supabaseAdmin
      .from("contact_tags")
      .select(
        `
        id,
        name,
        description,
        color,
        category,
        usage_count,
        created_at,
        updated_at,
        last_used_at,
        contact_tag_assignments:contact_tag_assignments(count)
      `,
      )
      .eq("organization_id", user.organization_id)
      .order("name");

    if (error) {
      throw new Error("Failed to fetch tags");
    }

    // Transform the data to include contact counts
    const tagsWithCounts =
      tags?.map((tag) => ({
        id: tag.id,
        name: tag.name,
        description: tag.description,
        color: tag.color,
        category: tag.category,
        usage_count: tag.usage_count,
        contact_count: tag.contact_tag_assignments?.[0]?.count || 0,
        last_used_at: tag.last_used_at,
        created_at: tag.created_at,
        updated_at: tag.updated_at,
      })) || [];

    return NextResponse.json({
      tags: tagsWithCounts,
      total: tagsWithCounts.length,
    });
  });
}
