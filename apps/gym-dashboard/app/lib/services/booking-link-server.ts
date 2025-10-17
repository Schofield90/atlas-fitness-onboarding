import { BookingLinkService } from "./booking-link";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Server-side booking link service that uses server Supabase client
export class ServerBookingLinkService extends BookingLinkService {
  private serverSupabase: any;
  private serverAdminSupabase: any;

  protected async getSupabaseClient() {
    // For server-side, we need to create a new client each time
    // as the async context changes per request
    return await createClient();
  }

  protected async getAdminSupabaseClient() {
    if (!this.serverAdminSupabase) {
      this.serverAdminSupabase = createAdminClient();
    }
    return this.serverAdminSupabase;
  }
}

// Export a singleton instance for server-side use
export const serverBookingLinkService = new ServerBookingLinkService();
