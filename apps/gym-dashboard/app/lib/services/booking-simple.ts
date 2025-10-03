// Simple booking service that doesn't break builds
export class BookingService {
  async getAvailableClasses(
    organizationId: string,
    programId?: string,
    startDate?: string,
    endDate?: string
  ) {
    // Return empty array for now - will be implemented with proper auth
    return [];
  }
}

export const bookingService = new BookingService();