import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, requireUserType } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { fareActService } from '../services/fareActService';

const router = express.Router();
const prisma = new PrismaClient();

// Validate property compliance (public endpoint)
router.get('/validate/:propertyId', asyncHandler(async (req: Request, res: Response) => {
  const { propertyId } = req.params;

  const compliance = await fareActService.validateCompliance(propertyId);

  res.json({
    success: true,
    data: compliance
  });
}));

// Update property compliance (landlords only)
router.post('/update-compliance',
  requireUserType(['LANDLORD', 'PROPERTY_MANAGER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { propertyId, fees, brokerRelationship } = req.body;

    // Verify property ownership
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.ownerId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized to update this property' });
    }

    await fareActService.updateCompliance(propertyId, fees, brokerRelationship);

    res.json({
      success: true,
      message: 'FARE Act compliance updated successfully'
    });
  })
);

// Report FARE Act violation
router.post('/report-violation', asyncHandler(async (req: Request, res: Response) => {
  const { propertyId, violationType, description, evidence } = req.body;
  const reportedBy = req.headers['x-user-id'] as string || 'anonymous';

  await fareActService.reportViolation({
    propertyId,
    reportedBy,
    violationType,
    description,
    evidence
  });

  res.json({
    success: true,
    message: 'Violation reported successfully. Thank you for helping maintain compliance.'
  });
}));

// Generate compliance report (landlords only)
router.get('/compliance-report',
  requireUserType(['LANDLORD', 'PROPERTY_MANAGER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const report = await fareActService.generateComplianceReport(req.user!.userId);

    res.json({
      success: true,
      data: report
    });
  })
);

// Get FARE Act information (public endpoint)
router.get('/info', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      title: 'NYC FARE Act Compliance',
      effectiveDate: '2025-06-11',
      description: 'The Fairness in Apartment Rental Expenses (FARE) Act requires landlords to pay broker fees when they hire the broker.',
      keyProvisions: [
        'Landlords must pay broker fees when they hire the broker',
        'All tenant fees must be clearly disclosed upfront',
        'Tenants cannot be required to use a specific broker',
        'Violations can result in fines and civil action'
      ],
      reportingInfo: {
        agency: 'NYC Department of Consumer and Worker Protection (DCWP)',
        website: 'https://www.nyc.gov/site/dca/about/FAQ-Broker-Fees.page',
        phone: '311',
        online: 'https://www.nyc.gov/site/dca/consumers/file-complaint.page'
      },
      penalties: {
        firstViolation: '$1,000 - $2,000',
        repeatViolations: 'Up to $2,000',
        civilAction: 'Tenants may sue for damages'
      }
    }
  });
}));

// Validate broker fee charge
router.post('/validate-broker-fee',
  requireUserType(['LANDLORD', 'PROPERTY_MANAGER', 'RENTER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { propertyId, applicantId } = req.body;

    const validation = await fareActService.validateBrokerFee(propertyId, applicantId);

    res.json({
      success: true,
      data: validation
    });
  })
);

// Get fee disclosure template
router.get('/fee-disclosure-template', asyncHandler(async (req: Request, res: Response) => {
  const { propertyType = 'APARTMENT', rentAmount = 3000 } = req.query;

  const sampleFees = {
    firstMonthRent: Number(rentAmount),
    securityDeposit: Number(rentAmount),
    applicationFee: 50,
    adminFee: 0,
    petDeposit: 0,
    keyDeposit: 0,
    other: []
  };

  const sampleBrokerRelationship = {
    type: 'NO_BROKER' as const,
    brokerName: '',
    brokerLicense: '',
    compensation: {
      paidBy: 'LANDLORD' as const,
      amount: 0
    }
  };

  const disclosure = fareActService.generateFeeDisclosure(sampleFees, sampleBrokerRelationship);

  res.json({
    success: true,
    data: {
      template: disclosure,
      sampleFees,
      instructions: [
        'Fill in actual fee amounts for your property',
        'Include all fees that tenants must pay',
        'Specify broker relationship accurately',
        'Update the disclosure whenever fees change'
      ]
    }
  });
}));

export default router;