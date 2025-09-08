# Enable Public Signups in Supabase

To allow gym members to claim their accounts, you need to enable public signups in Supabase:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Under **Email** provider, make sure:
   - **Enable Email provider** is ON
   - **Enable email signup** is ON (this is crucial!)
   - **Confirm email** can be OFF (since we're validating via token)

4. Also check **Authentication** → **Settings**:
   - Under **Auth Settings**, ensure signups are not disabled
   - You can leave email confirmations optional since we validate via the claim token

## Why This Is Secure

Even though public signups are enabled:

1. Users can only claim accounts if they have a valid token
2. Tokens are only sent to verified client emails by gym owners
3. Tokens expire after 72 hours
4. Each token can only be used once
5. The token must match a specific client record

## Alternative Approach (if you want signups disabled)

If you prefer to keep public signups disabled for security, we would need to:

1. Create a secure backend service with the service role key
2. Use Edge Functions or a separate API service
3. Never expose the service role key in client-facing code

The current approach (enabling signups) is simpler and still secure due to the token validation.
