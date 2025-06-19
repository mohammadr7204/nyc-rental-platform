import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, requireUserType } from '../middleware/auth';
import { validateApplication } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();
const prisma = new PrismaClient();

// Submit application (renters only)
router.post('/',
  requireUserType(['RENTER']),
  validateApplication,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      propertyId,
      moveInDate,
      employmentInfo,
      references,
      monthlyIncome,
      notes
    } = req.body;

    // Check if property exists and is available
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.status !== 'AVAILABLE') {
      return res.status(400).json({ error: 'Property is not available for rent' });
    }

    // Check if user already applied for this property
    const existingApplication = await prisma.application.findUnique({
      where: {
        applicantId_propertyId: {
          applicantId: req.user!.userId,
          propertyId
        }
      }
    });

    if (existingApplication) {
      return res.status(400).json({ error: 'You have already applied for this property' });
    }

    const application = await prisma.application.create({
      data: {
        applicantId: req.user!.userId,
        propertyId,
        moveInDate: new Date(moveInDate),
        employmentInfo,
        references,
        monthlyIncome: Number(monthlyIncome),
        notes
      },
      include: {
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            rentAmount: true,
            photos: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });
  })
);

// Get user's applications
router.get('/my-applications',
  requireUserType(['RENTER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const applications = await prisma.application.findMany({
      where: { applicantId: req.user!.userId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            rentAmount: true,
            photos: true,
            owner: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: applications
    });
  })
);

// Get applications for landlord's properties
router.get('/property-applications',
  requireUserType(['LANDLORD', 'PROPERTY_MANAGER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { propertyId, status } = req.query;

    const where: any = {
      property: { ownerId: req.user!.userId }
    };

    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status;

    const applications = await prisma.application.findMany({
      where,
      include: {
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            verificationStatus: true
          }
        },
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            rentAmount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: applications
    });
  })
);

// Get single application
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const application = await prisma.application.findUnique({
    where: { id: req.params.id },
    include: {
      applicant: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          verificationStatus: true
        }
      },
      property: {
        include: {
          owner: {
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

  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }

  // Check if user has permission to view this application
  const hasPermission =
    application.applicantId === req.user!.userId ||
    application.property.ownerId === req.user!.userId;

  if (!hasPermission) {
    return res.status(403).json({ error: 'Not authorized to view this application' });
  }

  res.json({
    success: true,
    data: application
  });
}));

// Update application status (landlords only)
router.put('/:id/status',
  requireUserType(['LANDLORD', 'PROPERTY_MANAGER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, notes } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be APPROVED or REJECTED' });
    }

    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { property: true }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.property.ownerId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized to update this application' });
    }

    const updatedApplication = await prisma.application.update({
      where: { id: req.params.id },
      data: {
        status,
        notes
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
      }
    });

    // If approved, update property status to pending
    if (status === 'APPROVED') {
      await prisma.property.update({
        where: { id: application.propertyId },
        data: { status: 'PENDING' }
      });
    }

    res.json({
      success: true,
      message: `Application ${status.toLowerCase()} successfully`,
      data: updatedApplication
    });
  })
);

// Withdraw application (renters only)
router.put('/:id/withdraw',
  requireUserType(['RENTER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const application = await prisma.application.findUnique({
      where: { id: req.params.id }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.applicantId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized to withdraw this application' });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only withdraw pending applications' });
    }

    await prisma.application.update({
      where: { id: req.params.id },
      data: { status: 'WITHDRAWN' }
    });

    res.json({
      success: true,
      message: 'Application withdrawn successfully'
    });
  })
);

export default router;