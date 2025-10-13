#!/usr/bin/env node
/**
 * Populate realistic class sessions and attendance data for the last 6 months
 * - Creates class sessions for each class type (daily schedule)
 * - Books random clients to each session (realistic capacity)
 * - Assigns attendance status (attended, no_show, cancelled)
 * - Each client attends 0-4 classes per week randomly
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ORG_ID = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'; // Demo Fitness Studio

// Helper to get random items from array
function randomItems(array, count) {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Helper to get random int between min and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to get date X months ago
function getDateMonthsAgo(months) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

async function populateAttendanceData() {
  console.log('🏋️ Starting attendance data population...\n');

  // 1. Get all class types
  console.log('📋 Step 1: Fetching class types...');
  const { data: classTypes, error: classTypesError } = await supabase
    .from('class_types')
    .select('*')
    .eq('organization_id', ORG_ID);

  if (classTypesError) {
    console.error('❌ Error fetching class types:', classTypesError);
    process.exit(1);
  }

  if (!classTypes || classTypes.length === 0) {
    console.log('ℹ️  No class types found. Please create class types first.');
    process.exit(1);
  }

  console.log(`✅ Found ${classTypes.length} class types`);
  console.log(`   Columns:`, Object.keys(classTypes[0]));
  console.log('');

  // 2. Get all clients
  console.log('📋 Step 2: Fetching clients...');
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, first_name, last_name')
    .eq('org_id', ORG_ID)
    .eq('status', 'active');

  if (clientsError || !clients || clients.length === 0) {
    console.error('❌ Error fetching clients:', clientsError);
    process.exit(1);
  }

  console.log(`✅ Found ${clients.length} active clients\n`);

  // 3. Define schedule (daily time slots)
  const timeSlots = [
    { hour: 6, minute: 0 },   // 6:00 AM
    { hour: 9, minute: 0 },   // 9:00 AM
    { hour: 12, minute: 0 },  // 12:00 PM
    { hour: 17, minute: 0 },  // 5:00 PM
    { hour: 19, minute: 0 },  // 7:00 PM
  ];

  const instructors = [
    'Sarah Johnson',
    'Mike Chen',
    'Emma Wilson',
    'Tom Davies',
    'Lisa Martinez'
  ];

  // 4. Create class sessions for last 6 months
  console.log('📅 Step 3: Creating class sessions for last 6 months...');

  const startDate = getDateMonthsAgo(6);
  const endDate = new Date();
  const sessions = [];

  let currentDate = new Date(startDate);
  let sessionCount = 0;

  while (currentDate <= endDate) {
    // Skip Sundays (day 0)
    if (currentDate.getDay() !== 0) {
      // Create 2-3 random sessions per day
      const dailySessionCount = randomInt(2, 3);
      const dailyTimeSlots = randomItems(timeSlots, dailySessionCount);
      const dailyClassTypes = randomItems(classTypes, dailySessionCount);

      for (let i = 0; i < dailySessionCount; i++) {
        const slot = dailyTimeSlots[i];
        const classType = dailyClassTypes[i];
        const instructor = instructors[randomInt(0, instructors.length - 1)];

        const sessionTime = new Date(currentDate);
        sessionTime.setHours(slot.hour, slot.minute, 0, 0);

        const durationMinutes = classType.duration_minutes || 60;
        const endTime = new Date(sessionTime.getTime() + durationMinutes * 60000);

        const isPast = sessionTime < new Date();

        sessions.push({
          organization_id: ORG_ID,
          name: classType.name,
          start_time: sessionTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          instructor_name: instructor,
          max_capacity: classType.default_capacity || 20,
          session_status: isPast ? 'completed' : 'scheduled',
          location: 'Main Studio'
        });

        sessionCount++;
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`📊 Generated ${sessionCount} class sessions`);
  console.log(`   Inserting in batches of 100...`);

  // Insert sessions in batches
  const batchSize = 100;
  const insertedSessions = [];

  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('class_sessions')
      .insert(batch)
      .select('id, start_time, name, max_capacity, session_status');

    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      continue;
    }

    insertedSessions.push(...data);
    process.stdout.write(`   Progress: ${insertedSessions.length}/${sessions.length}\r`);
  }

  console.log(`\n✅ Inserted ${insertedSessions.length} class sessions\n`);

  // 5. Create bookings with realistic attendance
  console.log('🎟️  Step 4: Creating bookings with attendance...');

  // Only book past sessions (completed ones)
  const pastSessions = insertedSessions.filter(s => s.session_status === 'completed');
  console.log(`   Found ${pastSessions.length} past sessions to book`);

  const bookings = [];
  let bookingCount = 0;

  // Track weekly attendance per client
  const clientWeeklyAttendance = new Map();

  for (const session of pastSessions) {
    // Get week key (YYYY-WW)
    const sessionDate = new Date(session.start_time);
    const weekKey = `${sessionDate.getFullYear()}-W${Math.floor((sessionDate - new Date(sessionDate.getFullYear(), 0, 1)) / 604800000)}`;

    // Book 5-15 clients per session (realistic capacity)
    const sessionBookingCount = randomInt(5, Math.min(15, session.max_capacity));
    const sessionClients = randomItems(clients, sessionBookingCount);

    for (const client of sessionClients) {
      // Check client's weekly attendance
      const clientKey = `${client.id}-${weekKey}`;
      const weeklyCount = clientWeeklyAttendance.get(clientKey) || 0;

      // Enforce 0-4 classes per week limit
      if (weeklyCount >= 4) {
        continue; // Skip this booking, client already attended 4 classes this week
      }

      // Determine attendance status
      // 80% attended, 5% no-show, 5% cancelled, 10% confirmed (for future)
      const rand = Math.random();
      let status;
      if (rand < 0.80) {
        status = 'attended';
        // Increment weekly attendance only for attended
        clientWeeklyAttendance.set(clientKey, weeklyCount + 1);
      } else if (rand < 0.85) {
        status = 'no_show';
      } else if (rand < 0.90) {
        status = 'cancelled';
      } else {
        status = 'confirmed';
      }

      bookings.push({
        organization_id: ORG_ID,
        client_id: client.id,
        class_session_id: session.id,
        status: status,
        created_at: new Date(sessionDate.getTime() - 86400000).toISOString() // 1 day before session
      });

      bookingCount++;
    }
  }

  console.log(`📊 Generated ${bookings.length} bookings`);
  console.log(`   Inserting in batches of 500...`);

  // Insert bookings in batches
  const bookingBatchSize = 500;
  let insertedBookings = 0;

  for (let i = 0; i < bookings.length; i += bookingBatchSize) {
    const batch = bookings.slice(i, i + bookingBatchSize);
    const { error } = await supabase
      .from('bookings')
      .insert(batch);

    if (error) {
      console.error(`❌ Error inserting booking batch ${Math.floor(i / bookingBatchSize) + 1}:`, error);
      continue;
    }

    insertedBookings += batch.length;
    process.stdout.write(`   Progress: ${insertedBookings}/${bookings.length}\r`);
  }

  console.log(`\n✅ Inserted ${insertedBookings} bookings\n`);

  // 6. Summary
  console.log('📊 SUMMARY:');
  console.log(`   Class Types: ${classTypes.length}`);
  console.log(`   Active Clients: ${clients.length}`);
  console.log(`   Class Sessions: ${insertedSessions.length}`);
  console.log(`   Past Sessions: ${pastSessions.length}`);
  console.log(`   Total Bookings: ${insertedBookings}`);

  const attendedCount = bookings.filter(b => b.status === 'attended').length;
  const noShowCount = bookings.filter(b => b.status === 'no_show').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  console.log(`   - Attended: ${attendedCount} (${Math.round(attendedCount / bookings.length * 100)}%)`);
  console.log(`   - No Shows: ${noShowCount} (${Math.round(noShowCount / bookings.length * 100)}%)`);
  console.log(`   - Cancelled: ${cancelledCount} (${Math.round(cancelledCount / bookings.length * 100)}%)`);

  console.log('\n✅ Attendance data population complete!');
}

populateAttendanceData().catch(console.error);
