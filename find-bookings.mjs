#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ATLAS_ORG_ID = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';
const DEMO_ORG_ID = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';

console.log('Searching for bookings across ALL organizations...\n');

// Check which organizations have bookings
const { data: orgsWithBookings } = await supabase
  .from('bookings')
  .select('organization_id')
  .not('organization_id', 'is', null);

const orgCounts = {};
orgsWithBookings?.forEach(b => {
  orgCounts[b.organization_id] = (orgCounts[b.organization_id] || 0) + 1;
});

console.log('Organizations with bookings in "bookings" table:');
for (const [orgId, count] of Object.entries(orgCounts)) {
  const isAtlas = orgId === ATLAS_ORG_ID;
  const isDemo = orgId === DEMO_ORG_ID;
  let label = orgId;
  if (isAtlas) label += ' (ATLAS FITNESS)';
  if (isDemo) label += ' (DEMO FITNESS STUDIO)';
  console.log(`  ${label}: ${count} bookings`);
}

// Check class_bookings too
const { data: orgsWithClassBookings } = await supabase
  .from('class_bookings')
  .select('organization_id')
  .not('organization_id', 'is', null);

const classOrgCounts = {};
orgsWithClassBookings?.forEach(b => {
  classOrgCounts[b.organization_id] = (classOrgCounts[b.organization_id] || 0) + 1;
});

console.log('\nOrganizations with bookings in "class_bookings" table:');
for (const [orgId, count] of Object.entries(classOrgCounts)) {
  const isAtlas = orgId === ATLAS_ORG_ID;
  const isDemo = orgId === DEMO_ORG_ID;
  let label = orgId;
  if (isAtlas) label += ' (ATLAS FITNESS)';
  if (isDemo) label += ' (DEMO FITNESS STUDIO)';
  console.log(`  ${label}: ${count} bookings`);
}

// Check if there's an "attendances" or "attendance" table
const { data: tables } = await supabase
  .from('information_schema.tables')
  .select('table_name')
  .eq('table_schema', 'public')
  .like('table_name', '%attend%');

console.log('\nAttendance-related tables:', tables?.map(t => t.table_name) || 'None found');
