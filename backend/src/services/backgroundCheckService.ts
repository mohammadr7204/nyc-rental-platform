import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BackgroundCheckRequest {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: Date;
  ssn: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  driverLicense?: {
    number: string;
    state: string;
  };
}

interface CreditCheckRequest {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  ssn: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

interface BackgroundCheckResult {
  checkId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  results?: {
    criminalHistory?: {
      hasCriminalHistory: boolean;
      records: Array<{
        county: string;
        charge: string;
        disposition: string;
        date: string;
      }>;
    };
    sexOffenderRegistry?: {
      isRegistered: boolean;
    };
    globalWatchlist?: {
      isOnWatchlist: boolean;
    };
    employment?: {
      verified: boolean;
      employer: string;
      position: string;
      startDate: string;
      endDate?: string;
    };
  };
  reportUrl?: string;
}

interface CreditCheckResult {
  checkId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  results?: {
    creditScore: number;
    creditGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    accounts: Array<{
      type: string;
      balance: number;
      status: string;
      paymentHistory: string;
    }>;
    inquiries: Array<{
      date: string;
      company: string;
      type: string;
    }>;
    publicRecords: Array<{
      type: string;
      date: string;
      amount?: number;
    }>;
    recommendations: {
      approve: boolean;
      conditions?: string[];
    };
  };
  reportUrl?: string;
}

class BackgroundCheckService {
  private checkrApiKey: string;
  private experianApiKey: string;
  private experianClientId: string;
  private experianClientSecret: string;

  constructor() {
    this.checkrApiKey = process.env.CHECKR_API_KEY || '';
    this.experianApiKey = process.env.EXPERIAN_API_KEY || '';
    this.experianClientId = process.env.EXPERIAN_CLIENT_ID || '';
    this.experianClientSecret = process.env.EXPERIAN_CLIENT_SECRET || '';
  }

  /**
   * Initiates background check with Checkr
   */
  async initiateBackgroundCheck(request: BackgroundCheckRequest): Promise<string> {
    if (!this.checkrApiKey) {
      throw new Error('Checkr API key not configured');
    }

    try {
      // Create candidate in Checkr
      const candidateResponse = await axios.post('https://api.checkr.com/v1/candidates', {
        first_name: request.firstName,
        last_name: request.lastName,
        email: request.email,
        phone: request.phone,
        dob: request.dateOfBirth.toISOString().split('T')[0],
        ssn: request.ssn,
        driver_license_number: request.driverLicense?.number,
        driver_license_state: request.driverLicense?.state,
        work_locations: [{
          country: 'US',
          state: request.address.state,
          city: request.address.city
        }]
      }, {
        headers: {
          'Authorization': `Bearer ${this.checkrApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const candidateId = candidateResponse.data.id;

      // Create background check report
      const reportResponse = await axios.post('https://api.checkr.com/v1/reports', {
        candidate_id: candidateId,
        package: 'tenant_plus', // Comprehensive tenant screening
        tags: ['rental_application']
      }, {
        headers: {
          'Authorization': `Bearer ${this.checkrApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const reportId = reportResponse.data.id;

      // Store in database
      await prisma.backgroundCheck.create({
        data: {
          userId: request.userId,
          provider: 'checkr',
          externalId: reportId,
          status: 'PENDING',
          requestedAt: new Date()
        }
      });

      return reportId;
    } catch (error) {
      console.error('Checkr background check initiation failed:', error);
      
      // Store failed attempt
      await prisma.backgroundCheck.create({
        data: {
          userId: request.userId,
          provider: 'checkr',
          status: 'FAILED',
          results: { error: error instanceof Error ? error.message : 'Unknown error' },
          requestedAt: new Date()
        }
      });

      throw new Error('Failed to initiate background check');
    }
  }

  /**
   * Retrieves background check results from Checkr
   */
  async getBackgroundCheckResults(checkId: string): Promise<BackgroundCheckResult> {
    if (!this.checkrApiKey) {
      throw new Error('Checkr API key not configured');
    }

    try {
      const response = await axios.get(`https://api.checkr.com/v1/reports/${checkId}`, {
        headers: {
          'Authorization': `Bearer ${this.checkrApiKey}`
        }
      });

      const report = response.data;
      const status = this.mapCheckrStatus(report.status);

      let results = undefined;
      if (status === 'COMPLETED') {
        results = {
          criminalHistory: {
            hasCriminalHistory: report.ssn_trace?.records?.length > 0 || false,
            records: report.criminal_searches?.map((search: any) => ({
              county: search.county,
              charge: search.charge,
              disposition: search.disposition,
              date: search.date
            })) || []
          },
          sexOffenderRegistry: {
            isRegistered: report.sex_offender_search?.registry === 'FOUND'
          },
          globalWatchlist: {
            isOnWatchlist: report.global_watchlist_search?.watchlist === 'FOUND'
          },
          employment: report.employment_verifications?.[0] ? {
            verified: report.employment_verifications[0].status === 'verified',
            employer: report.employment_verifications[0].employer_name,
            position: report.employment_verifications[0].position,
            startDate: report.employment_verifications[0].start_date,
            endDate: report.employment_verifications[0].end_date
          } : undefined
        };

        // Update database
        await prisma.backgroundCheck.updateMany({
          where: { externalId: checkId },
          data: {
            status: 'COMPLETED',
            results,
            reportUrl: report.report_url,
            completedAt: new Date()
          }
        });
      }

      return {
        checkId,
        status,
        results,
        reportUrl: report.report_url
      };
    } catch (error) {
      console.error('Failed to retrieve background check results:', error);
      throw new Error('Failed to retrieve background check results');
    }
  }

  /**
   * Initiates credit check with Experian
   */
  async initiateCreditCheck(request: CreditCheckRequest): Promise<string> {
    if (!this.experianClientId || !this.experianClientSecret) {
      throw new Error('Experian API credentials not configured');
    }

    try {
      // Get OAuth token
      const tokenResponse = await axios.post('https://api.experian.com/oauth2/v1/token', {
        grant_type: 'client_credentials',
        client_id: this.experianClientId,
        client_secret: this.experianClientSecret
      });

      const accessToken = tokenResponse.data.access_token;

      // Submit credit check request
      const creditResponse = await axios.post('https://api.experian.com/consumerservices/credit-profile/v2/credit-report', {
        primary_applicant: {
          name: {
            first_name: request.firstName,
            last_name: request.lastName
          },
          ssn: request.ssn,
          date_of_birth: request.dateOfBirth.toISOString().split('T')[0],
          current_address: {
            line1: request.address.street,
            city: request.address.city,
            state: request.address.state,
            postal_code: request.address.zipCode
          }
        },
        requestor: {
          subscriber_code: process.env.EXPERIAN_SUBSCRIBER_CODE,
          permissible_purpose: '3F' // Tenant screening
        },
        options: {
          include_models: true,
          include_summary: true
        }
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const reportId = creditResponse.data.report_id || Date.now().toString();

      // Store in database
      await prisma.backgroundCheck.create({
        data: {
          userId: request.userId,
          provider: 'experian',
          externalId: reportId,
          status: 'COMPLETED', // Experian typically returns results immediately
          results: creditResponse.data,
          requestedAt: new Date(),
          completedAt: new Date()
        }
      });

      return reportId;
    } catch (error) {
      console.error('Experian credit check initiation failed:', error);
      
      // Store failed attempt
      await prisma.backgroundCheck.create({
        data: {
          userId: request.userId,
          provider: 'experian',
          status: 'FAILED',
          results: { error: error instanceof Error ? error.message : 'Unknown error' },
          requestedAt: new Date()
        }
      });

      throw new Error('Failed to initiate credit check');
    }
  }

  /**
   * Processes and standardizes credit check results
   */
  async getCreditCheckResults(checkId: string): Promise<CreditCheckResult> {
    const check = await prisma.backgroundCheck.findFirst({
      where: { externalId: checkId, provider: 'experian' }
    });

    if (!check) {
      throw new Error('Credit check not found');
    }

    if (check.status === 'FAILED') {
      return {
        checkId,
        status: 'FAILED'
      };
    }

    const rawResults = check.results as any;
    
    // Process Experian results
    const creditScore = rawResults.credit_profile?.models?.find((m: any) => 
      m.model_name === 'FICO_SCORE_9')?.score || 0;

    const results: CreditCheckResult['results'] = {
      creditScore,
      creditGrade: this.getCreditGrade(creditScore),
      accounts: rawResults.credit_profile?.accounts?.map((account: any) => ({
        type: account.account_type,
        balance: account.balance_amount || 0,
        status: account.account_status,
        paymentHistory: account.payment_status
      })) || [],
      inquiries: rawResults.credit_profile?.inquiries?.map((inquiry: any) => ({
        date: inquiry.inquiry_date,
        company: inquiry.subscriber_name,
        type: inquiry.inquiry_type
      })) || [],
      publicRecords: rawResults.credit_profile?.public_records?.map((record: any) => ({
        type: record.public_record_type,
        date: record.date_filed,
        amount: record.amount
      })) || [],
      recommendations: this.generateCreditRecommendations(creditScore, rawResults)
    };

    return {
      checkId,
      status: 'COMPLETED',
      results,
      reportUrl: check.reportUrl
    };
  }

  /**
   * Get user's background check history
   */
  async getUserBackgroundChecks(userId: string): Promise<Array<{
    id: string;
    provider: string;
    status: string;
    requestedAt: Date;
    completedAt?: Date;
    results?: any;
  }>> {
    const checks = await prisma.backgroundCheck.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' }
    });

    return checks.map(check => ({
      id: check.id,
      provider: check.provider,
      status: check.status,
      requestedAt: check.requestedAt,
      completedAt: check.completedAt,
      results: check.results
    }));
  }

  /**
   * Webhook handler for Checkr status updates
   */
  async handleCheckrWebhook(payload: any): Promise<void> {
    const { object, type } = payload;
    
    if (type === 'report.updated' && object.object === 'report') {
      const reportId = object.id;
      const status = this.mapCheckrStatus(object.status);
      
      await prisma.backgroundCheck.updateMany({
        where: { externalId: reportId, provider: 'checkr' },
        data: {
          status,
          results: object,
          ...(status === 'COMPLETED' && { completedAt: new Date() })
        }
      });

      // Send notification to user if completed
      if (status === 'COMPLETED') {
        // Implementation would send email/notification
        console.log(`Background check completed for report ${reportId}`);
      }
    }
  }

  private mapCheckrStatus(checkrStatus: string): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' {
    switch (checkrStatus) {
      case 'pending':
        return 'PENDING';
      case 'consider':
      case 'clear':
        return 'COMPLETED';
      case 'suspended':
      case 'canceled':
        return 'FAILED';
      default:
        return 'IN_PROGRESS';
    }
  }

  private getCreditGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 750) return 'A';
    if (score >= 700) return 'B';
    if (score >= 650) return 'C';
    if (score >= 600) return 'D';
    return 'F';
  }

  private generateCreditRecommendations(score: number, rawResults: any): {
    approve: boolean;
    conditions?: string[];
  } {
    const conditions: string[] = [];
    let approve = true;

    // Basic score requirements
    if (score < 650) {
      approve = false;
      conditions.push('Credit score below minimum requirement (650)');
    }

    // Check for recent bankruptcies
    const publicRecords = rawResults.credit_profile?.public_records || [];
    const recentBankruptcy = publicRecords.find((record: any) => 
      record.public_record_type === 'BANKRUPTCY' && 
      new Date(record.date_filed) > new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
    );

    if (recentBankruptcy) {
      approve = false;
      conditions.push('Recent bankruptcy within 2 years');
    }

    // Check debt-to-income (simplified)
    const totalDebt = rawResults.credit_profile?.accounts?.reduce(
      (sum: number, account: any) => sum + (account.balance_amount || 0), 0
    ) || 0;

    if (totalDebt > 50000) { // Simplified threshold
      conditions.push('High debt levels - may require additional documentation');
    }

    // Positive factors
    if (score >= 750) {
      conditions.push('Excellent credit score');
    }

    return { approve, conditions: conditions.length > 0 ? conditions : undefined };
  }
}

export const backgroundCheckService = new BackgroundCheckService();