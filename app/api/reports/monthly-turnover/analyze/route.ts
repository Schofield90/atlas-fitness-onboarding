import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/reports/monthly-turnover/analyze
 * Analyzes monthly turnover data using AI to provide insights
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();

    const body = await request.json();
    const { periods, categoryBreakdown } = body;

    if (!periods || !Array.isArray(periods)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 },
      );
    }

    // Initialize OpenAI client inside function to avoid build-time errors
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Prepare data summary for AI
    const dataSummary = {
      monthlyRevenue: periods.map((p: any) => ({
        month: p.period,
        revenue: p.total_revenue,
        payments: p.payment_count,
        customers: p.unique_customers,
      })),
      totalMonths: periods.length,
      averageRevenue:
        periods.reduce((sum: number, p: any) => sum + p.total_revenue, 0) /
        periods.length,
      highestMonth: periods.reduce((max: any, p: any) =>
        p.total_revenue > (max?.total_revenue || 0) ? p : max
      ),
      lowestMonth: periods.reduce((min: any, p: any) =>
        p.total_revenue < (min?.total_revenue || Infinity) ? p : min
      ),
      categoryBreakdown: categoryBreakdown
        ? Object.entries(
            categoryBreakdown.reduce((acc: any, item: any) => {
              acc[item.category] =
                (acc[item.category] || 0) + item.total_revenue;
              return acc;
            }, {}),
          ).map(([category, revenue]) => ({ category, revenue }))
        : [],
    };

    // Calculate additional financial metrics
    const monthlyRevenueChanges = dataSummary.monthlyRevenue.map(
      (m: any, i: number) => {
        if (i === 0) return { month: m.month, change: 0 };
        const prevRevenue = dataSummary.monthlyRevenue[i - 1].revenue;
        const change = ((m.revenue - prevRevenue) / prevRevenue) * 100;
        return { month: m.month, change };
      },
    );

    const avgMonthlyGrowth =
      monthlyRevenueChanges.reduce(
        (sum: number, m: any) => sum + m.change,
        0,
      ) / monthlyRevenueChanges.length;

    const prompt = `You are a seasoned financial expert and business consultant specializing in the fitness industry with 15+ years of experience. You understand membership economics, seasonal fitness trends, client retention patterns, and the difference between front-end (joining fees, bootcamps) and back-end (monthly memberships, PT packages) revenue streams.

Analyze this gym's financial performance with the depth and insight of an expert advisor:

🔢 FINANCIAL METRICS:
- Time period: ${dataSummary.totalMonths} months
- Average monthly revenue: £${dataSummary.averageRevenue.toFixed(2)}
- Best month: ${dataSummary.highestMonth.period} (£${dataSummary.highestMonth.total_revenue.toFixed(2)})
- Worst month: ${dataSummary.lowestMonth.period} (£${dataSummary.lowestMonth.total_revenue.toFixed(2)})
- Revenue volatility: ${((dataSummary.highestMonth.total_revenue - dataSummary.lowestMonth.total_revenue) / dataSummary.averageRevenue * 100).toFixed(1)}%
- Average monthly growth rate: ${avgMonthlyGrowth.toFixed(1)}%

📊 MONTHLY BREAKDOWN:
${dataSummary.monthlyRevenue.map((m: any, i: number) => {
  const growth = i > 0 ? ((m.revenue - dataSummary.monthlyRevenue[i-1].revenue) / dataSummary.monthlyRevenue[i-1].revenue * 100) : 0;
  return `${m.month}: £${m.revenue.toFixed(2)} | ${m.payments} transactions | ${m.customers} unique clients | ${growth > 0 ? '+' : ''}${growth.toFixed(1)}% vs prev month`;
}).join("\n")}

${dataSummary.categoryBreakdown.length > 0 ? `💰 REVENUE STREAMS:\n${dataSummary.categoryBreakdown.map((c: any) => {
  const percentage = (c.revenue / dataSummary.monthlyRevenue.reduce((sum: number, m: any) => sum + m.revenue, 0) * 100);
  return `${c.category}: £${c.revenue.toFixed(2)} (${percentage.toFixed(1)}% of total)`;
}).join("\n")}` : ""}

🎯 PROVIDE EXPERT ANALYSIS AS IF YOU'RE THEIR PERSONAL CFO:

1. **Seasonality & Market Trends**
   - Identify fitness industry seasonal patterns (New Year rush, summer drop-off, September resurgence)
   - Compare their performance to typical industry benchmarks
   - Highlight unexpected deviations from normal seasonality

2. **Peak Performance Analysis**
   - Which months consistently outperform and WHY (specific to fitness industry)
   - Are peaks driven by new member acquisition, existing member upgrades, or special promotions?
   - How to extend peak periods or replicate success

3. **Underperformance Diagnosis**
   - Identify low-revenue periods and root causes (churn, reduced acquisition, pricing issues)
   - Is this normal seasonal dip or concerning trend?
   - Specific tactics to shore up weak months

4. **Growth Trajectory & Health Metrics**
   - Overall business health: growing/stable/declining with evidence
   - Revenue predictability and stability analysis
   - Red flags or green flags in the data

5. **Strategic Recommendations (3-5 HIGH-IMPACT actions)**
   - Focus on: membership retention, front-end offers, back-end optimization, pricing strategy
   - Each recommendation must include:
     * Specific action they can take THIS MONTH
     * Expected revenue impact (quantified if possible)
     * Implementation difficulty and timeline
   - Prioritize by ROI potential

Industry benchmarks to reference:
- Typical gym retention: 70-80% annually
- New Year boost: 30-50% increase in Jan-Feb
- Summer dip: 15-25% decrease Jun-Aug
- Average revenue per member: £40-80/month (UK)
- Front-end to back-end ratio: Usually 30:70

Format as JSON:
{
  "seasonality": "detailed seasonal pattern analysis with industry context",
  "peakPeriods": ["month1", "month2"],
  "peakReason": "why these months excel - be specific to fitness industry dynamics",
  "lowPeriods": ["month1", "month2"],
  "lowReason": "root cause analysis with fitness industry context",
  "trend": "growing|stable|declining",
  "trendDescription": "comprehensive growth analysis with supporting metrics",
  "recommendations": [
    {
      "title": "actionable recommendation title",
      "description": "detailed implementation plan with expected outcomes",
      "impact": "high|medium|low"
    }
  ],
  "summary": "3-4 sentence executive summary positioning you as their trusted financial advisor"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a seasoned CFO and business strategist with 15+ years of experience in the fitness industry. You understand membership economics, retention strategies, seasonal patterns, and revenue optimization. You provide sharp, actionable insights that gym owners can implement immediately. You're direct, data-driven, and focused on ROI. You're their expert in their back pocket.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const analysis = JSON.parse(
      completion.choices[0].message.content || "{}",
    );

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze turnover data" },
      { status: 500 },
    );
  }
}
