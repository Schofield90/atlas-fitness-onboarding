import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export interface ExtractedClass {
  name: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  instructor?: string;
  location?: string;
  capacity: number;
  recurring: boolean;
}

/**
 * POST /api/classes/import/teamup-pdf/analyze
 * Analyze TeamUp PDF using GPT-4 Vision to extract class schedule data
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { base64, filename } = body;

    if (!base64) {
      return NextResponse.json(
        { error: "No PDF data provided" },
        { status: 400 },
      );
    }

    // Initialize OpenAI client inside function to avoid build-time errors
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `You are analyzing a TeamUp class schedule PDF. Extract ALL classes from this weekly schedule.

For each class, extract:
- Class name (e.g., "Strength and Combat Fitness", "Group Personal Training Session")
- Day of week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
- Start time (24-hour format HH:MM)
- End time (24-hour format HH:MM)
- Instructor name (if visible)
- Location (extract [YO] York or [HG] Harrogate from class title, or look for venue indicators)
- Capacity (number from "X / Y" format - use Y as capacity)

Important notes:
- Each class should be treated as RECURRING (weekly)
- If you see "[YO]" in the class name, location is "York"
- If you see "[HG]" in the class name, location is "Harrogate"
- Extract the actual class name WITHOUT the location prefix
- Capacity is the SECOND number in the "X / Y" format (e.g., "4 / 12" means capacity is 12)
- If multiple classes have the same name, time, and instructor on different days, create separate entries

Format your response as JSON with this structure:
{
  "classes": [
    {
      "name": "class name without location prefix",
      "dayOfWeek": "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "instructor": "instructor name",
      "location": "York|Harrogate",
      "capacity": 12,
      "recurring": true
    }
  ],
  "summary": {
    "totalClasses": 0,
    "uniqueClassTypes": 0,
    "locations": ["York", "Harrogate"],
    "instructors": ["list of instructor names"],
    "weekCoverage": "October 5-11, 2025"
  }
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a data extraction specialist. Extract class schedule data from TeamUp PDFs with high accuracy. Return valid JSON only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${base64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    return NextResponse.json({
      success: true,
      data: {
        classes: result.classes || [],
        summary: result.summary || {},
        analyzedAt: new Date().toISOString(),
        filename,
      },
    });
  } catch (error: any) {
    console.error("PDF analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze PDF" },
      { status: 500 },
    );
  }
}
