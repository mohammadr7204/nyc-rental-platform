import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createVendorSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  specialties: z.array(z.string()),
  serviceAreas: z.array(z.string()),
  businessLicense: z.string().optional(),
  insurance: z.any().optional(),
  certifications: z.array(z.string()).optional(),
  hourlyRate: z.number().positive().optional(),
  emergencyRate: z.number().positive().optional(),
  minimumCharge: z.number().positive().optional(),
});

const updateVendorSchema = createVendorSchema.partial();

const createVendorServiceSchema = z.object({
  serviceType: z.enum([
    'PLUMBING', 'ELECTRICAL', 'HVAC', 'CARPENTRY', 'PAINTING', 'FLOORING',
    'APPLIANCE_REPAIR', 'PEST_CONTROL', 'CLEANING', 'LANDSCAPING', 'ROOFING',
    'WINDOWS', 'GENERAL_HANDYMAN', 'LOCKSMITH', 'MASONRY', 'DRYWALL', 
    'TILE_WORK', 'EMERGENCY_REPAIR', 'OTHER'
  ]),
  description: z.string().optional(),
  basePrice: z.number().positive().optional(),
  priceType: z.enum(['HOURLY', 'FLAT_RATE', 'PER_SQFT', 'ESTIMATE_REQUIRED']).default('HOURLY'),
  isEmergency: z.boolean().default(false),
});

const createVendorReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  workQuality: z.number().min(1).max(5),
  timeliness: z.number().min(1).max(5),
  communication: z.number().min(1).max(5),
  value: z.number().min(1).max(5),
  workType: z.string().optional(),
  workDate: z.string().transform((str) => new Date(str)).optional(),
  cost: z.number().positive().optional(),
  maintenanceRequestId: z.string().optional(),
});

// GET /api/vendors - Get all vendors for a landlord
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, serviceType, borough, rating } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Build filter conditions
    const where: any = {
      addedById: userId,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { companyName: { contains: search as string, mode: 'insensitive' } },
        { contactPerson: { contains: search as string, mode: 'insensitive' } },
        { specialties: { has: search as string } },
      ];
    }

    if (serviceType) {
      where.services = {
        some: {
          serviceType: serviceType as string,
        },
      };
    }

    if (borough) {
      where.serviceAreas = {
        has: borough as string,
      };
    }

    if (rating) {
      where.rating = {
        gte: parseFloat(rating as string),
      };
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          services: true,
          reviews: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: {
              reviewer: {
                select: { firstName: true, lastName: true },
              },
            },
          },
          _count: {
            select: { maintenanceRequests: true },
          },
        },
        orderBy: [
          { rating: 'desc' },
          { totalReviews: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.vendor.count({ where }),
    ]);

    res.json({
      vendors,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// GET /api/vendors/:id - Get specific vendor
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const vendor = await prisma.vendor.findFirst({
      where: {
        id,
        addedById: userId,
      },
      include: {
        services: true,
        reviews: {
          include: {
            reviewer: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        maintenanceRequests: {
          include: {
            property: {
              select: { title: true, address: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { maintenanceRequests: true },
        },
      },
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// POST /api/vendors - Create new vendor
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const validatedData = createVendorSchema.parse(req.body);

    // Convert rates from dollars to cents if provided
    const vendorData = {
      ...validatedData,
      hourlyRate: validatedData.hourlyRate ? Math.round(validatedData.hourlyRate * 100) : undefined,
      emergencyRate: validatedData.emergencyRate ? Math.round(validatedData.emergencyRate * 100) : undefined,
      minimumCharge: validatedData.minimumCharge ? Math.round(validatedData.minimumCharge * 100) : undefined,
      addedById: userId,
    };

    const vendor = await prisma.vendor.create({
      data: vendorData,
      include: {
        services: true,
        reviews: true,
      },
    });

    res.status(201).json(vendor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating vendor:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// PUT /api/vendors/:id - Update vendor
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    const validatedData = updateVendorSchema.parse(req.body);

    // Check if vendor belongs to user
    const existingVendor = await prisma.vendor.findFirst({
      where: { id, addedById: userId },
    });

    if (!existingVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Convert rates from dollars to cents if provided
    const updateData = {
      ...validatedData,
      hourlyRate: validatedData.hourlyRate ? Math.round(validatedData.hourlyRate * 100) : undefined,
      emergencyRate: validatedData.emergencyRate ? Math.round(validatedData.emergencyRate * 100) : undefined,
      minimumCharge: validatedData.minimumCharge ? Math.round(validatedData.minimumCharge * 100) : undefined,
    };

    const vendor = await prisma.vendor.update({
      where: { id },
      data: updateData,
      include: {
        services: true,
        reviews: true,
      },
    });

    res.json(vendor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// DELETE /api/vendors/:id - Soft delete vendor (set inactive)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const vendor = await prisma.vendor.findFirst({
      where: { id, addedById: userId },
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    await prisma.vendor.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Vendor deactivated successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

// POST /api/vendors/:id/services - Add service to vendor
router.post('/:id/services', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    const validatedData = createVendorServiceSchema.parse(req.body);

    // Check if vendor belongs to user
    const vendor = await prisma.vendor.findFirst({
      where: { id, addedById: userId },
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Convert price from dollars to cents if provided
    const serviceData = {
      ...validatedData,
      basePrice: validatedData.basePrice ? Math.round(validatedData.basePrice * 100) : undefined,
      vendorId: id,
    };

    const service = await prisma.vendorService.create({
      data: serviceData,
    });

    res.status(201).json(service);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating vendor service:', error);
    res.status(500).json({ error: 'Failed to create vendor service' });
  }
});

// DELETE /api/vendors/:vendorId/services/:serviceId - Remove service from vendor
router.delete('/:vendorId/services/:serviceId', authenticateToken, async (req, res) => {
  try {
    const { vendorId, serviceId } = req.params;
    const userId = req.user?.userId;

    // Check if vendor belongs to user
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, addedById: userId },
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    await prisma.vendorService.delete({
      where: { id: serviceId },
    });

    res.json({ message: 'Service removed successfully' });
  } catch (error) {
    console.error('Error removing vendor service:', error);
    res.status(500).json({ error: 'Failed to remove vendor service' });
  }
});

// POST /api/vendors/:id/reviews - Add review for vendor
router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    const validatedData = createVendorReviewSchema.parse(req.body);

    // Check if vendor exists and user has worked with them
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        maintenanceRequests: {
          where: {
            property: {
              ownerId: userId,
            },
          },
        },
      },
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (vendor.maintenanceRequests.length === 0) {
      return res.status(403).json({ error: 'You can only review vendors you have worked with' });
    }

    // Convert cost from dollars to cents if provided
    const reviewData = {
      ...validatedData,
      cost: validatedData.cost ? Math.round(validatedData.cost * 100) : undefined,
      vendorId: id,
      reviewerId: userId,
    };

    const review = await prisma.vendorReview.create({
      data: reviewData,
      include: {
        reviewer: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Update vendor rating
    await updateVendorRating(id);

    res.status(201).json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating vendor review:', error);
    res.status(500).json({ error: 'Failed to create vendor review' });
  }
});

// PUT /api/vendors/assign/:maintenanceId - Assign vendor to maintenance request
router.put('/assign/:maintenanceId', authenticateToken, async (req, res) => {
  try {
    const { maintenanceId } = req.params;
    const { vendorId, vendorNotes, vendorEstimate } = req.body;
    const userId = req.user?.userId;

    // Check if maintenance request belongs to user's property
    const maintenanceRequest = await prisma.maintenanceRequest.findFirst({
      where: {
        id: maintenanceId,
        property: {
          ownerId: userId,
        },
      },
    });

    if (!maintenanceRequest) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    // Check if vendor belongs to user
    if (vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: { id: vendorId, addedById: userId },
      });

      if (!vendor) {
        return res.status(404).json({ error: 'Vendor not found' });
      }
    }

    const updatedRequest = await prisma.maintenanceRequest.update({
      where: { id: maintenanceId },
      data: {
        assignedVendorId: vendorId || null,
        vendorNotes,
        vendorEstimate: vendorEstimate ? Math.round(vendorEstimate * 100) : null,
        status: vendorId ? 'SCHEDULED' : 'PENDING',
      },
      include: {
        assignedVendor: true,
        property: true,
        tenant: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    res.json(updatedRequest);
  } catch (error) {
    console.error('Error assigning vendor:', error);
    res.status(500).json({ error: 'Failed to assign vendor' });
  }
});

// Helper function to update vendor rating
async function updateVendorRating(vendorId: string) {
  try {
    const reviews = await prisma.vendorReview.findMany({
      where: { vendorId },
      select: { rating: true },
    });

    if (reviews.length > 0) {
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      
      await prisma.vendor.update({
        where: { id: vendorId },
        data: {
          rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
          totalReviews: reviews.length,
        },
      });
    }
  } catch (error) {
    console.error('Error updating vendor rating:', error);
  }
}

export default router;