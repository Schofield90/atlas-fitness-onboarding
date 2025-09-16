import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { GoTeamUpImporter, parseCSV } from "@/app/lib/services/goteamup-import";
import type { Database } from "@/app/lib/supabase/database.types";

export const maxDuration = 60; // Set max duration to 60 seconds for Vercel

// Create a simple server client for API routes
async function createAPIClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        set(name: string, value: string, options: any) {
          // API routes can't set cookies in response
          // but we need to provide the function
        },
        remove(name: string, options: any) {
          // API routes can't remove cookies in response
          // but we need to provide the function
        },
      },
    },
  );
}

export async function POST(request: NextRequest) {
  console.log("GoTeamUp import endpoint called");

  try {
    // Ensure we're in server environment
    if (typeof window !== "undefined") {
      console.error("Import API called from client side!");
      return NextResponse.json({ error: "Server-side only" }, { status: 500 });
    }

    // Create supabase client
    const supabase = await createAPIClient();

    // Get session first (like middleware does)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    console.log("Session check:", {
      hasSession: !!session,
      userId: session?.user?.id,
      error: sessionError,
    });

    if (sessionError || !session || !session.user) {
      console.error("Auth failed:", sessionError || "No session");

      // Try to get user as fallback
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No user either:", userError);
        return NextResponse.json(
          { error: "Unauthorized - please log in again" },
          { status: 401 },
        );
      }

      // User exists but session might be expired, try to use it anyway
      console.log("Found user without session, continuing:", user.id);
    }

    const userId =
      session?.user?.id || (await supabase.auth.getUser()).data.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Unable to identify user" },
        { status: 401 },
      );
    }

    // Get organization ID from user's organization membership
    // Check both tables (same logic as middleware)
    let organizationId: string | null = null;

    // First check organization_staff table (new structure)
    const { data: staffOrg } = await supabase
      .from("organization_staff")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (staffOrg?.organization_id) {
      organizationId = staffOrg.organization_id;
    } else {
      // Fallback to organization_members table (old structure)
      const { data: memberOrg } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (memberOrg?.organization_id) {
        organizationId = memberOrg.organization_id;
      }
    }

    if (!organizationId) {
      console.error("No organization found for user:", userId);
      return NextResponse.json(
        {
          error:
            "No organization found. Please ensure you have an active organization membership.",
        },
        { status: 400 },
      );
    }

    console.log("Organization found:", organizationId);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("type") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "File must be a CSV" },
        { status: 400 },
      );
    }

    // Parse CSV
    const fileContent = await file.text();
    const rows = parseCSVContent(fileContent);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    // Create importer with supabase client
    const importer = new GoTeamUpImporter(supabase, organizationId);

    // Auto-detect type if not specified
    let importType = fileType;
    if (!importType || importType === "auto") {
      const headers = Object.keys(rows[0]);
      importType = importer.detectFileType(headers);

      if (importType === "unknown") {
        return NextResponse.json(
          {
            error:
              "Could not detect file type. Please specify if this is a payments or attendance file.",
          },
          { status: 400 },
        );
      }
    }

    // Import data
    let result;
    if (importType === "payments") {
      result = await importer.importPayments(rows);
    } else if (importType === "attendance") {
      result = await importer.importAttendance(rows);
    } else {
      return NextResponse.json(
        { error: "Invalid import type" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      stats: result.stats,
      errors: result.errors,
      type: importType,
    });
  } catch (error: any) {
    console.error("Import error:", error);

    // Handle timeout specifically
    if (error.message?.includes("timeout") || error.message?.includes("504")) {
      return NextResponse.json(
        {
          error:
            "Import is taking too long. Try importing a smaller file or split your data into multiple files.",
          details: "Maximum processing time is 60 seconds",
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Import failed" },
      { status: 500 },
    );
  }
}

// Helper to parse CSV content (handles quoted values properly)
function parseCSVContent(content: string): any[] {
  const lines = content.split("\n");
  if (lines.length < 2) {
    return [];
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  const data = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    data.push(row);
  }

  return data;
}

// Helper to parse a single CSV line (handles quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result.map((cell) => cell.replace(/^"|"$/g, ""));
}
