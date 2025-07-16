import twilio from 'twilio';

interface SMSResult {
  success: boolean;
  message_sid?: string;
  status?: string;
  error?: string;
  cost_pence?: number;
  delivery_status?: 'sent' | 'delivered' | 'failed' | 'pending';
}

interface SMSOptions {
  to: string;
  message: string;
  organization_id?: string;
  lead_id?: string;
  client_id?: string;
  template_key?: string;
}

class TwilioService {
  private client: twilio.Twilio;
  private fromNumber: string;
  private isEnabled: boolean;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || '';
    
    this.isEnabled = !!(accountSid && authToken && this.fromNumber);
    
    if (this.isEnabled) {
      this.client = twilio(accountSid, authToken);
    } else {
      console.warn('Twilio not configured - SMS will be logged but not sent');
    }
  }

  /**
   * Send SMS message via Twilio
   */
  async sendSMS({ to, message }: SMSOptions): Promise<SMSResult> {
    // Validate phone number format
    const cleanPhone = this.cleanPhoneNumber(to);
    if (!cleanPhone) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    // If Twilio is not configured, simulate SMS for testing
    if (!this.isEnabled) {
      console.log(`[SMS SIMULATION] To: ${cleanPhone}, Message: ${message}`);
      return {
        success: true,
        message_sid: `sim_${Date.now()}`,
        status: 'sent',
        cost_pence: 5,
        delivery_status: 'sent'
      };
    }

    try {
      // Send SMS via Twilio
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: cleanPhone,
        // Optional: Add status callback for delivery tracking
        statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL
      });

      // Calculate estimated cost (UK SMS: ~5-7p, International: ~10-15p)
      const estimatedCost = cleanPhone.startsWith('+44') ? 6 : 12;

      console.log(`SMS sent successfully: ${result.sid} to ${cleanPhone}`);

      return {
        success: true,
        message_sid: result.sid,
        status: result.status,
        cost_pence: estimatedCost,
        delivery_status: this.mapTwilioStatus(result.status)
      };

    } catch (error) {
      console.error('Twilio SMS error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown SMS error';
      
      return {
        success: false,
        error: errorMessage,
        delivery_status: 'failed'
      };
    }
  }

  /**
   * Clean and validate phone number
   */
  private cleanPhoneNumber(phone: string): string | null {
    if (!phone) return null;
    
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If no country code, assume UK
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('0')) {
        cleaned = '+44' + cleaned.substring(1);
      } else if (cleaned.startsWith('44')) {
        cleaned = '+' + cleaned;
      } else {
        cleaned = '+44' + cleaned;
      }
    }
    
    // Basic validation
    if (cleaned.length < 10 || cleaned.length > 17) {
      return null;
    }
    
    return cleaned;
  }

  /**
   * Map Twilio status to our internal status
   */
  private mapTwilioStatus(twilioStatus: string): 'sent' | 'delivered' | 'failed' | 'pending' {
    switch (twilioStatus) {
      case 'sent':
      case 'queued':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'failed':
      case 'undelivered':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Get SMS delivery status from Twilio
   */
  async getDeliveryStatus(messageSid: string): Promise<{
    status: string;
    error_code?: string;
    error_message?: string;
  } | null> {
    if (!this.isEnabled) {
      return { status: 'delivered' }; // Simulate success
    }

    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        status: message.status,
        error_code: message.errorCode?.toString(),
        error_message: message.errorMessage || undefined
      };
    } catch (error) {
      console.error('Error fetching message status:', error);
      return null;
    }
  }

  /**
   * Handle Twilio webhook status updates
   */
  async handleStatusWebhook(webhookData: Record<string, string>): Promise<void> {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = webhookData;
    
    if (!MessageSid) return;

    try {
      // Import here to avoid circular dependency
      const { supabaseAdmin } = await import('@/lib/supabase');
      
      // Update SMS delivery record
      await supabaseAdmin
        .from('sms_deliveries')
        .update({
          status: this.mapTwilioStatus(MessageStatus),
          delivered_at: MessageStatus === 'delivered' ? new Date().toISOString() : null,
          provider_response: {
            status: MessageStatus,
            error_code: ErrorCode,
            error_message: ErrorMessage,
            updated_at: new Date().toISOString()
          }
        })
        .eq('provider_message_id', MessageSid);

      console.log(`Updated SMS delivery status: ${MessageSid} -> ${MessageStatus}`);
    } catch (error) {
      console.error('Error updating SMS delivery status:', error);
    }
  }

  /**
   * Test SMS configuration
   */
  async testConfiguration(): Promise<{
    configured: boolean;
    from_number: string;
    error?: string;
  }> {
    if (!this.isEnabled) {
      return {
        configured: false,
        from_number: '',
        error: 'Twilio credentials not configured'
      };
    }

    try {
      // Test by fetching account details
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      return {
        configured: true,
        from_number: this.fromNumber,
        error: account.status !== 'active' ? 'Twilio account not active' : undefined
      };
    } catch (error) {
      return {
        configured: false,
        from_number: this.fromNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get estimated SMS cost
   */
  getEstimatedCost(phoneNumber: string): number {
    const cleaned = this.cleanPhoneNumber(phoneNumber);
    if (!cleaned) return 0;
    
    // UK numbers: 6p, International: 12p
    return cleaned.startsWith('+44') ? 6 : 12;
  }
}

// Export singleton instance
export const twilioService = new TwilioService();
export default twilioService;