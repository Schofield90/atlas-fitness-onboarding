"use client";

import { useState } from "react";
import { Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function GoTeamUpMembershipImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please select a CSV file");
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      // Get organization ID from auth or context
      // For now, hardcode - you can update this based on your auth system
      const organizationId = "ee1206d7-62fb-49cf-9f39-95b9c54423a4";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("organizationId", organizationId);

      const response = await fetch("/api/import/goteamup-memberships", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult(data);
    } catch (err: any) {
      console.error("Import error:", err);
      setError(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            GoTeamUp Membership Import
          </h1>
          <p className="text-gray-400">
            Import active memberships from your GoTeamUp customer export CSV
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Instructions
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
            <li>
              Export your customer list from GoTeamUp as CSV (should include
              "Active Memberships" and "Last Payment Amount" columns)
            </li>
            <li>Make sure clients are already imported into the system</li>
            <li>Upload the CSV file below</li>
            <li>Click "Import Memberships" to create plans and assign members</li>
          </ol>
        </div>

        {/* File Upload */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <label className="block mb-4">
            <span className="text-sm font-medium mb-2 block">
              Select GoTeamUp Customer CSV
            </span>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-orange-600 file:text-white
                  hover:file:bg-orange-700
                  file:cursor-pointer cursor-pointer"
              />
            </div>
          </label>

          {file && (
            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-300">
                Selected: <span className="font-medium">{file.name}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600
              disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium
              transition-colors flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Import Memberships
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-400 mb-1">Import Failed</h3>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Result */}
        {result && result.success && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-400 text-lg mb-1">
                  Import Successful!
                </h3>
                <p className="text-sm text-green-300">{result.message}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Total Records</p>
                <p className="text-2xl font-bold">{result.stats.totalRecords}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Plans Created</p>
                <p className="text-2xl font-bold text-green-400">
                  {result.stats.plansCreated}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Memberships Created</p>
                <p className="text-2xl font-bold text-green-400">
                  {result.stats.membershipsCreated}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Memberships Updated</p>
                <p className="text-2xl font-bold text-blue-400">
                  {result.stats.membershipsUpdated}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Skipped (No Membership)</p>
                <p className="text-2xl font-bold text-gray-400">
                  {result.stats.skippedNoMembership}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Clients Not Found</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {result.stats.clientsNotFound}
                </p>
              </div>
            </div>

            {/* Failures */}
            {result.failures && result.failures.length > 0 && (
              <div className="mt-4 bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-400 mb-2">
                  {result.stats.failures} Failures
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {result.failures.map((failure: any, idx: number) => (
                    <div
                      key={idx}
                      className="text-sm bg-gray-800 rounded p-2"
                    >
                      <p className="font-medium">{failure.email}</p>
                      <p className="text-gray-400 text-xs">
                        {failure.membership} - {failure.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h4 className="font-semibold mb-2">Next Steps:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                <li>
                  <a
                    href="/memberships"
                    className="text-orange-400 hover:text-orange-300"
                  >
                    View created membership plans
                  </a>
                </li>
                <li>
                  <a
                    href="/customers"
                    className="text-orange-400 hover:text-orange-300"
                  >
                    Check client memberships
                  </a>
                </li>
                {result.stats.clientsNotFound > 0 && (
                  <li className="text-yellow-400">
                    Import missing clients first, then re-run this import
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
