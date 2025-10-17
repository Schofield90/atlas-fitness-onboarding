# Deployment Trigger

Last updated: 2025-10-17 18:55 - CRITICAL: Fix UTC date conversion for GHL API + force redeploy

This file is used to trigger deployments when shared app files change.
Modify this file to force a rebuild.

## Recent Changes

### October 17, 2025 - 🔧 GoHighLevel Calendar Availability Fix

- **ISSUE**: Admin portal showing ALL time slots instead of filtered availability
- **STATUS**: Code is correct in admin-portal/app/lib/ai-agents/tools/ (has gohighlevel-tools.ts)
- **ACTION**: Force redeployment to ensure production uses latest code
- **FILES VERIFIED**:
  - ✅ gohighlevel-tools.ts exists and has correct getAvailableSlots() implementation
  - ✅ registry.ts imports and registers GOHIGHLEVEL_TOOLS
- **EXPECTED**: Production will show only available slots from GHL /free-slots API

### October 2, 2025 - Fixed owner-login to use redirect parameter for admin portal

AI Agent Prompt Generation deployed - Thu 9 Oct 2025 08:50:32 BST
Trial Period Banner & Navigation Fixes - Thu 9 Oct 2025 09:15:00 BST
