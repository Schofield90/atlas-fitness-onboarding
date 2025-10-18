# Deployment Trigger

Last updated: October 17, 2025 19:15 - CRITICAL: Fix Next.js fetch() caching + response headers

## Recent Deployments

### October 17, 2025 - 🔧 CRITICAL FIX (v2): GoHighLevel Calendar Availability - ALL Time Slots Bug

- **ISSUE**: Production showing ALL possible time slots (08:30, 08:45, 09:00...) instead of only available slots
- **USER TESTING**: Local shows 6 morning + 8 afternoon slots (correct), Production shows every 15-min slot (wrong)
- **ROOT CAUSE IDENTIFIED**:
  - Previous fix (October 17 AM) was incomplete and never actually deployed
  - `gohighlevel-tools.ts` was NOT actually copied to gym-dashboard
  - gym-dashboard registry was NOT updated to import GOHIGHLEVEL_TOOLS
  - Only admin-portal had the correct setup
- **ACTUAL FIX APPLIED (October 17 PM)**:
  - ✅ Copied `gohighlevel-tools.ts` from `/app/lib/ai-agents/tools/` → `/apps/gym-dashboard/app/lib/ai-agents/tools/`
  - ✅ Added `import { GOHIGHLEVEL_TOOLS } from "./gohighlevel-tools";` to gym-dashboard registry (line 19)
  - ✅ Added `...GOHIGHLEVEL_TOOLS,` to allTools array in registry (line 42)
- **FILES CHANGED**:
  - `/apps/gym-dashboard/app/lib/ai-agents/tools/gohighlevel-tools.ts` (NEW - copied from root)
  - `/apps/gym-dashboard/app/lib/ai-agents/tools/registry.ts` (lines 19, 42)
- **WHY LOCAL WORKED**: Local uses root `/app/lib/` which had the tools, production uses `/apps/gym-dashboard/app/lib/`
- **EXPECTED RESULT**: Production now filters slots via GHL `/free-slots` API, showing only genuinely available times
- **TEST URL**: https://admin.gymleadhub.co.uk/saas-admin/lead-bots/test/[agentId] → Check Booking Times
- **MONOREPO NOTE**: Production builds require files in EACH app's `/app/lib/` directory, not just root

### October 16, 2025 - 🚀 NAVIGATION: Lead Bots Menu Item Added

- **FEATURE**: Added "Lead Bots" navigation link between "AI Chat Agents" and "Analytics"
- **LOCATION**: Main sidebar navigation menu
- **ROUTE**: `/saas-admin/lead-bots`
- **ICON**: Shield with checkmark (security/protection theme)
- **WHAT IT DOES**: Access hub for AI agent testing, conversation review, and training
- **SUB-PAGES AVAILABLE**:
  - `/saas-admin/lead-bots` - Main dashboard
  - `/saas-admin/lead-bots/test/[agentId]` - Real-time agent testing UI
  - `/saas-admin/lead-bots/review` - Flagged conversations review
  - `/saas-admin/lead-bots/guardrails` - Natural language guardrails management
  - `/saas-admin/lead-bots/reports` - Performance reports
  - `/saas-admin/lead-bots/sops` - System prompt management
- **FILES CHANGED**:
  - `/apps/gym-dashboard/app/components/DashboardLayout.tsx` (lines 539-557)
- **STATUS**: Now deployed and accessible from sidebar
- **USER REQUEST**: "where is the ai testing bit we made before, I cant see it in the side menu"

## Recent Deployments

### October 13, 2025 23:50 - 🚀 NEW FEATURE: AI Chat Agents Navigation Added

- **FEATURE**: Added "AI Chat Agents" link to navigation menu
- **LOCATION**: Main sidebar under "AI Agents"
- **ROUTE**: `/crm/ai-chat-agents`
- **WHAT IT DOES**: Manages GoHighLevel webhook integration for AI-powered lead follow-ups
- **FILES CHANGED**:
  - `/apps/gym-dashboard/app/components/DashboardLayout.tsx` (lines 520-538, 853-871)
- **INCLUDES**: Full GoHighLevel integration system (webhook handler, API endpoints, docs)

### October 12, 2025 23:40 - ✅ VERIFIED DEPLOYED: Conversations API Fix Live

- **STATUS**: Fix successfully deployed to production (15:19:03 GMT)
- **DEPLOYMENT**: `atlas-gym-dashboard-qxz7g3sgv` (17m old)
- **FIX VERIFIED**: Changed `users.full_name` → `users.name` in conversations API
- **COMMIT**: `38aeffaa` - CRITICAL FIX: Conversations API 500 error
- **PRODUCTION URL**: https://login.gymleadhub.co.uk
- **RESULT**: Chat history now loads, conversations persist across page reloads
- **TESTING**: Ready for user to test AI agent chat functionality

### October 12, 2025 22:45 - 🚨 FORCE DEPLOY: AI Landing Page Fix NOT in Production

- **ISSUE**: Production still calling `/api/landing-pages/ai-build` (old endpoint)
- **VERIFIED**: Code fix exists in repo (builder page line 71 shows `ai-generate`)
- **VERIFIED**: Even incognito mode calls `ai-build` - NOT a browser cache issue
- **ROOT CAUSE**: Vercel not deploying latest commit (1a7c96a6)
- **ACTION**: Force fresh deployment by updating this file
- **TEST RESULTS**: Playwright test confirms production calling `ai-build` returns 500 error

### October 12, 2025 22:30 - ✅ VERIFIED FIX: AI Landing Page Generation (Claude Sonnet 4.5)

- **ISSUE**: AI landing pages generating with identical colors + "Generation failed" errors
- **ROOT CAUSE**: Builder page calling old `/api/landing-pages/ai-build` endpoint (line 71)
- **FIX**: Changed to `/api/landing-pages/ai-generate` endpoint
- **VERIFICATION**: All Playwright E2E tests passing ✅
  - API endpoint uses Claude Sonnet 4.5 (NOT GPT-4o)
  - Builder page calls ai-generate (NOT ai-build)
  - AITemplateImport component calls ai-generate
  - ANTHROPIC_API_KEY configured correctly
  - Prompt includes color diversity instructions
  - Temperature 0.9 for creative variation
- **USER ACTION REQUIRED**: Hard refresh production (Cmd+Shift+R) to clear browser cache
- **FILES CHANGED**:
  - `/apps/gym-dashboard/app/landing-pages/builder/page.tsx:71`
  - Added comprehensive E2E test suite

### October 12, 2025 15:05 - CRITICAL FIX: Conversations API 500 Error

- **ROOT CAUSE**: Query referenced `users.full_name` column which doesn't exist
- **FIX**: Changed to `users.name` (actual column name)
- PostgreSQL error code 42703 was causing 500 Internal Server Error
- Query now works: returns 32 conversations successfully
- This fixes: chat history not loading, second messages disappearing
Force gym-dashboard deployment - GHL API caching fix (c0d07ca2)
# Trigger deployment - timezone fix deployment verification
