import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

export async function GET() {
  try {
    // SECURITY: Get authenticated user's organization - NO MORE HARDCODED IDs!
    const user = await requireAuth();
    const organizationId = user.organizationId;

    const supabase = await createClient();

    // Get all unique tags from leads
    const { data: leads, error } = await supabase
      .from("leads")
      .select("tags")
      .eq("organization_id", organizationId)
      .not("tags", "is", null);

    if (error) {
      console.error("Error fetching tags:", error);
    }

    // Extract all unique tags
    const allTags = new Set<string>();
    leads?.forEach((lead) => {
      if (Array.isArray(lead.tags)) {
        lead.tags.forEach((tag) => allTags.add(tag));
      }
    });

    // Common predefined tags
    const predefinedTags = [
      { value: "hot-lead", label: "Hot Lead", color: "red" },
      { value: "warm-lead", label: "Warm Lead", color: "orange" },
      { value: "cold-lead", label: "Cold Lead", color: "blue" },
      { value: "member", label: "Member", color: "green" },
      { value: "trial-pending", label: "Trial Pending", color: "yellow" },
      { value: "trial-completed", label: "Trial Completed", color: "green" },
      { value: "follow-up-needed", label: "Follow Up Needed", color: "purple" },
      { value: "not-interested", label: "Not Interested", color: "gray" },
      { value: "competitor-member", label: "Competitor Member", color: "red" },
      { value: "price-objection", label: "Price Objection", color: "orange" },
      { value: "location-issue", label: "Location Issue", color: "gray" },
      { value: "vip", label: "VIP", color: "gold" },
      { value: "referral-source", label: "Referral Source", color: "purple" },
      { value: "social-media-lead", label: "Social Media Lead", color: "blue" },
      { value: "website-lead", label: "Website Lead", color: "green" },
      { value: "walk-in", label: "Walk In", color: "teal" },
    ];

    // Combine predefined tags with existing tags
    const tagList = predefinedTags.map((tag) => ({
      ...tag,
      isUsed: allTags.has(tag.value),
      count:
        leads?.filter(
          (lead) => Array.isArray(lead.tags) && lead.tags.includes(tag.value),
        ).length || 0,
    }));

    // Add any custom tags not in predefined list
    allTags.forEach((tag) => {
      if (!predefinedTags.find((p) => p.value === tag)) {
        tagList.push({
          value: tag,
          label: tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, " "),
          color: "gray",
          isUsed: true,
          count:
            leads?.filter(
              (lead) => Array.isArray(lead.tags) && lead.tags.includes(tag),
            ).length || 0,
        });
      }
    });

    // Sort by usage count
    tagList.sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      tags: tagList,
      summary: {
        total: tagList.length,
        inUse: tagList.filter((t) => t.isUsed).length,
        custom: tagList.filter(
          (t) => !predefinedTags.find((p) => p.value === t.value),
        ).length,
      },
    });
  } catch (error) {
    console.error("Error in workflow config tags:", error);
    return createErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    // SECURITY: Get authenticated user's organization - NEVER accept from request body
    const user = await requireAuth();
    const organizationId = user.organizationId;

    const { tag } = await request.json();

    if (!tag) {
      return NextResponse.json({ error: "Tag is required" }, { status: 400 });
    }

    // Tag will be created when first used on a lead
    // This endpoint just validates the tag format
    const validTag = tag.toLowerCase().replace(/\s+/g, "-");

    return NextResponse.json({
      success: true,
      tag: {
        value: validTag,
        label: tag,
        color: "gray",
        isNew: true,
      },
    });
  } catch (error) {
    console.error("Error creating tag:", error);
    return createErrorResponse(error);
  }
}
