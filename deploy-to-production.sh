#!/bin/bash

# Deploy Atlas Fitness Platform to Production
# This script deploys the current codebase to all production Vercel projects

echo "========================================="
echo "   DEPLOYING TO PRODUCTION DOMAINS"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to deploy to a specific project
deploy_project() {
    local PROJECT_NAME=$1
    local DOMAIN=$2

    echo -e "${YELLOW}Deploying to $PROJECT_NAME ($DOMAIN)...${NC}"

    # Remove existing .vercel folder to avoid conflicts
    rm -rf .vercel

    # Link to the project
    vercel link --yes --project=$PROJECT_NAME 2>/dev/null || {
        echo -e "${RED}Failed to link to $PROJECT_NAME${NC}"
        return 1
    }

    # Deploy to production
    vercel --prod --yes 2>&1 | tail -5

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully deployed to $DOMAIN${NC}"
    else
        echo -e "${RED}✗ Failed to deploy to $DOMAIN${NC}"
    fi

    echo ""
}

# Deploy to each production project
echo "Starting deployments..."
echo ""

# Deploy to members portal
deploy_project "atlas-member-portal" "members.gymleadhub.co.uk"

# Deploy to gym dashboard (login portal)
deploy_project "atlas-gym-dashboard" "login.gymleadhub.co.uk"

# Deploy to admin portal
deploy_project "atlas-admin-portal" "admin.gymleadhub.co.uk"

echo "========================================="
echo "   DEPLOYMENT COMPLETE"
echo "========================================="
echo ""
echo "Please verify the following URLs:"
echo "  - https://members.gymleadhub.co.uk"
echo "  - https://login.gymleadhub.co.uk"
echo "  - https://admin.gymleadhub.co.uk"
echo ""