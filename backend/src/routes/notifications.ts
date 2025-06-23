import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { pushNotificationService } from '../services/pushNotificationService';

const router = Router();
const prisma = new PrismaClient();

// Validation middleware
const validateRequest = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Register device token for push notifications
 * POST /api/notifications/register-token
 */
router.post('/register-token', [
  body('token').notEmpty().withMessage('Device token is required'),
  body('platform').isIn(['ios', 'android', 'web']).withMessage('Platform must be ios, android, or web'),
  body('deviceInfo').optional().isObject().withMessage('Device info must be an object')
], validateRequest, async (req: Request, res: Response) => {
  try {
    const { token, platform, deviceInfo } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate token with Firebase
    const isValidToken = await pushNotificationService.validateToken(token);
    if (!isValidToken) {
      return res.status(400).json({ error: 'Invalid device token' });
    }

    // Store device token in database (you'll need to create this table)
    // Example implementation:
    /*
    const deviceToken = await prisma.deviceToken.upsert({
      where: {
        token_userId: {
          token,
          userId
        }
      },
      update: {
        platform,
        deviceInfo: deviceInfo || {},
        lastUsed: new Date(),
        isActive: true
      },
      create: {
        token,
        userId,
        platform,
        deviceInfo: deviceInfo || {},
        isActive: true,
        createdAt: new Date(),
        lastUsed: new Date()
      }
    });
    */

    logger.info('Device token registered', {
      userId,
      platform,
      tokenPrefix: token.substring(0, 10) + '...'
    });

    res.json({
      success: true,
      message: 'Device token registered successfully'
    });

  } catch (error) {
    logger.error('Failed to register device token:', error);
    res.status(500).json({
      error: 'Failed to register device token'
    });
  }
});

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
router.put('/preferences', [
  body('preferences').isObject().withMessage('Preferences must be an object'),
  body('preferences.paymentReminders').optional().isBoolean(),
  body('preferences.maintenanceUpdates').optional().isBoolean(),
  body('preferences.leaseNotifications').optional().isBoolean(),
  body('preferences.messageNotifications').optional().isBoolean(),
  body('preferences.propertyAlerts').optional().isBoolean()
], validateRequest, async (req: Request, res: Response) => {
  try {
    const { preferences } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Update user notification preferences
    /*
    await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: preferences
      }
    });
    */

    logger.info('Notification preferences updated', { userId, preferences });

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences
    });

  } catch (error) {
    logger.error('Failed to update notification preferences:', error);
    res.status(500).json({
      error: 'Failed to update notification preferences'
    });
  }
});

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user notification preferences
    /*
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        notificationPreferences: true
      }
    });
    */

    // Default preferences if none exist
    const defaultPreferences = {
      paymentReminders: true,
      maintenanceUpdates: true,
      leaseNotifications: true,
      messageNotifications: true,
      propertyAlerts: false
    };

    res.json({
      success: true,
      preferences: defaultPreferences // user?.notificationPreferences || defaultPreferences
    });

  } catch (error) {
    logger.error('Failed to get notification preferences:', error);
    res.status(500).json({
      error: 'Failed to get notification preferences'
    });
  }
});

/**
 * Send test notification
 * POST /api/notifications/test
 */
router.post('/test', [
  body('title').optional().isString().withMessage('Title must be a string'),
  body('body').optional().isString().withMessage('Body must be a string')
], validateRequest, async (req: Request, res: Response) => {
  try {
    const { title = 'Test Notification', body = 'This is a test notification from NYC Rental Platform' } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await pushNotificationService.sendToUsers(
      [userId],
      {
        title,
        body,
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      }
    );

    logger.info('Test notification sent', { userId, result });

    res.json({
      success: true,
      message: 'Test notification sent',
      result
    });

  } catch (error) {
    logger.error('Failed to send test notification:', error);
    res.status(500).json({
      error: 'Failed to send test notification'
    });
  }
});

/**
 * Send payment reminder notification
 * POST /api/notifications/payment-reminder
 */
router.post('/payment-reminder', [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('dueDate').isISO8601().withMessage('Due date must be a valid date'),
  body('userIds').isArray().withMessage('User IDs must be an array')
], validateRequest, async (req: Request, res: Response) => {
  try {
    const { amount, dueDate, userIds } = req.body;

    const template = pushNotificationService.constructor.getTemplate('payment_due');
    const result = await pushNotificationService.sendTemplatedNotification(
      userIds,
      template,
      {
        amount: `$${amount}`,
        dueDate: new Date(dueDate).toLocaleDateString()
      },
      { priority: 'high' }
    );

    logger.info('Payment reminder notifications sent', { userIds, result });

    res.json({
      success: true,
      message: 'Payment reminder notifications sent',
      result
    });

  } catch (error) {
    logger.error('Failed to send payment reminder notifications:', error);
    res.status(500).json({
      error: 'Failed to send payment reminder notifications'
    });
  }
});

/**
 * Send maintenance update notification
 * POST /api/notifications/maintenance-update
 */
router.post('/maintenance-update', [
  body('requestId').notEmpty().withMessage('Request ID is required'),
  body('status').notEmpty().withMessage('Status is required'),
  body('userIds').isArray().withMessage('User IDs must be an array')
], validateRequest, async (req: Request, res: Response) => {
  try {
    const { requestId, status, userIds } = req.body;

    const template = pushNotificationService.constructor.getTemplate('maintenance_update');
    const result = await pushNotificationService.sendTemplatedNotification(
      userIds,
      template,
      {
        requestId,
        status
      }
    );

    logger.info('Maintenance update notifications sent', { userIds, requestId, status, result });

    res.json({
      success: true,
      message: 'Maintenance update notifications sent',
      result
    });

  } catch (error) {
    logger.error('Failed to send maintenance update notifications:', error);
    res.status(500).json({
      error: 'Failed to send maintenance update notifications'
    });
  }
});

/**
 * Send lease renewal notification
 * POST /api/notifications/lease-renewal
 */
router.post('/lease-renewal', [
  body('expirationDate').isISO8601().withMessage('Expiration date must be a valid date'),
  body('userIds').isArray().withMessage('User IDs must be an array')
], validateRequest, async (req: Request, res: Response) => {
  try {
    const { expirationDate, userIds } = req.body;

    const template = pushNotificationService.constructor.getTemplate('lease_renewal');
    const result = await pushNotificationService.sendTemplatedNotification(
      userIds,
      template,
      {
        expirationDate: new Date(expirationDate).toLocaleDateString()
      }
    );

    logger.info('Lease renewal notifications sent', { userIds, expirationDate, result });

    res.json({
      success: true,
      message: 'Lease renewal notifications sent',
      result
    });

  } catch (error) {
    logger.error('Failed to send lease renewal notifications:', error);
    res.status(500).json({
      error: 'Failed to send lease renewal notifications'
    });
  }
});

/**
 * Send message notification
 * POST /api/notifications/message
 */
router.post('/message', [
  body('senderName').notEmpty().withMessage('Sender name is required'),
  body('recipientIds').isArray().withMessage('Recipient IDs must be an array')
], validateRequest, async (req: Request, res: Response) => {
  try {
    const { senderName, recipientIds } = req.body;

    const template = pushNotificationService.constructor.getTemplate('message_received');
    const result = await pushNotificationService.sendTemplatedNotification(
      recipientIds,
      template,
      {
        senderName
      }
    );

    logger.info('Message notifications sent', { recipientIds, senderName, result });

    res.json({
      success: true,
      message: 'Message notifications sent',
      result
    });

  } catch (error) {
    logger.error('Failed to send message notifications:', error);
    res.status(500).json({
      error: 'Failed to send message notifications'
    });
  }
});

/**
 * Subscribe to topic for broadcast notifications
 * POST /api/notifications/subscribe-topic
 */
router.post('/subscribe-topic', [
  body('topic').notEmpty().withMessage('Topic is required'),
  body('deviceTokens').optional().isArray().withMessage('Device tokens must be an array')
], validateRequest, async (req: Request, res: Response) => {
  try {
    const { topic, deviceTokens } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let tokens = deviceTokens;
    
    if (!tokens || tokens.length === 0) {
      // Get user's device tokens from database
      tokens = []; // Implement database query here
    }

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'No device tokens found' });
    }

    await pushNotificationService.subscribeToTopic(tokens, topic);

    logger.info('Subscribed to topic', { userId, topic, tokenCount: tokens.length });

    res.json({
      success: true,
      message: `Subscribed to topic: ${topic}`,
      tokenCount: tokens.length
    });

  } catch (error) {
    logger.error('Failed to subscribe to topic:', error);
    res.status(500).json({
      error: 'Failed to subscribe to topic'
    });
  }
});

/**
 * Send broadcast notification to topic
 * POST /api/notifications/broadcast
 */
router.post('/broadcast', [
  body('topic').notEmpty().withMessage('Topic is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('body').notEmpty().withMessage('Body is required'),
  body('data').optional().isObject().withMessage('Data must be an object')
], validateRequest, async (req: Request, res: Response) => {
  try {
    const { topic, title, body, data } = req.body;

    // Only allow admins to send broadcast notifications
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin' && userRole !== 'landlord') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const messageId = await pushNotificationService.sendToTopic(
      topic,
      {
        title,
        body,
        data: {
          type: 'broadcast',
          ...data
        }
      }
    );

    logger.info('Broadcast notification sent', { topic, title, messageId });

    res.json({
      success: true,
      message: 'Broadcast notification sent',
      messageId
    });

  } catch (error) {
    logger.error('Failed to send broadcast notification:', error);
    res.status(500).json({
      error: 'Failed to send broadcast notification'
    });
  }
});

/**
 * Get notification history
 * GET /api/notifications/history
 */
router.get('/history', [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], validateRequest, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get notification history from database
    // This would be implemented based on your notification logging system
    const notifications = []; // Implement database query here

    res.json({
      success: true,
      notifications,
      pagination: {
        limit,
        offset,
        total: notifications.length
      }
    });

  } catch (error) {
    logger.error('Failed to get notification history:', error);
    res.status(500).json({
      error: 'Failed to get notification history'
    });
  }
});

/**
 * Remove device token
 * DELETE /api/notifications/token/:token
 */
router.delete('/token/:token', [
  param('token').notEmpty().withMessage('Token is required')
], validateRequest, async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Remove device token from database
    /*
    await prisma.deviceToken.updateMany({
      where: {
        token,
        userId
      },
      data: {
        isActive: false,
        deactivatedAt: new Date()
      }
    });
    */

    logger.info('Device token removed', { userId, tokenPrefix: token.substring(0, 10) + '...' });

    res.json({
      success: true,
      message: 'Device token removed successfully'
    });

  } catch (error) {
    logger.error('Failed to remove device token:', error);
    res.status(500).json({
      error: 'Failed to remove device token'
    });
  }
});

export default router;