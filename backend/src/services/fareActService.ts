import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FeeDisclosure {
  applicationFee?: number;
  securityDeposit: number;
  firstMonthRent: number;
  brokerFee?: number;
  adminFee?: number;
  petDeposit?: number;
  keyDeposit?: number;
  other?: { name: string; amount: number }[];
}

interface BrokerRelationship {
  type: 'LANDLORD_BROKER' | 'TENANT_BROKER' | 'NO_BROKER';
  brokerName?: string;
  brokerLicense?: string;
  compensation?: {
    paidBy: 'LANDLORD' | 'TENANT';
    amount?: number;
    percentage?: number;
  };
}

class FareActService {
  /**
   * Validates FARE Act compliance for a property listing
   */
  async validateCompliance(propertyId: string): Promise<{
    isCompliant: boolean;
    violations: string[];
    warnings: string[];
  }> {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owner: true,
        _count: { select: { applications: true } }
      }
    });

    if (!property) {
      return {
        isCompliant: false,
        violations: ['Property not found'],
        warnings: []
      };
    }

    const violations: string[] = [];
    const warnings: string[] = [];

    // Check fee disclosure requirements
    if (!property.tenantFees) {
      violations.push('Tenant fees must be disclosed in listing');
    } else {
      const fees = property.tenantFees as any;
      if (!fees.securityDeposit && property.securityDeposit > 0) {
        violations.push('Security deposit amount must be disclosed');
      }
    }

    // Check broker fee compliance
    if (property.isBrokerFee && property.brokerFee > 0) {
      if (!property.feeDisclosure?.includes('broker fee')) {
        violations.push('Broker fee must be clearly disclosed if charged to tenant');
      }

      // FARE Act: Landlord-hired brokers cannot charge tenants
      if (!property.brokerLicense) {
        warnings.push('Broker license information should be provided for transparency');
      }
    }

    // Check required disclosures
    if (!property.feeDisclosure) {
      violations.push('FARE Act fee disclosure statement is required');
    }

    // Validate rent-stabilized properties have proper disclaimers
    if (property.isRentStabilized && !property.description.toLowerCase().includes('rent stabilized')) {
      warnings.push('Rent-stabilized properties should clearly indicate this status');
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      warnings
    };
  }

  /**
   * Generates FARE Act compliant fee disclosure text
   */
  generateFeeDisclosure(fees: FeeDisclosure, brokerRelationship: BrokerRelationship): string {
    let disclosure = "TENANT FEES DISCLOSURE (FARE Act Compliant):\n\n";

    // List all required fees
    disclosure += "The following fees are required from the tenant:\n";
    disclosure += `• First Month's Rent: $${fees.firstMonthRent}\n`;
    disclosure += `• Security Deposit: $${fees.securityDeposit}\n`;

    if (fees.applicationFee && fees.applicationFee > 0) {
      disclosure += `• Application Fee: $${fees.applicationFee}\n`;
    }

    if (fees.adminFee && fees.adminFee > 0) {
      disclosure += `• Administrative Fee: $${fees.adminFee}\n`;
    }

    if (fees.petDeposit && fees.petDeposit > 0) {
      disclosure += `• Pet Deposit: $${fees.petDeposit}\n`;
    }

    if (fees.keyDeposit && fees.keyDeposit > 0) {
      disclosure += `• Key Deposit: $${fees.keyDeposit}\n`;
    }

    if (fees.other && fees.other.length > 0) {
      fees.other.forEach(fee => {
        disclosure += `• ${fee.name}: $${fee.amount}\n`;
      });
    }

    // Calculate total upfront cost
    const totalUpfront = fees.firstMonthRent + fees.securityDeposit +
                        (fees.applicationFee || 0) + (fees.adminFee || 0) +
                        (fees.petDeposit || 0) + (fees.keyDeposit || 0) +
                        (fees.other?.reduce((sum, fee) => sum + fee.amount, 0) || 0);

    disclosure += `\nTOTAL UPFRONT COST: $${totalUpfront}\n\n`;

    // Broker relationship disclosure
    disclosure += "BROKER RELATIONSHIP DISCLOSURE:\n";
    switch (brokerRelationship.type) {
      case 'NO_BROKER':
        disclosure += "• No broker is involved in this transaction\n";
        break;
      case 'LANDLORD_BROKER':
        disclosure += "• The landlord has hired a licensed real estate broker\n";
        if (brokerRelationship.brokerName) {
          disclosure += `• Broker: ${brokerRelationship.brokerName}\n`;
        }
        if (brokerRelationship.brokerLicense) {
          disclosure += `• License #: ${brokerRelationship.brokerLicense}\n`;
        }
        disclosure += "• Per the FARE Act, tenants are NOT required to pay broker fees when the landlord hired the broker\n";
        break;
      case 'TENANT_BROKER':
        disclosure += "• If you choose to hire your own broker, you will be responsible for their fee\n";
        disclosure += "• You are not required to use any specific broker\n";
        break;
    }

    disclosure += "\nFAIR HOUSING NOTICE:\n";
    disclosure += "This property is offered in compliance with federal, state, and local fair housing laws. ";
    disclosure += "We do not discriminate based on race, color, religion, sex, national origin, familial status, disability, or any other protected class.\n\n";

    disclosure += "NYC FARE ACT COMPLIANCE:\n";
    disclosure += "This listing complies with the NYC Fairness in Apartment Rental Expenses (FARE) Act. ";
    disclosure += "All tenant fees are disclosed above. If you believe there has been a violation of the FARE Act, ";
    disclosure += "you may report it to the NYC Department of Consumer and Worker Protection at nyc.gov/consumers or by calling 311.\n\n";

    disclosure += `Generated on: ${new Date().toLocaleDateString()}\n`;

    return disclosure;
  }

  /**
   * Creates or updates FARE Act compliance record
   */
  async updateCompliance(
    propertyId: string,
    fees: FeeDisclosure,
    brokerRelationship: BrokerRelationship
  ): Promise<void> {
    const feeDisclosure = this.generateFeeDisclosure(fees, brokerRelationship);

    // Update property with FARE Act compliance data
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        tenantFees: fees as any,
        feeDisclosure,
        brokerLicense: brokerRelationship.brokerLicense,
        // Update broker fee fields based on relationship
        isBrokerFee: brokerRelationship.type === 'TENANT_BROKER' &&
                     brokerRelationship.compensation?.paidBy === 'TENANT',
        brokerFee: brokerRelationship.type === 'TENANT_BROKER' &&
                   brokerRelationship.compensation?.paidBy === 'TENANT'
                   ? (brokerRelationship.compensation.amount || 0)
                   : 0
      }
    });

    // Create compliance record
    await prisma.fareActCompliance.upsert({
      where: { propertyId },
      create: {
        propertyId,
        disclosureProvided: true,
        feesDisclosed: fees as any,
        brokerRelationship: JSON.stringify(brokerRelationship),
        complianceDate: new Date()
      },
      update: {
        disclosureProvided: true,
        feesDisclosed: fees as any,
        brokerRelationship: JSON.stringify(brokerRelationship),
        complianceDate: new Date()
      }
    });
  }

  /**
   * Reports FARE Act violation
   */
  async reportViolation(violation: {
    propertyId: string;
    reportedBy: string;
    violationType: string;
    description: string;
    evidence?: string[];
  }): Promise<void> {
    // Log the violation
    await prisma.activityLog.create({
      data: {
        userId: violation.reportedBy,
        action: 'FARE_ACT_VIOLATION_REPORTED',
        entity: 'Property',
        entityId: violation.propertyId,
        details: {
          violationType: violation.violationType,
          description: violation.description,
          evidence: violation.evidence
        }
      }
    });

    // Update compliance record with violation
    const compliance = await prisma.fareActCompliance.findUnique({
      where: { propertyId: violation.propertyId }
    });

    if (compliance) {
      const violations = compliance.violations as any[] || [];
      violations.push({
        type: violation.violationType,
        description: violation.description,
        reportedAt: new Date(),
        reportedBy: violation.reportedBy,
        evidence: violation.evidence
      });

      await prisma.fareActCompliance.update({
        where: { propertyId: violation.propertyId },
        data: { violations }
      });
    }

    // In a real implementation, this would also trigger notifications to DCWP
    console.log('FARE Act violation reported:', violation);
  }

  /**
   * Generates compliance report for property owners
   */
  async generateComplianceReport(ownerId: string): Promise<{
    totalProperties: number;
    compliantProperties: number;
    violationsCount: number;
    properties: Array<{
      id: string;
      title: string;
      isCompliant: boolean;
      violations: string[];
      lastUpdated: Date;
    }>;
  }> {
    const properties = await prisma.property.findMany({
      where: { ownerId },
      include: {
        FareActCompliance: true
      }
    });

    const complianceChecks = await Promise.all(
      properties.map(async (property) => {
        const compliance = await this.validateCompliance(property.id);
        return {
          id: property.id,
          title: property.title,
          isCompliant: compliance.isCompliant,
          violations: compliance.violations,
          lastUpdated: property.FareActCompliance?.complianceDate || property.updatedAt
        };
      })
    );

    return {
      totalProperties: properties.length,
      compliantProperties: complianceChecks.filter(p => p.isCompliant).length,
      violationsCount: complianceChecks.reduce((sum, p) => sum + p.violations.length, 0),
      properties: complianceChecks
    };
  }

  /**
   * Validates broker can charge tenant
   */
  async validateBrokerFee(propertyId: string, applicantId: string): Promise<{
    canCharge: boolean;
    reason: string;
  }> {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { FareActCompliance: true }
    });

    if (!property) {
      return { canCharge: false, reason: 'Property not found' };
    }

    // Check if broker was hired by landlord
    if (property.FareActCompliance) {
      const brokerRelationship = JSON.parse(property.FareActCompliance.brokerRelationship as string);

      if (brokerRelationship.type === 'LANDLORD_BROKER') {
        return {
          canCharge: false,
          reason: 'FARE Act violation: Broker was hired by landlord, tenant cannot be charged'
        };
      }
    }

    // Check if tenant explicitly hired their own broker
    // This would require additional tracking of tenant-broker relationships
    return {
      canCharge: true,
      reason: 'Tenant hired their own broker or no broker restrictions apply'
    };
  }
}

export const fareActService = new FareActService();