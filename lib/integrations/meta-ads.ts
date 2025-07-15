import { z } from 'zod';

// Meta Ads API configuration
const META_API_VERSION = 'v18.0';
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Zod schemas for Meta Ads API responses
const MetaAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  account_id: z.string(),
  account_status: z.number(),
  business_name: z.string().optional(),
  currency: z.string(),
  timezone_name: z.string(),
  spend_cap: z.string().optional(),
  balance: z.string().optional(),
});

const MetaCampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED']),
  objective: z.string(),
  budget_rebalance_flag: z.boolean().optional(),
  buying_type: z.string().optional(),
  created_time: z.string(),
  updated_time: z.string(),
  start_time: z.string().optional(),
  stop_time: z.string().optional(),
  daily_budget: z.string().optional(),
  lifetime_budget: z.string().optional(),
});

const MetaAdSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  campaign_id: z.string(),
  status: z.enum(['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED']),
  targeting: z.object({
    age_max: z.number().optional(),
    age_min: z.number().optional(),
    genders: z.array(z.number()).optional(),
    geo_locations: z.object({
      countries: z.array(z.string()).optional(),
      regions: z.array(z.object({
        key: z.string(),
        name: z.string(),
      })).optional(),
      cities: z.array(z.object({
        key: z.string(),
        name: z.string(),
      })).optional(),
    }).optional(),
    interests: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })).optional(),
  }),
  daily_budget: z.string().optional(),
  lifetime_budget: z.string().optional(),
  bid_amount: z.string().optional(),
  optimization_goal: z.string(),
  billing_event: z.string(),
  created_time: z.string(),
  updated_time: z.string(),
});

const MetaAdSchema = z.object({
  id: z.string(),
  name: z.string(),
  adset_id: z.string(),
  campaign_id: z.string(),
  status: z.enum(['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED']),
  creative: z.object({
    id: z.string(),
    name: z.string(),
    title: z.string().optional(),
    body: z.string().optional(),
    image_url: z.string().optional(),
    video_id: z.string().optional(),
    call_to_action: z.object({
      type: z.string(),
      value: z.object({
        link: z.string().optional(),
        application: z.string().optional(),
      }).optional(),
    }).optional(),
  }),
  created_time: z.string(),
  updated_time: z.string(),
});

const MetaInsightsSchema = z.object({
  impressions: z.string(),
  clicks: z.string(),
  spend: z.string(),
  reach: z.string(),
  frequency: z.string(),
  ctr: z.string(),
  cpc: z.string(),
  cpm: z.string(),
  cpp: z.string(),
  actions: z.array(z.object({
    action_type: z.string(),
    value: z.string(),
  })).optional(),
  cost_per_action_type: z.array(z.object({
    action_type: z.string(),
    value: z.string(),
  })).optional(),
  date_start: z.string(),
  date_stop: z.string(),
});

const MetaLeadSchema = z.object({
  id: z.string(),
  created_time: z.string(),
  ad_id: z.string(),
  adset_id: z.string(),
  campaign_id: z.string(),
  form_id: z.string(),
  field_data: z.array(z.object({
    name: z.string(),
    values: z.array(z.string()),
  })),
  is_organic: z.boolean(),
  partner_name: z.string().optional(),
  platform: z.string().optional(),
});

export type MetaAccount = z.infer<typeof MetaAccountSchema>;
export type MetaCampaign = z.infer<typeof MetaCampaignSchema>;
export type MetaAdSet = z.infer<typeof MetaAdSetSchema>;
export type MetaAd = z.infer<typeof MetaAdSchema>;
export type MetaInsights = z.infer<typeof MetaInsightsSchema>;
export type MetaLead = z.infer<typeof MetaLeadSchema>;

export interface MetaAdsClientConfig {
  accessToken: string;
  appId: string;
  appSecret: string;
  accountId: string;
}

export interface CampaignCreateData {
  name: string;
  objective: string;
  status: 'ACTIVE' | 'PAUSED';
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  special_ad_categories?: string[];
}

export interface AdSetCreateData {
  name: string;
  campaign_id: string;
  status: 'ACTIVE' | 'PAUSED';
  daily_budget?: string;
  lifetime_budget?: string;
  targeting: {
    age_max?: number;
    age_min?: number;
    genders?: number[];
    geo_locations?: {
      countries?: string[];
      regions?: Array<{ key: string; name: string }>;
      cities?: Array<{ key: string; name: string }>;
    };
    interests?: Array<{ id: string; name: string }>;
  };
  optimization_goal: string;
  billing_event: string;
  bid_amount?: string;
}

export interface AdCreateData {
  name: string;
  adset_id: string;
  status: 'ACTIVE' | 'PAUSED';
  creative: {
    name: string;
    title?: string;
    body?: string;
    image_url?: string;
    video_id?: string;
    call_to_action?: {
      type: string;
      value?: {
        link?: string;
        application?: string;
      };
    };
  };
}

export class MetaAdsClient {
  private config: MetaAdsClientConfig;

  constructor(config: MetaAdsClientConfig) {
    this.config = config;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: Record<string, any>
  ): Promise<T> {
    const url = `${META_API_BASE_URL}${endpoint}`;
    const params = new URLSearchParams({
      access_token: this.config.accessToken,
    });

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method === 'GET' && data) {
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
          params.append(key, data[key].toString());
        }
      });
    } else if (method !== 'GET' && data) {
      fetchOptions.body = JSON.stringify({ ...data, access_token: this.config.accessToken });
    }

    const response = await fetch(`${url}?${params}`, fetchOptions);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Meta API Error: ${error.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  // Account Management
  async getAccount(): Promise<MetaAccount> {
    const response = await this.makeRequest<MetaAccount>(
      `/act_${this.config.accountId}`,
      'GET',
      {
        fields: 'id,name,account_id,account_status,business_name,currency,timezone_name,spend_cap,balance'
      }
    );
    return MetaAccountSchema.parse(response);
  }

  async getAccountInsights(dateRange: { since: string; until: string }): Promise<MetaInsights> {
    const response = await this.makeRequest<{ data: MetaInsights[] }>(
      `/act_${this.config.accountId}/insights`,
      'GET',
      {
        fields: 'impressions,clicks,spend,reach,frequency,ctr,cpc,cpm,cpp,actions,cost_per_action_type',
        time_range: JSON.stringify(dateRange),
        time_increment: 1,
      }
    );
    return MetaInsightsSchema.parse(response.data[0]);
  }

  // Campaign Management
  async getCampaigns(): Promise<MetaCampaign[]> {
    const response = await this.makeRequest<{ data: MetaCampaign[] }>(
      `/act_${this.config.accountId}/campaigns`,
      'GET',
      {
        fields: 'id,name,status,objective,budget_rebalance_flag,buying_type,created_time,updated_time,start_time,stop_time,daily_budget,lifetime_budget'
      }
    );
    return response.data.map(campaign => MetaCampaignSchema.parse(campaign));
  }

  async createCampaign(data: CampaignCreateData): Promise<MetaCampaign> {
    const response = await this.makeRequest<{ id: string }>(
      `/act_${this.config.accountId}/campaigns`,
      'POST',
      data
    );
    
    // Get the created campaign details
    const campaign = await this.makeRequest<MetaCampaign>(
      `/${response.id}`,
      'GET',
      {
        fields: 'id,name,status,objective,budget_rebalance_flag,buying_type,created_time,updated_time,start_time,stop_time,daily_budget,lifetime_budget'
      }
    );
    
    return MetaCampaignSchema.parse(campaign);
  }

  async updateCampaign(campaignId: string, data: Partial<CampaignCreateData>): Promise<boolean> {
    const response = await this.makeRequest<{ success: boolean }>(
      `/${campaignId}`,
      'POST',
      data
    );
    return response.success;
  }

  async deleteCampaign(campaignId: string): Promise<boolean> {
    const response = await this.makeRequest<{ success: boolean }>(
      `/${campaignId}`,
      'DELETE'
    );
    return response.success;
  }

  async getCampaignInsights(campaignId: string, dateRange: { since: string; until: string }): Promise<MetaInsights> {
    const response = await this.makeRequest<{ data: MetaInsights[] }>(
      `/${campaignId}/insights`,
      'GET',
      {
        fields: 'impressions,clicks,spend,reach,frequency,ctr,cpc,cpm,cpp,actions,cost_per_action_type',
        time_range: JSON.stringify(dateRange),
        time_increment: 1,
      }
    );
    return MetaInsightsSchema.parse(response.data[0]);
  }

  // Ad Set Management
  async getAdSets(campaignId?: string): Promise<MetaAdSet[]> {
    const endpoint = campaignId 
      ? `/${campaignId}/adsets`
      : `/act_${this.config.accountId}/adsets`;
    
    const response = await this.makeRequest<{ data: MetaAdSet[] }>(
      endpoint,
      'GET',
      {
        fields: 'id,name,campaign_id,status,targeting,daily_budget,lifetime_budget,bid_amount,optimization_goal,billing_event,created_time,updated_time'
      }
    );
    return response.data.map(adset => MetaAdSetSchema.parse(adset));
  }

  async createAdSet(data: AdSetCreateData): Promise<MetaAdSet> {
    const response = await this.makeRequest<{ id: string }>(
      `/act_${this.config.accountId}/adsets`,
      'POST',
      data
    );
    
    // Get the created ad set details
    const adset = await this.makeRequest<MetaAdSet>(
      `/${response.id}`,
      'GET',
      {
        fields: 'id,name,campaign_id,status,targeting,daily_budget,lifetime_budget,bid_amount,optimization_goal,billing_event,created_time,updated_time'
      }
    );
    
    return MetaAdSetSchema.parse(adset);
  }

  // Ad Management
  async getAds(adsetId?: string): Promise<MetaAd[]> {
    const endpoint = adsetId 
      ? `/${adsetId}/ads`
      : `/act_${this.config.accountId}/ads`;
    
    const response = await this.makeRequest<{ data: MetaAd[] }>(
      endpoint,
      'GET',
      {
        fields: 'id,name,adset_id,campaign_id,status,creative,created_time,updated_time'
      }
    );
    return response.data.map(ad => MetaAdSchema.parse(ad));
  }

  async createAd(data: AdCreateData): Promise<MetaAd> {
    const response = await this.makeRequest<{ id: string }>(
      `/act_${this.config.accountId}/ads`,
      'POST',
      data
    );
    
    // Get the created ad details
    const ad = await this.makeRequest<MetaAd>(
      `/${response.id}`,
      'GET',
      {
        fields: 'id,name,adset_id,campaign_id,status,creative,created_time,updated_time'
      }
    );
    
    return MetaAdSchema.parse(ad);
  }

  // Lead Management
  async getLeads(formId: string): Promise<MetaLead[]> {
    const response = await this.makeRequest<{ data: MetaLead[] }>(
      `/${formId}/leads`,
      'GET',
      {
        fields: 'id,created_time,ad_id,adset_id,campaign_id,form_id,field_data,is_organic,partner_name,platform'
      }
    );
    return response.data.map(lead => MetaLeadSchema.parse(lead));
  }

  // Targeting and Interests
  async searchInterests(query: string): Promise<Array<{ id: string; name: string; audience_size: number }>> {
    const response = await this.makeRequest<{ data: Array<{ id: string; name: string; audience_size: number }> }>(
      `/search`,
      'GET',
      {
        type: 'adinterest',
        q: query,
        limit: 100,
      }
    );
    return response.data;
  }

  async getTargetingSpecs(): Promise<any> {
    const response = await this.makeRequest<any>(
      `/act_${this.config.accountId}/targeting_specs`,
      'GET'
    );
    return response;
  }

  // Webhooks
  async subscribeToWebhooks(pageId: string, webhookUrl: string): Promise<boolean> {
    const response = await this.makeRequest<{ success: boolean }>(
      `/${pageId}/subscribed_apps`,
      'POST',
      {
        subscribed_fields: 'leadgen',
        callback_url: webhookUrl,
        verify_token: process.env.META_WEBHOOK_VERIFY_TOKEN,
      }
    );
    return response.success;
  }

  // Batch Operations
  async batchRequest(requests: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    relative_url: string;
    body?: Record<string, any>;
  }>): Promise<Array<Record<string, any>>> {
    const response = await this.makeRequest<{ data: Array<Record<string, any>> }>(
      `/`,
      'POST',
      {
        batch: requests.map(req => ({
          ...req,
          body: req.body ? JSON.stringify(req.body) : undefined,
        })),
      }
    );
    return response.data;
  }

  // Utility Methods
  async validateAccessToken(): Promise<boolean> {
    try {
      await this.getAccount();
      return true;
    } catch (error) {
      console.error('Access token validation failed:', error);
      return false;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await fetch('https://graph.facebook.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.appId,
        client_secret: this.config.appSecret,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }
}

// Factory function to create Meta Ads client
export function createMetaAdsClient(config: MetaAdsClientConfig): MetaAdsClient {
  return new MetaAdsClient(config);
}

// Helper function to get client from environment
export function getMetaAdsClient(accountId: string): MetaAdsClient {
  const config: MetaAdsClientConfig = {
    accessToken: process.env.META_ACCESS_TOKEN || '',
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    accountId,
  };

  if (!config.accessToken || !config.appId || !config.appSecret) {
    throw new Error('Meta Ads API credentials not configured');
  }

  return createMetaAdsClient(config);
}