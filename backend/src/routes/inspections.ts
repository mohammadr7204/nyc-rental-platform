import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/inspections';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `inspection-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get all inspections for a landlord with filtering and pagination
router.get('/', authenticateToken, async (req, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  // Type assertion since we've already checked req.user exists
  const userId = req.user.userId;

  try {
    const {
      propertyId,
      status,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    // Check if user is landlord
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.userType !== 'LANDLORD') {
      return res.status(403).json({ error: 'Access denied. Landlords only.' });
    }

    // Build filter object
    const where: any = {};

    // Filter by properties owned by the landlord
    where.property = {
      ownerId: userId
    };

    if (propertyId) {
      where.propertyId = propertyId as string;
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) {
        where.scheduledDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.scheduledDate.lte = new Date(endDate as string);
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [inspections, total] = await Promise.all([
      prisma.propertyInspection.findMany({
        where,
        include: {
          property: {
            select: {
              id: true,
              title: true,
              address: true,
              borough: true
            }
          }
        },
        orderBy: { scheduledDate: 'asc' },
        skip,
        take: Number(limit)
      }),
      prisma.propertyInspection.count({ where })
    ]);

    res.json({
      inspections,
      pagination: {
        total,
        pages: Math.ceil(total / Number(limit)),
        currentPage: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching inspections:', error);
    res.status(500).json({ error: 'Failed to fetch inspections' });
  }
});

// Get inspection by ID
router.get('/:id', authenticateToken, async (req, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const userId = req.user.userId;

  try {
    const { id } = req.params;

    const inspection = await prisma.propertyInspection.findUnique({
      where: { id },
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
        }
      }
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Check permissions - only property owner can view
    if (inspection.property.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(inspection);
  } catch (error) {
    console.error('Error fetching inspection:', error);
    res.status(500).json({ error: 'Failed to fetch inspection' });
  }
});

// Create new inspection
router.post('/', authenticateToken, async (req, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const userId = req.user.userId;

  try {
    const {
      propertyId,
      type,
      scheduledDate,
      notes,
      inspectorId
    } = req.body;

    // Validate required fields
    if (!propertyId || !type || !scheduledDate) {
      return res.status(400).json({
        error: 'Property ID, inspection type, and scheduled date are required'
      });
    }

    // Check if user owns the property
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property || property.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied. You can only schedule inspections for your properties.' });
    }

    // Check for scheduling conflicts
    const conflictingInspection = await prisma.propertyInspection.findFirst({
      where: {
        propertyId,
        scheduledDate: new Date(scheduledDate),
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        }
      }
    });

    if (conflictingInspection) {
      return res.status(409).json({
        error: 'An inspection is already scheduled for this property at the selected time'
      });
    }

    // Create the inspection
    const inspection = await prisma.propertyInspection.create({
      data: {
        propertyId,
        type,
        scheduledDate: new Date(scheduledDate),
        notes: notes || '',
        inspectorId: inspectorId || undefined,
        status: 'SCHEDULED',
        photos: [],
        report: undefined
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            borough: true
          }
        }
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: userId,
        action: 'CREATE_INSPECTION',
        entity: 'PropertyInspection',
        entityId: inspection.id,
        details: {
          propertyId,
          type,
          scheduledDate
        }
      }
    });

    res.status(201).json(inspection);
  } catch (error) {
    console.error('Error creating inspection:', error);
    res.status(500).json({ error: 'Failed to create inspection' });
  }
});

// Update inspection
router.put('/:id', authenticateToken, async (req, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const userId = req.user.userId;

  try {
    const { id } = req.params;
    const {
      type,
      scheduledDate,
      completedDate,
      status,
      notes,
      inspectorId,
      report
    } = req.body;

    // Check if inspection exists and user has permission
    const existingInspection = await prisma.propertyInspection.findUnique({
      where: { id },
      include: { property: true }
    });

    if (!existingInspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    if (existingInspection.property.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check for scheduling conflicts if date is being changed
    if (scheduledDate && new Date(scheduledDate).getTime() !== existingInspection.scheduledDate.getTime()) {
      const conflictingInspection = await prisma.propertyInspection.findFirst({
        where: {
          propertyId: existingInspection.propertyId,
          scheduledDate: new Date(scheduledDate),
          status: {
            in: ['SCHEDULED', 'IN_PROGRESS']
          },
          id: {
            not: id
          }
        }
      });

      if (conflictingInspection) {
        return res.status(409).json({
          error: 'Another inspection is already scheduled for this property at the selected time'
        });
      }
    }

    // Build update data
    const updateData: any = {};
    if (type) updateData.type = type;
    if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
    if (completedDate) updateData.completedDate = new Date(completedDate);
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (inspectorId !== undefined) updateData.inspectorId = inspectorId;
    if (report) updateData.report = report;

    // Automatically set completedDate if status is being set to COMPLETED
    if (status === 'COMPLETED' && !completedDate) {
      updateData.completedDate = new Date();
    }

    const inspection = await prisma.propertyInspection.update({
      where: { id },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            borough: true
          }
        }
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: userId,
        action: 'UPDATE_INSPECTION',
        entity: 'PropertyInspection',
        entityId: inspection.id,
        details: updateData
      }
    });

    res.json(inspection);
  } catch (error) {
    console.error('Error updating inspection:', error);
    res.status(500).json({ error: 'Failed to update inspection' });
  }
});

// Upload photos for inspection
router.post('/:id/photos', authenticateToken, upload.array('photos', 10), async (req, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const userId = req.user.userId;

  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    // Check if inspection exists and user has permission
    const inspection = await prisma.propertyInspection.findUnique({
      where: { id },
      include: { property: true }
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    if (inspection.property.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Process uploaded files
    const photoUrls = files.map(file => `/uploads/inspections/${file.filename}`);

    // Add new photos to existing ones
    const updatedPhotos = [...inspection.photos, ...photoUrls];

    const updatedInspection = await prisma.propertyInspection.update({
      where: { id },
      data: { photos: updatedPhotos },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            borough: true
          }
        }
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: userId,
        action: 'UPLOAD_INSPECTION_PHOTOS',
        entity: 'PropertyInspection',
        entityId: inspection.id,
        details: {
          photoCount: files.length,
          photoUrls
        }
      }
    });

    res.json({
      inspection: updatedInspection,
      uploadedPhotos: photoUrls
    });
  } catch (error) {
    console.error('Error uploading inspection photos:', error);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});

// Delete photo from inspection
router.delete('/:id/photos/:photoIndex', authenticateToken, async (req, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const userId = req.user.userId;

  try {
    const { id, photoIndex } = req.params;
    const index = parseInt(photoIndex);

    // Check if inspection exists and user has permission
    const inspection = await prisma.propertyInspection.findUnique({
      where: { id },
      include: { property: true }
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    if (inspection.property.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (index < 0 || index >= inspection.photos.length) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Remove photo from array
    const updatedPhotos = inspection.photos.filter((_, i) => i !== index);

    // Try to delete the physical file
    const photoPath = inspection.photos[index];
    if (photoPath) {
      const fullPath = path.join(process.cwd(), photoPath);
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (fileError) {
        console.warn('Could not delete photo file:', fileError);
      }
    }

    const updatedInspection = await prisma.propertyInspection.update({
      where: { id },
      data: { photos: updatedPhotos }
    });

    res.json({ inspection: updatedInspection });
  } catch (error) {
    console.error('Error deleting inspection photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// Delete inspection
router.delete('/:id', authenticateToken, async (req, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const userId = req.user.userId;

  try {
    const { id } = req.params;

    // Check if inspection exists and user has permission
    const inspection = await prisma.propertyInspection.findUnique({
      where: { id },
      include: { property: true }
    });

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    if (inspection.property.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Don't allow deletion of completed inspections
    if (inspection.status === 'COMPLETED') {
      return res.status(400).json({
        error: 'Cannot delete completed inspections. Consider cancelling instead.'
      });
    }

    // Delete associated photos
    for (const photoPath of inspection.photos) {
      const fullPath = path.join(process.cwd(), photoPath);
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (fileError) {
        console.warn('Could not delete photo file:', fileError);
      }
    }

    await prisma.propertyInspection.delete({
      where: { id }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: userId,
        action: 'DELETE_INSPECTION',
        entity: 'PropertyInspection',
        entityId: id,
        details: {
          propertyId: inspection.propertyId,
          type: inspection.type,
          scheduledDate: inspection.scheduledDate
        }
      }
    });

    res.json({ message: 'Inspection deleted successfully' });
  } catch (error) {
    console.error('Error deleting inspection:', error);
    res.status(500).json({ error: 'Failed to delete inspection' });
  }
});

// Get inspection availability for a property
router.get('/property/:propertyId/availability', authenticateToken, async (req, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const userId = req.user.userId;

  try {
    const { propertyId } = req.params;
    const { startDate, endDate } = req.query;

    // Check if user owns the property
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property || property.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const where: any = {
      propertyId,
      status: {
        in: ['SCHEDULED', 'IN_PROGRESS']
      }
    };

    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) {
        where.scheduledDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.scheduledDate.lte = new Date(endDate as string);
      }
    }

    const scheduledInspections = await prisma.propertyInspection.findMany({
      where,
      select: {
        id: true,
        type: true,
        scheduledDate: true,
        status: true
      },
      orderBy: { scheduledDate: 'asc' }
    });

    res.json({ scheduledInspections });
  } catch (error) {
    console.error('Error fetching inspection availability:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Get inspection dashboard stats
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.userType !== 'LANDLORD') {
      return res.status(403).json({ error: 'Access denied. Landlords only.' });
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      totalInspections,
      scheduledInspections,
      upcomingInspections,
      completedThisMonth,
      overdueInspections
    ] = await Promise.all([
      // Total inspections
      prisma.propertyInspection.count({
        where: {
          property: { ownerId: userId }
        }
      }),
      // Scheduled inspections
      prisma.propertyInspection.count({
        where: {
          property: { ownerId: userId },
          status: 'SCHEDULED'
        }
      }),
      // Upcoming inspections (next 30 days)
      prisma.propertyInspection.count({
        where: {
          property: { ownerId: userId },
          status: 'SCHEDULED',
          scheduledDate: {
            gte: new Date(),
            lte: thirtyDaysFromNow
          }
        }
      }),
      // Completed this month
      prisma.propertyInspection.count({
        where: {
          property: { ownerId: userId },
          status: 'COMPLETED',
          completedDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      // Overdue inspections
      prisma.propertyInspection.count({
        where: {
          property: { ownerId: userId },
          status: 'SCHEDULED',
          scheduledDate: {
            lt: new Date()
          }
        }
      })
    ]);

    res.json({
      totalInspections,
      scheduledInspections,
      upcomingInspections,
      completedThisMonth,
      overdueInspections
    });
  } catch (error) {
    console.error('Error fetching inspection stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;