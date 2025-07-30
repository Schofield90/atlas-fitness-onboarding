# Vercel CLI Optimization Guide

This guide explains how to use the optimized Vercel CLI setup for faster deployments (30-60 seconds instead of 2+ minutes).

## 🚀 Quick Start

1. **Install Vercel CLI globally** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Link your project** (one-time setup):
   ```bash
   npm run vercel:link
   ```

3. **Pull environment variables**:
   ```bash
   npm run vercel:env:pull
   ```

## 📋 Available Commands

### Development
- `npm run dev` - Standard Next.js dev server
- `npm run dev:turbo` - Turbopack dev server (faster HMR)
- `npm run dev:quick` - Turbopack with increased memory limit
- `npm run vercel:dev` - Run with Vercel CLI (serverless functions)

### Deployment
- `npm run vercel:preview` - Quick preview deployment (30-60s)
- `npm run vercel:deploy` - Production deployment
- `npm run workflow` - Interactive deployment workflow

### Building
- `npm run build` - Standard build
- `npm run build:fast` - Optimized build with more memory
- `npm run build:analyze` - Build with bundle analyzer

### Utilities
- `npm run clean` - Clear build cache
- `npm run clean:all` - Full reset (node_modules + cache)
- `npm run typecheck` - Fast TypeScript checking
- `npm run lint:fix` - Auto-fix linting issues
- `npm run test:api` - Quick API endpoint testing

## 🎮 Interactive Workflow

Run the interactive deployment workflow:
```bash
npm run workflow
```

This provides a menu-driven interface for:
1. Quick Deploy (Preview URL)
2. Production Deploy
3. Pull Environment Variables
4. Run Type Check
5. Test API Endpoint
6. Clean Build Cache
7. Setup New Feature Branch
8. Check Deployment Status

## ⚡ Performance Tips

### 1. Use Turbopack for Development
```bash
npm run dev:turbo
```
- Faster hot module replacement
- Better memory management
- Quicker initial builds

### 2. Preview Deployments for Testing
```bash
npm run vercel:preview
```
- Creates unique preview URL
- Faster than production deploys
- Perfect for testing changes

### 3. Clean Cache When Slow
```bash
npm run clean
```
- Removes .next directory
- Clears node_modules cache
- Fixes most build issues

### 4. Monitor Bundle Size
```bash
npm run build:analyze
```
- Generates bundle analysis
- Identifies large dependencies
- Helps optimize performance

## 🛠️ Configuration Details

### vercel.json Optimizations
- **Region**: `lhr1` (London) for UK users
- **Build Command**: Uses optimized build script
- **Function Configuration**: 
  - Standard APIs: 30s timeout, 1GB memory
  - Calendar sync: 60s timeout, 1.5GB memory
  - AI endpoints: 45s timeout, 1.5GB memory
- **Caching**: Aggressive caching for static assets
- **GitHub Integration**: Silent mode, auto job cancellation

### Next.js Optimizations
- **SWC Minification**: Faster builds
- **Package Optimization**: For common dependencies
- **Webpack Splitting**: Better code splitting
- **Image Optimization**: AVIF and WebP formats

## 🔧 Troubleshooting

### Slow Builds
1. Run `npm run clean:all`
2. Delete `.vercel` directory
3. Run `npm install`
4. Try building again

### Environment Variables Not Working
1. Run `npm run vercel:env:pull`
2. Check `.env.local` exists
3. Restart dev server

### TypeScript Errors
1. Run `npm run typecheck`
2. Fix any errors shown
3. Use incremental type checking

### Memory Issues
1. Use `npm run dev:quick` (includes memory flag)
2. Close other applications
3. Increase Node memory limit in package.json

## 📱 Development Tools

The project includes a DevTools component (development only):
- Press `Cmd+Shift+D` to open
- Check environment variables
- Test API endpoints
- Monitor performance
- Clear caches

## 🚀 Deployment Workflow

### For Quick Testing
```bash
git add .
git commit -m "feat: your feature"
npm run vercel:preview
```

### For Production
```bash
npm run typecheck
npm run lint
npm run build:fast
npm run vercel:deploy
```

### Using Interactive Workflow
```bash
npm run workflow
# Select option 1 for preview
# Select option 2 for production
```

## 📊 Performance Metrics

With these optimizations, you should see:
- **Preview Deployments**: 30-60 seconds
- **Production Deployments**: 60-90 seconds
- **Local Dev Start**: 5-10 seconds
- **HMR Updates**: <1 second
- **Type Checking**: 2-5 seconds (incremental)

## 🎯 Best Practices

1. **Use Preview Deployments** for all feature testing
2. **Only deploy to production** for tested features
3. **Run type checks** before committing
4. **Clean cache weekly** or when experiencing issues
5. **Monitor bundle size** with analyze command
6. **Use the workflow script** for guided deployments

## 📚 Additional Resources

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Turbopack Documentation](https://turbo.build/pack)

---

For issues or questions, check the main CLAUDE.md file or open an issue on GitHub.