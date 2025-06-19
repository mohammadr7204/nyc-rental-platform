import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient, MessageType } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userType?: string;
}

export const handleSocketConnection = (io: Server, socket: AuthenticatedSocket) => {
  console.log('New socket connection:', socket.id);

  // Authenticate socket connection
  socket.on('authenticate', async (token: string) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, userType: true, isActive: true }
      });

      if (user && user.isActive) {
        socket.userId = user.id;
        socket.userType = user.userType;

        // Join user to their personal room
        socket.join(`user_${user.id}`);

        socket.emit('authenticated', { userId: user.id });
        console.log(`User ${user.id} authenticated and joined room`);
      } else {
        socket.emit('authentication_error', { message: 'Invalid token' });
      }
    } catch (error) {
      socket.emit('authentication_error', { message: 'Invalid token' });
    }
  });

  // Handle joining conversation rooms
  socket.on('join_conversation', (partnerId: string) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const roomName = [socket.userId, partnerId].sort().join('_');
    socket.join(roomName);
    console.log(`User ${socket.userId} joined conversation room: ${roomName}`);
  });

  // Handle leaving conversation rooms
  socket.on('leave_conversation', (partnerId: string) => {
    if (!socket.userId) return;

    const roomName = [socket.userId, partnerId].sort().join('_');
    socket.leave(roomName);
    console.log(`User ${socket.userId} left conversation room: ${roomName}`);
  });

  // Handle real-time message sending
  socket.on('send_message', async (data: {
    receiverId: string;
    content: string;
    propertyId?: string;
    messageType?: string;
  }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Create message in database
      const message = await prisma.message.create({
        data: {
          senderId: socket.userId,
          receiverId: data.receiverId,
          content: data.content,
          propertyId: data.propertyId,
          messageType: (data.messageType as MessageType) || MessageType.TEXT
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

      // Send to conversation room
      const roomName = [socket.userId, data.receiverId].sort().join('_');
      io.to(roomName).emit('new_message', message);

      // Send to receiver's personal room for notifications
      io.to(`user_${data.receiverId}`).emit('message_notification', {
        messageId: message.id,
        senderId: socket.userId,
        senderName: `${message.sender.firstName} ${message.sender.lastName}`,
        content: message.content,
        propertyTitle: message.property?.title
      });

      console.log(`Message sent from ${socket.userId} to ${data.receiverId}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (partnerId: string) => {
    if (!socket.userId) return;

    const roomName = [socket.userId, partnerId].sort().join('_');
    socket.to(roomName).emit('user_typing', {
      userId: socket.userId,
      typing: true
    });
  });

  socket.on('typing_stop', (partnerId: string) => {
    if (!socket.userId) return;

    const roomName = [socket.userId, partnerId].sort().join('_');
    socket.to(roomName).emit('user_typing', {
      userId: socket.userId,
      typing: false
    });
  });

  // Handle mark as read
  socket.on('mark_as_read', async (data: { partnerId: string }) => {
    if (!socket.userId) return;

    try {
      await prisma.message.updateMany({
        where: {
          senderId: data.partnerId,
          receiverId: socket.userId,
          isRead: false
        },
        data: { isRead: true }
      });

      // Notify the sender that messages were read
      io.to(`user_${data.partnerId}`).emit('messages_read', {
        readerId: socket.userId
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // Handle user status updates
  socket.on('update_status', (status: 'online' | 'away' | 'offline') => {
    if (!socket.userId) return;

    // Broadcast status to all user's conversation partners
    socket.broadcast.emit('user_status_changed', {
      userId: socket.userId,
      status
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected`);

    if (socket.userId) {
      // Notify contacts that user went offline
      socket.broadcast.emit('user_status_changed', {
        userId: socket.userId,
        status: 'offline'
      });
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
};