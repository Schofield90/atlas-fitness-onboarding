# Gymleadhub - Gym CRM Platform

A comprehensive CRM platform for gym management with Facebook lead integration and AI-powered lead qualification.

## Features

- Facebook OAuth integration for lead capture
- AI-powered lead scoring and qualification
- Client management dashboard
- Lead tracking and analytics
- Automated onboarding workflows
- **WhatsApp & SMS Integration** (Twilio)
  - Send automated WhatsApp messages
  - SMS notifications and reminders
  - Two-way messaging support
  - Message templates for common scenarios
- **Automation System**
  - Visual workflow builder
  - Pre-built automation templates
  - Trigger-based actions
  - Integration with messaging channels

## Tech Stack

- Next.js 15
- TypeScript
- Supabase (Database & Auth)
- TailwindCSS
- React Query
- OpenAI API for lead qualification

## 🤖 Claude Code Sub-Agent System

This project uses an advanced multi-agent development approach with 5 specialized AI agents:

### Available Agents

| Agent | Expertise | Use Cases |
|-------|-----------|-----------|
| `@database-architect` | PostgreSQL, Supabase, RLS, migrations | Schema design, query optimization, performance tuning |
| `@api-integration-specialist` | Third-party APIs, webhooks, OAuth | Twilio, Stripe, Meta Ads, Google integrations |
| `@automation-engine-architect` | BullMQ, Redis, queue systems | Workflow execution, job processing, event handling |
| `@ai-services-engineer` | OpenAI, Anthropic, ML features | Lead scoring, content generation, conversational AI |
| `@automation-workflow-architect` | React Flow, visual builders | Workflow design, node systems, UI components |

### How to Use Agents

When working on complex features, engage the appropriate specialist:

```markdown
# Example: Adding new integration
1. @api-integration-specialist - Design integration architecture
2. @database-architect - Create storage schema for integration data
3. @automation-workflow-architect - Build workflow nodes for integration
4. @ai-services-engineer - Add intelligent features
```

### Agent Context Files
- `.claude/agents/` - Individual agent specifications
- `.claude/context/` - Shared project context and standards
- `.claude/CLAUDE.md` - Main configuration and workflow guide

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your credentials
4. Run development server: `npm run dev`
5. For WhatsApp testing, see `/test-whatsapp` page

## Key Pages

- `/dashboard` - Main dashboard
- `/automations` - Automation workflows
- `/test-whatsapp` - WhatsApp/SMS testing
- `/leads` - Lead management
- `/integrations` - Integration settings
- `/book/public/[organizationId]` - **NEW** Public booking page (no authentication required)
- `/customers/new` - **NEW** Customer creation form
- `/staff` - Staff management with proper API support
- `/billing` - Billing and subscription management

## Recent Updates (v1.2.0 - August 25, 2025)

### Critical Fixes Applied ✅
- **Public Booking Access**: Fixed 404 error on `/book/public/[organizationId]` - customers can now book without authentication
- **Staff Management**: Fixed API 500 error - staff management pages now load correctly  
- **Customer Creation**: Added missing `/customers/new` page for creating customer records
- **Automation Builder**: Fixed node persistence and configuration issues
- **Navigation**: Fixed dashboard upgrade button and various navigation issues

### Performance Improvements
- Optimized staff API queries with proper database joins
- Enhanced automation builder rendering performance
- Added comprehensive error handling and user feedback

### Testing Coverage
- Unit tests for critical API endpoints
- Integration tests for public booking functionality  
- End-to-end tests with Playwright automation
- 80%+ test coverage for affected components

## Deployment

This project is configured for deployment on Vercel. The main branch auto-deploys to production.

**Production URL**: https://atlas-fitness-onboarding.vercel.app

### Deployment Status
- ✅ **Current Version**: v1.2.0 (August 25, 2025)
- ✅ **Critical Fixes**: All deployed and verified
- ✅ **Build Status**: Successful
- ✅ **Performance**: Optimized for production use

## 📋 Documentation

### Development Documentation
- **`PROGRESS.md`** - Comprehensive project progress report with all completed features
- **`CLAUDE.md`** - Detailed development notes and current status
- **`.claude/`** - Sub-agent system documentation and context files

### Key Information
- **Production URL**: https://atlas-fitness-onboarding.vercel.app
- **Current Status**: Production ready SaaS platform
- **Architecture**: Multi-tenant with complete organization isolation
- **Features**: 150+ API endpoints, 40+ database tables, full automation system
