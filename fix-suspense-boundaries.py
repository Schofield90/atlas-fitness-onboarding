#!/usr/bin/env python3

import os
import re

# List of files to fix with their function names
FILES_TO_FIX = [
    ("app/reports/attendances/page.tsx", "AttendancesReportPage"),
    ("app/reports/discount-codes/page.tsx", "DiscountCodesReportPage"),
    ("app/reports/invoice-items/page.tsx", "InvoiceItemsPage"),
    ("app/reports/invoices/page.tsx", "InvoicesReportPage"),
    ("app/reports/payouts/page.tsx", "PayoutsReportPage"),
    ("app/reports/pending/page.tsx", "PendingPaymentsPage"),
    ("app/reports/upcoming-billing/page.tsx", "UpcomingBillingPage"),
]

def fix_page(file_path, func_name):
    """Fix a single page file by wrapping content in Suspense."""
    print(f"Fixing {file_path}...")

    with open(file_path, 'r') as f:
        content = f.read()

    # Add Suspense import if not already there
    if 'import { Suspense }' not in content and 'import {Suspense}' not in content:
        # Find the first import from "react"
        react_import = re.search(r'import \{([^}]+)\} from ["\']react["\'];', content)
        if react_import:
            imports = react_import.group(1)
            if 'Suspense' not in imports:
                new_imports = imports + ', Suspense'
                content = content.replace(
                    f'import {{{imports}}} from',
                    f'import {{{new_imports}}} from'
                )
        else:
            # Add Suspense import after "use client"
            content = content.replace(
                '"use client";',
                '"use client";\n\nimport { Suspense } from "react";'
            )

    # Find the function and rename it
    old_func_pattern = f'export default function {func_name}\\(\\)'
    new_func_name = f'{func_name}Content'
    content = re.sub(old_func_pattern, f'function {new_func_name}()', content)

    # Add the wrapper function at the end
    wrapper_function = f'''
export default function {func_name}() {{
  return (
    <Suspense
      fallback={{
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mb-4 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading report...</p>
          </div>
        </div>
      }}
    >
      <{new_func_name} />
    </Suspense>
  );
}}'''

    content = content.rstrip() + wrapper_function

    with open(file_path, 'w') as f:
        f.write(content)

    print(f"✓ Fixed {file_path}")

def main():
    print("Fixing Suspense boundary issues in report pages...")
    print("-" * 50)

    for file_path, func_name in FILES_TO_FIX:
        if os.path.exists(file_path):
            try:
                fix_page(file_path, func_name)
            except Exception as e:
                print(f"✗ Error fixing {file_path}: {e}")
        else:
            print(f"✗ File not found: {file_path}")

    print("-" * 50)
    print("All report pages have been fixed with Suspense boundaries!")

if __name__ == "__main__":
    main()