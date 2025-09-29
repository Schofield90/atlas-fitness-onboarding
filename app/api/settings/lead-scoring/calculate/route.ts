import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

interface ScoringRule {
  id: string;
  name: string;
  category: string;
  condition: string;
  points: number;
  is_active: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadId } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: "Lead ID required" }, { status: 400 });
    }

    // Get organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select(
        `
        *,
        bookings(count),
        messages(count),
        calls(count)
      `,
      )
      .eq("id", leadId)
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Get scoring settings
    const { data: settings } = await supabase
      .from("lead_scoring_settings")
      .select("*")
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (!settings || !settings.scoring_enabled) {
      return NextResponse.json({
        score: 0,
        threshold: "cold",
        message: "Scoring not enabled",
      });
    }

    // Calculate score based on rules
    let totalScore = 0;
    const triggeredRules: string[] = [];
    const rules = settings.rules as ScoringRule[];

    for (const rule of rules) {
      if (!rule.is_active) continue;

      let ruleMatched = false;

      // Evaluate rule conditions (simplified version)
      switch (rule.condition) {
        case "booking.type = tour":
          // Check if lead has tour bookings
          const { data: tourBookings } = await supabase
            .from("bookings")
            .select("id")
            .eq("lead_id", leadId)
            .eq("type", "tour")
            .limit(1);

          if (tourBookings && tourBookings.length > 0) {
            ruleMatched = true;
          }
          break;

        case "booking.status = completed":
          // Check if lead has completed bookings
          const { data: completedBookings } = await supabase
            .from("bookings")
            .select("id")
            .eq("lead_id", leadId)
            .eq("status", "completed")
            .limit(1);

          if (completedBookings && completedBookings.length > 0) {
            ruleMatched = true;
          }
          break;

        case "lead.source = website":
          if (lead.source === "website") {
            ruleMatched = true;
          }
          break;

        case "lead.source = referral":
          if (lead.source === "referral") {
            ruleMatched = true;
          }
          break;

        case "message.type = inbound":
          // Check for inbound messages
          const { data: messages } = await supabase
            .from("messages")
            .select("id")
            .eq("lead_id", leadId)
            .eq("direction", "inbound")
            .limit(1);

          if (messages && messages.length > 0) {
            ruleMatched = true;
          }
          break;

        case "lead.phone AND lead.email":
          if (lead.phone && lead.email) {
            ruleMatched = true;
          }
          break;

        case "lead.goals IS NOT NULL":
          if (lead.custom_fields?.goals) {
            ruleMatched = true;
          }
          break;

        default:
          // For other conditions, apply a simplified logic
          // In production, you'd implement a proper condition evaluator
          break;
      }

      if (ruleMatched) {
        totalScore += rule.points;
        triggeredRules.push(rule.name);
      }
    }

    // Apply score decay if enabled
    if (settings.decay_enabled && lead.created_at) {
      const daysSinceCreation = Math.floor(
        (Date.now() - new Date(lead.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysSinceCreation > settings.decay_days) {
        const decayFactor = 1 - settings.decay_percentage / 100;
        totalScore = Math.floor(totalScore * decayFactor);
      }
    }

    // Determine threshold
    const thresholds = settings.thresholds as any[];
    const currentThreshold =
      thresholds.find(
        (t) => totalScore >= t.min_score && totalScore <= t.max_score,
      ) || thresholds[0];

    // Update lead score
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        score: totalScore,
        score_label: currentThreshold.label,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("Failed to update lead score:", updateError);
    }

    // Record scoring history
    await supabase.from("lead_scoring_history").insert({
      organization_id: userOrg.organization_id,
      lead_id: leadId,
      score: totalScore,
      previous_score: lead.score || 0,
      rule_triggered: triggeredRules.join(", "),
      points_added: totalScore - (lead.score || 0),
      threshold_reached: currentThreshold.label,
    });

    // Check for auto-assignment
    if (
      settings.auto_assign_enabled &&
      totalScore >= settings.auto_assign_threshold
    ) {
      // Find available staff member
      const { data: availableStaff } = await supabase
        .from("users")
        .select("id")
        .eq("organization_id", userOrg.organization_id)
        .eq("is_available", true)
        .limit(1);

      if (availableStaff && availableStaff.length > 0) {
        await supabase
          .from("leads")
          .update({
            assigned_to: availableStaff[0].id,
            assignment_date: new Date().toISOString(),
          })
          .eq("id", leadId);
      }
    }

    // Check for notifications
    if (totalScore >= settings.notification_threshold) {
      // Trigger notification (you can implement this based on your notification system)
      console.log(`High score alert: Lead ${leadId} scored ${totalScore}`);
    }

    return NextResponse.json({
      success: true,
      score: totalScore,
      threshold: currentThreshold.label,
      thresholdColor: currentThreshold.color,
      triggeredRules,
      actions: currentThreshold.actions,
    });
  } catch (error) {
    console.error("Lead scoring error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Batch calculate scores for all leads
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // Get all active leads
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", userOrg.organization_id)
      .eq("status", "active");

    if (leadsError || !leads) {
      return NextResponse.json(
        { error: "Failed to fetch leads" },
        { status: 500 },
      );
    }

    // Calculate scores for each lead
    let processedCount = 0;
    let errorCount = 0;

    for (const lead of leads) {
      try {
        // Call the calculate function for each lead
        const response = await fetch(
          `${request.url.replace("/calculate", "")}/calculate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({ leadId: lead.id }),
          },
        );

        if (response.ok) {
          processedCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`Failed to score lead ${lead.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      totalLeads: leads.length,
      processedCount,
      errorCount,
      message: `Scored ${processedCount} leads successfully`,
    });
  } catch (error) {
    console.error("Batch scoring error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
