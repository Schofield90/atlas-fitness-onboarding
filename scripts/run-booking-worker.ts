#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
import { bookingNotificationWorker, scheduleReminders } from '../packages/jobs/booking-notifications';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🚀 Starting booking notification worker...');

// Schedule reminders every hour
setInterval(async () => {
  console.log('⏰ Checking for bookings that need reminders...');
  try {
    await scheduleReminders();
  } catch (error) {
    console.error('Error scheduling reminders:', error);
  }
}, 60 * 60 * 1000); // Every hour

// Run once on startup
scheduleReminders().catch(console.error);

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📛 SIGTERM received, closing worker...');
  await bookingNotificationWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📛 SIGINT received, closing worker...');
  await bookingNotificationWorker.close();
  process.exit(0);
});

console.log('✅ Booking notification worker is running!');
console.log('   - Processing confirmation emails');
console.log('   - Processing reminder emails (24h before)');
console.log('   - Processing cancellation emails');
console.log('   - Sending SMS notifications when available');