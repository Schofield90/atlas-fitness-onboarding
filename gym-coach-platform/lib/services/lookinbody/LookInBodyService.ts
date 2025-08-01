import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export interface LookInBodyConfig {
  id: string;
  organization_id: string;
  api_key: string;
  account_name: string;
  region: string;
  webhook_secret: string;
  webhook_enabled: boolean;
  device_serials: string[];
  locations: any[];
  auto_sync_enabled: boolean;
  alert_thresholds: {
    significant_weight_change: number;
    significant_fat_change: number;
    high_visceral_fat: number;
    low_phase_angle: number;
  };
  api_plan: 'basic' | 'professional' | 'enterprise';
  billing_status: string;
  is_active: boolean;
}

export interface BodyCompositionScan {
  id?: string;
  client_id: string;
  organization_id: string;
  lookinbody_user_token: string;
  lookinbody_scan_id: string;
  weight: number;
  height: number;
  bmi: number;
  total_body_water: number;
  intracellular_water: number;
  extracellular_water: number;
  ecw_tbw_ratio: number;
  lean_body_mass: number;
  skeletal_muscle_mass: number;
  body_fat_mass: number;
  body_fat_percentage: number;
  segmental_lean_mass: any;
  segmental_fat_mass: any;
  basal_metabolic_rate: number;
  visceral_fat_level: number;
  visceral_fat_area: number;
  phase_angle: number;
  inbody_score: number;
  body_cell_mass: number;
  impedance_data: any;
  target_values: any;
  scan_date: string;
  scan_location?: string;
  device_serial?: string;
  location_id?: string;
  raw_api_response?: any;
}

interface ApiLimits {
  basic: number;
  professional: number;
  enterprise: number;
}

export class LookInBodyService {
  private config: LookInBodyConfig | null = null;
  private supabase: any;
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
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

  async initialize(): Promise<void> {
    const { data, error } = await this.supabase
      .from('lookinbody_config')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error(`LookInBody not configured for organization ${this.organizationId}`);
    }

    this.config = data;
  }

  async validateAccess(): Promise<boolean> {
    if (!this.config) await this.initialize();
    return this.config?.billing_status === 'active' && this.config?.is_active;
  }

  private getApiLimits(): ApiLimits {
    return {
      basic: 500,
      professional: 1500,
      enterprise: 5000
    };
  }

  private async trackApiUsage(method: string): Promise<void> {
    await this.supabase.rpc('track_lookinbody_api_usage', {
      p_organization_id: this.organizationId,
      p_usage_type: 'api_call'
    });
  }

  private async checkApiLimits(): Promise<boolean> {
    if (!this.config) return false;

    const limits = this.getApiLimits();
    const limit = limits[this.config.api_plan] || limits.basic;
    
    return (this.config.api_calls_used_this_month || 0) < limit;
  }

  private async getCurrentMonthUsage() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data } = await this.supabase
      .from('lookinbody_api_usage')
      .select('api_calls_count')
      .eq('organization_id', this.organizationId)
      .gte('date', startOfMonth.toISOString())
      .order('date', { ascending: false });

    return data?.reduce((sum, row) => sum + row.api_calls_count, 0) || 0;
  }

  // Make API call to LookInBody with organization's credentials
  private async makeApiCall(endpoint: string, method: string = 'GET', body?: any) {
    if (!this.config) throw new Error('Service not initialized');
    
    if (!await this.checkApiLimits()) {
      throw new Error('API usage limit exceeded for this month');
    }

    await this.trackApiUsage(endpoint);

    const baseUrl = this.getRegionBaseUrl(this.config.region);
    const url = `${baseUrl}${endpoint}`;

    const headers = {
      'Authorization': `Bearer ${this.config.api_key}`,
      'Content-Type': 'application/json',
      'X-Account-Name': this.config.account_name
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        throw new Error(`LookInBody API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`LookInBody API error for org ${this.organizationId}:`, error);
      throw error;
    }
  }

  private getRegionBaseUrl(region: string): string {
    const regions: Record<string, string> = {
      usa: 'https://api.lookinbody.com/v1',
      eur: 'https://api.eu.lookinbody.com/v1',
      asia: 'https://api.asia.lookinbody.com/v1',
      uk: 'https://api.uk.lookinbody.com/v1'
    };
    return regions[region] || regions.usa;
  }

  // Get scans for a client by phone number
  async getClientScans(phoneNumber: string): Promise<BodyCompositionScan[]> {
    if (!await this.validateAccess()) {
      throw new Error('LookInBody access denied');
    }

    try {
      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      // First check if we have cached scans
      const { data: cachedScans } = await this.supabase
        .from('body_composition_scans')
        .select('*')
        .eq('organization_id', this.organizationId)
        .eq('lookinbody_user_token', normalizedPhone)
        .order('scan_date', { ascending: false });

      // If we have recent scans (within 24 hours), return them
      if (cachedScans && cachedScans.length > 0) {
        const latestScan = cachedScans[0];
        const hoursSinceSync = (Date.now() - new Date(latestScan.last_sync_at).getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceSync < 24) {
          return cachedScans;
        }
      }

      // Otherwise, fetch from LookInBody API
      const apiScans = await this.makeApiCall(`/scans?user_token=${normalizedPhone}`);
      
      // Process and save the scans
      const processedScans = await this.processAndSaveScans(apiScans, normalizedPhone);
      
      return processedScans;
    } catch (error) {
      console.error('Error fetching client scans:', error);
      throw error;
    }
  }

  // Process webhook data from LookInBody
  async processWebhookData(payload: any, signature: string): Promise<BodyCompositionScan> {
    if (!this.config) await this.initialize();
    
    // Verify webhook signature
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    await this.supabase.rpc('track_lookinbody_api_usage', {
      p_organization_id: this.organizationId,
      p_usage_type: 'webhook'
    });

    // Extract scan data from webhook payload
    const scanData = this.extractScanData(payload);
    
    // Find matching client
    const client = await this.findClientByPhone(scanData.lookinbody_user_token);
    if (!client) {
      console.log(`No client found for phone: ${scanData.lookinbody_user_token}`);
      throw new Error('No matching client found');
    }

    // Save scan to database
    const scan = await this.saveScan({
      ...scanData,
      client_id: client.id,
      organization_id: this.organizationId
    });

    // Generate health alerts
    await this.generateHealthAlerts(scan);

    await this.supabase.rpc('track_lookinbody_api_usage', {
      p_organization_id: this.organizationId,
      p_usage_type: 'scan'
    });

    return scan;
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    if (!this.config) return false;
    
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhook_secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === expectedSignature;
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Handle UK numbers
    if (digits.startsWith('44')) {
      return `+${digits}`;
    }
    if (digits.startsWith('0') && digits.length === 11) {
      return `+44${digits.substring(1)}`;
    }
    
    // Handle US numbers
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // Return with + prefix if not already present
    return digits.startsWith('+') ? digits : `+${digits}`;
  }

  private async findClientByPhone(phoneNumber: string): Promise<any> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    
    // First check phone mappings
    const { data: mapping } = await this.supabase
      .from('client_phone_mappings')
      .select('client_id')
      .eq('organization_id', this.organizationId)
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

    // Try direct phone match on clients table
    const { data: client } = await this.supabase
      .from('clients')
      .select('*')
      .eq('organization_id', this.organizationId)
      .or(`phone.eq.${normalizedPhone},phone.eq.${phoneNumber}`)
      .single();

    return client;
  }

  private extractScanData(payload: any): Partial<BodyCompositionScan> {
    // Map LookInBody webhook payload to our schema
    return {
      lookinbody_user_token: payload.user_token,
      lookinbody_scan_id: payload.scan_id,
      weight: payload.weight,
      height: payload.height,
      bmi: payload.bmi,
      total_body_water: payload.total_body_water,
      intracellular_water: payload.intracellular_water,
      extracellular_water: payload.extracellular_water,
      ecw_tbw_ratio: payload.ecw_tbw_ratio,
      lean_body_mass: payload.lean_body_mass,
      skeletal_muscle_mass: payload.skeletal_muscle_mass,
      body_fat_mass: payload.body_fat_mass,
      body_fat_percentage: payload.body_fat_percentage,
      segmental_lean_mass: payload.segmental_lean_mass,
      segmental_fat_mass: payload.segmental_fat_mass,
      basal_metabolic_rate: payload.basal_metabolic_rate,
      visceral_fat_level: payload.visceral_fat_level,
      visceral_fat_area: payload.visceral_fat_area,
      phase_angle: payload.phase_angle,
      inbody_score: payload.inbody_score,
      body_cell_mass: payload.body_cell_mass,
      impedance_data: payload.impedance_data,
      target_values: payload.target_values,
      scan_date: payload.scan_date,
      scan_location: payload.location,
      device_serial: payload.device_serial,
      raw_api_response: payload
    };
  }

  private async saveScan(scanData: BodyCompositionScan): Promise<BodyCompositionScan> {
    const { data, error } = await this.supabase
      .from('body_composition_scans')
      .insert([scanData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async processAndSaveScans(apiScans: any[], phoneNumber: string): Promise<BodyCompositionScan[]> {
    const client = await this.findClientByPhone(phoneNumber);
    if (!client) return [];

    const processedScans = [];
    
    for (const apiScan of apiScans) {
      const scanData = this.extractScanData(apiScan);
      const scan = await this.saveScan({
        ...scanData,
        client_id: client.id,
        organization_id: this.organizationId
      } as BodyCompositionScan);
      
      processedScans.push(scan);
    }

    return processedScans;
  }

  private async generateHealthAlerts(scan: BodyCompositionScan): Promise<void> {
    if (!this.config) return;
    
    const alerts = [];
    const thresholds = this.config.alert_thresholds;

    // Check for health risks
    if (scan.visceral_fat_level > thresholds.high_visceral_fat) {
      alerts.push({
        scan_id: scan.id,
        client_id: scan.client_id,
        organization_id: scan.organization_id,
        alert_type: 'health_risk',
        severity: 'high',
        title: 'High Visceral Fat Level',
        message: `Visceral fat level (${scan.visceral_fat_level}) exceeds healthy range. Consider scheduling a health consultation.`,
        trigger_metric: 'visceral_fat_level',
        trigger_value: scan.visceral_fat_level,
        threshold_value: thresholds.high_visceral_fat
      });
    }

    if (scan.phase_angle < thresholds.low_phase_angle) {
      alerts.push({
        scan_id: scan.id,
        client_id: scan.client_id,
        organization_id: scan.organization_id,
        alert_type: 'health_risk',
        severity: 'medium',
        title: 'Low Phase Angle',
        message: `Phase angle (${scan.phase_angle}°) is below optimal range, indicating potential cellular health concerns.`,
        trigger_metric: 'phase_angle',
        trigger_value: scan.phase_angle,
        threshold_value: thresholds.low_phase_angle
      });
    }

    // Check for achievements (if we have previous scan data)
    if (scan.body_fat_change && scan.body_fat_change <= -thresholds.significant_fat_change) {
      alerts.push({
        scan_id: scan.id,
        client_id: scan.client_id,
        organization_id: scan.organization_id,
        alert_type: 'achievement',
        severity: 'low',
        title: 'Significant Fat Loss Achievement',
        message: `Congratulations! You've lost ${Math.abs(scan.body_fat_change)}% body fat since your last scan.`,
        trigger_metric: 'body_fat_change',
        trigger_value: scan.body_fat_change,
        threshold_value: -thresholds.significant_fat_change
      });
    }

    // Save alerts to database
    if (alerts.length > 0) {
      await this.supabase
        .from('body_composition_alerts')
        .insert(alerts);
    }
  }

  // Get usage statistics for the organization
  async getUsageStats(): Promise<any> {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const { data } = await this.supabase
      .from('lookinbody_api_usage')
      .select('*')
      .eq('organization_id', this.organizationId)
      .gte('date', currentMonth.toISOString())
      .order('date', { ascending: false });

    const totals = data?.reduce((acc, row) => ({
      api_calls: acc.api_calls + row.api_calls_count,
      webhooks: acc.webhooks + row.webhooks_received,
      scans: acc.scans + row.scans_processed,
      cost: acc.cost + (row.api_cost || 0)
    }), { api_calls: 0, webhooks: 0, scans: 0, cost: 0 });

    return {
      ...totals,
      limit: this.getApiLimits()[this.config?.api_plan || 'basic'],
      remaining: this.getApiLimits()[this.config?.api_plan || 'basic'] - (totals?.api_calls || 0)
    };
  }
}