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
  private parseDate(dateStr: string): string {
    if (!dateStr) return "";

    // Try UK format first (DD/MM/YYYY)
    let parts = dateStr.split("/");
    if (parts.length === 3) {
      const [first, second, year] = parts;
      const firstNum = parseInt(first);
      const secondNum = parseInt(second);

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
    if (dateStr.includes("-")) {
      return dateStr;
    }
    return dateStr;
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
    // First try to find existing client (primary table)
    const { data: existingClient } = await this.supabase
      .from("clients")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .eq("organization_id", this.organizationId)
      .single();

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
  ): "payments" | "attendance" | "unknown" {
    const paymentHeaders = ["amount", "payment", "price", "total", "cost"];
    const attendanceHeaders = ["class", "session", "instructor", "time"];

    const lowerHeaders = headers.map((h) => h.toLowerCase());

    const hasPaymentHeaders = paymentHeaders.some((h) =>
      lowerHeaders.some((lh) => lh.includes(h)),
    );

    const hasAttendanceHeaders = attendanceHeaders.some((h) =>
      lowerHeaders.some((lh) => lh.includes(h)),
    );

    if (hasPaymentHeaders && !hasAttendanceHeaders) return "payments";
    if (hasAttendanceHeaders && !hasPaymentHeaders) return "attendance";
    if (hasPaymentHeaders) return "payments"; // Default to payments if both

    return "unknown";
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
            .single();

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
        await new Promise((resolve) => setTimeout(resolve, 100));
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

          // Check for duplicate booking in class_bookings table
          // Check by customer and booking date to prevent duplicates
          const { data: existingBookings } = await this.supabase
            .from("class_bookings")
            .select("id")
            .or(`client_id.eq.${customerId},customer_id.eq.${customerId}`)
            .eq("booking_date", bookingDate)
            .eq("organization_id", this.organizationId);

          const existing = existingBookings && existingBookings.length > 0;

          if (existing) {
            progress.skipped++;
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
        await new Promise((resolve) => setTimeout(resolve, 100));
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
        throw new Error(`Invalid time value: ${startTime}`);
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
      // First try to find existing session within 15 minutes of the start time
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
        .gte("start_time", startBuffer)
        .lte("start_time", endBuffer)
        .single();

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

      return newSession?.id || null;
    } catch (error) {
      console.error("Error in findOrCreateClassSession:", error);
      return null;
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
