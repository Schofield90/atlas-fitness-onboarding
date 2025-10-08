"use client";

import { Facebook } from "lucide-react";
import IntegrationStep from "./IntegrationStep";

interface FacebookStepProps {
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function FacebookStep({
  onComplete,
  onSkip,
  onClose,
}: FacebookStepProps) {
  return (
    <IntegrationStep
      title="Connect Facebook Ads"
      description="Track ad performance and lead attribution"
      icon={Facebook}
      benefits={[
        "📊 Track ad campaign ROI automatically",
        "🎯 Import leads directly from Facebook Lead Ads",
        "💰 Measure cost per acquisition (CPA)",
        "📈 See which ads convert to memberships",
        "🔄 Auto-sync campaign data every hour",
      ]}
      instructions={[
        'Click "Go to Settings" below to open Facebook integration',
        'Click "Connect Facebook" to start OAuth flow',
        "Sign in to your Facebook Business account",
        "Grant permission to access your ad accounts",
        "Select which ad accounts to sync",
        'Come back here and click "Mark Complete" when done',
      ]}
      settingsUrl="/settings/integrations/facebook"
      docsUrl="/docs/integrations/facebook"
      estimatedMinutes={3}
      onComplete={onComplete}
      onSkip={onSkip}
      onClose={onClose}
    />
  );
}
