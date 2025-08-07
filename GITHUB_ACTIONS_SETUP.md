# GitHub Actions CI/CD Setup Guide

## 🚀 Overview

This project includes comprehensive CI/CD pipelines using GitHub Actions for:
- Continuous Integration (testing, linting, security checks)
- Database health monitoring
- Automated deployments to Vercel

## 📋 Workflows

### 1. **Continuous Integration** (`.github/workflows/ci.yml`)
Runs on every push and pull request:
- ✅ TypeScript type checking
- ✅ ESLint code quality
- ✅ Jest test suite
- ✅ Security validation
- ✅ Migration validation
- ✅ Build verification

### 2. **Database Health Check** (`.github/workflows/database-health.yml`)
Runs daily at 9 AM UTC:
- 📊 Generates database health report
- 🏥 Checks health score threshold
- 📈 Monitors table sizes and performance
- 🔐 Validates security policies

### 3. **Deploy to Vercel** (`.github/workflows/deploy.yml`)
Runs on push to main branch:
- 🚀 Automated production deployments
- 🧪 Post-deployment smoke tests
- ✅ Zero-downtime deployments

## 🔧 Setup Instructions

### Step 1: Add GitHub Secrets

Go to your repository Settings → Secrets and variables → Actions, then add:

#### Required for CI:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Required for Vercel Deployment:
```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
```

### Step 2: Get Vercel Tokens

1. **Get Vercel Token**:
   - Go to https://vercel.com/account/tokens
   - Create a new token with full access
   - Copy and save as `VERCEL_TOKEN` secret

2. **Get Vercel IDs**:
   ```bash
   # In your project directory
   vercel link
   
   # This creates .vercel/project.json with:
   # - orgId (save as VERCEL_ORG_ID)
   # - projectId (save as VERCEL_PROJECT_ID)
   ```

### Step 3: Enable GitHub Actions

1. Go to repository Settings → Actions → General
2. Under "Actions permissions", select "Allow all actions"
3. Under "Workflow permissions", select "Read and write permissions"

## 🎯 Branch Protection Rules

To enforce CI checks, set up branch protection:

1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable these requirements:
   - ✅ Require status checks to pass:
     - TypeScript Check
     - ESLint Check
     - Run Tests
     - Security Validation
     - Build Check
   - ✅ Require branches to be up to date
   - ✅ Require pull request reviews
   - ✅ Dismiss stale reviews
   - ✅ Include administrators

## 📊 Monitoring

### CI Status Badge
Add to your README.md:
```markdown
[![CI](https://github.com/YOUR_USERNAME/atlas-fitness-onboarding/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/atlas-fitness-onboarding/actions/workflows/ci.yml)
```

### Database Health Badge
```markdown
[![Database Health](https://github.com/YOUR_USERNAME/atlas-fitness-onboarding/actions/workflows/database-health.yml/badge.svg)](https://github.com/YOUR_USERNAME/atlas-fitness-onboarding/actions/workflows/database-health.yml)
```

## 🔍 Debugging Failed Workflows

### Common Issues:

1. **"Error: No such secret"**
   - Ensure all secrets are added in repository settings
   - Check secret names match exactly (case-sensitive)

2. **"Build failed"**
   - Check if all environment variables are set
   - Review build logs for missing dependencies

3. **"Tests failed"**
   - Tests may need different environment setup
   - Check if test database is accessible

4. **"Vercel deployment failed"**
   - Verify Vercel token is valid
   - Check project is linked with `vercel link`

### View Logs:
1. Go to Actions tab in your repository
2. Click on the failed workflow run
3. Click on the failed job
4. Expand steps to see detailed logs

## 🚀 Advanced Features

### Manual Deployment
Trigger deployment manually:
1. Go to Actions tab
2. Select "Deploy to Vercel" workflow
3. Click "Run workflow"
4. Select branch and click "Run"

### Scheduled Health Checks
Modify schedule in `database-health.yml`:
```yaml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
```

### Slack Notifications
Add Slack notifications for failed builds:
```yaml
- name: Notify Slack on Failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 📝 Best Practices

1. **Keep secrets secure**: Never commit secrets to code
2. **Test locally first**: Run `npm test` before pushing
3. **Use pull requests**: Let CI catch issues before merging
4. **Monitor health reports**: Check daily health reports
5. **Review logs**: Learn from CI failures

## 🎉 Next Steps

1. Push code to trigger your first CI run
2. Create a pull request to test the full workflow
3. Monitor the Actions tab for results
4. Celebrate your automated CI/CD pipeline! 🎊