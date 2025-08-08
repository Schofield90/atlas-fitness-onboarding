#!/bin/bash

# Atlas Fitness Mobile Backend Setup Script
# This script automates the Supabase backend setup for the mobile app

echo "🚀 Atlas Fitness Mobile Backend Setup"
echo "===================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Function to check if logged in
check_supabase_auth() {
    if ! supabase projects list &> /dev/null; then
        echo "📝 Please log in to Supabase:"
        supabase login
    fi
}

# Function to run migration
run_migration() {
    local migration_file=$1
    local description=$2
    
    echo "📄 Running migration: $description"
    if [ -f "supabase/migrations/$migration_file" ]; then
        supabase db push --file "supabase/migrations/$migration_file"
        if [ $? -eq 0 ]; then
            echo "✅ $description completed successfully"
        else
            echo "❌ Error running $description"
            exit 1
        fi
    else
        echo "⚠️  Migration file not found: $migration_file"
    fi
}

# Function to deploy edge function
deploy_function() {
    local function_name=$1
    
    echo "🚀 Deploying function: $function_name"
    if [ -d "supabase/functions/$function_name" ]; then
        supabase functions deploy "$function_name"
        if [ $? -eq 0 ]; then
            echo "✅ $function_name deployed successfully"
        else
            echo "❌ Error deploying $function_name"
        fi
    else
        echo "⚠️  Function not found: $function_name"
    fi
}

# Main setup flow
main() {
    # Check authentication
    check_supabase_auth
    
    # Link project if not already linked
    if [ ! -f "supabase/.gitignore" ]; then
        echo "🔗 Please link your Supabase project:"
        read -p "Enter your project reference ID: " project_ref
        supabase link --project-ref "$project_ref"
    fi
    
    echo ""
    echo "📊 Running Database Migrations..."
    echo "---------------------------------"
    
    # Run migrations in order
    run_migration "20250808_magic_links.sql" "Magic Links Authentication"
    run_migration "20250108_mobile_app_schema.sql" "Mobile App Core Schema"
    run_migration "20250108_mobile_notifications_messaging.sql" "Notifications & Messaging"
    
    echo ""
    echo "☁️  Deploying Edge Functions..."
    echo "------------------------------"
    
    # Deploy edge functions
    deploy_function "mobile-api"
    deploy_function "send-push-notification"
    deploy_function "qr-check-in"
    deploy_function "mobile-stripe-checkout"
    
    echo ""
    echo "🔐 Setting Environment Variables..."
    echo "-----------------------------------"
    
    # Check if user wants to set env vars
    read -p "Do you want to set environment variables now? (y/n): " set_env
    
    if [ "$set_env" = "y" ]; then
        # Stripe
        read -p "Enter Stripe Secret Key (sk_live_xxx): " stripe_secret
        if [ ! -z "$stripe_secret" ]; then
            supabase secrets set STRIPE_SECRET_KEY="$stripe_secret"
        fi
        
        read -p "Enter Stripe Publishable Key (pk_live_xxx): " stripe_pub
        if [ ! -z "$stripe_pub" ]; then
            supabase secrets set STRIPE_PUBLISHABLE_KEY="$stripe_pub"
        fi
        
        # Twilio (optional)
        read -p "Enter Twilio Account SID (optional): " twilio_sid
        if [ ! -z "$twilio_sid" ]; then
            supabase secrets set TWILIO_ACCOUNT_SID="$twilio_sid"
            
            read -p "Enter Twilio Auth Token: " twilio_auth
            supabase secrets set TWILIO_AUTH_TOKEN="$twilio_auth"
            
            read -p "Enter Twilio SMS From Number: " twilio_from
            supabase secrets set TWILIO_SMS_FROM="$twilio_from"
        fi
    fi
    
    echo ""
    echo "🎉 Setup Complete!"
    echo "=================="
    echo ""
    echo "Next steps:"
    echo "1. Create storage buckets in Supabase Dashboard"
    echo "2. Enable realtime for required tables"
    echo "3. Configure push notification certificates"
    echo "4. Update mobile app environment variables"
    echo "5. Test the API endpoints"
    echo ""
    echo "📚 See supabase/README_MOBILE_BACKEND.md for detailed instructions"
}

# Run main function
main