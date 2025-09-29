import { NextRequest, NextResponse } from "next/server";
import { leadService } from "@/src/services";
import { z } from "zod";
import { getOrganizationAndUser } from "@/app/lib/auth-utils";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// Schema for create/update lead
const createLeadSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  status: z
    .enum(["new", "contacted", "qualified", "converted", "lost"])
    .optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

// GET /api/v2/leads - Get leads with filters
export async function GET(request: NextRequest) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse filters from query params
    const filter = {
      status: searchParams.get("status")?.split(","),
      tags: searchParams.get("tags")?.split(","),
      source: searchParams.get("source")?.split(","),
      assignedTo: searchParams.get("assignedTo") || undefined,
      search: searchParams.get("search") || undefined,
      score:
        searchParams.get("scoreMin") || searchParams.get("scoreMax")
          ? {
              min: searchParams.get("scoreMin")
                ? parseInt(searchParams.get("scoreMin")!)
                : undefined,
              max: searchParams.get("scoreMax")
                ? parseInt(searchParams.get("scoreMax")!)
                : undefined,
            }
          : undefined,
    };

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const result = await leadService.getLeads(
      organization.id,
      filter,
      page,
      limit,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 },
    );
  }
}

// POST /api/v2/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validated = createLeadSchema.parse(body);

    const leadId = await leadService.createLead(organization.id, validated);

    return NextResponse.json(
      {
        id: leadId,
        message: "Lead created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 },
    );
  }
}
