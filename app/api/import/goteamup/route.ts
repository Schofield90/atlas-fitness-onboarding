import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { GoTeamUpImporter, parseCSV } from "@/app/lib/services/goteamup-import";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organization ID from user's organization membership
    const { data: userOrg } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        {
          error:
            "No organization found. Please ensure you have an active organization membership.",
        },
        { status: 400 },
      );
    }

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
    const rows = await parseCSVContent(fileContent);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    // Create importer
    const importer = new GoTeamUpImporter(userOrg.organization_id);

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
    return NextResponse.json(
      { error: error.message || "Import failed" },
      { status: 500 },
    );
  }
}

// Helper to parse CSV content
async function parseCSVContent(content: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const lines = content.split("\n");
    if (lines.length < 2) {
      resolve([]);
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      data.push(row);
    }

    resolve(data);
  });
}
