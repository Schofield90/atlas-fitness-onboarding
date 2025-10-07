"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  customers?: { total: number; imported: number; skipped: number };
  paymentMethods?: { total: number; linked: number };
  subscriptions?: { total: number; active: number };
  payments?: { total: number; imported: number };
  memberships?: { total: number; created: number };
  plans?: { total: number; created: number };
}

function ImportPageContent() {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider") || "stripe"; // Default to stripe
  const isGoCardless = provider === "gocardless";
  const providerName = isGoCardless ? "GoCardless" : "Stripe";

  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [updateOnly, setUpdateOnly] = useState(true); // Default to update-only mode (Stripe only)
  const [backfilling, setBackfilling] = useState(false);
  const [backfillStats, setBackfillStats] = useState<any>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvStats, setCsvStats] = useState<any>(null);

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
      const TEST_MODE = false; // Full import enabled

      if (isGoCardless) {
        // GoCardless import flow
        // Step 1: Import subscriptions (auto-creates plans + assigns members) (0-50%)
        setProgress(10);
        const subscriptionsResponse = await fetch(
          "/api/gym/gocardless/import/subscriptions",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organizationId,
              limit: TEST_MODE ? 5 : 500,
            }),
          },
        );

        if (!subscriptionsResponse.ok) {
          const error = await subscriptionsResponse.json();
          throw new Error(
            error.error || "Failed to import GoCardless subscriptions",
          );
        }

        const subscriptionsData = await subscriptionsResponse.json();
        setProgress(50);

        // Show warnings/debug info
        if (subscriptionsData.warning) {
          console.warn(
            "GoCardless subscription warning:",
            subscriptionsData.warning,
          );
        }
        if (subscriptionsData.debug) {
          console.log(
            "GoCardless subscription debug:",
            subscriptionsData.debug,
          );
        }

        // Step 2: Import payments (historical data) (50-100%)
        setProgress(60);
        const paymentsResponse = await fetch(
          "/api/gym/gocardless/import/payments",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organizationId,
              limit: TEST_MODE ? 5 : 100,
            }),
          },
        );

        if (!paymentsResponse.ok) {
          const error = await paymentsResponse.json();
          throw new Error(
            error.error || "Failed to import GoCardless payments",
          );
        }

        const paymentsData = await paymentsResponse.json();
        setProgress(100);

        // Set combined stats
        setImportStats({
          subscriptions: subscriptionsData.stats,
          payments: paymentsData.stats,
          memberships: {
            total: subscriptionsData.stats.membershipsCreated || 0,
            created: subscriptionsData.stats.membershipsCreated || 0,
          },
          plans: {
            total: subscriptionsData.stats.plansCreated || 0,
            created: subscriptionsData.stats.plansCreated || 0,
          },
        });
        return;
      }

      // Stripe import flow (original code)
      // Step 1: Import customers in batches (0-25%)
      const CUSTOMER_LIMIT = TEST_MODE ? 5 : 100; // Import 5 for testing, 100 for production

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

        // Update progress within the 0-25% range
        if (!hasMoreCustomers) setProgress(25);
      }

      // Step 2: Import payment history/charges in batches (25-50%)
      const CHARGE_LIMIT = TEST_MODE ? 5 : 100;

      let totalCharges = { total: 0, imported: 0, skipped: 0 };
      let hasMoreCharges = true;
      let chargeStartingAfter: string | undefined = undefined;

      while (hasMoreCharges) {
        const chargesResponse = await fetch(
          "/api/gym/stripe-connect/import/charges",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organizationId,
              startingAfter: chargeStartingAfter,
              limit: CHARGE_LIMIT,
            }),
          },
        );

        if (!chargesResponse.ok) {
          const error = await chargesResponse.json();
          throw new Error(error.error || "Failed to import payment history");
        }

        const chargesData = await chargesResponse.json();
        totalCharges.total += chargesData.stats.total;
        totalCharges.imported += chargesData.stats.imported;
        totalCharges.skipped += chargesData.stats.skipped;

        hasMoreCharges = chargesData.stats.hasMore;
        chargeStartingAfter = chargesData.stats.nextStartingAfter;

        // Update progress within the 25-50% range
        if (!hasMoreCharges) setProgress(50);
      }

      // Step 3: Link payment methods in batches (50-75%)
      const PAYMENT_METHOD_BATCH_SIZE = TEST_MODE ? 5 : 100;

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

        if (!hasMorePaymentMethods) setProgress(75);
      }

      // Step 4: Sync subscriptions (75-100%)
      setProgress(85);
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

      // Show warning if no subscriptions imported
      if (subscriptionsData.warning) {
        console.warn("Subscription import warning:", subscriptionsData.warning);
      }
      if (subscriptionsData.debug) {
        console.log("Subscription import debug:", subscriptionsData.debug);
      }

      // Combine stats
      setImportStats({
        customers: totalCustomers,
        payments: totalCharges,
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

  const handleBackfill = async () => {
    setBackfilling(true);
    setError("");
    setBackfillStats(null);

    try {
      // Get organization ID from API
      const orgResponse = await fetch("/api/auth/get-organization");
      const orgData = await orgResponse.json();

      if (!orgData.data?.organizationId) {
        throw new Error("No organization found");
      }

      const organizationId = orgData.data.organizationId;

      // Call re-import endpoint (deletes broken payments and re-imports with customer links)
      const response = await fetch("/api/gym/gocardless/reimport-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to re-import payments");
      }

      const data = await response.json();
      setBackfillStats(data.stats);

      // Show errors if any
      if (data.errors && data.errors.length > 0) {
        console.error("Backfill errors:", data.errors);
      }
    } catch (err: any) {
      console.error("Backfill error:", err);
      setError(err.message || "Backfill failed");
    } finally {
      setBackfilling(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      setError("Please select a CSV file");
      return;
    }

    setCsvImporting(true);
    setError("");
    setCsvStats(null);

    try {
      // Get organization ID from API
      const orgResponse = await fetch("/api/auth/get-organization");
      const orgData = await orgResponse.json();

      if (!orgData.data?.organizationId) {
        throw new Error("No organization found");
      }

      const organizationId = orgData.data.organizationId;

      // Upload CSV file
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("organizationId", organizationId);

      const response = await fetch("/api/gym/gocardless/import-csv", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "CSV import failed");
      }

      const data = await response.json();
      setCsvStats(data.stats);

      // Show errors if any
      if (data.errors && data.errors.length > 0) {
        console.error("CSV import errors:", data.errors);
      }
    } catch (err: any) {
      console.error("CSV import error:", err);
      setError(err.message || "CSV import failed");
    } finally {
      setCsvImporting(false);
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
        title={`Import ${providerName} Data`}
        description={
          isGoCardless
            ? "Import your existing customers, direct debits, and subscriptions from GoCardless"
            : "Import your existing customers, payment methods, and subscriptions from Stripe"
        }
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
                  All {isGoCardless ? "GoCardless" : "Stripe"} customers will be
                  imported as clients in your CRM. Existing clients with
                  matching emails will be updated.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Payment History</p>
                <p className="text-sm text-gray-400">
                  All successful payments will be imported and linked to
                  clients. Payment history will appear in member profiles.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Payment Methods</p>
                <p className="text-sm text-gray-400">
                  Customer payment methods (cards, bank accounts) will be
                  linked. Customers won't need to re-enter their details.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
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

        {/* Import options - Stripe only */}
        {!importStats && !isGoCardless && (
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

        {/* Import button - Stripe only (GoCardless uses CSV import) */}
        {!importStats && !isGoCardless && (
          <div className="flex flex-col gap-4">
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
          </div>
        )}

        {/* CSV Import for GoCardless - Primary Method */}
        {isGoCardless && !importStats && (
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-blue-600/30">
            <div className="flex items-start gap-3 mb-4">
              <Download className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-white mb-2">
                  Import from CSV File
                </h4>
                <p className="text-sm text-gray-400">
                  Upload a CSV export from your GoCardless dashboard. This
                  includes full payment history with customer details.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCsvFile(file);
                      setError("");
                    }
                  }}
                  disabled={csvImporting || importing}
                  className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer disabled:opacity-50"
                />
                {csvFile && (
                  <p className="mt-2 text-sm text-gray-400">
                    Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(2)}{" "}
                    KB)
                  </p>
                )}
              </div>

              <button
                onClick={handleCsvImport}
                disabled={!csvFile || csvImporting || importing}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {csvImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing CSV...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Import from CSV
                  </>
                )}
              </button>

              {/* CSV Import results */}
              {csvStats && (
                <div className="mt-4 p-4 bg-green-900/20 border border-green-600/30 rounded-lg">
                  <p className="text-green-400 font-medium mb-2">
                    ✓ CSV Import Complete!
                  </p>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>• {csvStats.imported || 0} new payments imported</p>
                    <p>• {csvStats.updated || 0} existing payments updated</p>
                    <p>• {csvStats.clientsCreated || 0} new clients created</p>
                    <p className="text-gray-400">
                      • {csvStats.skipped || 0} payments skipped
                    </p>
                    {csvStats.errors > 0 && (
                      <p className="text-yellow-400">
                        • {csvStats.errors} errors (check console for details)
                      </p>
                    )}
                  </div>
                  <Link
                    href="/members"
                    className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300"
                  >
                    View imported members →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Backfill button for GoCardless - Secondary Method */}
        {isGoCardless && !importStats && (
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-yellow-600/30">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-white mb-2">
                  Fix Unlinked Payments (Delete & Re-import)
                </h4>
                <p className="text-sm text-gray-400">
                  Payments not showing in member profiles were imported without
                  customer data. This will{" "}
                  <strong>delete the broken payments</strong> and re-import them
                  from GoCardless with proper customer links.
                </p>
              </div>
            </div>
            <button
              onClick={handleBackfill}
              disabled={backfilling || importing}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {backfilling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Linking Payments...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Fix Unlinked Payments
                </>
              )}
            </button>

            {/* Backfill results */}
            {backfillStats && (
              <div className="mt-4 p-4 bg-green-900/20 border border-green-600/30 rounded-lg">
                <p className="text-green-400 font-medium mb-2">
                  ✓ Re-import Complete!
                </p>
                <div className="text-sm text-gray-300 space-y-1">
                  <p>• {backfillStats.deleted || 0} broken payments deleted</p>
                  <p>
                    • {backfillStats.imported || 0} payments re-imported with
                    customer links
                  </p>
                  <p>
                    • {backfillStats.clientsCreated || 0} new clients created
                  </p>
                  {backfillStats.skipped > 0 && (
                    <p className="text-yellow-400">
                      • {backfillStats.skipped} payments skipped (no customer
                      data in GoCardless)
                    </p>
                  )}
                </div>
              </div>
            )}
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
              {progress < 25 && "Importing customers..."}
              {progress >= 25 &&
                progress < 50 &&
                "Importing payment history..."}
              {progress >= 50 && progress < 75 && "Linking payment methods..."}
              {progress >= 75 && progress < 100 && "Syncing subscriptions..."}
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
              {isGoCardless ? (
                <>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <Download className="w-5 h-5 text-purple-400 mb-2" />
                    <p className="text-sm text-gray-400">Subscriptions</p>
                    <p className="text-2xl font-bold text-white">
                      {importStats.subscriptions?.active || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {importStats.subscriptions?.total || 0} total
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <CreditCard className="w-5 h-5 text-green-400 mb-2" />
                    <p className="text-sm text-gray-400">Payments</p>
                    <p className="text-2xl font-bold text-white">
                      {importStats.payments?.imported || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {importStats.payments?.total || 0} total,{" "}
                      {importStats.payments?.skipped || 0} skipped
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <Users className="w-5 h-5 text-blue-400 mb-2" />
                    <p className="text-sm text-gray-400">Plans & Memberships</p>
                    <p className="text-2xl font-bold text-white">
                      {importStats.plans?.created || 0} plans
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {importStats.memberships?.created || 0} memberships
                      assigned
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <Users className="w-5 h-5 text-blue-400 mb-2" />
                    <p className="text-sm text-gray-400">Customers</p>
                    <p className="text-2xl font-bold text-white">
                      {importStats.customers?.imported || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {importStats.customers?.total || 0} total,{" "}
                      {importStats.customers?.skipped || 0} skipped
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <CreditCard className="w-5 h-5 text-green-400 mb-2" />
                    <p className="text-sm text-gray-400">Payment History</p>
                    <p className="text-2xl font-bold text-white">
                      {importStats.payments?.imported || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {importStats.payments?.total || 0} total,{" "}
                      {importStats.payments?.skipped || 0} skipped
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <Download className="w-5 h-5 text-purple-400 mb-2" />
                    <p className="text-sm text-gray-400">Payment Methods</p>
                    <p className="text-2xl font-bold text-white">
                      {importStats.paymentMethods?.linked || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {importStats.paymentMethods?.total || 0} total
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <CreditCard className="w-5 h-5 text-blue-400 mb-2" />
                    <p className="text-sm text-gray-400">Subscriptions</p>
                    <p className="text-2xl font-bold text-white">
                      {importStats.subscriptions?.active || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {importStats.subscriptions?.total || 0} total
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <Link
                href="/members"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
              >
                View Members
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

export default function PaymentImportPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ImportPageContent />
    </Suspense>
  );
}
