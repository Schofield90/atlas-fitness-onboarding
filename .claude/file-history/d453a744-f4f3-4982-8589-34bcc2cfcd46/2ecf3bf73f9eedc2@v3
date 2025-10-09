"use client";

import { MessageCircle } from "lucide-react";
import IntegrationStep from "./IntegrationStep";

interface WhatsAppStepProps {
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function WhatsAppStep({
  onComplete,
  onSkip,
  onClose,
}: WhatsAppStepProps) {
  return (
    <IntegrationStep
      title="Connect WhatsApp Business"
      description="Chat with leads and send automated messages"
      icon={MessageCircle}
      benefits={[
        "💬 Chat with leads on their preferred platform",
        "🤖 AI-powered responses to common questions",
        "📅 Automated booking confirmations via WhatsApp",
        "🔔 Class reminders sent directly to phones",
        "📊 Track message engagement and response rates",
      ]}
      instructions={[
        'Click "Go to Settings" below to open WhatsApp configuration',
        "Enter your WhatsApp Business API credentials",
        "Set up your phone number and verify ownership",
        "Configure AI response settings (optional)",
        "Send a test message to verify connection",
        'Come back here and click "Mark Complete" when done',
      ]}
      settingsUrl="/settings/integrations/whatsapp"
      docsUrl="/docs/integrations/whatsapp"
      estimatedMinutes={7}
      onComplete={onComplete}
      onSkip={onSkip}
      onClose={onClose}
    />
  );
}
