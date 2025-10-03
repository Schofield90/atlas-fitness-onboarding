"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Hash,
  Key,
  Phone,
  Loader2,
  AlertTriangle,
  CreditCard,
  Globe,
  Settings,
  Shield,
} from "lucide-react";

interface TwilioSetupWizardProps {
  settings: any;
  onSettingsChange: (settings: any) => void;
  onTestConnection: () => void;
  testingConnection: boolean;
  connectionStatus: "untested" | "success" | "error" | "testing";
}

interface Step {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  isComplete: boolean;
}

export default function TwilioSetupWizard({
  settings,
  onSettingsChange,
  onTestConnection,
  testingConnection,
  connectionStatus,
}: TwilioSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleChange = (field: string, value: any) => {
    onSettingsChange({
      ...settings,
      config: {
        ...settings.config,
        [field]: value,
      },
    });
  };

  const copyToClipboard = async (text: string, field: string) => {
    const success = await import("@/app/lib/utils").then((utils) =>
      utils.copyToClipboard(text),
    );
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const steps: Step[] = [
    {
      id: "account",
      title: "Create Twilio Account",
      description: "Sign up for a new Twilio account or log into existing one",
      isComplete: false,
      component: (
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-white mb-4">
              Step 1: Create Your Account
            </h4>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <p className="text-gray-300 mb-2">
                    Go to <strong>twilio.com</strong> and click "Sign up free"
                  </p>
                  <a
                    href="https://www.twilio.com/try-twilio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Open Twilio Sign Up <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div className="text-gray-300">
                  <p className="mb-2">Fill out the registration form with:</p>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    <li>Your email address</li>
                    <li>A strong password</li>
                    <li>Your phone number</li>
                    <li>Company/project name</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div className="text-gray-300">
                  <p className="mb-2">Complete verification:</p>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    <li>Verify your email address</li>
                    <li>Verify your phone number with SMS code</li>
                    <li>Answer questions about your use case</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-green-900/20 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <CreditCard className="h-5 w-5" />
                <span className="font-medium">Free Credits Included</span>
              </div>
              <p className="text-green-300 text-sm">
                New accounts receive <strong>$15 in free credits</strong> to
                test SMS and voice features. No credit card required to get
                started!
              </p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h5 className="font-medium text-white mb-2">Visual Guide</h5>
            <div className="bg-gray-700 rounded-lg p-8 text-center">
              <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">
                Screenshot placeholder: Twilio signup page
              </p>
              <p className="text-xs text-gray-500 mt-2">
                The actual signup form with highlighted fields would appear here
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "credentials",
      title: "Get Your Credentials",
      description: "Find your Account SID and Auth Token in the Console",
      isComplete: !!(
        settings?.config?.account_sid && settings?.config?.auth_token
      ),
      component: (
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-white mb-4">
              Step 2: Find Your Credentials
            </h4>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <p className="text-gray-300 mb-2">
                    Go to your <strong>Twilio Console Dashboard</strong>
                  </p>
                  <a
                    href="https://console.twilio.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Open Twilio Console <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div className="text-gray-300">
                  <p className="mb-2">
                    Look for the <strong>"Account Info"</strong> section on the
                    main dashboard
                  </p>
                  <p className="text-sm text-gray-400">
                    This will be in the top right area of your console
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div className="text-gray-300">
                  <p className="mb-2">Copy your credentials:</p>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    <li>
                      <strong>Account SID</strong> - starts with "AC" (always
                      visible)
                    </li>
                    <li>
                      <strong>Auth Token</strong> - click the eye icon to reveal
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Credential Input Fields */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h5 className="font-medium text-white mb-4">
              Enter Your Credentials
            </h5>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Account SID *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={settings?.config?.account_sid || ""}
                    onChange={(e) =>
                      handleChange("account_sid", e.target.value)
                    }
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                  />
                  {settings?.config?.account_sid && (
                    <button
                      onClick={() =>
                        copyToClipboard(
                          settings.config.account_sid,
                          "account_sid",
                        )
                      }
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {copiedField === "account_sid" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Should start with "AC" and be 34 characters long
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Auth Token *
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type={showAuthToken ? "text" : "password"}
                    value={settings?.config?.auth_token || ""}
                    onChange={(e) => handleChange("auth_token", e.target.value)}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="w-full pl-10 pr-20 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {settings?.config?.auth_token && (
                      <button
                        onClick={() =>
                          copyToClipboard(
                            settings.config.auth_token,
                            "auth_token",
                          )
                        }
                        className="text-gray-500 hover:text-gray-300"
                      >
                        {copiedField === "auth_token" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAuthToken(!showAuthToken)}
                      className="text-gray-500 hover:text-gray-300"
                    >
                      {showAuthToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Keep this secret! It provides full access to your Twilio
                  account
                </p>
              </div>
            </div>

            {settings?.config?.account_sid && settings?.config?.auth_token && (
              <div className="mt-4">
                <button
                  onClick={onTestConnection}
                  disabled={testingConnection}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {testingConnection ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  Test Connection
                </button>
              </div>
            )}
          </div>

          {/* Visual Guide */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h5 className="font-medium text-white mb-2">Visual Guide</h5>
            <div className="bg-gray-700 rounded-lg p-8 text-center">
              <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">
                Screenshot placeholder: Twilio Console Account Info section
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Shows the exact location of Account SID and Auth Token
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "phone-number",
      title: "Get Phone Number",
      description: "Purchase a phone number with SMS capabilities",
      isComplete: !!settings?.config?.phone_number,
      component: (
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-white mb-4">
              Step 3: Buy a Phone Number
            </h4>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <p className="text-gray-300 mb-2">
                    In your Twilio Console, navigate to{" "}
                    <strong>Phone Numbers → Manage</strong>
                  </p>
                  <a
                    href="https://console.twilio.com/us1/develop/phone-numbers/manage/incoming"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Manage Phone Numbers <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div className="text-gray-300">
                  <p className="mb-2">
                    Click <strong>"Buy a number"</strong>
                  </p>
                  <p className="text-sm text-gray-400">
                    You'll need at least $1 in account credits
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div className="text-gray-300">
                  <p className="mb-2">Configure your search:</p>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    <li>
                      Select your <strong>country</strong>
                    </li>
                    <li>
                      Choose <strong>SMS</strong> capability
                    </li>
                    <li>
                      Optionally select <strong>Voice</strong> for calls
                    </li>
                    <li>Pick an area code if needed</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  4
                </div>
                <div className="text-gray-300">
                  <p>
                    Click <strong>"Buy"</strong> on your preferred number
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Phone className="h-5 w-5" />
                <span className="font-medium">Number Requirements</span>
              </div>
              <p className="text-blue-300 text-sm">
                Make sure to select a number with{" "}
                <strong>SMS capabilities</strong>. Voice is optional but
                recommended for full communication features.
              </p>
            </div>
          </div>

          {/* Phone Number Input */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h5 className="font-medium text-white mb-4">
              Enter Your Phone Number
            </h5>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Twilio Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  value={settings?.config?.phone_number || ""}
                  onChange={(e) => handleChange("phone_number", e.target.value)}
                  placeholder="+1234567890"
                  className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                />
                {settings?.config?.phone_number && (
                  <button
                    onClick={() =>
                      copyToClipboard(
                        settings.config.phone_number,
                        "phone_number",
                      )
                    }
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {copiedField === "phone_number" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Include country code (e.g., +1 for US, +44 for UK)
              </p>
            </div>

            {/* Available Numbers (if any) */}
            {settings?.config?.available_numbers &&
              settings.config.available_numbers.length > 0 && (
                <div className="mt-4">
                  <h6 className="text-sm font-medium text-gray-400 mb-2">
                    Available Numbers:
                  </h6>
                  <div className="grid grid-cols-1 gap-2">
                    {settings.config.available_numbers.map(
                      (number: any, index: number) => (
                        <button
                          key={index}
                          onClick={() =>
                            handleChange("phone_number", number.phoneNumber)
                          }
                          className="text-left p-3 bg-gray-700 rounded-lg hover:bg-gray-600 text-white text-sm"
                        >
                          <div className="font-mono">{number.phoneNumber}</div>
                          <div className="text-xs text-gray-400">
                            {number.capabilities.join(", ")} • $
                            {number.monthlyPrice}/month
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
          </div>

          {/* Visual Guide */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h5 className="font-medium text-white mb-2">Visual Guide</h5>
            <div className="bg-gray-700 rounded-lg p-8 text-center">
              <Phone className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">
                Screenshot placeholder: Phone number purchase page
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Shows the number search interface and capability selection
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "test",
      title: "Test & Configure",
      description: "Test your connection and configure webhooks",
      isComplete: connectionStatus === "success",
      component: (
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-white mb-4">
              Step 4: Test & Final Setup
            </h4>

            {/* Connection Test */}
            <div className="mb-6">
              <h5 className="font-medium text-white mb-3">Connection Test</h5>
              <div className="flex items-center gap-4">
                <button
                  onClick={onTestConnection}
                  disabled={
                    testingConnection ||
                    !settings?.config?.account_sid ||
                    !settings?.config?.auth_token
                  }
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testingConnection ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  {testingConnection ? "Testing..." : "Test Connection"}
                </button>

                <div className="flex items-center gap-2">
                  {connectionStatus === "success" && (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-500 font-medium">
                        Connected Successfully!
                      </span>
                    </>
                  )}
                  {connectionStatus === "error" && (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="text-red-500 font-medium">
                        Connection Failed
                      </span>
                    </>
                  )}
                  {connectionStatus === "testing" && (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                      <span className="text-yellow-500 font-medium">
                        Testing...
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Webhook Configuration */}
            <div className="space-y-4">
              <h5 className="font-medium text-white">
                Webhook Configuration (Optional)
              </h5>
              <p className="text-gray-400 text-sm">
                Webhooks allow Twilio to notify your app about message delivery
                and incoming messages.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Webhook URL
                </label>
                <input
                  type="text"
                  value={settings?.config?.webhook_url || ""}
                  onChange={(e) => handleChange("webhook_url", e.target.value)}
                  placeholder="https://yourdomain.com/api/webhooks/twilio"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This URL will receive delivery status updates
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Status Callback URL
                </label>
                <input
                  type="text"
                  value={settings?.config?.status_callback_url || ""}
                  onChange={(e) =>
                    handleChange("status_callback_url", e.target.value)
                  }
                  placeholder="https://yourdomain.com/api/webhooks/twilio/status"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This URL will receive message status updates
                </p>
              </div>
            </div>

            {connectionStatus === "success" && (
              <div className="mt-6 p-4 bg-green-900/20 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Setup Complete!</span>
                </div>
                <p className="text-green-300 text-sm">
                  Your Twilio integration is ready to use. You can now send SMS
                  messages and receive webhooks.
                </p>
              </div>
            )}
          </div>

          {/* Next Steps */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h5 className="font-medium text-white mb-4">Next Steps</h5>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Configure your phone number</strong> in Twilio Console
                  to use your webhook URLs
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Set up message templates</strong> for automated
                  communications
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Test sending messages</strong> using the SMS test
                  panel
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Monitor usage and billing</strong> in your Twilio
                  Console
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const canProceedToNext = () => {
    const currentStepData = steps[currentStep];

    switch (currentStepData.id) {
      case "account":
        return true; // User can proceed to credentials step anytime
      case "credentials":
        return !!(
          settings?.config?.account_sid && settings?.config?.auth_token
        );
      case "phone-number":
        return !!settings?.config?.phone_number;
      case "test":
        return connectionStatus === "success";
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Setup Wizard</h3>
        <p className="text-gray-400 text-sm">
          Follow these steps to configure your Twilio integration
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => setCurrentStep(index)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                index === currentStep
                  ? "bg-orange-600 text-white"
                  : index < currentStep || step.isComplete
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-400"
              }`}
            >
              {step.isComplete && index !== currentStep ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                index + 1
              )}
            </button>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-2 ${
                  index < currentStep ? "bg-green-600" : "bg-gray-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Title */}
      <div className="mb-6">
        <h4 className="text-xl font-semibold text-white">
          {steps[currentStep].title}
        </h4>
        <p className="text-gray-400 mt-1">{steps[currentStep].description}</p>
      </div>

      {/* Step Content */}
      <div className="mb-8">{steps[currentStep].component}</div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </button>

        <button
          onClick={nextStep}
          disabled={currentStep === steps.length - 1 || !canProceedToNext()}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
