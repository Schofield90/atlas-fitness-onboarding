import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

interface AlertRule {
  id: string;
  name: string;
  integration: string;
  condition: {
    type:
      | "error_rate"
      | "success_rate"
      | "token_expiry"
      | "quota_usage"
      | "webhook_failures";
    threshold: number;
    comparison: "greater_than" | "less_than" | "equals";
    timeWindow: "5m" | "15m" | "1h" | "24h";
  };
  actions: {
    email: boolean;
    webhook: boolean;
    sms: boolean;
  };
  recipients: string[];
  enabled: boolean;
  created_at: string;
  last_triggered?: string;
}

interface AlertTrigger {
  id: string;
  rule_id: string;
  integration: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  data: any;
  triggered_at: string;
  resolved_at?: string;
  acknowledged_by?: string;
}

// Get all alert rules
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authorizedEmails = ["sam@atlas-gyms.co.uk", "sam@gymleadhub.co.uk"];
    if (!authorizedEmails.includes(user.email?.toLowerCase() || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "triggers") {
      // Get recent alert triggers
      const { data: triggers, error } = await supabase
        .from("integration_alert_triggers")
        .select(
          `
          *,
          integration_alert_rules!inner(name, integration)
        `,
        )
        .order("triggered_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return NextResponse.json({ triggers });
    }

    // Get alert rules
    const { data: rules, error } = await supabase
      .from("integration_alert_rules")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Get alerts error:", error);
    return NextResponse.json(
      { error: "Failed to get alerts" },
      { status: 500 },
    );
  }
}

// Create or update alert rule
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authorizedEmails = ["sam@atlas-gyms.co.uk", "sam@gymleadhub.co.uk"];
    if (!authorizedEmails.includes(user.email?.toLowerCase() || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const alertData = await request.json();
    const { action, rule } = alertData;

    if (action === "create") {
      // Create new alert rule
      const { data, error } = await supabase
        .from("integration_alert_rules")
        .insert({
          name: rule.name,
          integration: rule.integration,
          condition: rule.condition,
          actions: rule.actions,
          recipients: rule.recipients,
          enabled: rule.enabled || true,
          created_by: user.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ rule: data });
    } else if (action === "update") {
      // Update existing alert rule
      const { data, error } = await supabase
        .from("integration_alert_rules")
        .update({
          name: rule.name,
          condition: rule.condition,
          actions: rule.actions,
          recipients: rule.recipients,
          enabled: rule.enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rule.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ rule: data });
    } else if (action === "test") {
      // Test alert rule
      const testResult = await testAlert(rule, user.id);
      return NextResponse.json({ testResult });
    } else if (action === "acknowledge") {
      // Acknowledge alert trigger
      const { triggerId } = alertData;

      const { data, error } = await supabase
        .from("integration_alert_triggers")
        .update({
          acknowledged_by: user.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", triggerId)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ trigger: data });
    } else if (action === "resolve") {
      // Resolve alert trigger
      const { triggerId } = alertData;

      const { data, error } = await supabase
        .from("integration_alert_triggers")
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("id", triggerId)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ trigger: data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Alert action error:", error);
    return NextResponse.json({ error: "Alert action failed" }, { status: 500 });
  }
}

async function testAlert(rule: AlertRule, userId: string): Promise<any> {
  try {
    // Simulate alert condition check
    const mockData = {
      integration: rule.integration,
      currentValue: rule.condition.threshold + 10, // Trigger condition
      threshold: rule.condition.threshold,
      timeWindow: rule.condition.timeWindow,
    };

    // Create test trigger
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("integration_alert_triggers")
      .insert({
        rule_id: rule.id,
        integration: rule.integration,
        message: `Test alert: ${rule.name}`,
        severity: "low",
        data: mockData,
        triggered_at: new Date().toISOString(),
        is_test: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Send test notifications
    if (rule.actions.email) {
      await sendEmailAlert(rule, mockData, true);
    }

    if (rule.actions.webhook) {
      await sendWebhookAlert(rule, mockData, true);
    }

    return {
      success: true,
      message: "Test alert sent successfully",
      trigger: data,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Test alert failed",
    };
  }
}

async function sendEmailAlert(
  rule: AlertRule,
  data: any,
  isTest: boolean = false,
): Promise<void> {
  // In production, this would use a proper email service
  console.log(
    `Sending ${isTest ? "test " : ""}email alert for rule: ${rule.name}`,
  );
  console.log(`Recipients: ${rule.recipients.join(", ")}`);
  console.log(`Data:`, data);

  // Mock email sending
  // await emailService.send({
  //   to: rule.recipients,
  //   subject: `${isTest ? '[TEST] ' : ''}Integration Alert: ${rule.name}`,
  //   template: 'integration-alert',
  //   data: { rule, data, isTest }
  // })
}

async function sendWebhookAlert(
  rule: AlertRule,
  data: any,
  isTest: boolean = false,
): Promise<void> {
  // In production, this would call configured webhook endpoints
  console.log(
    `Sending ${isTest ? "test " : ""}webhook alert for rule: ${rule.name}`,
  );

  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Atlas-Fitness-Alerts/1.0",
      },
      body: JSON.stringify({
        alert: rule.name,
        integration: rule.integration,
        severity: "medium",
        data,
        isTest,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("Webhook alert failed:", error);
  }
}

// Delete alert rule
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authorizedEmails = ["sam@atlas-gyms.co.uk", "sam@gymleadhub.co.uk"];
    if (!authorizedEmails.includes(user.email?.toLowerCase() || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("id");

    if (!ruleId) {
      return NextResponse.json({ error: "Missing rule ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("integration_alert_rules")
      .delete()
      .eq("id", ruleId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete alert rule error:", error);
    return NextResponse.json(
      { error: "Failed to delete alert rule" },
      { status: 500 },
    );
  }
}
