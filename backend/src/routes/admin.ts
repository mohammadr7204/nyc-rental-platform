import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, requireUserType } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { emailService } from '../services/emailService';
import { fareActService } from '../services/fareActService';

const router = express.Router();
const prisma = new PrismaClient();

// Admin Dashboard Stats
router.get('/dashboard',
  requireUserType(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const [
      totalUsers,
      totalProperties,
      totalApplications,
      totalPayments,
      recentUsers,
      recentProperties,
      systemHealth
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.application.count(),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          userType: true,
          verificationStatus: true,
          createdAt: true
        }
      }),
      prisma.property.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { firstName: true, lastName: true, email: true }
          },
          _count: { select: { applications: true } }
        }
      }),
      getSystemHealth()
    ]);

    const stats = {
      users: {
        total: totalUsers,
        byType: await prisma.user.groupBy({
          by: ['userType'],
          _count: { userType: true }
        }),
        byVerification: await prisma.user.groupBy({
          by: ['verificationStatus'],
          _count: { verificationStatus: true }
        })
      },
      properties: {
        total: totalProperties,
        byStatus: await prisma.property.groupBy({
          by: ['status'],
          _count: { status: true }
        }),
        byBorough: await prisma.property.groupBy({
          by: ['borough'],
          _count: { borough: true }
        })
      },
      applications: {
        total: totalApplications,
        byStatus: await prisma.application.groupBy({
          by: ['status'],
          _count: { status: true }
        })
      },
      payments: {
        totalAmount: totalPayments._sum.amount || 0,
        byStatus: await prisma.payment.groupBy({
          by: ['status'],
          _count: { status: true },
          _sum: { amount: true }
        })
      },
      recent: {
        users: recentUsers,
        properties: recentProperties
      },
      system: systemHealth
    };

    res.json({
      success: true,
      data: stats
    });
  })
);

// User Management
router.get('/users',
  requireUserType(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20, search, userType, verificationStatus } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (userType) where.userType = userType;
    if (verificationStatus) where.verificationStatus = verificationStatus;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          userType: true,
          verificationStatus: true,
          emailVerified: true,
          phoneVerified: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              properties: true,
              applications: true,
              payments: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  })
);

// Get User Details
router.get('/users/:id',
  requireUserType(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        properties: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        applications: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            property: {
              select: { title: true, address: true }
            }
          }
        },
        payments: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive data
    const { password, ssn, ...userWithoutSensitive } = user;

    res.json({
      success: true,
      data: userWithoutSensitive
    });
  })
);

// Update User
router.put('/users/:id',
  requireUserType(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { verificationStatus, isActive, notes } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        verificationStatus,
        isActive,
        ...(notes && {
          // Add notes to activity log instead of user record
        })
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        verificationStatus: true,
        isActive: true
      }
    });

    // Log admin action
    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'USER_UPDATED',
        entity: 'User',
        entityId: req.params.id,
        details: { verificationStatus, isActive, notes }
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  })
);

// Property Management
router.get('/properties',
  requireUserType(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20, search, status, borough } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { address: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (status) where.status = status;
    if (borough) where.borough = borough;

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              verificationStatus: true
            }
          },
          _count: {
            select: {
              applications: true,
              savedBy: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.property.count({ where })
    ]);

    res.json({
      success: true,
      data: properties,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  })
);

// Update Property Status
router.put('/properties/:id/status',
  requireUserType(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, reason } = req.body;

    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        owner: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });

    // Log admin action
    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'PROPERTY_STATUS_UPDATED',
        entity: 'Property',
        entityId: req.params.id,
        details: { status, reason }
      }
    });

    // Notify property owner
    if (status === 'INACTIVE' && reason) {
      try {
        await emailService.sendEmail(
          property.owner.email,
          'propertyStatusUpdate',
          {
            firstName: property.owner.firstName,
            propertyTitle: property.title,
            newStatus: status,
            reason
          }
        );
      } catch (error) {
        console.error('Failed to send property status notification:', error);
      }
    }

    res.json({
      success: true,
      message: 'Property status updated successfully',
      data: property
    });
  })
);

// FARE Act Compliance Reports
router.get('/compliance/fare-act',
  requireUserType(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const properties = await prisma.property.findMany({
      include: {
        FareActCompliance: true,
        owner: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });

    const complianceReport = await Promise.all(
      properties.map(async (property) => {
        const compliance = await fareActService.validateCompliance(property.id);
        return {
          propertyId: property.id,
          title: property.title,
          address: property.address,
          owner: property.owner,
          isCompliant: compliance.isCompliant,
          violations: compliance.violations,
          warnings: compliance.warnings,
          lastUpdated: property.FareActCompliance?.complianceDate || property.updatedAt
        };
      })
    );

    const summary = {
      totalProperties: properties.length,
      compliantProperties: complianceReport.filter(p => p.isCompliant).length,
      violationsCount: complianceReport.reduce((sum, p) => sum + p.violations.length, 0),
      warningsCount: complianceReport.reduce((sum, p) => sum + p.warnings.length, 0)
    };

    res.json({
      success: true,
      data: {
        summary,
        properties: complianceReport
      }
    });
  })
);

// System Settings
router.get('/settings',
  requireUserType(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await prisma.systemSettings.findMany({
      orderBy: { key: 'asc' }
    });

    res.json({
      success: true,
      data: settings
    });
  })
);

router.put('/settings/:key',
  requireUserType(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { value, description } = req.body;

    const setting = await prisma.systemSettings.upsert({
      where: { key: req.params.key },
      create: {
        key: req.params.key,
        value,
        description
      },
      update: {
        value,
        description
      }
    });

    // Log admin action
    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: 'SYSTEM_SETTING_UPDATED',
        entity: 'SystemSettings',
        entityId: setting.id,
        details: { key: req.params.key, value, description }
      }
    });

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: setting
    });
  })
);

// Activity Logs
router.get('/logs',
  requireUserType(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 50, action, entity, userId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.activityLog.count({ where })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  })
);

// Email Management
router.get('/emails',
  requireUserType(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 50, status, template } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (template) where.template = template;

    const [emails, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { sentAt: 'desc' }
      }),
      prisma.emailLog.count({ where })
    ]);

    res.json({
      success: true,
      data: emails,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  })
);

// Analytics
router.get('/analytics/overview',
  requireUserType(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period = '30d' } = req.query;
    const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const analytics = {
      userGrowth: await getUserGrowthAnalytics(startDate),
      propertyMetrics: await getPropertyAnalytics(startDate),
      applicationMetrics: await getApplicationAnalytics(startDate),
      revenueMetrics: await getRevenueAnalytics(startDate)
    };

    res.json({
      success: true,
      data: analytics
    });
  })
);

// Helper Functions
async function getSystemHealth() {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`, // Database check
    fetch('https://api.stripe.com/v1/account', {
      headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
    }), // Stripe check
  ]);

  return {
    database: checks[0].status === 'fulfilled',
    stripe: checks[1].status === 'fulfilled',
    lastChecked: new Date()
  };
}

async function getUserGrowthAnalytics(startDate: Date) {
  const users = await prisma.user.groupBy({
    by: ['userType'],
    where: { createdAt: { gte: startDate } },
    _count: { userType: true }
  });

  const dailySignups = await prisma.$queryRaw`
    SELECT DATE(created_at) as date, COUNT(*) as signups
    FROM users
    WHERE created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date
  `;

  return { usersByType: users, dailySignups };
}

async function getPropertyAnalytics(startDate: Date) {
  const properties = await prisma.property.groupBy({
    by: ['borough', 'status'],
    where: { createdAt: { gte: startDate } },
    _count: { borough: true },
    _avg: { rentAmount: true }
  });

  return { propertiesByBorough: properties };
}

async function getApplicationAnalytics(startDate: Date) {
  const applications = await prisma.application.groupBy({
    by: ['status'],
    where: { createdAt: { gte: startDate } },
    _count: { status: true }
  });

  return { applicationsByStatus: applications };
}

async function getRevenueAnalytics(startDate: Date) {
  const revenue = await prisma.payment.groupBy({
    by: ['type'],
    where: {
      createdAt: { gte: startDate },
      status: 'COMPLETED'
    },
    _sum: { amount: true },
    _count: { type: true }
  });

  return { revenueByType: revenue };
}

export default router;