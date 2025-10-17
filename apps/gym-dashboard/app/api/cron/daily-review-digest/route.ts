import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import {
  getPendingFlagsForDigest,
  markFlagsIncludedInDigest,
  getConversationContext,
} from "@/app/lib/ai-agents/sentiment-detector";

/**
 * Daily Review Digest Cron Job
 *
 * Runs daily at 8am UTC (9am BST / 8am GMT)
 * Sends email digest of flagged conversations to sam@gymleadhub.co.uk
 *
 * Route: GET /api/cron/daily-review-digest
 * Cron: 0 8 * * * (daily at 8am UTC)
 */

const REVIEW_EMAIL = "sam@gymleadhub.co.uk";

export async function GET(request: NextRequest) {
  console.log("[Daily Digest] Starting daily review digest generation...");

  try {
    // 1. Fetch all pending flags (across all organizations)
    const pendingFlags = await getPendingFlagsForDigest();

    console.log(`[Daily Digest] Found ${pendingFlags.length} pending flags`);

    if (pendingFlags.length === 0) {
      console.log("[Daily Digest] No flags to review, skipping email");
      return NextResponse.json({
        success: true,
        message: "No flags to review",
        flagsReviewed: 0,
      });
    }

    // 2. Group flags by severity
    const critical = pendingFlags.filter((f) => f.severity === "critical");
    const high = pendingFlags.filter((f) => f.severity === "high");
    const medium = pendingFlags.filter((f) => f.severity === "medium");
    const low = pendingFlags.filter((f) => f.severity === "low");

    // 3. Build email content
    const emailSubject = `AI Agent Review Digest - ${pendingFlags.length} Flagged Conversations`;

    const emailHtml = await buildDigestEmail({
      critical,
      high,
      medium,
      low,
      totalFlags: pendingFlags.length,
    });

    // 4. Send email via Resend (if configured)
    let emailSent = false;

    if (process.env.RESEND_API_KEY) {
      try {
        const Resend = (await import("resend")).Resend;
        const resend = new Resend(process.env.RESEND_API_KEY);

        const { data, error } = await resend.emails.send({
          from: "AI Agent System <noreply@gymleadhub.co.uk>",
          to: REVIEW_EMAIL,
          subject: emailSubject,
          html: emailHtml,
        });

        if (error) {
          console.error("[Daily Digest] Email send error:", error);
        } else {
          console.log("[Daily Digest] Email sent successfully:", data);
          emailSent = true;
        }
      } catch (emailError) {
        console.error("[Daily Digest] Email error:", emailError);
      }
    } else {
      console.warn("[Daily Digest] RESEND_API_KEY not configured, skipping email");
      console.log("[Daily Digest] Email preview:");
      console.log("Subject:", emailSubject);
      console.log("HTML:", emailHtml.substring(0, 500) + "...");
    }

    // 5. Mark flags as included in digest
    const flagIds = pendingFlags.map((f) => f.id);
    await markFlagsIncludedInDigest(flagIds);

    // 6. Update digest_sent status
    const supabase = createAdminClient();
    await supabase
      .from("ai_agent_conversation_flags")
      .update({
        digest_sent: emailSent,
        updated_at: new Date().toISOString(),
      })
      .in("id", flagIds);

    console.log(
      `[Daily Digest] Digest complete: ${flagIds.length} flags processed, email sent: ${emailSent}`
    );

    return NextResponse.json({
      success: true,
      flagsReviewed: pendingFlags.length,
      emailSent,
      breakdown: {
        critical: critical.length,
        high: high.length,
        medium: medium.length,
        low: low.length,
      },
    });
  } catch (error: any) {
    console.error("[Daily Digest] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Build HTML email for daily digest
 */
async function buildDigestEmail(data: {
  critical: any[];
  high: any[];
  medium: any[];
  low: any[];
  totalFlags: number;
}): Promise<string> {
  const { critical, high, medium, low, totalFlags } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Agent Review Digest</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #ff6b35;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h2 {
      color: #444;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    .stats {
      display: flex;
      gap: 15px;
      margin: 20px 0;
      flex-wrap: wrap;
    }
    .stat {
      background: #f8f9fa;
      padding: 15px 20px;
      border-radius: 6px;
      flex: 1;
      min-width: 150px;
      text-align: center;
    }
    .stat-number {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .flag-card {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 20px;
      margin: 15px 0;
      background: #fafafa;
    }
    .flag-card.critical {
      border-left: 4px solid #dc2626;
      background: #fef2f2;
    }
    .flag-card.high {
      border-left: 4px solid #f59e0b;
      background: #fffbeb;
    }
    .flag-card.medium {
      border-left: 4px solid #3b82f6;
      background: #eff6ff;
    }
    .flag-card.low {
      border-left: 4px solid #6b7280;
      background: #f9fafb;
    }
    .flag-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .flag-type {
      font-weight: 600;
      text-transform: capitalize;
    }
    .severity-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .severity-badge.critical {
      background: #dc2626;
      color: white;
    }
    .severity-badge.high {
      background: #f59e0b;
      color: white;
    }
    .severity-badge.medium {
      background: #3b82f6;
      color: white;
    }
    .severity-badge.low {
      background: #6b7280;
      color: white;
    }
    .message-box {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 12px;
      margin: 10px 0;
      font-family: monospace;
      font-size: 13px;
      white-space: pre-wrap;
    }
    .message-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
      font-weight: 600;
    }
    .agent-info {
      font-size: 13px;
      color: #666;
      margin-top: 10px;
    }
    .review-link {
      display: inline-block;
      background: #ff6b35;
      color: white;
      padding: 10px 20px;
      border-radius: 6px;
      text-decoration: none;
      margin-top: 15px;
      font-weight: 600;
    }
    .review-link:hover {
      background: #e85a28;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 AI Agent Review Digest</h1>
    <p style="color: #666; font-size: 14px;">
      ${new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
    </p>

    <div class="stats">
      <div class="stat">
        <div class="stat-number">${totalFlags}</div>
        <div class="stat-label">Total Flags</div>
      </div>
      <div class="stat">
        <div class="stat-number" style="color: #dc2626;">${critical.length}</div>
        <div class="stat-label">Critical</div>
      </div>
      <div class="stat">
        <div class="stat-number" style="color: #f59e0b;">${high.length}</div>
        <div class="stat-label">High</div>
      </div>
      <div class="stat">
        <div class="stat-number" style="color: #3b82f6;">${medium.length}</div>
        <div class="stat-label">Medium</div>
      </div>
      <div class="stat">
        <div class="stat-number" style="color: #6b7280;">${low.length}</div>
        <div class="stat-label">Low</div>
      </div>
    </div>

    ${critical.length > 0 ? `<h2 style="color: #dc2626;">🚨 Critical Issues</h2>${critical.map((flag) => renderFlagCard(flag)).join("")}` : ""}
    ${high.length > 0 ? `<h2 style="color: #f59e0b;">⚠️ High Priority</h2>${high.map((flag) => renderFlagCard(flag)).join("")}` : ""}
    ${medium.length > 0 ? `<h2 style="color: #3b82f6;">ℹ️ Medium Priority</h2>${medium.map((flag) => renderFlagCard(flag)).join("")}` : ""}
    ${low.length > 0 ? `<h2 style="color: #6b7280;">📋 Low Priority</h2>${low.map((flag) => renderFlagCard(flag)).join("")}` : ""}

    <div class="footer">
      <p>
        Review and provide feedback at:<br>
        <a href="https://login.gymleadhub.co.uk/saas-admin/lead-bots/review" style="color: #ff6b35;">
          https://login.gymleadhub.co.uk/saas-admin/lead-bots/review
        </a>
      </p>
      <p style="margin-top: 15px;">
        This is an automated email from the AI Agent Training System.<br>
        Flagged conversations require human review to improve agent performance.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Render individual flag card in email
 */
function renderFlagCard(flag: any): string {
  const agentName = flag.agent?.name || "Unknown Agent";
  const flagType = flag.flag_type.replace(/_/g, " ");
  const keywords = flag.detection_metadata?.matched_keywords || [];

  return `
    <div class="flag-card ${flag.severity}">
      <div class="flag-header">
        <span class="flag-type">${flagType}</span>
        <span class="severity-badge ${flag.severity}">${flag.severity}</span>
      </div>

      <div class="agent-info">
        <strong>Agent:</strong> ${agentName} |
        <strong>Time:</strong> ${new Date(flag.created_at).toLocaleString("en-GB")}
      </div>

      ${keywords.length > 0 ? `<div class="agent-info"><strong>Keywords Detected:</strong> ${keywords.join(", ")}</div>` : ""}

      <div class="message-label">User Message:</div>
      <div class="message-box">${flag.trigger_message || "N/A"}</div>

      <div class="message-label">Agent Response:</div>
      <div class="message-box">${flag.agent_response || "N/A"}</div>

      <a href="https://login.gymleadhub.co.uk/saas-admin/lead-bots/review?flagId=${flag.id}" class="review-link">
        Review & Provide Feedback
      </a>
    </div>
  `;
}
