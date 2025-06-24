import admin from 'firebase-admin';
import { logger } from '../utils/logger';

// Types for push notifications
interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  sound?: string;
  badge?: number;
  category?: string;
  clickAction?: string;
}

interface NotificationTarget {
  userId: string;
  deviceTokens: string[];
  platform?: 'ios' | 'android' | 'web';
}

interface NotificationTemplate {
  type: 'payment_due' | 'maintenance_update' | 'lease_renewal' | 'application_status' | 'message_received' | 'property_alert';
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
  category?: string;
}

export class PushNotificationService {
  private initialized = false;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      if (!admin.apps.length) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (serviceAccount) {
          admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(serviceAccount)),
            projectId: process.env.FIREBASE_PROJECT_ID
          });
          this.initialized = true;
          logger.info('Firebase Admin SDK initialized successfully');
        } else {
          logger.warn('Firebase service account key not provided - push notifications disabled');
        }
      } else {
        this.initialized = true;
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK:', error);
    }
  }

  /**
   * Send push notification to specific device tokens
   */
  async sendToTokens(
    tokens: string[],
    payload: PushNotificationPayload,
    options?: {
      priority?: 'high' | 'normal';
      timeToLive?: number;
      collapseKey?: string;
      dryRun?: boolean;
    }
  ): Promise<{ successCount: number; failureCount: number; errors: any[] }> {
    if (!this.initialized) {
      throw new Error('Push notification service not initialized');
    }

    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl
        },
        data: {
          ...payload.data,
          clickAction: payload.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
          timestamp: new Date().toISOString()
        },
        android: {
          priority: (options?.priority === 'high' ? 'high' : 'normal') as 'high' | 'normal' | undefined,
          ttl: options?.timeToLive || 3600000,
          collapseKey: options?.collapseKey
        },
        apns: {
          payload: {
            aps: {
              sound: payload.sound || 'default',
              badge: payload.badge || 0,
              category: payload.category,
              'mutable-content': 1,
              'content-available': 1
            }
          },
          headers: {
            'apns-priority': options?.priority === 'high' ? '10' : '5',
            ...(options?.timeToLive ? { 'apns-expiration': String(options.timeToLive) } : {})
          }
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            image: payload.imageUrl,
            requireInteraction: true,
            tag: payload.category || 'default'
          },
          fcmOptions: {
            link: payload.clickAction || '/'
          }
        },
        tokens: tokens
      };

      const response = await admin.messaging().sendMulticast(message, options?.dryRun || false);

      logger.info('Push notification sent', {
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalTokens: tokens.length,
        title: payload.title
      });

      // Log failures for debugging
      if (response.failureCount > 0) {
        const failures = response.responses
          .map((resp, idx) => resp.success ? null : { token: tokens[idx], error: resp.error })
          .filter(Boolean);

        logger.warn('Push notification failures:', { failures });
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.responses
          .filter(resp => !resp.success)
          .map(resp => resp.error)
      };

    } catch (error) {
      logger.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to users by user IDs
   */
  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload,
    options?: {
      priority?: 'high' | 'normal';
      timeToLive?: number;
      platform?: 'ios' | 'android' | 'web' | 'all';
    }
  ): Promise<{ successCount: number; failureCount: number; errors: any[] }> {
    try {
      // Get device tokens for users from database
      const deviceTokens = await this.getDeviceTokensForUsers(userIds, options?.platform);

      if (deviceTokens.length === 0) {
        logger.warn('No device tokens found for users', { userIds });
        return { successCount: 0, failureCount: 0, errors: [] };
      }

      return await this.sendToTokens(deviceTokens, payload, options);
    } catch (error) {
      logger.error('Failed to send notification to users:', error);
      throw error;
    }
  }

  /**
   * Send templated notification
   */
  async sendTemplatedNotification(
    target: NotificationTarget | string[],
    template: NotificationTemplate,
    variables?: Record<string, string>,
    options?: {
      priority?: 'high' | 'normal';
      timeToLive?: number;
    }
  ): Promise<{ successCount: number; failureCount: number; errors: any[] }> {
    try {
      // Replace variables in template
      let title = template.title;
      let body = template.body;

      if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
          title = title.replace(new RegExp(`{{${key}}}`, 'g'), value);
          body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
      }

      const payload: PushNotificationPayload = {
        title,
        body,
        data: {
          type: template.type,
          ...template.data,
          ...variables
        },
        sound: template.sound,
        category: template.type
      };

      if (Array.isArray(target)) {
        // Target is user IDs
        return await this.sendToUsers(target, payload, options);
      } else {
        // Target is device tokens
        return await this.sendToTokens(target.deviceTokens, payload, options);
      }
    } catch (error) {
      logger.error('Failed to send templated notification:', error);
      throw error;
    }
  }

  /**
   * Subscribe to topic for broadcast notifications
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Push notification service not initialized');
    }

    try {
      await admin.messaging().subscribeToTopic(tokens, topic);
      logger.info('Subscribed tokens to topic', { topic, tokenCount: tokens.length });
    } catch (error) {
      logger.error('Failed to subscribe to topic:', error);
      throw error;
    }
  }

  /**
   * Send notification to topic
   */
  async sendToTopic(
    topic: string,
    payload: PushNotificationPayload,
    options?: {
      priority?: 'high' | 'normal';
      timeToLive?: number;
    }
  ): Promise<string> {
    if (!this.initialized) {
      throw new Error('Push notification service not initialized');
    }

    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl
        },
        data: {
          ...payload.data,
          timestamp: new Date().toISOString()
        },
        topic: topic,
        android: {
          ttl: options?.timeToLive || 3600000,
          notification: {
            priority: (options?.priority === 'high' ? 'high' : 'default') as 'high' | 'default' | 'min' | 'low' | 'max' | undefined,
            sound: payload.sound || 'default',
            clickAction: payload.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
            channelId: payload.category || 'default',
            defaultSound: true,
            defaultVibrateTimings: true
          }
        },
        apns: {
          headers: {
            'apns-priority': options?.priority === 'high' ? '10' : '5'
          }
        }
      };

      const messageId = await admin.messaging().send(message);
      logger.info('Topic notification sent', { topic, messageId, title: payload.title });

      return messageId;
    } catch (error) {
      logger.error('Failed to send topic notification:', error);
      throw error;
    }
  }

  /**
   * Validate device token
   */
  async validateToken(token: string): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      await admin.messaging().send({
        token,
        data: { test: 'true' }
      }, true); // dry run
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper method to get device tokens from database
   * This would be implemented based on your user/device token storage
   */
  private async getDeviceTokensForUsers(
    userIds: string[],
    platform?: 'ios' | 'android' | 'web' | 'all'
  ): Promise<string[]> {
    // This is a placeholder implementation
    // In a real application, you'd query your database for user device tokens
    try {
      // Example query (replace with your actual database query)
      const tokens: string[] = [];

      // You would implement something like:
      // const users = await prisma.user.findMany({
      //   where: { id: { in: userIds } },
      //   include: {
      //     deviceTokens: {
      //       where: platform ? { platform } : undefined
      //     }
      //   }
      // });
      //
      // users.forEach(user => {
      //   user.deviceTokens.forEach(device => {
      //     if (device.token && device.isActive) {
      //       tokens.push(device.token);
      //     }
      //   });
      // });

      return tokens;
    } catch (error) {
      logger.error('Failed to get device tokens for users:', error);
      return [];
    }
  }

  /**
   * Create notification templates for common scenarios
   */
  static getTemplate(type: NotificationTemplate['type'], data?: Record<string, string>): NotificationTemplate {
    const templates: Record<NotificationTemplate['type'], NotificationTemplate> = {
      payment_due: {
        type: 'payment_due',
        title: 'Rent Payment Due',
        body: 'Your rent payment of ${{amount}} is due on {{dueDate}}',
        sound: 'default',
        category: 'payment'
      },
      maintenance_update: {
        type: 'maintenance_update',
        title: 'Maintenance Update',
        body: 'Your maintenance request #{{requestId}} has been {{status}}',
        sound: 'default',
        category: 'maintenance'
      },
      lease_renewal: {
        type: 'lease_renewal',
        title: 'Lease Renewal Notice',
        body: 'Your lease expires on {{expirationDate}}. Renewal options are available.',
        sound: 'default',
        category: 'lease'
      },
      application_status: {
        type: 'application_status',
        title: 'Application Status Update',
        body: 'Your rental application for {{propertyAddress}} has been {{status}}',
        sound: 'default',
        category: 'application'
      },
      message_received: {
        type: 'message_received',
        title: 'New Message',
        body: 'You have a new message from {{senderName}}',
        sound: 'default',
        category: 'message'
      },
      property_alert: {
        type: 'property_alert',
        title: 'Property Alert',
        body: 'New property matching your criteria: {{propertyAddress}}',
        sound: 'default',
        category: 'property'
      }
    };

    const template = templates[type];
    if (data) {
      template.data = { ...template.data, ...data };
    }

    return template;
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;