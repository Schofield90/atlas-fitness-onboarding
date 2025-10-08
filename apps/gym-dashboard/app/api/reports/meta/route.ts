import { NextRequest, NextResponse } from "next/server";
import { requireOrgAccess } from "@/app/lib/auth/organization";

export interface ReportCategory {
  name: string;
  description: string;
  reports: ReportLink[];
}

export interface ReportLink {
  name: string;
  description: string;
  href: string;
  enabled: boolean;
}

export async function GET(request: NextRequest) {
  try {
    // Ensure user has organization access
    let organizationId: string;
    try {
      const { organizationId: orgId } = await requireOrgAccess();
      organizationId = orgId;
    } catch (e) {
      return NextResponse.json(
        { error: "No organization found. Please complete onboarding." },
        { status: 401 },
      );
    }

    // Define report categories and their links
    const categories: ReportCategory[] = [
      {
        name: "Classes & Courses",
        description:
          "Track class attendance, bookings, and customer participation",
        reports: [
          {
            name: "All Attendances",
            description:
              "Complete attendance tracking across all classes and time periods",
            href: "/reports/attendances",
            enabled: true,
          },
          {
            name: "Customer Leaderboard",
            description: "Top attending customers ranked by participation",
            href: "/reports/customer-leaderboard",
            enabled: true,
          },
          {
            name: "Recent No-Shows & Late Cancels",
            description: "Track recent no-shows and last-minute cancellations",
            href: "#",
            enabled: false,
          },
          {
            name: "Customers Who No-Show/Late Cancel Most",
            description:
              "Identify customers with frequent cancellation patterns",
            href: "#",
            enabled: false,
          },
        ],
      },
      {
        name: "Customers",
        description: "Customer analytics and relationship tracking",
        reports: [
          {
            name: "Referrals",
            description:
              "Track customer referrals and referral program effectiveness",
            href: "#",
            enabled: false,
          },
        ],
      },
      {
        name: "Revenue",
        description: "Financial reporting and payment analytics",
        reports: [
          {
            name: "Client Lifetime Value (LTV)",
            description:
              "Leaderboard of clients by total revenue with average LTV metrics",
            href: "/reports/lifetime-value",
            enabled: true,
          },
          {
            name: "Monthly Turnover",
            description:
              "Monthly revenue analysis with AI-powered insights, seasonality detection, and category breakdown",
            href: "/reports/monthly-turnover",
            enabled: true,
          },
        ],
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        organizationId,
        categories,
        meta: {
          totalReports: categories.reduce(
            (total, cat) => total + cat.reports.length,
            0,
          ),
          enabledReports: categories.reduce(
            (total, cat) => total + cat.reports.filter((r) => r.enabled).length,
            0,
          ),
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error("Reports meta error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load reports metadata",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
