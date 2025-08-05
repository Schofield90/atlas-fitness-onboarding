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

## Deployment

This project is configured for deployment on Vercel. The main branch auto-deploys to production.

**Production URL**: https://atlas-fitness-onboarding.vercel.app

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
