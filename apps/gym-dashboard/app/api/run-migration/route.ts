import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if tables already exist
    const { data: existingTables } = await supabase
      .from("landing_pages")
      .select("id")
      .limit(1);

    if (existingTables) {
      return NextResponse.json({
        message: "Tables already exist",
        status: "skipped",
      });
    }

    // If tables don't exist, we'll return instructions
    const migrationPath = path.join(
      process.cwd(),
      "supabase/migrations/20250105_landing_page_builder.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    return NextResponse.json({
      message: "Please run the following SQL in Supabase SQL editor",
      sql: migrationSQL,
      instructions: [
        "1. Go to Supabase Dashboard",
        "2. Navigate to SQL Editor",
        "3. Copy and paste the SQL",
        "4. Click RUN",
      ],
    });
  } catch (error: any) {
    console.error("Migration check error:", error);
    return NextResponse.json(
      {
        error: error.message,
        hint: "Tables might not exist yet. Please run the migration.",
      },
      { status: 500 },
    );
  }
}
