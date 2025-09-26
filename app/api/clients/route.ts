import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import {
  handleApiError,
  ValidationError,
  DatabaseError,
  withApiErrorBoundary,
} from "@/app/lib/errors";

async function createClientMember(request: NextRequest) {
  // Check authentication and get organization
  const userWithOrg = await requireAuth();

  const supabase = await createClient();
  const body = await request.json();

  // Validate required fields
  if (!body.first_name) {
    throw ValidationError.required("first_name", { body });
  }
  if (!body.last_name) {
    throw ValidationError.required("last_name", { body });
  }
  if (!body.email) {
    throw ValidationError.required("email", { body });
  }
  if (!body.phone) {
    throw ValidationError.required("phone", { body });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    throw ValidationError.invalid("email", body.email, "valid email address");
  }

  // Check for existing client with same email or phone in this organization
  const orgId = userWithOrg.organizationId;

  // Normalize email for comparison
  const normalizedEmail = body.email.toLowerCase().trim();

  // Check for duplicate email in the same organization
  // Only org_id column exists in the database
  const { data: dupByEmail } = await supabase
    .from("clients")
    .select("id")
    .ilike("email", normalizedEmail)
    .eq("organization_id", orgId)
    .limit(1);

  if (dupByEmail && dupByEmail.length > 0) {
    throw ValidationError.duplicate("email", body.email);
  }

  // Check for duplicate by name (to prevent creating multiple entries for same person)
  const normalizedFirstName = body.first_name.toLowerCase().trim();
  const normalizedLastName = body.last_name.toLowerCase().trim();

  const { data: dupByName } = await supabase
    .from("clients")
    .select("id, email, phone")
    .ilike("first_name", normalizedFirstName)
    .ilike("last_name", normalizedLastName)
    .eq("organization_id", orgId)
    .limit(1);

  if (dupByName && dupByName.length > 0) {
    // If same name exists, check if it might be the same person
    const existing = dupByName[0];
    const existingPhone = String(existing.phone || "").replace(/\D/g, "");
    const newPhone = String(body.phone || "").replace(/\D/g, "");

    // If phone matches or email domain matches, likely same person
    const existingEmailDomain = existing.email?.split("@")[1];
    const newEmailDomain = normalizedEmail.split("@")[1];

    if (existingPhone === newPhone || existingEmailDomain === newEmailDomain) {
      throw new ValidationError(
        `A member named ${body.first_name} ${body.last_name} already exists. If this is a different person, please add a middle initial or other distinguishing information.`,
        "duplicate_person",
        { existing: existing.email },
      );
    }
  }

  // Check for duplicate phone in the same organization
  if (body.phone) {
    const normalizedPhone = String(body.phone).replace(/\D/g, "");

    // Query for clients in the same organization with phone numbers
    const { data: clientsInOrg } = await supabase
      .from("clients")
      .select("id, phone")
      .eq("organization_id", orgId)
      .not("phone", "is", null);

    // Check if any of the returned clients have a matching phone
    const hasMatchingPhone = clientsInOrg?.some((client) => {
      const clientPhone = String(client.phone || "").replace(/\D/g, "");
      return clientPhone === normalizedPhone;
    });

    if (hasMatchingPhone) {
      throw ValidationError.duplicate("phone", body.phone);
    }
  }

  // Build insert data with core required fields only
  const insertData: any = {
    first_name: body.first_name.trim(),
    last_name: body.last_name.trim(),
    email: normalizedEmail,
    phone: body.phone,
    org_id: userWithOrg.organizationId,
    status: "active",
  };

  // Store additional data in metadata if columns don't exist
  const metadata: any = {};

  // Try to add optional fields directly, fall back to metadata
  const optionalFields = [
    { key: "created_by", value: userWithOrg.id },
    { key: "date_of_birth", value: body.date_of_birth },
    { key: "address", value: body.address },
    { key: "emergency_contact_name", value: body.emergency_contact_name },
    { key: "emergency_contact_phone", value: body.emergency_contact_phone },
    { key: "goals", value: body.goals },
    { key: "medical_conditions", value: body.medical_conditions },
    { key: "source", value: body.source },
  ];

  for (const field of optionalFields) {
    if (
      field.value !== undefined &&
      field.value !== null &&
      field.value !== ""
    ) {
      // For now, add all fields directly - if table has missing columns,
      // the error will be caught and handled by the error boundary
      insertData[field.key] = field.value;
    }
  }

  // Create the client - try with all fields first
  let { data: client, error } = await supabase
    .from("clients")
    .insert(insertData)
    .select()
    .single();

  // If error is due to missing columns, try with minimal data
  if (
    error &&
    (error.code === "42703" ||
      error.message?.includes("column") ||
      error.message?.includes("does not exist"))
  ) {
    console.log(
      "Retrying with minimal client data due to missing columns:",
      error.message,
    );

    // Minimal insert data with only core columns
    const minimalData = {
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      phone: body.phone,
      org_id: userWithOrg.organizationId,
      status: "active",
    };

    // Store extra data in metadata if it exists
    const metadata: any = {};
    if (body.date_of_birth) metadata.date_of_birth = body.date_of_birth;
    if (body.address) metadata.address = body.address;
    if (body.emergency_contact_name)
      metadata.emergency_contact_name = body.emergency_contact_name;
    if (body.emergency_contact_phone)
      metadata.emergency_contact_phone = body.emergency_contact_phone;
    if (body.goals) metadata.goals = body.goals;
    if (body.medical_conditions)
      metadata.medical_conditions = body.medical_conditions;
    if (body.source) metadata.source = body.source;
    metadata.created_by = userWithOrg.id;

    if (Object.keys(metadata).length > 0) {
      minimalData.metadata = metadata;
    }

    // Try again with minimal data
    const result = await supabase
      .from("clients")
      .insert(minimalData)
      .select()
      .single();

    client = result.data;
    error = result.error;
  }

  if (error) {
    console.error("Database error when creating client:", {
      error: error.message,
      code: error.code,
      hint: error.hint,
      details: error.details,
      insertData: insertData,
    });

    throw DatabaseError.queryError("clients", "insert", {
      organizationId: userWithOrg.organizationId,
      insertData,
      originalError: error.message,
      code: error.code,
      hint: error.hint,
      details: error.details,
    });
  }

  return NextResponse.json({
    success: true,
    client,
  });
}

// Wrap with error boundary
export const POST = withApiErrorBoundary(createClientMember);

async function getClients(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "50");

    const supabase = await createClient();

    // Calculate range for pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    console.log(
      "Fetching clients for organization:",
      userWithOrg.organizationId,
    );

    // Build base query - filter by organization_id
    let query = supabase
      .from("clients")
      .select("*", { count: "exact" })
      .eq("organization_id", userWithOrg.organizationId)
      .order("created_at", { ascending: false })
      .range(from, to);

    // Apply status filter
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Execute query
    let { data: clients, error, count } = await query;

    if (error) {
      throw DatabaseError.queryError("clients", "select", {
        filters: { status },
        organizationId: userWithOrg.organizationId,
        originalError: error.message,
        code: error.code,
      });
    }

    // If we have clients, fetch their memberships separately to avoid join issues
    let enrichedClients = clients || [];
    if (clients && clients.length > 0) {
      const clientIds = clients.map((c) => c.id);

      // Fetch memberships for these clients from customer_memberships table
      // This table uses client_id for clients and customer_id for leads
      const { data: memberships, error: membershipError } = await supabase
        .from("customer_memberships")
        .select("*")
        .in("client_id", clientIds);

      console.log(
        "Fetched memberships:",
        memberships?.length || 0,
        "for",
        clientIds.length,
        "clients",
      );
      if (membershipError) {
        console.error("Error fetching memberships:", membershipError);
      }

      // Fetch membership plans (table uses organization_id not org_id)
      const { data: membershipPlans, error: plansError } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("organization_id", userWithOrg.organizationId);

      console.log("Fetched membership plans:", membershipPlans?.length || 0);
      if (plansError) {
        console.error("Error fetching membership plans:", plansError);
      }

      // Combine the data
      enrichedClients = clients.map((client) => {
        const clientMemberships = (memberships || [])
          .filter((m) => m.client_id === client.id)
          .map((membership) => {
            const plan = (membershipPlans || []).find(
              (p) => p.id === membership.membership_plan_id,
            );
            return {
              ...membership,
              membership_plan: plan || null,
            };
          });

        return {
          ...client,
          memberships: clientMemberships,
        };
      });
    }

    return NextResponse.json({
      success: true,
      clients: enrichedClients,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
      organizationId: userWithOrg.organizationId,
    });
  } catch (error) {
    console.error("Error in getClients:", error);
    return handleApiError(error);
  }
}

// Export directly without error boundary since we handle errors internally
export const GET = getClients; // Force rebuild Thu  4 Sep 2025 16:22:52 BST
