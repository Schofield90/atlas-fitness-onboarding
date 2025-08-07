#!/bin/bash

# Script to pull database schema using Prisma with Supabase

echo "🔍 Pulling database schema from Supabase..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please set it with your Supabase database connection string"
    exit 1
fi

# Use the DATABASE_URL from environment
npx prisma db pull

if [ $? -eq 0 ]; then
    echo "✅ Schema pulled successfully!"
    echo "📄 Check prisma/schema.prisma for the generated schema"
    
    # Generate Prisma Client
    echo "🔧 Generating Prisma Client..."
    npx prisma generate
    
    echo "✅ Prisma Client generated at lib/generated/prisma"
else
    echo "❌ Failed to pull schema"
    echo "Please check your DATABASE_URL environment variable"
fi