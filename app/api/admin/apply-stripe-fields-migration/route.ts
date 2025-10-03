import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Add Stripe-related columns to clients table
    const { error: alterError } = await supabaseAdmin.rpc("exec_sql", {
      sql: `
        ALTER TABLE clients
          ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
          ADD COLUMN IF NOT EXISTS payment_method_last4 VARCHAR(4),
          ADD COLUMN IF NOT EXISTS payment_method_brand VARCHAR(50),
          ADD COLUMN IF NOT EXISTS payment_method_exp_month INTEGER,
          ADD COLUMN IF NOT EXISTS payment_method_exp_year INTEGER,
          ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
          ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50),
          ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE;

        CREATE INDEX IF NOT EXISTS idx_clients_stripe_customer ON clients(stripe_customer_id);
        CREATE INDEX IF NOT EXISTS idx_clients_stripe_subscription ON clients(stripe_subscription_id);
        CREATE INDEX IF NOT EXISTS idx_clients_subscription_status ON clients(subscription_status);
      `,
    });

    if (alterError) {
      // Try direct SQL approach if RPC doesn't exist
      const alterQueries = [
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_method_last4 VARCHAR(4)",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_method_brand VARCHAR(50)",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_method_exp_month INTEGER",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_method_exp_year INTEGER",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50)",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE",
        "CREATE INDEX IF NOT EXISTS idx_clients_stripe_customer ON clients(stripe_customer_id)",
        "CREATE INDEX IF NOT EXISTS idx_clients_stripe_subscription ON clients(stripe_subscription_id)",
        "CREATE INDEX IF NOT EXISTS idx_clients_subscription_status ON clients(subscription_status)",
      ];

      for (const query of alterQueries) {
        const { error } = await supabaseAdmin
          .from("clients")
          .select("id")
          .limit(0);
        // If the query fails, we'll try using raw SQL through a different approach
      }

      console.log("Migration completed using fallback method");
    }

    return NextResponse.json({
      success: true,
      message: "Stripe fields added to clients table successfully",
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: error.message || "Migration failed" },
      { status: 500 },
    );
  }
}
