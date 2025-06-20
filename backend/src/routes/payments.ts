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

// Create Stripe Connect account for landlords
router.post('/connect/create-account',
  requireUserType(['LANDLORD', 'PROPERTY_MANAGER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, businessType = 'individual' } = req.body;
    const userId = req.user!.userId;

    // Check if user already has a Stripe account
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeAccountId: true }
    });

    if (existingUser?.stripeAccountId) {
      return res.status(400).json({ error: 'Stripe account already exists' });
    }

    try {
      // Create Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: email || req.user!.email,
        business_type: businessType,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true }
        }
      });

      // Update user with Stripe account ID
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          stripeAccountId: account.id,
          stripeAccountStatus: 'PENDING'
        }
      });

      res.json({
        success: true,
        data: {
          accountId: account.id,
          user: {
            id: updatedUser.id,
            stripeAccountId: updatedUser.stripeAccountId,
            stripeAccountStatus: updatedUser.stripeAccountStatus
          }
        }
      });
    } catch (error: any) {
      console.error('Stripe account creation error:', error);
      res.status(500).json({ error: 'Failed to create Stripe account' });
    }
  })
);

// Create onboarding link for Stripe Connect
router.post('/connect/onboarding-link',
  requireUserType(['LANDLORD', 'PROPERTY_MANAGER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeAccountId: true }
    });

    if (!user?.stripeAccountId) {
      return res.status(400).json({ error: 'No Stripe account found. Please create account first.' });
    }

    try {
      const accountLink = await stripe.accountLinks.create({
        account: user.stripeAccountId,
        refresh_url: `${process.env.FRONTEND_URL}/dashboard/payments/connect/refresh`,
        return_url: `${process.env.FRONTEND_URL}/dashboard/payments/connect/success`,
        type: 'account_onboarding'
      });

      res.json({
        success: true,
        data: {
          onboardingUrl: accountLink.url
        }
      });
    } catch (error: any) {
      console.error('Stripe onboarding link error:', error);
      res.status(500).json({ error: 'Failed to create onboarding link' });
    }
  })
);

// Get Stripe Connect account status
router.get('/connect/status',
  requireUserType(['LANDLORD', 'PROPERTY_MANAGER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeAccountId: true,
        stripeAccountStatus: true,
        stripeOnboardingComplete: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        bankAccountLast4: true
      }
    });

    if (!user?.stripeAccountId) {
      return res.json({
        success: true,
        data: {
          hasAccount: false,
          accountStatus: 'NONE'
        }
      });
    }

    try {
      // Get account details from Stripe
      const account = await stripe.accounts.retrieve(user.stripeAccountId);

      // Update user record with current status
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          stripeOnboardingComplete: account.details_submitted,
          stripeChargesEnabled: account.charges_enabled,
          stripePayoutsEnabled: account.payouts_enabled,
          stripeAccountStatus: account.charges_enabled && account.payouts_enabled ? 'VERIFIED' : 'PENDING'
        }
      });

      res.json({
        success: true,
        data: {
          hasAccount: true,
          accountId: user.stripeAccountId,
          accountStatus: updatedUser.stripeAccountStatus,
          onboardingComplete: updatedUser.stripeOnboardingComplete,
          chargesEnabled: updatedUser.stripeChargesEnabled,
          payoutsEnabled: updatedUser.stripePayoutsEnabled,
          requiresAction: !account.details_submitted,
          bankAccountLast4: updatedUser.bankAccountLast4
        }
      });
    } catch (error: any) {
      console.error('Stripe account status error:', error);
      res.status(500).json({ error: 'Failed to get account status' });
    }
  })
);

// Create payment intent with Connect transfer
router.post('/create-payment-intent',
  requireUserType(['RENTER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { amount, applicationId, type, description, landlordId } = req.body;

    if (!amount || !type || !landlordId) {
      return res.status(400).json({ error: 'Amount, payment type, and landlord ID are required' });
    }

    // Get landlord's Stripe account
    const landlord = await prisma.user.findUnique({
      where: { id: landlordId },
      select: { stripeAccountId: true, stripePayoutsEnabled: true }
    });

    if (!landlord?.stripeAccountId || !landlord.stripePayoutsEnabled) {
      return res.status(400).json({ error: 'Landlord has not completed payment setup' });
    }

    // Calculate fees (2.9% platform fee + Stripe fee)
    const amountInCents = Number(amount) * 100;
    const platformFeePercent = 0.029; // 2.9%
    const platformFee = Math.round(amountInCents * platformFeePercent);
    const stripeFee = Math.round(amountInCents * 0.029 + 30); // Stripe's fee structure
    const landlordAmount = amountInCents - platformFee - stripeFee;

    try {
      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          amount: Number(amount),
          type,
          description,
          payerId: req.user!.userId,
          receiverId: landlordId,
          applicationId,
          status: 'PENDING',
          platformFee: Math.round(platformFee / 100),
          stripeFee: Math.round(stripeFee / 100),
          landlordAmount: Math.round(landlordAmount / 100)
        }
      });

      // Create Stripe payment intent with Connect
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        application_fee_amount: platformFee,
        transfer_data: {
          destination: landlord.stripeAccountId
        },
        metadata: {
          paymentId: payment.id,
          userId: req.user!.userId,
          landlordId,
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
          paymentId: payment.id,
          amountBreakdown: {
            total: Number(amount),
            platformFee: Math.round(platformFee / 100),
            stripeFee: Math.round(stripeFee / 100),
            landlordAmount: Math.round(landlordAmount / 100)
          }
        }
      });
    } catch (error: any) {
      console.error('Payment intent creation error:', error);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  })
);

// Process security deposit with escrow
router.post('/security-deposit',
  requireUserType(['RENTER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { amount, applicationId, landlordId } = req.body;

    if (!amount || !applicationId || !landlordId) {
      return res.status(400).json({ error: 'Amount, application ID, and landlord ID are required' });
    }

    try {
      // Create security deposit payment (held in escrow)
      const payment = await prisma.payment.create({
        data: {
          amount: Number(amount),
          type: 'SECURITY_DEPOSIT',
          description: 'Security deposit held in escrow',
          payerId: req.user!.userId,
          receiverId: landlordId,
          applicationId,
          status: 'PENDING'
        }
      });

      // Create payment intent (held on platform, not transferred immediately)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Number(amount) * 100,
        currency: 'usd',
        metadata: {
          paymentId: payment.id,
          userId: req.user!.userId,
          landlordId,
          type: 'SECURITY_DEPOSIT',
          escrow: 'true'
        }
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { stripePaymentId: paymentIntent.id }
      });

      res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentId: payment.id,
          message: 'Security deposit will be held in escrow until lease completion'
        }
      });
    } catch (error: any) {
      console.error('Security deposit error:', error);
      res.status(500).json({ error: 'Failed to process security deposit' });
    }
  })
);

// Process background check fee
router.post('/background-check-fee',
  requireUserType(['RENTER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { applicationId } = req.body;
    const backgroundCheckFee = 35; // $35 as specified in plan

    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    try {
      // Create background check fee payment
      const payment = await prisma.payment.create({
        data: {
          amount: backgroundCheckFee,
          type: 'BACKGROUND_CHECK_FEE',
          description: 'Background check processing fee',
          payerId: req.user!.userId,
          applicationId,
          status: 'PENDING'
        }
      });

      // Create payment intent (no Connect transfer, goes to platform)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: backgroundCheckFee * 100,
        currency: 'usd',
        metadata: {
          paymentId: payment.id,
          userId: req.user!.userId,
          type: 'BACKGROUND_CHECK_FEE'
        }
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { stripePaymentId: paymentIntent.id }
      });

      res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentId: payment.id,
          amount: backgroundCheckFee
        }
      });
    } catch (error: any) {
      console.error('Background check fee error:', error);
      res.status(500).json({ error: 'Failed to process background check fee' });
    }
  })
);

// Confirm payment and handle transfers
router.post('/confirm-payment',
  requireUserType(['RENTER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { paymentId } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        receiver: {
          select: { stripeAccountId: true }
        },
        application: {
          include: {
            property: {
              include: {
                owner: {
                  select: { firstName: true, lastName: true }
                }
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

    try {
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
    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({ error: 'Failed to confirm payment' });
    }
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
      receiver: {
        select: { firstName: true, lastName: true }
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

// Get landlord's earnings and payment overview
router.get('/earnings',
  requireUserType(['LANDLORD', 'PROPERTY_MANAGER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const payments = await prisma.payment.findMany({
      where: {
        receiverId: req.user!.userId,
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

    const earnings = await prisma.payment.aggregate({
      where: {
        receiverId: req.user!.userId,
        status: 'COMPLETED'
      },
      _sum: { 
        landlordAmount: true,
        amount: true
      },
      _count: { id: true }
    });

    const pendingPayments = await prisma.payment.count({
      where: {
        receiverId: req.user!.userId,
        status: 'PENDING'
      }
    });

    res.json({
      success: true,
      data: {
        payments,
        summary: {
          totalEarnings: earnings._sum.landlordAmount || 0,
          totalGrossAmount: earnings._sum.amount || 0,
          paymentCount: earnings._count.id || 0,
          pendingPayments
        }
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

    case 'account.updated':
      const account = event.data.object;
      
      // Update user's Stripe account status
      const user = await prisma.user.findFirst({
        where: { stripeAccountId: account.id }
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            stripeOnboardingComplete: account.details_submitted,
            stripeChargesEnabled: account.charges_enabled,
            stripePayoutsEnabled: account.payouts_enabled,
            stripeAccountStatus: account.charges_enabled && account.payouts_enabled ? 'VERIFIED' : 'PENDING'
          }
        });
      }
      break;

    case 'transfer.created':
      const transfer = event.data.object;
      
      // Update payment with transfer information
      if (transfer.metadata && transfer.metadata.paymentId) {
        await prisma.payment.update({
          where: { id: transfer.metadata.paymentId },
          data: {
            stripeTransferId: transfer.id,
            transferredDate: new Date(),
            status: 'TRANSFERRED'
          }
        });
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
}));

export default router;