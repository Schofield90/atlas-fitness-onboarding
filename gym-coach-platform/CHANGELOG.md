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

### Changed
- **Header Component** - Redesigned header layout with improved action buttons and user experience
- **Integration Cards** - Enhanced integration management with status-dependent button display and confirmation dialogs for destructive actions

### Technical Improvements
- New CSV parsing and validation utilities with comprehensive error handling
- FileUpload component with drag-and-drop support for CSV files
- ImportModal component with multi-step workflow and real-time validation feedback
- CSV export utilities with field customization and proper escaping
- API endpoints with robust validation, duplicate detection, and performance limits
- New custom Popover component with click-outside handling and positioning logic
- New custom Drawer component with overlay, escape key handling, and accessibility features
- Comprehensive test coverage with unit tests and E2E testing using Jest and Playwright
- Improved error handling patterns with user-friendly toast notifications

---

## Release History

*This is the first changelog entry for the Gym Coach Platform. Previous releases were not documented in this format.*

### Notes
- All dashboard actions include proper loading states and error handling
- WhatsApp integration has specialized AI configuration (coming soon) and test message functionality
- Integration card disconnect actions require user confirmation to prevent accidental disconnections
- Notifications system uses mock data and will be connected to real-time backend in future releases