import Papa from "papaparse";

export interface ImportProgress {
  total: number;
  processed: number;
  success: number;
  errors: number;
  skipped: number;
  currentItem?: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  stats: {
    total: number;
    success: number;
    errors: number;
    skipped: number;
    newClients?: number;
  };
  errors?: Array<{ row: number; error: string }>;
}

export class GoTeamUpImporter {
  private supabase: any;
  private organizationId: string;
  private progressCallback?: (progress: ImportProgress) => void;
  private createMissingClients: boolean;
  private newClientsCreated: number = 0;

  constructor(
    supabase: any,
    organizationId: string,
    progressCallback?: (progress: ImportProgress) => void,
    createMissingClients: boolean = true, // Default to creating missing clients
  ) {
    this.supabase = supabase;
    this.organizationId = organizationId;
    this.progressCallback = progressCallback;
    this.createMissingClients = createMissingClients;
  }

  // Parse UK date format (DD/MM/YYYY) or US format (MM/DD/YYYY)
  private parseDate(dateStr: string): string | null {
    if (!dateStr || dateStr.trim() === "") return null;

    // Validate input looks like a date (has numbers and separators)
    if (!/\d/.test(dateStr)) return null; // No digits = not a date

    // Try UK format first (DD/MM/YYYY)
    let parts = dateStr.split("/");
    if (parts.length === 3) {
      const [first, second, yearPart] = parts;
      const firstNum = parseInt(first);
      const secondNum = parseInt(second);

      // Handle both 2-digit and 4-digit years
      let year = yearPart;
      if (yearPart.length === 2) {
        const yearNum = parseInt(yearPart);
        // Assume 20xx for years 00-50, 19xx for years 51-99
        year = yearNum <= 50 ? `20${yearPart}` : `19${yearPart}`;
      }

      // Logic to determine format:
      // If first > 12, it must be DD/MM/YYYY (day > 12)
      // If second > 12, it must be MM/DD/YYYY (day > 12)
      // Otherwise, assume MM/DD/YYYY (US format) since that's more common in exported data

      if (firstNum > 12) {
        // Must be DD/MM/YYYY format
        return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`;
      } else if (secondNum > 12) {
        // Must be MM/DD/YYYY format
        return `${year}-${first.padStart(2, "0")}-${second.padStart(2, "0")}`;
      } else {
        // Ambiguous case - assume MM/DD/YYYY (US format) since it's more common in exports
        return `${year}-${first.padStart(2, "0")}-${second.padStart(2, "0")}`;
      }
    }
    // Try ISO format (YYYY-MM-DD)
    if (dateStr.includes("-") && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr;
    }

    // If we can't parse it, return null instead of invalid string
    return null;
  }

  // Parse amount to pennies (supports multiple currency symbols)
  private parseAmount(amountStr: string): number {
    if (!amountStr) return 0;
    // Remove all currency symbols and commas
    const cleanAmount = amountStr.replace(/[£€$¥₹,\s]/g, "");
    const amount = parseFloat(cleanAmount);
    if (isNaN(amount)) return 0;
    return Math.round(amount * 100); // Convert to pennies
  }

  // Parse time string to 24-hour format (HH:MM)
  private parseTime(timeStr: string): string {
    if (!timeStr) return "09:00";

    // Remove extra whitespace
    timeStr = timeStr.trim();

    // Handle 24-hour format (already correct)
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [hours, minutes] = timeStr.split(":");
      return `${hours.padStart(2, "0")}:${minutes}`;
    }

    // Handle 12-hour format with AM/PM (e.g., "7:30 p.m.", "7:30pm", "7:30 PM")
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?/i);
    if (timeMatch) {
      let [_, hours, minutes, meridiem] = timeMatch;
      let hour = parseInt(hours);

      // Convert to 24-hour format
      if (meridiem.toLowerCase() === "p" && hour !== 12) {
        hour += 12;
      } else if (meridiem.toLowerCase() === "a" && hour === 12) {
        hour = 0;
      }

      return `${hour.toString().padStart(2, "0")}:${minutes}`;
    }

    // Handle hour-only format
    if (/^\d{1,2}$/.test(timeStr)) {
      return `${timeStr.padStart(2, "0")}:00`;
    }

    // Default fallback
    console.log(`Could not parse time: "${timeStr}", using default 09:00`);
    return "09:00";
  }

  // Helper to create or find a client
  // Using clients table as primary since that's what payments use
  private async findOrCreateClient(
    email: string,
    name?: string,
  ): Promise<string | null> {
    // First try to find existing client (primary table) - use org_id as per schema
    const { data: existingClient } = await this.supabase
      .from("clients")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .eq("org_id", this.organizationId)
      .maybeSingle();

    if (existingClient) {
      return existingClient.id;
    }

    // If not found and we should create missing clients
    if (!this.createMissingClients) {
      return null;
    }

    // Parse name into first_name and last_name
    const fullName = name || email.split("@")[0];
    const nameParts = fullName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Create new client in clients table (same table payments use)
    // Handle both organization_id and org_id for compatibility
    const clientData = {
      organization_id: this.organizationId,
      org_id: this.organizationId, // Support both for compatibility
      email: email.toLowerCase().trim(),
      name: fullName,
      first_name: firstName,
      last_name: lastName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newClient, error } = await this.supabase
      .from("clients")
      .insert(clientData)
      .select("id")
      .single();

    if (error) {
      console.error("Error creating client:", error);

      // Try with just the fields that definitely exist
      const minimalClientData = {
        organization_id: this.organizationId,
        email: email.toLowerCase().trim(),
        name: fullName,
        created_at: new Date().toISOString(),
      };

      const { data: minimalClient, error: minimalError } = await this.supabase
        .from("clients")
        .insert(minimalClientData)
        .select("id")
        .single();

      if (minimalError) {
        console.error("Error creating minimal client:", minimalError);

        // If clients table fails, try customers table as fallback
        const { data: newCustomer, error: customerError } = await this.supabase
          .from("customers")
          .insert({
            organization_id: this.organizationId,
            email: email.toLowerCase().trim(),
            name: fullName,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (customerError) {
          console.error("Error creating customer:", customerError);
          return null;
        }

        if (newCustomer?.id) {
          this.newClientsCreated++;
        }
        return newCustomer?.id || null;
      }

      if (minimalClient?.id) {
        this.newClientsCreated++;
      }
      return minimalClient?.id || null;
    }

    if (newClient?.id) {
      this.newClientsCreated++;
    }

    return newClient?.id || null;
  }

  // Auto-detect file type based on headers
  public detectFileType(
    headers: string[],
  ): "payments" | "attendance" | "clients" | "memberships" | "unknown" {
    const paymentHeaders = ["amount", "payment", "price", "total", "cost"];
    const attendanceHeaders = ["class", "session", "instructor", "time"];
    const membershipHeaders = ["active memberships", "last payment amount"];
    const clientHeaders = [
      "full name",
      "first name",
      "last name",
      "email",
      "phone",
      "dob",
      "gender",
      "address",
      "postcode",
      "status",
      "join date",
    ];

    const lowerHeaders = headers.map((h) => h.toLowerCase());

    const hasMembershipHeaders = membershipHeaders.every((h) =>
      lowerHeaders.some((lh) => lh.includes(h)),
    );

    const hasPaymentHeaders = paymentHeaders.some((h) =>
      lowerHeaders.some((lh) => lh.includes(h)),
    );

    const hasAttendanceHeaders = attendanceHeaders.some((h) =>
      lowerHeaders.some((lh) => lh.includes(h)),
    );

    const hasClientHeaders =
      clientHeaders.filter((h) => lowerHeaders.some((lh) => lh.includes(h)))
        .length >= 4; // Need at least 4 client-specific headers

    if (hasMembershipHeaders) return "memberships"; // Check memberships first (most specific)
    if (hasPaymentHeaders && !hasAttendanceHeaders && !hasClientHeaders)
      return "payments";
    if (hasAttendanceHeaders && !hasPaymentHeaders && !hasClientHeaders)
      return "attendance";
    if (hasClientHeaders && !hasPaymentHeaders && !hasAttendanceHeaders)
      return "clients";
    if (hasPaymentHeaders) return "payments"; // Default to payments if multiple matches

    return "unknown";
  }

  // Import clients from parsed CSV data with batch processing
  public async importClients(
    data: any[],
    batchSize: number = 25,
  ): Promise<ImportResult> {
    const progress: ImportProgress = {
      total: data.length,
      processed: 0,
      success: 0,
      errors: 0,
      skipped: 0,
    };

    const errors: Array<{ row: number; error: string }> = [];

    // Process in batches to prevent timeouts
    for (
      let batchStart = 0;
      batchStart < data.length;
      batchStart += batchSize
    ) {
      const batchEnd = Math.min(batchStart + batchSize, data.length);
      const batch = data.slice(batchStart, batchEnd);

      console.log(
        `Processing client batch ${Math.floor(batchStart / batchSize) + 1}/${Math.ceil(data.length / batchSize)}`,
      );

      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const globalIndex = batchStart + i;
        progress.processed++;
        progress.currentItem =
          row["Full Name"] || row["Email"] || `Row ${globalIndex + 1}`;

        try {
          // Extract email
          const email = row["Email"] || row["email"];
          if (!email) {
            progress.skipped++;
            errors.push({ row: globalIndex + 1, error: "No email found" });
            continue;
          }

          // Check if client already exists - use org_id as per schema
          const { data: existingClient } = await this.supabase
            .from("clients")
            .select("id")
            .eq("email", email.toLowerCase().trim())
            .eq("org_id", this.organizationId)
            .maybeSingle();

          if (existingClient) {
            progress.skipped++;
            console.log(`[CLIENT-IMPORT] Skipping duplicate client: ${email}`);
            continue;
          }

          // Parse client data
          const firstName = row["First Name"] || "";
          const lastName = row["Last Name"] || "";
          const fullName =
            row["Full Name"] || `${firstName} ${lastName}`.trim();
          const phone = row["Phone"] || "";
          // Handle gender: convert to lowercase, and treat empty strings as null
          const genderRaw = row["Gender"]?.trim();
          const gender =
            genderRaw && genderRaw.length > 0 ? genderRaw.toLowerCase() : null;
          const dob = this.parseDate(row["DOB"] || "");
          const addressLine1 = row["Address Line 1"] || "";
          const addressLine2 = row["Address Line 2"] || "";
          const city = row["City"] || "";
          const region = row["Region"] || "";
          const postcode = row["Postcode"] || "";
          const country = row["Country"] || "";
          const status =
            row["Status"]?.toLowerCase() === "active" ? "active" : "inactive";
          const emergencyContactName = row["Emergency Contact Name"] || "";
          const emergencyContactPhone = row["Emergency Contact Phone"] || "";
          const emergencyContactRelationship =
            row["Emergency Contact Relationship"] || "";

          // Extract membership data
          const activeMemberships = row["Active Memberships"] || "";
          const lastPaymentAmount = row["Last Payment Amount (GBP)"] || "";

          // Create client - use org_id as per schema
          const clientData: any = {
            org_id: this.organizationId,
            email: email.toLowerCase().trim(),
            first_name: firstName,
            last_name: lastName,
            name: fullName,
            phone: phone,
            gender: gender,
            date_of_birth: dob || null,
            status: status,
            emergency_contact_name: emergencyContactName || null,
            emergency_contact_phone: emergencyContactPhone || null,
            emergency_contact: emergencyContactName
              ? {
                  name: emergencyContactName,
                  phone: emergencyContactPhone,
                  relationship: emergencyContactRelationship,
                }
              : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Add address if provided
          if (addressLine1 || city || postcode) {
            clientData.address = {
              line1: addressLine1,
              line2: addressLine2,
              city: city,
              region: region,
              postcode: postcode,
              country: country,
            };
          }

          const { data: newClient, error } = await this.supabase
            .from("clients")
            .insert(clientData)
            .select("id")
            .single();

          if (error) {
            progress.errors++;
            errors.push({ row: globalIndex + 1, error: error.message });
          } else {
            progress.success++;
            this.newClientsCreated++;

            // Handle membership assignment if Active Memberships is provided
            if (activeMemberships && newClient) {
              try {
                await this.assignMembership(
                  newClient.id,
                  activeMemberships,
                  lastPaymentAmount,
                );
              } catch (membershipError: any) {
                console.error(
                  `Failed to assign membership for ${email}:`,
                  membershipError,
                );
                // Don't fail the whole import if membership assignment fails
              }
            }
          }
        } catch (error: any) {
          progress.errors++;
          errors.push({ row: globalIndex + 1, error: error.message });
        }

        if (this.progressCallback) {
          this.progressCallback(progress);
        }
      }

      // Small delay between batches
      if (batchStart + batchSize < data.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    const message = `Import completed: ${progress.success} clients created, ${progress.skipped} skipped, ${progress.errors} errors`;

    return {
      success: progress.errors === 0,
      message,
      stats: {
        total: progress.total,
        success: progress.success,
        errors: progress.errors,
        skipped: progress.skipped,
        newClients: this.newClientsCreated,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Assign membership plan to a client (create plan if it doesn't exist)
  private async assignMembership(
    clientId: string,
    membershipNames: string,
    lastPaymentAmount?: string,
  ): Promise<void> {
    // Split on comma in case there are multiple memberships
    const membershipList = membershipNames
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    for (const membershipName of membershipList) {
      // Check if program (membership plan) exists
      const { data: existingPlan } = await this.supabase
        .from("programs")
        .select("id")
        .eq("organization_id", this.organizationId)
        .eq("name", membershipName)
        .maybeSingle();

      let planId = existingPlan?.id;

      // Create plan if it doesn't exist
      if (!planId) {
        const { data: newPlan, error: planError } = await this.supabase
          .from("programs")
          .insert({
            organization_id: this.organizationId,
            name: membershipName,
            description: `Imported from GoTeamUp`,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (planError) {
          console.error(`Failed to create membership plan:`, planError);
          throw planError;
        }

        planId = newPlan?.id;
        console.log(`Created membership plan: ${membershipName} (${planId})`);
      }

      // Assign client to membership plan
      if (planId) {
        // memberships.customer_id references leads(id), so we need to find/create in leads table
        // Get client data from clients table
        const { data: clientData } = await this.supabase
          .from("clients")
          .select("email, name, first_name, last_name, phone")
          .eq("id", clientId)
          .single();

        if (!clientData) {
          console.error(`Client ${clientId} not found in clients table`);
          throw new Error(`Client ${clientId} not found`);
        }

        // Find or create in leads table
        const { data: existingLead } = await this.supabase
          .from("leads")
          .select("id")
          .eq("email", clientData.email.toLowerCase().trim())
          .eq("organization_id", this.organizationId)
          .maybeSingle();

        let leadId = existingLead?.id;

        if (!leadId) {
          // Create lead from client data
          console.log(`[MEMBERSHIP] Creating lead for ${clientData.email}`);
          const leadInsertData = {
            organization_id: this.organizationId,
            email: clientData.email.toLowerCase().trim(),
            name: clientData.name,
            first_name: clientData.first_name,
            last_name: clientData.last_name,
            phone: clientData.phone,
            status: "customer", // They're already a customer
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          console.log(`[MEMBERSHIP] Lead insert data:`, leadInsertData);

          const { data: newLead, error: leadError } = await this.supabase
            .from("leads")
            .insert(leadInsertData)
            .select("id")
            .single();

          if (leadError) {
            console.error(`[MEMBERSHIP] Failed to create lead:`, leadError);
            console.error(`[MEMBERSHIP] Lead data that failed:`, leadInsertData);
            throw new Error(`Failed to create lead: ${leadError.message}`);
          }

          if (!newLead?.id) {
            console.error(`[MEMBERSHIP] Lead created but no ID returned`);
            throw new Error(`Lead created but no ID returned for ${clientData.email}`);
          }

          leadId = newLead.id;
          console.log(`[MEMBERSHIP] Created lead ${leadId} for ${clientData.email}`);
        } else {
          console.log(`[MEMBERSHIP] Found existing lead ${leadId} for ${clientData.email}`);
        }

        // Check if membership already exists
        const { data: existingMembership } = await this.supabase
          .from("memberships")
          .select("id")
          .eq("customer_id", leadId)
          .eq("program_id", planId)
          .maybeSingle();

        if (!existingMembership) {
          const membershipData = {
            customer_id: leadId, // Use leadId, not clientId
            program_id: planId, // Changed from membership_plan_id to program_id
            organization_id: this.organizationId, // Required field - NOT NULL constraint
            membership_status: "active", // Changed from status to membership_status
            start_date: new Date().toISOString().split("T")[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          console.log(`[MEMBERSHIP] Creating membership with data:`, membershipData);
          console.log(`[MEMBERSHIP] leadId=${leadId}, planId=${planId}, orgId=${this.organizationId}`);

          const { error: membershipError } = await this.supabase
            .from("memberships")
            .insert(membershipData);

          if (membershipError) {
            console.error(`[MEMBERSHIP] Failed to assign membership:`, membershipError);
            console.error(`[MEMBERSHIP] Membership data that failed:`, membershipData);
            throw new Error(`Failed to assign membership: ${membershipError.message}`);
          }

          console.log(
            `[MEMBERSHIP] Assigned lead ${leadId} (client ${clientId}) to membership ${membershipName}`,
          );
        } else {
          console.log(`[MEMBERSHIP] Membership already exists for lead ${leadId}`);
        }
      }
    }
  }

  // Import payments from parsed CSV data with batch processing
  public async importPayments(
    data: any[],
    batchSize: number = 25,
  ): Promise<ImportResult> {
    const progress: ImportProgress = {
      total: data.length,
      processed: 0,
      success: 0,
      errors: 0,
      skipped: 0,
    };

    const errors: Array<{ row: number; error: string }> = [];

    // Process in batches to prevent timeouts
    for (
      let batchStart = 0;
      batchStart < data.length;
      batchStart += batchSize
    ) {
      const batchEnd = Math.min(batchStart + batchSize, data.length);
      const batch = data.slice(batchStart, batchEnd);

      console.log(
        `Processing payment batch ${Math.floor(batchStart / batchSize) + 1}/${Math.ceil(data.length / batchSize)}`,
      );

      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const globalIndex = batchStart + i;
        progress.processed++;
        progress.currentItem =
          row["Client Name"] || row["Name"] || `Row ${globalIndex + 1}`;

        try {
          // Find client by email
          const email = row["Email"] || row["email"];
          if (!email) {
            progress.skipped++;
            errors.push({ row: globalIndex + 1, error: "No email found" });
            continue;
          }

          // Get name from row data
          const name =
            row["Client Name"] || row["Name"] || row["Customer"] || "";

          // Find or create client
          const clientId = await this.findOrCreateClient(email, name);

          if (!clientId) {
            progress.skipped++;
            errors.push({
              row: globalIndex + 1,
              error: `Could not find or create client: ${email}`,
            });
            continue;
          }

          // Parse payment data
          const paymentDate = this.parseDate(row["Date"] || row["date"] || "");
          const amount = this.parseAmount(
            row["Amount"] || row["amount"] || "0",
          );

          // Check for duplicate
          const { data: existing } = await this.supabase
            .from("payments")
            .select("id")
            .eq("client_id", clientId)
            .eq("payment_date", paymentDate)
            .eq("amount", amount)
            .maybeSingle();

          if (existing) {
            progress.skipped++;
            continue;
          }

          // Insert payment - use organization_id consistently
          const { error } = await this.supabase.from("payments").insert({
            organization_id: this.organizationId,
            client_id: clientId,
            amount: amount,
            payment_date: paymentDate,
            payment_method: (row["Payment Method"] || row["Method"] || "card")
              .toLowerCase()
              .replace(/\s+/g, "_"),
            payment_status: (row["Status"] || "paid").toLowerCase(),
            description: row["Description"] || row["Notes"] || "Payment",
            payment_type: "membership",
            created_at: new Date().toISOString(),
          });

          if (error) {
            progress.errors++;
            errors.push({ row: globalIndex + 1, error: error.message });
          } else {
            progress.success++;
          }
        } catch (error: any) {
          progress.errors++;
          errors.push({ row: globalIndex + 1, error: error.message });
        }

        if (this.progressCallback) {
          this.progressCallback(progress);
        }
      }

      // Small delay between batches to prevent overwhelming the database
      if (batchStart + batchSize < data.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    const message =
      this.newClientsCreated > 0
        ? `Import completed: ${progress.success} successful, ${this.newClientsCreated} new clients created, ${progress.skipped} skipped, ${progress.errors} errors`
        : `Import completed: ${progress.success} successful, ${progress.skipped} skipped, ${progress.errors} errors`;

    return {
      success: progress.errors === 0,
      message,
      stats: {
        total: progress.total,
        success: progress.success,
        errors: progress.errors,
        skipped: progress.skipped,
        newClients: this.newClientsCreated,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Import attendance from parsed CSV data with batch processing
  public async importAttendance(
    data: any[],
    batchSize: number = 10,
  ): Promise<ImportResult> {
    const progress: ImportProgress = {
      total: data.length,
      processed: 0,
      success: 0,
      errors: 0,
      skipped: 0,
    };

    const errors: Array<{ row: number; error: string }> = [];

    // Process in batches to prevent timeouts
    for (
      let batchStart = 0;
      batchStart < data.length;
      batchStart += batchSize
    ) {
      const batchEnd = Math.min(batchStart + batchSize, data.length);
      const batch = data.slice(batchStart, batchEnd);

      console.log(
        `Processing attendance batch ${Math.floor(batchStart / batchSize) + 1}/${Math.ceil(data.length / batchSize)}`,
      );

      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const globalIndex = batchStart + i;
        progress.processed++;
        progress.currentItem =
          row["Customer"] ||
          row["Client Name"] ||
          row["Name"] ||
          `Row ${globalIndex + 1}`;

        try {
          // Find customer by email
          const email = row["Email"] || row["email"];
          if (!email) {
            progress.skipped++;
            errors.push({ row: globalIndex + 1, error: "No email found" });
            continue;
          }

          // Get name from row data
          const name =
            row["Customer"] || row["Client Name"] || row["Name"] || "";

          // Find or create customer
          const customerId = await this.findOrCreateClient(email, name);

          if (!customerId) {
            progress.skipped++;
            console.error(
              `[GOTEAMUP-ATTENDANCE] Could not find/create client: ${email} (${name})`,
            );
            errors.push({
              row: globalIndex + 1,
              error: `Could not find or create customer: ${email}`,
            });
            continue;
          } else {
            console.log(
              `[GOTEAMUP-ATTENDANCE] Using client ID: ${customerId} for ${email}`,
            );
          }

          // Parse attendance data
          const bookingDate = this.parseDate(row["Date"] || row["date"] || "");
          if (!bookingDate) {
            progress.skipped++;
            errors.push({
              row: globalIndex + 1,
              error: "Invalid or missing date",
            });
            continue;
          }
          const rawTime = row["Time"] || row["time"] || "09:00";
          const bookingTime = this.parseTime(rawTime); // Parse time to 24-hour format
          const className =
            row["Class Type"] ||
            row["Class Name"] ||
            row["Class"] ||
            row["Session"] ||
            "Class";
          const instructor =
            row["Instructors"] ||
            row["Instructor"] ||
            row["Trainer"] ||
            "Staff";
          const venue = row["Venue"] || "";
          const status = row["Status"] || "Registered";

          // Create datetime strings for session matching
          // Ensure time is in HH:MM format
          const formattedTime = bookingTime.includes(":")
            ? bookingTime
            : `${bookingTime}:00`;
          const sessionStartTime = `${bookingDate}T${formattedTime}:00`;

          const sessionEndTime = this.calculateEndTime(
            sessionStartTime,
            className,
          );

          // Auto-create or find class session
          let sessionId = await this.findOrCreateClassSession({
            organizationId: this.organizationId,
            className,
            instructor,
            venue,
            startTime: sessionStartTime,
            endTime: sessionEndTime,
            date: bookingDate,
          });

          if (!sessionId) {
            progress.errors++;
            errors.push({
              row: globalIndex + 1,
              error: "Could not create or find class session",
            });
            continue;
          }

          // Check for duplicate booking in class_bookings table
          // Check by customer, booking date, AND session to prevent duplicates
          const { data: existingBookings } = await this.supabase
            .from("class_bookings")
            .select("id")
            .or(`client_id.eq.${customerId},customer_id.eq.${customerId}`)
            .eq("booking_date", bookingDate)
            .eq("class_session_id", sessionId)
            .eq("organization_id", this.organizationId);

          const existing = existingBookings && existingBookings.length > 0;

          if (existing) {
            progress.skipped++;
            console.log(
              `[GOTEAMUP-ATTENDANCE] Skipped duplicate booking for ${email} on ${bookingDate} for session ${sessionId}`,
            );
            continue;
          }

          // Determine booking status based on Status field
          const bookingStatus =
            status.toLowerCase() === "attended" ? "completed" : "confirmed";
          const attendedAt =
            status.toLowerCase() === "attended"
              ? new Date(sessionStartTime).toISOString()
              : null;

          // Insert attendance into class_bookings table
          const bookingData: any = {
            organization_id: this.organizationId,
            class_session_id: sessionId,
            booking_status: bookingStatus,
            attended_at: attendedAt,
            booking_date: bookingDate,
            created_at: new Date().toISOString(),
            // Use client_id for the customer reference (UI checks both fields with OR)
            client_id: customerId,
            customer_id: null,
          };

          const { error, data } = await this.supabase
            .from("class_bookings")
            .insert(bookingData)
            .select();

          if (error) {
            progress.errors++;
            console.error(
              `[GOTEAMUP-ATTENDANCE] Insert error for row ${globalIndex + 1}: ${error.message}`,
            );
            console.error(`[GOTEAMUP-ATTENDANCE] Error details:`, error);
            console.error(`[GOTEAMUP-ATTENDANCE] Attempted data:`, bookingData);
            errors.push({ row: globalIndex + 1, error: error.message });
          } else {
            progress.success++;
            console.log(
              `[GOTEAMUP-ATTENDANCE] Successfully inserted booking ${data?.[0]?.id}`,
            );
          }
        } catch (error: any) {
          progress.errors++;
          errors.push({ row: globalIndex + 1, error: error.message });
        }

        if (this.progressCallback) {
          this.progressCallback(progress);
        }
      }

      // Small delay between batches to prevent overwhelming the database
      if (batchStart + batchSize < data.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Skip client statistics update for performance - this was taking 25+ seconds
    // Statistics can be updated separately if needed
    // await this.updateClientStatistics();

    const message =
      this.newClientsCreated > 0
        ? `Import completed: ${progress.success} successful, ${this.newClientsCreated} new customers created, ${progress.skipped} skipped, ${progress.errors} errors`
        : `Import completed: ${progress.success} successful, ${progress.skipped} skipped, ${progress.errors} errors`;

    return {
      success: progress.errors === 0,
      message,
      stats: {
        total: progress.total,
        success: progress.success,
        errors: progress.errors,
        skipped: progress.skipped,
        newClients: this.newClientsCreated,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Update client statistics
  private async updateClientStatistics() {
    const { data: clients } = await this.supabase
      .from("clients")
      .select("id")
      .eq("organization_id", this.organizationId);

    if (!clients) return;

    for (const client of clients) {
      // Calculate lifetime value
      const { data: payments } = await this.supabase
        .from("payments")
        .select("amount")
        .eq("client_id", client.id);

      const lifetimeValue =
        payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) ||
        0;

      // Count visits
      const { data: bookings } = await this.supabase
        .from("bookings")
        .select("id, booking_date")
        .eq("client_id", client.id)
        .not("attended_at", "is", null);

      const totalVisits = bookings?.length || 0;
      const lastVisit =
        bookings && bookings.length > 0
          ? bookings.sort(
              (a: any, b: any) =>
                new Date(b.booking_date).getTime() -
                new Date(a.booking_date).getTime(),
            )[0].booking_date
          : null;

      // Update client - only update fields that exist
      // Try to update with all fields, but don't fail if some don't exist
      try {
        await this.supabase
          .from("clients")
          .update({
            lifetime_value: lifetimeValue,
            total_visits: totalVisits,
            last_visit: lastVisit,
          })
          .eq("id", client.id);
      } catch (updateError) {
        // If update fails, try with minimal fields
        console.log(
          "Could not update all statistics fields, trying minimal update",
        );
        try {
          await this.supabase
            .from("clients")
            .update({
              updated_at: new Date().toISOString(),
            })
            .eq("id", client.id);
        } catch (minimalError) {
          console.log("Statistics update skipped for client:", client.id);
        }
      }
    }
  }

  // Helper to calculate end time for a session based on class type
  private calculateEndTime(startTime: string, className: string): string {
    try {
      const start = new Date(startTime);

      if (isNaN(start.getTime())) {
        console.error(`[GOTEAMUP-ATTENDANCE] Invalid start time: ${startTime}`);
        // Return a default end time 1 hour after start
        const fallbackStart = new Date();
        const fallbackEnd = new Date(fallbackStart.getTime() + 60 * 60000);
        return fallbackEnd.toISOString();
      }

      let durationMinutes = 60; // Default 1 hour

      // Estimate duration based on class name patterns
      const classNameLower = className.toLowerCase();
      if (
        classNameLower.includes("yoga") ||
        classNameLower.includes("stretch")
      ) {
        durationMinutes = 75;
      } else if (
        classNameLower.includes("hiit") ||
        classNameLower.includes("bootcamp")
      ) {
        durationMinutes = 45;
      } else if (
        classNameLower.includes("spin") ||
        classNameLower.includes("cycle")
      ) {
        durationMinutes = 45;
      } else if (classNameLower.includes("pilates")) {
        durationMinutes = 55;
      }

      const endTime = new Date(start.getTime() + durationMinutes * 60000);
      return endTime.toISOString();
    } catch (error) {
      console.error(`[GOTEAMUP-ATTENDANCE] Error calculating end time:`, error);
      throw error;
    }
  }

  // Helper to find or create a class session
  private async findOrCreateClassSession({
    organizationId,
    className,
    instructor,
    venue,
    startTime,
    endTime,
    date,
  }: {
    organizationId: string;
    className: string;
    instructor: string;
    venue: string;
    startTime: string;
    endTime: string;
    date: string;
  }): Promise<string | null> {
    try {
      // First try to find existing session by exact match
      const { data: exactMatch } = await this.supabase
        .from("class_sessions")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("name", className)
        .eq("start_time", startTime)
        .maybeSingle();

      if (exactMatch) {
        console.log(
          `[GOTEAMUP-SESSION] Found exact match session ${exactMatch.id} for ${className} at ${startTime}`,
        );
        return exactMatch.id;
      }

      // If no exact match, try to find within 15 minutes of the start time
      const startBuffer = new Date(
        new Date(startTime).getTime() - 15 * 60000,
      ).toISOString();
      const endBuffer = new Date(
        new Date(startTime).getTime() + 15 * 60000,
      ).toISOString();

      const { data: existingSession } = await this.supabase
        .from("class_sessions")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("name", className)
        .gte("start_time", startBuffer)
        .lte("start_time", endBuffer)
        .maybeSingle();

      if (existingSession) {
        return existingSession.id;
      }

      // Create new session if not found
      const sessionData = {
        organization_id: organizationId,
        name: className,
        description: `Imported from GoTeamUp - ${instructor}`,
        start_time: startTime,
        end_time: endTime,
        max_capacity: 20, // Default capacity
        current_bookings: 0,
        // status field removed - column doesn't exist in database
        location: venue || null,
        // instructor_notes field removed - column doesn't exist in database
        // instructor info is already in the description field
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newSession, error } = await this.supabase
        .from("class_sessions")
        .insert(sessionData)
        .select("id")
        .single();

      if (error) {
        console.error("Error creating class session:", error);
        return null;
      }

      console.log(
        `[GOTEAMUP-SESSION] Created new session ${newSession?.id} for ${className} at ${startTime}`,
      );
      return newSession?.id || null;
    } catch (error) {
      console.error("Error in findOrCreateClassSession:", error);
      return null;
    }
  }

  // Import memberships from GoTeamUp CSV export
  public async importMemberships(
    data: any[],
    batchSize: number = 25,
  ): Promise<ImportResult> {
    const progress: ImportProgress = {
      total: data.length,
      processed: 0,
      success: 0,
      errors: 0,
      skipped: 0,
    };

    const errors: Array<{ row: number; error: string }> = [];
    const processedPlans = new Map<string, string>(); // membershipKey -> planId
    let plansCreated = 0;
    let membershipsCreated = 0;

    try {
      // PHASE 1: Create unique membership plans (by name only, ignoring price variations)
      // We'll store individual client prices at the assignment level
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const activeMemberships = row["Active Memberships"]?.trim();

        if (!activeMemberships || activeMemberships === "") {
          continue; // Skip rows without active memberships
        }

        // Use membership name as key (not price) to avoid duplicates
        const membershipKey = activeMemberships;

        if (processedPlans.has(membershipKey)) {
          continue; // Already created this plan
        }

        // Extract billing period from membership name
        let billingPeriod = "monthly"; // default
        const nameLower = activeMemberships.toLowerCase();

        if (nameLower.includes("week") && !nameLower.includes("month")) {
          billingPeriod = "weekly";
        } else if (nameLower.includes("year") || nameLower.includes("12 month")) {
          billingPeriod = "yearly";
        } else if (nameLower.includes("lifetime") || nameLower.includes("life time")) {
          billingPeriod = "one-time";
        }

        // Check if plan already exists (by name only) - using programs table
        const { data: existingPlan } = await this.supabase
          .from("programs")
          .select("id")
          .eq("organization_id", this.organizationId)
          .eq("name", activeMemberships)
          .maybeSingle();

        if (existingPlan) {
          processedPlans.set(membershipKey, existingPlan.id);
          continue;
        }

        // Calculate the most common price for this membership (will be the base price)
        const pricesForPlan = data
          .filter(r => r["Active Memberships"]?.trim() === activeMemberships)
          .map(r => parseFloat(r["Last Payment Amount (GBP)"] || "0"))
          .filter(p => p > 0);

        // Use the mode (most common price) or median if no clear mode
        const priceFrequency = new Map<number, number>();
        pricesForPlan.forEach(price => {
          priceFrequency.set(price, (priceFrequency.get(price) || 0) + 1);
        });

        let standardPrice = 0;
        let maxFrequency = 0;
        priceFrequency.forEach((frequency, price) => {
          if (frequency > maxFrequency) {
            maxFrequency = frequency;
            standardPrice = price;
          }
        });

        // Fallback to median if still 0
        if (standardPrice === 0 && pricesForPlan.length > 0) {
          pricesForPlan.sort((a, b) => a - b);
          standardPrice = pricesForPlan[Math.floor(pricesForPlan.length / 2)];
        }

        const standardPricePennies = Math.round(standardPrice * 100);

        // Create new program (membership plan) - using programs table schema
        const { data: newPlan, error: planError} = await this.supabase
          .from("programs")
          .insert({
            organization_id: this.organizationId,
            name: activeMemberships,
            description: `Imported from GoTeamUp - ${activeMemberships}`,
            is_active: true,
          })
          .select("id")
          .single();

        if (planError) {
          console.error(`[MEMBERSHIP-IMPORT] Error creating plan "${activeMemberships}":`, planError);
          errors.push({
            row: i + 2,
            error: `Failed to create plan "${activeMemberships}": ${planError.message}`,
          });
          continue;
        }

        if (newPlan) {
          processedPlans.set(membershipKey, newPlan.id);
          plansCreated++;
        }
      }

      // PHASE 2: Batch load all clients
      console.log(`[MEMBERSHIP-IMPORT] Loading all clients for org ${this.organizationId}`);
      const { data: allClients, error: clientsError } = await this.supabase
        .from("clients")
        .select("id, email")
        .eq("org_id", this.organizationId);

      if (clientsError) {
        console.error(`[MEMBERSHIP-IMPORT] Error loading clients:`, clientsError);
        throw new Error(`Failed to load clients: ${clientsError.message}`);
      }

      console.log(`[MEMBERSHIP-IMPORT] Loaded ${allClients?.length || 0} clients`);

      const clientsByEmail = new Map(
        (allClients || []).map((c) => [c.email.toLowerCase(), c]),
      );

      // PHASE 3: Assign memberships
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const email = row["Email"]?.trim().toLowerCase();
        const activeMemberships = row["Active Memberships"]?.trim();
        const lastPaymentAmount = parseFloat(
          row["Last Payment Amount (GBP)"] || "0",
        );
        const lastPaymentDate = row["Last Payment Date"]?.trim();
        const status = row["Status"]?.trim().toLowerCase();

        progress.processed++;

        if (!email) {
          progress.skipped++;
          continue;
        }

        if (!activeMemberships || activeMemberships === "") {
          progress.skipped++;
          continue;
        }

        // Find client by email
        const client = clientsByEmail.get(email);

        if (!client) {
          progress.errors++;
          errors.push({
            row: i + 2,
            error: `Client not found: ${email}`,
          });
          continue;
        }

        // Get the plan ID (by name only now)
        const clientPricePennies = Math.round(lastPaymentAmount * 100);
        const membershipKey = activeMemberships;
        const planId = processedPlans.get(membershipKey);

        if (!planId) {
          progress.errors++;
          errors.push({
            row: i + 2,
            error: `Membership plan not found: ${activeMemberships}`,
          });
          continue;
        }

        // Get the plan's standard price to determine if this client has custom pricing
        const { data: membershipPlan } = await this.supabase
          .from("membership_plans")
          .select("price_pennies")
          .eq("id", planId)
          .single();

        const hasCustomPrice = membershipPlan && clientPricePennies !== membershipPlan.price_pennies;
        const priceOverrideReason = hasCustomPrice
          ? (clientPricePennies < membershipPlan.price_pennies
              ? "Discounted rate (imported from GoTeamUp)"
              : "Premium rate (imported from GoTeamUp)")
          : null;

        // memberships.customer_id references leads(id), so find/create lead first
        const { data: existingLead } = await this.supabase
          .from("leads")
          .select("id")
          .eq("email", client.email.toLowerCase().trim())
          .eq("organization_id", this.organizationId)
          .maybeSingle();

        let leadId = existingLead?.id;

        if (!leadId) {
          // Create lead from client data
          console.log(`[MEMBERSHIP-IMPORT] Creating lead for ${client.email}`);
          const { data: newLead, error: leadError } = await this.supabase
            .from("leads")
            .insert({
              organization_id: this.organizationId,
              email: client.email.toLowerCase().trim(),
              name: client.name || `${client.first_name || ''} ${client.last_name || ''}`.trim(),
              first_name: client.first_name,
              last_name: client.last_name,
              phone: client.phone,
              status: "customer",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (leadError) {
            console.error(`[MEMBERSHIP-IMPORT] Failed to create lead:`, leadError);
            progress.errors++;
            errors.push({
              row: i + 2,
              error: `Failed to create lead: ${leadError.message}`,
            });
            continue;
          }

          leadId = newLead?.id;
          console.log(`[MEMBERSHIP-IMPORT] Created lead ${leadId} for ${client.email}`);
        } else {
          console.log(`[MEMBERSHIP-IMPORT] Found existing lead ${leadId} for ${client.email}`);
        }

        // Check if membership already exists (using leadId now)
        console.log(`[MEMBERSHIP-IMPORT] Checking for existing membership for lead ${leadId}, plan ${planId}`);
        const { data: existingMembership, error: checkError } = await this.supabase
          .from("memberships")
          .select("id")
          .eq("customer_id", leadId)
          .eq("program_id", planId)
          .maybeSingle();

        if (checkError) {
          console.error(`[MEMBERSHIP-IMPORT] Error checking existing membership:`, checkError);
        }

        if (existingMembership) {
          // Update existing membership
          console.log(`[MEMBERSHIP-IMPORT] Updating existing membership ${existingMembership.id}`);
          const { error: updateError } = await this.supabase
            .from("memberships")
            .update({
              membership_status: status === "active" ? "active" : "inactive",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingMembership.id);

          if (!updateError) {
            console.log(`[MEMBERSHIP-IMPORT] Successfully updated membership ${existingMembership.id}`);
            progress.success++;
          } else {
            console.error(`[MEMBERSHIP-IMPORT] Error updating membership:`, updateError);
            progress.errors++;
            errors.push({
              row: i + 2,
              error: `Update failed: ${updateError.message}`,
            });
          }
        } else {
          // Create new membership (leadId already obtained above)
          console.log(`[MEMBERSHIP-IMPORT] Creating new membership for lead ${leadId}, plan ${planId}`);

          const membershipData = {
            customer_id: leadId, // Use leadId from leads table
            program_id: planId,
            organization_id: this.organizationId,
            membership_status: status === "active" ? "active" : "inactive",
            start_date: lastPaymentDate || new Date().toISOString().split("T")[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          console.log(`[MEMBERSHIP-IMPORT] Inserting membership:`, membershipData);
          const { data: newMembership, error: membershipError } = await this.supabase
            .from("memberships")
            .insert(membershipData)
            .select();

          if (!membershipError && newMembership) {
            console.log(`[MEMBERSHIP-IMPORT] Successfully created membership ${newMembership[0]?.id}`);
            progress.success++;
            membershipsCreated++;
          } else {
            console.error(`[MEMBERSHIP-IMPORT] Error creating membership:`, membershipError);
            console.error(`[MEMBERSHIP-IMPORT] Failed data:`, membershipData);
            progress.errors++;
            errors.push({
              row: i + 2,
              error: `Insert failed: ${membershipError?.message || 'Unknown error'}`,
            });
          }
        }

        // Report progress
        if (this.progressCallback) {
          this.progressCallback(progress);
        }
      }

      return {
        success: true,
        message: `Created ${plansCreated} membership plans and assigned ${membershipsCreated} memberships`,
        stats: {
          total: progress.total,
          success: progress.success,
          errors: progress.errors,
          skipped: progress.skipped,
        },
        errors: errors.slice(0, 10), // Return first 10 errors
      };
    } catch (error: any) {
      console.error("Membership import error:", error);
      return {
        success: false,
        message: `Import failed: ${error.message}`,
        stats: {
          total: progress.total,
          success: progress.success,
          errors: progress.errors,
          skipped: progress.skipped,
        },
        errors,
      };
    }
  }
}

// Helper function to parse CSV file
export function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}
