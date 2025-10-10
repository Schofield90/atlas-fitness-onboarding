#!/usr/bin/env node
/**
 * Sync AI Agent Tools to Database
 * One-time script to populate ai_agent_tools table with all available tools from the registry
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// All available tools (matching the registry)
const tools = [
  // Analytics Tools
  {
    id: 'generate_revenue_report',
    name: 'Generate Revenue Report',
    description: 'Generate comprehensive revenue report with breakdown by month/year, including trends, comparisons, and payment method analysis',
    category: 'analytics',
    parameters_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
        groupBy: { type: 'string', enum: ['day', 'week', 'month', 'year'], default: 'month' },
        includeBreakdown: { type: 'boolean', default: true }
      },
      required: ['startDate', 'endDate']
    },
    requires_permission: 'reports:read',
    is_system: true,
    enabled: true
  },
  {
    id: 'generate_monthly_turnover_report',
    name: 'Generate Monthly Turnover Report',
    description: 'Generate detailed monthly turnover report with category breakdown, trends, and year-over-year comparisons',
    category: 'analytics',
    parameters_schema: {
      type: 'object',
      properties: {
        months: { type: 'number', default: 12, description: 'Number of months to include' },
        includeComparison: { type: 'boolean', default: true, description: 'Include year-over-year comparison' }
      },
      required: []
    },
    requires_permission: 'reports:read',
    is_system: true,
    enabled: true
  },
  {
    id: 'calculate_mrr',
    name: 'Calculate MRR',
    description: 'Calculate Monthly Recurring Revenue (MRR) with breakdown by plan type and growth metrics',
    category: 'analytics',
    parameters_schema: {
      type: 'object',
      properties: {
        asOfDate: { type: 'string', description: 'Calculate MRR as of this date (YYYY-MM-DD), defaults to today' }
      },
      required: []
    },
    requires_permission: 'reports:read',
    is_system: true,
    enabled: true
  },
  {
    id: 'calculate_arr',
    name: 'Calculate ARR',
    description: 'Calculate Annual Recurring Revenue (ARR) with growth trends and projections',
    category: 'analytics',
    parameters_schema: {
      type: 'object',
      properties: {
        asOfDate: { type: 'string', description: 'Calculate ARR as of this date (YYYY-MM-DD), defaults to today' }
      },
      required: []
    },
    requires_permission: 'reports:read',
    is_system: true,
    enabled: true
  },
  {
    id: 'generate_churn_report',
    name: 'Generate Churn Report',
    description: 'Analyze customer churn rate, identify churned customers, and calculate retention metrics',
    category: 'analytics',
    parameters_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
        includeReasons: { type: 'boolean', default: true }
      },
      required: ['startDate', 'endDate']
    },
    requires_permission: 'reports:read',
    is_system: true,
    enabled: true
  },
  {
    id: 'generate_ltv_report',
    name: 'Generate LTV Report',
    description: 'Calculate customer lifetime value (LTV) with breakdown by cohort, plan, and acquisition source',
    category: 'analytics',
    parameters_schema: {
      type: 'object',
      properties: {
        cohortBy: { type: 'string', enum: ['month', 'quarter', 'year'], default: 'month' },
        includeProjection: { type: 'boolean', default: true }
      },
      required: []
    },
    requires_permission: 'reports:read',
    is_system: true,
    enabled: true
  },
  {
    id: 'analyze_class_attendance',
    name: 'Analyze Class Attendance',
    description: 'Analyze class attendance patterns, capacity utilization, and popular class times',
    category: 'analytics',
    parameters_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
        programId: { type: 'string', description: 'Filter by specific program/class type' }
      },
      required: ['startDate', 'endDate']
    },
    requires_permission: 'reports:read',
    is_system: true,
    enabled: true
  },
  {
    id: 'get_client_count',
    name: 'Get Client Count',
    description: 'Get the total number of clients/members, optionally filtered by status (active, inactive, all)',
    category: 'analytics',
    parameters_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'inactive', 'all'], default: 'active' }
      },
      required: []
    },
    requires_permission: 'clients:read',
    is_system: true,
    enabled: true
  }
];

async function syncTools() {
  console.log('🔄 Syncing AI agent tools to database...\n');

  let created = 0;
  let updated = 0;
  const errors = [];

  for (const tool of tools) {
    try {
      // Try to upsert (insert or update)
      const { error } = await supabase
        .from('ai_agent_tools')
        .upsert({
          ...tool,
          metadata: { last_synced: new Date().toISOString() },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        if (error.code === '23505') {
          // Duplicate key - tool exists, this is an update
          updated++;
          console.log(`✅ Updated: ${tool.name}`);
        } else {
          errors.push(`${tool.id}: ${error.message}`);
          console.error(`❌ Error: ${tool.id} - ${error.message}`);
        }
      } else {
        created++;
        console.log(`✨ Created: ${tool.name}`);
      }
    } catch (err) {
      errors.push(`${tool.id}: ${err.message}`);
      console.error(`❌ Error: ${tool.id} - ${err.message}`);
    }
  }

  console.log('\n📊 Sync Summary:');
  console.log(`  ✨ Created: ${created} tools`);
  console.log(`  ✅ Updated: ${updated} tools`);
  console.log(`  📦 Total: ${tools.length} tools`);

  if (errors.length > 0) {
    console.log(`  ❌ Errors: ${errors.length}`);
    console.log('\n❌ Errors:');
    errors.forEach(err => console.log(`  - ${err}`));
  } else {
    console.log('\n✅ All tools synced successfully!');
  }
}

syncTools().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
