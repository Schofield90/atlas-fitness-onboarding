import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    const prompt = `You are analyzing a TeamUp class schedule PDF. This document contains MULTIPLE PAGES (typically 4 pages).

CRITICAL INSTRUCTIONS:
1. Process the ENTIRE DOCUMENT - ALL PAGES, not just the first page
2. Extract EVERY SINGLE CLASS SLOT from EVERY PAGE
3. Same class name at different times = separate entries (e.g., "Yoga" at 6am + "Yoga" at 7am = 2 entries)
4. Different days also = separate entries (e.g., "Yoga" on Monday + "Yoga" on Tuesday = 2 entries)

For each class, extract:
- Class name (e.g., "Strength and Combat Fitness", "Group Personal Training Session")
- Day of week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
- Start time (24-hour format HH:MM)
- End time (24-hour format HH:MM)
- Instructor name (if visible)
- Location (extract [YO] York or [HG] Harrogate from class title, or look for venue indicators)
- Capacity (number from "X / Y" format - use Y as capacity)

Important notes:
- **PROCESS ALL PAGES** - Don't stop after the first page, continue through the entire document
- Each class should be treated as RECURRING (weekly)
- If you see "[YO]" in the class name, location is "York"
- If you see "[HG]" in the class name, location is "Harrogate"
- Extract the actual class name WITHOUT the location prefix
- Capacity is the SECOND number in the "X / Y" format (e.g., "4 / 12" means capacity is 12)
- Typical TeamUp PDFs have 40-50 classes across multiple pages - make sure you've captured them all

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

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8192, // Increased for multi-page PDFs with 40+ classes
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      temperature: 0.3,
    });

    // Extract text content from Claude's response
    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON from response (handle multiple formats)
    let responseText = textContent.text;

    // Try to extract JSON from markdown code blocks first
    const markdownMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (markdownMatch) {
      responseText = markdownMatch[1];
    } else {
      // Try to extract raw JSON object (handle conversational text before JSON)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
    }

    const result = JSON.parse(responseText);

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
