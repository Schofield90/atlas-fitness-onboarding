import { createAdminClient } from '@/app/lib/supabase/admin'
import nodemailer from 'nodemailer'

export interface NotificationTemplate {
  subject: string
  html: string
  text?: string
}

export interface NotificationData {
  booking: any
  appointmentType: any
  organization: any
  staff?: any
  customData?: Record<string, any>
}

export class NotificationService {
  private adminSupabase = createAdminClient()
  private emailTransporter: nodemailer.Transporter | null = null

  constructor() {
    this.initializeEmailTransporter()
  }

  private initializeEmailTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      })
    } else {
      console.warn('Email configuration not found. Email notifications will not be sent.')
    }
  }

  /**
   * Process pending notifications
   */
  async processPendingNotifications(): Promise<void> {
    const { data: notifications, error } = await this.adminSupabase
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('send_at', new Date().toISOString())
      .order('send_at', { ascending: true })
      .limit(50)

    if (error) {
      console.error('Error fetching pending notifications:', error)
      return
    }

    if (!notifications || notifications.length === 0) {
      return
    }

    console.log(`Processing ${notifications.length} pending notifications`)

    for (const notification of notifications) {
      await this.processNotification(notification)
    }
  }

  /**
   * Process a single notification
   */
  private async processNotification(notification: any): Promise<void> {
    try {
      let success = false

      switch (notification.type) {
        case 'email':
          success = await this.sendEmail(notification)
          break
        case 'sms':
          success = await this.sendSMS(notification)
          break
        default:
          console.error('Unknown notification type:', notification.type)
          return
      }

      // Update notification status
      await this.adminSupabase
        .from('notifications')
        .update({
          status: success ? 'sent' : 'failed',
          sent_at: success ? new Date().toISOString() : null,
          error_message: success ? null : 'Failed to send notification',
          retry_count: notification.retry_count + 1
        })
        .eq('id', notification.id)

    } catch (error) {
      console.error('Error processing notification:', error)
      
      // Update notification with error
      await this.adminSupabase
        .from('notifications')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          retry_count: notification.retry_count + 1
        })
        .eq('id', notification.id)
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(notification: any): Promise<boolean> {
    if (!this.emailTransporter) {
      console.error('Email transporter not configured')
      return false
    }

    try {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: notification.recipient_email,
        subject: notification.subject,
        html: notification.body,
        text: notification.body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      })

      console.log('Email sent to:', notification.recipient_email)
      return true
    } catch (error) {
      console.error('Failed to send email:', error)
      return false
    }
  }

  /**
   * Send SMS notification (using Twilio)
   */
  private async sendSMS(notification: any): Promise<boolean> {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.error('Twilio configuration not found')
      return false
    }

    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_PHONE_NUMBER!,
          To: notification.recipient_phone,
          Body: notification.body,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update notification with external ID
        await this.adminSupabase
          .from('notifications')
          .update({ external_id: data.sid })
          .eq('id', notification.id)

        console.log('SMS sent to:', notification.recipient_phone)
        return true
      } else {
        const error = await response.json()
        console.error('Failed to send SMS:', error)
        return false
      }
    } catch (error) {
      console.error('Failed to send SMS:', error)
      return false
    }
  }

  /**
   * Schedule booking confirmation notifications
   */
  async scheduleBookingConfirmation(booking: any, appointmentType: any): Promise<void> {
    const confirmationEmail = this.generateBookingConfirmationEmail(booking, appointmentType)
    
    await this.adminSupabase
      .from('notifications')
      .insert({
        organization_id: booking.organization_id,
        booking_id: booking.id,
        type: 'email',
        template: 'booking_confirmation',
        recipient_email: booking.attendee_email,
        recipient_name: booking.attendee_name,
        subject: confirmationEmail.subject,
        body: confirmationEmail.html,
        send_at: new Date().toISOString()
      })
  }

  /**
   * Schedule booking reminder notifications
   */
  async scheduleBookingReminders(booking: any, appointmentType: any): Promise<void> {
    const bookingTime = new Date(booking.start_time)
    
    // Email reminder 24 hours before
    const emailReminderTime = new Date(bookingTime.getTime() - (24 * 60 * 60 * 1000))
    if (emailReminderTime > new Date()) {
      const reminderEmail = this.generateBookingReminderEmail(booking, appointmentType)
      
      await this.adminSupabase
        .from('notifications')
        .insert({
          organization_id: booking.organization_id,
          booking_id: booking.id,
          type: 'email',
          template: 'booking_reminder_24h',
          recipient_email: booking.attendee_email,
          recipient_name: booking.attendee_name,
          subject: reminderEmail.subject,
          body: reminderEmail.html,
          send_at: emailReminderTime.toISOString()
        })
    }

    // SMS reminder 2 hours before (if phone number provided)
    if (booking.attendee_phone) {
      const smsReminderTime = new Date(bookingTime.getTime() - (2 * 60 * 60 * 1000))
      if (smsReminderTime > new Date()) {
        await this.adminSupabase
          .from('notifications')
          .insert({
            organization_id: booking.organization_id,
            booking_id: booking.id,
            type: 'sms',
            template: 'booking_reminder_2h',
            recipient_phone: booking.attendee_phone,
            recipient_name: booking.attendee_name,
            subject: '',
            body: `Reminder: You have ${appointmentType.name} in 2 hours at ${bookingTime.toLocaleTimeString()}. ${booking.location_details ? `Location: ${booking.location_details}` : ''} Reply STOP to opt out.`,
            send_at: smsReminderTime.toISOString()
          })
      }
    }
  }

  /**
   * Send immediate reschedule notification
   */
  async sendRescheduleNotification(booking: any, appointmentType: any): Promise<void> {
    const rescheduleEmail = this.generateRescheduleConfirmationEmail(booking, appointmentType)
    
    await this.adminSupabase
      .from('notifications')
      .insert({
        organization_id: booking.organization_id,
        booking_id: booking.id,
        type: 'email',
        template: 'booking_rescheduled',
        recipient_email: booking.attendee_email,
        recipient_name: booking.attendee_name,
        subject: rescheduleEmail.subject,
        body: rescheduleEmail.html,
        send_at: new Date().toISOString()
      })
  }

  /**
   * Send immediate cancellation notification
   */
  async sendCancellationNotification(booking: any, appointmentType: any): Promise<void> {
    const cancellationEmail = this.generateCancellationConfirmationEmail(booking, appointmentType)
    
    await this.adminSupabase
      .from('notifications')
      .insert({
        organization_id: booking.organization_id,
        booking_id: booking.id,
        type: 'email',
        template: 'booking_cancelled',
        recipient_email: booking.attendee_email,
        recipient_name: booking.attendee_name,
        subject: cancellationEmail.subject,
        body: cancellationEmail.html,
        send_at: new Date().toISOString()
      })
  }

  /**
   * Generate booking confirmation email template
   */
  private generateBookingConfirmationEmail(booking: any, appointmentType: any): NotificationTemplate {
    const bookingDate = new Date(booking.start_time)
    const managementUrl = `${process.env.NEXT_PUBLIC_APP_URL}/booking/manage?token=${booking.cancellation_token}`

    return {
      subject: `Booking Confirmed: ${booking.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Confirmed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .details { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Your booking is confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi ${booking.attendee_name},</p>
              <p>Great news! Your ${appointmentType.name} appointment has been confirmed.</p>
              
              <div class="details">
                <h3>📅 Booking Details</h3>
                <ul>
                  <li><strong>Service:</strong> ${appointmentType.name}</li>
                  <li><strong>Date:</strong> ${bookingDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
                  <li><strong>Time:</strong> ${bookingDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${new Date(booking.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</li>
                  <li><strong>Duration:</strong> ${appointmentType.duration_minutes} minutes</li>
                  ${booking.location_details ? `<li><strong>Location:</strong> ${booking.location_details}</li>` : ''}
                  ${booking.description ? `<li><strong>Notes:</strong> ${booking.description}</li>` : ''}
                </ul>
              </div>

              <p><strong>What happens next?</strong></p>
              <ul>
                <li>You'll receive a reminder 24 hours before your appointment</li>
                <li>If you provided a phone number, you'll get an SMS reminder 2 hours before</li>
                <li>Please arrive 5 minutes early</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${managementUrl}" class="button">Manage Booking (Reschedule/Cancel)</a>
              </div>

              <p>Need help? Just reply to this email or contact us directly.</p>
              <p>We're excited to see you!</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  }

  /**
   * Generate booking reminder email template
   */
  private generateBookingReminderEmail(booking: any, appointmentType: any): NotificationTemplate {
    const bookingDate = new Date(booking.start_time)
    const managementUrl = `${process.env.NEXT_PUBLIC_APP_URL}/booking/manage?token=${booking.cancellation_token}`

    return {
      subject: `Tomorrow: ${booking.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Appointment Reminder</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .details { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Appointment Reminder</h1>
            </div>
            <div class="content">
              <p>Hi ${booking.attendee_name},</p>
              <p>This is a friendly reminder about your upcoming ${appointmentType.name} appointment <strong>tomorrow</strong>.</p>
              
              <div class="details">
                <h3>📅 Appointment Details</h3>
                <ul>
                  <li><strong>Service:</strong> ${appointmentType.name}</li>
                  <li><strong>Date:</strong> ${bookingDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
                  <li><strong>Time:</strong> ${bookingDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${new Date(booking.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</li>
                  ${booking.location_details ? `<li><strong>Location:</strong> ${booking.location_details}</li>` : ''}
                </ul>
              </div>

              <p><strong>📋 What to bring:</strong></p>
              <ul>
                <li>Please arrive 5 minutes early</li>
                <li>Bring any relevant documents or information</li>
                <li>Wear comfortable clothing if applicable</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${managementUrl}" class="button">Reschedule or Cancel</a>
              </div>

              <p>Looking forward to seeing you tomorrow!</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  }

  /**
   * Generate reschedule confirmation email template
   */
  private generateRescheduleConfirmationEmail(booking: any, appointmentType: any): NotificationTemplate {
    const bookingDate = new Date(booking.start_time)
    const managementUrl = `${process.env.NEXT_PUBLIC_APP_URL}/booking/manage?token=${booking.cancellation_token}`

    return {
      subject: `Booking Updated: ${booking.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Rescheduled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .details { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Booking Rescheduled</h1>
            </div>
            <div class="content">
              <p>Hi ${booking.attendee_name},</p>
              <p>Your ${appointmentType.name} appointment has been successfully rescheduled.</p>
              
              <div class="details">
                <h3>📅 New Appointment Details</h3>
                <ul>
                  <li><strong>Service:</strong> ${appointmentType.name}</li>
                  <li><strong>Date:</strong> ${bookingDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
                  <li><strong>Time:</strong> ${bookingDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${new Date(booking.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</li>
                  <li><strong>Duration:</strong> ${appointmentType.duration_minutes} minutes</li>
                  ${booking.location_details ? `<li><strong>Location:</strong> ${booking.location_details}</li>` : ''}
                </ul>
              </div>

              <p>You'll receive reminders as your new appointment time approaches.</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${managementUrl}" class="button">Make Another Change</a>
              </div>

              <p>Thank you for keeping us updated. We look forward to seeing you at your new appointment time!</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  }

  /**
   * Generate cancellation confirmation email template
   */
  private generateCancellationConfirmationEmail(booking: any, appointmentType: any): NotificationTemplate {
    const bookingDate = new Date(booking.start_time)

    return {
      subject: `Booking Cancelled: ${booking.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Cancelled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .details { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚫 Booking Cancelled</h1>
            </div>
            <div class="content">
              <p>Hi ${booking.attendee_name},</p>
              <p>Your ${appointmentType.name} appointment has been cancelled as requested.</p>
              
              <div class="details">
                <h3>📅 Cancelled Appointment</h3>
                <ul>
                  <li><strong>Service:</strong> ${appointmentType.name}</li>
                  <li><strong>Date:</strong> ${bookingDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
                  <li><strong>Time:</strong> ${bookingDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${new Date(booking.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</li>
                  ${booking.cancellation_reason ? `<li><strong>Reason:</strong> ${booking.cancellation_reason}</li>` : ''}
                </ul>
              </div>

              <p>No further action is required. If you'd like to book another appointment in the future, please visit our booking page.</p>

              <p>Thank you for your understanding.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(): Promise<void> {
    const { data: failedNotifications } = await this.adminSupabase
      .from('notifications')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(20)

    if (failedNotifications && failedNotifications.length > 0) {
      console.log(`Retrying ${failedNotifications.length} failed notifications`)
      
      for (const notification of failedNotifications) {
        await this.processNotification({
          ...notification,
          status: 'pending' // Reset status for retry
        })
      }
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService()