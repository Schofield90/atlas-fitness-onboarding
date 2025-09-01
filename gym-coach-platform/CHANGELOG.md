# Changelog

All notable changes to the Gym Coach Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Leads Import/Export System** - Complete CSV-based bulk data management
  - CSV import functionality with field mapping interface and validation
  - CSV export functionality with customizable fields and filtering options  
  - Interactive import modal with three-step workflow: upload, mapping, and preview
  - Smart field mapping with required field validation (name, email)
  - Duplicate detection and error handling during import process
  - Export supports both GET (filtered) and POST (selected leads) operations
  - CSV template download for consistent data formatting
  - Comprehensive validation with detailed error reporting
  - Support for up to 1,000 leads per import and 10,000 leads per export
  - Real-time validation feedback with granular error reporting
  - Automatic CSV parsing with proper quote and comma handling
  - Security features including data sanitization and organization isolation
  - Performance optimization with streaming processing and memory efficiency

- **Dashboard Action Improvements** - Enhanced dashboard with comprehensive action functionality
  - Plus button with popover menu for creating leads, tasks (coming soon), and scheduling meetings
  - Notifications bell with drawer system showing unread notifications with timestamps
  - Integration card button system with manage, disconnect, configure AI, and send test actions
  - Real-time toast notifications for user feedback across all dashboard actions
  - Accessibility improvements with proper ARIA labels and keyboard navigation support
  - Comprehensive loading states and error handling for all asynchronous operations

- **Website Opt-in Form Trigger** - Enhanced automation builder with specialized form trigger configuration
  - Multi-form selection with checkbox interface for choosing specific forms
  - Form type filtering (All, Active, Lead Forms, Contact, Booking) with visual filter buttons
  - Smart form selection controls with "Select All Active" and "Clear All" functionality
  - Form information display showing type badges, status indicators, and submission counts
  - Empty state handling with "Create a form" CTA linking to form management
  - Data persistence storing selected form IDs in node.data.selectedForms array
  - Configuration summary showing selected form count and management links
  - Save/cancel action buttons with proper validation and state management

- **Schedule Trigger** - Comprehensive time-based automation trigger with timezone support
  - Three schedule modes: One-time, Daily, and Weekly execution patterns
  - Timezone-aware scheduling with Europe/London default and DST boundary handling
  - Real-time next run preview showing when automations will execute
  - One-time schedules with future date validation and YYYY-MM-DD format
  - Daily schedules with HH:MM time format for repeated execution
  - Weekly schedules with multi-day selection (Sunday=0 to Saturday=6)
  - Catch up missed runs option for processing skipped schedules
  - Active toggle to enable/disable triggers without losing configuration
  - Comprehensive validation with inline error messages and field highlighting
  - Data persistence in node.data.schedule with structured TypeScript interfaces

- **Webhook Trigger** - Secure HTTP endpoint trigger for external system integration
  - Auto-generated unique webhook endpoints per workflow/node combination
  - HMAC-SHA256 signature verification with configurable timestamp tolerance (30-600 seconds)
  - Cryptographically secure webhook secrets with rotation and one-time reveal functionality
  - Rate limiting at 10 requests per second per endpoint with proper error responses
  - IP allowlist support with CIDR notation for network-level security
  - Content type validation supporting JSON and form-encoded payloads
  - Deduplication strategies using request headers or JSON path extraction
  - Pause/active toggle controls for temporary intake suspension
  - Request body size limit of 1MB with comprehensive error handling
  - Secret management with masked display, rotation API, and audit logging
  - Test functionality for webhook configuration validation
  - Comprehensive response codes (202, 401, 403, 404, 413, 415, 429, 503)
  - Full documentation with cURL, Node.js, and Python implementation examples

### Changed
- **Header Component** - Redesigned header layout with improved action buttons and user experience
- **Integration Cards** - Enhanced integration management with status-dependent button display and confirmation dialogs for destructive actions
- **Automation Builder Trigger Configuration** - Replaced generic "Trigger Type" selector with specialized configuration components
  - Website Form triggers now use dedicated FormSubmittedTriggerConfig component
  - Schedule triggers now use dedicated ScheduleTriggerConfig component with timezone support
  - Webhook triggers now use dedicated WebhookTriggerConfig component with security features
  - Removed generic trigger configuration panel for unsupported trigger types
  - Improved user experience with contextual form selection, schedule configuration, and webhook security interfaces

### Technical Improvements
- New CSV parsing and validation utilities with comprehensive error handling
- FileUpload component with drag-and-drop support for CSV files
- ImportModal component with multi-step workflow and real-time validation feedback
- CSV export utilities with field customization and proper escaping
- API endpoints with robust validation, duplicate detection, and performance limits
- New custom Popover component with click-outside handling and positioning logic
- New custom Drawer component with overlay, escape key handling, and accessibility features
- FormSubmittedTriggerConfig component with shadcn/ui components and dark mode support
- ScheduleTriggerConfig component with timezone calculations using date-fns-tz library
- AutomationBuilder integration with dynamic trigger configuration rendering
- Enhanced automation data persistence with structured node.data storage
- Comprehensive test coverage with unit tests and E2E testing using Jest and Playwright
- Timezone handling with IANA timezone database and DST boundary calculations
- Zod validation schemas for schedule configuration with custom refinements
- Next run preview functionality with real-time calculation updates
- WebhookTriggerConfig component with HMAC signature generation and security controls
- Webhook API endpoints with signature verification, rate limiting, and deduplication
- Webhook secret rotation API with one-time reveal tokens and audit logging
- Rate limiting infrastructure using Redis/memory-based request tracking
- IP allowlist validation with CIDR notation support for network security
- Webhook delivery tracking with comprehensive logging and statistics
- TypeScript interfaces for webhook configuration, delivery tracking, and security
- HMAC-SHA256 implementation with timing-safe comparison for signature verification
- Improved error handling patterns with user-friendly toast notifications

---

## Release History

*This is the first changelog entry for the Gym Coach Platform. Previous releases were not documented in this format.*

### Notes
- All dashboard actions include proper loading states and error handling
- WhatsApp integration has specialized AI configuration (coming soon) and test message functionality
- Integration card disconnect actions require user confirmation to prevent accidental disconnections
- Notifications system uses mock data and will be connected to real-time backend in future releases