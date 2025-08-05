# Atlas Fitness CRM - Claude Code Configuration

## Project Overview

Atlas Fitness CRM is a comprehensive multi-tenant SaaS platform designed for gyms and fitness coaches. It combines lead management, marketing automation, AI-powered insights, and seamless third-party integrations to help fitness businesses grow.

### Key Features
- 🏢 **Multi-tenant Architecture**: Complete organization isolation with RLS
- 🤖 **AI-Powered**: Lead scoring, content generation, conversational AI
- 📧 **Omnichannel Communication**: Email, SMS, WhatsApp, voice calls
- 🔄 **Advanced Automation**: Visual workflow builder with 50+ triggers/actions
- 📊 **Analytics & Insights**: Real-time dashboards and predictive analytics
- 💳 **Integrated Payments**: Stripe Connect for marketplace payments
- 🔗 **Deep Integrations**: Meta Ads, Google Calendar, fitness platforms

## Available Specialized Agents

### 🗄️ Database Architect (`database-architect`)
**Expertise**: PostgreSQL, Supabase, multi-tenant schemas, RLS policies, performance optimization
**Use For**: Schema design, migrations, query optimization, indexing strategies

### 🔌 API Integration Specialist (`api-integration-specialist`)
**Expertise**: Meta Ads API, Twilio, Stripe, webhook handling, OAuth flows
**Use For**: Third-party integrations, API wrappers, webhook endpoints, rate limiting

### ⚙️ Automation Engine Architect (`automation-engine-architect`)
**Expertise**: BullMQ, Redis, event-driven architecture, workflow engines
**Use For**: Workflow execution, queue management, trigger systems, performance optimization

### 🤖 AI Services Engineer (`ai-services-engineer`)
**Expertise**: OpenAI GPT-4, Anthropic Claude, vector databases, ML features
**Use For**: Lead scoring, content generation, conversational AI, predictive analytics

### 🔄 Automation Workflow Architect (`automation-workflow-architect`)
**Expertise**: React Flow, visual builders, GHL/n8n patterns, complex workflows
**Use For**: Visual workflow editor, node systems, execution paths, A/B testing

## Development Workflow

### 1. Planning Phase
- Review requirements and identify which agents to consult
- Database Architect for schema changes
- API Integration Specialist for new integrations
- AI Services Engineer for ML features

### 2. Implementation Phase
- Follow development standards in `.claude/context/development-standards.md`
- Use appropriate agent for specialized tasks
- Maintain consistent code patterns

### 3. Testing Phase
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical workflows

### 4. Deployment
- Push to GitHub for Vercel deployment
- Run database migrations via Supabase
- Update environment variables as needed

## Current Priorities

### 🚨 High Priority
1. **Complete Meta Ads Integration**
   - Campaign import and management
   - Custom audience sync
   - ROI tracking and attribution

2. **Advanced Automation Engine**
   - Implement BullMQ job queues
   - Add conditional branching
   - Build A/B testing framework

3. **AI Lead Scoring**
   - Train scoring models
   - Real-time score updates
   - Predictive analytics dashboard

### 📋 Medium Priority
1. **Payment Processing**
   - Complete Stripe Connect onboarding
   - Build payment forms
   - Invoice generation

2. **Team Collaboration**
   - Role-based permissions
   - Task management
   - Activity feeds

3. **Mobile App**
   - React Native development
   - Push notifications
   - Offline support

### 💡 Future Enhancements
1. **Advanced Analytics**
   - Custom report builder
   - Predictive insights
   - Export functionality

2. **Fitness Integrations**
   - MyFitnessPal sync
   - Wearable device data
   - Workout plan generator

## Architecture Decisions

### Tech Stack Rationale
- **Next.js 14**: Server components for performance, built-in API routes
- **TypeScript**: Type safety across the entire stack
- **Supabase**: PostgreSQL with built-in auth, realtime, and storage
- **Tailwind CSS**: Rapid UI development with consistent design
- **React Flow**: Best-in-class workflow visualization
- **BullMQ**: Production-grade job queue for automation

### Design Principles
1. **Database-First**: Business logic in PostgreSQL via RLS and functions
2. **Type Safety**: End-to-end TypeScript with runtime validation
3. **Multi-Tenant First**: Every feature considers organization isolation
4. **API Consistency**: Standardized response formats and error handling
5. **Performance**: Optimize for sub-second response times

### Security Considerations
- Row Level Security for all tenant data
- Encrypted storage for sensitive information
- OAuth 2.0 for third-party integrations
- Webhook signature verification
- Rate limiting on all endpoints

## Quick Reference

### Environment Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Run database migrations
supabase migration up
```

### Common Commands
```bash
# Generate TypeScript types from database
npm run generate:types

# Run tests
npm test

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### Key Files
- `/app/api/*` - API endpoints
- `/app/lib/supabase/*` - Database utilities
- `/app/components/*` - React components
- `/supabase/migrations/*` - Database migrations
- `/.claude/agents/*` - Specialized AI agents
- `/.claude/context/*` - Project context

## Working with Agents

When facing complex tasks, use the specialized agents:

```markdown
# Example: Adding a new integration
1. Consult API Integration Specialist for best practices
2. Have Database Architect design storage schema
3. Use Automation Workflow Architect for workflow nodes
4. Get AI Services Engineer input for intelligent features
```

Each agent has deep knowledge of their domain and understands the project context. They can work together on complex features that span multiple areas.

## Support & Documentation

### Internal Documentation
- `.claude/context/crm-architecture.md` - System architecture
- `.claude/context/database-schema.md` - Complete schema reference
- `.claude/context/api-integrations.md` - Integration patterns
- `.claude/context/development-standards.md` - Coding standards

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Flow Documentation](https://reactflow.dev)
- [BullMQ Documentation](https://docs.bullmq.io)

---

*This CRM is built for scale, designed for developers, and optimized for the fitness industry.*