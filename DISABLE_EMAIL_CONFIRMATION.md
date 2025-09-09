# Fix Login After Account Claim

The account is being created successfully, but users can't log in immediately because Supabase requires email confirmation by default.

## Solution: Disable Email Confirmation

Since you're already validating users through the claim token system, you don't need Supabase's email confirmation.

### Steps to Fix:

1. **Go to your Supabase Dashboard**
2. Navigate to **Authentication** → **Providers** → **Email**
3. Find the setting **"Confirm email"**
4. **Turn it OFF** (uncheck it)
5. Save the changes

### Why This Is Still Secure:

- Users can only create accounts with a valid claim token
- Tokens are only sent by gym owners to verified client emails
- Each token can only be used once and expires after 72 hours
- The email is already validated through your token system

### Alternative: Keep Email Confirmation Enabled

If you prefer to keep email confirmation enabled for extra security:

1. Users will need to check their email after claiming their account
2. They'll receive a confirmation email from Supabase
3. After clicking the confirmation link, they can log in
4. The claim process will show a message explaining this

### Current Behavior:

- With confirmation **enabled**: User creates account → Must confirm email → Then can log in
- With confirmation **disabled**: User creates account → Can log in immediately

## Recommendation

**Disable email confirmation** since you're already validating emails through the token system. This provides a smoother user experience without compromising security.
