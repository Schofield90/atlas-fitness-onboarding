"use client";

import { CreditCard } from "lucide-react";
import IntegrationStep from "./IntegrationStep";

interface PaymentProvidersStepProps {
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function PaymentProvidersStep({
  onComplete,
  onSkip,
  onClose,
}: PaymentProvidersStepProps) {
  return (
    <IntegrationStep
      title="Connect Payment Provider"
      description="Stripe or GoCardless for membership payments"
      icon={CreditCard}
      benefits={[
        "💳 Accept membership payments automatically",
        "🔄 Set up recurring billing for monthly memberships",
        "📊 Track revenue and payment history",
        "💰 See accurate lifetime value (LTV) metrics",
        "🔗 Choose Stripe or GoCardless (or both!)",
      ]}
      instructions={[
        'Click "Go to Settings" below to open payment integration',
        "Choose your payment provider (Stripe or GoCardless)",
        "Connect your existing account or create new one",
        "Import payment history to link to clients",
        "Set up membership plans with pricing",
        'Come back here and click "Mark Complete" when done',
      ]}
      settingsUrl="/settings/integrations/payments"
      docsUrl="/docs/integrations/payments"
      estimatedMinutes={15}
      onComplete={onComplete}
      onSkip={onSkip}
      onClose={onClose}
    />
  );
}
