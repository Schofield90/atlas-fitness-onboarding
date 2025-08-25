# Atlas Fitness/Gymleadhub Module Inventory
Generated: August 25, 2025

## Core Modules & Routes

### 1. Authentication & Onboarding
- `/login` - User login page
- `/signup` - New user registration
- `/onboarding` - Organization setup for new users
- `/auth/callback` - OAuth callback handler

### 2. Dashboard
- `/dashboard` - Main dashboard with stats and quick actions
- `/dashboard-direct` - Simplified dashboard (public route)
- `/dashboard/overview` - Extended dashboard view

### 3. CRM - Leads & Customers
- `/leads` - Lead management (all potential customers)
- `/customers` - Customer management (paying customers only)
- `/customers/new` - Add new customer form
- `/customers/[id]` - Customer profile page

### 4. Automation & Workflows
- `/automations` - Workflow list and management
- `/automations/builder/new` - Create new workflow
- `/automations/builder/[id]` - Edit existing workflow

### 5. Communication
- `/conversations` - Message conversations
- `/communications/whatsapp` - WhatsApp messaging
- `/communications/sms` - SMS messaging
- `/communications/email` - Email campaigns

### 6. Calendar & Booking
- `/calendar` - Call calendar view
- `/booking` - Class booking management
- `/book/public/[organizationId]` - Public booking page
- `/booking-links` - Booking link management

### 7. Sales & Opportunities
- `/opportunities` - Sales pipeline management
- `/opportunities/[id]` - Opportunity details

### 8. Staff Management
- `/staff-management` - Staff overview
- `/staff-management/directory` - Staff directory
- `/staff-management/timesheets` - Timesheet management
- `/staff-management/schedules` - Schedule management

### 9. Marketing
- `/campaigns` - Marketing campaign management
- `/campaigns/create` - Create new campaign
- `/campaigns/[id]` - Campaign details

### 10. Forms & Surveys
- `/forms` - Form management
- `/forms/builder` - Form builder
- `/surveys` - Survey management
- `/surveys/create` - Survey builder

### 11. AI & Analytics
- `/ai` - AI intelligence features
- `/analytics` - Business analytics
- `/reports` - Custom reports

### 12. Settings & Administration
- `/settings` - General settings
- `/settings/organization` - Organization settings
- `/settings/calendar` - Calendar settings
- `/settings/booking` - Booking settings
- `/integrations` - Third-party integrations
- `/integrations/facebook` - Facebook integration

### 13. Financial & Operations
- `/billing` - Billing and payments
- `/payroll` - Payroll management
- `/sops` - Standard operating procedures

## API Routes

### Public APIs
- `/api/public-api/*` - Public endpoints
- `/api/auth/*` - Authentication endpoints
- `/api/webhooks/*` - Webhook receivers

### Protected APIs
- `/api/leads/*` - Lead management
- `/api/customers/*` - Customer management
- `/api/automations/*` - Workflow automation
- `/api/booking/*` - Booking operations
- `/api/staff/*` - Staff management
- `/api/campaigns/*` - Marketing campaigns
- `/api/integrations/*` - Integration endpoints

## Key Components

### Shared Components Location
- `/app/components/ui/*` - UI components
- `/app/components/automation/*` - Workflow builder components
- `/app/components/leads/*` - Lead management components
- `/app/components/booking/*` - Booking components
- `/app/components/calendar/*` - Calendar components

### Services & Utilities
- `/app/lib/supabase/*` - Database utilities
- `/app/lib/services/*` - Business logic services
- `/app/lib/api/*` - API utilities
- `/app/lib/queue/*` - Queue processing
- `/app/lib/types/*` - TypeScript types

## Database Tables (Supabase)
- organizations
- organization_members
- users
- leads
- clients (customers)
- bookings
- class_sessions
- automations
- campaigns
- forms
- surveys
- staff
- conversations
- messages