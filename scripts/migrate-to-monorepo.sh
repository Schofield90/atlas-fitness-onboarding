#!/bin/bash

# Atlas Fitness Monorepo Migration Script
# This script helps split the monolithic app into three separate Next.js apps

echo "🚀 Starting Atlas Fitness Monorepo Migration"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create base Next.js app structure for admin-portal
create_admin_portal() {
    echo -e "${YELLOW}Setting up Admin Portal...${NC}"

    # Create package.json for admin-portal
    cat > apps/admin-portal/package.json << 'EOF'
{
  "name": "@atlas-fitness/admin-portal",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.16",
    "react": "^18",
    "react-dom": "^18",
    "@atlas-fitness/shared-ui": "workspace:*",
    "@atlas-fitness/database": "workspace:*",
    "@atlas-fitness/auth": "workspace:*"
  }
}
EOF

    # Create next.config.js
    cat > apps/admin-portal/next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@atlas-fitness/shared-ui", "@atlas-fitness/database", "@atlas-fitness/auth"],
  env: {
    NEXT_PUBLIC_APP_TYPE: 'admin',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.gymleadhub.co.uk',
  },
}

module.exports = nextConfig
EOF

    # Create app directory structure
    mkdir -p apps/admin-portal/app
    mkdir -p apps/admin-portal/public

    echo -e "${GREEN}✅ Admin Portal structure created${NC}"
}

# Create base Next.js app structure for gym-dashboard
create_gym_dashboard() {
    echo -e "${YELLOW}Setting up Gym Dashboard...${NC}"

    # Create package.json for gym-dashboard
    cat > apps/gym-dashboard/package.json << 'EOF'
{
  "name": "@atlas-fitness/gym-dashboard",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.16",
    "react": "^18",
    "react-dom": "^18",
    "@atlas-fitness/shared-ui": "workspace:*",
    "@atlas-fitness/database": "workspace:*",
    "@atlas-fitness/auth": "workspace:*",
    "@atlas-fitness/redis": "workspace:*"
  }
}
EOF

    # Create next.config.js
    cat > apps/gym-dashboard/next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@atlas-fitness/shared-ui", "@atlas-fitness/database", "@atlas-fitness/auth", "@atlas-fitness/redis"],
  env: {
    NEXT_PUBLIC_APP_TYPE: 'gym',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_GYM_URL || 'https://login.gymleadhub.co.uk',
  },
}

module.exports = nextConfig
EOF

    # Create app directory structure
    mkdir -p apps/gym-dashboard/app
    mkdir -p apps/gym-dashboard/public

    echo -e "${GREEN}✅ Gym Dashboard structure created${NC}"
}

# Create base Next.js app structure for member-portal
create_member_portal() {
    echo -e "${YELLOW}Setting up Member Portal...${NC}"

    # Create package.json for member-portal
    cat > apps/member-portal/package.json << 'EOF'
{
  "name": "@atlas-fitness/member-portal",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3003",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.16",
    "react": "^18",
    "react-dom": "^18",
    "@atlas-fitness/shared-ui": "workspace:*",
    "@atlas-fitness/database": "workspace:*",
    "@atlas-fitness/auth": "workspace:*"
  }
}
EOF

    # Create next.config.js
    cat > apps/member-portal/next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@atlas-fitness/shared-ui", "@atlas-fitness/database", "@atlas-fitness/auth"],
  env: {
    NEXT_PUBLIC_APP_TYPE: 'member',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_MEMBER_URL || 'https://members.gymleadhub.co.uk',
  },
}

module.exports = nextConfig
EOF

    # Create app directory structure
    mkdir -p apps/member-portal/app
    mkdir -p apps/member-portal/public

    echo -e "${GREEN}✅ Member Portal structure created${NC}"
}

# Create shared packages
create_shared_packages() {
    echo -e "${YELLOW}Creating shared packages...${NC}"

    # shared-ui package
    cat > packages/shared-ui/package.json << 'EOF'
{
  "name": "@atlas-fitness/shared-ui",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "react": "^18",
    "react-dom": "^18"
  }
}
EOF

    # database package
    cat > packages/database/package.json << 'EOF'
{
  "name": "@atlas-fitness/database",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@supabase/supabase-js": "*"
  }
}
EOF

    # auth package
    cat > packages/auth/package.json << 'EOF'
{
  "name": "@atlas-fitness/auth",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@supabase/supabase-js": "*"
  }
}
EOF

    # redis package
    cat > packages/redis/package.json << 'EOF'
{
  "name": "@atlas-fitness/redis",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@upstash/redis": "*",
    "@upstash/ratelimit": "*"
  }
}
EOF

    echo -e "${GREEN}✅ Shared packages created${NC}"
}

# Update root package.json for workspaces
update_root_package_json() {
    echo -e "${YELLOW}Updating root package.json...${NC}"

    # Add workspaces configuration to existing package.json
    node -e '
    const fs = require("fs");
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    pkg.workspaces = [
      "apps/*",
      "packages/*"
    ];
    pkg.scripts = {
      ...pkg.scripts,
      "dev": "turbo run dev",
      "build": "turbo run build",
      "build:admin": "turbo run build --filter=@atlas-fitness/admin-portal",
      "build:gym": "turbo run build --filter=@atlas-fitness/gym-dashboard",
      "build:member": "turbo run build --filter=@atlas-fitness/member-portal",
      "dev:admin": "turbo run dev --filter=@atlas-fitness/admin-portal",
      "dev:gym": "turbo run dev --filter=@atlas-fitness/gym-dashboard",
      "dev:member": "turbo run dev --filter=@atlas-fitness/member-portal"
    };
    fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
    '

    echo -e "${GREEN}✅ Root package.json updated${NC}"
}

# Main execution
echo ""
echo "Creating app structures..."
create_admin_portal
create_gym_dashboard
create_member_portal

echo ""
echo "Creating shared packages..."
create_shared_packages

echo ""
echo "Updating configuration..."
update_root_package_json

echo ""
echo -e "${GREEN}✨ Monorepo structure created successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Move your existing code to the appropriate apps:"
echo "   - Admin routes → apps/admin-portal/app/"
echo "   - Dashboard routes → apps/gym-dashboard/app/"
echo "   - Client routes → apps/member-portal/app/"
echo ""
echo "2. Extract shared code to packages:"
echo "   - Components → packages/shared-ui/src/"
echo "   - DB utilities → packages/database/src/"
echo "   - Auth utilities → packages/auth/src/"
echo "   - Redis utilities → packages/redis/src/"
echo ""
echo "3. Install dependencies:"
echo "   npm install"
echo ""
echo "4. Run individual apps:"
echo "   npm run dev:admin    # Admin portal on :3002"
echo "   npm run dev:gym      # Gym dashboard on :3001"
echo "   npm run dev:member   # Member portal on :3003"
echo ""
echo "5. Deploy to Vercel:"
echo "   cd apps/admin-portal && vercel"
echo "   cd apps/gym-dashboard && vercel"
echo "   cd apps/member-portal && vercel"