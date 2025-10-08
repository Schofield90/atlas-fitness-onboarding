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

    const prompt = `You are a financial analyst for a fitness business. Analyze the following monthly turnover data and provide actionable insights.

Data Summary:
- Analyzing ${dataSummary.totalMonths} months of data
- Average monthly revenue: £${dataSummary.averageRevenue.toFixed(2)}
- Highest performing month: ${dataSummary.highestMonth.period} (£${dataSummary.highestMonth.total_revenue})
- Lowest performing month: ${dataSummary.lowestMonth.period} (£${dataSummary.lowestMonth.total_revenue})

Monthly Revenue Trend:
${dataSummary.monthlyRevenue.map((m: any) => `${m.month}: £${m.revenue.toFixed(2)} (${m.payments} payments, ${m.customers} customers)`).join("\n")}

${dataSummary.categoryBreakdown.length > 0 ? `Category Breakdown:\n${dataSummary.categoryBreakdown.map((c: any) => `${c.category}: £${c.revenue.toFixed(2)}`).join("\n")}` : ""}

Please provide:
1. **Seasonality Analysis**: Identify any seasonal patterns or trends
2. **Peak Periods**: What months show consistent high performance and why
3. **Low Periods**: What months show consistent low performance and potential reasons
4. **Growth Trends**: Is the business growing, stable, or declining
5. **Recommendations**: 3-5 specific actionable recommendations to improve turnover

Format your response as JSON with the following structure:
{
  "seasonality": "description of seasonal patterns",
  "peakPeriods": ["month1", "month2"],
  "peakReason": "why these months perform well",
  "lowPeriods": ["month1", "month2"],
  "lowReason": "why these months underperform",
  "trend": "growing|stable|declining",
  "trendDescription": "detailed trend analysis",
  "recommendations": [
    {
      "title": "recommendation title",
      "description": "detailed recommendation",
      "impact": "high|medium|low"
    }
  ],
  "summary": "2-3 sentence executive summary"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a financial analyst specializing in fitness business revenue analysis. Provide actionable, data-driven insights.",
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
