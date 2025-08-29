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
  
  // Analytics & Reporting
  advancedAnalytics: boolean
  customReports: boolean
  betaAnalytics: boolean // Beta dashboard access
  
  // AI Features
  aiInsights: boolean
  aiIntelligenceFallback: boolean // Show demo option on org fetch fail
  
  // Forms & SOPs
  formsUploadDocument: boolean // Document upload functionality
  sopsMinimalView: boolean // Show minimal list after create
  
  // Staff & Payroll
  staffFallback: boolean // Show placeholder on fetch fail
  payrollExplainer: boolean // Show explainer and CTA
  
  // Billing & Payments
  billingMswStub: boolean // Enable MSW stub for dev
  billingRetryButton: boolean // Show retry functionality
  
  // Conversations & Contacts
  conversationsNewButton: boolean // Enable/disable New button based on contacts
  contactsExportFeedback: boolean // Show export feedback toasts
  
  // Automation Builder Defect Fixes
  automationBuilderControlledConfig: boolean // PR-1: Controlled config panel inputs with validation
  automationBuilderCanvasImproved: boolean // PR-2: Pan/zoom controls and scroll-bleed fix
  automationBuilderNanoidNodes: boolean // PR-3: Use nanoid for unique node IDs
  automationBuilderMinimapSafety: boolean // PR-4: Prevent minimap navigation clicks
  automationBuilderValidation: boolean // PR-5: Strict pre-run workflow validation
  automationBuilderAutoSave: boolean // PR-6: Enhanced save/publish with hydration
  automationBuilderTemplateModal: boolean // PR-7: Modal template preview and cloning
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
  
  // Analytics & Reporting
  advancedAnalytics: false,
  customReports: false,
  betaAnalytics: false, // Keep beta dashboard gated
  
  // AI Features
  aiInsights: true, // This seems to work based on codebase
  aiIntelligenceFallback: true, // Show demo option on fetch fail
  
  // Forms & SOPs
  formsUploadDocument: false, // Document upload not ready
  sopsMinimalView: true, // Show list after create
  
  // Staff & Payroll
  staffFallback: true, // Show placeholders on fetch fail
  payrollExplainer: true, // Show explainer and CTA
  
  // Billing & Payments
  billingMswStub: true, // Enable in dev for fallback
  billingRetryButton: true, // Always show retry
  
  // Conversations & Contacts
  conversationsNewButton: true, // Gate based on contacts
  contactsExportFeedback: true, // Show export feedback
  
  // Automation Builder Defect Fixes - Enable progressively
  automationBuilderControlledConfig: false, // PR-1: Start disabled, enable when ready
  automationBuilderCanvasImproved: false, // PR-2: Start disabled, enable when ready  
  automationBuilderNanoidNodes: false, // PR-3: Start disabled, enable when ready
  automationBuilderMinimapSafety: false, // PR-4: Start disabled, enable when ready
  automationBuilderValidation: false, // PR-5: Start disabled, enable when ready
  automationBuilderAutoSave: false, // PR-6: Start disabled, enable when ready
  automationBuilderTemplateModal: false, // PR-7: Start disabled, enable when ready
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