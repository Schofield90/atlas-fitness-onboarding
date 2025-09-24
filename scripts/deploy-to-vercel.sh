#!/bin/bash

# Atlas Fitness - Deploy to 3 Separate Vercel Projects
# This script deploys each app as an independent Vercel project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Atlas Fitness - Vercel Multi-App Deployment${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to check if user is logged into Vercel
check_vercel_auth() {
    echo -e "${YELLOW}Checking Vercel authentication...${NC}"
    if ! vercel whoami &>/dev/null; then
        echo -e "${RED}Not logged into Vercel. Please run: vercel login${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Authenticated with Vercel${NC}"
    echo ""
}

# Function to read environment variables from .env.local
load_env_vars() {
    if [ -f ".env.local" ]; then
        echo -e "${YELLOW}Loading environment variables from .env.local...${NC}"
        export $(cat .env.local | grep -v '^#' | xargs)
        echo -e "${GREEN}✓ Environment variables loaded${NC}"
    else
        echo -e "${RED}Warning: .env.local not found in root directory${NC}"
    fi
    echo ""
}

# Function to deploy an app
deploy_app() {
    local APP_NAME=$1
    local APP_DIR=$2
    local PROJECT_NAME=$3
    local CUSTOM_DOMAIN=$4

    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Deploying ${APP_NAME}${NC}"
    echo -e "${BLUE}========================================${NC}"

    cd "$APP_DIR"

    # Check if .vercel directory exists (already linked)
    if [ -d ".vercel" ]; then
        echo -e "${YELLOW}Project already linked. Deploying to existing project...${NC}"

        # Deploy to production
        echo -e "${YELLOW}Deploying to production...${NC}"
        vercel --prod --yes
    else
        echo -e "${YELLOW}Initializing new Vercel project: ${PROJECT_NAME}${NC}"

        # Create new project with specific name
        vercel link --yes --project="${PROJECT_NAME}"

        # Set environment variables
        echo -e "${YELLOW}Setting environment variables...${NC}"

        # Common variables for all apps
        vercel env add NEXT_PUBLIC_SUPABASE_URL production < <(echo "$NEXT_PUBLIC_SUPABASE_URL")
        vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production < <(echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY")
        vercel env add SUPABASE_SERVICE_ROLE_KEY production < <(echo "$SUPABASE_SERVICE_ROLE_KEY")

        # App-specific environment variables
        if [ "$APP_NAME" = "Gym Dashboard" ]; then
            echo -e "${YELLOW}Adding Redis and other API keys for Gym Dashboard...${NC}"
            vercel env add UPSTASH_REDIS_REST_URL production < <(echo "$UPSTASH_REDIS_REST_URL")
            vercel env add UPSTASH_REDIS_REST_TOKEN production < <(echo "$UPSTASH_REDIS_REST_TOKEN")

            if [ ! -z "$TWILIO_ACCOUNT_SID" ]; then
                vercel env add TWILIO_ACCOUNT_SID production < <(echo "$TWILIO_ACCOUNT_SID")
                vercel env add TWILIO_AUTH_TOKEN production < <(echo "$TWILIO_AUTH_TOKEN")
                vercel env add TWILIO_WHATSAPP_FROM production < <(echo "$TWILIO_WHATSAPP_FROM")
            fi

            if [ ! -z "$OPENAI_API_KEY" ]; then
                vercel env add OPENAI_API_KEY production < <(echo "$OPENAI_API_KEY")
            fi

            if [ ! -z "$META_APP_ID" ]; then
                vercel env add META_APP_ID production < <(echo "$META_APP_ID")
                vercel env add META_APP_SECRET production < <(echo "$META_APP_SECRET")
                vercel env add META_CONFIG_ID production < <(echo "$META_CONFIG_ID")
                vercel env add META_PHONE_NUMBER_ID production < <(echo "$META_PHONE_NUMBER_ID")
                vercel env add META_WEBHOOK_TOKEN production < <(echo "$META_WEBHOOK_TOKEN")
                vercel env add META_BUSINESS_ACCOUNT_ID production < <(echo "$META_BUSINESS_ACCOUNT_ID")
            fi
        fi

        # Initial deployment
        echo -e "${YELLOW}Performing initial deployment...${NC}"
        vercel --prod --yes
    fi

    # Get deployment URL
    DEPLOYMENT_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "")

    if [ ! -z "$DEPLOYMENT_URL" ]; then
        echo -e "${GREEN}✓ Deployed to: https://${DEPLOYMENT_URL}${NC}"
    fi

    # Add custom domain if not already added
    if [ ! -z "$CUSTOM_DOMAIN" ]; then
        echo -e "${YELLOW}Setting up custom domain: ${CUSTOM_DOMAIN}${NC}"
        vercel domains add "$CUSTOM_DOMAIN" "$PROJECT_NAME" 2>/dev/null || echo "Domain may already be configured"
    fi

    cd - > /dev/null
    echo ""
}

# Main execution
main() {
    check_vercel_auth
    load_env_vars

    # Deploy all three apps
    deploy_app "Admin Portal" "apps/admin-portal" "atlas-admin" "admin.gymleadhub.co.uk"
    deploy_app "Gym Dashboard" "apps/gym-dashboard" "atlas-gym-dashboard" "login.gymleadhub.co.uk"
    deploy_app "Member Portal" "apps/member-portal" "atlas-member-portal" "members.gymleadhub.co.uk"

    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}   All deployments completed successfully!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Configure DNS records for custom domains:"
    echo "   - admin.gymleadhub.co.uk → cname.vercel-dns.com"
    echo "   - login.gymleadhub.co.uk → cname.vercel-dns.com"
    echo "   - members.gymleadhub.co.uk → cname.vercel-dns.com"
    echo ""
    echo "2. View your projects at:"
    echo "   - https://vercel.com/dashboard/projects"
    echo ""
    echo "3. Monitor deployments with:"
    echo "   - vercel ls (in each app directory)"
    echo ""
}

# Run main function
main