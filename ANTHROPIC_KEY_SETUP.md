# Add Anthropic API Key to Vercel

## Problem
Webhook failing with "Connection error" because ANTHROPIC_API_KEY is missing from production.

## API Key
```
sk-ant-api03-RgDDqGsxhGQkCZXZHEygD2K9d8B8wZVKq_yoH1TjDPqpn39H3Hme9rq0YOx8_qMDrYT4p5mnNzGDMr9FWGm6mA-u0mGfQAA
```

## Steps

### Option 1: Via Vercel CLI (Fastest)
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Add to all 3 projects
vercel env add ANTHROPIC_API_KEY production

# Paste the API key when prompted
# Repeat for each project:
# - atlas-fitness-onboarding (admin)
# - gym-dashboard
# - member-portal

# Trigger redeploy
vercel --prod
```

### Option 2: Via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. For **each of the 3 projects**:
   - Click on project name
   - Go to Settings → Environment Variables
   - Click "Add New"
   - Key: `ANTHROPIC_API_KEY`
   - Value: (paste API key above)
   - Environment: **Production**
   - Click "Save"
3. Redeploy each project:
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

### Projects to Update
1. **atlas-fitness-onboarding** (admin.gymleadhub.co.uk)
2. **gym-dashboard** (login.gymleadhub.co.uk) ← MOST IMPORTANT (webhook runs here)
3. **member-portal** (members.gymleadhub.co.uk)

## Verify It Works
After redeploying, trigger the GHL webhook again. You should see:
- ✅ Guardrails checked
- ✅ AI agent executes successfully
- ✅ Response generated
- ✅ Message sent to lead

## Model Configuration
- Model name: `claude-sonnet-4-5` (automatically expands to `claude-sonnet-4-5-20250929`)
- Max tokens: 8192
- Temperature: 1.0
- Provider: Anthropic
