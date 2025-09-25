# Admin Portal Deployment Guide

## 🎯 Overview

The Atlas Admin Portal is deployed as a separate Vercel project to maintain complete isolation from the gym owner and member portals.

- **Project Name**: atlas-admin-portal
- **URL**: https://admin.gymleadhub.co.uk
- **Vercel Project**: https://vercel.com/schofield90s-projects/atlas-admin-portal

## 🚀 Deployment Methods

### Method 1: Automatic GitHub Deployment

1. Push changes to main branch:

```bash
git add .
git commit -m "Update admin portal"
git push origin main
```

2. Vercel will automatically deploy when changes are pushed to main branch

### Method 2: Manual CLI Deployment

1. Install Vercel CLI if needed:

```bash
npm i -g vercel
```

2. Run the deployment script:

```bash
./deploy-admin.sh
```

### Method 3: Vercel Dashboard

1. Go to: https://vercel.com/schofield90s-projects/atlas-admin-portal
2. Click "Redeploy"
3. Select the latest commit from main branch

## 🔧 Required Environment Variables

Set these in the Vercel dashboard under Project Settings > Environment Variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://lzlrojoaxrqvmhempnkn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# App Configuration
NEXT_PUBLIC_APP_TYPE=admin
NEXT_PUBLIC_BASE_URL=https://admin.gymleadhub.co.uk
NEXT_PUBLIC_APP_MODE=admin

# Database (if using direct connection)
POSTGRES_URL=your_postgres_url
POSTGRES_URL_NON_POOLING=your_non_pooling_url

# Optional: Analytics, Monitoring, etc.
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

## 📁 Project Structure

```
atlas-fitness-onboarding/
├── app/
│   ├── (admin)/          # Admin portal pages (authenticated)
│   │   └── admin/
│   │       ├── dashboard/
│   │       ├── organizations/
│   │       ├── billing/
│   │       └── settings/
│   ├── signin/           # Admin signin page (public)
│   └── api/
│       └── admin/        # Admin API routes
├── vercel.admin.json     # Admin portal Vercel config
└── deploy-admin.sh       # Deployment script
```

## 🔐 Authentication Flow

1. User visits `https://admin.gymleadhub.co.uk`
2. Middleware checks authentication
3. If not authenticated → redirect to `/signin`
4. User signs in with @gymleadhub.co.uk email
5. System verifies `super_admin_users` table
6. On success → redirect to `/admin/dashboard`

## 🌐 Domain Configuration

### In Vercel Dashboard:

1. Go to Project Settings > Domains
2. Add domain: `admin.gymleadhub.co.uk`
3. Configure DNS:

```
Type: CNAME
Name: admin
Value: cname.vercel-dns.com
```

Or for A records:

```
Type: A
Name: admin
Value: 76.76.21.21
```

### SSL Certificate

Vercel automatically provisions SSL certificates. Wait 5-10 minutes after adding the domain.

## 🧪 Testing Deployment

1. **Check deployment status**:

```bash
vercel ls --scope=schofield90s-projects
```

2. **View logs**:

```bash
vercel logs atlas-admin-portal --scope=schofield90s-projects
```

3. **Test endpoints**:

```bash
# Health check
curl https://admin.gymleadhub.co.uk/api/health-check

# Sign in page
curl -I https://admin.gymleadhub.co.uk/signin
```

## 🐛 Troubleshooting

### Issue: 404 on admin.gymleadhub.co.uk

**Solution**: Check domain configuration in Vercel dashboard

### Issue: "Invalid login credentials"

**Solution**: Ensure user has @gymleadhub.co.uk email and is in `super_admin_users` table

### Issue: Redirect loops

**Solution**: Clear cookies and check middleware configuration

### Issue: Build fails

**Solution**: Check build logs in Vercel dashboard:

```bash
vercel logs atlas-admin-portal --scope=schofield90s-projects --output=raw
```

## 📊 Monitoring

1. **Vercel Analytics**: Built-in analytics in Vercel dashboard
2. **Function Logs**: Monitor API route performance
3. **Error Tracking**: Set up Sentry or similar for production

## 🔄 Rollback

If deployment causes issues:

1. **Via Dashboard**:
   - Go to Deployments tab
   - Find previous working deployment
   - Click "..." menu → "Promote to Production"

2. **Via CLI**:

```bash
# List deployments
vercel ls atlas-admin-portal --scope=schofield90s-projects

# Rollback to specific deployment
vercel rollback <deployment-url> --scope=schofield90s-projects
```

## 📝 Important Notes

- Always test locally first: `npm run dev`
- Admin portal is completely separate from gym owner portal
- Only @gymleadhub.co.uk emails can access admin portal
- Keep `vercel.admin.json` updated with any new routes
- Monitor deployment status at: https://vercel.com/schofield90s-projects/atlas-admin-portal

## 🆘 Support

- Vercel Status: https://www.vercel-status.com
- Vercel Docs: https://vercel.com/docs
- Project Dashboard: https://vercel.com/schofield90s-projects/atlas-admin-portal
