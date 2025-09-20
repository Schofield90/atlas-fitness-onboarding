import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient();
    const supabase = await createClient();

    // Get a lead ID from query params to test
    const searchParams = request.nextUrl.searchParams;
    const leadId = searchParams.get("leadId");

    let leadData = null;
    if (leadId) {
      const { data: lead } = await supabase
        .from("leads")
        .select("id, phone, email")
        .eq("id", leadId)
        .single();

      leadData = lead;
    }

    // Get unique phone numbers from logs
    const { data: smsPhones } = await adminSupabase
      .from("sms_logs")
      .select("to, from_number")
      .limit(20);

    const { data: whatsappPhones } = await adminSupabase
      .from("whatsapp_logs")
      .select("to, from_number")
      .limit(20);

    // Extract unique phone formats
    const uniquePhones = new Set<string>();

    smsPhones?.forEach((log) => {
      if (log.to) uniquePhones.add(`SMS to: ${log.to}`);
      if (log.from_number) uniquePhones.add(`SMS from: ${log.from_number}`);
    });

    whatsappPhones?.forEach((log) => {
      if (log.to) uniquePhones.add(`WhatsApp to: ${log.to}`);
      if (log.from_number)
        uniquePhones.add(`WhatsApp from: ${log.from_number}`);
    });

    // Test different phone format queries
    let testResults = null;
    if (leadData?.phone) {
      const phoneVariations = [
        leadData.phone,
        leadData.phone.replace(/^\+/, ""), // Remove leading +
        leadData.phone.replace(/\s/g, ""), // Remove spaces
        leadData.phone.replace(/[^\d]/g, ""), // Only digits
      ];

      testResults = {};

      for (const phoneFormat of phoneVariations) {
        const { data: smsTest } = await adminSupabase
          .from("sms_logs")
          .select("id")
          .or(`to.eq.${phoneFormat},from_number.eq.${phoneFormat}`)
          .limit(1);

        const { data: whatsappTest } = await adminSupabase
          .from("whatsapp_logs")
          .select("id")
          .or(`to.eq.${phoneFormat},from_number.eq.${phoneFormat}`)
          .limit(1);

        testResults[phoneFormat] = {
          smsFound: !!smsTest?.length,
          whatsappFound: !!whatsappTest?.length,
        };
      }
    }

    return NextResponse.json({
      leadData,
      phoneFormatsInDatabase: Array.from(uniquePhones),
      formatTests: testResults,
      recommendations: {
        issue: "Phone number format mismatch",
        explanation:
          "The lead phone number format might not match how Twilio saves them",
        commonFormats: [
          "+447123456789 (with country code)",
          "447123456789 (without plus)",
          "07123456789 (local format)",
          "whatsapp:+447123456789 (WhatsApp prefix)",
        ],
        solution:
          "Check the phone formats above and ensure lead phone numbers match",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Phone format check failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
