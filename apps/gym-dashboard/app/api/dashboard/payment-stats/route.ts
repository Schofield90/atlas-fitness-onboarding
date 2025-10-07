import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/payment-stats
 * Returns payment statistics for dashboard widget
 * Queries the 'payments' table (not 'transactions' or 'payment_transactions')
 */
export async function GET() {
  try {
    // Authenticate user
    const user = await requireAuth();
    const organizationId = user.organizationId;

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get all payments with client data
    const { data: payments, error } = await supabaseAdmin
      .from("payments")
      .select(
        `
        id,
        client_id,
        amount,
        payment_date,
        payment_provider,
        payment_status,
        clients!payments_client_id_fkey(
          first_name,
          last_name
        )
      `,
      )
      .eq("organization_id", organizationId)
      .order("payment_date", { ascending: false });

    if (error) {
      console.error("Error fetching payment stats:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;
    let totalRevenue = 0;
    const clientPayments: Record<
      string,
      { name: string; total: number }
    > = {};

    payments?.forEach((payment) => {
      const amount = Number(payment.amount) || 0;
      const paymentDate = new Date(payment.payment_date);
      totalRevenue += amount;

      // Calculate by time period
      if (paymentDate >= today) {
        todayTotal += amount;
      }
      if (paymentDate >= weekAgo) {
        weekTotal += amount;
      }
      if (paymentDate >= monthAgo) {
        monthTotal += amount;
      }

      // Track payments per client
      if (payment.client_id && payment.clients) {
        const clientName =
          `${payment.clients.first_name || ""} ${payment.clients.last_name || ""}`.trim() ||
          "Unknown";
        if (!clientPayments[payment.client_id]) {
          clientPayments[payment.client_id] = {
            name: clientName,
            total: 0,
          };
        }
        clientPayments[payment.client_id].total += amount;
      }
    });

    // Get top 5 payers
    const topPayers = Object.values(clientPayments)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const totalTransactions = payments?.length || 0;
    const averagePayment =
      totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        totalTransactions,
        todayRevenue: todayTotal,
        weeklyRevenue: weekTotal,
        monthlyRevenue: monthTotal,
        topPayers,
        averagePayment,
      },
    });
  } catch (error: any) {
    console.error("Payment stats error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
