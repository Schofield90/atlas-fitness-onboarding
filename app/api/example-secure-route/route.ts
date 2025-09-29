import { NextRequest } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import {
  secureRoute,
  SecureResponse,
  createOrgScopedQuery,
} from "@/app/lib/api/secure-route";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

/**
 * Example secure API route using the new security middleware
 * This demonstrates best practices for organization-scoped data access
 */

// GET - Fetch organization-scoped data with automatic security
export const GET = secureRoute(
  async ({ organizationId, userId, request }) => {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    // Create organization-scoped query - automatically filters by organization_id
    const query = createOrgScopedQuery(supabase, "leads", organizationId);

    const { data: leads, error } = await query
      .select("id, name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return SecureResponse.error(
        "Failed to fetch leads",
        "DATABASE_ERROR",
        500,
      );
    }

    return SecureResponse.success(leads, {
      count: leads?.length || 0,
      organizationId,
      userId,
    });
  },
  {
    // Optional: Require specific role
    requiredRole: "staff",
    // Optional: Apply rate limiting
    rateLimit: {
      requests: 100,
      windowMs: 60 * 1000, // 1 minute
    },
  },
);

// POST - Create new organization-scoped data with automatic security
export const POST = secureRoute(
  async ({ organizationId, userId, request }) => {
    const supabase = await createClient();

    try {
      const body = await request.json();

      // Validate required fields
      if (!body.name || !body.email) {
        return SecureResponse.error(
          "Name and email are required",
          "VALIDATION_ERROR",
          400,
        );
      }

      // Create organization-scoped query - automatically adds organization_id
      const query = createOrgScopedQuery(supabase, "leads", organizationId);

      const { data: newLead, error } = await query.insert({
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        created_by: userId,
      });

      if (error) {
        return SecureResponse.error(
          "Failed to create lead",
          "DATABASE_ERROR",
          500,
        );
      }

      return SecureResponse.success(newLead, { organizationId });
    } catch (error) {
      return SecureResponse.error(
        "Invalid JSON payload",
        "INVALID_PAYLOAD",
        400,
      );
    }
  },
  {
    requiredRole: "staff",
  },
);

// PUT - Update organization-scoped data with ownership validation
export const PUT = secureRoute(
  async ({ organizationId, userId, request }) => {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("id");

    if (!leadId) {
      return SecureResponse.error(
        "Lead ID is required",
        "VALIDATION_ERROR",
        400,
      );
    }

    try {
      const body = await request.json();

      // Create organization-scoped query - automatically validates organization ownership
      const query = createOrgScopedQuery(supabase, "leads", organizationId);

      const { data: updatedLead, error } = await query.update(leadId, {
        ...body,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      });

      if (error) {
        return SecureResponse.error(
          "Failed to update lead",
          "DATABASE_ERROR",
          500,
        );
      }

      if (!updatedLead) {
        return SecureResponse.notFound("Lead not found or unauthorized");
      }

      return SecureResponse.success(updatedLead);
    } catch (error) {
      return SecureResponse.error(
        "Invalid JSON payload",
        "INVALID_PAYLOAD",
        400,
      );
    }
  },
  {
    requiredRole: "staff",
  },
);

// DELETE - Delete organization-scoped data with ownership validation
export const DELETE = secureRoute(
  async ({ organizationId, userId, request }) => {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("id");

    if (!leadId) {
      return SecureResponse.error(
        "Lead ID is required",
        "VALIDATION_ERROR",
        400,
      );
    }

    // Create organization-scoped query - automatically validates organization ownership
    const query = createOrgScopedQuery(supabase, "leads", organizationId);

    const { error } = await query.delete(leadId);

    if (error) {
      return SecureResponse.error(
        "Failed to delete lead",
        "DATABASE_ERROR",
        500,
      );
    }

    return SecureResponse.success({ deleted: true, id: leadId });
  },
  {
    requiredRole: "admin", // Higher permission required for deletion
  },
);
