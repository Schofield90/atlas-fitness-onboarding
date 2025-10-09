import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import Anthropic from "@anthropic-ai/sdk";

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

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `Extract ALL classes from this TeamUp PDF (ENTIRE document, ALL pages).

For EACH class slot, extract:
- name: Class name (remove [YO]/[HG] prefixes)
- day: Mon|Tue|Wed|Thu|Fri|Sat|Sun
- start: HH:MM (24hr)
- end: HH:MM (24hr)
- instructor: Name (if visible)
- location: York|Harrogate (from [YO]/[HG] prefix)
- capacity: Number from "X/Y" format (use Y)

Return COMPACT JSON (no whitespace, short keys):
{"c":[{"n":"Class","d":"Mon","s":"06:00","e":"07:00","i":"Name","l":"York","cap":12}],"t":50}

Keys: n=name, d=day, s=start, e=end, i=instructor, l=location, cap=capacity, t=total count
Process ALL pages. Same class at different times/days = separate entries.`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8192, // Compact format allows 50+ classes within 8K limit
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
      temperature: 0, // Zero for deterministic, consistent extraction
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

    const compactResult = JSON.parse(responseText);

    // Transform compact format to full format
    const dayMap: Record<string, string> = {
      Mon: "Monday",
      Tue: "Tuesday",
      Wed: "Wednesday",
      Thu: "Thursday",
      Fri: "Friday",
      Sat: "Saturday",
      Sun: "Sunday",
    };

    const classes = (compactResult.c || []).map((c: any) => ({
      name: c.n,
      dayOfWeek: dayMap[c.d] || c.d,
      startTime: c.s,
      endTime: c.e,
      instructor: c.i,
      location: c.l,
      capacity: c.cap,
      recurring: true,
    }));

    return NextResponse.json({
      success: true,
      data: {
        classes,
        summary: {
          totalClasses: compactResult.t || classes.length,
          uniqueClassTypes: new Set(classes.map((c: any) => c.name)).size,
          locations: [...new Set(classes.map((c: any) => c.location).filter(Boolean))],
          instructors: [...new Set(classes.map((c: any) => c.instructor).filter(Boolean))],
          weekCoverage: "Recurring weekly",
        },
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
