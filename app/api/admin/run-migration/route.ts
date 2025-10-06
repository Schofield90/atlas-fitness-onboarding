import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Run the payment_status column migration
 */
export async function POST() {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Add payment_status column
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50);

        CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);

        UPDATE payments
        SET payment_status = status
        WHERE payment_status IS NULL;
      `
    });

    return NextResponse.json({
      success: true,
      message: "Migration applied successfully",
    });
  } catch (error: any) {
    console.error("Error running migration:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run migration" },
      { status: 500 },
    );
  }
}
