import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { io } from '../server';

const router = express.Router();
const prisma = new PrismaClient();

// Send message
router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { receiverId, content, propertyId, messageType = 'TEXT', attachments = [] } = req.body;

  if (!receiverId || !content) {
    return res.status(400).json({ error: 'Receiver ID and content are required' });
  }

  // Verify receiver exists
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true, firstName: true, lastName: true, profileImage: true }
  });

  if (!receiver) {
    return res.status(404).json({ error: 'Receiver not found' });
  }

  const message = await prisma.message.create({
    data: {
      senderId: req.user!.userId,
      receiverId,
      content,
      propertyId,
      messageType,
      attachments
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true
        }
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true
        }
      },
      property: {
        select: {
          id: true,
          title: true,
          address: true
        }
      }
    }
  });

  // Emit message to receiver via Socket.IO
  io.to(`user_${receiverId}`).emit('newMessage', message);

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: message
  });
}));

// Get conversations
router.get('/conversations', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  // Get all unique conversation partners
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ]
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true
        }
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true
        }
      },
      property: {
        select: {
          id: true,
          title: true,
          photos: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Group messages by conversation partner
  const conversationsMap = new Map();

  messages.forEach(message => {
    const partnerId = message.senderId === userId ? message.receiverId : message.senderId;
    const partner = message.senderId === userId ? message.receiver : message.sender;

    if (!conversationsMap.has(partnerId)) {
      conversationsMap.set(partnerId, {
        partnerId,
        partner,
        lastMessage: message,
        unreadCount: 0,
        property: message.property
      });
    }

    // Count unread messages
    if (message.receiverId === userId && !message.isRead) {
      conversationsMap.get(partnerId).unreadCount++;
    }
  });

  const conversations = Array.from(conversationsMap.values());

  res.json({
    success: true,
    data: conversations
  });
}));

// Get messages for a conversation
router.get('/conversation/:partnerId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { partnerId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: req.user!.userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: req.user!.userId }
      ]
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true
        }
      },
      property: {
        select: {
          id: true,
          title: true,
          photos: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take
  });

  // Mark messages as read
  await prisma.message.updateMany({
    where: {
      senderId: partnerId,
      receiverId: req.user!.userId,
      isRead: false
    },
    data: { isRead: true }
  });

  res.json({
    success: true,
    data: messages.reverse() // Reverse to show oldest first
  });
}));

// Mark messages as read
router.put('/mark-read/:partnerId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { partnerId } = req.params;

  await prisma.message.updateMany({
    where: {
      senderId: partnerId,
      receiverId: req.user!.userId,
      isRead: false
    },
    data: { isRead: true }
  });

  res.json({
    success: true,
    message: 'Messages marked as read'
  });
}));

// Get unread message count
router.get('/unread-count', asyncHandler(async (req: AuthRequest, res: Response) => {
  const count = await prisma.message.count({
    where: {
      receiverId: req.user!.userId,
      isRead: false
    }
  });

  res.json({
    success: true,
    data: { count }
  });
}));

export default router;