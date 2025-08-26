/**
 * Feature Flags Configuration
 * Controls access to incomplete or experimental features
 */

export interface FeatureFlags {
  // Marketing & Campaigns
  campaigns: boolean
  campaignsCreate: boolean
  campaignsAnalytics: boolean
  campaignsActions: boolean // View/Edit buttons
  
  // Surveys  
  surveys: boolean
  surveysCreate: boolean
  surveysResponses: boolean
  surveysAnalytics: boolean
  surveysActions: boolean // Edit/Delete/Send buttons
  
  // Other potentially incomplete features
  advancedAnalytics: boolean
  aiInsights: boolean
  customReports: boolean
}

// Default feature flag values
// Set to true to enable, false to disable
const defaultFlags: FeatureFlags = {
  // Marketing - Mostly UI only with mock data
  campaigns: true, // Show in nav but with limited functionality
  campaignsCreate: false, // Disable campaign creation
  campaignsAnalytics: false, // Analytics tab is empty
  campaignsActions: false, // View/Edit don't work
  
  // Surveys - UI only with mock data
  surveys: true, // Show in nav but with limited functionality
  surveysCreate: false, // Disable survey creation
  surveysResponses: false, // Responses are mock
  surveysAnalytics: false, // Analytics tab is empty
  surveysActions: false, // Edit/Delete/Send don't work
  
  // Other features
  advancedAnalytics: false,
  aiInsights: true, // This seems to work based on codebase
  customReports: false,
}

// Environment-based overrides
const getEnvironmentFlags = (): Partial<FeatureFlags> => {
  // Allow environment variables to override flags
  const overrides: Partial<FeatureFlags> = {}
  
  // Example: NEXT_PUBLIC_FEATURE_CAMPAIGNS=true
  if (process.env.NEXT_PUBLIC_FEATURE_CAMPAIGNS === 'true') {
    overrides.campaigns = true
    overrides.campaignsCreate = true
    overrides.campaignsAnalytics = true
    overrides.campaignsActions = true
  }
  
  if (process.env.NEXT_PUBLIC_FEATURE_SURVEYS === 'true') {
    overrides.surveys = true
    overrides.surveysCreate = true
    overrides.surveysResponses = true
    overrides.surveysAnalytics = true
    overrides.surveysActions = true
  }
  
  // Development environment - show everything but disabled
  if (process.env.NODE_ENV === 'development') {
    // In dev, show features but keep actions disabled
    overrides.campaigns = true
    overrides.surveys = true
  }
  
  return overrides
}

// Merge defaults with environment overrides
const flags: FeatureFlags = {
  ...defaultFlags,
  ...getEnvironmentFlags()
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return flags[feature] ?? false
}

/**
 * Get all feature flags
 */
export function getFeatureFlags(): FeatureFlags {
  return { ...flags }
}

/**
 * Hook for React components
 */
export function useFeatureFlag(feature: keyof FeatureFlags): boolean {
  return isFeatureEnabled(feature)
}

/**
 * Component to wrap features that are not ready
 */
export interface ComingSoonProps {
  feature: string
  description?: string
  estimatedDate?: string
  showBetaBadge?: boolean
}

export default flags