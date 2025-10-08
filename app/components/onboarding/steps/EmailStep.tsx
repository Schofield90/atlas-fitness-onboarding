"use client";

import { Mail } from "lucide-react";
import IntegrationStep from "./IntegrationStep";

interface EmailStepProps {
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function EmailStep({
  onComplete,
  onSkip,
  onClose,
}: EmailStepProps) {
  return (
    <IntegrationStep
      title="Connect Email Service"
      description="Send automated emails to clients"
      icon={Mail}
      benefits={[
        "📧 Send welcome emails to new members",
        "📨 Automated booking confirmations",
        "🔔 Class reminders and notifications",
        "📊 Email campaign analytics",
        "⚡ Fast delivery with Sendgrid, Mailgun, or SMTP",
      ]}
      instructions={[
        'Click "Go to Settings" below to open email configuration',
        "Choose your email provider (Sendgrid, Mailgun, or SMTP)",
        "Enter your API credentials or SMTP details",
        "Send a test email to verify the connection",
        'Come back here and click "Mark Complete" when done',
      ]}
      settingsUrl="/settings/integrations/email"
      docsUrl="/docs/integrations/email"
      estimatedMinutes={5}
      onComplete={onComplete}
      onSkip={onSkip}
      onClose={onClose}
    />
  );
}
