/**
 * Onboarding System Configuration
 * Defines all steps, categories, and verification logic for gym onboarding
 */

import { createAdminClient } from "../supabase/admin";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  category: "integrations" | "data_import" | "ai_setup";
  required: boolean;
  order: number;
  verifyFn: (orgId: string) => Promise<boolean>;
  component: string;
  icon?: string;
  estimatedMinutes?: number;
}

export interface OnboardingCategory {
  id: "integrations" | "data_import" | "ai_setup";
  title: string;
  description: string;
  icon: string;
}

// =====================================================
// CATEGORIES
// =====================================================

export const ONBOARDING_CATEGORIES: Record<string, OnboardingCategory> = {
  integrations: {
    id: "integrations",
    title: "Integrations",
    description: "Connect essential services",
    icon: "Plug",
  },
  data_import: {
    id: "data_import",
    title: "Data Import",
    description: "Migrate your existing data",
    icon: "Upload",
  },
  ai_setup: {
    id: "ai_setup",
    title: "AI Setup",
    description: "Configure automation",
    icon: "Bot",
  },
};

// =====================================================
// ONBOARDING STEPS
// =====================================================

export const ONBOARDING_STEPS: OnboardingStep[] = [
  // ==================== INTEGRATIONS ====================
  {
    id: "google_calendar",
    title: "Connect Google Calendar",
    description: "Sync class bookings automatically",
    category: "integrations",
    required: true,
    order: 1,
    estimatedMinutes: 3,
    component: "GoogleCalendarStep",
    icon: "Calendar",
    verifyFn: async (orgId: string) => {
      const admin = createAdminClient();
      const { data } = await admin
        .from("integrations")
        .select("status")
        .eq("organization_id", orgId)
        .eq("type", "google_calendar")
        .maybeSingle();

      return data?.status === "active";
    },
  },

  {
    id: "email_setup",
    title: "Setup Email",
    description: "Configure automated emails",
    category: "integrations",
    required: true,
    order: 2,
    estimatedMinutes: 5,
    component: "EmailStep",
    icon: "Mail",
    verifyFn: async (orgId: string) => {
      const admin = createAdminClient();
      const { data } = await admin
        .from("organizations")
        .select("email_settings")
        .eq("id", orgId)
        .single();

      // Check if SMTP is configured or using default
      return !!(
        data?.email_settings?.smtp_configured ||
        data?.email_settings?.use_default
      );
    },
  },

  {
    id: "facebook",
    title: "Facebook Ads (Optional)",
    description: "Import leads from Facebook",
    category: "integrations",
    required: false,
    order: 3,
    estimatedMinutes: 5,
    component: "FacebookStep",
    icon: "Facebook",
    verifyFn: async (orgId: string) => {
      const admin = createAdminClient();
      const { data } = await admin
        .from("integrations")
        .select("status")
        .eq("organization_id", orgId)
        .eq("type", "facebook_ads")
        .maybeSingle();

      return data?.status === "active";
    },
  },

  {
    id: "whatsapp",
    title: "WhatsApp (Optional)",
    description: "Enable WhatsApp messaging",
    category: "integrations",
    required: false,
    order: 4,
    estimatedMinutes: 4,
    component: "WhatsAppStep",
    icon: "MessageCircle",
    verifyFn: async (orgId: string) => {
      const admin = createAdminClient();
      const { data } = await admin
        .from("integrations")
        .select("status")
        .eq("organization_id", orgId)
        .eq("type", "whatsapp")
        .maybeSingle();

      return data?.status === "active";
    },
  },

  {
    id: "twilio",
    title: "Twilio (Optional)",
    description: "Setup SMS and phone calls",
    category: "integrations",
    required: false,
    order: 5,
    estimatedMinutes: 5,
    component: "TwilioStep",
    icon: "Phone",
    verifyFn: async (orgId: string) => {
      const admin = createAdminClient();
      const { data } = await admin
        .from("integrations")
        .select("status")
        .eq("organization_id", orgId)
        .eq("type", "twilio")
        .maybeSingle();

      return data?.status === "active";
    },
  },

  // ==================== DATA IMPORT ====================
  {
    id: "import_clients",
    title: "Import Clients",
    description: "Migrate your member database",
    category: "data_import",
    required: false,
    order: 6,
    estimatedMinutes: 10,
    component: "GoTeamUpClientsStep",
    icon: "Users",
    verifyFn: async (orgId: string) => {
      const admin = createAdminClient();
      const { count } = await admin
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      return (count || 0) > 0;
    },
  },

  {
    id: "import_memberships",
    title: "Import Memberships",
    description: "Import membership plans",
    category: "data_import",
    required: false,
    order: 7,
    estimatedMinutes: 8,
    component: "GoTeamUpMembershipsStep",
    icon: "CreditCard",
    verifyFn: async (orgId: string) => {
      const admin = createAdminClient();
      const { count } = await admin
        .from("membership_plans")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      return (count || 0) > 0;
    },
  },

  {
    id: "import_attendance",
    title: "Import Attendance",
    description: "Bring over past attendance",
    category: "data_import",
    required: false,
    order: 8,
    estimatedMinutes: 5,
    component: "GoTeamUpAttendanceStep",
    icon: "ClipboardCheck",
    verifyFn: async (orgId: string) => {
      const admin = createAdminClient();
      const { count } = await admin
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "attended");

      return (count || 0) > 0;
    },
  },

  {
    id: "payment_provider",
    title: "Payment Provider",
    description: "Link Stripe or GoCardless",
    category: "data_import",
    required: true,
    order: 9,
    estimatedMinutes: 7,
    component: "PaymentProviderStep",
    icon: "CreditCard",
    verifyFn: async (orgId: string) => {
      const admin = createAdminClient();
      const { count } = await admin
        .from("payment_provider_accounts")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      return (count || 0) > 0;
    },
  },

  {
    id: "import_revenue",
    title: "Import Revenue",
    description: "Import payment history",
    category: "data_import",
    required: false,
    order: 10,
    estimatedMinutes: 10,
    component: "ImportRevenueStep",
    icon: "DollarSign",
    verifyFn: async (orgId: string) => {
      const admin = createAdminClient();
      const { count } = await admin
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      return (count || 0) > 0;
    },
  },

  {
    id: "import_timetable",
    title: "Import Timetable",
    description: "Import your class schedule",
    category: "data_import",
    required: false,
    order: 11,
    estimatedMinutes: 8,
    component: "ImportTimetableStep",
    icon: "CalendarDays",
    verifyFn: async (orgId: string) => {
      const admin = createAdminClient();
      const { count } = await admin
        .from("class_schedules")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      return (count || 0) > 0;
    },
  },

  // ==================== AI SETUP ====================
  {
    id: "learn_ai_bots",
    title: "Learn About AI Bots",
    description: "Discover automation",
    category: "ai_setup",
    required: true,
    order: 12,
    estimatedMinutes: 3,
    component: "AIBotsIntroStep",
    icon: "Bot",
    verifyFn: async (orgId: string) => {
      const admin = createAdminClient();
      const { data } = await admin
        .from("organization_onboarding")
        .select("metadata")
        .eq("organization_id", orgId)
        .maybeSingle();

      return data?.metadata?.ai_tutorial_viewed === true;
    },
  },

  {
    id: "create_first_bot",
    title: "Create First AI Bot",
    description: "Set up lead follow-up bot",
    category: "ai_setup",
    required: false,
    order: 13,
    estimatedMinutes: 5,
    component: "CreateFirstBotStep",
    icon: "Sparkles",
    verifyFn: async (orgId: string) => {
      const admin = createAdminClient();
      const { count } = await admin
        .from("ai_agents")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("enabled", true);

      return (count || 0) > 0;
    },
  },
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get steps by category
 */
export function getStepsByCategory(
  category: "integrations" | "data_import" | "ai_setup",
): OnboardingStep[] {
  return ONBOARDING_STEPS.filter((step) => step.category === category).sort(
    (a, b) => a.order - b.order,
  );
}

/**
 * Get step by ID
 */
export function getStepById(stepId: string): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((step) => step.id === stepId);
}

/**
 * Get required steps
 */
export function getRequiredSteps(): OnboardingStep[] {
  return ONBOARDING_STEPS.filter((step) => step.required);
}

/**
 * Get optional steps
 */
export function getOptionalSteps(): OnboardingStep[] {
  return ONBOARDING_STEPS.filter((step) => !step.required);
}

/**
 * Calculate estimated completion time
 */
export function getTotalEstimatedMinutes(): number {
  return ONBOARDING_STEPS.reduce(
    (sum, step) => sum + (step.estimatedMinutes || 0),
    0,
  );
}

/**
 * Get next recommended step based on completed steps
 */
export function getNextStep(completedStepIds: string[]): OnboardingStep | null {
  const completedSet = new Set(completedStepIds);

  // Find first incomplete required step
  const nextRequired = ONBOARDING_STEPS.filter((s) => s.required).find(
    (step) => !completedSet.has(step.id),
  );

  if (nextRequired) return nextRequired;

  // If all required done, find first incomplete optional step
  const nextOptional = ONBOARDING_STEPS.filter((s) => !s.required).find(
    (step) => !completedSet.has(step.id),
  );

  return nextOptional || null;
}

/**
 * Check if onboarding is complete (all required steps done)
 */
export function isOnboardingComplete(completedStepIds: string[]): boolean {
  const completedSet = new Set(completedStepIds);
  const requiredSteps = getRequiredSteps();

  return requiredSteps.every((step) => completedSet.has(step.id));
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(completedStepIds: string[]): {
  completed: number;
  total: number;
  percentage: number;
  requiredCompleted: number;
  requiredTotal: number;
} {
  const completed = completedStepIds.length;
  const total = ONBOARDING_STEPS.length;
  const percentage = Math.round((completed / total) * 100);

  const requiredSteps = getRequiredSteps();
  const requiredCompleted = requiredSteps.filter((step) =>
    completedStepIds.includes(step.id),
  ).length;

  return {
    completed,
    total,
    percentage,
    requiredCompleted,
    requiredTotal: requiredSteps.length,
  };
}
