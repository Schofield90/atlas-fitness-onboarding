import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json();
    const supabaseAdmin = createAdminClient();

    console.log("Running quick fix for organization:", organizationId);

    // Just do the most critical fixes quickly
    let stats = {
      leadsLinked: 0,
      paymentsFixed: 0,
    };

    // Step 1: Link leads to clients by email (fast)
    const { data: unlinkedLeads } = await supabaseAdmin
      .from("leads")
      .select("id, email, name")
      .eq("organization_id", organizationId)
      .is("client_id", null)
      .not("email", "is", null)
      .limit(50); // Process only 50 at a time

    if (unlinkedLeads && unlinkedLeads.length > 0) {
      // Get all clients with emails
      const { data: clients } = await supabaseAdmin
        .from("clients")
        .select("id, email, name")
        .eq("organization_id", organizationId)
        .not("email", "is", null);

      const clientByEmail = new Map();
      clients?.forEach((c) => {
        if (c.email) clientByEmail.set(c.email.toLowerCase(), c);
      });

      // Link leads to clients
      for (const lead of unlinkedLeads) {
        if (lead.email) {
          const client = clientByEmail.get(lead.email.toLowerCase());
          if (client) {
            await supabaseAdmin
              .from("leads")
              .update({ client_id: client.id })
              .eq("id", lead.id);

            stats.leadsLinked++;
          }
        }
      }
    }

    // Step 2: Link by name for David Wrightson specifically (and similar cases)
    const { data: leadsByName } = await supabaseAdmin
      .from("leads")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("client_id", null)
      .not("name", "is", null)
      .limit(50);

    if (leadsByName && leadsByName.length > 0) {
      const { data: clients } = await supabaseAdmin
        .from("clients")
        .select("id, name")
        .eq("organization_id", organizationId)
        .not("name", "is", null);

      const clientByName = new Map();
      clients?.forEach((c) => {
        if (c.name) {
          const normalized = c.name.toLowerCase().trim();
          clientByName.set(normalized, c);

          // Also store variations
          const parts = normalized.split(" ");
          if (parts.length === 2) {
            clientByName.set(`${parts[1]} ${parts[0]}`, c); // Reversed name
          }
        }
      });

      for (const lead of leadsByName) {
        if (lead.name) {
          const normalized = lead.name.toLowerCase().trim();
          const client = clientByName.get(normalized);

          if (client) {
            await supabaseAdmin
              .from("leads")
              .update({ client_id: client.id })
              .eq("id", lead.id);

            stats.leadsLinked++;
          }
        }
      }
    }

    // Step 3: Quick fix for payments without proper client_id
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("id, client_name, amount")
      .eq("organization_id", organizationId)
      .or("client_id.is.null,client_id.eq.00000000-0000-0000-0000-000000000000")
      .limit(50);

    if (payments && payments.length > 0) {
      const { data: clients } = await supabaseAdmin
        .from("clients")
        .select("id, name")
        .eq("organization_id", organizationId);

      const clientByName = new Map();
      clients?.forEach((c) => {
        if (c.name) {
          const normalized = c.name.toLowerCase().trim();
          clientByName.set(normalized, c.id);

          // Store name parts for fuzzy matching
          const parts = normalized.split(" ");
          parts.forEach((part) => {
            if (part.length > 2) {
              clientByName.set(part, c.id);
            }
          });
        }
      });

      for (const payment of payments) {
        if (payment.client_name) {
          const normalized = payment.client_name.toLowerCase().trim();
          let clientId = clientByName.get(normalized);

          if (!clientId) {
            // Try partial match
            for (const [name, id] of clientByName) {
              if (normalized.includes(name) || name.includes(normalized)) {
                clientId = id;
                break;
              }
            }
          }

          if (clientId) {
            await supabaseAdmin
              .from("payments")
              .update({ client_id: clientId })
              .eq("id", payment.id);

            stats.paymentsFixed++;
            console.log(
              `Fixed payment for ${payment.client_name} - ${payment.amount}`,
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      message: `Quick fix complete! Linked ${stats.leadsLinked} leads and fixed ${stats.paymentsFixed} payments.`,
      note: "Run this again if you have more records to fix.",
    });
  } catch (error: any) {
    console.error("Quick fix error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Quick fix failed",
    });
  }
}
