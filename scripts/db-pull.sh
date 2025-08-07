#!/bin/bash

# Script to pull database schema using Prisma with Supabase

echo "🔍 Pulling database schema from Supabase..."

# Use the direct database URL
DATABASE_URL="postgresql://postgres:OGFYlxSChyYLgQxn@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres" \
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
    echo "Try alternative connection strings:"
    echo "1. With SSL: postgresql://postgres:OGFYlxSChyYLgQxn@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres?sslmode=require"
    echo "2. Pooled: postgresql://postgres.lzlrojoaxrqvmhempnkn:OGFYlxSChyYLgQxn@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
fi