const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface LeaseFilters {
  status?: string;
  propertyId?: string;
  expiringIn?: string;
  page?: number;
  limit?: number;
}

interface CreateLeaseData {
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  terms?: any;
}

interface UpdateLeaseData {
  startDate?: string;
  endDate?: string;
  monthlyRent?: number;
  securityDeposit?: number;
  terms?: any;
  status?: string;
  documentUrl?: string;
}

interface RenewalData {
  newEndDate: string;
  newMonthlyRent?: number;
  renewalTerms?: any;
}

interface TerminationData {
  terminationDate: string;
  reason: string;
  refundDeposit?: boolean;
}

class LeaseService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async getLeases(queryString?: string) {
    const endpoint = queryString ? `/leases?${queryString}` : '/leases';
    return this.request(endpoint);
  }

  async getLeaseById(id: string) {
    return this.request(`/leases/${id}`);
  }

  async createLeaseFromApplication(applicationId: string, data: CreateLeaseData) {
    return this.request(`/leases/from-application/${applicationId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLease(id: string, data: UpdateLeaseData) {
    return this.request(`/leases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async terminateLease(id: string, data: TerminationData) {
    return this.request(`/leases/${id}/terminate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRenewalCandidates(daysAhead: number = 90) {
    return this.request(`/leases/renewals/candidates?daysAhead=${daysAhead}`);
  }

  async renewLease(id: string, data: RenewalData) {
    return this.request(`/leases/${id}/renew`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getLeaseStats() {
    return this.request('/leases/dashboard/stats');
  }

  // Document generation (placeholder for future DocuSign integration)
  async generateLeaseDocument(leaseId: string) {
    return this.request(`/leases/${leaseId}/generate-document`, {
      method: 'POST',
    });
  }

  // Digital signing (placeholder for future DocuSign integration)
  async sendForSignature(leaseId: string, signerEmail: string) {
    return this.request(`/leases/${leaseId}/send-for-signature`, {
      method: 'POST',
      body: JSON.stringify({ signerEmail }),
    });
  }

  // Lease compliance monitoring
  async checkCompliance(leaseId: string) {
    return this.request(`/leases/${leaseId}/compliance`);
  }

  // Automated rent escalation
  async calculateRentEscalation(leaseId: string, escalationRate: number) {
    return this.request(`/leases/${leaseId}/escalation`, {
      method: 'POST',
      body: JSON.stringify({ escalationRate }),
    });
  }
}

export const leaseService = new LeaseService();
export default leaseService;