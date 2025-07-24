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

## Development Notes

See `CLAUDE.md` for detailed development notes and project status.# Force deployment
