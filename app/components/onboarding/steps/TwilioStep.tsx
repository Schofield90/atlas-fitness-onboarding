"use client";

import { Phone } from "lucide-react";
import IntegrationStep from "./IntegrationStep";

interface TwilioStepProps {
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function TwilioStep({
  onComplete,
  onSkip,
  onClose,
}: TwilioStepProps) {
  return (
    <IntegrationStep
      title="Connect Twilio (SMS & Voice)"
      description="Send SMS and make automated calls"
      icon={Phone}
      benefits={[
        "📱 Send booking confirmations via SMS",
        "🔔 Class reminders sent to members' phones",
        "📞 Make automated appointment reminder calls",
        "💬 Two-way SMS conversations with leads",
        "📊 Track delivery rates and opt-outs",
      ]}
      instructions={[
        'Click "Go to Settings" below to open Twilio configuration',
        "Sign up for Twilio account (if you don't have one)",
        "Copy your Account SID and Auth Token from Twilio dashboard",
        "Paste credentials into Atlas Fitness settings",
        "Purchase a phone number or connect existing number",
        "Send a test SMS to verify connection",
        'Come back here and click "Mark Complete" when done',
      ]}
      settingsUrl="/settings/integrations/phone"
      docsUrl="/docs/integrations/twilio"
      estimatedMinutes={10}
      onComplete={onComplete}
      onSkip={onSkip}
      onClose={onClose}
    />
  );
}
