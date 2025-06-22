import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { addMonths, isBefore, isAfter, differenceInDays, format } from 'date-fns';

const router = express.Router();
const prisma = new PrismaClient();

// Get all leases for a landlord with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      status,
      propertyId,
      expiringIn,
      page = 1,
      limit = 10
    } = req.query;

    // Check if user is landlord
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user || user.userType !== 'LANDLORD') {
      return res.status(403).json({ error: 'Access denied. Landlords only.' });
    }

    // Build filter object
    const where: any = {
      application: {
        property: {
          ownerId: req.user.userId
        }
      }
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (propertyId) {
      where.application = {
        ...where.application,
        propertyId: propertyId as string
      };
    }

    // Handle expiring soon filter
    if (expiringIn) {
      const days = parseInt(expiringIn as string);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      
      where.endDate = {
        lte: futureDate,
        gte: new Date()
      };
      where.status = 'ACTIVE';
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [leases, total] = await Promise.all([
      prisma.lease.findMany({
        where,
        include: {
          application: {
            include: {
              property: {
                select: {
                  id: true,
                  title: true,
                  address: true,
                  borough: true
                }
              },
              applicant: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.lease.count({ where })
    ]);

    res.json({
      leases,
      pagination: {
        total,
        pages: Math.ceil(total / Number(limit)),
        currentPage: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching leases:', error);
    res.status(500).json({ error: 'Failed to fetch leases' });
  }
});

// Get lease by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            property: {
              include: {
                owner: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true
                  }
                }
              }
            },
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        }
      }
    });

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    // Check permissions
    const canAccess = 
      lease.application.property.ownerId === req.user.userId || 
      lease.application.applicantId === req.user.userId;

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(lease);
  } catch (error) {
    console.error('Error fetching lease:', error);
    res.status(500).json({ error: 'Failed to fetch lease' });
  }
});

// Create lease from application
router.post('/from-application/:applicationId', authenticateToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const {
      startDate,
      endDate,
      monthlyRent,
      securityDeposit,
      terms
    } = req.body;

    // Validate required fields
    if (!startDate || !endDate || !monthlyRent || !securityDeposit) {
      return res.status(400).json({
        error: 'Start date, end date, monthly rent, and security deposit are required'
      });
    }

    // Get application and verify ownership
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: true,
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.property.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (application.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Can only create leases from approved applications' });
    }

    // Check if lease already exists for this application
    const existingLease = await prisma.lease.findUnique({
      where: { applicationId }
    });

    if (existingLease) {
      return res.status(409).json({ error: 'Lease already exists for this application' });
    }

    // Create the lease
    const lease = await prisma.lease.create({
      data: {
        applicationId,
        tenantId: application.applicantId,
        landlordId: req.user.userId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        monthlyRent: parseInt(monthlyRent),
        securityDeposit: parseInt(securityDeposit),
        terms: terms || {},
        status: 'DRAFT'
      },
      include: {
        application: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                address: true,
                borough: true
              }
            },
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.userId,
        action: 'CREATE_LEASE',
        entity: 'Lease',
        entityId: lease.id,
        details: {
          applicationId,
          propertyId: application.propertyId,
          tenantId: application.applicantId,
          monthlyRent,
          startDate,
          endDate
        }
      }
    });

    res.status(201).json(lease);
  } catch (error) {
    console.error('Error creating lease:', error);
    res.status(500).json({ error: 'Failed to create lease' });
  }
});

// Update lease
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      startDate,
      endDate,
      monthlyRent,
      securityDeposit,
      terms,
      status,
      documentUrl
    } = req.body;

    // Get existing lease and verify ownership
    const existingLease = await prisma.lease.findUnique({
      where: { id },
      include: {
        application: {
          include: { property: true }
        }
      }
    });

    if (!existingLease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    if (existingLease.application.property.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build update data
    const updateData: any = {};
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (monthlyRent) updateData.monthlyRent = parseInt(monthlyRent);
    if (securityDeposit) updateData.securityDeposit = parseInt(securityDeposit);
    if (terms) updateData.terms = terms;
    if (status) updateData.status = status;
    if (documentUrl) updateData.documentUrl = documentUrl;

    // Set signed date if status is being set to ACTIVE
    if (status === 'ACTIVE' && existingLease.status !== 'ACTIVE') {
      updateData.signedAt = new Date();
    }

    const lease = await prisma.lease.update({
      where: { id },
      data: updateData,
      include: {
        application: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                address: true,
                borough: true
              }
            },
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.userId,
        action: 'UPDATE_LEASE',
        entity: 'Lease',
        entityId: lease.id,
        details: updateData
      }
    });

    res.json(lease);
  } catch (error) {
    console.error('Error updating lease:', error);
    res.status(500).json({ error: 'Failed to update lease' });
  }
});

// Terminate lease
router.post('/:id/terminate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { terminationDate, reason, refundDeposit = false } = req.body;

    if (!terminationDate) {
      return res.status(400).json({ error: 'Termination date is required' });
    }

    // Get existing lease and verify ownership
    const existingLease = await prisma.lease.findUnique({
      where: { id },
      include: {
        application: {
          include: { property: true }
        }
      }
    });

    if (!existingLease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const canTerminate = 
      existingLease.application.property.ownerId === req.user.userId ||
      existingLease.tenantId === req.user.userId;

    if (!canTerminate) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existingLease.status === 'TERMINATED') {
      return res.status(400).json({ error: 'Lease is already terminated' });
    }

    // Update lease status and end date
    const lease = await prisma.lease.update({
      where: { id },
      data: {
        status: 'TERMINATED',
        endDate: new Date(terminationDate),
        terms: {
          ...existingLease.terms,
          terminationReason: reason,
          terminatedBy: req.user.userId,
          terminatedAt: new Date().toISOString(),
          refundDeposit
        }
      },
      include: {
        application: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                address: true,
                borough: true
              }
            },
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.userId,
        action: 'TERMINATE_LEASE',
        entity: 'Lease',
        entityId: lease.id,
        details: {
          terminationDate,
          reason,
          refundDeposit
        }
      }
    });

    res.json(lease);
  } catch (error) {
    console.error('Error terminating lease:', error);
    res.status(500).json({ error: 'Failed to terminate lease' });
  }
});

// Get lease renewal candidates
router.get('/renewals/candidates', authenticateToken, async (req, res) => {
  try {
    const { daysAhead = 90 } = req.query;

    // Check if user is landlord
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user || user.userType !== 'LANDLORD') {
      return res.status(403).json({ error: 'Access denied. Landlords only.' });
    }

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Number(daysAhead));

    const renewalCandidates = await prisma.lease.findMany({
      where: {
        application: {
          property: {
            ownerId: req.user.userId
          }
        },
        status: 'ACTIVE',
        endDate: {
          lte: futureDate,
          gte: new Date()
        }
      },
      include: {
        application: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                address: true,
                borough: true
              }
            },
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: { endDate: 'asc' }
    });

    // Add days until expiration for each lease
    const candidatesWithDays = renewalCandidates.map(lease => ({
      ...lease,
      daysUntilExpiration: differenceInDays(new Date(lease.endDate), new Date())
    }));

    res.json(candidatesWithDays);
  } catch (error) {
    console.error('Error fetching renewal candidates:', error);
    res.status(500).json({ error: 'Failed to fetch renewal candidates' });
  }
});

// Create lease renewal
router.post('/:id/renew', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      newEndDate,
      newMonthlyRent,
      renewalTerms
    } = req.body;

    if (!newEndDate) {
      return res.status(400).json({ error: 'New end date is required' });
    }

    // Get existing lease and verify ownership
    const existingLease = await prisma.lease.findUnique({
      where: { id },
      include: {
        application: {
          include: { 
            property: true,
            applicant: true
          }
        }
      }
    });

    if (!existingLease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    if (existingLease.application.property.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existingLease.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Can only renew active leases' });
    }

    // Create new lease application for renewal
    const renewalApplication = await prisma.application.create({
      data: {
        applicantId: existingLease.tenantId,
        propertyId: existingLease.application.propertyId,
        status: 'APPROVED',
        moveInDate: existingLease.endDate,
        employmentInfo: {},
        references: {},
        monthlyIncome: existingLease.application.monthlyIncome,
        notes: `Lease renewal for lease ${id}`,
        landlordNotes: 'Automatic renewal application'
      }
    });

    // Create renewal lease
    const renewalLease = await prisma.lease.create({
      data: {
        applicationId: renewalApplication.id,
        tenantId: existingLease.tenantId,
        landlordId: existingLease.landlordId,
        startDate: existingLease.endDate,
        endDate: new Date(newEndDate),
        monthlyRent: newMonthlyRent ? parseInt(newMonthlyRent) : existingLease.monthlyRent,
        securityDeposit: existingLease.securityDeposit,
        terms: {
          ...existingLease.terms,
          ...renewalTerms,
          isRenewal: true,
          previousLeaseId: id,
          renewedAt: new Date().toISOString()
        },
        status: 'PENDING_SIGNATURE'
      },
      include: {
        application: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                address: true,
                borough: true
              }
            },
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.userId,
        action: 'CREATE_LEASE_RENEWAL',
        entity: 'Lease',
        entityId: renewalLease.id,
        details: {
          originalLeaseId: id,
          newEndDate,
          newMonthlyRent: newMonthlyRent || existingLease.monthlyRent,
          renewalTerms
        }
      }
    });

    res.status(201).json(renewalLease);
  } catch (error) {
    console.error('Error creating lease renewal:', error);
    res.status(500).json({ error: 'Failed to create lease renewal' });
  }
});

// Get lease dashboard statistics
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is landlord
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user || user.userType !== 'LANDLORD') {
      return res.status(403).json({ error: 'Access denied. Landlords only.' });
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const [
      totalLeases,
      activeLeases,
      expiringIn30Days,
      expiringIn90Days,
      draftLeases,
      terminatedThisMonth
    ] = await Promise.all([
      // Total leases
      prisma.lease.count({
        where: {
          application: {
            property: { ownerId: req.user.userId }
          }
        }
      }),
      // Active leases
      prisma.lease.count({
        where: {
          application: {
            property: { ownerId: req.user.userId }
          },
          status: 'ACTIVE'
        }
      }),
      // Expiring in 30 days
      prisma.lease.count({
        where: {
          application: {
            property: { ownerId: req.user.userId }
          },
          status: 'ACTIVE',
          endDate: {
            lte: thirtyDaysFromNow,
            gte: new Date()
          }
        }
      }),
      // Expiring in 90 days
      prisma.lease.count({
        where: {
          application: {
            property: { ownerId: req.user.userId }
          },
          status: 'ACTIVE',
          endDate: {
            lte: ninetyDaysFromNow,
            gte: new Date()
          }
        }
      }),
      // Draft leases
      prisma.lease.count({
        where: {
          application: {
            property: { ownerId: req.user.userId }
          },
          status: 'DRAFT'
        }
      }),
      // Terminated this month
      prisma.lease.count({
        where: {
          application: {
            property: { ownerId: req.user.userId }
          },
          status: 'TERMINATED',
          updatedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    res.json({
      totalLeases,
      activeLeases,
      expiringIn30Days,
      expiringIn90Days,
      draftLeases,
      terminatedThisMonth
    });
  } catch (error) {
    console.error('Error fetching lease stats:', error);
    res.status(500).json({ error: 'Failed to fetch lease statistics' });
  }
});

export default router;