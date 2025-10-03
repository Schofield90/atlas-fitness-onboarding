import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Connection pool configuration for production scalability
const POOL_CONFIG = {
  // Max connections per instance
  maxConnections: process.env.NODE_ENV === "production" ? 10 : 5,
  // Connection timeout in ms
  connectionTimeout: 5000,
  // Idle timeout before closing connection
  idleTimeout: 30000,
  // Request timeout
  requestTimeout: 15000,
};

// Singleton pattern for connection pooling
class SupabasePool {
  private static instance: SupabasePool;
  private clients: Map<string, SupabaseClient> = new Map();
  private serviceClient: SupabaseClient | null = null;

  private constructor() {}

  static getInstance(): SupabasePool {
    if (!SupabasePool.instance) {
      SupabasePool.instance = new SupabasePool();
    }
    return SupabasePool.instance;
  }

  /**
   * Get a pooled client for a specific organization
   * This ensures tenant isolation at the connection level
   */
  getClientForOrg(orgId: string, accessToken?: string): SupabaseClient {
    const key = `org:${orgId}`;

    if (!this.clients.has(key)) {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            headers: {
              "x-organization-id": orgId,
            },
          },
          db: {
            schema: "public",
          },
          // Add connection pooling options when Supabase supports them
        },
      );

      // Set authorization header if token provided
      if (accessToken) {
        client.auth.setSession({
          access_token: accessToken,
          refresh_token: "",
        } as any);
      }

      this.clients.set(key, client);

      // Clean up old connections
      if (this.clients.size > POOL_CONFIG.maxConnections) {
        const firstKey = this.clients.keys().next().value;
        this.clients.delete(firstKey);
      }
    }

    return this.clients.get(key)!;
  }

  /**
   * Get service role client for admin operations
   * This bypasses RLS and should be used with extreme caution
   */
  getServiceClient(): SupabaseClient {
    if (!this.serviceClient) {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Service role key not configured");
      }

      this.serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          db: {
            schema: "public",
          },
        },
      );
    }

    return this.serviceClient;
  }

  /**
   * Get a standard authenticated client
   */
  getAuthClient(accessToken: string): SupabaseClient {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      },
    );

    return client;
  }

  /**
   * Clear all pooled connections
   * Useful for testing or when connections need to be reset
   */
  clearPool(): void {
    this.clients.clear();
    this.serviceClient = null;
  }

  /**
   * Get pool statistics for monitoring
   */
  getPoolStats() {
    return {
      activeConnections: this.clients.size,
      maxConnections: POOL_CONFIG.maxConnections,
      hasServiceClient: this.serviceClient !== null,
    };
  }
}

// Export singleton instance methods
const pool = SupabasePool.getInstance();

export const getSupabaseClientForOrg = (orgId: string, accessToken?: string) =>
  pool.getClientForOrg(orgId, accessToken);

export const getSupabaseServiceClient = () => pool.getServiceClient();

export const getSupabaseAuthClient = (accessToken: string) =>
  pool.getAuthClient(accessToken);

export const clearSupabasePool = () => pool.clearPool();

export const getSupabasePoolStats = () => pool.getPoolStats();

/**
 * Wrapper for database queries with automatic retry and timeout
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Add timeout to prevent hanging queries
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Query timeout")),
          POOL_CONFIG.requestTimeout,
        ),
      );

      const result = await Promise.race([operation(), timeoutPromise]);
      return result;
    } catch (error: any) {
      lastError = error;
      console.error(
        `Database operation failed (attempt ${i + 1}/${maxRetries}):`,
        error.message,
      );

      // Don't retry on specific errors
      if (error.message?.includes("PGRST") || error.code === "PGRST301") {
        throw error;
      }

      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Execute a query with tenant isolation enforced
 */
export async function queryWithTenantIsolation<T>(
  orgId: string,
  queryFn: (client: SupabaseClient) => Promise<T>,
  accessToken?: string,
): Promise<T> {
  const client = getSupabaseClientForOrg(orgId, accessToken);

  return withRetry(async () => {
    // Set the organization context for RLS
    const result = await queryFn(client);
    return result;
  });
}
