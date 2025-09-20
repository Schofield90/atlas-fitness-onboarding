import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get all knowledge entries
    const { data: knowledge, error } = await supabase
      .from("knowledge")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to fetch knowledge",
          details: error.message,
        },
        { status: 500 },
      );
    }

    // Get count
    const { count } = await supabase
      .from("knowledge")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      totalCount: count,
      recentEntries: knowledge?.map((k) => ({
        id: k.id,
        type: k.type,
        content: k.content.substring(0, 200) + "...",
        metadata: k.metadata,
        created_at: k.created_at,
      })),
      rawSample: knowledge?.slice(0, 3),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Server error",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
