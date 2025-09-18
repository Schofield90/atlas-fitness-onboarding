#!/bin/bash

# Fix all report pages to wrap useSearchParams in Suspense boundary

echo "Fixing Suspense boundary issues in report pages..."

# List of report pages that need fixing
PAGES=(
  "app/reports/attendances/page.tsx"
  "app/reports/discount-codes/page.tsx"
  "app/reports/invoice-items/page.tsx"
  "app/reports/invoices/page.tsx"
  "app/reports/payouts/page.tsx"
  "app/reports/pending/page.tsx"
  "app/reports/upcoming-billing/page.tsx"
)

for PAGE in "${PAGES[@]}"; do
  echo "Processing $PAGE..."

  # Create a temporary file with the wrapped component
  cat > "${PAGE}.tmp" << 'EOF'
"use client";

import { Suspense } from "react";
import ReportPageContent from "./content";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mb-4 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading report...</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReportPageContent />
    </Suspense>
  );
}
EOF

  # Move the original content to a content.tsx file
  CONTENT_FILE="${PAGE%.tsx}/content.tsx"
  mkdir -p "$(dirname "$CONTENT_FILE")"
  mv "$PAGE" "$CONTENT_FILE"

  # Move the wrapper to the page file
  mv "${PAGE}.tmp" "$PAGE"

  # Update the content file to export as default
  sed -i '' '1s/^"use client";/"use client";\n\n\/\/ This component is wrapped in Suspense by page.tsx/' "$CONTENT_FILE"
  sed -i '' 's/export default function [A-Za-z]*Page/export default function ReportPageContent/' "$CONTENT_FILE"

  echo "✓ Fixed $PAGE"
done

echo "All report pages have been fixed with Suspense boundaries!"