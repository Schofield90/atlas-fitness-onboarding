#!/bin/bash

# Environment Setup Script for AI-Powered Gym SaaS Platform
# This script helps create and validate environment configuration

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}   Environment Setup for AI-Powered Gym SaaS Platform        ${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_section() {
    echo -e "\n${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if .env.local exists
check_env_file() {
    if [ -f ".env.local" ]; then
        print_warning ".env.local already exists"
        echo -n "Do you want to backup and create a new one? (y/n): "
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            backup_file=".env.local.backup.$(date +%Y%m%d_%H%M%S)"
            cp .env.local "$backup_file"
            print_success "Backup created: $backup_file"
        else
            echo "Exiting without changes."
            exit 0
        fi
    fi
}

# Create .env.local from .env.example
create_env_file() {
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        print_success "Created .env.local from .env.example"
    else
        print_error ".env.example not found!"
        exit 1
    fi
}

# Generate secure random strings
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Update specific environment variables
update_env_var() {
    local key=$1
    local value=$2
    local file=".env.local"
    
    if grep -q "^${key}=" "$file"; then
        # Use a different delimiter for sed to handle special characters
        sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file" && rm "${file}.bak"
    else
        echo "${key}=${value}" >> "$file"
    fi
}

# Generate secure secrets
generate_secrets() {
    print_section "Generating Secure Secrets"
    
    local nextauth_secret=$(generate_secret)
    local jwt_secret=$(generate_secret)
    local encryption_key=$(generate_secret)
    local signing_key=$(generate_secret)
    local cron_secret=$(generate_secret)
    
    update_env_var "NEXTAUTH_SECRET" "$nextauth_secret"
    update_env_var "JWT_SECRET" "$jwt_secret"
    update_env_var "ENCRYPTION_KEY" "$encryption_key"
    update_env_var "SIGNING_KEY" "$signing_key"
    update_env_var "CRON_SECRET" "$cron_secret"
    
    print_success "Generated secure secrets"
}

# Interactive setup for critical services
setup_supabase() {
    print_section "Supabase Configuration"
    
    echo "Enter your Supabase project URL (e.g., https://xxxxx.supabase.co):"
    read -r supabase_url
    
    echo "Enter your Supabase anon key:"
    read -r supabase_anon_key
    
    echo "Enter your Supabase service role key:"
    read -r supabase_service_key
    
    if [[ -n "$supabase_url" && -n "$supabase_anon_key" && -n "$supabase_service_key" ]]; then
        update_env_var "NEXT_PUBLIC_SUPABASE_URL" "$supabase_url"
        update_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$supabase_anon_key"
        update_env_var "SUPABASE_SERVICE_ROLE_KEY" "$supabase_service_key"
        print_success "Supabase configuration updated"
    else
        print_warning "Skipping Supabase configuration (some values were empty)"
    fi
}

# Validate environment file
validate_env() {
    print_section "Validating Environment Configuration"
    
    local required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "NEXTAUTH_SECRET"
        "JWT_SECRET"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=your-" .env.local || ! grep -q "^${var}=" .env.local; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        print_success "All required variables are configured"
    else
        print_warning "The following required variables need configuration:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
    fi
}

# Create additional config files
create_config_files() {
    print_section "Creating Additional Configuration Files"
    
    # Create .env.test for testing
    if [ ! -f ".env.test" ]; then
        cat > .env.test << 'EOF'
# Test environment configuration
NODE_ENV=test
DATABASE_URL=postgresql://postgres:password@localhost:54322/test
SKIP_EMAIL_VERIFICATION=true
USE_TEST_PAYMENT_METHODS=true
EOF
        print_success "Created .env.test"
    fi
    
    # Create .env.production template
    if [ ! -f ".env.production" ]; then
        cat > .env.production << 'EOF'
# Production environment configuration template
# DO NOT COMMIT THIS FILE
NODE_ENV=production
# Add production values here
EOF
        print_success "Created .env.production template"
    fi
}

# Main execution
main() {
    print_header
    
    check_env_file
    create_env_file
    generate_secrets
    
    echo -e "\n${YELLOW}Interactive Setup${NC}"
    echo "Would you like to configure critical services now? (y/n):"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        setup_supabase
        # Add more interactive setups as needed
    fi
    
    create_config_files
    validate_env
    
    print_section "Next Steps"
    echo "1. Edit .env.local and add your service credentials"
    echo "2. Never commit .env.local to version control"
    echo "3. Use 'npm run dev' to start development server"
    echo "4. Run 'npm run validate-env' to check configuration"
    
    print_success "Environment setup complete!"
}

# Run main function
main