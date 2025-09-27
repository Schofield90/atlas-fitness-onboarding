# Vercel Environment Variables to Update

## IMPORTANT: Update these in Vercel Dashboard

Go to your Vercel project settings and update the following environment variables:

### Production Environment Variables

1. **NEXT_PUBLIC_SITE_URL**
   - Current: `https://atlas-fitness-onboarding.vercel.app`
   - Update to: `https://members.gymleadhub.co.uk`
   - Description: Used for generating member claim links

2. **NEXT_PUBLIC_URL** (if different from SITE_URL)
   - Current: `https://atlas-fitness-onboarding.vercel.app`
   - Consider updating to: `https://members.gymleadhub.co.uk`
   - Description: General public URL reference

3. **NEXTAUTH_URL**
   - Current: `https://atlas-fitness-onboarding.vercel.app`
   - Update to: `https://login.gymleadhub.co.uk`
   - Description: Authentication callback URL

4. **NEXT_PUBLIC_STRIPE_CONNECT_REDIRECT_URI**
   - Current: `https://atlas-fitness-onboarding.vercel.app/api/stripe/connect/callback`
   - Update to: `https://login.gymleadhub.co.uk/api/stripe/connect/callback`
   - Description: Stripe Connect OAuth callback

## How to Update

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `atlas-fitness-onboarding` project
3. Go to Settings → Environment Variables
4. Update each variable listed above
5. Redeploy for changes to take effect

## Verification

After updating and redeploying, test the claim link generation:

1. Go to Members page
2. Click on an unclaimed member
3. Generate claim link
4. Verify it shows `https://members.gymleadhub.co.uk/claim/...`

## Note

The local `.env.local` file has been updated, but production uses Vercel's environment variables which must be updated through the dashboard.
