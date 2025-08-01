import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export class ClientPortalService {
  private supabase: any;

  constructor() {
    const cookieStore = cookies();
    this.supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
  }

  async getOrCreatePortalAccess(clientId: string): Promise<any> {
    // First try to get existing access
    const { data: existing } = await this.supabase
      .from('client_portal_access')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (existing) {
      return existing;
    }

    // Get client's organization
    const { data: client } = await this.supabase
      .from('clients')
      .select('organization_id')
      .eq('id', clientId)
      .single();

    if (!client) {
      throw new Error('Client not found');
    }

    // Create new access - the trigger should handle this, but as a fallback
    const accessCode = this.generateAccessCode();
    const { data, error } = await this.supabase
      .from('client_portal_access')
      .insert({
        client_id: clientId,
        organization_id: client.organization_id,
        access_code: accessCode
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  private generateAccessCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i === 4 || i === 8) {
        code += '-';
      } else {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return code;
  }

  async sendWelcomeEmail(clientId: string): Promise<void> {
    // Get client details and portal access
    const { data: client } = await this.supabase
      .from('clients')
      .select(`
        *,
        organization:organizations(name, domain),
        portal_access:client_portal_access(*)
      `)
      .eq('id', clientId)
      .single();

    if (!client || !client.email) {
      throw new Error('Client not found or no email address');
    }

    const portalAccess = client.portal_access[0];
    if (!portalAccess) {
      throw new Error('Portal access not found');
    }

    // Generate magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app';
    const magicLink = `${baseUrl}/client-portal/claim?token=${portalAccess.magic_link_token}`;
    
    // Send email using your email service
    const emailData = {
      to: client.email,
      subject: `Welcome to ${client.organization.name} - Access Your Client Portal`,
      html: `
        <h2>Welcome to ${client.organization.name}!</h2>
        
        <p>Hi ${client.name},</p>
        
        <p>We're excited to have you as part of our fitness community! Your personalized client portal is ready for you to access.</p>
        
        <h3>Your Access Options:</h3>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Option 1: Quick Access Link</strong></p>
          <a href="${magicLink}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">Access Your Portal</a>
          <p style="font-size: 12px; color: #666;">This link expires in 30 days</p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Option 2: Access Code</strong></p>
          <p style="font-size: 24px; font-family: monospace; background-color: white; padding: 10px; border-radius: 4px; text-align: center;">
            ${portalAccess.access_code}
          </p>
          <p style="font-size: 12px; color: #666;">Use this code at ${baseUrl}/client-portal/login</p>
        </div>
        
        <h3>What You Can Do in Your Portal:</h3>
        <ul>
          <li>📅 Book and manage your sessions</li>
          <li>💳 View and update payment methods</li>
          <li>📊 Track your fitness progress</li>
          <li>📱 Access your body composition data</li>
          <li>👥 Manage referrals and rewards</li>
          <li>📧 Update your contact preferences</li>
        </ul>
        
        <p>If you have any questions, feel free to reply to this email or contact us at the gym.</p>
        
        <p>Looking forward to supporting you on your fitness journey!</p>
        
        <p>Best regards,<br>
        The ${client.organization.name} Team</p>
        
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          This email was sent to ${client.email} because you recently became a member at ${client.organization.name}.
          If you did not sign up, please ignore this email.
        </p>
      `,
      text: `
Welcome to ${client.organization.name}!

Hi ${client.name},

We're excited to have you as part of our fitness community! Your personalized client portal is ready for you to access.

Your Access Options:

Option 1: Quick Access Link
Visit: ${magicLink}
(This link expires in 30 days)

Option 2: Access Code
${portalAccess.access_code}
Use this code at ${baseUrl}/client-portal/login

What You Can Do in Your Portal:
- Book and manage your sessions
- View and update payment methods
- Track your fitness progress
- Access your body composition data
- Manage referrals and rewards
- Update your contact preferences

If you have any questions, feel free to reply to this email or contact us at the gym.

Looking forward to supporting you on your fitness journey!

Best regards,
The ${client.organization.name} Team
      `
    };

    // Send via Resend
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error('Failed to send welcome email');
    }

    // Update welcome email sent status
    await this.supabase
      .from('client_portal_access')
      .update({
        welcome_email_sent: true,
        welcome_email_sent_at: new Date().toISOString()
      })
      .eq('id', portalAccess.id);
  }

  async claimPortalAccess(token: string): Promise<any> {
    // Find access by magic link token
    const { data: access, error } = await this.supabase
      .from('client_portal_access')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('magic_link_token', token)
      .eq('is_claimed', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !access) {
      throw new Error('Invalid or expired access token');
    }

    // Create user account for client
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email: access.client.email,
      password: this.generateTempPassword(),
      options: {
        data: {
          role: 'client',
          client_id: access.client_id,
          organization_id: access.organization_id
        }
      }
    });

    if (authError) {
      throw authError;
    }

    // Update client with user_id
    await this.supabase
      .from('clients')
      .update({ user_id: authData.user?.id })
      .eq('id', access.client_id);

    // Mark access as claimed
    await this.supabase
      .from('client_portal_access')
      .update({
        is_claimed: true,
        claimed_at: new Date().toISOString()
      })
      .eq('id', access.id);

    return {
      client: access.client,
      user: authData.user
    };
  }

  async verifyAccessCode(code: string): Promise<any> {
    const { data: access, error } = await this.supabase
      .from('client_portal_access')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('access_code', code.toUpperCase())
      .eq('is_claimed', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !access) {
      throw new Error('Invalid or expired access code');
    }

    return access;
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
  }
}