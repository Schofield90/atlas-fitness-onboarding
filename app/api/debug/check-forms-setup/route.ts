import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check if forms table exists
    const { data: tables, error: tablesError } = await supabase
      .from("forms")
      .select("count")
      .limit(1);

    // Check OpenAI configuration
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    const openAIKeyPrefix = process.env.OPENAI_API_KEY?.substring(0, 7) + "...";

    // Try to list forms
    let formsCount = 0;
    let formsError = null;

    if (!tablesError) {
      const { count, error } = await supabase
        .from("forms")
        .select("*", { count: "exact", head: true });

      formsCount = count || 0;
      formsError = error;
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      checks: {
        formsTableExists: !tablesError,
        formsTableError: tablesError?.message || null,
        hasOpenAIKey,
        openAIKeyPrefix: hasOpenAIKey ? openAIKeyPrefix : null,
        nodeEnv: process.env.NODE_ENV,
        formsCount,
        formsError: formsError?.message || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
