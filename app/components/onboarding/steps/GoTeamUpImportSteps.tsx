"use client";

import { Users, CreditCard, CalendarDays, DollarSign } from "lucide-react";
import DataImportStep from "./DataImportStep";

interface StepProps {
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}

// Clients Import Step
export function GoTeamUpClientsStep({
  onComplete,
  onSkip,
  onClose,
}: StepProps) {
  return (
    <DataImportStep
      title="Import Clients from TeamUp"
      description="Migrate all your existing members"
      icon={Users}
      importType="clients and members"
      benefits={[
        "👥 Import all client contact information",
        "📧 Preserve email addresses and phone numbers",
        "📊 Maintain member status (active/inactive)",
        "🔗 Automatically link to existing payments",
        "⚡ Bulk import saves hours of manual data entry",
      ]}
      instructions={[
        'Click "Start Import" below to open the import page',
        "Export your client list from TeamUp as CSV",
        "Upload the CSV file to Atlas Fitness",
        "Review and map the columns",
        "Click Import to migrate all clients",
        'Come back here and click "Mark Complete" when done',
      ]}
      settingsUrl="/settings/integrations/teamup"
      docsUrl="/docs/imports/teamup-clients"
      estimatedMinutes={10}
      onComplete={onComplete}
      onSkip={onSkip}
      onClose={onClose}
    />
  );
}

// Memberships Import Step
export function GoTeamUpMembershipsStep({
  onComplete,
  onSkip,
  onClose,
}: StepProps) {
  return (
    <DataImportStep
      title="Import Memberships from TeamUp"
      description="Migrate membership plans and subscriptions"
      icon={CreditCard}
      importType="memberships and subscription plans"
      benefits={[
        "💳 Import all membership plans and tiers",
        "📅 Preserve subscription start/end dates",
        "💰 Maintain pricing and billing periods",
        "🔗 Auto-link memberships to imported clients",
        "📊 Track membership history and renewals",
      ]}
      instructions={[
        'Click "Start Import" below to open the import page',
        "Export your membership data from TeamUp",
        "Upload the file to Atlas Fitness",
        "Map membership tiers to categories",
        "Review and confirm membership assignments",
        'Come back here and click "Mark Complete" when done',
      ]}
      settingsUrl="/settings/integrations/teamup"
      docsUrl="/docs/imports/teamup-memberships"
      estimatedMinutes={15}
      onComplete={onComplete}
      onSkip={onSkip}
      onClose={onClose}
    />
  );
}

// Timetable Import Step
export function GoTeamUpTimetableStep({
  onComplete,
  onSkip,
  onClose,
}: StepProps) {
  return (
    <DataImportStep
      title="Import Class Schedule from TeamUp"
      description="Migrate your entire class timetable"
      icon={CalendarDays}
      importType="class schedules and timetables"
      benefits={[
        "📅 Import all class schedules and recurring sessions",
        "🏋️ Preserve instructor assignments",
        "📍 Maintain location and room details",
        "👥 Import class capacity limits",
        "🔄 Support for recurring weekly schedules",
      ]}
      instructions={[
        'Click "Start Import" below to open the import page',
        "Export your timetable from TeamUp (PDF or CSV)",
        "Upload to Atlas Fitness AI Schedule Analyzer",
        "Review extracted classes and schedules",
        "Edit any details that need correction",
        "Preview generated calendar sessions",
        "Click Import to create all class sessions",
        'Come back here and click "Mark Complete" when done',
      ]}
      settingsUrl="/settings/integrations/teamup"
      docsUrl="/docs/imports/teamup-timetable"
      estimatedMinutes={20}
      onComplete={onComplete}
      onSkip={onSkip}
      onClose={onClose}
    />
  );
}

// Revenue/Payments Import Step
export function GoTeamUpRevenueStep({
  onComplete,
  onSkip,
  onClose,
}: StepProps) {
  return (
    <DataImportStep
      title="Import Revenue from Payment Provider"
      description="Connect Stripe or GoCardless for payment history"
      icon={DollarSign}
      importType="payment history and revenue data"
      benefits={[
        "💰 Import complete payment history",
        "📊 Link payments to clients automatically",
        "📈 See accurate lifetime value (LTV) metrics",
        "🔗 Connect to Stripe or GoCardless",
        "📅 Track recurring vs one-time payments",
      ]}
      instructions={[
        'Click "Start Import" below to open payments page',
        "Connect your Stripe or GoCardless account",
        "Click Import Payment History",
        "System will auto-link payments to clients by email",
        "Review imported transactions and revenue reports",
        'Come back here and click "Mark Complete" when done',
      ]}
      settingsUrl="/settings/integrations/payments/import"
      docsUrl="/docs/imports/payment-history"
      estimatedMinutes={15}
      onComplete={onComplete}
      onSkip={onSkip}
      onClose={onClose}
    />
  );
}
