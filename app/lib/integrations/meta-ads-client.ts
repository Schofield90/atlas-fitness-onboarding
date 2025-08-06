import { createClient } from '@/app/lib/supabase/server'

interface MetaAPIError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

interface MetaAPIResponse<T = any> {
  data?: T;
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
    previous?: string;
  };
  error?: MetaAPIError;
}

export class MetaAdsAPIError extends Error {
  public readonly code: number;
  public readonly type: string;
  public readonly subcode?: number;
  public readonly traceId?: string;
  public readonly isRetryable: boolean;

  constructor(error: MetaAPIError, isRetryable: boolean = false) {
    super(error.message);
    this.name = 'MetaAdsAPIError';
    this.code = error.code;
    this.type = error.type;
    this.subcode = error.error_subcode;
    this.traceId = error.fbtrace_id;
    this.isRetryable = isRetryable;
  }
}

export class MetaAdsClient {
  private readonly baseURL = 'https://graph.facebook.com/v18.0';
  private readonly maxRetries = 3;
  
  constructor(
    private readonly accessToken: string,
    private readonly organizationId: string
  ) {}

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    return this.retryWithBackoff(async () => {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data: MetaAPIResponse<T> = await response.json();

      if (data.error) {
        const isRetryable = this.isRetryableError(data.error);
        throw new MetaAdsAPIError(data.error, isRetryable);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return data.data || data as T;
    });
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (!this.isRetryableError(error) || i === this.maxRetries - 1) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof MetaAdsAPIError) {
      return error.isRetryable;
    }

    // Check for common retryable error codes
    const retryableCodes = [1, 2, 4, 17, 613]; // Rate limit, temporary, user request limit, etc.
    return error?.code && retryableCodes.includes(error.code);
  }

  // User and Business Account Management
  async getMe(fields: string[] = ['id', 'name', 'email']): Promise<any> {
    const fieldsParam = fields.join(',');
    return this.request(`/me?fields=${fieldsParam}`);
  }

  async getAdAccounts(): Promise<any[]> {
    const response = await this.request<any>('/me/adaccounts?fields=id,name,account_status,currency,timezone_name,account_id');
    return Array.isArray(response) ? response : response.data || [];
  }

  async getPages(): Promise<any[]> {
    const response = await this.request<any>('/me/accounts?fields=id,name,username,category,access_token');
    return Array.isArray(response) ? response : response.data || [];
  }

  // Lead Forms Management
  async getPageLeadForms(pageId: string): Promise<any[]> {
    const response = await this.request<any>(`/${pageId}/leadgen_forms?fields=id,name,status,questions`);
    return Array.isArray(response) ? response : response.data || [];
  }

  async getFormLeads(formId: string, since?: Date): Promise<any[]> {
    let endpoint = `/${formId}/leads?fields=id,created_time,field_data`;
    
    if (since) {
      const timestamp = Math.floor(since.getTime() / 1000);
      endpoint += `&filtering=[{"field":"time_created","operator":"GREATER_THAN","value":${timestamp}}]`;
    }

    const response = await this.request<any>(endpoint);
    return Array.isArray(response) ? response : response.data || [];
  }

  async getLeadDetails(leadId: string): Promise<any> {
    return this.request(`/${leadId}?fields=id,created_time,field_data`);
  }

  // Campaign and Ad Performance
  async getCampaigns(adAccountId: string, fields: string[] = ['id', 'name', 'status', 'objective']): Promise<any[]> {
    const fieldsParam = fields.join(',');
    const response = await this.request<any>(`/act_${adAccountId}/campaigns?fields=${fieldsParam}`);
    return Array.isArray(response) ? response : response.data || [];
  }

  async getCampaignInsights(
    campaignId: string, 
    dateRange?: { since: string; until: string },
    fields: string[] = ['impressions', 'clicks', 'spend', 'reach', 'frequency', 'cpm', 'cpc', 'ctr']
  ): Promise<any> {
    const fieldsParam = fields.join(',');
    let endpoint = `/${campaignId}/insights?fields=${fieldsParam}`;
    
    if (dateRange) {
      endpoint += `&time_range={"since":"${dateRange.since}","until":"${dateRange.until}"}`;
    }

    return this.request(endpoint);
  }

  async getAdSets(adAccountId: string): Promise<any[]> {
    const response = await this.request<any>(`/act_${adAccountId}/adsets?fields=id,name,status,campaign_id,targeting`);
    return Array.isArray(response) ? response : response.data || [];
  }

  async getAds(adAccountId: string): Promise<any[]> {
    const response = await this.request<any>(`/act_${adAccountId}/ads?fields=id,name,status,adset_id,creative`);
    return Array.isArray(response) ? response : response.data || [];
  }

  // Custom Audiences (for lead retargeting)
  async getCustomAudiences(adAccountId: string): Promise<any[]> {
    const response = await this.request<any>(`/act_${adAccountId}/customaudiences?fields=id,name,approximate_count,data_source`);
    return Array.isArray(response) ? response : response.data || [];
  }

  async createCustomAudience(adAccountId: string, audienceData: {
    name: string;
    description?: string;
    customer_file_source?: string;
  }): Promise<any> {
    return this.request(`/act_${adAccountId}/customaudiences`, {
      method: 'POST',
      body: JSON.stringify({
        name: audienceData.name,
        description: audienceData.description,
        subtype: 'CUSTOM',
        customer_file_source: audienceData.customer_file_source || 'USER_PROVIDED_ONLY',
      }),
    });
  }

  async addUsersToCustomAudience(audienceId: string, users: Array<{
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
  }>): Promise<any> {
    const hashedUsers = users.map(user => {
      const hashedUser: any = {};
      if (user.email) hashedUser.email = user.email.toLowerCase().trim();
      if (user.phone) hashedUser.phone = user.phone.replace(/[^0-9]/g, '');
      if (user.first_name) hashedUser.first_name = user.first_name.toLowerCase().trim();
      if (user.last_name) hashedUser.last_name = user.last_name.toLowerCase().trim();
      return hashedUser;
    });

    return this.request(`/${audienceId}/users`, {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          schema: Object.keys(hashedUsers[0]),
          data: hashedUsers.map(user => Object.values(user)),
        },
      }),
    });
  }

  // Webhook Management
  async subscribeToWebhooks(pageId: string, webhookUrl: string, verifyToken: string): Promise<any> {
    return this.request(`/${pageId}/subscribed_apps`, {
      method: 'POST',
      body: JSON.stringify({
        subscribed_fields: ['leadgen'],
        callback_url: webhookUrl,
        verify_token: verifyToken,
      }),
    });
  }

  async getWebhookSubscriptions(pageId: string): Promise<any> {
    return this.request(`/${pageId}/subscribed_apps?fields=subscribed_fields`);
  }

  // Validation and Testing
  async validateAccessToken(): Promise<boolean> {
    try {
      await this.getMe(['id']);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getTokenInfo(): Promise<any> {
    return this.request('/oauth/access_token_info');
  }

  // Static utility methods
  static async createFromIntegration(organizationId: string): Promise<MetaAdsClient | null> {
    const supabase = await createClient();
    
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('access_token')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (!integration?.access_token) {
      return null;
    }

    return new MetaAdsClient(integration.access_token, organizationId);
  }

  static generateOAuthUrl(appId: string, redirectUri: string, permissions: string[] = [
    'pages_show_list',
    'pages_read_engagement', 
    'pages_manage_metadata',
    'leads_retrieval',
    'ads_read',
    'ads_management',
    'business_management'
  ]): string {
    const scope = permissions.join(',');
    const state = 'atlas_fitness_oauth';
    
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope,
      state,
      response_type: 'code',
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }
}

export default MetaAdsClient;