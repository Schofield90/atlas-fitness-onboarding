# CRITICAL CONTEXT - Atlas Fitness CRM Multi-Tenant SaaS Platform

## 🚨 MUST READ BEFORE ANY CODE CHANGES

### Core Business Requirements
**This platform MUST support 100+ businesses simultaneously, NOT a single business.**

Every line of code, every feature, every database query MUST consider:
1. **Multi-tenant isolation** - Complete data separation between organizations
2. **AI-first design** - Every feature enhanced with GPT-4/Claude intelligence
3. **Real-time performance** - <1s lead notifications, <500ms message delivery
4. **Enterprise scalability** - Support 10,000+ orgs, 1M+ leads, 100K+ daily automations

### Target Users & Problems Solved

#### Primary Users:
- **Gym Owners**: Managing members, classes, trainers, equipment
- **Business Coaches**: Managing clients, sessions, resources  
- **Hybrid Operators**: Both gym and coaching services

#### Core Problems:
- 40%+ lead loss from manual tracking
- Fragmented communication (email, SMS, calls, social)
- Time-consuming repetitive tasks
- No data-driven insights
- Poor conversion from delayed responses
- Missed cross-sell/upsell opportunities

### Technical Architecture Requirements

#### Stack:
- **Frontend**: Next.js 14, TypeScript (STRICT MODE), React 18, Tailwind, Radix UI
- **Backend**: Next.js API Routes, tRPC, Supabase (PostgreSQL), Redis, BullMQ
- **AI**: OpenAI GPT-4, Claude, Pinecone, TensorFlow.js
- **Infrastructure**: Vercel, Cloudflare, AWS S3, Sentry

#### Performance Targets:
- Lead notifications: <1 second
- Dashboard updates: <2 seconds  
- Message delivery: <500ms
- Automation execution: <5 seconds
- API response time: <200ms
- Page load time: <1.5s

### Critical Implementation Rules

#### Multi-Tenancy (ALWAYS):
```typescript
// WRONG - Single tenant thinking
const leads = await supabase.from('leads').select('*')

// RIGHT - Multi-tenant isolation
const leads = await supabase
  .from('leads')
  .select('*')
  .eq('organization_id', ctx.organizationId) // ALWAYS filter by org
```

#### AI Integration (REQUIRED):
- Every lead gets AI scoring
- Every conversation gets sentiment analysis
- Every workflow gets optimization suggestions
- Every report includes AI insights

#### Security (NON-NEGOTIABLE):
- ALL PII encrypted at rest and transit
- Row-level security on EVERY table
- Audit logs for ALL data access
- GDPR-compliant data handling
- No hardcoded credentials or IDs

### Key Feature Requirements

#### 1. Intelligent Lead Management
- AI lead scoring with real-time updates
- Smart routing based on conversion history
- Predictive conversion timeline
- Lead source ROI tracking

#### 2. Unified Communication Hub  
- Single inbox for ALL channels
- AI-powered response suggestions
- Conversation intelligence
- Sentiment tracking

#### 3. Workflow Automation Engine
- Visual drag-drop builder
- 50+ pre-built actions
- Conditional logic & A/B testing
- Performance analytics

#### 4. AI-Powered Analytics
- Churn prediction
- Revenue forecasting
- Natural language queries
- Automated insights

#### 5. Client Portals
- Gym: Class booking, progress tracking
- Coaching: Resources, milestones, payments
- Mobile-first design

### Current Critical Issues (MUST FIX)

1. **AUTHENTICATION DISABLED** - middleware.ts bypasses all auth
2. **TypeScript strict: false** - Allows unsafe code
3. **Multi-tenant gaps** - Some routes don't filter by org_id
4. **No caching layer** - Performance will fail at scale
5. **Limited AI coverage** - Missing real-time processing

### Development Checklist (EVERY FEATURE)

Before writing ANY code, verify:
- [ ] Multi-tenant isolation implemented?
- [ ] AI enhancement considered?
- [ ] Performance impact assessed?
- [ ] Security implications reviewed?
- [ ] Scalability to 100+ orgs tested?
- [ ] Error handling comprehensive?
- [ ] Tests written (80%+ coverage)?
- [ ] TypeScript strict mode compatible?

### Success Metrics

#### Technical:
- 99.9% uptime
- <200ms API response
- <1.5s page load
- <1% error rate

#### Business:
- 50% reduction in lead response time
- 30% improvement in conversion
- 40% reduction in admin tasks
- 25% increase in retention

### Remember
**This is NOT a single gym's system. This is a platform that will power hundreds of fitness and coaching businesses. Every decision must scale.**

## Key Differentiators
1. **AI-First**: Not bolted on, but integrated everywhere
2. **Unified Platform**: Single system for gym + coaching
3. **Real-Time Everything**: Instant updates everywhere
4. **Conversion Focused**: Every feature improves conversion
5. **Built to Scale**: Enterprise-ready from day one

---
*Last Updated: [Current Date]*
*Version: 2.0 - Multi-Tenant Production Ready*