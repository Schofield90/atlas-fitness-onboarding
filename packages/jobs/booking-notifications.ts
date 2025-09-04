import { Queue, Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import * as nodemailer from 'nodemailer';
import twilio from 'twilio';

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Email transporter (using SMTP - configure based on your provider)
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Twilio client for SMS
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Redis connection for BullMQ
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
};

// Create queue
export const bookingNotificationQueue = new Queue('booking-notifications', {
  connection: redisConnection
});

// Job types
export interface BookingConfirmationJob {
  bookingId: string;
  type: 'confirmation' | 'reminder' | 'cancellation';
}

// Email templates
function getEmailTemplate(type: string, booking: any, calendar: any): { subject: string; html: string } {
  const startTime = new Date(booking.start_time).toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short'
  });
  
  switch (type) {
    case 'confirmation':
      return {
        subject: `Booking Confirmed: ${calendar.name}`,
        html: `
          <h2>Your booking has been confirmed!</h2>
          <p>Hi ${booking.contact_name},</p>
          <p>Your booking for <strong>${calendar.name}</strong> has been confirmed.</p>
          <p><strong>Date & Time:</strong> ${startTime}</p>
          ${booking.staff ? `<p><strong>With:</strong> ${booking.staff.name}</p>` : ''}
          <p><strong>Location:</strong> ${calendar.location || 'Will be provided'}</p>
          <p>You can download your calendar invite from: ${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/${booking.id}/invite.ics</p>
          <hr>
          <p>If you need to cancel or reschedule, please contact us at least 24 hours in advance.</p>
          <p>Best regards,<br>Atlas Fitness Team</p>
        `
      };
      
    case 'reminder':
      return {
        subject: `Reminder: ${calendar.name} - Tomorrow`,
        html: `
          <h2>Reminder: Your booking is tomorrow!</h2>
          <p>Hi ${booking.contact_name},</p>
          <p>This is a reminder about your booking for <strong>${calendar.name}</strong>.</p>
          <p><strong>Date & Time:</strong> ${startTime}</p>
          ${booking.staff ? `<p><strong>With:</strong> ${booking.staff.name}</p>` : ''}
          <p><strong>Location:</strong> ${calendar.location || 'Will be provided'}</p>
          <p>We look forward to seeing you!</p>
          <p>Best regards,<br>Atlas Fitness Team</p>
        `
      };
      
    case 'cancellation':
      return {
        subject: `Booking Cancelled: ${calendar.name}`,
        html: `
          <h2>Your booking has been cancelled</h2>
          <p>Hi ${booking.contact_name},</p>
          <p>Your booking for <strong>${calendar.name}</strong> has been cancelled.</p>
          <p><strong>Original Date & Time:</strong> ${startTime}</p>
          <p>If you'd like to book another session, please visit our booking page.</p>
          <p>Best regards,<br>Atlas Fitness Team</p>
        `
      };
      
    default:
      throw new Error(`Unknown email template type: ${type}`);
  }
}

// SMS templates
function getSMSTemplate(type: string, booking: any, calendar: any): string {
  const startTime = new Date(booking.start_time).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  switch (type) {
    case 'confirmation':
      return `Atlas Fitness: Your booking for ${calendar.name} on ${startTime} is confirmed. See you there!`;
      
    case 'reminder':
      return `Atlas Fitness: Reminder - Your ${calendar.name} session is tomorrow at ${startTime}. See you there!`;
      
    case 'cancellation':
      return `Atlas Fitness: Your booking for ${calendar.name} on ${startTime} has been cancelled.`;
      
    default:
      return '';
  }
}

// Worker to process jobs
export const bookingNotificationWorker = new Worker<BookingConfirmationJob>(
  'booking-notifications',
  async (job: Job<BookingConfirmationJob>) => {
    const { bookingId, type } = job.data;
    
    console.log(`Processing ${type} notification for booking ${bookingId}`);
    
    // Fetch booking details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        calendars(*),
        staff(name, email)
      `)
      .eq('id', bookingId)
      .single();
    
    if (error || !booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }
    
    const calendar = booking.calendars;
    
    // Send email notification
    try {
      const emailTemplate = getEmailTemplate(type, booking, calendar);
      await emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'sam@gymleadhub.co.uk',
        to: booking.contact_email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });
      
      console.log(`Email sent to ${booking.contact_email}`);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't throw - continue with SMS
    }
    
    // Send SMS notification if phone number provided
    if (booking.contact_phone && twilioClient) {
      try {
        const smsMessage = getSMSTemplate(type, booking, calendar);
        if (smsMessage) {
          await twilioClient.messages.create({
            body: smsMessage,
            to: booking.contact_phone,
            from: process.env.TWILIO_SMS_FROM!
          });
          
          console.log(`SMS sent to ${booking.contact_phone}`);
        }
      } catch (smsError) {
        console.error('Failed to send SMS:', smsError);
        // Don't throw - email might have succeeded
      }
    }
    
    // Update booking notification status
    await supabase
      .from('bookings')
      .update({
        [`${type}_sent_at`]: new Date().toISOString()
      })
      .eq('id', bookingId);
    
    return { success: true, bookingId, type };
  },
  {
    connection: redisConnection,
    concurrency: 10
  }
);

// Helper function to queue a notification
export async function queueBookingNotification(
  bookingId: string, 
  type: 'confirmation' | 'reminder' | 'cancellation',
  delay?: number
) {
  const jobOptions: any = {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  };
  
  if (delay) {
    jobOptions.delay = delay;
  }
  
  await bookingNotificationQueue.add(
    `${type}-${bookingId}`,
    { bookingId, type },
    jobOptions
  );
}

// Schedule reminder notifications (run this periodically)
export async function scheduleReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  
  // Find bookings for tomorrow that haven't had reminders sent
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, start_time')
    .gte('start_time', tomorrow.toISOString())
    .lt('start_time', dayAfter.toISOString())
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null);
  
  if (bookings) {
    for (const booking of bookings) {
      // Schedule reminder for 9 AM today
      const reminderTime = new Date();
      reminderTime.setHours(9, 0, 0, 0);
      const delay = reminderTime.getTime() - Date.now();
      
      if (delay > 0) {
        await queueBookingNotification(booking.id, 'reminder', delay);
      } else {
        // Send immediately if past 9 AM
        await queueBookingNotification(booking.id, 'reminder');
      }
    }
  }
}