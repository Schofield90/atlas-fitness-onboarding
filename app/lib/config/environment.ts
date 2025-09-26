/**
 * Environment Configuration
 * Handles differences between local and production environments
 */

export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";
export const isLocal =
  typeof window !== "undefined" && window.location.hostname === "localhost";

// Database field mappings - handle schema differences
export const DB_FIELD_MAPPINGS = {
  membership_plans: {
    // Production uses 'price', local might use 'price_pennies'
    priceField: isProduction ? "price" : "price",
    getPriceValue: (plan: any) => {
      // Always prefer 'price' field if it exists and is not undefined
      if (plan.price !== undefined) return plan.price;
      // Fall back to price_pennies
      return plan.price_pennies || 0;
    },
  },
  clients: {
    // Handle organization_id vs org_id differences
    orgField: "org_id", // Standardize on org_id
    getOrgId: (client: any) => client.org_id || client.organization_id,
  },
};

// API Configuration
export const API_CONFIG = {
  // Add retry logic for production
  maxRetries: isProduction ? 3 : 1,
  retryDelay: 1000,

  // Cache settings
  cacheTimeout: isProduction ? 300000 : 0, // 5 min in prod, no cache in dev

  // Error reporting
  logErrors: true,
  reportToSentry: isProduction,
};

// Feature flags - control feature availability per environment
export const FEATURES = {
  // Enable debug logging
  debugLogging: isDevelopment || localStorage?.getItem("debug") === "true",

  // Show development tools
  showDevTools: isDevelopment,

  // Use service role for certain operations
  useServiceRole: true, // Always use service role to avoid RLS issues

  // Cache API responses
  enableCache: isProduction,

  // Show environment badge
  showEnvironmentBadge: true,
};

// Data validation - ensure consistency
export const validateDataConsistency = (data: any, table: string) => {
  if (!FEATURES.debugLogging) return;

  console.group(`🔍 Validating ${table} data consistency`);

  switch (table) {
    case "membership_plans":
      data.forEach((item: any) => {
        if (item.price === undefined && item.price_pennies === undefined) {
          console.warn("⚠️ Missing price fields:", item);
        }
        if (item.price === 0 && item.price_pennies === 0) {
          console.warn("⚠️ Both price fields are 0:", item);
        }
      });
      break;

    case "clients":
      data.forEach((item: any) => {
        if (!item.org_id && !item.organization_id) {
          console.warn("⚠️ Missing organization reference:", item);
        }
      });
      break;
  }

  console.groupEnd();
};

// Sync check - warn about potential sync issues
export const checkEnvironmentSync = async () => {
  if (!isDevelopment) return;

  try {
    // Check if local database schema matches expected structure
    const response = await fetch("/api/health/schema-check");
    const result = await response.json();

    if (!result.synced) {
      console.warn(
        "⚠️ Database schema out of sync!",
        "\nRun: npm run db:sync",
        "\nDifferences:",
        result.differences,
      );
    }
  } catch (error) {
    console.debug("Schema check skipped:", error);
  }
};

// Initialize environment checks
if (typeof window !== "undefined") {
  // Run on client-side only
  checkEnvironmentSync();

  // Add environment badge
  if (FEATURES.showEnvironmentBadge) {
    const badge = document.createElement("div");
    badge.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      padding: 5px 10px;
      background: ${isProduction ? "#10B981" : "#F59E0B"};
      color: white;
      font-size: 12px;
      border-radius: 4px;
      z-index: 9999;
      font-family: monospace;
    `;
    badge.textContent = isProduction ? "PROD" : "DEV";
    document.body.appendChild(badge);
  }
}

export default {
  isProduction,
  isDevelopment,
  isLocal,
  DB_FIELD_MAPPINGS,
  API_CONFIG,
  FEATURES,
  validateDataConsistency,
  checkEnvironmentSync,
};
