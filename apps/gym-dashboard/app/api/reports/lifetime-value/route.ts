import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/lifetime-value
 * Returns client lifetime value (LTV) leaderboard
 * Calculates total payments per client from 'payments' table
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
    // Use range(0, 999999) instead of limit() to bypass Supabase's default pagination
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
          id,
          first_name,
          last_name,
          email,
          status
        )
      `,
      )
      .eq("organization_id", organizationId)
      .not("client_id", "is", null) // Filter out NULL client_id at database level
      .order("payment_date", { ascending: false })
      .range(0, 999999); // Use range instead of limit to get all records

    // DEBUG: Log payment count
    console.log(`🔍 LTV Report Debug:`);
    console.log(`   Org ID: ${organizationId}`);
    console.log(`   Payments fetched: ${payments?.length || 0}`);
    console.log(`   Total amount: £${payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}`);

    if (error) {
      console.error("Error fetching LTV data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate LTV per client
    const clientLTV: Record<
      string,
      {
        clientId: string;
        name: string;
        email: string;
        status: string;
        totalPaid: number;
        paymentCount: number;
        firstPayment: string;
        lastPayment: string;
        averagePayment: number;
        providers: Set<string>;
      }
    > = {};

    payments?.forEach((payment) => {
      if (!payment.client_id || !payment.clients) return;

      const amount = Number(payment.amount) || 0;
      const clientId = payment.client_id;

      if (!clientLTV[clientId]) {
        clientLTV[clientId] = {
          clientId,
          name:
            `${payment.clients.first_name || ""} ${payment.clients.last_name || ""}`.trim() ||
            "Unknown",
          email: payment.clients.email || "",
          status: payment.clients.status || "active",
          totalPaid: 0,
          paymentCount: 0,
          firstPayment: payment.payment_date,
          lastPayment: payment.payment_date,
          averagePayment: 0,
          providers: new Set(),
        };
      }

      const client = clientLTV[clientId];
      client.totalPaid += amount;
      client.paymentCount += 1;
      client.providers.add(payment.payment_provider);

      // Update first/last payment dates
      if (payment.payment_date < client.firstPayment) {
        client.firstPayment = payment.payment_date;
      }
      if (payment.payment_date > client.lastPayment) {
        client.lastPayment = payment.payment_date;
      }
    });

    // Convert to array and calculate averages
    const clients = Object.values(clientLTV).map((client) => ({
      ...client,
      averagePayment: client.totalPaid / client.paymentCount,
      providers: Array.from(client.providers),
    }));

    // Sort by total paid (descending)
    clients.sort((a, b) => b.totalPaid - a.totalPaid);

    // Calculate overall metrics
    const totalClients = clients.length;
    const totalRevenue = clients.reduce((sum, c) => sum + c.totalPaid, 0);
    const averageLTV = totalClients > 0 ? totalRevenue / totalClients : 0;
    const totalPayments = clients.reduce((sum, c) => sum + c.paymentCount, 0);

    // Top 10 clients
    const topClients = clients.slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        clients,
        topClients,
        metrics: {
          totalClients,
          totalRevenue,
          averageLTV,
          totalPayments,
          averagePaymentCount:
            totalClients > 0 ? totalPayments / totalClients : 0,
        },
      },
    });
  } catch (error: any) {
    console.error("LTV report error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
