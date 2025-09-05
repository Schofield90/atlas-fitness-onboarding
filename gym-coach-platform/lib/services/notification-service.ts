import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export interface NotificationPayload {
  title: string;
  message: string;
  data?: Record<string, any>;
  clientId: string;
  organizationId: string;
  type: string;
}

export interface PushNotificationProvider {
  sendNotification(payload: NotificationPayload, pushToken?: string): Promise<boolean>;
}

// Firebase Cloud Messaging Provider
class FCMProvider implements PushNotificationProvider {
  private serverKey: string;

  constructor() {
    this.serverKey = process.env.FCM_SERVER_KEY || '';
  }

  async sendNotification(payload: NotificationPayload, pushToken?: string): Promise<boolean> {
    if (!this.serverKey) {
      console.warn('FCM_SERVER_KEY not configured');
      return false;
    }

    if (!pushToken) {
      console.warn('No push token available for client');
      return false;
    }

    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pushToken,
          notification: {
            title: payload.title,
            body: payload.message,
            icon: '/icon-192x192.png', // App icon
            badge: '/badge-72x72.png',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
          data: {
            type: payload.type,
            ...payload.data,
          },
          priority: 'high',
        }),
      });

      if (!response.ok) {
        throw new Error(`FCM request failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('FCM notification sent:', result);
      
      return result.success === 1;
    } catch (error) {
      console.error('Error sending FCM notification:', error);
      return false;
    }
  }
}

// Expo Push Notifications Provider
class ExpoProvider implements PushNotificationProvider {
  async sendNotification(payload: NotificationPayload, pushToken?: string): Promise<boolean> {
    if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
      console.warn('Invalid Expo push token');
      return false;
    }

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pushToken,
          title: payload.title,
          body: payload.message,
          data: {
            type: payload.type,
            ...payload.data,
          },
          priority: 'high',
          sound: 'default',
          badge: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Expo push request failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Expo notification sent:', result);
      
      return result.data?.[0]?.status === 'ok';
    } catch (error) {
      console.error('Error sending Expo notification:', error);
      return false;
    }
  }
}

// Main Notification Service
export class NotificationService {
  private providers: PushNotificationProvider[];
  private supabase;

  constructor() {
    this.providers = [
      new FCMProvider(),
      new ExpoProvider(),
    ];
    this.supabase = createRouteHandlerClient({ cookies });
  }

  async sendPushNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      // Get client's push tokens
      const { data: clientTokens, error } = await this.supabase
        .from('client_push_tokens')
        .select('push_token, provider')
        .eq('client_id', payload.clientId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching push tokens:', error);
        return false;
      }

      if (!clientTokens || clientTokens.length === 0) {
        console.warn(`No active push tokens found for client ${payload.clientId}`);
        return false;
      }

      // Store notification in database first
      await this.storeNotification(payload);

      // Send notifications through all available providers
      let success = false;
      for (const token of clientTokens) {
        const provider = this.getProvider(token.provider);
        if (provider) {
          const sent = await provider.sendNotification(payload, token.push_token);
          if (sent) {
            success = true;
            // Update notification status to sent
            await this.updateNotificationStatus(payload, 'sent');
          }
        }
      }

      if (!success) {
        await this.updateNotificationStatus(payload, 'failed');
      }

      return success;
    } catch (error) {
      console.error('Error in sendPushNotification:', error);
      await this.updateNotificationStatus(payload, 'failed');
      return false;
    }
  }

  private getProvider(providerName: string): PushNotificationProvider | null {
    switch (providerName) {
      case 'fcm':
        return this.providers[0]; // FCMProvider
      case 'expo':
        return this.providers[1]; // ExpoProvider
      default:
        return null;
    }
  }

  private async storeNotification(payload: NotificationPayload): Promise<void> {
    await this.supabase
      .from('client_notifications')
      .insert({
        organization_id: payload.organizationId,
        client_id: payload.clientId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data || {},
        status: 'pending',
        created_at: new Date().toISOString(),
      });
  }

  private async updateNotificationStatus(payload: NotificationPayload, status: string): Promise<void> {
    await this.supabase
      .from('client_notifications')
      .update({
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      })
      .eq('client_id', payload.clientId)
      .eq('type', payload.type)
      .eq('title', payload.title)
      .order('created_at', { ascending: false })
      .limit(1);
  }
}

// Convenience function for sending waiver notifications
export async function sendWaiverNotification(
  client: { id: string; name: string; email: string },
  waiver: { id: string; title: string },
  organizationId: string
): Promise<boolean> {
  const notificationService = new NotificationService();
  
  return await notificationService.sendPushNotification({
    title: 'New Waiver to Sign',
    message: `Please sign the "${waiver.title}" waiver in your app.`,
    data: {
      waiver_id: waiver.id,
      waiver_title: waiver.title,
      action: 'sign_waiver',
    },
    clientId: client.id,
    organizationId,
    type: 'waiver_assignment',
  });
}