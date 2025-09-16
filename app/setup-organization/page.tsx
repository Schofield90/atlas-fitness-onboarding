"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/Card";

export default function SetupOrganizationPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const setupOrganization = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/setup/add-organization-member", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to setup organization");
      }

      setMessage(
        `Success! ${data.message}. Organization ID: ${data.organizationId}. You can now use the import feature.`,
      );
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Setup Organization Membership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Click the button below to set up your organization membership. This
            will allow you to use the import feature and other
            organization-specific features.
          </p>

          <Button
            onClick={setupOrganization}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Setting up..." : "Setup Organization Membership"}
          </Button>

          {message && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800">{message}</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800 font-semibold mb-2">After setup:</p>
            <ol className="list-decimal list-inside text-blue-700 space-y-1">
              <li>Go to the Dashboard → Import</li>
              <li>Upload your GoTeamUp CSV files</li>
              <li>The system will auto-detect payment vs attendance files</li>
              <li>Review and import your data</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
