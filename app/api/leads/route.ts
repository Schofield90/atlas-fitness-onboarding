import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import {
  handleApiError,
  ValidationError,
  DatabaseError,
  withApiErrorBoundary,
} from "@/app/lib/errors";
import { cacheService, CACHE_TTL } from "@/app/lib/cache/cache-utils";

async function getLeads(request: NextRequest) {
  // Check authentication and get organization
  const userWithOrg = await requireAuth();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const assignedTo = searchParams.get("assigned_to");
  const createdBy = searchParams.get("created_by");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("page_size") || "50");

  // Generate cache key based on filters and pagination
  const cacheKey = cacheService.getCacheKey(
    userWithOrg.organizationId,
    "leads",
    `list-${page}-${pageSize}`,
    status || "all",
    source || "all",
    assignedTo || "all",
    createdBy || "all",
  );

  // Try to get from cache first
  const cached = await cacheService.getFromCache<any>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Create Supabase client
  const supabase = createClient();

  // Calculate range for pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build query - filter by organization for shared access
  let query = supabase
    .from("leads")
    .select(
      `
        *,
        lead_tags (
          tag_id,
          tags (
            id,
            name,
            color
          )
        )
      `,
      { count: "exact" },
    )
    .eq("organization_id", userWithOrg.organizationId) // Filter by organization
    .order("created_at", { ascending: false })
    .range(from, to);

  // Apply filters
  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (source) {
    query = query.eq("source", source);
  }

  if (assignedTo) {
    query = query.eq("assigned_to", assignedTo);
  }

  if (createdBy) {
    query = query.eq("created_by", createdBy);
  }

  const { data: leads, error, count } = await query;

  if (error) {
    throw DatabaseError.queryError("leads", "select", {
      filters: { status, source, assignedTo, createdBy },
      organizationId: userWithOrg.organizationId,
      originalError: error.message,
      code: error.code,
    });
  }

  // Remove duplicates based on email, keeping the most recent
  const uniqueLeads = (leads || []).reduce((acc: any[], lead) => {
    if (!lead.email) {
      acc.push(lead);
      return acc;
    }

    const existingIndex = acc.findIndex(
      (l) => l.email && l.email.toLowerCase() === lead.email.toLowerCase(),
    );

    if (existingIndex === -1) {
      acc.push(lead);
    } else {
      // Keep the most recent lead (based on updated_at or created_at)
      const existing = acc[existingIndex];
      const existingDate = new Date(existing.updated_at || existing.created_at);
      const currentDate = new Date(lead.updated_at || lead.created_at);

      if (currentDate > existingDate) {
        acc[existingIndex] = lead;
      }
    }

    return acc;
  }, []);

  const response = {
    success: true,
    leads: uniqueLeads,
    pagination: {
      page,
      pageSize,
      total: uniqueLeads.length,
      totalPages: Math.ceil(uniqueLeads.length / pageSize),
    },
    organizationId: userWithOrg.organizationId,
  };

  // Cache the response for 5 minutes
  await cacheService.setInCache(cacheKey, response, CACHE_TTL.LEAD_LISTS);

  return NextResponse.json(response);
}

// Wrap with error boundary
export const GET = withApiErrorBoundary(getLeads);

async function createLead(request: NextRequest) {
  // Check authentication and get organization
  const userWithOrg = await requireAuth();

  const supabase = createClient();
  const body = await request.json();

  // Validate required fields
  if (!body.name) {
    throw ValidationError.required("name", { body });
  }

  // At least one of email or phone must be provided
  const hasEmail =
    typeof body.email === "string" && body.email.trim().length > 0;
  const hasPhone =
    typeof body.phone === "string" && body.phone.trim().length > 0;
  if (!hasEmail && !hasPhone) {
    throw ValidationError.custom("Either email or phone is required", {
      field: "contact",
      body,
    });
  }

  // Validate email format if provided
  if (hasEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(body.email).toLowerCase())) {
      throw ValidationError.invalid("email", body.email, "valid email address");
    }
  }

  // Basic phone validation if provided (digits, spaces, symbols allowed but must contain 7+ digits)
  const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, "");
  let normalizedPhone: string | undefined;
  if (hasPhone) {
    normalizedPhone = normalizePhone(body.phone);
    if (!normalizedPhone || normalizedPhone.length < 7) {
      throw ValidationError.invalid("phone", body.phone, "valid phone number");
    }
  }

  // Check if a lead with this email or phone already exists
  if (hasEmail || hasPhone) {
    let query = supabase
      .from("leads")
      .select("id, name, email, phone")
      .eq("organization_id", userWithOrg.organizationId);

    // Build OR filter for email/phone duplicates
    if (hasEmail && hasPhone) {
      query = query.or(
        `email.eq.${String(body.email).toLowerCase()},phone.ilike.%${normalizedPhone}%`,
      );
    } else if (hasEmail) {
      query = query.eq("email", String(body.email).toLowerCase());
    } else if (hasPhone && normalizedPhone) {
      // Loose match by phone digits using ilike to catch formatting differences
      query = query.ilike("phone", `%${normalizedPhone.slice(-7)}%`);
    }

    const { data: existingLeads } = await query;
    if (existingLeads && existingLeads.length > 0) {
      const existing = existingLeads[0];
      const duplicateField =
        hasEmail &&
        existing.email?.toLowerCase() === String(body.email).toLowerCase()
          ? "email"
          : "phone";
      return NextResponse.json(
        {
          success: false,
          error:
            duplicateField === "email"
              ? `A lead with email ${body.email} already exists (${existing.name})`
              : `A lead with this phone number already exists (${existing.name})`,
          duplicateField,
          existingLeadId: existing.id,
        },
        { status: 409 },
      );
    }
  }

  // Log the data we're trying to insert
  console.log("Creating lead with data:", {
    name: body.name,
    email: body.email,
    phone: body.phone,
    organization_id: userWithOrg.organizationId,
    created_by: userWithOrg.id,
  });

  // Build insert data with only essential fields
  const insertData: any = {
    name: body.name,
    organization_id: userWithOrg.organizationId,
  };
  if (hasEmail) insertData.email = String(body.email).toLowerCase();
  if (hasPhone) insertData.phone = body.phone;

  // Add optional fields only if they're provided
  if (body.source) insertData.source = body.source;
  if (body.status) insertData.status = body.status;
  if (body.form_name) insertData.form_name = body.form_name;
  if (body.campaign_name) insertData.campaign_name = body.campaign_name;

  // Create the lead
  const { data: lead, error } = await supabase
    .from("leads")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw DatabaseError.queryError("leads", "insert", {
      organizationId: userWithOrg.organizationId,
      insertData,
      originalError: error.message,
      code: error.code,
      hint: error.hint,
    });
  }

  // Sync lead to contacts/clients table
  try {
    // Split name into first and last name for clients table
    const nameParts = lead.name.trim().split(" ");
    const firstName = nameParts[0] || lead.name;
    const lastName = nameParts.slice(1).join(" ") || "";

    // Check if client already exists with this email
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("email", lead.email.toLowerCase())
      .or(
        `org_id.eq.${userWithOrg.organizationId},organization_id.eq.${userWithOrg.organizationId}`,
      )
      .single();

    if (!existingClient) {
      // Create client entry for the lead
      const clientData: any = {
        first_name: firstName,
        last_name: lastName,
        name: lead.name,
        email: lead.email.toLowerCase(),
        phone: lead.phone,
        status: "active",
        source: lead.source || "lead",
        lead_id: lead.id, // Link back to lead
        created_at: new Date().toISOString(),
      };

      // Try with org_id first
      let { error: clientError } = await supabase.from("clients").insert({
        ...clientData,
        org_id: userWithOrg.organizationId,
      });

      // If org_id doesn't work, try organization_id
      if (
        clientError?.message?.includes("column") ||
        clientError?.message?.includes("org_id")
      ) {
        const result = await supabase.from("clients").insert({
          ...clientData,
          organization_id: userWithOrg.organizationId,
        });

        clientError = result.error;
      }

      if (clientError) {
        console.error("Warning: Failed to sync lead to contacts:", clientError);
        // Don't fail the lead creation if contact sync fails
      } else {
        console.log(`✅ Lead synced to contacts: ${lead.email}`);
      }
    } else {
      console.log(`ℹ️  Contact already exists for email: ${lead.email}`);
    }
  } catch (syncError) {
    console.error("Error syncing lead to contacts:", syncError);
    // Don't fail the lead creation if sync fails
  }

  // Trigger workflow for new lead
  try {
    const webhookResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/lead-created`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead,
          organizationId: userWithOrg.organizationId,
        }),
      },
    );

    if (!webhookResponse.ok) {
      console.error("Failed to trigger lead created webhook");
    }
  } catch (webhookError) {
    console.error("Error triggering workflow:", webhookError);
    // Don't fail the lead creation if webhook fails
  }

  // Invalidate leads cache for this organization
  await cacheService.invalidateOrgCache(userWithOrg.organizationId, "leads");

  return NextResponse.json({
    success: true,
    lead,
  });
}

// Wrap with error boundary
export const POST = withApiErrorBoundary(createLead);

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    const supabase = createClient();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 },
      );
    }

    // Remove fields that shouldn't be updated
    const { id, organization_id, created_by, ...updateData } = body;

    // Update lead - ensure it belongs to the user's organization
    const { data: lead, error } = await supabase
      .from("leads")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .eq("organization_id", userWithOrg.organizationId) // Ensure org owns this lead
      .select()
      .single();

    if (error) {
      console.error("Error updating lead:", error);
      return NextResponse.json(
        { error: "Failed to update lead" },
        { status: 500 },
      );
    }

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found or unauthorized" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      lead,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("id");

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 },
      );
    }

    // First, verify the lead exists and belongs to the organization
    const { data: existingLead, error: checkError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (checkError || !existingLead) {
      return NextResponse.json(
        { error: "Lead not found or unauthorized" },
        { status: 404 },
      );
    }

    // Delete lead - ensure it belongs to the user's organization
    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", leadId)
      .eq("organization_id", userWithOrg.organizationId); // Ensure org owns this lead

    if (error) {
      console.error("Error deleting lead:", error);
      return NextResponse.json(
        { error: "Failed to delete lead" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      deleted: leadId,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
