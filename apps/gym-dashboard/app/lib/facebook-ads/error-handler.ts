/**
 * Facebook Ads API Error Handler with Retry Logic
 *
 * This module provides robust error handling and retry logic for Facebook Marketing API calls.
 * It implements exponential backoff, handles rate limiting, and provides detailed error reporting.
 */

interface FacebookError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialFactor: number;
  jitter: boolean;
}

interface FacebookAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: FacebookError;
  retries?: number;
  totalTime?: number;
}

class FacebookAdsErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    exponentialFactor: 2,
    jitter: true,
  };

  private static readonly RETRYABLE_ERROR_CODES = new Set([
    1, // API Unknown (temporary Facebook issue)
    2, // API Service (temporary Facebook issue)
    4, // API Too Many Calls (rate limiting)
    17, // API User Too Many Calls (rate limiting)
    32, // API Temporary Issue
    613, // Calls to this API have exceeded the rate limit
  ]);

  private static readonly OAUTH_ERROR_CODES = new Set([
    190, // Invalid access token
    102, // Session key invalid
    2500, // Invalid access token signature
  ]);

  /**
   * Makes a Facebook API call with automatic retry logic
   */
  public static async callWithRetry<T>(
    apiCall: () => Promise<Response>,
    config: Partial<RetryConfig> = {},
  ): Promise<FacebookAPIResponse<T>> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    const startTime = Date.now();
    let lastError: FacebookError | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const response = await apiCall();
        const data = await response.json();

        if (response.ok) {
          return {
            success: true,
            data,
            retries: attempt,
            totalTime: Date.now() - startTime,
          };
        }

        // Handle Facebook API errors
        const fbError = this.parseFacebookError(data);
        lastError = fbError;

        // Check if we should retry
        if (attempt < retryConfig.maxRetries && this.shouldRetry(fbError)) {
          const delay = this.calculateDelay(attempt, retryConfig);

          console.warn(
            `Facebook API error (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}):`,
            {
              error: fbError,
              retryingIn: `${delay}ms`,
            },
          );

          await this.sleep(delay);
          continue;
        }

        // No more retries or non-retryable error
        return {
          success: false,
          error: fbError,
          retries: attempt,
          totalTime: Date.now() - startTime,
        };
      } catch (networkError) {
        lastError = {
          message:
            networkError instanceof Error
              ? networkError.message
              : "Network error",
          type: "NetworkError",
          code: 0,
        };

        if (attempt < retryConfig.maxRetries) {
          const delay = this.calculateDelay(attempt, retryConfig);

          console.warn(
            `Network error (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}):`,
            {
              error: lastError,
              retryingIn: `${delay}ms`,
            },
          );

          await this.sleep(delay);
          continue;
        }
      }
    }

    return {
      success: false,
      error: lastError!,
      retries: retryConfig.maxRetries,
      totalTime: Date.now() - startTime,
    };
  }

  /**
   * Parses Facebook API error response
   */
  private static parseFacebookError(errorResponse: any): FacebookError {
    if (errorResponse.error) {
      return {
        message: errorResponse.error.message || "Unknown Facebook API error",
        type: errorResponse.error.type || "FacebookAPIError",
        code: errorResponse.error.code || 0,
        error_subcode: errorResponse.error.error_subcode,
        fbtrace_id: errorResponse.error.fbtrace_id,
      };
    }

    return {
      message: errorResponse.message || "Unknown error",
      type: "UnknownError",
      code: 0,
    };
  }

  /**
   * Determines if an error should trigger a retry
   */
  private static shouldRetry(error: FacebookError): boolean {
    // Always retry network errors
    if (error.type === "NetworkError") {
      return true;
    }

    // Never retry OAuth errors - they need user intervention
    if (this.OAUTH_ERROR_CODES.has(error.code)) {
      return false;
    }

    // Retry specific Facebook API errors
    return this.RETRYABLE_ERROR_CODES.has(error.code);
  }

  /**
   * Calculates delay for next retry using exponential backoff with jitter
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay =
      config.baseDelay * Math.pow(config.exponentialFactor, attempt);
    let delay = Math.min(exponentialDelay, config.maxDelay);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handles rate limiting specifically for Facebook Ads API
   */
  public static async handleRateLimit(headers: Headers): Promise<number> {
    const usageHeader = headers.get("x-ad-account-usage");
    const businessUsageHeader = headers.get("x-business-use-case-usage");

    if (usageHeader) {
      try {
        const usage = JSON.parse(usageHeader);
        const adAccountUsage = usage[Object.keys(usage)[0]]; // Get first ad account usage

        if (adAccountUsage) {
          const { call_count, total_cputime, total_time } = adAccountUsage;

          // Calculate recommended delay based on usage
          if (call_count > 90 || total_cputime > 90 || total_time > 90) {
            return 60000; // 1 minute delay for high usage
          } else if (call_count > 75 || total_cputime > 75 || total_time > 75) {
            return 30000; // 30 second delay for medium usage
          }
        }
      } catch (error) {
        console.warn("Failed to parse usage headers:", error);
      }
    }

    // Default rate limit delay
    return 10000; // 10 seconds
  }

  /**
   * Creates a user-friendly error message for display
   */
  public static formatErrorForUser(error: FacebookError): string {
    switch (error.code) {
      case 190:
        return "Your Facebook access has expired. Please reconnect your Facebook account.";
      case 4:
      case 17:
      case 613:
        return "Facebook rate limit reached. Please try again in a few minutes.";
      case 100:
        return "Invalid request to Facebook. Please check your campaign settings.";
      case 2635:
        return "You don't have permission to access this Facebook ad account.";
      case 2654:
        return "Your Facebook app is in development mode. Contact support to enable production access.";
      default:
        if (error.type === "NetworkError") {
          return "Network connection issue. Please check your internet connection and try again.";
        }
        return `Facebook API error: ${error.message}`;
    }
  }

  /**
   * Logs errors for monitoring and debugging
   */
  public static logError(error: FacebookError, context: any = {}): void {
    const logData = {
      timestamp: new Date().toISOString(),
      error_type: error.type,
      error_code: error.code,
      error_message: error.message,
      error_subcode: error.error_subcode,
      fbtrace_id: error.fbtrace_id,
      context,
      severity: this.getErrorSeverity(error),
    };

    if (logData.severity === "critical") {
      console.error("CRITICAL Facebook API Error:", logData);
    } else if (logData.severity === "warning") {
      console.warn("Facebook API Warning:", logData);
    } else {
      console.info("Facebook API Info:", logData);
    }

    // In production, you would send this to your monitoring service
    // e.g., Sentry, DataDog, New Relic, etc.
  }

  /**
   * Determines error severity for monitoring
   */
  private static getErrorSeverity(
    error: FacebookError,
  ): "info" | "warning" | "critical" {
    if (this.OAUTH_ERROR_CODES.has(error.code)) {
      return "critical"; // Auth errors need immediate attention
    }

    if (error.code === 4 || error.code === 17 || error.code === 613) {
      return "warning"; // Rate limiting is expected but should be monitored
    }

    if (error.type === "NetworkError") {
      return "warning"; // Network issues are usually temporary
    }

    return "info"; // Other errors are logged for debugging
  }
}

/**
 * Utility functions for Facebook API calls
 */
export class FacebookAPIClient {
  private accessToken: string;
  private retryConfig: Partial<RetryConfig>;

  constructor(accessToken: string, retryConfig: Partial<RetryConfig> = {}) {
    this.accessToken = accessToken;
    this.retryConfig = retryConfig;
  }

  /**
   * Makes a GET request to Facebook API with retry logic
   */
  public async get<T>(
    endpoint: string,
    params: Record<string, any> = {},
  ): Promise<FacebookAPIResponse<T>> {
    const url = new URL(`https://graph.facebook.com/v18.0/${endpoint}`);
    url.searchParams.append("access_token", this.accessToken);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    return FacebookAdsErrorHandler.callWithRetry<T>(
      () => fetch(url.toString()),
      this.retryConfig,
    );
  }

  /**
   * Makes a POST request to Facebook API with retry logic
   */
  public async post<T>(
    endpoint: string,
    body: Record<string, any> = {},
  ): Promise<FacebookAPIResponse<T>> {
    const url = `https://graph.facebook.com/v18.0/${endpoint}`;

    return FacebookAdsErrorHandler.callWithRetry<T>(
      () =>
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...body,
            access_token: this.accessToken,
          }),
        }),
      this.retryConfig,
    );
  }

  /**
   * Makes a PATCH request to Facebook API with retry logic
   */
  public async patch<T>(
    endpoint: string,
    body: Record<string, any> = {},
  ): Promise<FacebookAPIResponse<T>> {
    const url = `https://graph.facebook.com/v18.0/${endpoint}`;

    return FacebookAdsErrorHandler.callWithRetry<T>(
      () =>
        fetch(url, {
          method: "POST", // Facebook uses POST for updates
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...body,
            access_token: this.accessToken,
          }),
        }),
      this.retryConfig,
    );
  }
}

export { FacebookAdsErrorHandler, FacebookAPIClient };
export type { FacebookError, RetryConfig, FacebookAPIResponse };
