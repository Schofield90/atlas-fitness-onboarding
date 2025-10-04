"use client";

import { useState } from "react";
import {
  Download,
  Users,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import SettingsHeader from "@/app/components/settings/SettingsHeader";

interface ImportStats {
  customers: { total: number; imported: number; skipped: number };
  paymentMethods: { total: number; linked: number };
  subscriptions: { total: number; active: number };
}

export default function StripeImportPage() {
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [updateOnly, setUpdateOnly] = useState(true); // Default to update-only mode

  const handleImport = async () => {
    setImporting(true);
    setError("");
    setProgress(0);

    try {
      // Get organization ID from API
      const orgResponse = await fetch("/api/auth/get-organization");
      const orgData = await orgResponse.json();

      if (!orgData.data?.organizationId) {
        throw new Error("No organization found");
      }

      const organizationId = orgData.data.organizationId;

      // Step 1: Import customers in batches (0-33%)
      // For testing: Set limit to 5 to quickly test the import flow
      const CUSTOMER_LIMIT = 5; // Change to 50 for production

      let totalCustomers = { total: 0, imported: 0, skipped: 0 };
      let hasMoreCustomers = true;
      let customerStartingAfter: string | undefined = undefined;

      while (hasMoreCustomers) {
        const customersResponse = await fetch(
          "/api/gym/stripe-connect/import/customers",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organizationId,
              startingAfter: customerStartingAfter,
              limit: CUSTOMER_LIMIT,
              updateOnly,
            }),
          },
        );

        if (!customersResponse.ok) {
          const error = await customersResponse.json();
          throw new Error(error.error || "Failed to import customers");
        }

        const customersData = await customersResponse.json();
        totalCustomers.total += customersData.stats.total;
        totalCustomers.imported += customersData.stats.imported;
        totalCustomers.skipped += customersData.stats.skipped;

        hasMoreCustomers = customersData.stats.hasMore;
        customerStartingAfter = customersData.stats.nextStartingAfter;

        // For testing: Stop after first batch
        if (CUSTOMER_LIMIT === 5) hasMoreCustomers = false;

        // Update progress within the 0-33% range
        if (!hasMoreCustomers) setProgress(33);
      }

      // Step 2: Link payment methods in batches (33-66%)
      const PAYMENT_METHOD_BATCH_SIZE = CUSTOMER_LIMIT === 5 ? 5 : 50;

      let totalPaymentMethods = { total: 0, linked: 0 };
      let hasMorePaymentMethods = true;
      let paymentMethodOffset = 0;

      while (hasMorePaymentMethods) {
        const paymentMethodsResponse = await fetch(
          "/api/gym/stripe-connect/import/payment-methods",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organizationId,
              offset: paymentMethodOffset,
              batchSize: PAYMENT_METHOD_BATCH_SIZE,
            }),
          },
        );

        if (!paymentMethodsResponse.ok) {
          const error = await paymentMethodsResponse.json();
          throw new Error(error.error || "Failed to import payment methods");
        }

        const paymentMethodsData = await paymentMethodsResponse.json();
        totalPaymentMethods.total += paymentMethodsData.stats.total;
        totalPaymentMethods.linked += paymentMethodsData.stats.linked;

        hasMorePaymentMethods = paymentMethodsData.stats.hasMore;
        paymentMethodOffset = paymentMethodsData.stats.nextOffset || 0;

        // For testing: Stop after first batch
        if (CUSTOMER_LIMIT === 5) hasMorePaymentMethods = false;

        if (!hasMorePaymentMethods) setProgress(66);
      }

      // Step 3: Sync subscriptions (66-100%)
      setProgress(80);
      const subscriptionsResponse = await fetch(
        "/api/gym/stripe-connect/import/subscriptions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId,
          }),
        },
      );

      if (!subscriptionsResponse.ok) {
        const error = await subscriptionsResponse.json();
        throw new Error(error.error || "Failed to import subscriptions");
      }

      const subscriptionsData = await subscriptionsResponse.json();
      setProgress(100);

      // Combine stats
      setImportStats({
        customers: totalCustomers,
        paymentMethods: totalPaymentMethods,
        subscriptions: subscriptionsData.stats,
      });
    } catch (err: any) {
      console.error("Import error:", err);
      setError(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link
        href="/settings/integrations/payments"
        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Payment Settings
      </Link>

      <SettingsHeader
        title="Import Stripe Data"
        description="Import your existing customers, payment methods, and subscriptions from Stripe"
      />

      <div className="mt-6 space-y-6">
        {/* What will be imported */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            What will be imported?
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Customers</p>
                <p className="text-sm text-gray-400">
                  All Stripe customers will be imported as clients in your CRM.
                  Existing clients with matching emails will be updated.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Payment Methods</p>
                <p className="text-sm text-gray-400">
                  Customer payment methods (cards, bank accounts) will be
                  linked. Customers won't need to re-enter their details.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Subscriptions</p>
                <p className="text-sm text-gray-400">
                  Active subscriptions will be synced. Recurring payments will
                  continue without interruption.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Important notes */}
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-400 mb-2">
                Before you import:
              </p>
              <ul className="text-sm text-yellow-200 space-y-1 list-disc list-inside">
                <li>This process is safe and non-destructive</li>
                <li>Existing payments will continue without interruption</li>
                <li>You can run this import multiple times to sync new data</li>
                <li>The import may take a few minutes for large datasets</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Import options */}
        {!importStats && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Import Mode
            </h3>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={updateOnly}
                onChange={(e) => setUpdateOnly(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <div>
                <p className="font-medium text-white">
                  Update existing clients only (Recommended)
                </p>
                <p className="text-sm text-gray-400">
                  Only add Stripe data to clients already in your CRM. Skip
                  creating new client records for Stripe customers not in your
                  system.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Import button */}
        {!importStats && (
          <div className="flex justify-center">
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg font-medium"
            >
              {importing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Importing... {progress}%
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Start Import
                </>
              )}
            </button>
          </div>
        )}

        {/* Progress bar */}
        {importing && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2 text-center">
              {progress < 33 && "Importing customers..."}
              {progress >= 33 && progress < 66 && "Linking payment methods..."}
              {progress >= 66 && progress < 100 && "Syncing subscriptions..."}
              {progress === 100 && "Finalizing..."}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-400">Import failed</p>
                <p className="text-sm text-red-200 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Import results */}
        {importStats && (
          <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold text-white">
                Import Complete!
              </h3>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <Users className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-sm text-gray-400">Customers</p>
                <p className="text-2xl font-bold text-white">
                  {importStats.customers.imported}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {importStats.customers.total} total,{" "}
                  {importStats.customers.skipped} skipped
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <CreditCard className="w-5 h-5 text-green-400 mb-2" />
                <p className="text-sm text-gray-400">Payment Methods</p>
                <p className="text-2xl font-bold text-white">
                  {importStats.paymentMethods.linked}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {importStats.paymentMethods.total} total
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <Download className="w-5 h-5 text-purple-400 mb-2" />
                <p className="text-sm text-gray-400">Subscriptions</p>
                <p className="text-2xl font-bold text-white">
                  {importStats.subscriptions.active}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {importStats.subscriptions.total} total
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Link
                href="/customers"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
              >
                View Customers
              </Link>
              <button
                onClick={() => setImportStats(null)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Import Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
