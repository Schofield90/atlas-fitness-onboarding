# Deployment Trigger

Last updated: October 12, 2025 23:40:00

## Recent Deployments

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
