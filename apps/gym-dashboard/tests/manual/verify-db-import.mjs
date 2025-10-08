#!/usr/bin/env node

/**
 * TeamUp Import Database Verification Script
 *
 * This script verifies the TeamUp import by directly querying the database
 * to check if the fixes are working correctly.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qibrnjbnbknvqqjybfaa.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_ID = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'; // Sam's organization

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('==== TeamUp Import Database Verification ====\n');

async function verifyImport() {
  try {
    // 1. Check class_types
    console.log('[1/5] Checking class_types table...');
    const { data: classTypes, error: typesError } = await supabase
      .from('class_types')
      .select('id, name, created_at')
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: false })
      .limit(10);

    if (typesError) {
      console.error('Error fetching class_types:', typesError);
    } else {
      console.log(`✅ Found ${classTypes?.length || 0} class types (showing recent 10):`);
      classTypes?.forEach((type, i) => {
        console.log(`   ${i + 1}. ${type.name} (ID: ${type.id})`);
      });
    }
    console.log('');

    // 2. Check class_schedules with day_of_week
    console.log('[2/5] Checking class_schedules table...');
    const { data: schedules, error: schedulesError, count: schedulesCount } = await supabase
      .from('class_schedules')
      .select('id, class_type_id, day_of_week, start_time, end_time, instructor_name, room_location', { count: 'exact' })
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: false })
      .limit(10);

    if (schedulesError) {
      console.error('Error fetching class_schedules:', schedulesError);
    } else {
      console.log(`✅ Found ${schedulesCount} total schedules (showing recent 10):`);
      schedules?.forEach((schedule, i) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[schedule.day_of_week] || 'INVALID';
        console.log(`   ${i + 1}. ${dayName} ${schedule.start_time}-${schedule.end_time} with ${schedule.instructor_name || 'TBD'}`);

        // CRITICAL: Verify day_of_week field exists
        if (schedule.day_of_week === null || schedule.day_of_week === undefined) {
          console.error(`   ❌ CRITICAL: day_of_week is NULL for schedule ${schedule.id}`);
        }
      });
    }
    console.log('');

    // 3. Check class_sessions
    console.log('[3/5] Checking class_sessions table...');
    const { data: sessions, error: sessionsError, count: sessionsCount } = await supabase
      .from('class_sessions')
      .select('id, name, start_time, instructor_name, location', { count: 'exact' })
      .eq('organization_id', ORG_ID)
      .gte('start_time', new Date().toISOString()) // Future sessions only
      .order('start_time', { ascending: true })
      .limit(10);

    if (sessionsError) {
      console.error('Error fetching class_sessions:', sessionsError);
    } else {
      console.log(`✅ Found ${sessionsCount} future sessions (showing next 10):`);
      sessions?.forEach((session, i) => {
        const date = new Date(session.start_time);
        const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
        const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        console.log(`   ${i + 1}. ${session.name} - ${dateStr} ${timeStr} with ${session.instructor_name || 'TBD'}`);
      });
    }
    console.log('');

    // 4. Verify day_of_week field is populated correctly
    console.log('[4/5] Verifying day_of_week field integrity...');
    const { data: invalidSchedules, error: validationError } = await supabase
      .from('class_schedules')
      .select('id')
      .eq('organization_id', ORG_ID)
      .is('day_of_week', null);

    if (validationError) {
      console.error('Error validating day_of_week:', validationError);
    } else {
      if (invalidSchedules && invalidSchedules.length > 0) {
        console.log(`❌ CRITICAL: Found ${invalidSchedules.length} schedules with NULL day_of_week`);
      } else {
        console.log('✅ All schedules have day_of_week populated correctly');
      }
    }
    console.log('');

    // 5. Check sessions span correct date range
    console.log('[5/5] Verifying session date range...');
    const { data: dateRange, error: dateError } = await supabase
      .from('class_sessions')
      .select('start_time')
      .eq('organization_id', ORG_ID)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (dateError) {
      console.error('Error fetching date range:', dateError);
    } else if (dateRange && dateRange.length > 0) {
      const firstDate = new Date(dateRange[0].start_time);
      const lastDate = new Date(dateRange[dateRange.length - 1].start_time);
      const daysDiff = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24));

      console.log(`✅ Sessions span ${daysDiff} days`);
      console.log(`   First session: ${firstDate.toLocaleDateString('en-GB')}`);
      console.log(`   Last session: ${lastDate.toLocaleDateString('en-GB')}`);

      if (daysDiff > 35) {
        console.log('⚠️  WARNING: Sessions span more than 5 weeks (expected ~4 weeks)');
      }
    }
    console.log('');

    // Summary
    console.log('=== VERIFICATION SUMMARY ===');

    const results = {
      classTypes: classTypes?.length || 0,
      schedules: schedulesCount || 0,
      sessions: sessionsCount || 0,
      invalidSchedules: invalidSchedules?.length || 0,
    };

    console.log(`Class Types: ${results.classTypes}`);
    console.log(`Schedules: ${results.schedules}`);
    console.log(`Future Sessions: ${results.sessions}`);
    console.log('');

    // Success criteria
    let allPassed = true;

    if (results.classTypes < 30) {
      console.log('❌ FAIL: Expected 30+ class types');
      allPassed = false;
    } else {
      console.log('✅ PASS: Class types created');
    }

    if (results.schedules < 40) {
      console.log('❌ FAIL: Expected 40+ schedules');
      allPassed = false;
    } else {
      console.log('✅ PASS: Schedules created');
    }

    if (results.sessions < 120) {
      console.log('❌ FAIL: Expected 120+ sessions (3+ weeks)');
      allPassed = false;
    } else {
      console.log('✅ PASS: Sessions created');
    }

    if (results.invalidSchedules > 0) {
      console.log('❌ FAIL: Found schedules with NULL day_of_week');
      allPassed = false;
    } else {
      console.log('✅ PASS: All schedules have day_of_week');
    }

    console.log('');
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED - TeamUp import is working correctly!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Navigate to: https://login.gymleadhub.co.uk/dashboard/classes');
      console.log('2. Verify classes appear in calendar');
      console.log('3. Check random samples match the data above');
      process.exit(0);
    } else {
      console.log('❌ SOME TESTS FAILED - Import may have issues');
      process.exit(1);
    }

  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verifyImport();
