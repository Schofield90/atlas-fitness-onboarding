# Local Development Guide

## Quick Start (Recommended)

The easiest way to test changes locally is to run the Next.js development server directly:

```bash
# 1. Make sure you have .env.local with your Supabase credentials
cp .env.local.example .env.local
# Edit .env.local with your actual values

# 2. Install dependencies (if not already installed)
npm install

# 3. Run the development server
npm run dev
```

Your app will be available at http://localhost:3000 with hot reload!

## Benefits of Local Development

- **Instant feedback**: Changes appear immediately (no 2.5 minute deploy wait)
- **Hot Module Replacement**: See changes without page refresh
- **Better debugging**: Full error stack traces in terminal
- **Uses same database**: Connects to your remote Supabase instance

## Setting Up .env.local

Create a `.env.local` file with your Supabase credentials:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Twilio (for SMS/WhatsApp)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_SMS_FROM=+1234567890
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# AI Services
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Google Calendar
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Other
RESEND_API_KEY=your-resend-key
USER_PHONE_NUMBER=+447777777777
```

## Development Workflow

1. **Make changes** to your code
2. **Save the file** - Next.js automatically recompiles
3. **Check browser** - Changes appear instantly
4. **Test thoroughly** locally
5. **Commit and push** only when everything works

## Useful Development Commands

```bash
# Run with Turbopack (faster HMR)
npm run dev:turbo

# Check TypeScript errors
npm run type-check

# Lint your code
npm run lint

# Build locally to test production build
npm run build

# Run production build locally
npm run start
```

## Docker Setup (Optional)

If you prefer Docker for consistency:

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    image: node:20-alpine
    working_dir: /app
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=development
    env_file:
      - .env.local
    command: sh -c "npm install && npm run dev"
EOF

# Run with Docker
docker-compose up
```

## Troubleshooting

### Port 3000 already in use
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Module not found errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

### Database connection issues
- Check your Supabase project is active
- Verify .env.local has correct credentials
- Ensure your IP isn't blocked in Supabase settings

## Tips for Fast Development

1. **Use the Network tab** in Chrome DevTools to see API calls
2. **Add console.log()** statements for quick debugging
3. **Use React DevTools** extension to inspect component state
4. **Keep Vercel logs open** in another tab to compare
5. **Test on localhost first**, then deploy when confident

## Webhook Testing Locally

For testing webhooks (Twilio, Stripe) locally, use ngrok:

```bash
# Install ngrok
brew install ngrok

# Start your dev server
npm run dev

# In another terminal, expose your local server
ngrok http 3000

# Use the ngrok URL for webhook configuration
# e.g., https://abc123.ngrok.io/api/webhooks/twilio
```