# n8n with Vercel and Supabase

This project sets up n8n (workflow automation) with Vercel deployment and Supabase as the database backend.

## Setup

1. **Environment Variables**
   - Copy `.env.example` to `.env.local` for Vercel
   - Fill in your Supabase credentials and n8n configuration

2. **Local Development with Docker**
   ```bash
   npm run docker:up
   ```

3. **Vercel Deployment**
   ```bash
   npm run build
   ```

## Configuration

- **Docker**: `docker-compose.yml` and `Dockerfile`
- **Vercel**: `vercel.json` and `api/index.js`
- **Supabase**: `lib/supabase.js` for database integration

## Environment Variables

See `.env.example` for required variables including:
- n8n basic auth credentials
- Supabase database connection
- Webhook URLs and domain configuration