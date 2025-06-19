import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();
const prisma = new PrismaClient();

// Get current user profile
router.get('/profile', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      userType: true,
      profileImage: true,
      verificationStatus: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    success: true,
    data: user
  });
}));

// Update user profile
router.put('/profile', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, phone, profileImage } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      firstName,
      lastName,
      phone,
      profileImage
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      userType: true,
      profileImage: true,
      verificationStatus: true,
      updatedAt: true
    }
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: user
  });
}));

// Change password
router.put('/change-password', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  if (!isValidPassword) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { password: hashedNewPassword }
  });

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// Get user dashboard stats
router.get('/dashboard-stats', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const userType = req.user!.userType;

  let stats: any = {};

  if (userType === 'LANDLORD' || userType === 'PROPERTY_MANAGER') {
    // Landlord stats
    const [propertiesCount, applicationsCount, totalRevenue] = await Promise.all([
      prisma.property.count({ where: { ownerId: userId } }),
      prisma.application.count({
        where: {
          property: { ownerId: userId }
        }
      }),
      prisma.payment.aggregate({
        where: {
          application: {
            property: { ownerId: userId }
          },
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      })
    ]);

    stats = {
      propertiesCount,
      applicationsCount,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentApplications: await prisma.application.findMany({
        where: {
          property: { ownerId: userId }
        },
        include: {
          applicant: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          property: {
            select: {
              title: true,
              address: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    };
  } else {
    // Renter stats
    const [applicationsCount, savedPropertiesCount, messagesCount] = await Promise.all([
      prisma.application.count({ where: { applicantId: userId } }),
      prisma.savedProperty.count({ where: { userId } }),
      prisma.message.count({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        }
      })
    ]);

    stats = {
      applicationsCount,
      savedPropertiesCount,
      messagesCount,
      recentApplications: await prisma.application.findMany({
        where: { applicantId: userId },
        include: {
          property: {
            select: {
              title: true,
              address: true,
              rentAmount: true,
              photos: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    };
  }

  res.json({
    success: true,
    data: stats
  });
}));

// Deactivate account
router.put('/deactivate', asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { isActive: false }
  });

  res.json({
    success: true,
    message: 'Account deactivated successfully'
  });
}));

export default router;