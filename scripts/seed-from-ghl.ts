#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface GHLCalendar {
  id: string;
  name: string;
  group: string;
  slug: string;
  distribution: string;
  color: string;
  autoConfirm: boolean;
  inviteTemplate?: string;
}

interface GHLAvailabilityPolicy {
  calendarId: string;
  workHours: Record<string, string[][]>;
  slotIntervalMins: number;
  durationMins: number;
  buffer: {
    before: number;
    after: number;
  };
  minNoticeMins: number;
  dateRangeDays: number;
  maxPerSlotPerUser: number;
  lookBusyPercent: number;
}

interface GHLStaffMember {
  userId: string;
  name: string;
  email?: string;
  priority: string;
}

interface GHLRoutingPool {
  calendarId: string;
  mode: string;
  members: GHLStaffMember[];
  staffSelectionEnabled: boolean;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    throw error;
  }
}

async function seedDatabase() {
  console.log('🌱 Starting database seed from GHL data...\n');

  const dataDir = '/Users/Sam/atlas-fitness-onboarding/data/ghl';
  
  try {
    // Read all GHL JSON files
    const calendarsData = await readJsonFile<{ calendars: GHLCalendar[] }>(
      path.join(dataDir, 'calendars.json')
    );
    
    const policiesData = await readJsonFile<{ policies: GHLAvailabilityPolicy[] }>(
      path.join(dataDir, 'availability_policies.json')
    );
    
    const poolsData = await readJsonFile<{ pools: GHLRoutingPool[] }>(
      path.join(dataDir, 'routing_pools.json')
    );
    
    const linksData = await readJsonFile<{ links: any[] }>(
      path.join(dataDir, 'booking_links.json')
    );
    
    const formsData = await readJsonFile<{ forms: any[] }>(
      path.join(dataDir, 'forms.json')
    );
    
    const remindersData = await readJsonFile<{ reminders: any[] }>(
      path.join(dataDir, 'reminders.json')
    );
    
    const rescheduleData = await readJsonFile<{ policies: any[] }>(
      path.join(dataDir, 'reschedule_cancel.json')
    );

    console.log('📊 Data loaded:');
    console.log(`  - ${calendarsData.calendars.length} calendars`);
    console.log(`  - ${policiesData.policies.length} availability policies`);
    console.log(`  - ${poolsData.pools.length} routing pools`);
    console.log('');

    // Map to store GHL ID to our ID mappings
    const idMappings = new Map<string, string>();
    const organizationId = '63589490-8f55-4157-bd3a-e141594b748e'; // Use existing org ID

    // 1. Seed Calendars
    console.log('📅 Seeding calendars...');
    for (const ghlCalendar of calendarsData.calendars) {
      const calendarId = uuidv4();
      idMappings.set(ghlCalendar.id, calendarId);
      
      // Normalize the slug (remove leading slash if present)
      const normalizedSlug = ghlCalendar.slug.replace(/^\//, '').replace(/\//g, '-');
      
      const { error } = await supabase.from('calendars').upsert({
        id: calendarId,
        slug: normalizedSlug,
        name: ghlCalendar.name,
        group_name: ghlCalendar.group,
        distribution: mapDistribution(ghlCalendar.distribution),
        color: ghlCalendar.color,
        auto_confirm: ghlCalendar.autoConfirm,
        invite_template: ghlCalendar.inviteTemplate,
        organization_id: organizationId
      }, {
        onConflict: 'slug'
      });
      
      if (error) {
        console.error(`  ❌ Error seeding calendar ${ghlCalendar.name}:`, error);
      } else {
        console.log(`  ✅ Calendar "${ghlCalendar.name}" created with slug: ${normalizedSlug}`);
      }
    }

    // 2. Seed Staff Members
    console.log('\n👥 Seeding staff members...');
    const staffIdMappings = new Map<string, string>();
    
    for (const pool of poolsData.pools) {
      for (const member of pool.members) {
        const staffId = uuidv4();
        staffIdMappings.set(member.userId, staffId);
        
        const { error } = await supabase.from('staff').upsert({
          id: staffId,
          ext_ref: member.userId,
          name: member.name,
          email: member.email,
          priority: member.priority.toLowerCase(),
          organization_id: organizationId
        }, {
          onConflict: 'ext_ref'
        });
        
        if (error) {
          console.error(`  ❌ Error seeding staff ${member.name}:`, error);
        } else {
          console.log(`  ✅ Staff member "${member.name}" created`);
        }
      }
    }

    // 3. Seed Calendar-Staff Assignments
    console.log('\n🔗 Linking calendars to staff...');
    for (const pool of poolsData.pools) {
      const calendarId = idMappings.get(pool.calendarId);
      if (!calendarId) continue;
      
      for (const member of pool.members) {
        const staffId = staffIdMappings.get(member.userId);
        if (!staffId) continue;
        
        const { error } = await supabase.from('calendar_staff').upsert({
          calendar_id: calendarId,
          staff_id: staffId,
          weight: 1,
          is_active: true
        }, {
          onConflict: 'calendar_id,staff_id'
        });
        
        if (!error) {
          console.log(`  ✅ Linked staff to calendar`);
        }
      }
    }

    // 4. Seed Availability Policies
    console.log('\n⏰ Seeding availability policies...');
    for (const policy of policiesData.policies) {
      const calendarId = idMappings.get(policy.calendarId);
      if (!calendarId) continue;
      
      const { error } = await supabase.from('availability_policies').insert({
        calendar_id: calendarId,
        work_hours: policy.workHours,
        slot_interval_mins: policy.slotIntervalMins,
        duration_mins: policy.durationMins,
        buffer_before_mins: policy.buffer.before,
        buffer_after_mins: policy.buffer.after,
        min_notice_mins: policy.minNoticeMins,
        date_range_days: policy.dateRangeDays,
        max_per_slot_per_user: policy.maxPerSlotPerUser,
        look_busy_percent: policy.lookBusyPercent,
        timezone: 'Europe/London'
      });
      
      if (error) {
        console.error(`  ❌ Error seeding availability policy:`, error);
      } else {
        console.log(`  ✅ Availability policy created`);
      }
    }

    // 5. Seed Booking Links
    console.log('\n🔗 Seeding booking links...');
    for (const link of linksData.links) {
      const calendarId = idMappings.get(link.calendarId);
      if (!calendarId) continue;
      
      // Normalize the URL path
      const normalizedPath = link.url.replace(/^\//, '').replace(/\//g, '-');
      
      const { error } = await supabase.from('booking_links').upsert({
        calendar_id: calendarId,
        url_path: normalizedPath,
        is_active: true
      }, {
        onConflict: 'url_path'
      });
      
      if (!error) {
        console.log(`  ✅ Booking link created: /book/${normalizedPath}`);
      }
    }

    // 6. Seed Booking Forms
    console.log('\n📝 Seeding booking forms...');
    for (const form of formsData.forms) {
      const calendarId = idMappings.get(form.calendarId);
      if (!calendarId) continue;
      
      const { error } = await supabase.from('booking_forms').insert({
        calendar_id: calendarId,
        fields: form.fields || ['name', 'email', 'phone'],
        required_fields: ['name', 'email'],
        consent_enabled: form.consentEnabled ?? true,
        consent_text: form.consentText || 'I agree to receive communications'
      });
      
      if (!error) {
        console.log(`  ✅ Booking form configuration created`);
      }
    }

    // 7. Seed Reschedule/Cancel Policies
    console.log('\n↩️  Seeding reschedule/cancel policies...');
    for (const policy of rescheduleData.policies) {
      const calendarId = idMappings.get(policy.calendarId);
      if (!calendarId) continue;
      
      const { error } = await supabase.from('reschedule_cancel_policies').insert({
        calendar_id: calendarId,
        allow_reschedule: policy.allowReschedule ?? true,
        allow_cancel: policy.allowCancel ?? true,
        reschedule_min_notice_mins: 60,
        cancel_min_notice_mins: 60,
        reschedule_expiry_hours: policy.expiryHours,
        cancel_expiry_hours: policy.expiryHours
      });
      
      if (!error) {
        console.log(`  ✅ Reschedule/cancel policy created`);
      }
    }

    // 8. Create a test booking for demonstration
    console.log('\n🎯 Creating test booking...');
    const testCalendarId = Array.from(idMappings.values())[0];
    const testStaffId = Array.from(staffIdMappings.values())[0];
    
    if (testCalendarId && testStaffId) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      const { data: booking, error } = await supabase.from('bookings').insert({
        calendar_id: testCalendarId,
        staff_id: testStaffId,
        contact_name: 'Test Customer',
        contact_email: 'test@example.com',
        contact_phone: '+447777777777',
        start_time: tomorrow.toISOString(),
        end_time: new Date(tomorrow.getTime() + 15 * 60000).toISOString(),
        status: 'confirmed',
        consent_given: true,
        consent_text: 'I agree to receive communications',
        ics_uid: `test-${Date.now()}@fitterbodyladies.com`
      }).select().single();
      
      if (!error && booking) {
        console.log(`  ✅ Test booking created for tomorrow at 10:00 AM`);
        console.log(`     Booking ID: ${booking.id}`);
      }
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📌 Important URLs:');
    console.log(`  - Public booking page: http://localhost:3000/book/fitterbodyladies-coa`);
    console.log(`  - API availability: http://localhost:3000/api/calendars/fitterbodyladies-coa/availability`);
    
    // Save ID mappings for reference
    const mappingsPath = path.join(dataDir, 'id_mappings.json');
    await fs.writeFile(mappingsPath, JSON.stringify({
      calendars: Object.fromEntries(idMappings),
      staff: Object.fromEntries(staffIdMappings),
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`\n💾 ID mappings saved to: ${mappingsPath}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

function mapDistribution(ghlDistribution: string): string {
  const mappings: Record<string, string> = {
    'optimize_availability': 'optimize_availability',
    'Optimize for availability': 'optimize_availability',
    'equal_distribution': 'equal_distribution',
    'Equal distribution': 'equal_distribution',
    'round_robin': 'round_robin',
    'Round robin': 'round_robin',
    'single': 'single'
  };
  
  return mappings[ghlDistribution] || 'optimize_availability';
}

// Run the seed script
if (require.main === module) {
  seedDatabase().catch(console.error);
}

export { seedDatabase };