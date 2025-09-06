/**
 * Facebook Ads Integration Test Harness
 * 
 * This test harness validates the Facebook Ads API integration including:
 * - Ad account connection and management
 * - Campaign creation, modification, and status changes
 * - Creative upload and management
 * - Metrics synchronization
 * - Budget optimization
 * - Error handling and retry logic
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Mock Facebook API responses for testing
const mockFacebookResponses = {
  adAccounts: {
    data: [
      {
        id: 'act_123456789',
        name: 'Test Gym Ad Account',
        account_status: 1,
        currency: 'USD',
        timezone_name: 'America/New_York',
        spend_cap: 100000
      }
    ]
  },
  campaigns: {
    data: [
      {
        id: '23846713468910176',
        name: 'Gym Membership Campaign',
        objective: 'LEAD_GENERATION',
        status: 'ACTIVE',
        created_time: '2024-01-01T00:00:00+0000',
        updated_time: '2024-01-01T12:00:00+0000'
      }
    ]
  },
  insights: {
    data: [
      {
        spend: '45.67',
        impressions: '12500',
        clicks: '123',
        actions: [
          {
            action_type: 'lead',
            value: '8'
          }
        ]
      }
    ]
  },
  adSets: {
    data: [
      {
        id: '23846713468920176',
        name: 'Fitness Enthusiasts',
        campaign_id: '23846713468910176',
        optimization_goal: 'LEAD_GENERATION',
        billing_event: 'IMPRESSIONS',
        daily_budget: 2000,
        status: 'ACTIVE'
      }
    ]
  },
  ads: {
    data: [
      {
        id: '23846713468930176',
        name: 'Join Our Gym Ad',
        adset_id: '23846713468920176',
        status: 'ACTIVE',
        creative: {
          id: '23846713468940176',
          name: 'Gym Creative',
          title: 'Transform Your Body',
          body: 'Join our gym today and get 50% off your first month!'
        }
      }
    ]
  }
};

// Test configuration
const testConfig = {
  supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
  supabaseKey: process.env.SUPABASE_ANON_KEY || 'test-key',
  testOrgId: 'test-org-' + Date.now(),
  testUserId: 'test-user-' + Date.now(),
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
};

describe('Facebook Ads Integration Test Harness', () => {
  let supabase: any;
  let testSession: any;

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(testConfig.supabaseUrl, testConfig.supabaseKey);

    // Create test organization and user
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  beforeEach(() => {
    // Reset any global state before each test
    jest.clearAllMocks();
  });

  describe('Ad Account Management', () => {
    it('should fetch connected ad accounts', async () => {
      // Mock Facebook API call
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockFacebookResponses.adAccounts
      });

      const response = await fetch(`${testConfig.baseUrl}/api/ads/accounts`, {
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.accounts).toBeDefined();
      expect(Array.isArray(data.accounts)).toBe(true);
    });

    it('should handle ad account connection', async () => {
      const mockAccessToken = 'test_access_token';
      const mockAdAccountId = '123456789';

      // Mock successful Facebook API responses
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: `act_${mockAdAccountId}`,
          name: 'Test Gym Ad Account',
          account_status: 1,
          currency: 'USD',
          timezone_name: 'America/New_York'
        })
      });

      const response = await fetch(`${testConfig.baseUrl}/api/ads/accounts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          facebook_ad_account_id: mockAdAccountId,
          access_token: mockAccessToken
        })
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.account).toBeDefined();
    });

    it('should handle Facebook API errors during ad account connection', async () => {
      // Mock Facebook API error
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            message: 'Invalid access token',
            type: 'OAuthException',
            code: 190
          }
        })
      });

      const response = await fetch(`${testConfig.baseUrl}/api/ads/accounts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          facebook_ad_account_id: '123456789',
          access_token: 'invalid_token'
        })
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.error).toContain('Failed to fetch ad account from Facebook');
    });
  });

  describe('Campaign Management', () => {
    it('should create a new campaign with ad set and creative', async () => {
      // Mock Facebook API calls for campaign creation
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ // Campaign creation
          ok: true,
          json: async () => ({ id: '23846713468910176' })
        })
        .mockResolvedValueOnce({ // Ad set creation
          ok: true,
          json: async () => ({ id: '23846713468920176' })
        })
        .mockResolvedValueOnce({ // Creative creation
          ok: true,
          json: async () => ({ id: '23846713468940176' })
        })
        .mockResolvedValueOnce({ // Ad creation
          ok: true,
          json: async () => ({ id: '23846713468930176' })
        });

      const campaignData = {
        campaign: {
          name: 'Test Gym Campaign',
          objective: 'LEAD_GENERATION',
          account_id: 'test-account-id',
          buying_type: 'AUCTION'
        },
        adset: {
          name: 'Test Ad Set',
          optimization_goal: 'LEAD_GENERATION',
          billing_event: 'IMPRESSIONS',
          daily_budget: 2000,
          targeting: {
            age_min: 18,
            age_max: 65,
            genders: [1, 2],
            geo_locations: {},
            interests: [],
            behaviors: []
          }
        },
        creative: {
          name: 'Test Creative',
          title: 'Join Our Gym',
          body: 'Get fit with us!',
          call_to_action_type: 'LEARN_MORE',
          link_url: 'https://example.com',
          creative_type: 'single_image'
        }
      };

      const response = await fetch(`${testConfig.baseUrl}/api/ads/campaigns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaignData)
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.campaign_id).toBeDefined();
      expect(data.facebook_campaign_id).toBe('23846713468910176');
    });

    it('should update campaign status (pause/resume)', async () => {
      // Mock Facebook API call for status update
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const response = await fetch(`${testConfig.baseUrl}/api/ads/campaigns/test-campaign-id/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'PAUSED' })
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.campaign.status).toBe('PAUSED');
    });

    it('should duplicate campaigns successfully', async () => {
      // Mock multiple Facebook API calls for duplication
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ // Get original campaign
          ok: true,
          json: async () => mockFacebookResponses.campaigns.data[0]
        })
        .mockResolvedValueOnce({ // Create duplicate campaign
          ok: true,
          json: async () => ({ id: '23846713468910177' })
        });

      const response = await fetch(`${testConfig.baseUrl}/api/ads/campaigns/test-campaign-id/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.campaign_id).toBeDefined();
      expect(data.facebook_campaign_id).toBe('23846713468910177');
    });
  });

  describe('Metrics Synchronization', () => {
    it('should sync campaign metrics from Facebook', async () => {
      // Mock Facebook API calls for sync
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ // Get campaigns
          ok: true,
          json: async () => mockFacebookResponses.campaigns
        })
        .mockResolvedValueOnce({ // Get campaign insights
          ok: true,
          json: async () => mockFacebookResponses.insights
        })
        .mockResolvedValueOnce({ // Get ad sets
          ok: true,
          json: async () => mockFacebookResponses.adSets
        })
        .mockResolvedValueOnce({ // Get ads
          ok: true,
          json: async () => mockFacebookResponses.ads
        });

      const response = await fetch(`${testConfig.baseUrl}/api/ads/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ account_id: 'test-account-id' })
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.synced).toBeDefined();
      expect(data.synced.campaigns).toBeGreaterThanOrEqual(0);
      expect(data.synced.ads).toBeGreaterThanOrEqual(0);
    });

    it('should handle rate limiting during sync', async () => {
      // Mock rate limit error from Facebook
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            message: 'Too many calls',
            type: 'OAuthException',
            code: 4
          }
        })
      });

      const response = await fetch(`${testConfig.baseUrl}/api/ads/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ account_id: 'test-account-id' })
      });

      // Should still return success but with limited sync
      const data = await response.json();
      expect(data.synced).toBeDefined();
    });
  });

  describe('Performance Analytics', () => {
    it('should fetch campaign metrics', async () => {
      const response = await fetch(`${testConfig.baseUrl}/api/ads/metrics?account_id=test-account-id&days=7`, {
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.totalSpend).toBeGreaterThanOrEqual(0);
      expect(data.metrics.totalLeads).toBeGreaterThanOrEqual(0);
    });

    it('should fetch top performing ads', async () => {
      const response = await fetch(`${testConfig.baseUrl}/api/ads/top-ads?account_id=test-account-id&days=7&limit=5`, {
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.ads).toBeDefined();
      expect(Array.isArray(data.ads)).toBe(true);
    });

    it('should fetch chart data for performance visualization', async () => {
      const response = await fetch(`${testConfig.baseUrl}/api/ads/chart-data?account_id=test-account-id&days=7`, {
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('Budget Optimization', () => {
    it('should generate AI budget recommendations', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          facebook_campaign_id: '123',
          current_budget: 5000, // $50
          spend: 4500,
          leads: 15,
          clicks: 150,
          impressions: 10000
        },
        {
          id: 'campaign-2',
          facebook_campaign_id: '456',
          current_budget: 3000, // $30
          spend: 2800,
          leads: 3,
          clicks: 200,
          impressions: 15000
        }
      ];

      const response = await fetch(`${testConfig.baseUrl}/api/ads/budget-optimization`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account_id: 'test-account-id',
          campaigns: mockCampaigns
        })
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.recommendations).toBeDefined();
      expect(data.performance_insights).toBeDefined();
      expect(data.budget_utilization).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Creative Upload', () => {
    it('should upload image creative successfully', async () => {
      // Mock file upload
      const mockFile = new File(['test image data'], 'test.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('type', 'image');

      // Mock Supabase storage upload
      const mockSupabaseResponse = {
        data: { path: 'test-path' },
        error: null
      };

      const response = await fetch(`${testConfig.baseUrl}/api/ads/upload-creative`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        },
        body: formData
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.url).toBeDefined();
    });

    it('should reject files that are too large', async () => {
      const mockLargeFile = new File(['x'.repeat(15 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', mockLargeFile);
      formData.append('type', 'image');

      const response = await fetch(`${testConfig.baseUrl}/api/ads/upload-creative`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        },
        body: formData
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.error).toContain('too large');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Facebook API token expiration', async () => {
      // Mock expired token error
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            message: 'Error validating access token',
            type: 'OAuthException',
            code: 190
          }
        })
      });

      const response = await fetch(`${testConfig.baseUrl}/api/ads/campaigns?account_id=test-account-id`, {
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      // Should handle gracefully
      expect(response.status).toBe(500);
    });

    it('should handle network timeouts gracefully', async () => {
      // Mock network timeout
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network timeout'));

      const response = await fetch(`${testConfig.baseUrl}/api/ads/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ account_id: 'test-account-id' })
      });

      expect(response.status).toBe(500);
    });

    it('should validate required parameters', async () => {
      // Test missing account_id
      const response = await fetch(`${testConfig.baseUrl}/api/ads/campaigns`, {
        headers: {
          'Authorization': `Bearer ${testSession.access_token}`
        }
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.error).toContain('account_id is required');
    });
  });

  // Helper functions for test setup and teardown
  async function setupTestData() {
    // Create test organization
    await supabase.from('organizations').insert({
      id: testConfig.testOrgId,
      name: 'Test Gym Organization',
      created_at: new Date().toISOString()
    });

    // Create test user
    await supabase.from('users').insert({
      id: testConfig.testUserId,
      organization_id: testConfig.testOrgId,
      email: 'test@example.com',
      created_at: new Date().toISOString()
    });

    // Mock authentication session
    testSession = {
      access_token: 'test-session-token',
      user: { id: testConfig.testUserId }
    };
  }

  async function cleanupTestData() {
    // Clean up test data in reverse order of dependencies
    await supabase.from('facebook_ads').delete().eq('organization_id', testConfig.testOrgId);
    await supabase.from('facebook_ad_creatives').delete().eq('organization_id', testConfig.testOrgId);
    await supabase.from('facebook_adsets').delete().eq('organization_id', testConfig.testOrgId);
    await supabase.from('facebook_campaigns').delete().eq('organization_id', testConfig.testOrgId);
    await supabase.from('facebook_ad_accounts').delete().eq('organization_id', testConfig.testOrgId);
    await supabase.from('facebook_integrations').delete().eq('organization_id', testConfig.testOrgId);
    await supabase.from('users').delete().eq('id', testConfig.testUserId);
    await supabase.from('organizations').delete().eq('id', testConfig.testOrgId);
  }
});

// Export test utilities for other test files
export { mockFacebookResponses, testConfig };