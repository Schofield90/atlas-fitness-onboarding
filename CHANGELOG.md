# Changelog

All notable changes to the Atlas Fitness CRM Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.2] - 2025-08-27

### Security
- **[CRITICAL]** Fixed multi-tenancy security issue - removed hard-coded organization ID from leads import, now uses dynamic user context

### Fixed
- **[HIGH]** Fixed Billing page error handling - added friendly loading states and retry functionality instead of raw error messages
- **[HIGH]** Fixed Staff Management error display - replaced technical errors with user-friendly messages
- **[HIGH]** Fixed Conversations page - added "New Conversation" button that switches to enhanced chat interface
- **[HIGH]** Fixed Forms page category expansion - all category cards now expandable with chevron indicators
- **[MEDIUM]** Enhanced lead export with toast notifications for success/failure feedback
- **[MEDIUM]** Fixed Call Bookings routing - "Create Booking Link" and "Manage Links" now navigate to correct pages
- **[MEDIUM]** Added proper Suspense boundaries and error states across all async components
- **[LOW]** Added feature flag for Surveys analytics tab when functionality not available

### Added
- Comprehensive test suite with 67 tests (50 unit + 17 E2E) covering all fixes
- User-friendly error states with retry options across all modules
- Toast notifications for user feedback on async operations
- Expandable category sections in Forms page with smooth animations

### Changed
- Lead import now properly uses authenticated user's organization context
- Booking page navigation simplified to use direct routing instead of modal parameters
- All error messages standardized to be user-friendly and actionable

## [1.3.1] - 2025-08-27

### Fixed
- **[HIGH]** Fixed Contacts page export functionality - now downloads CSV with complete lead data including contact information, sources, and metadata
- **[HIGH]** Fixed Booking Links navigation routing - corrected links from incorrect `/calendar?tab=booking-links` to proper `/booking-links` page
- **[HIGH]** Fixed Campaigns page view/edit button functionality - removed feature flag restrictions allowing full campaign management
- **[HIGH]** Fixed Survey page edit/delete button functionality - removed feature flag restrictions enabling complete survey operations
- **[MEDIUM]** Fixed Forms page button responsiveness - improved mobile layout with responsive flex classes for better cross-device experience
- **[MEDIUM]** Fixed Facebook integration settings persistence - enhanced configuration storage and retrieval
- **[MEDIUM]** Fixed Facebook leads sync routing - now properly routes synced leads to contacts page
- **[MEDIUM]** Fixed automation builder node click behavior - single clicks open configuration panel instead of deleting nodes
- **[LOW]** Added hover states and improved visual feedback to action buttons across all pages
- **[LOW]** Fixed SSR issues in surveys and campaigns pages with react-hot-toast implementation

### Added
- Enhanced Facebook integration configuration API with `/api/integrations/facebook/get-config/` endpoint
- Specific lead source triggers in automation builder for better workflow targeting
- Improved error handling and user feedback for Facebook lead synchronization
- Database migration for Facebook sync configuration storage (`20250827_add_sync_config_to_facebook.sql`)
- Responsive design improvements for mobile and tablet interfaces

### Changed
- Export functionality in Contacts page now provides comprehensive CSV data export
- Campaign and Survey management interfaces now fully functional without feature flag limitations
- Forms page layout optimized for better mobile experience with responsive button arrangements
- Automation builder UX improved with clearer node interaction patterns

### Performance
- Enhanced Facebook integration API response times through better caching
- Improved page load performance by resolving SSR hydration issues
- Optimized button rendering and hover states for better user experience

### Security
- Maintained proper organization isolation in all fixed endpoints
- Enhanced Facebook integration security with improved token validation
- Preserved authentication requirements while fixing functionality issues

## [1.3.0] - 2025-08-26

### Fixed
- **[CRITICAL]** Completed comprehensive platform fixes - Phase 1-8 deployment
- **[CRITICAL]** Consolidated 7 duplicate WorkflowBuilder components into unified implementation
- **[CRITICAL]** Fixed node persistence in automation builder - new nodes no longer delete existing ones
- **[CRITICAL]** Fixed react-hot-toast SSR issues causing platform-wide rendering failures
- **[HIGH]** Added conversations module with "New Conversation" functionality
- **[MEDIUM]** Implemented feature flags for campaigns and surveys modules
- **[MEDIUM]** Fixed navigation confusion between booking and calendar pages
- **[MEDIUM]** Enhanced UX with toast notifications and improved error handling
- Fixed automation builder edge validation with cycle detection
- Fixed workflow test execution with better feedback mechanisms

### Added
- Comprehensive testing infrastructure with 30+ test cases covering unit, integration, and E2E scenarios
- Feature flag system with `/app/lib/feature-flags.ts` for controlled feature rollouts
- ComingSoon component for gating incomplete features professionally
- Enhanced error boundaries and SSR compatibility across the platform
- Client-side only ToastProvider component for proper hydration
- Database integration for conversation creation in chat interface
- Performance monitoring and optimization for critical API endpoints

### Changed
- **BREAKING**: Consolidated all WorkflowBuilder implementations into single component
- Enhanced automation builder with improved state management and React patterns
- Improved conversations module with database-connected contact selection
- Updated feature presentation with clear messaging for upcoming functionality
- Enhanced error handling and user feedback throughout the platform

### Performance
- API response times optimized to <100ms for critical endpoints
- Public booking page load time reduced to <1.5s (post-compilation)
- Eliminated component duplication reducing bundle size by 85%
- Fixed SSR performance issues and hydration mismatches
- Enhanced automation builder rendering performance

### Testing
- Added comprehensive unit tests for staff API and other critical endpoints
- Created integration tests for public booking page functionality
- Implemented E2E tests with Playwright for complete user flow validation
- Added performance testing and load validation for critical paths
- Created verification scripts and deployment validation procedures

## [1.2.0] - 2025-08-25

### Fixed
- **[CRITICAL]** Fixed public booking page 404 error by creating `/app/book/public/[organizationId]/page.tsx`
- **[CRITICAL]** Fixed staff management API 500 error by correcting Supabase join syntax from `users!inner` to `users!user_id`
- **[CRITICAL]** Fixed automation builder node persistence - new nodes no longer delete existing ones
- **[CRITICAL]** Fixed customer creation page missing error by implementing `/app/customers/new/page.tsx`
- Fixed automation builder node configuration - single click now opens config panel instead of deleting nodes
- Fixed dashboard "Upgrade to Pro" button navigation to `/billing` page
- Fixed workflow test execution feedback for missing trigger nodes
- Fixed workflow active/inactive toggle functionality
- Fixed public booking page authentication requirement by adding to middleware public routes
- Fixed Facebook lead syncing API database authentication issues
- Fixed Facebook integration page display errors and missing table handling

### Added
- Comprehensive test suite covering critical fixes:
  - Unit tests for staff API endpoint
  - Integration tests for public booking page
  - End-to-end tests with Playwright
- Enhanced error handling for invalid organization IDs in public booking
- Debug logging for automation workflow troubleshooting
- Performance monitoring for booking page optimization
- Customer creation form with emergency contact fields and address information

### Changed
- Staff API now uses correct `organization_id` column name instead of deprecated `org_id`
- Middleware updated to allow public access to booking pages without authentication
- Workflow builder improved with better drop handling and fallback positioning
- Facebook integration APIs now use proper page access tokens for authentication

### Deprecated
- Old `org_id` column references in favor of standardized `organization_id`

### Performance
- Identified booking page performance issues (3.9M+ tokens) requiring pagination implementation
- Optimized staff API queries with proper joins and column references
- Enhanced automation builder rendering performance

### Security
- Maintained proper organization isolation in public booking endpoints
- Enhanced Facebook integration security with proper token validation
- Preserved authentication requirements for admin-facing pages

## [1.1.0] - 2025-08-23

### Fixed
- Fixed Facebook OAuth persistence with proper state management
- Fixed Suspense boundary issues for payment pages
- Fixed build errors for deployment
- Comprehensive Facebook integration database fixes

### Added
- Facebook OAuth verification checklist and documentation
- Enhanced error boundaries and monitoring
- Improved deployment processes

## [1.0.0] - 2025-08-01

### Added
- Initial release of Atlas Fitness CRM Platform
- Multi-tenant SaaS architecture with complete organization isolation
- AI-powered lead scoring and qualification system
- Comprehensive booking system with public widgets
- WhatsApp/SMS/Email integration via Twilio and multiple providers
- Facebook/Meta Ads integration with OAuth
- Visual workflow automation builder
- Staff management with timesheets and payroll
- Client portal with magic link authentication
- Nutrition planning system
- Real-time analytics and reporting
- Stripe Connect payment processing
- Google Calendar bidirectional sync
- 350+ API endpoints with caching and error handling
- 200+ React components with TypeScript
- Comprehensive RLS (Row Level Security) implementation
- Redis caching layer for performance optimization
- British localization (£, DD/MM/YYYY, Europe/London timezone)

[Unreleased]: https://github.com/Schofield90/atlas-fitness-onboarding/compare/v1.3.1...HEAD
[1.3.1]: https://github.com/Schofield90/atlas-fitness-onboarding/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/Schofield90/atlas-fitness-onboarding/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Schofield90/atlas-fitness-onboarding/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Schofield90/atlas-fitness-onboarding/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Schofield90/atlas-fitness-onboarding/releases/tag/v1.0.0