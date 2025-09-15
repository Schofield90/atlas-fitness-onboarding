import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  try {
    const { organizationId, fileName } = await request.json();
    const supabaseAdmin = createAdminClient();

    // Get all clients for matching
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from("clients")
      .select("id, email, name, first_name, last_name")
      .eq("organization_id", organizationId);

    if (clientsError || !clients || clients.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No clients found",
      });
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("migrations")
      .download(fileName);

    if (downloadError || !fileData) {
      return NextResponse.json({
        success: false,
        error: "Failed to download file",
      });
    }

    const csvText = await fileData.text();
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (!parseResult.data || parseResult.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No data found in CSV",
      });
    }

    // Analyze first 10 rows
    const sampleRows = parseResult.data.slice(0, 10);
    const analysis = {
      totalRows: parseResult.data.length,
      headers: Object.keys(parseResult.data[0] as any),
      clientsInDatabase: clients.length,
      sampleClientNames: clients.slice(0, 5).map((c) => ({
        name: c.name,
        email: c.email,
        firstName: c.first_name,
        lastName: c.last_name,
      })),
      sampleCsvRows: [],
      matchingAnalysis: [],
    };

    // Analyze each sample row
    for (const row of sampleRows as any[]) {
      const rowAnalysis: any = {
        row: row,
        extractedEmail: null,
        extractedName: null,
        extractedDate: null,
        matchFound: false,
        matchReason: null,
      };

      // Extract email
      const email =
        row.Email ||
        row.email ||
        row["Email Address"] ||
        row["Client Email"] ||
        row["Member Email"] ||
        null;

      rowAnalysis.extractedEmail = email;

      // Extract name
      const name =
        row.Name ||
        row.name ||
        row["Client Name"] ||
        row["Member Name"] ||
        row.Client ||
        row.Member ||
        row.Customer ||
        row["Full Name"] ||
        (row["First Name"] && row["Last Name"])
          ? `${row["First Name"]} ${row["Last Name"]}`
          : null;

      rowAnalysis.extractedName = name;

      // Extract date
      const date =
        row.Date ||
        row.date ||
        row["Class Date"] ||
        row["Attendance Date"] ||
        row["Booking Date"] ||
        row["Session Date"] ||
        row["Visit Date"] ||
        null;

      rowAnalysis.extractedDate = date;

      // Try to match
      if (email) {
        const clientMatch = clients.find(
          (c) =>
            c.email &&
            c.email.toLowerCase().trim() === email.toLowerCase().trim(),
        );
        if (clientMatch) {
          rowAnalysis.matchFound = true;
          rowAnalysis.matchReason = `Email match: ${email}`;
          rowAnalysis.matchedClient = clientMatch;
        }
      }

      if (!rowAnalysis.matchFound && name) {
        const clientMatch = clients.find((c) => {
          if (
            c.name &&
            c.name.toLowerCase().trim() === name.toLowerCase().trim()
          ) {
            return true;
          }
          if (c.first_name && c.last_name) {
            const fullName = `${c.first_name} ${c.last_name}`
              .toLowerCase()
              .trim();
            const lastFirst = `${c.last_name}, ${c.first_name}`
              .toLowerCase()
              .trim();
            return (
              fullName === name.toLowerCase().trim() ||
              lastFirst === name.toLowerCase().trim()
            );
          }
          return false;
        });
        if (clientMatch) {
          rowAnalysis.matchFound = true;
          rowAnalysis.matchReason = `Name match: ${name}`;
          rowAnalysis.matchedClient = clientMatch;
        }
      }

      if (!rowAnalysis.matchFound) {
        rowAnalysis.matchReason = "No match found - client not in database";
      }

      analysis.matchingAnalysis.push(rowAnalysis);
    }

    // Calculate match rate
    const matchCount = analysis.matchingAnalysis.filter(
      (a) => a.matchFound,
    ).length;
    const matchRate = (matchCount / analysis.matchingAnalysis.length) * 100;

    return NextResponse.json({
      success: true,
      analysis,
      summary: {
        sampleSize: analysis.matchingAnalysis.length,
        matchedRows: matchCount,
        unmatchedRows: analysis.matchingAnalysis.length - matchCount,
        matchRate: `${matchRate.toFixed(1)}%`,
        recommendation:
          matchRate < 50
            ? "Low match rate - check if client names/emails in CSV match those in database"
            : "Good match rate - import should work",
      },
    });
  } catch (error: any) {
    console.error("Debug analysis error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Analysis failed",
    });
  }
}
