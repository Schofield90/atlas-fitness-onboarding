import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UPDATED_CALENDAR_SECTION = `
CALENDAR BOOKING - CRITICAL:

BUSINESS HOURS:
- You take calls Monday - Friday only
- NO calls on Saturday or Sunday
- When suggesting days, ALWAYS check the current day and skip weekends

SMART DAY SUGGESTIONS:
Before suggesting "tomorrow" or any specific day, consider:

1. Current day logic:
   - If today is Friday → Suggest "Monday" (skip weekend)
   - If today is Saturday → Suggest "Monday" (skip weekend)
   - If today is Sunday → Suggest "tomorrow" (Monday)
   - If today is Monday-Thursday → Check availability first

2. Check availability FIRST using check_ghl_availability tool
   - If next business day is fully booked → Suggest the following business day
   - If Monday is fully booked → Suggest Tuesday
   - If Tuesday is fully booked → Suggest Wednesday
   - And so on...

3. Natural language examples:
   - "Are you free Monday for a quick chat?" (when today is Friday/Saturday)
   - "Are you free tomorrow at all?" (when today is Mon-Thu and tomorrow has slots)
   - "Are you free Wednesday at all?" (when today is Mon and Tue is fully booked)

BOOKING TOOL USAGE:
✅ ALWAYS use check_ghl_availability FIRST to see what days/times are available
✅ THEN use book_ghl_appointment when they confirm a specific time
✅ Use tools when ANY specific time is mentioned
✅ Use when they REQUEST a time: "Can you book me in for 10am?"
✅ Use when they CONFIRM a time: "Yes, 2pm tomorrow works"
✅ Use when they CHANGE a time: "Let's do 1pm instead"
✅ Use when they AGREE to a time: "1pm is fine"

CONVERSATION FLOW:
1. Collect name, main goal (fitness/fat loss)
2. Check availability for next available business day
3. Suggest specific day based on availability: "Are you free [DAY] at all for a quick chat?"
4. When they confirm availability, show available times
5. When they choose a time, use book_ghl_appointment to actually book it

Examples that REQUIRE using the booking tool:
- "Can you book me in for a call at 10am tomorrow?"
- "Let's do 2pm"
- "Sorry let's do 1pm"
- "Yes, tomorrow at 3pm works for me"
- "I'm free at 9am"

DO NOT just respond with text - you MUST use the tool to actually book!
`.trim();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Create admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch current agent
    const { data: agent, error: fetchError } = await supabase
      .from("ai_agents")
      .select("system_prompt, name")
      .eq("id", agentId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Agent not found", details: fetchError },
        { status: 404 }
      );
    }

    // Find and replace the CALENDAR BOOKING section
    let updatedPrompt = agent.system_prompt;

    // Find the start of CALENDAR BOOKING section
    const calendarStart = updatedPrompt.indexOf("CALENDAR BOOKING");

    if (calendarStart === -1) {
      // Section doesn't exist, append to end
      updatedPrompt = updatedPrompt + "\n\n" + UPDATED_CALENDAR_SECTION;
    } else {
      // Find the end of the section (next all-caps section or end of prompt)
      const afterCalendar = updatedPrompt.substring(calendarStart);
      const nextSectionMatch = afterCalendar
        .substring(20)
        .match(/\n\n[A-Z][A-Z ]+:/);

      let calendarEnd;
      if (nextSectionMatch) {
        calendarEnd = calendarStart + 20 + nextSectionMatch.index;
      } else {
        calendarEnd = updatedPrompt.length;
      }

      // Replace the section
      updatedPrompt =
        updatedPrompt.substring(0, calendarStart) +
        UPDATED_CALENDAR_SECTION +
        updatedPrompt.substring(calendarEnd);
    }

    // Update the agent
    const { error: updateError } = await supabase
      .from("ai_agents")
      .update({ system_prompt: updatedPrompt })
      .eq("id", agentId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update agent", details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Updated system prompt for ${agent.name}`,
      changes: [
        "Added BUSINESS HOURS section (Mon-Fri only)",
        "Added SMART DAY SUGGESTIONS with weekend logic",
        "Friday/Saturday → Suggest Monday",
        "Check availability before suggesting days",
        "Skip fully booked days automatically",
      ],
    });
  } catch (error: any) {
    console.error("[Update Agent Prompt] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
