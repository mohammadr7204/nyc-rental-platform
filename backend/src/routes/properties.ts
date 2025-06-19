import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticateToken, requireUserType } from '../middleware/auth';
import { validateProperty } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();
const prisma = new PrismaClient();

// Get all properties (public route)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 20,
    borough,
    minRent,
    maxRent,
    bedrooms,
    bathrooms,
    propertyType,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Build filter conditions
  const where: any = {
    status: 'AVAILABLE'
  };

  if (borough) where.borough = borough;
  if (minRent) where.rentAmount = { ...where.rentAmount, gte: Number(minRent) };
  if (maxRent) where.rentAmount = { ...where.rentAmount, lte: Number(maxRent) };
  if (bedrooms) where.bedrooms = Number(bedrooms);
  if (bathrooms) where.bathrooms = Number(bathrooms);
  if (propertyType) where.propertyType = propertyType;
  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { address: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
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
      take,
      orderBy: {
        [sortBy as string]: sortOrder
      }
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
}));

// Get single property
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const property = await prisma.property.findUnique({
    where: { id: req.params.id },
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true,
          verificationStatus: true,
          createdAt: true
        }
      },
      _count: {
        select: {
          applications: true,
          savedBy: true
        }
      }
    }
  });

  if (!property) {
    return res.status(404).json({ error: 'Property not found' });
  }

  res.json({
    success: true,
    data: property
  });
}));

// Create property (landlords only)
router.post('/',
  authenticateToken,
  requireUserType(['LANDLORD', 'PROPERTY_MANAGER']),
  validateProperty,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const propertyData = {
      ...req.body,
      ownerId: req.user!.userId,
      rentAmount: Number(req.body.rentAmount),
      securityDeposit: Number(req.body.securityDeposit),
      bedrooms: Number(req.body.bedrooms),
      bathrooms: Number(req.body.bathrooms),
      squareFeet: req.body.squareFeet ? Number(req.body.squareFeet) : null,
      availableDate: new Date(req.body.availableDate)
    };

    const property = await prisma.property.create({
      data: propertyData,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property
    });
  })
);

// Update property
router.put('/:id',
  authenticateToken,
  requireUserType(['LANDLORD', 'PROPERTY_MANAGER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.ownerId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized to update this property' });
    }

    const updateData = { ...req.body };

    // Convert numeric fields
    if (updateData.rentAmount) updateData.rentAmount = Number(updateData.rentAmount);
    if (updateData.securityDeposit) updateData.securityDeposit = Number(updateData.securityDeposit);
    if (updateData.bedrooms) updateData.bedrooms = Number(updateData.bedrooms);
    if (updateData.bathrooms) updateData.bathrooms = Number(updateData.bathrooms);
    if (updateData.squareFeet) updateData.squareFeet = Number(updateData.squareFeet);
    if (updateData.availableDate) updateData.availableDate = new Date(updateData.availableDate);

    const updatedProperty = await prisma.property.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: updatedProperty
    });
  })
);

// Delete property
router.delete('/:id',
  authenticateToken,
  requireUserType(['LANDLORD', 'PROPERTY_MANAGER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.ownerId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this property' });
    }

    await prisma.property.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  })
);

// Get my properties (landlord)
router.get('/owner/my-properties',
  authenticateToken,
  requireUserType(['LANDLORD', 'PROPERTY_MANAGER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const properties = await prisma.property.findMany({
      where: { ownerId: req.user!.userId },
      include: {
        _count: {
          select: {
            applications: true,
            savedBy: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: properties
    });
  })
);

// Save/unsave property
router.post('/:id/save',
  authenticateToken,
  requireUserType(['RENTER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const existingSave = await prisma.savedProperty.findUnique({
      where: {
        userId_propertyId: {
          userId: req.user!.userId,
          propertyId: req.params.id
        }
      }
    });

    if (existingSave) {
      await prisma.savedProperty.delete({
        where: { id: existingSave.id }
      });
      res.json({
        success: true,
        message: 'Property removed from saved list',
        saved: false
      });
    } else {
      await prisma.savedProperty.create({
        data: {
          userId: req.user!.userId,
          propertyId: req.params.id
        }
      });
      res.json({
        success: true,
        message: 'Property saved successfully',
        saved: true
      });
    }
  })
);

// Get saved properties
router.get('/saved/my-saved',
  authenticateToken,
  requireUserType(['RENTER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const savedProperties = await prisma.savedProperty.findMany({
      where: { userId: req.user!.userId },
      include: {
        property: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: savedProperties.map(sp => sp.property)
    });
  })
);

export default router;