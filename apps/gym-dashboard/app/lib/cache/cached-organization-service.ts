import { 
  cacheService, 
  getCacheKey, 
  CACHE_TTL, 
  CACHE_PREFIXES,
  getOrSet,
  invalidateOrgCache 
} from './cache-utils';
import { createClient } from '@/app/lib/supabase/server';
import { logger } from '@/app/lib/logger/logger';

/**
 * Organization settings and configuration data with caching
 * 
 * Cache Strategy:
 * - Organization settings: 10 minute TTL
 * - User permissions: 5 minute TTL
 * - Organization metadata: 30 minute TTL
 * - Feature flags: 5 minute TTL
 */
class CachedOrganizationService {
  private readonly SETTINGS_TTL = CACHE_TTL.ORGANIZATION_SETTINGS;
  private readonly PERMISSIONS_TTL = CACHE_TTL.USER_PERMISSIONS;
  private readonly METADATA_TTL = CACHE_TTL.LONG_TERM / 2; // 30 minutes
  private readonly FEATURES_TTL = CACHE_TTL.MEDIUM_TERM;

  /**
   * Get organization settings with caching
   */
  async getOrganizationSettings(orgId: string) {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.SETTINGS, 'config');
    
    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        const { data: org, error } = await supabase
          .from('organizations')
          .select(`
            *,
            organization_settings (
              ai_enabled,
              automation_enabled,
              booking_settings,
              email_settings,
              sms_settings,
              notification_settings,
              integrations
            )
          `)
          .eq('id', orgId)
          .single();

        if (error) throw error;
        return org;
      },
      this.SETTINGS_TTL
    );
  }

  /**
   * Get user permissions for organization with caching
   */
  async getUserPermissions(userId: string, orgId: string) {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.PERMISSIONS, 'user', userId);
    
    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        // Get user role and permissions
        const { data: userOrg, error } = await supabase
          .from('organization_users')
          .select(`
            role,
            permissions,
            is_owner,
            organizations!inner(*)
          `)
          .eq('user_id', userId)
          .eq('org_id', orgId)
          .single();

        if (error) throw error;

        // Get role-based permissions
        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select('permissions')
          .eq('role', userOrg.role);

        // Combine role permissions with user-specific permissions
        const rolePermissions = rolePerms?.[0]?.permissions || [];
        const userPermissions = userOrg.permissions || [];
        
        return {
          userId,
          orgId,
          role: userOrg.role,
          isOwner: userOrg.is_owner,
          permissions: [...new Set([...rolePermissions, ...userPermissions])],
          organization: userOrg.organizations
        };
      },
      this.PERMISSIONS_TTL
    );
  }

  /**
   * Get organization feature flags with caching
   */
  async getFeatureFlags(orgId: string) {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.SETTINGS, 'features');
    
    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        const { data: flags, error } = await supabase
          .from('organization_feature_flags')
          .select('*')
          .eq('org_id', orgId);

        if (error) throw error;
        
        // Convert to key-value pairs for easier access
        const featureFlags = flags?.reduce((acc, flag) => {
          acc[flag.feature_name] = {
            enabled: flag.enabled,
            config: flag.config || {},
            updatedAt: flag.updated_at
          };
          return acc;
        }, {} as Record<string, any>) || {};

        return featureFlags;
      },
      this.FEATURES_TTL
    );
  }

  /**
   * Get organization staff/users with caching
   */
  async getOrganizationStaff(orgId: string) {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.SETTINGS, 'staff');
    
    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        const { data: staff, error } = await supabase
          .from('organization_users')
          .select(`
            *,
            users!inner(id, email, full_name, avatar_url),
            staff_profiles(position, department, hire_date, hourly_rate, permissions)
          `)
          .eq('org_id', orgId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return staff;
      },
      this.PERMISSIONS_TTL
    );
  }

  /**
   * Get organization integrations with caching
   */
  async getIntegrations(orgId: string) {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.SETTINGS, 'integrations');
    
    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        const { data: integrations, error } = await supabase
          .from('integrations')
          .select('*')
          .eq('org_id', orgId);

        if (error) throw error;
        
        return integrations?.reduce((acc, integration) => {
          acc[integration.integration_type] = {
            enabled: integration.enabled,
            config: integration.config,
            lastSync: integration.last_sync,
            status: integration.status
          };
          return acc;
        }, {} as Record<string, any>) || {};
      },
      this.SETTINGS_TTL
    );
  }

  /**
   * Get organization billing info with caching
   */
  async getBillingInfo(orgId: string) {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.SETTINGS, 'billing');
    
    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        const { data: billing, error } = await supabase
          .from('organization_billing')
          .select('*')
          .eq('org_id', orgId)
          .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignore not found
        
        return billing || {
          plan: 'free',
          status: 'active',
          billingCycle: 'monthly',
          limits: {}
        };
      },
      this.METADATA_TTL
    );
  }

  /**
   * Get organization locations with caching
   */
  async getLocations(orgId: string) {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.SETTINGS, 'locations');
    
    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        const { data: locations, error } = await supabase
          .from('locations')
          .select('*')
          .eq('org_id', orgId)
          .order('is_primary', { ascending: false });

        if (error) throw error;
        return locations || [];
      },
      this.SETTINGS_TTL
    );
  }

  /**
   * Get organization tags/categories with caching
   */
  async getOrganizationTags(orgId: string) {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.SETTINGS, 'tags');
    
    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        const { data: tags, error } = await supabase
          .from('tags')
          .select('*')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return tags || [];
      },
      this.SETTINGS_TTL
    );
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId: string, orgId: string, permission: string): Promise<boolean> {
    try {
      const userPerms = await this.getUserPermissions(userId, orgId);
      return userPerms?.permissions.includes(permission) || userPerms?.isOwner || false;
    } catch (error) {
      logger.error(`Error checking permission ${permission} for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if feature is enabled for organization
   */
  async isFeatureEnabled(orgId: string, featureName: string): Promise<boolean> {
    try {
      const features = await this.getFeatureFlags(orgId);
      return features[featureName]?.enabled || false;
    } catch (error) {
      logger.error(`Error checking feature ${featureName} for org ${orgId}:`, error);
      return false;
    }
  }

  /**
   * Get full organization context (settings, permissions, features)
   */
  async getOrganizationContext(userId: string, orgId: string) {
    const [
      settings,
      permissions,
      features,
      staff,
      integrations,
      billing,
      locations,
      tags
    ] = await Promise.all([
      this.getOrganizationSettings(orgId),
      this.getUserPermissions(userId, orgId),
      this.getFeatureFlags(orgId),
      this.getOrganizationStaff(orgId),
      this.getIntegrations(orgId),
      this.getBillingInfo(orgId),
      this.getLocations(orgId),
      this.getOrganizationTags(orgId)
    ]);

    return {
      organization: settings,
      userPermissions: permissions,
      features,
      staff,
      integrations,
      billing,
      locations,
      tags,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Update organization settings with cache invalidation
   */
  async updateOrganizationSettings(orgId: string, settings: Record<string, any>): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('organization_settings')
      .upsert({
        org_id: orgId,
        ...settings,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    // Invalidate settings cache
    await this.invalidateSettingsCaches(orgId);
    
    logger.info(`Updated organization settings for org ${orgId}`);
  }

  /**
   * Update user permissions with cache invalidation
   */
  async updateUserPermissions(
    userId: string, 
    orgId: string, 
    permissions: string[]
  ): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('organization_users')
      .update({ permissions })
      .eq('user_id', userId)
      .eq('org_id', orgId);

    if (error) throw error;

    // Invalidate specific user permissions cache
    const userCacheKey = getCacheKey(orgId, CACHE_PREFIXES.PERMISSIONS, 'user', userId);
    await cacheService.invalidateCache(userCacheKey);
    
    // Also invalidate staff cache
    const staffCacheKey = getCacheKey(orgId, CACHE_PREFIXES.SETTINGS, 'staff');
    await cacheService.invalidateCache(staffCacheKey);
    
    logger.info(`Updated permissions for user ${userId} in org ${orgId}`);
  }

  /**
   * Update feature flag with cache invalidation
   */
  async updateFeatureFlag(
    orgId: string, 
    featureName: string, 
    enabled: boolean, 
    config?: any
  ): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('organization_feature_flags')
      .upsert({
        org_id: orgId,
        feature_name: featureName,
        enabled,
        config: config || {},
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    // Invalidate feature flags cache
    const featureCacheKey = getCacheKey(orgId, CACHE_PREFIXES.SETTINGS, 'features');
    await cacheService.invalidateCache(featureCacheKey);
    
    logger.info(`Updated feature flag ${featureName} for org ${orgId}`);
  }

  /**
   * Warm organization caches
   */
  async warmOrganizationCaches(userId: string, orgId: string): Promise<void> {
    logger.info(`Warming organization caches for org ${orgId}, user ${userId}`);
    
    const warmTasks = [
      {
        key: getCacheKey(orgId, CACHE_PREFIXES.SETTINGS, 'config'),
        fetchFunction: () => this.getOrganizationSettings(orgId),
        ttl: this.SETTINGS_TTL
      },
      {
        key: getCacheKey(orgId, CACHE_PREFIXES.PERMISSIONS, 'user', userId),
        fetchFunction: () => this.getUserPermissions(userId, orgId),
        ttl: this.PERMISSIONS_TTL
      },
      {
        key: getCacheKey(orgId, CACHE_PREFIXES.SETTINGS, 'features'),
        fetchFunction: () => this.getFeatureFlags(orgId),
        ttl: this.FEATURES_TTL
      },
      {
        key: getCacheKey(orgId, CACHE_PREFIXES.SETTINGS, 'integrations'),
        fetchFunction: () => this.getIntegrations(orgId),
        ttl: this.SETTINGS_TTL
      }
    ];

    await cacheService.warmCache(warmTasks);
    logger.info(`Organization cache warming completed for org ${orgId}`);
  }

  /**
   * Invalidate all organization-related caches
   */
  private async invalidateSettingsCaches(orgId: string): Promise<void> {
    const patterns = [
      `${CACHE_PREFIXES.ORG}:${orgId}:${CACHE_PREFIXES.SETTINGS}:*`,
      `${CACHE_PREFIXES.ORG}:${orgId}:${CACHE_PREFIXES.PERMISSIONS}:*`,
    ];

    for (const pattern of patterns) {
      await cacheService.invalidateCache(pattern);
    }
  }

  /**
   * Get organization cache health
   */
  async getOrganizationCacheHealth(orgId: string) {
    const health = await cacheService.getCacheHealth();
    
    // Count organization-specific cache keys
    const redis = cacheService['redis'];
    let orgKeys = 0;
    
    if (redis) {
      try {
        const keys = await redis.keys(`${CACHE_PREFIXES.ORG}:${orgId}:*`);
        orgKeys = keys.length;
      } catch (error) {
        logger.error('Error counting organization cache keys:', error);
      }
    }

    return {
      ...health,
      organizationKeys: orgKeys,
      recommendedActions: this.generateOrgCacheRecommendations(health.stats)
    };
  }

  private generateOrgCacheRecommendations(stats: Record<string, any>): string[] {
    const recommendations: string[] = [];
    
    const settingsStats = stats[CACHE_PREFIXES.SETTINGS];
    const permissionsStats = stats[CACHE_PREFIXES.PERMISSIONS];
    
    if (settingsStats?.hitRatio < 0.8) {
      recommendations.push('Settings cache hit ratio is low - consider warming caches on login');
    }
    
    if (permissionsStats?.hitRatio < 0.7) {
      recommendations.push('Permissions cache hit ratio is low - check TTL settings');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Organization cache performance is optimal');
    }
    
    return recommendations;
  }
}

export const cachedOrganizationService = new CachedOrganizationService();