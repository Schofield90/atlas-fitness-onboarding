import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export class ClientMatchingService {
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

  async matchClientByPhone(phoneNumber: string, organizationId: string): Promise<any> {
    // Normalize phone number
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    
    // Try exact match first
    let client = await this.findClientByExactPhone(normalizedPhone, organizationId);
    
    // Try fuzzy matching if exact fails
    if (!client) {
      client = await this.findClientByFuzzyPhone(normalizedPhone, organizationId);
    }
    
    // If still no match, try alternative formats
    if (!client) {
      client = await this.findClientByAlternativeFormats(phoneNumber, organizationId);
    }
    
    return client;
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digits
    let digits = phone.replace(/\D/g, '');
    
    // Handle UK numbers
    if (digits.startsWith('44')) {
      return `+${digits}`;
    }
    if (digits.startsWith('0') && digits.length === 11) {
      // UK mobile number starting with 0
      return `+44${digits.substring(1)}`;
    }
    if (digits.startsWith('7') && digits.length === 10) {
      // UK mobile without country code or 0
      return `+44${digits}`;
    }
    
    // Handle US numbers
    if (digits.length === 10 && !digits.startsWith('0')) {
      return `+1${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // Handle other international formats
    if (!digits.startsWith('+') && digits.length > 10) {
      return `+${digits}`;
    }
    
    return digits;
  }

  private async findClientByExactPhone(normalizedPhone: string, organizationId: string): Promise<any> {
    // First check the phone mappings table
    const { data: mapping } = await this.supabase
      .from('client_phone_mappings')
      .select('client_id')
      .eq('organization_id', organizationId)
      .eq('normalized_phone', normalizedPhone)
      .single();

    if (mapping) {
      const { data: client } = await this.supabase
        .from('clients')
        .select('*')
        .eq('id', mapping.client_id)
        .single();
      return client;
    }

    // Try direct match on clients table
    const { data: client } = await this.supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('phone', normalizedPhone)
      .single();

    return client;
  }

  private async findClientByFuzzyPhone(normalizedPhone: string, organizationId: string): Promise<any> {
    // Remove country code for comparison
    const phoneWithoutCountry = normalizedPhone.replace(/^\+\d{1,3}/, '');
    
    // Try to find clients with similar phone numbers
    const { data: clients } = await this.supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`phone.like.%${phoneWithoutCountry},phone.like.%${phoneWithoutCountry.substring(1)}`);

    if (clients && clients.length === 1) {
      return clients[0];
    }

    return null;
  }

  private async findClientByAlternativeFormats(originalPhone: string, organizationId: string): Promise<any> {
    const alternativeFormats = this.generateAlternativeFormats(originalPhone);
    
    for (const format of alternativeFormats) {
      const { data: client } = await this.supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('phone', format)
        .single();

      if (client) {
        return client;
      }
    }

    return null;
  }

  private generateAlternativeFormats(phone: string): string[] {
    const formats = new Set<string>();
    const digits = phone.replace(/\D/g, '');
    
    // Original format
    formats.add(phone);
    
    // Just digits
    formats.add(digits);
    
    // With spaces (UK format)
    if (digits.length === 11 && digits.startsWith('0')) {
      formats.add(`${digits.substring(0, 5)} ${digits.substring(5)}`);
      formats.add(`${digits.substring(0, 5)}-${digits.substring(5)}`);
    }
    
    // With country code variations
    if (digits.startsWith('44')) {
      formats.add(`0${digits.substring(2)}`); // Replace +44 with 0
    }
    if (digits.startsWith('0')) {
      formats.add(`44${digits.substring(1)}`); // Replace 0 with 44
      formats.add(`+44${digits.substring(1)}`); // Replace 0 with +44
    }
    
    // Common formatting patterns
    if (digits.length === 10) {
      formats.add(`(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`);
      formats.add(`${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}`);
      formats.add(`${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6)}`);
    }
    
    return Array.from(formats);
  }

  async createPhoneMapping(clientId: string, phoneNumber: string, organizationId: string, verified: boolean = false): Promise<void> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    
    try {
      await this.supabase
        .from('client_phone_mappings')
        .upsert({
          client_id: clientId,
          organization_id: organizationId,
          phone_number: phoneNumber,
          normalized_phone: normalizedPhone,
          verified: verified
        }, {
          onConflict: 'organization_id,normalized_phone'
        });
    } catch (error) {
      console.error('Error creating phone mapping:', error);
    }
  }

  async verifyPhoneMapping(clientId: string, verificationCode: string): Promise<boolean> {
    const { data: mapping } = await this.supabase
      .from('client_phone_mappings')
      .select('*')
      .eq('client_id', clientId)
      .eq('verification_code', verificationCode)
      .single();

    if (!mapping) {
      return false;
    }

    // Check if verification code is still valid (within 15 minutes)
    const sentAt = new Date(mapping.verification_sent_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - sentAt.getTime()) / (1000 * 60);
    
    if (diffMinutes > 15) {
      return false;
    }

    // Mark as verified
    await this.supabase
      .from('client_phone_mappings')
      .update({ 
        verified: true,
        verification_code: null,
        verification_sent_at: null
      })
      .eq('id', mapping.id);

    return true;
  }

  async sendVerificationCode(clientId: string, phoneNumber: string, organizationId: string): Promise<void> {
    const verificationCode = this.generateVerificationCode();
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    
    // Create or update mapping with verification code
    await this.supabase
      .from('client_phone_mappings')
      .upsert({
        client_id: clientId,
        organization_id: organizationId,
        phone_number: phoneNumber,
        normalized_phone: normalizedPhone,
        verification_code: verificationCode,
        verification_sent_at: new Date().toISOString(),
        verified: false
      }, {
        onConflict: 'organization_id,normalized_phone'
      });

    // Send SMS with verification code (integrate with your SMS service)
    // await sendSMS(phoneNumber, `Your verification code is: ${verificationCode}`);
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Bulk import phone mappings from CSV or existing data
  async bulkImportPhoneMappings(mappings: Array<{ clientId: string; phone: string }>, organizationId: string): Promise<void> {
    const mappingData = mappings.map(m => ({
      client_id: m.clientId,
      organization_id: organizationId,
      phone_number: m.phone,
      normalized_phone: this.normalizePhoneNumber(m.phone),
      verified: true // Assuming bulk imports are pre-verified
    }));

    const { error } = await this.supabase
      .from('client_phone_mappings')
      .upsert(mappingData, {
        onConflict: 'organization_id,normalized_phone'
      });

    if (error) {
      console.error('Error bulk importing phone mappings:', error);
      throw error;
    }
  }
}