# 🚀 Quick Start - Fast Local Development

## Fastest Method (Recommended)

1. **One-time setup:**
   ```bash
   # Install Vercel CLI globally
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Link to your project
   vercel link
   ```

2. **Daily development:**
   ```bash
   # Pull latest env vars and start dev server
   npm run dev:fast
   ```

   This syncs your Vercel environment variables and starts the Turbopack dev server.
   
   **Result:** Hot reload in < 1 second, no 3-minute deployments!

## Alternative Methods

### Method 1: Docker (Isolated Environment)
```bash
# First time only
npm run dev:setup

# Choose option 1 for Docker
```

### Method 2: Direct Vercel Dev
```bash
# Uses Vercel's dev server
npm run vercel:dev
```

### Method 3: Manual Setup
```bash
# Pull env vars
vercel env pull .env.local

# Start dev server
npm run dev:turbo
```

## Available Scripts

- `npm run dev:fast` - Sync env + start Turbopack (fastest)
- `npm run dev:turbo` - Just Turbopack dev server
- `npm run dev:sync` - Just sync Vercel env vars
- `npm run dev:docker` - Run in Docker container
- `npm run dev:setup` - Interactive setup wizard

## Testing Changes

Once running locally:
1. Open http://localhost:3000
2. Make changes - they appear instantly
3. Test with real Vercel environment data
4. Only deploy when ready

## Tips

- Use `dev:fast` for 99% of development
- Docker is useful for testing production-like builds
- Always sync env vars if you've made Vercel changes
- Clear Next.js cache with `npm run clean` if issues arise