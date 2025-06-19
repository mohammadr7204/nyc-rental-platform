import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, requireUserType } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

// Create payment intent
router.post('/create-payment-intent',
  requireUserType(['RENTER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { amount, applicationId, type, description } = req.body;

    if (!amount || !type) {
      return res.status(400).json({ error: 'Amount and payment type are required' });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        amount: Number(amount),
        type,
        description,
        payerId: req.user!.userId,
        applicationId,
        status: 'PENDING'
      }
    });

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Number(amount) * 100, // Convert to cents
      currency: 'usd',
      metadata: {
        paymentId: payment.id,
        userId: req.user!.userId,
        type
      }
    });

    // Update payment with Stripe payment intent ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: { stripePaymentId: paymentIntent.id }
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id
      }
    });
  })
);

// Confirm payment
router.post('/confirm-payment',
  requireUserType(['RENTER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { paymentId } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        application: {
          include: {
            property: {
              include: {
                owner: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.payerId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized to confirm this payment' });
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        paidDate: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: updatedPayment
    });
  })
);

// Get user's payment history
router.get('/history', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const payments = await prisma.payment.findMany({
    where: { payerId: req.user!.userId },
    include: {
      application: {
        include: {
          property: {
            select: {
              title: true,
              address: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take
  });

  const total = await prisma.payment.count({
    where: { payerId: req.user!.userId }
  });

  res.json({
    success: true,
    data: payments,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
}));

// Get landlord's earnings
router.get('/earnings',
  requireUserType(['LANDLORD', 'PROPERTY_MANAGER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const payments = await prisma.payment.findMany({
      where: {
        application: {
          property: {
            ownerId: req.user!.userId
          }
        },
        status: 'COMPLETED'
      },
      include: {
        payer: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        application: {
          include: {
            property: {
              select: {
                title: true,
                address: true
              }
            }
          }
        }
      },
      orderBy: { paidDate: 'desc' },
      skip,
      take
    });

    const totalEarnings = await prisma.payment.aggregate({
      where: {
        application: {
          property: {
            ownerId: req.user!.userId
          }
        },
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    });

    res.json({
      success: true,
      data: {
        payments,
        totalEarnings: totalEarnings._sum.amount || 0
      }
    });
  })
);

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature']!;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;

      // Update payment status in database
      if (paymentIntent.metadata.paymentId) {
        await prisma.payment.update({
          where: { id: paymentIntent.metadata.paymentId },
          data: {
            status: 'COMPLETED',
            paidDate: new Date()
          }
        });
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;

      if (failedPayment.metadata.paymentId) {
        await prisma.payment.update({
          where: { id: failedPayment.metadata.paymentId },
          data: { status: 'FAILED' }
        });
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
}));

export default router;