import { SupabaseClient } from "@supabase/supabase-js";

export interface MatchResult {
  matched: boolean;
  clientId?: string;
  leadId?: string;
  matchType?: "email" | "name" | "phone" | "fuzzy";
  confidence?: number;
}

/**
 * Automatic matcher for linking leads, clients, and payments
 * This runs automatically during imports to ensure data is connected
 */
export class AutoMatcher {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Match a lead with a client using multiple strategies
   */
  async matchLeadToClient(
    lead: { name?: string; email?: string; phone?: string },
    organizationId: string,
  ): Promise<MatchResult> {
    // Strategy 1: Email match (highest confidence)
    if (lead.email) {
      const { data: client } = await this.supabase
        .from("clients")
        .select("id")
        .eq("organization_id", organizationId)
        .ilike("email", lead.email.trim())
        .single();

      if (client) {
        return {
          matched: true,
          clientId: client.id,
          matchType: "email",
          confidence: 100,
        };
      }
    }

    // Strategy 2: Phone match (high confidence)
    if (lead.phone) {
      const cleanPhone = this.cleanPhoneNumber(lead.phone);
      const { data: clients } = await this.supabase
        .from("clients")
        .select("id, phone")
        .eq("organization_id", organizationId);

      const phoneMatch = clients?.find(
        (c) => this.cleanPhoneNumber(c.phone) === cleanPhone,
      );
      if (phoneMatch) {
        return {
          matched: true,
          clientId: phoneMatch.id,
          matchType: "phone",
          confidence: 95,
        };
      }
    }

    // Strategy 3: Name match (medium-high confidence)
    if (lead.name) {
      const nameMatch = await this.findClientByName(lead.name, organizationId);
      if (nameMatch) {
        return {
          matched: true,
          clientId: nameMatch.clientId,
          matchType: "name",
          confidence: nameMatch.confidence,
        };
      }
    }

    return { matched: false };
  }

  /**
   * Match a client with existing leads
   */
  async matchClientToLead(
    client: { name?: string; email?: string; phone?: string },
    organizationId: string,
  ): Promise<MatchResult> {
    // Try email first
    if (client.email) {
      const { data: lead } = await this.supabase
        .from("leads")
        .select("id")
        .eq("organization_id", organizationId)
        .ilike("email", client.email.trim())
        .is("client_id", null) // Only unlinked leads
        .single();

      if (lead) {
        return {
          matched: true,
          leadId: lead.id,
          matchType: "email",
          confidence: 100,
        };
      }
    }

    // Try phone
    if (client.phone) {
      const cleanPhone = this.cleanPhoneNumber(client.phone);
      const { data: leads } = await this.supabase
        .from("leads")
        .select("id, phone")
        .eq("organization_id", organizationId)
        .is("client_id", null);

      const phoneMatch = leads?.find(
        (l) => this.cleanPhoneNumber(l.phone) === cleanPhone,
      );
      if (phoneMatch) {
        return {
          matched: true,
          leadId: phoneMatch.id,
          matchType: "phone",
          confidence: 95,
        };
      }
    }

    // Try name
    if (client.name) {
      const nameMatch = await this.findLeadByName(client.name, organizationId);
      if (nameMatch) {
        return {
          matched: true,
          leadId: nameMatch.leadId,
          matchType: "name",
          confidence: nameMatch.confidence,
        };
      }
    }

    return { matched: false };
  }

  /**
   * Find client for a payment record
   */
  async findClientForPayment(
    payment: {
      client_name?: string;
      client_email?: string;
      client_id?: string;
      member_name?: string;
      email?: string;
    },
    organizationId: string,
  ): Promise<string | null> {
    // If client_id is provided and valid, use it
    if (payment.client_id) {
      const { data: client } = await this.supabase
        .from("clients")
        .select("id")
        .eq("id", payment.client_id)
        .eq("organization_id", organizationId)
        .single();

      if (client) return client.id;
    }

    // Try to match by email
    const email = payment.client_email || payment.email;
    if (email) {
      const { data: client } = await this.supabase
        .from("clients")
        .select("id")
        .eq("organization_id", organizationId)
        .ilike("email", email.trim())
        .single();

      if (client) return client.id;
    }

    // Try to match by name
    const name = payment.client_name || payment.member_name;
    if (name) {
      const nameMatch = await this.findClientByName(name, organizationId);
      if (nameMatch && nameMatch.confidence >= 80) {
        return nameMatch.clientId;
      }
    }

    return null;
  }

  /**
   * Batch process to link all unlinked records
   */
  async linkAllUnmatched(organizationId: string) {
    let stats = {
      leadsLinked: 0,
      clientsLinked: 0,
      paymentsLinked: 0,
    };

    // Link unlinked leads to clients
    const { data: unlinkedLeads } = await this.supabase
      .from("leads")
      .select("*")
      .eq("organization_id", organizationId)
      .is("client_id", null);

    for (const lead of unlinkedLeads || []) {
      const match = await this.matchLeadToClient(lead, organizationId);
      if (match.matched && match.clientId) {
        await this.supabase
          .from("leads")
          .update({ client_id: match.clientId })
          .eq("id", lead.id);
        stats.leadsLinked++;
      }
    }

    // Link clients to leads
    const { data: clientsWithoutLeads } = await this.supabase
      .from("clients")
      .select("*")
      .eq("organization_id", organizationId)
      .is("lead_id", null);

    for (const client of clientsWithoutLeads || []) {
      const match = await this.matchClientToLead(client, organizationId);
      if (match.matched && match.leadId) {
        await this.supabase
          .from("clients")
          .update({ lead_id: match.leadId })
          .eq("id", client.id);

        // Also update the lead with client_id
        await this.supabase
          .from("leads")
          .update({ client_id: client.id })
          .eq("id", match.leadId);

        stats.clientsLinked++;
      }
    }

    // Fix orphaned payments (payments without valid client_id)
    const { data: orphanedPayments } = await this.supabase
      .from("payments")
      .select("*")
      .eq("organization_id", organizationId)
      .is("client_id", null);

    for (const payment of orphanedPayments || []) {
      const clientId = await this.findClientForPayment(payment, organizationId);
      if (clientId) {
        await this.supabase
          .from("payments")
          .update({ client_id: clientId })
          .eq("id", payment.id);
        stats.paymentsLinked++;
      }
    }

    return stats;
  }

  // Helper methods

  private cleanPhoneNumber(phone?: string): string {
    if (!phone) return "";
    return phone.replace(/\D/g, "").slice(-10); // Get last 10 digits
  }

  private normalizeNameForMatching(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, "");
  }

  private async findClientByName(
    name: string,
    organizationId: string,
  ): Promise<{ clientId: string; confidence: number } | null> {
    const { data: clients } = await this.supabase
      .from("clients")
      .select("id, name")
      .eq("organization_id", organizationId);

    if (!clients || clients.length === 0) return null;

    const normalizedSearch = this.normalizeNameForMatching(name);
    const searchParts = normalizedSearch.split(" ");

    for (const client of clients) {
      if (!client.name) continue;

      const normalizedClient = this.normalizeNameForMatching(client.name);

      // Exact match
      if (normalizedClient === normalizedSearch) {
        return { clientId: client.id, confidence: 100 };
      }

      // Contains match
      if (
        normalizedClient.includes(normalizedSearch) ||
        normalizedSearch.includes(normalizedClient)
      ) {
        return { clientId: client.id, confidence: 90 };
      }

      // Word-level matching
      const clientParts = normalizedClient.split(" ");
      let matchingParts = 0;

      for (const searchPart of searchParts) {
        if (searchPart.length < 3) continue;
        if (clientParts.some((cp) => cp === searchPart)) {
          matchingParts++;
        }
      }

      if (
        matchingParts >= 2 ||
        (matchingParts === 1 && searchParts.length === 1)
      ) {
        return { clientId: client.id, confidence: 80 };
      }
    }

    return null;
  }

  private async findLeadByName(
    name: string,
    organizationId: string,
  ): Promise<{ leadId: string; confidence: number } | null> {
    const { data: leads } = await this.supabase
      .from("leads")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("client_id", null);

    if (!leads || leads.length === 0) return null;

    const normalizedSearch = this.normalizeNameForMatching(name);

    for (const lead of leads) {
      if (!lead.name) continue;

      const normalizedLead = this.normalizeNameForMatching(lead.name);

      if (normalizedLead === normalizedSearch) {
        return { leadId: lead.id, confidence: 100 };
      }

      if (
        normalizedLead.includes(normalizedSearch) ||
        normalizedSearch.includes(normalizedLead)
      ) {
        return { leadId: lead.id, confidence: 90 };
      }
    }

    return null;
  }
}
