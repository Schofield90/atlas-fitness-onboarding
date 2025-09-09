# Onboarding Manual Test Checklist

## Environment Setup

- [ ] Verify SUPABASE_SERVICE_ROLE_KEY is set in production environment
- [ ] Verify NEXT_PUBLIC_SUPABASE_URL is set correctly
- [ ] Verify NEXT_PUBLIC_SUPABASE_ANON_KEY is set correctly
- [ ] Run database migration: `20250109_fix_claim_flow_complete.sql`
- [ ] Verify RLS policies are applied correctly

## Flow A: Gym-initiated (Claim Account)

### Test 1: Valid Token Claim

1. [ ] Create a test client in the system as gym owner
2. [ ] Generate claim token for the client
3. [ ] Copy the claim link with token
4. [ ] Open link in incognito/private browser window
5. [ ] Verify page loads without authentication errors
6. [ ] Verify email is pre-filled and disabled
7. [ ] Verify any existing client data is pre-filled
8. [ ] Enter test password (e.g., TestPass123!)
9. [ ] Verify password strength indicators work
10. [ ] Fill in required fields
11. [ ] Accept terms and conditions
12. [ ] Submit form
13. [ ] Verify success message appears
14. [ ] Verify redirect to login page
15. [ ] Try logging in with created credentials
16. [ ] Verify login succeeds

### Test 2: Invalid Token

1. [ ] Navigate to `/claim-account?token=invalid-token-xyz`
2. [ ] Verify error message appears
3. [ ] Verify "Go to Login" button is shown
4. [ ] Verify no sensitive data is exposed

### Test 3: Expired Token

1. [ ] Create token with past expiration date
2. [ ] Try to use expired token link
3. [ ] Verify "expired" error message appears
4. [ ] Verify cannot proceed with claim

### Test 4: Already Claimed Token

1. [ ] Use a token that was already claimed
2. [ ] Verify "already claimed" message appears
3. [ ] Verify link to login is provided
4. [ ] Verify cannot claim again

### Test 5: Password Validation

1. [ ] Enter weak password (less than 8 chars)
2. [ ] Verify submit button is disabled
3. [ ] Enter password without uppercase
4. [ ] Verify requirement indicator shows red
5. [ ] Enter strong password meeting all requirements
6. [ ] Verify all indicators show green
7. [ ] Verify submit button is enabled

### Test 6: Existing User

1. [ ] Create claim token for email that already has account
2. [ ] Try to claim with new password
3. [ ] Verify system handles gracefully
4. [ ] Verify can update password
5. [ ] Verify can login with new password

## Flow B: Self-serve (Join)

### Test 1: Plan Selection

1. [ ] Navigate to `/join`
2. [ ] Verify all membership plans are displayed
3. [ ] Click on each plan
4. [ ] Verify plan details are correct
5. [ ] Select a plan
6. [ ] Verify navigation to account creation step

### Test 2: Password Authentication

1. [ ] Select "Password" auth method
2. [ ] Fill email address
3. [ ] Enter matching passwords
4. [ ] Fill personal information
5. [ ] Accept terms
6. [ ] Submit form
7. [ ] Verify account creation success
8. [ ] Verify email confirmation if required
9. [ ] Try logging in

### Test 3: Magic Link Authentication

1. [ ] Select "Magic Link" auth method
2. [ ] Enter email address
3. [ ] Fill required personal info
4. [ ] Accept terms
5. [ ] Submit form
6. [ ] Verify "magic link sent" message
7. [ ] Check email for magic link
8. [ ] Click magic link
9. [ ] Verify auto-login works

### Test 4: Field Validation

1. [ ] Try submitting with empty email
2. [ ] Verify validation error
3. [ ] Try submitting with invalid email format
4. [ ] Verify validation error
5. [ ] Try submitting without accepting terms
6. [ ] Verify error message
7. [ ] Try mismatched passwords
8. [ ] Verify error message

### Test 5: Navigation

1. [ ] Start on plan selection
2. [ ] Select a plan
3. [ ] Click "Back" button
4. [ ] Verify returns to plan selection
5. [ ] Verify selected plan is highlighted
6. [ ] Complete form and navigate forward
7. [ ] Verify progress indicators update

## Security Checks

### Test 1: No Service Role Key Exposure

1. [ ] Open browser developer tools
2. [ ] Check Network tab for API calls
3. [ ] Verify no service role key in requests
4. [ ] Check page source
5. [ ] Verify no service role key in HTML
6. [ ] Check browser console
7. [ ] Verify no service role key logged

### Test 2: Rate Limiting

1. [ ] Attempt multiple failed claims rapidly
2. [ ] Verify rate limiting kicks in
3. [ ] Verify appropriate error message
4. [ ] Wait for cooldown period
5. [ ] Verify can try again after cooldown

### Test 3: Token Security

1. [ ] Try to claim token from different organization
2. [ ] Verify organization validation works
3. [ ] Try SQL injection in token parameter
4. [ ] Verify sanitization works
5. [ ] Try XSS in form fields
6. [ ] Verify inputs are escaped

## Performance Checks

### Test 1: Page Load Time

1. [ ] Measure claim page load time
2. [ ] Should load in < 2 seconds
3. [ ] Measure join page load time
4. [ ] Should load in < 2 seconds

### Test 2: Form Submission

1. [ ] Measure claim form submission time
2. [ ] Should complete in < 3 seconds
3. [ ] Measure join form submission time
4. [ ] Should complete in < 3 seconds

## Browser Compatibility

### Test 1: Modern Browsers

1. [ ] Test in Chrome (latest)
2. [ ] Test in Firefox (latest)
3. [ ] Test in Safari (latest)
4. [ ] Test in Edge (latest)

### Test 2: Mobile Browsers

1. [ ] Test on iOS Safari
2. [ ] Test on Android Chrome
3. [ ] Verify responsive design works
4. [ ] Verify touch interactions work

## Console Checks

### Test 1: No Multiple Client Warning

1. [ ] Open browser console
2. [ ] Navigate through claim flow
3. [ ] Verify no "Multiple GoTrueClient instances" warning
4. [ ] Navigate through join flow
5. [ ] Verify no warning appears

### Test 2: No Errors

1. [ ] Complete entire claim flow
2. [ ] Verify no JavaScript errors in console
3. [ ] Complete entire join flow
4. [ ] Verify no JavaScript errors in console

## Database Checks

### Test 1: Token Claimed

1. [ ] After successful claim, check database
2. [ ] Verify token claimed_at is set
3. [ ] Verify cannot reuse token

### Test 2: Client Updated

1. [ ] After claim, check clients table
2. [ ] Verify user_id is set
3. [ ] Verify is_claimed is true
4. [ ] Verify personal info is updated

### Test 3: Activity Logged

1. [ ] Check activity_logs table
2. [ ] Verify claim attempt is logged
3. [ ] Verify success/failure is recorded

## Email Notifications

### Test 1: Claim Email

1. [ ] Verify claim email is sent to gym owner
2. [ ] Verify email contains correct claim link
3. [ ] Verify link works when clicked

### Test 2: Welcome Email

1. [ ] Verify welcome email sent after claim
2. [ ] Verify email contains correct information
3. [ ] Verify any links in email work

---

## Sign-off

- [ ] All tests passed
- [ ] No security issues found
- [ ] Performance acceptable
- [ ] Compatible with target browsers
- [ ] Ready for production

Tested by: ******\_\_\_******
Date: ******\_\_\_******
Environment: ******\_\_\_******
