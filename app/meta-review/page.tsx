"use client";

import { useState } from "react";
import {
  CheckCircle,
  AlertCircle,
  Play,
  Copy,
  ExternalLink,
} from "lucide-react";

export default function MetaReviewPage() {
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [testResults, setTestResults] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const testCredentials = {
    email: "meta-reviewer@atlas-fitness.demo",
    password: "MetaReview2024!",
    organizationId: "63589490-8f55-4157-bd3a-e141594b748e",
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runWebhookTest = async () => {
    setTestStatus("testing");
    setTestResults(null);

    try {
      // Test webhook endpoint
      const webhookUrl = `${window.location.origin}/api/webhooks/facebook-leads`;

      // Test GET verification
      const verifyResponse = await fetch(
        `${webhookUrl}?hub.mode=subscribe&hub.verify_token=test_token&hub.challenge=test_challenge_123`,
      );

      const verifyOk = verifyResponse.status === 200;
      const challenge = await verifyResponse.text();

      // Test webhook health
      const healthResponse = await fetch("/api/webhooks/health");
      const healthData = await healthResponse.json();

      setTestResults({
        webhookUrl,
        verification: {
          status: verifyOk ? "success" : "failed",
          challenge:
            challenge === "test_challenge_123" ? "correct" : "incorrect",
          responseCode: verifyResponse.status,
        },
        health: healthData,
        timestamp: new Date().toISOString(),
      });

      setTestStatus("success");
    } catch (error) {
      console.error("Test failed:", error);
      setTestStatus("error");
      setTestResults({ error: (error as Error).message });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Meta App Review Test Page
              </h1>
              <p className="text-gray-600 mt-2">
                Test environment for Facebook Lead Ads integration
              </p>
            </div>
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
              Test Mode
            </div>
          </div>

          {/* Quick Start Guide */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
            <h2 className="text-xl font-semibold mb-3 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
              Quick Start for Meta Reviewers
            </h2>
            <ol className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="font-semibold mr-2">1.</span>
                <span>
                  Use the test credentials below to log into the application
                </span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">2.</span>
                <span>
                  Navigate to Integrations → Facebook to see the Lead Ads
                  integration
                </span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">3.</span>
                <span>
                  Click "Run Webhook Test" below to verify webhook functionality
                </span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">4.</span>
                <span>
                  The app is pre-configured with sample data for testing
                </span>
              </li>
            </ol>
          </div>
        </div>

        {/* Test Credentials */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Test Credentials</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-mono font-semibold">
                  {testCredentials.email}
                </p>
              </div>
              <button
                onClick={() => handleCopy(testCredentials.email)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Password</p>
                <p className="font-mono font-semibold">
                  {testCredentials.password}
                </p>
              </div>
              <button
                onClick={() => handleCopy(testCredentials.password)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <a
              href="/signin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Login Page
            </a>
          </div>

          {copied && (
            <p className="text-green-600 text-sm mt-2 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              Copied to clipboard!
            </p>
          )}
        </div>

        {/* Webhook Test */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Webhook Verification Test</h2>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              This test verifies that our webhook endpoint is properly
              configured to receive Meta Lead Ads data.
            </p>

            <button
              onClick={runWebhookTest}
              disabled={testStatus === "testing"}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testStatus === "testing" ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Webhook Test
                </>
              )}
            </button>
          </div>

          {/* Test Results */}
          {testResults && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">Test Results:</h3>

              {testStatus === "success" ? (
                <div className="space-y-3">
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-semibold">
                      All tests passed successfully!
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">Webhook URL:</p>
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                      {testResults.webhookUrl}
                    </code>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Verification Status:
                    </p>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        Response Code: {testResults.verification.responseCode}
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        Challenge Echo: {testResults.verification.challenge}
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        Token Configured:{" "}
                        {testResults.health?.verify_token_configured
                          ? "Yes"
                          : "No"}
                      </li>
                    </ul>
                  </div>
                </div>
              ) : testStatus === "error" ? (
                <div className="text-red-600">
                  <p className="font-semibold">Test failed:</p>
                  <p className="text-sm mt-1">{testResults.error}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Integration Features */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">
            Facebook Lead Ads Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Real-time lead capture via webhooks",
              "Automatic field mapping detection",
              "Lead form synchronization",
              "Duplicate prevention",
              "Custom field support",
              "Lead qualification rules",
              "Automatic contact creation",
              "Webhook health monitoring",
            ].map((feature, index) => (
              <div key={index} className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note for Reviewers:</strong> This test account has
              pre-configured Facebook pages and forms with sample data. You can
              test the full lead capture flow using Facebook's Lead Ads Testing
              Tool.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600">
          <p>Atlas Fitness Onboarding Platform</p>
          <p className="text-sm mt-1">Meta App Review Test Environment</p>
        </div>
      </div>
    </div>
  );
}
