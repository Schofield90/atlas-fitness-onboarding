#!/bin/bash

# List of files to fix
files=(
  "app/api/webhooks/stripe/route.ts"
  "app/api/saas/portal/route.ts"
  "app/api/saas/checkout/route.ts"
  "app/api/saas/billing/route.ts"
  "app/api/payments/create-intent/route.ts"
)

# For each file, replace the Stripe initialization
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    sed -i '' 's/const stripe = new Stripe(process\.env\.STRIPE_SECRET_KEY!, {/const stripeKey = process.env.STRIPE_SECRET_KEY\
const stripe = stripeKey ? new Stripe(stripeKey, {/g' "$file"
    sed -i '' 's/});/}) : null;/g' "$file"
  fi
done

echo "Done!"