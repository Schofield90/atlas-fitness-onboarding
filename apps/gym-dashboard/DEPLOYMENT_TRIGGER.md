# Trigger rebuild Wed 1 Oct 2025 12:30:00 BST - Fix staff view bookings

# Trigger rebuild Wed 1 Oct 2025 12:45:00 BST - Update booking queries

# Trigger rebuild Wed 1 Oct 2025 16:17:00 BST - Fix staff view member bookings with org_staff fallback

# Trigger rebuild Wed 2 Oct 2025 07:18:00 BST - Fix staff messaging with org_staff table support

# Trigger rebuild Wed 2 Oct 2025 07:25:00 BST - Remove user_id from messages schema

# Trigger rebuild Wed 2 Oct 2025 07:36:00 BST - Add content column (NOT NULL)

# Trigger rebuild Wed 2 Oct 2025 07:40:00 BST - Fix sender_type check constraint (coach not gym)

# Trigger rebuild Wed 2 Oct 2025 07:45:00 BST - Fix conversations page loading (org_staff fallback)

# Trigger rebuild Wed 2 Oct 2025 07:50:00 BST - Fix UnifiedMessaging leads query (organization_id not org_id)

# Trigger rebuild Wed 2 Oct 2025 07:55:00 BST - Add debug logging to UnifiedMessaging

# Trigger rebuild Wed 2 Oct 2025 08:00:00 BST - Fix UnifiedMessaging useEffect with userData guard

# Trigger rebuild Wed 2 Oct 2025 08:10:00 BST - Add comprehensive debug logging to conversations page

# Trigger rebuild Wed 2 Oct 2025 12:50:00 BST - FIX: Use getSession + API fallback for userData loading

# Trigger rebuild Wed 2 Oct 2025 13:00:00 BST - FIX: Use /api/auth/get-organization endpoint (working endpoint)

Trigger deployment Fri 3 Oct 2025 11:56:01 BST
Trigger deployment Fri 3 Oct 2025 12:05:23 BST
Trigger deployment Fri 3 Oct 2025 12:09:56 BST
Trigger deployment Fri 3 Oct 2025 12:16:24 BST
Trigger deployment Fri 3 Oct 2025 12:23:40 BST
Trigger deployment Fri 3 Oct 2025 12:43:06 BST
Trigger deployment Fri 3 Oct 2025 12:56:14 BST
Trigger deployment Fri 3 Oct 2025 13:01:28 BST
Trigger deployment Fri 3 Oct 2025 14:11:01 BST
Trigger deployment Fri 3 Oct 2025 14:25:33 BST - Simplified Stripe connection UI with dual options
Trigger deployment Fri 3 Oct 2025 14:32:18 BST - Force cache refresh for Stripe UI
Trigger deployment Fri 3 Oct 2025 14:45:00 BST - Add step to create NEW secret key with full access
Trigger deployment Fri 3 Oct 2025 14:50:00 BST - Clarify NOT to select 3rd party (standard key only)
Trigger deployment Fri 3 Oct 2025 14:55:00 BST - Add reassurance about Stripe full access warning
Trigger deployment Fri 3 Oct 2025 15:00:00 BST - Add detailed error logging for connection failures
Trigger deployment Fri 3 Oct 2025 15:05:00 BST - Fix JSON parsing error by checking response body first
Trigger deployment Fri 3 Oct 2025 15:10:00 BST - Force redeploy to register connect-existing route
Trigger deployment Fri 3 Oct 2025 15:15:00 BST - Remove ignoreCommand to force full rebuild
Trigger deployment Fri 3 Oct 2025 15:25:00 BST - Move connect-existing to SHARED /app directory
Trigger deployment Fri 3 Oct 2025 15:30:00 BST - Remove Payment Settings section from Stripe integration
Trigger deployment Fri 3 Oct 2025 17:45:00 BST - Force rebuild with fixed Stripe routes
Stripe import fix deployed at Fri 3 Oct 2025 21:39:24 BST
Timeout fix deployed at Fri 3 Oct 2025 21:51:42 BST
Batch processing deployed at Fri 3 Oct 2025 21:56:00 BST
Import stats fix deployed at Fri 3 Oct 2025 22:07:17 BST
Testing mode deployed at Sat 4 Oct 2025 06:31:26 BST

# Force complete rebuild

TIMESTAMP=1759556610
Force function cache clear at Sat 4 Oct 2025 06:55:38 BST
Import routes added at Sat 4 Oct 2025 07:12:40 BST
Path-based multi-tenancy deployed at Sat 4 Oct 2025 19:30:00 BST
Fix TeamUp import: Use minimal schema fields only - Wed 8 Oct 2025 21:00:00 BST
FORCE MONTHLY TURNOVER CACHE CLEAR - SHARED ROUTE - Wed 8 Oct 2025 21:05:00 BST
FORCE FRONTEND CACHE CLEAR - Add no-store to fetch - Wed 8 Oct 2025 21:15:00 BST
FIX MONTHLY TURNOVER QUERY ORDER - Add order by payment_date - Wed 8 Oct 2025 22:00:00 BST
FIX TEAMUP IMPORT: Generate sessions for existing schedules - Wed 8 Oct 2025 22:10:00 BST
Path-based customers page deployed at Sat 4 Oct 2025 19:45:00 BST
Path-based leads page deployed at Sat 4 Oct 2025 20:00:00 BST
Path-based settings page deployed at Sat 4 Oct 2025 20:15:00 BST
Path-based contacts page deployed at Sat 4 Oct 2025 20:30:00 BST
Path-based booking page deployed at Sat 4 Oct 2025 20:45:00 BST
Path-based conversations page deployed at Sat 4 Oct 2025 21:00:00 BST
GoCardless integration with gocardless-nodejs package at Sat 5 Oct 2025 14:30:00 BST - FORCE FRESH INSTALL
GoCardless import stats fix deployed at Sat 5 Oct 2025 14:45:00 BST - Fix multi-provider stats display
GoCardless full import enabled at Sat 5 Oct 2025 15:00:00 BST - Remove 5 record test limit
Stripe subscription import fix at Sat 5 Oct 2025 15:15:00 BST - Fix 4-level expansion limit error
GoCardless import debugging at Sat 5 Oct 2025 15:30:00 BST - Add detailed logging for status filtering
GoCardless payments schema fix at Sat 5 Oct 2025 15:45:00 BST - Fix column names (client_id, payment_status, payment_date)
Force rebuild at Sat 5 Oct 2025 16:10:00 BST - Clear Vercel function cache
GoCardless diagnostic update at Sat 5 Oct 2025 16:30:00 BST - Remove API status filter, add detailed debug info
GoCardless payments diagnostic at Sat 5 Oct 2025 16:45:00 BST - Add client matching failure tracking

# Deployment trigger Mon 6 Oct 2025 11:44:37 BST

# Deploy 1759749898

# FIX organization_id NULL constraint - Mon 6 Oct 2025 12:00:00 BST

# Add organization_id back to memberships insert (QA agent wrongly removed it)

Payment query fix - Mon 6 Oct 2025 14:48:59 BST

# GoCardless payment backfill endpoint + UI - Mon 6 Oct 2025 17:00:00 BST

# Fixes 87 unlinked payments by fetching customer data from GoCardless API

# Debug endpoint - Mon 6 Oct 2025 17:15:00 BST

# Re-import endpoint - Mon 6 Oct 2025 17:30:00 BST

# Add Stripe payment history import - Mon 6 Oct 2025 17:45:00 BST

# Fix GoCardless: Import ALL subscriptions (incl. cancelled) - Mon 6 Oct 2025 18:00:00 BST

# Fix Stripe charges import: Remove currency column, fix status constraint - Mon 6 Oct 2025 18:15:00 BST

# Fix import results link: /customers → /members - Mon 6 Oct 2025 18:20:00 BST

# Change default member filter to active - Mon 6 Oct 2025 18:40:00 BST

# FIX PAYMENTS NOT SHOWING: Add payments API endpoint to bypass RLS - Mon 6 Oct 2025 19:00:00 BST

Fix lifetime value calculation - Tue 7 Oct 2025 10:12:44 BST
Fix GoCardless status filter - Tue 7 Oct 2025 10:57:44 BST
Fix GoCardless subscription import: Auto-create archived clients - Tue 7 Oct 2025 11:15:00 BST
Fix GoCardless payments: Remove currency column - Tue 7 Oct 2025 11:30:00 BST
Fix login loop: Add session cookie API endpoint - Tue 7 Oct 2025 11:50:00 BST
Fix dashboard auth check: Use API endpoint instead of browser client - Tue 7 Oct 2025 12:00:00 BST
Fix SHARED /app/dashboard auth check: Use API endpoint - Tue 7 Oct 2025 12:15:00 BST
Fix useOrganization hook: Remove browser client auth listener - Tue 7 Oct 2025 12:30:00 BST
Add GoCardless CSV import feature for self-service payment imports - Tue 7 Oct 2025 13:00:00 BST
Make CSV upload the primary GoCardless import method (hide API import) - Tue 7 Oct 2025 13:15:00 BST
Add background processing for large CSV imports (>100 rows) - Tue 7 Oct 2025 13:45:00 BST
Fix job progress endpoint auth (use requireAuth instead of getUser) - Tue 7 Oct 2025 14:00:00 BST
Fix dashboard and reports to query 'payments' table instead of empty tables - Tue 7 Oct 2025 14:30:00 BST
Add Client LTV report with leaderboard and average metrics - Tue 7 Oct 2025 15:00:00 BST
Fix dashboard metrics to pull from database (active members, classes, revenue, growth) - Tue 7 Oct 2025 15:15:00 BST
Fix Supabase query limits - add .limit(100000) to get all payment records - Tue 7 Oct 2025 15:30:00 BST
Fix sidebar scrolling - make sidebar fixed with independent scroll - Tue 7 Oct 2025 15:45:00 BST
Add email notifications for large CSV imports - Tue 7 Oct 2025 16:00:00 BST
Contacts page auto-populates from clients with Current/Ex-Client badges - Tue 7 Oct 2025 16:15:00 BST
Fix GoTeamUp import: Add email notifications for background processing - Tue 7 Oct 2025 16:30:00 BST
Remove all revenue reports except Client Lifetime Value (LTV) - Wed 8 Oct 2025 10:00:00 BST
Add Monthly Turnover report with AI insights, graphs, and category breakdown - Wed 8 Oct 2025 11:00:00 BST
TeamUp PDF schedule import with AI extraction - Wed 8 Oct 2025 13:00:00 BST
Fix reports page: Remove old revenue reports, add Monthly Turnover - Wed 8 Oct 2025 13:30:00 BST
Force rebuild - Wed 8 Oct 2025 13:45:00 BST
Add TeamUp to settings sidebar navigation - Wed 8 Oct 2025 14:00:00 BST
Fix ESLint errors and add TeamUp to shared sidebar - Wed 8 Oct 2025 14:15:00 BST
Fix 404: Add monthly turnover to shared /reports directory - Wed 8 Oct 2025 14:30:00 BST
Fix 405: Add TeamUp PDF import API routes to shared /app/api - Wed 8 Oct 2025 14:45:00 BST
Fix analyze route: Force add ignored file for TeamUp PDF AI extraction - Wed 8 Oct 2025 15:00:00 BST
Fix build error: Add csv-parse dependency for all apps - Wed 8 Oct 2025 15:15:00 BST
Fix Monthly Turnover date calculation: Use proper setMonth() instead of approximate 30-day calculation - Wed 8 Oct 2025 16:00:00 BST
Fix class deletion: Add DELETE endpoint with admin client to bypass RLS - Wed 8 Oct 2025 16:30:00 BST
Fix merge duplicates button: Exclude archived/inactive clients from duplicate detection - Wed 8 Oct 2025 17:00:00 BST
Fix Monthly Turnover 1000 payment limit: Add .limit(100000) to bypass Supabase default - Wed 8 Oct 2025 17:30:00 BST
Force deployment - Wed 8 Oct 2025 18:00:00 BST - Clear Vercel function cache
Fix TeamUp PDF import: Use HH:MM:SS format for PostgreSQL time columns - Wed 8 Oct 2025 18:15:00 BST
Fix TeamUp PDF extraction: Increase max_tokens to 8192 for multi-page PDFs - Wed 8 Oct 2025 18:30:00 BST
Fix TeamUp calendar display: Auto-generate class_sessions from schedules - Wed 8 Oct 2025 18:45:00 BST
Deployment trigger: TeamUp PDF import fixes - Wed  8 Oct 2025 11:44:13 BST
QA fixes: Add day_of_week + fix date calculation - Wed 8 Oct 2025 19:15:00 BST
CRITICAL FIX: Correct class_sessions field names (instructor, max_capacity, end_time) - Wed 8 Oct 2025 20:00:00 BST
CRITICAL FIX: Use minimal schema - remove instructor, max_capacity, etc - Wed 8 Oct 2025 20:15:00 BST
Add debug logging to diagnose session generation - Wed 8 Oct 2025 20:30:00 BST
FORCE MONTHLY TURNOVER CACHE CLEAR - Wed 8 Oct 2025 20:45:00 BST - revalidate=0
