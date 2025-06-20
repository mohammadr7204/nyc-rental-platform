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
    const uploadDir = 'uploads/maintenance';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'maintenance-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Create a new maintenance request
router.post('/', authenticateToken, upload.array('photos', 5), async (req, res) => {
  try {
    const { propertyId, title, description, priority = 'MEDIUM' } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify user has access to this property (tenant or landlord)
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        OR: [
          { ownerId: userId }, // Landlord
          { 
            applications: {
              some: {
                applicantId: userId,
                status: 'APPROVED'
              }
            }
          } // Approved tenant
        ]
      }
    });

    if (!property) {
      return res.status(403).json({ error: 'Access denied to this property' });
    }

    // Process uploaded photos
    const photos = req.files ? (req.files as Express.Multer.File[]).map(file => 
      `/uploads/maintenance/${file.filename}`
    ) : [];

    const maintenanceRequest = await prisma.maintenanceRequest.create({
      data: {
        propertyId,
        tenantId: userId,
        title,
        description,
        priority,
        photos,
        status: 'PENDING'
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            ownerId: true
          }
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Maintenance request created successfully',
      data: maintenanceRequest
    });
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get maintenance requests for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { propertyId, status, priority, page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const whereClause: any = {
      OR: [
        { tenantId: userId }, // Requests by this user
        { 
          property: { ownerId: userId } // Requests for properties owned by this user
        }
      ]
    };

    if (propertyId) {
      whereClause.propertyId = propertyId as string;
    }

    if (status) {
      whereClause.status = status as string;
    }

    if (priority) {
      whereClause.priority = priority as string;
    }

    const [requests, total] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where: whereClause,
        include: {
          property: {
            select: {
              id: true,
              title: true,
              address: true,
              ownerId: true
            }
          },
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: Number(limit)
      }),
      prisma.maintenanceRequest.count({
        where: whereClause
      })
    ]);

    res.json({
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific maintenance request
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const request = await prisma.maintenanceRequest.findFirst({
      where: {
        id,
        OR: [
          { tenantId: userId },
          { property: { ownerId: userId } }
        ]
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            ownerId: true
          }
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    res.json({ data: request });
  } catch (error) {
    console.error('Error fetching maintenance request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update maintenance request status (landlord only)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cost, scheduledDate, notes } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify user is the property owner
    const existingRequest = await prisma.maintenanceRequest.findFirst({
      where: {
        id,
        property: { ownerId: userId }
      }
    });

    if (!existingRequest) {
      return res.status(404).json({ error: 'Maintenance request not found or access denied' });
    }

    const updateData: any = {};
    
    if (status) updateData.status = status;
    if (cost !== undefined) updateData.cost = parseInt(cost);
    if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
    if (status === 'COMPLETED') updateData.completedAt = new Date();

    const updatedRequest = await prisma.maintenanceRequest.update({
      where: { id },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            ownerId: true
          }
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    res.json({
      message: 'Maintenance request updated successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error updating maintenance request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete maintenance request
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify user is the tenant who created the request or the property owner
    const existingRequest = await prisma.maintenanceRequest.findFirst({
      where: {
        id,
        OR: [
          { tenantId: userId },
          { property: { ownerId: userId } }
        ]
      }
    });

    if (!existingRequest) {
      return res.status(404).json({ error: 'Maintenance request not found or access denied' });
    }

    // Delete associated photos from filesystem
    if (existingRequest.photos && existingRequest.photos.length > 0) {
      existingRequest.photos.forEach(photoPath => {
        const fullPath = path.join(process.cwd(), photoPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    await prisma.maintenanceRequest.delete({
      where: { id }
    });

    res.json({ message: 'Maintenance request deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get maintenance statistics for dashboard
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user type to determine which stats to show
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isLandlord = user.userType === 'LANDLORD' || user.userType === 'PROPERTY_MANAGER';
    
    const whereClause = isLandlord 
      ? { property: { ownerId: userId } }
      : { tenantId: userId };

    const [
      totalRequests,
      pendingRequests,
      inProgressRequests,
      completedRequests,
      urgentRequests
    ] = await Promise.all([
      prisma.maintenanceRequest.count({ where: whereClause }),
      prisma.maintenanceRequest.count({ 
        where: { ...whereClause, status: 'PENDING' } 
      }),
      prisma.maintenanceRequest.count({ 
        where: { ...whereClause, status: 'IN_PROGRESS' } 
      }),
      prisma.maintenanceRequest.count({ 
        where: { ...whereClause, status: 'COMPLETED' } 
      }),
      prisma.maintenanceRequest.count({ 
        where: { ...whereClause, priority: 'URGENT' } 
      })
    ]);

    // Calculate average response time for landlords
    let avgResponseTime = null;
    if (isLandlord) {
      const completedWithScheduled = await prisma.maintenanceRequest.findMany({
        where: {
          ...whereClause,
          status: 'COMPLETED',
          scheduledDate: { not: null }
        },
        select: {
          createdAt: true,
          scheduledDate: true
        }
      });

      if (completedWithScheduled.length > 0) {
        const totalHours = completedWithScheduled.reduce((sum, request) => {
          const responseTime = new Date(request.scheduledDate!).getTime() - 
                             new Date(request.createdAt).getTime();
          return sum + (responseTime / (1000 * 60 * 60)); // Convert to hours
        }, 0);
        avgResponseTime = Math.round(totalHours / completedWithScheduled.length);
      }
    }

    res.json({
      data: {
        totalRequests,
        pendingRequests,
        inProgressRequests,
        completedRequests,
        urgentRequests,
        avgResponseTime
      }
    });
  } catch (error) {
    console.error('Error fetching maintenance stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;