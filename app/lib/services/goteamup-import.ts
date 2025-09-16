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
    // Try UK format first (DD/MM/YYYY)
    let parts = dateStr.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      // Check if it's actually US format (MM/DD/YYYY) by checking if day > 12
      if (parseInt(day) > 12) {
        // Likely US format
        return `${year}-${day.padStart(2, "0")}-${month.padStart(2, "0")}`;
      }
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
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

  // Helper to create or find a client/customer
  private async findOrCreateClient(
    email: string,
    name?: string,
  ): Promise<string | null> {
    // First try to find existing client
    const { data: existingClient } = await this.supabase
      .from("clients")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .eq("organization_id", this.organizationId)
      .single();

    if (existingClient) {
      return existingClient.id;
    }

    // Try customers table too
    const { data: existingCustomer } = await this.supabase
      .from("customers")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .eq("organization_id", this.organizationId)
      .single();

    if (existingCustomer) {
      return existingCustomer.id;
    }

    // If not found and we should create missing clients
    if (!this.createMissingClients) {
      return null;
    }

    // Parse name if provided
    let firstName = "";
    let lastName = "";
    if (name) {
      const nameParts = name.trim().split(" ");
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || "";
    }

    // Create new customer (using customers table as it's the newer structure)
    const { data: newCustomer, error } = await this.supabase
      .from("customers")
      .insert({
        organization_id: this.organizationId,
        email: email.toLowerCase().trim(),
        first_name: firstName,
        last_name: lastName,
        status: "active",
        source: "goteamup_import",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating customer:", error);
      return null;
    }

    if (newCustomer?.id) {
      this.newClientsCreated++;
    }

    return newCustomer?.id || null;
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

  // Import payments from parsed CSV data
  public async importPayments(data: any[]): Promise<ImportResult> {
    const progress: ImportProgress = {
      total: data.length,
      processed: 0,
      success: 0,
      errors: 0,
      skipped: 0,
    };

    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      progress.processed++;
      progress.currentItem =
        row["Client Name"] || row["Name"] || `Row ${i + 1}`;

      try {
        // Find client by email
        const email = row["Email"] || row["email"];
        if (!email) {
          progress.skipped++;
          errors.push({ row: i + 1, error: "No email found" });
          continue;
        }

        // Get name from row data
        const name = row["Client Name"] || row["Name"] || row["Customer"] || "";

        // Find or create client
        const clientId = await this.findOrCreateClient(email, name);

        if (!clientId) {
          progress.skipped++;
          errors.push({
            row: i + 1,
            error: `Could not find or create client: ${email}`,
          });
          continue;
        }

        // Parse payment data
        const paymentDate = this.parseDate(row["Date"] || row["date"] || "");
        const amount = this.parseAmount(row["Amount"] || row["amount"] || "0");

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

        // Insert payment
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
          errors.push({ row: i + 1, error: error.message });
        } else {
          progress.success++;
        }
      } catch (error: any) {
        progress.errors++;
        errors.push({ row: i + 1, error: error.message });
      }

      if (this.progressCallback) {
        this.progressCallback(progress);
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

  // Import attendance from parsed CSV data
  public async importAttendance(data: any[]): Promise<ImportResult> {
    const progress: ImportProgress = {
      total: data.length,
      processed: 0,
      success: 0,
      errors: 0,
      skipped: 0,
    };

    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      progress.processed++;
      progress.currentItem =
        row["Customer"] || row["Client Name"] || row["Name"] || `Row ${i + 1}`;

      try {
        // Find customer by email
        const email = row["Email"] || row["email"];
        if (!email) {
          progress.skipped++;
          errors.push({ row: i + 1, error: "No email found" });
          continue;
        }

        // Get name from row data
        const name = row["Customer"] || row["Client Name"] || row["Name"] || "";

        // Find or create customer
        const customerId = await this.findOrCreateClient(email, name);

        if (!customerId) {
          progress.skipped++;
          errors.push({
            row: i + 1,
            error: `Could not find or create customer: ${email}`,
          });
          continue;
        }

        // Parse attendance data
        const bookingDate = this.parseDate(row["Date"] || row["date"] || "");
        const bookingTime = row["Time"] || row["time"] || "09:00";
        const className =
          row["Class Type"] ||
          row["Class Name"] ||
          row["Class"] ||
          row["Session"] ||
          "Class";
        const instructor =
          row["Instructors"] || row["Instructor"] || row["Trainer"] || "Staff";
        const venue = row["Venue"] || "";
        const status = row["Status"] || "Registered";

        // Check for duplicate
        const { data: existing } = await this.supabase
          .from("class_bookings")
          .select("id")
          .eq("customer_id", customerId)
          .eq("booking_date", bookingDate)
          .eq("booking_time", bookingTime)
          .single();

        if (existing) {
          progress.skipped++;
          continue;
        }

        // Determine booking status based on Status field
        const bookingStatus =
          status.toLowerCase() === "attended" ? "completed" : "confirmed";
        const attendedAt =
          status.toLowerCase() === "attended"
            ? `${bookingDate}T${bookingTime}:00`
            : null;

        // Insert attendance
        const { error } = await this.supabase.from("class_bookings").insert({
          organization_id: this.organizationId,
          client_id: customerId, // Still required for legacy
          customer_id: customerId,
          booking_date: bookingDate,
          booking_time: bookingTime,
          booking_status: bookingStatus,
          booking_type: "attendance_import",
          attended_at: attendedAt,
          notes: `${className} - ${instructor} - ${venue}`,
          payment_status: "succeeded",
          created_at: new Date().toISOString(),
        });

        if (error) {
          progress.errors++;
          errors.push({ row: i + 1, error: error.message });
        } else {
          progress.success++;
        }
      } catch (error: any) {
        progress.errors++;
        errors.push({ row: i + 1, error: error.message });
      }

      if (this.progressCallback) {
        this.progressCallback(progress);
      }
    }

    // Update client statistics after import
    await this.updateClientStatistics();

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
        .from("class_bookings")
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

      // Update client
      await this.supabase
        .from("clients")
        .update({
          lifetime_value: lifetimeValue,
          total_visits: totalVisits,
          last_visit: lastVisit,
        })
        .eq("id", client.id);
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
