import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get tenant dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get tenant's current lease
    const currentLease = await prisma.lease.findFirst({
      where: {
        tenantId: userId,
        status: {
          in: ['ACTIVE', 'SIGNED']
        }
      },
      include: {
        property: {
          select: {
            address: true,
            bedrooms: true,
            bathrooms: true,
            squareFootage: true
          }
        },
        landlord: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get recent payments (last 5)
    const recentPayments = await prisma.payment.findMany({
      where: {
        payerId: userId
      },
      include: {
        property: {
          select: {
            address: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    // Get upcoming rent payment (if lease exists)
    let upcomingPayments = [];
    if (currentLease) {
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      
      // Check if rent payment for next month already exists
      const existingPayment = await prisma.payment.findFirst({
        where: {
          payerId: userId,
          type: 'RENT',
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lt: nextMonth
          }
        }
      });

      if (!existingPayment) {
        upcomingPayments.push({
          id: 'rent-' + nextMonth.getTime(),
          type: 'Monthly Rent',
          amount: currentLease.monthlyRent,
          dueDate: nextMonth.toISOString(),
          status: 'pending',
          property: currentLease.property
        });
      }
    }

    // Get maintenance requests count
    const maintenanceCount = await prisma.maintenanceRequest.count({
      where: {
        requesterId: userId,
        status: {
          in: ['PENDING', 'SCHEDULED', 'IN_PROGRESS']
        }
      }
    });

    // Get unread messages count
    const unreadMessagesCount = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false
      }
    });

    res.json({
      success: true,
      data: {
        currentLease,
        recentPayments,
        upcomingPayments,
        stats: {
          activeMaintenanceRequests: maintenanceCount,
          unreadMessages: unreadMessagesCount,
          totalPayments: recentPayments.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching tenant dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tenant's leases
router.get('/leases', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const leases = await prisma.lease.findMany({
      where: {
        tenantId: userId
      },
      include: {
        property: {
          select: {
            address: true,
            bedrooms: true,
            bathrooms: true,
            squareFootage: true
          }
        },
        landlord: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        documents: {
          select: {
            id: true,
            name: true,
            type: true,
            url: true,
            uploadedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: leases
    });

  } catch (error) {
    console.error('Error fetching tenant leases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tenant's payment history
router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20, status, type, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build filter conditions
    const where: any = {
      payerId: userId
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (type && type !== 'all') {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        property: {
          select: {
            address: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    const totalCount = await prisma.payment.count({ where });

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching tenant payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment receipt
router.get('/payments/:paymentId/receipt', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { paymentId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        payerId: userId
      },
      include: {
        property: {
          select: {
            address: true
          }
        },
        payer: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // In a real implementation, you would generate a PDF receipt here
    // For now, we'll return the payment data
    res.json({
      success: true,
      data: {
        receiptData: payment,
        downloadUrl: `/api/tenant/payments/${paymentId}/receipt.pdf`
      }
    });

  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get lease document
router.get('/leases/:leaseId/documents/:documentId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { leaseId, documentId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify the lease belongs to the tenant
    const lease = await prisma.lease.findFirst({
      where: {
        id: leaseId,
        tenantId: userId
      }
    });

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const document = await prisma.leaseDocument.findFirst({
      where: {
        id: documentId,
        leaseId: leaseId
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // In a real implementation, you would stream the file from storage
    res.json({
      success: true,
      data: {
        document,
        downloadUrl: document.url
      }
    });

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tenant maintenance requests
router.get('/maintenance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { status } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const where: any = {
      requesterId: userId
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    const maintenanceRequests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        property: {
          select: {
            address: true
          }
        },
        assignedVendor: {
          select: {
            name: true,
            phone: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: maintenanceRequests
    });

  } catch (error) {
    console.error('Error fetching tenant maintenance requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit rent payment
router.post('/payments/rent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { leaseId, amount, paymentMethodId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify the lease belongs to the tenant
    const lease = await prisma.lease.findFirst({
      where: {
        id: leaseId,
        tenantId: userId,
        status: 'ACTIVE'
      },
      include: {
        property: true,
        landlord: true
      }
    });

    if (!lease) {
      return res.status(404).json({ error: 'Active lease not found' });
    }

    // Verify the amount matches the monthly rent
    if (amount !== lease.monthlyRent) {
      return res.status(400).json({ error: 'Payment amount does not match rent amount' });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        amount,
        type: 'RENT',
        status: 'PENDING',
        paymentMethod: 'CARD',
        propertyId: lease.propertyId,
        payerId: userId,
        recipientId: lease.landlordId,
        description: `Rent payment for ${lease.property.address}`,
        metadata: {
          leaseId,
          paymentMethodId,
          month: new Date().toISOString().slice(0, 7) // YYYY-MM format
        }
      }
    });

    // In a real implementation, you would process the payment with Stripe here
    // For now, we'll mark it as completed
    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        status: 'COMPLETED',
        stripePaymentIntentId: `pi_simulated_${payment.id}`
      }
    });

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Error processing rent payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
