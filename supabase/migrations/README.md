# Supabase Migration Instructions

## Running the Multi-Tenant CRM Migration

There are two migration files available:

1. **Complete Migration**: `/supabase/migrations/0001_complete_multi_tenant_schema.sql`
   - Use this if you're starting fresh or want to recreate all tables

2. **Partial Migration**: `/supabase/migrations/0002_missing_tables.sql`
   - Use this if you already have some tables and only need to add the missing ones
   - This migration only creates tables that don't exist yet

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the entire contents of `0001_complete_multi_tenant_schema.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the migration

**Note**: If you get timeout errors, you may need to run the migration in sections:
- Extensions and Core Tables (lines 1-89)
- CRM Tables (lines 90-172)
- Booking System Tables (lines 173-192)
- Staff & Payroll Tables (lines 193-228)
- Communication Tables (lines 229-273)
- Workflow Tables (lines 274-298)
- Integration & Analytics Tables (lines 299-358)
- Indexes (lines 359-410)
- RLS Policies (lines 411-551)
- Triggers and Functions (lines 552-732)

### Option 2: Using Supabase CLI (Requires Access Token)

1. First, get your access token from: https://supabase.com/dashboard/account/tokens
2. Set the token:
   ```bash
   export SUPABASE_ACCESS_TOKEN=your-token-here
   ```
3. Link to your project:
   ```bash
   supabase link --project-ref lzlrojoaxrqvmhempnkn
   ```
4. Run the migration:
   ```bash
   supabase db push
   ```

### Option 3: Using Direct Database Connection

If you have direct database access, you can use psql:

```bash
psql "postgresql://postgres:[YOUR-DATABASE-PASSWORD]@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres" -f supabase/migrations/0001_complete_multi_tenant_schema.sql
```

## Migration Contents

This migration creates:

### Core Tables
- `organizations` - Multi-tenant organizations
- `users` - User accounts
- `organization_members` - User-organization relationships

### CRM Tables
- `leads` - Lead management
- `clients` - Customer records
- `opportunities` - Sales pipeline

### Booking System
- `classes` - Class/service definitions
- `class_sessions` - Scheduled sessions
- `bookings` - Customer bookings

### Staff & Payroll
- `staff` - Staff members
- `timesheets` - Time tracking
- `payroll_batches` - Payroll processing

### Communication
- `messages` - All communications
- `email_templates` - Email templates

### Automation
- `workflows` - Automation workflows
- `workflow_executions` - Execution history

### Integrations
- `webhooks` - Webhook configurations
- `integration_tokens` - OAuth tokens

### Analytics
- `analytics_events` - Event tracking
- `daily_metrics` - Aggregated metrics
- `audit_logs` - Audit trail

### Key Features
- Full Row Level Security (RLS) for multi-tenancy
- Automatic timestamp triggers
- Audit logging for sensitive operations
- Performance indexes on all foreign keys
- Helper functions for common operations

## Post-Migration Steps

1. **Verify the migration**:
   - Check that all tables were created
   - Verify RLS policies are active
   - Test basic queries

2. **Set up initial data**:
   ```sql
   -- Demo organization is created automatically
   -- Add yourself as an admin:
   INSERT INTO organization_members (user_id, org_id, role)
   VALUES (
     (SELECT id FROM users WHERE email = 'your-email@example.com'),
     '00000000-0000-0000-0000-000000000001',
     'owner'
   );
   ```

3. **Configure environment variables** in Vercel:
   - All Supabase keys
   - Stripe keys for billing
   - Twilio keys for messaging
   - Other integration keys as needed

## Troubleshooting

### Common Issues

1. **"permission denied for schema public"**
   - Make sure you're using the service role key
   - Or run the migration in the Supabase dashboard

2. **"relation already exists"**
   - Some tables may already exist from previous migrations
   - You can add `IF NOT EXISTS` to CREATE TABLE statements

3. **Timeout errors**
   - Break the migration into smaller chunks
   - Run each section separately

4. **RLS policy conflicts**
   - Drop existing policies first if needed:
   ```sql
   DROP POLICY IF EXISTS "policy_name" ON table_name;
   ```

### Getting Help

If you encounter issues:
1. Check the Supabase logs in the dashboard
2. Verify your database connection
3. Ensure you have the correct permissions
4. Try running smaller portions of the migration

## Next Steps

After running the migration:
1. Test the service layer functionality
2. Create frontend components
3. Set up API routes
4. Configure webhooks
5. Import sample data for testing