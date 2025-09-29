import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { getUserAndOrganization } from "@/app/lib/auth-utils";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

interface CustomerChurnData {
  customer_id: string;
  name: string;
  total_visits: number;
  last_visit_days_ago: number;
  membership_status: string;
  payment_history: any[];
  booking_frequency: number;
  cancellation_rate: number;
  engagement_score: number;
  lifetime_value: number;
}

interface ChurnPrediction {
  customer_id: string;
  churn_risk_score: number;
  risk_level: "low" | "medium" | "high";
  risk_factors: string[];
  recommendations: string[];
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customer_ids = [], batch_size = 100 } = body;

    // If no specific customers provided, analyze all customers
    let customerQuery = supabase
      .from("leads")
      .select(
        `
        id,
        name,
        email,
        created_at,
        last_visit_date,
        total_visits
      `,
      )
      .eq("organization_id", organization.id);

    if (customer_ids.length > 0) {
      customerQuery = customerQuery.in("id", customer_ids);
    }

    const { data: customers, error: customersError } =
      await customerQuery.limit(batch_size);

    if (customersError) {
      return NextResponse.json(
        { error: "Failed to fetch customers" },
        { status: 500 },
      );
    }

    const predictions: ChurnPrediction[] = [];

    for (const customer of customers || []) {
      try {
        const churnData = await analyzeCustomerChurnRisk(
          supabase,
          customer,
          organization.id,
        );
        const prediction = calculateChurnPrediction(churnData);
        predictions.push(prediction);

        // Update customer record with churn prediction
        await supabase
          .from("leads")
          .update({
            churn_risk_score: prediction.churn_risk_score,
            churn_risk_factors: {
              risk_factors: prediction.risk_factors,
              recommendations: prediction.recommendations,
              confidence: prediction.confidence,
              last_calculated: new Date().toISOString(),
            },
          })
          .eq("id", customer.id);
      } catch (error) {
        console.error(
          `Error analyzing churn for customer ${customer.id}:`,
          error,
        );
      }
    }

    return NextResponse.json({
      success: true,
      analyzed_customers: predictions.length,
      high_risk_customers: predictions.filter((p) => p.risk_level === "high")
        .length,
      medium_risk_customers: predictions.filter(
        (p) => p.risk_level === "medium",
      ).length,
      low_risk_customers: predictions.filter((p) => p.risk_level === "low")
        .length,
      predictions,
    });
  } catch (error) {
    console.error("Error in churn prediction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const riskLevel = url.searchParams.get("risk_level");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    // Get customers with churn predictions
    let query = supabase
      .from("leads")
      .select(
        `
        id,
        name,
        email,
        last_visit_date,
        total_visits,
        churn_risk_score,
        churn_risk_factors,
        lifetime_value
      `,
      )
      .eq("organization_id", organization.id)
      .not("churn_risk_score", "is", null);

    if (riskLevel) {
      if (riskLevel === "high") {
        query = query.gte("churn_risk_score", 0.7);
      } else if (riskLevel === "medium") {
        query = query.gte("churn_risk_score", 0.4).lt("churn_risk_score", 0.7);
      } else if (riskLevel === "low") {
        query = query.lt("churn_risk_score", 0.4);
      }
    }

    const { data: customers, error } = await query
      .order("churn_risk_score", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch churn predictions" },
        { status: 500 },
      );
    }

    // Format the response
    const formattedCustomers = (customers || []).map((customer) => ({
      ...customer,
      risk_level:
        customer.churn_risk_score >= 0.7
          ? "high"
          : customer.churn_risk_score >= 0.4
            ? "medium"
            : "low",
      risk_factors: customer.churn_risk_factors?.risk_factors || [],
      recommendations: customer.churn_risk_factors?.recommendations || [],
      confidence: customer.churn_risk_factors?.confidence || 0,
    }));

    return NextResponse.json({
      customers: formattedCustomers,
      total: formattedCustomers.length,
    });
  } catch (error) {
    console.error("Error fetching churn predictions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function analyzeCustomerChurnRisk(
  supabase: any,
  customer: any,
  organizationId: string,
): Promise<CustomerChurnData> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Calculate days since last visit
  const lastVisitDaysAgo = customer.last_visit_date
    ? Math.floor(
        (now.getTime() - new Date(customer.last_visit_date).getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : 999;

  // Get booking data
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("customer_id", customer.id)
    .gte("created_at", ninetyDaysAgo.toISOString());

  const recentBookings =
    bookings?.filter((b) => new Date(b.created_at) >= thirtyDaysAgo) || [];

  const cancelledBookings =
    bookings?.filter((b) => b.booking_status === "cancelled") || [];

  // Get membership data
  const { data: memberships } = await supabase
    .from("customer_memberships")
    .select("*")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const currentMembership = memberships?.[0];

  // Get payment data
  const { data: payments } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("customer_id", customer.id)
    .gte("created_at", ninetyDaysAgo.toISOString());

  const failedPayments =
    payments?.filter(
      (p) => p.status === "failed" || p.status === "requires_action",
    ) || [];

  // Calculate metrics
  const bookingFrequency = recentBookings.length;
  const cancellationRate = bookings?.length
    ? cancelledBookings.length / bookings.length
    : 0;
  const paymentIssues = failedPayments.length;

  // Calculate engagement score (0-1)
  let engagementScore = 0;
  if (lastVisitDaysAgo <= 7) engagementScore += 0.3;
  else if (lastVisitDaysAgo <= 14) engagementScore += 0.2;
  else if (lastVisitDaysAgo <= 30) engagementScore += 0.1;

  if (bookingFrequency >= 4) engagementScore += 0.3;
  else if (bookingFrequency >= 2) engagementScore += 0.2;
  else if (bookingFrequency >= 1) engagementScore += 0.1;

  if (cancellationRate <= 0.1) engagementScore += 0.2;
  else if (cancellationRate <= 0.2) engagementScore += 0.1;

  if (paymentIssues === 0) engagementScore += 0.2;
  else if (paymentIssues <= 1) engagementScore += 0.1;

  // Calculate lifetime value
  const totalPayments =
    payments?.reduce(
      (sum, p) => (p.status === "succeeded" ? sum + p.amount_pennies : sum),
      0,
    ) || 0;

  return {
    customer_id: customer.id,
    name: customer.name,
    total_visits: customer.total_visits || 0,
    last_visit_days_ago: lastVisitDaysAgo,
    membership_status: currentMembership?.status || "none",
    payment_history: payments || [],
    booking_frequency: bookingFrequency,
    cancellation_rate: cancellationRate,
    engagement_score: Math.min(1, engagementScore),
    lifetime_value: totalPayments,
  };
}

function calculateChurnPrediction(data: CustomerChurnData): ChurnPrediction {
  let churnScore = 0;
  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  // Days since last visit (40% weight)
  if (data.last_visit_days_ago > 60) {
    churnScore += 0.4;
    riskFactors.push("No visit in over 60 days");
    recommendations.push("Send re-engagement campaign");
  } else if (data.last_visit_days_ago > 30) {
    churnScore += 0.25;
    riskFactors.push("No visit in over 30 days");
    recommendations.push("Check-in call or message");
  } else if (data.last_visit_days_ago > 14) {
    churnScore += 0.15;
    riskFactors.push("No recent visits");
    recommendations.push("Invite to upcoming classes");
  }

  // Booking frequency (25% weight)
  if (data.booking_frequency === 0) {
    churnScore += 0.25;
    riskFactors.push("No recent bookings");
    recommendations.push("Offer trial classes or discounts");
  } else if (data.booking_frequency === 1) {
    churnScore += 0.15;
    riskFactors.push("Low booking frequency");
    recommendations.push("Suggest regular class schedule");
  }

  // Cancellation rate (20% weight)
  if (data.cancellation_rate > 0.5) {
    churnScore += 0.2;
    riskFactors.push("High cancellation rate");
    recommendations.push("Understand scheduling conflicts");
  } else if (data.cancellation_rate > 0.3) {
    churnScore += 0.1;
    riskFactors.push("Moderate cancellation rate");
    recommendations.push("Offer flexible booking options");
  }

  // Membership status (15% weight)
  if (
    data.membership_status === "cancelled" ||
    data.membership_status === "expired"
  ) {
    churnScore += 0.15;
    riskFactors.push("No active membership");
    recommendations.push("Offer membership renewal incentives");
  } else if (data.membership_status === "paused") {
    churnScore += 0.1;
    riskFactors.push("Membership on hold");
    recommendations.push("Check reason for pause and offer support");
  }

  // Payment issues
  const recentFailures = data.payment_history.filter(
    (p) =>
      p.status === "failed" &&
      new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  ).length;

  if (recentFailures > 0) {
    churnScore += 0.1;
    riskFactors.push("Recent payment failures");
    recommendations.push("Contact about payment method updates");
  }

  // Engagement bonus/penalty
  churnScore = Math.max(0, churnScore - data.engagement_score * 0.2);

  // Ensure score is between 0 and 1
  churnScore = Math.min(1, Math.max(0, churnScore));

  // Determine risk level
  let riskLevel: "low" | "medium" | "high";
  if (churnScore >= 0.7) {
    riskLevel = "high";
    recommendations.unshift("Immediate intervention required");
  } else if (churnScore >= 0.4) {
    riskLevel = "medium";
    recommendations.unshift("Proactive engagement recommended");
  } else {
    riskLevel = "low";
    recommendations.unshift("Continue regular engagement");
  }

  // Calculate confidence based on data availability
  let confidence = 0.5; // Base confidence
  if (data.total_visits > 5) confidence += 0.2;
  if (data.payment_history.length > 3) confidence += 0.2;
  if (data.last_visit_days_ago < 90) confidence += 0.1;

  confidence = Math.min(1, confidence);

  return {
    customer_id: data.customer_id,
    churn_risk_score: Math.round(churnScore * 100) / 100,
    risk_level: riskLevel,
    risk_factors: riskFactors,
    recommendations: recommendations,
    confidence: Math.round(confidence * 100) / 100,
  };
}
